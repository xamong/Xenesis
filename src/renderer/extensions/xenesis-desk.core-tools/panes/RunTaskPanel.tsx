import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SaveLogResult, ShellDescriptor, ShellKind } from '../../../../shared/types';
import { sendXenesisAgentCommand } from '../../../utils/xenesisContextSend';
import {
  appendLimitedOutput,
  buildOneShotShellInput,
  formatRunTaskTranscript,
  type RunTaskStatus,
  type RunTaskSummaryInput,
  summarizeRunTaskForBot,
} from '../runTaskPanelUtils';

interface RunTask extends RunTaskSummaryInput {
  terminalId?: string;
  pid?: number;
  savedPath?: string;
}

const DEFAULT_COMMAND = 'echo xenesis-run-task';

function nowIso(): string {
  return new Date().toISOString();
}

function sanitizeFileName(value: string): string {
  const clean = value
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]+/g, '-')
    .replace(/\s+/g, '-');
  return clean.slice(0, 48) || 'run-task';
}

function sendAgentCommand(text: string): void {
  sendXenesisAgentCommand(text, { source: 'run-task-panel' });
}

function statusLabel(status: RunTaskStatus): string {
  if (status === 'succeeded') return 'Succeeded';
  if (status === 'failed') return 'Failed';
  if (status === 'canceled') return 'Canceled';
  if (status === 'running') return 'Running';
  return 'Queued';
}

function createTask(command: string, shell: ShellKind, cwd: string): RunTask {
  const id = `run-task-${crypto.randomUUID()}`;
  return {
    id,
    label: command.split(/\r?\n/)[0]?.slice(0, 80) || 'Run Task',
    command,
    cwd,
    shell,
    status: 'queued',
    output: '',
  };
}

