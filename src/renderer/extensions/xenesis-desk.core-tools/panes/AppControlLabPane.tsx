import { useMemo, useState } from 'react';
import type { ExternalAppAction } from '../../../../shared/externalAppControl';
import { deskBridge } from '../../../deskBridge';
import { AppControlLabNetworkDiagram } from './AppControlLabNetworkDiagram';
import {
  APP_CONTROL_LAB_ACTIONS,
  type AppControlLabActionDefinition,
  type AppControlLabFormState,
  type AppControlLabHistoryEntry,
  type AppControlLabResultSummary,
  applyAppControlLabElementSelection,
  buildAppControlLabArgs,
  isAppControlLabTreeRowSelected,
  recordAppControlLabHistory,
  selectedElementRefLabel,
  summarizeAppControlLabCallResult,
} from './appControlLabModel';

type ActionGroup = 'Target' | 'Observe' | 'Visual verify';

interface LabRawRequest {
  path: string;
  args: ExternalAppAction;
  options: { approved: true };
}

const INITIAL_FORM: AppControlLabFormState = {
  appId: 'notepad',
  depth: 3,
  limit: 200,
  x: 100,
  y: 100,
  durationMs: 1200,
};

const ACTION_GROUPS: Record<ActionGroup, AppControlLabActionDefinition['id'][]> = {
  Target: ['status', 'launch', 'find', 'close'],
  Observe: ['inspect', 'tree', 'menuExplore', 'elementFromPoint'],
  'Visual verify': ['highlight', 'captureElement'],
};

function createHistoryEntry(
  action: AppControlLabActionDefinition,
  args: ExternalAppAction,
  ok: boolean,
  message: string,
  errorLabel?: string,
): AppControlLabHistoryEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    actionId: action.id,
    path: action.path,
    at: Date.now(),
    args,
    result: { ok, message, ...(errorLabel ? { errorLabel } : {}) },
  };
}

function stringifyJson(value: unknown): string {
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function fieldValue(value: AppControlLabFormState[keyof AppControlLabFormState]): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return value === undefined ? '' : String(value);
}

function actionDefinitions(ids: readonly AppControlLabActionDefinition['id'][]): AppControlLabActionDefinition[] {
  return ids
    .map((id) => APP_CONTROL_LAB_ACTIONS.find((action) => action.id === id))
    .filter((action): action is AppControlLabActionDefinition => Boolean(action));
}

