import { type Dispatch, type SetStateAction, useMemo, useRef, useState } from 'react';
import { terminalHost } from '../../terminal/terminalHost';
import { resolveAvailableTerminalGroups } from './workflowRunnerRuntimeUtils';
import type { WorkflowTerminalCommandStatus, WorkflowTerminalResponseGroup, WorkspaceTab } from './workflowRunnerTypes';

interface UseWorkflowRunnerMonitorStateOptions {
  setWorkspaceTab: Dispatch<SetStateAction<WorkspaceTab>>;
}

export function useWorkflowRunnerMonitorState({ setWorkspaceTab }: UseWorkflowRunnerMonitorStateOptions) {
  const [selectedTermIds, setSelectedTermIds] = useState<string[]>(() => {
    const initialSessions = terminalHost.listSessions();
    const active = initialSessions.find((session) => session.active);
    return active ? [active.id] : [];
  });
  const [terminalSequential, setTerminalSequential] = useState(false);
  const [commandLog, setCommandLog] = useState<string[]>([]);
  const [commandStatuses, setCommandStatuses] = useState<WorkflowTerminalCommandStatus[]>([]);
  const commandStatusesRef = useRef<WorkflowTerminalCommandStatus[]>([]);

  const availableTerminalGroups = useMemo(
    () => resolveAvailableTerminalGroups(terminalHost.listSessions()),
    [selectedTermIds, commandStatuses],
  );

  function appendCommandLog(entry: string) {
    const stamped = `${new Date().toLocaleTimeString()}  ${entry}`;
    setCommandLog((prev) => [stamped, ...prev].slice(0, 60));
  }

  function clearCommandLog() {
    setCommandLog([]);
  }

  function upsertCommandStatuses(updates: WorkflowTerminalCommandStatus[]) {
    setCommandStatuses((prev) => {
      const previousById = new Map(prev.map((item) => [item.id, item]));
      const updatedIds = new Set(updates.map((item) => item.id));
      const merged = updates.map((item) => ({ ...previousById.get(item.id), ...item }));
      const rest = prev.filter((item) => !updatedIds.has(item.id));
      const next = [...merged, ...rest].slice(0, 120);
      commandStatusesRef.current = next;
      return next;
    });
  }

  function retryTerminalCommand(status: WorkflowTerminalCommandStatus) {
    if (!status.retryable || !terminalHost.has(status.terminalId)) {
      upsertCommandStatuses([
        {
          ...status,
          state: 'failed',
          updatedAt: new Date().toISOString(),
          error: 'terminal session is not available.',
        },
      ]);
      return;
    }
    terminalHost.sendLine(status.terminalId, status.command);
    const now = new Date().toISOString();
    upsertCommandStatuses([
      {
        ...status,
        state: 'sent',
        sentAt: now,
        updatedAt: now,
        responsePreview: undefined,
        error: undefined,
      },
    ]);
    appendCommandLog(`Retry: ${status.command} -> ${status.terminalLabel}`);
  }

  function selectResponseGroupTargets(group: WorkflowTerminalResponseGroup) {
    const availableIds = group.terminalIds.filter((termId) => terminalHost.has(termId));
    setSelectedTermIds(availableIds);
    setWorkspaceTab('monitor');
    appendCommandLog(`Selected response group: ${group.count} targets -> ${availableIds.length} available`);
  }

  return {
    selectedTermIds,
    setSelectedTermIds,
    terminalSequential,
    setTerminalSequential,
    commandLog,
    clearCommandLog,
    commandStatuses,
    setCommandStatuses,
    commandStatusesRef,
    availableTerminalGroups,
    appendCommandLog,
    upsertCommandStatuses,
    retryTerminalCommand,
    selectResponseGroupTargets,
  };
}