export function RunTaskPanel() {
  const [shells, setShells] = useState<ShellDescriptor[]>([]);
  const [command, setCommand] = useState(DEFAULT_COMMAND);
  const [cwd, setCwd] = useState('');
  const [shell, setShell] = useState<ShellKind>('powershell');
  const [tasks, setTasks] = useState<RunTask[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [error, setError] = useState('');
  const disposersRef = useRef<Map<string, Array<() => void>>>(new Map());
  const canceledTaskIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let disposed = false;
    async function loadShells(): Promise<void> {
      try {
        const next = await window.terminalAPI.listShells();
        if (disposed) return;
        setShells(next);
        const available = next.find((item) => item.available);
        if (available) setShell(available.kind);
      } catch (loadError) {
        if (!disposed) setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    }
    void loadShells();
    return () => {
      disposed = true;
      for (const disposers of disposersRef.current.values()) {
        disposers.forEach((dispose) => dispose());
      }
      disposersRef.current.clear();
    };
  }, []);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null,
    [selectedTaskId, tasks],
  );

  function updateTask(id: string, patch: Partial<RunTask> | ((task: RunTask) => Partial<RunTask>)): void {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task;
        const nextPatch = typeof patch === 'function' ? patch(task) : patch;
        return { ...task, ...nextPatch };
      }),
    );
  }

  async function chooseCwd(): Promise<void> {
    const selected = await window.terminalAPI.selectCwd();
    if (selected) setCwd(selected);
  }

  async function runTask(source?: RunTask): Promise<void> {
    const taskCommand = (source?.command ?? command).trim();
    if (!taskCommand) {
      setError('Enter a command before running a task.');
      return;
    }
    const taskShell = source?.shell ?? shell;
    const taskCwd = source?.cwd ?? cwd;
    const input = buildOneShotShellInput(taskCommand, taskShell);
    if (!input) return;

    const task = createTask(taskCommand, taskShell, taskCwd);
    setError('');
    setTasks((current) => [task, ...current]);
    setSelectedTaskId(task.id);

    try {
      const result = await window.terminalAPI.spawn({
        id: task.id,
        kind: 'shell',
        shell: taskShell,
        cols: 120,
        rows: 30,
        cwd: taskCwd || undefined,
      });
      updateTask(task.id, {
        terminalId: result.id,
        pid: result.pid,
        cwd: result.cwd,
        status: 'running',
        startedAt: nowIso(),
      });
      const removeData = window.terminalAPI.onData(result.id, (event) => {
        updateTask(task.id, (currentTask) => ({
          output: appendLimitedOutput(currentTask.output, event.data),
        }));
      });
      const removeExit = window.terminalAPI.onExit(result.id, (event) => {
        const exitCode = Number(event.exitCode);
        const canceled = canceledTaskIdsRef.current.has(task.id);
        canceledTaskIdsRef.current.delete(task.id);
        updateTask(task.id, (currentTask) => ({
          exitCode,
          status: canceled || currentTask.status === 'canceled' ? 'canceled' : exitCode === 0 ? 'succeeded' : 'failed',
          finishedAt: nowIso(),
        }));
        const disposers = disposersRef.current.get(result.id) ?? [];
        disposers.forEach((dispose) => dispose());
        disposersRef.current.delete(result.id);
      });
      disposersRef.current.set(result.id, [removeData, removeExit]);
      window.terminalAPI.write(result.id, input);
    } catch (runError) {
      updateTask(task.id, {
        status: 'failed',
        finishedAt: nowIso(),
        output: runError instanceof Error ? runError.message : String(runError),
      });
      setError(runError instanceof Error ? runError.message : String(runError));
    }
  }

  function stopTask(task: RunTask): void {
    if (!task.terminalId || task.status !== 'running') return;
    canceledTaskIdsRef.current.add(task.id);
    updateTask(task.id, { status: 'canceled', finishedAt: nowIso() });
    window.terminalAPI.kill(task.terminalId);
  }

  function rerunTask(task: RunTask): void {
    void runTask(task);
  }

  async function saveTaskLog(task: RunTask): Promise<void> {
    const result: SaveLogResult = await window.terminalAPI.saveLog({
      defaultName: `${sanitizeFileName(task.label)}.log`,
      text: formatRunTaskTranscript(task),
    });
    if (result.saved && result.path) {
      updateTask(task.id, { savedPath: result.path });
    }
  }

  function sendTaskToBot(task: RunTask): void {
    sendAgentCommand(summarizeRunTaskForBot(task));
  }

  return (
    <div className="xd-run-task-panel">
      <header className="xd-intel-header">
        <div>
          <h2>Run Task Panel</h2>
          <p>Run one-off commands as inspectable jobs with output, exit code, rerun, and artifact save actions.</p>
        </div>
        <div className="xd-intel-actions">
          <button type="button" onClick={() => void runTask()}>
            Run Task
          </button>
        </div>
      </header>

      <section className="xd-run-task-form" aria-label="Run task command form">
        <label>
          <span>Shell</span>
          <select value={shell} onChange={(event) => setShell(event.target.value as ShellKind)}>
            {(shells.length === 0
              ? [{ kind: 'powershell', label: 'PowerShell', available: true, command: 'powershell.exe' }]
              : shells
            ).map((item) => (
              <option key={item.kind} value={item.kind} disabled={!item.available}>
                {item.label}
                {item.available ? '' : ' (unavailable)'}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Working directory</span>
          <div className="xd-run-task-input-row">
            <input value={cwd} onChange={(event) => setCwd(event.target.value)} placeholder="Default terminal cwd" />
            <button type="button" onClick={() => void chooseCwd()}>
              Browse
            </button>
          </div>
        </label>
        <label className="xd-run-task-command">
          <span>Command</span>
          <textarea value={command} onChange={(event) => setCommand(event.target.value)} rows={4} />
        </label>
      </section>

      {error && <div className="xd-intel-error">{error}</div>}

      <section className="xd-run-task-layout">
        <div className="xd-run-task-list" aria-label="Run task history">
          {tasks.length === 0 ? (
            <div className="xd-intel-empty">No tasks have run yet.</div>
          ) : (
            tasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className={`xd-run-task-item is-${task.status}${selectedTask?.id === task.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedTaskId(task.id)}
              >
                <strong>{task.label}</strong>
                <span>
                  {statusLabel(task.status)} / exit {task.exitCode ?? '-'}
                </span>
                <small>
                  {task.shell} {task.startedAt ? `/ ${task.startedAt}` : ''}
                </small>
              </button>
            ))
          )}
        </div>

        <div className="xd-run-task-detail" aria-label="Run task detail">
          {selectedTask ? (
            <>
              <div className="xd-run-task-detail-head">
                <div>
                  <strong>{selectedTask.label}</strong>
                  <span>
                    {statusLabel(selectedTask.status)} / exit {selectedTask.exitCode ?? '-'}
                  </span>
                </div>
                <div className="xd-table-actions">
                  <button type="button" onClick={() => rerunTask(selectedTask)}>
                    Rerun
                  </button>
                  <button type="button" onClick={() => void saveTaskLog(selectedTask)}>
                    Save Log
                  </button>
                  <button type="button" onClick={() => sendTaskToBot(selectedTask)}>
                    Send to Agent
                  </button>
                  <button
                    type="button"
                    className="is-danger"
                    disabled={selectedTask.status !== 'running'}
                    onClick={() => stopTask(selectedTask)}
                  >
                    Stop
                  </button>
                </div>
              </div>
              <dl className="xd-run-task-meta">
                <dt>Shell</dt>
                <dd>{selectedTask.shell}</dd>
                <dt>CWD</dt>
                <dd title={selectedTask.cwd}>{selectedTask.cwd || '-'}</dd>
                <dt>PID</dt>
                <dd>{selectedTask.pid ?? '-'}</dd>
                <dt>Saved</dt>
                <dd title={selectedTask.savedPath}>{selectedTask.savedPath || '-'}</dd>
              </dl>
              <pre className="xd-run-task-output">{selectedTask.output || '(waiting for output)'}</pre>
            </>
          ) : (
            <div className="xd-intel-empty">Run a task to inspect output and artifacts.</div>
          )}
        </div>
      </section>
    </div>
  );
}