export function AppControlLabPane() {
  const [form, setForm] = useState<AppControlLabFormState>(INITIAL_FORM);
  const [runningActionId, setRunningActionId] = useState<AppControlLabActionDefinition['id'] | null>(null);
  const [summary, setSummary] = useState<AppControlLabResultSummary | null>(null);
  const [rawRequest, setRawRequest] = useState<LabRawRequest | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [history, setHistory] = useState<AppControlLabHistoryEntry[]>([]);

  const groupedActions = useMemo(
    () =>
      (Object.entries(ACTION_GROUPS) as [ActionGroup, AppControlLabActionDefinition['id'][]][]).map(([label, ids]) => ({
        label,
        actions: actionDefinitions(ids),
      })),
    [],
  );

  function updateField<K extends keyof AppControlLabFormState>(key: K, value: AppControlLabFormState[K]): void {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function selectElement(row: AppControlLabResultSummary['treeRows'][number]): void {
    setForm((previous) => applyAppControlLabElementSelection(previous, row));
  }

  function selectElementRef(elementRef: string): void {
    setForm((previous) => applyAppControlLabElementSelection(previous, { elementRef }));
  }

  async function runAction(action: AppControlLabActionDefinition): Promise<void> {
    const args = buildAppControlLabArgs(action, form);
    const request: LabRawRequest = { path: action.path, args, options: { approved: true } };
    setRawRequest(request);
    setRawResponse(null);
    setRunningActionId(action.id);

    try {
      const callResult = await deskBridge.call(action.path, args, { approved: true });
      setRawResponse(callResult);

      const nextSummary = summarizeAppControlLabCallResult(action, callResult);
      setSummary(nextSummary);
      setHistory((previous) =>
        recordAppControlLabHistory(
          previous,
          createHistoryEntry(action, args, nextSummary.ok, nextSummary.message, nextSummary.errorLabel),
        ),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResponse = { ok: false, error: errorMessage };
      const nextSummary = summarizeAppControlLabCallResult(action, errorResponse);
      setRawResponse(errorResponse);
      setSummary(nextSummary);
      setHistory((previous) =>
        recordAppControlLabHistory(
          previous,
          createHistoryEntry(action, args, false, nextSummary.message, nextSummary.errorLabel),
        ),
      );
    } finally {
      setRunningActionId(null);
    }
  }

  const target = summary?.target;
  const primaryWindow = summary?.primaryWindow;

  return (
    <div className="xd-app-control-lab app-control-lab">
      <header className="xd-app-control-lab-head">
        <div>
          <h2>App Control Lab</h2>
          <span>Registered app control test bench</span>
        </div>
        <code>{runningActionId ? `running:${runningActionId}` : 'ready'}</code>
      </header>

      <div className="xd-app-control-lab-layout">
        <section className="xd-app-control-lab-console" aria-label="App control request controls">
          <div className="xd-app-control-lab-section">
            <div className="xd-app-control-lab-section-head">
              <strong>Target</strong>
              <span>profile / process / element</span>
            </div>
            <div className="xd-app-control-lab-grid">
              <label>
                <span>appId</span>
                <input
                  value={fieldValue(form.appId)}
                  onChange={(event) => updateField('appId', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>path</span>
                <input
                  value={fieldValue(form.path)}
                  placeholder="optional executable path"
                  onChange={(event) => updateField('path', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>argsText</span>
                <input
                  value={fieldValue(form.argsText)}
                  placeholder="launch args"
                  onChange={(event) => updateField('argsText', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>cwd</span>
                <input
                  value={fieldValue(form.cwd)}
                  onChange={(event) => updateField('cwd', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>windowId</span>
                <input
                  value={fieldValue(form.windowId)}
                  onChange={(event) => updateField('windowId', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>processName</span>
                <input
                  value={fieldValue(form.processName)}
                  placeholder="notepad.exe"
                  onChange={(event) => updateField('processName', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>titleContains</span>
                <input
                  value={fieldValue(form.titleContains)}
                  onChange={(event) => updateField('titleContains', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>elementRef</span>
                <input
                  value={fieldValue(form.elementRef)}
                  placeholder="selected element ref"
                  onChange={(event) => updateField('elementRef', event.currentTarget.value)}
                />
              </label>
              <label>
                <span>screenshotPath</span>
                <input
                  value={fieldValue(form.screenshotPath)}
                  placeholder="optional capture path"
                  onChange={(event) => updateField('screenshotPath', event.currentTarget.value)}
                />
              </label>
            </div>
            <p className="xd-app-control-lab-note">
              Selected element: <code>{selectedElementRefLabel(form)}</code>
            </p>
          </div>

          <div className="xd-app-control-lab-options">
            <div className="xd-app-control-lab-section">
              <div className="xd-app-control-lab-section-head">
                <strong>Tree</strong>
                <span>inspect / tree payload</span>
              </div>
              <div className="xd-app-control-lab-inline-grid">
                <label>
                  <span>depth</span>
                  <input
                    type="number"
                    value={fieldValue(form.depth)}
                    onChange={(event) => updateField('depth', event.currentTarget.value)}
                  />
                </label>
                <label>
                  <span>limit</span>
                  <input
                    type="number"
                    value={fieldValue(form.limit)}
                    onChange={(event) => updateField('limit', event.currentTarget.value)}
                  />
                </label>
              </div>
              <div className="xd-app-control-lab-checks">
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(form.includeValues)}
                    onChange={(event) => updateField('includeValues', event.currentTarget.checked)}
                  />
                  <span>includeValues</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(form.includeFullTree)}
                    onChange={(event) => updateField('includeFullTree', event.currentTarget.checked)}
                  />
                  <span>includeFullTree</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={Boolean(form.includeTreePreview)}
                    onChange={(event) => updateField('includeTreePreview', event.currentTarget.checked)}
                  />
                  <span>includeTreePreview</span>
                </label>
              </div>
            </div>

            <div className="xd-app-control-lab-section">
              <div className="xd-app-control-lab-section-head">
                <strong>Point / highlight</strong>
                <span>screen coordinates</span>
              </div>
              <div className="xd-app-control-lab-inline-grid">
                <label>
                  <span>x</span>
                  <input
                    type="number"
                    value={fieldValue(form.x)}
                    onChange={(event) => updateField('x', event.currentTarget.value)}
                  />
                </label>
                <label>
                  <span>y</span>
                  <input
                    type="number"
                    value={fieldValue(form.y)}
                    onChange={(event) => updateField('y', event.currentTarget.value)}
                  />
                </label>
                <label>
                  <span>durationMs</span>
                  <input
                    type="number"
                    value={fieldValue(form.durationMs)}
                    onChange={(event) => updateField('durationMs', event.currentTarget.value)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="xd-app-control-lab-actions">
            {groupedActions.map((group) => (
              <div className="xd-app-control-lab-action-group" key={group.label}>
                <strong>{group.label}</strong>
                <div>
                  {group.actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      disabled={Boolean(runningActionId)}
                      onClick={() => {
                        void runAction(action);
                      }}
                    >
                      {runningActionId === action.id ? 'Running...' : action.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <AppControlLabNetworkDiagram
            rows={summary?.treeRows ?? []}
            selectedElementRef={form.elementRef}
            onSelectElementRef={selectElementRef}
          />
        </section>

        <section className="xd-app-control-lab-results" aria-label="App control results">
          <div className={`xd-app-control-lab-status ${summary?.ok ? 'is-ok' : summary ? 'is-error' : ''}`}>
            <strong>{summary ? (summary.ok ? 'OK' : 'FAILED') : 'No result'}</strong>
            <span>{summary?.message || 'Run an action to capture request, response, and history.'}</span>
            {summary?.errorLabel && <code>{summary.errorLabel}</code>}
          </div>

          <div className="xd-app-control-lab-facts">
            <div>
              <span>window id</span>
              <strong>{formatValue(target?.windowId ?? primaryWindow?.windowId)}</strong>
            </div>
            <div>
              <span>title</span>
              <strong>{formatValue(target?.title ?? primaryWindow?.title)}</strong>
            </div>
            <div>
              <span>bounds</span>
              <strong>{formatValue(target?.bounds)}</strong>
            </div>
            <div>
              <span>process id</span>
              <strong>{formatValue(target?.processId ?? primaryWindow?.processId)}</strong>
            </div>
            <div>
              <span>process name</span>
              <strong>{formatValue(target?.processName)}</strong>
            </div>
          </div>

          {summary?.capture && (
            <div className="xd-app-control-lab-capture">
              <div>
                <strong>Capture</strong>
                <code>{summary.capture.path || 'data URL only'}</code>
                <span>
                  {formatValue(summary.capture.width)}x{formatValue(summary.capture.height)}{' '}
                  {formatValue(summary.capture.bounds)}
                </span>
              </div>
              {summary.capture.dataUrl && <img src={summary.capture.dataUrl} alt="Captured app element" />}
            </div>
          )}

          <div className="xd-app-control-lab-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Use</th>
                  <th>Depth</th>
                  <th>Label</th>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Ref</th>
                  <th>Bounds</th>
                </tr>
              </thead>
              <tbody>
                {summary?.treeRows.length ? (
                  summary.treeRows.map((row, index) => {
                    const selected = isAppControlLabTreeRowSelected(form, row);
                    return (
                      <tr
                        className={selected ? 'is-selected' : undefined}
                        key={`${row.elementRef}-${index}`}
                        onClick={() => selectElement(row)}
                      >
                        <td>
                          <button
                            className="xd-app-control-lab-mini-btn"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectElement(row);
                            }}
                          >
                            Use
                          </button>
                        </td>
                        <td>{row.depth}</td>
                        <td style={{ paddingLeft: `${6 + row.depth * 12}px` }}>{row.label}</td>
                        <td>{formatValue(row.role ?? row.controlType)}</td>
                        <td>{formatValue(row.name)}</td>
                        <td>{formatValue(row.value)}</td>
                        <td>
                          <code>{row.elementRef}</code>
                        </td>
                        <td>{formatValue(row.bounds)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8}>No tree rows.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="xd-app-control-lab-raw">
            <label>
              <span>Raw request</span>
              <pre>{stringifyJson(rawRequest)}</pre>
            </label>
            <label>
              <span>Raw response</span>
              <pre>{stringifyJson(rawResponse)}</pre>
            </label>
          </div>

          <div className="xd-app-control-lab-history">
            <div className="xd-app-control-lab-section-head">
              <strong>History</strong>
              <span>{history.length} entries</span>
            </div>
            {history.length ? (
              history.map((entry) => (
                <div
                  className={`xd-app-control-lab-history-row ${entry.result.ok ? 'is-ok' : 'is-error'}`}
                  key={entry.id}
                >
                  <span>{new Date(entry.at).toLocaleTimeString()}</span>
                  <strong>{entry.actionId}</strong>
                  <code>{entry.path}</code>
                  <p>{entry.result.errorLabel || entry.result.message}</p>
                </div>
              ))
            ) : (
              <p>No actions recorded.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
