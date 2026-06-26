import type { WorkflowRunResult, WorkflowTraceStep } from './workflowEngine';
import { buildTerminalResponseGroups, formatLogValue, maskWorkflowSecrets } from './workflowRunnerRuntimeUtils';
import type {
  ResultTab,
  WorkflowDiagnosticItem,
  WorkflowExecutionHistoryItem,
  WorkflowHistoryStatusFilter,
  WorkflowRunProgress,
  WorkflowTerminalResponseComparison,
  WorkflowTerminalResponseGroup,
  WorkflowTerminalResultFilter,
  WorkflowTerminalResultSummary,
} from './workflowRunnerTypes';

export function renderResult(
  tab: ResultTab,
  result: WorkflowRunResult,
  stats: { actions: number; completed: number; failed: number; events: number; updates: number },
  terminalResultSummary: WorkflowTerminalResultSummary[],
  totalTerminalResultCount: number,
  terminalResponseComparison: WorkflowTerminalResponseComparison[],
  summaryQuery: string,
  summaryStatusFilter: WorkflowTerminalResultFilter,
  onSummaryQueryChange: (value: string) => void,
  onSummaryStatusFilterChange: (value: WorkflowTerminalResultFilter) => void,
  onSelectResponseGroupTargets: (group: WorkflowTerminalResponseGroup) => void,
) {
  if (tab === 'summary') {
    return (
      <div className="wfr-summary">
        <div className={result.success ? 'wfr-status ok' : 'wfr-status fail'}>
          <strong>{result.success ? 'Success' : 'Failed'}</strong>
          <span>{result.workflow.name}</span>
        </div>
        <div className="wfr-metrics">
          <Metric label="Actions" value={stats.actions} />
          <Metric label="Completed" value={stats.completed} />
          <Metric label="Failed" value={stats.failed} />
          <Metric label="Events" value={stats.events} />
          <Metric label="Updates" value={stats.updates} />
        </div>
        <ResultSummaryView
          terminalResultSummary={terminalResultSummary}
          totalCount={totalTerminalResultCount}
          responseComparison={terminalResponseComparison}
          query={summaryQuery}
          statusFilter={summaryStatusFilter}
          onQueryChange={onSummaryQueryChange}
          onStatusFilterChange={onSummaryStatusFilterChange}
          onSelectResponseGroupTargets={onSelectResponseGroupTargets}
        />
        {result.diagnostics.length ? <pre>{JSON.stringify(result.diagnostics, null, 2)}</pre> : null}
      </div>
    );
  }
  if (tab === 'trace') return <TraceTimelineView trace={result.trace} />;
  if (tab === 'events') return <JsonBlock value={result.executionEvents} />;
  if (tab === 'updates') return <JsonBlock value={result.hostUpdates} />;
  if (tab === 'variables') return <RuntimeVariablesView result={result} />;
  return <JsonBlock value={result.context} />;
}

function ResultSummaryView({
  terminalResultSummary,
  totalCount,
  responseComparison,
  query,
  statusFilter,
  onQueryChange,
  onStatusFilterChange,
  onSelectResponseGroupTargets,
}: {
  terminalResultSummary: WorkflowTerminalResultSummary[];
  totalCount: number;
  responseComparison: WorkflowTerminalResponseComparison[];
  query: string;
  statusFilter: WorkflowTerminalResultFilter;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: WorkflowTerminalResultFilter) => void;
  onSelectResponseGroupTargets: (group: WorkflowTerminalResponseGroup) => void;
}) {
  const responseGroups = buildTerminalResponseGroups(responseComparison);

  function copyResponseGroupLabels(group: WorkflowTerminalResponseGroup) {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(group.terminalLabels.join('\n'));
  }

  return (
    <section className="wfr-result-summary">
      <div className="wfr-result-summary-head">
        <strong>Terminal Result Summary</strong>
        <span>
          {terminalResultSummary.length}/{totalCount} targets
        </span>
      </div>
      <div className="wfr-summary-tools">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Search terminal results"
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.currentTarget.value as WorkflowTerminalResultFilter)}
        >
          <option value="all">All terminal results</option>
          <option value="failed">Failed only</option>
          <option value="responded">Responded only</option>
          <option value="sent">Sent only</option>
        </select>
      </div>
      {terminalResultSummary.length ? (
        terminalResultSummary.map((item) => (
          <div key={item.terminalId} className={`wfr-summary-row ${item.failed ? 'failed' : 'ok'}`}>
            <div>
              <strong>{item.terminalLabel}</strong>
              <span>{item.lastError || item.lastResponsePreview || item.lastCommand}</span>
            </div>
            <div className="wfr-summary-counts">
              <span>Sent {item.sent}</span>
              <span>Responded {item.responded}</span>
              <span>Failed {item.failed}</span>
              <span>{item.lastState}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="wfr-empty-inline">No terminal command results in this run.</div>
      )}
      <div className="wfr-response-compare">
        <div className="wfr-response-compare-head">
          <strong>Response Compare</strong>
          <span>{responseComparison.filter((item) => item.status === 'different').length} different</span>
        </div>
        {responseComparison.length ? (
          responseComparison.map((item) => (
            <div key={item.terminalId} className={`wfr-response-row ${item.status}`}>
              <span>{item.status}</span>
              <strong>{item.terminalLabel}</strong>
              <code>{item.responsePreview || '-'}</code>
            </div>
          ))
        ) : (
          <div className="wfr-empty-inline">No terminal responses to compare.</div>
        )}
      </div>
      <div className="wfr-response-groups">
        <div className="wfr-response-compare-head">
          <strong>Response Groups</strong>
          <span>{responseGroups.length} groups</span>
        </div>
        {responseGroups.length ? (
          responseGroups.map((group) => (
            <div key={group.groupKey} className={`wfr-response-group ${group.status}`}>
              <div>
                <strong>{group.count} targets</strong>
                <span>{group.terminalLabels.join(', ')}</span>
              </div>
              <code>{group.responsePreview || 'No response captured'}</code>
              <button type="button" onClick={() => copyResponseGroupLabels(group)}>
                Copy Labels
              </button>
              <button type="button" onClick={() => onSelectResponseGroupTargets(group)}>
                Select Targets
              </button>
            </div>
          ))
        ) : (
          <div className="wfr-empty-inline">No terminal response groups.</div>
        )}
      </div>
    </section>
  );
}

export function PreflightDiagnosticsBanner({ diagnostics }: { diagnostics: WorkflowDiagnosticItem[] }) {
  const errors = diagnostics.filter((item) => item.severity === 'error');
  const warnings = diagnostics.filter((item) => item.severity === 'warn');
  const status = errors.length ? 'error' : warnings.length ? 'warn' : 'ok';
  return (
    <section className={`wfr-preflight ${status}`}>
      <div className="wfr-preflight-head">
        <strong>Preflight checks</strong>
        <span>
          {errors.length} errors / {warnings.length} warnings
        </span>
      </div>
      {diagnostics.length ? (
        <div className="wfr-preflight-list">
          {diagnostics.slice(0, 5).map((item, index) => (
            <div key={`${item.path}-${item.code ?? index}`} className={`wfr-preflight-row ${item.severity}`}>
              <span>{item.severity}</span>
              <div>
                <strong>{item.path}</strong>
                <p>{item.message}</p>
              </div>
            </div>
          ))}
          {diagnostics.length > 5 ? (
            <div className="wfr-preflight-more">+{diagnostics.length - 5} more diagnostics in the run summary.</div>
          ) : null}
        </div>
      ) : (
        <div className="wfr-preflight-ok">No preflight issues found.</div>
      )}
    </section>
  );
}

export function WorkflowRunProgressView({ progress, paused }: { progress: WorkflowRunProgress; paused: boolean }) {
  if (progress.status === 'idle') return null;
  const stateLabel = paused ? 'paused' : progress.status;
  return (
    <section className={`wfr-run-progress ${stateLabel}`}>
      <div className="wfr-run-progress-head">
        <div>
          <span>Execution Progress</span>
          <strong>{stateLabel.toUpperCase()}</strong>
        </div>
        <div>
          <span>Current Action</span>
          <strong>{progress.currentActionId || '-'}</strong>
        </div>
        <div>
          <span>Scope</span>
          <strong>{progress.currentScope || '-'}</strong>
        </div>
        <div>
          <span>Completed</span>
          <strong>
            {progress.completed}/{progress.total}
          </strong>
        </div>
        <div>
          <span>Failed</span>
          <strong>{progress.failed}</strong>
        </div>
      </div>
      <div
        className="wfr-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        aria-label="Workflow execution progress"
      >
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className="wfr-run-progress-foot">
        <span>{progress.lastEventKind || 'workflow:start'}</span>
        <span>{progress.currentActionType || '-'}</span>
        {progress.lastError ? <strong>{progress.lastError}</strong> : null}
      </div>
    </section>
  );
}

function TraceTimelineView({ trace }: { trace: WorkflowTraceStep[] }) {
  if (!trace.length) {
    return <div className="wfr-trace-empty">No execution trace recorded.</div>;
  }
  return (
    <section className="wfr-trace-timeline">
      <div className="wfr-trace-head">
        <strong>Execution Timeline</strong>
        <span>{trace.length} actions</span>
      </div>
      <div className="wfr-trace-list">
        {trace.map((step, index) => {
          const output = formatTraceStepOutput(step);
          return (
            <div key={`${step.id}-${index}`} className={`wfr-trace-row ${step.status}`}>
              <span className="wfr-trace-index">{index + 1}</span>
              <div className="wfr-trace-main">
                <strong>{step.id || '-'}</strong>
                <span>
                  {step.type} / {step.scope}
                </span>
              </div>
              <span className="wfr-trace-status">{step.status}</span>
              <span className="wfr-trace-duration">{formatTraceDuration(step)}</span>
              <code title={output}>{output}</code>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatTraceStepOutput(step: WorkflowTraceStep): string {
  if (step.error) return step.error;
  if (step.output === undefined) return '-';
  const output = maskWorkflowSecrets(step.output);
  if (typeof output === 'string') return output || '-';
  try {
    return JSON.stringify(output);
  } catch {
    return String(output);
  }
}

function formatTraceDuration(step: WorkflowTraceStep): string {
  if (typeof step.durationMs === 'number') return `${Math.max(0, step.durationMs)}ms`;
  if (step.startedAt && step.endedAt) {
    const duration = Date.parse(step.endedAt) - Date.parse(step.startedAt);
    if (Number.isFinite(duration)) return `${Math.max(0, duration)}ms`;
  }
  return step.status === 'running' ? 'running' : '-';
}

function RuntimeVariablesView({ result }: { result: WorkflowRunResult }) {
  const context = result.context;
  return (
    <div className="wfr-variable-inspector">
      <div className="wfr-variable-grid">
        <RuntimeValueCard label="lastExtractedValue" value={context['lastExtractedValue']} />
        <RuntimeValueCard label="lastCommandResponse" value={context['lastCommandResponse']} />
      </div>
      <div className="wfr-variable-sections">
        <RuntimeValueCard label="record" value={context['record']} />
        <RuntimeValueCard label="global" value={context['global']} />
        <RuntimeValueCard label="local" value={context['local']} />
        <RuntimeValueCard label="parameter" value={context['parameter']} />
      </div>
    </div>
  );
}

function RuntimeValueCard({ label, value }: { label: string; value: unknown }) {
  return (
    <section className="wfr-variable-card">
      <div>{label}</div>
      <pre>{formatLogValue(maskWorkflowSecrets(value))}</pre>
    </section>
  );
}

export function HistoryView({
  history,
  totalCount,
  query,
  statusFilter,
  storageStatus,
  onQueryChange,
  onStatusFilterChange,
  onOpenHistoryItem,
  onRerunHistoryItem,
  onDeleteHistoryItem,
  onClearHistory,
}: {
  history: WorkflowExecutionHistoryItem[];
  totalCount: number;
  query: string;
  statusFilter: WorkflowHistoryStatusFilter;
  storageStatus: string;
  onQueryChange: (value: string) => void;
  onStatusFilterChange: (value: WorkflowHistoryStatusFilter) => void;
  onOpenHistoryItem: (itemId: string) => void;
  onRerunHistoryItem: (itemId: string) => void | Promise<void>;
  onDeleteHistoryItem: (itemId: string) => void | Promise<void>;
  onClearHistory: () => void | Promise<void>;
}) {
  return (
    <div className="wfr-history">
      <div className="wfr-history-head">
        <div>
          <strong>Execution History</strong>
          <span>
            {history.length}/{totalCount} runs
          </span>
        </div>
        <button type="button" disabled={!totalCount} onClick={onClearHistory}>
          Clear History
        </button>
      </div>
      <div className="wfr-history-filters">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Search history"
        />
        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.currentTarget.value as WorkflowHistoryStatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="success">Only success</option>
          <option value="failed">Only failed</option>
        </select>
      </div>
      {storageStatus ? <div className="wfr-history-storage">{storageStatus}</div> : null}
      {history.length ? (
        history.map((item) => (
          <div key={item.id} className={`wfr-history-row ${item.success ? 'ok' : 'fail'}`}>
            <div>
              <strong>
                {item.workflowName}
                {item.persisted ? <span className="wfr-history-persisted">saved</span> : null}
              </strong>
              <div className="wfr-history-meta">
                <span>{new Date(item.startedAt).toLocaleTimeString()}</span>
                <span>{item.scope}</span>
                <span>{item.targetMode}</span>
                <span>{item.targetCount} targets</span>
                <span>{item.actionCount} actions</span>
                <span>{item.durationMs}ms</span>
                {item.filePath ? <span title={item.filePath}>file</span> : null}
              </div>
            </div>
            <div className="wfr-history-actions">
              <span>{item.success ? 'Success' : 'Failed'}</span>
              <button type="button" onClick={() => onOpenHistoryItem(item.id)}>
                Open
              </button>
              <button type="button" disabled={!item.workflowSource?.trim()} onClick={() => onRerunHistoryItem(item.id)}>
                Rerun
              </button>
              <button type="button" onClick={() => onDeleteHistoryItem(item.id)}>
                Delete
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className="wfr-empty-inline">
          {totalCount ? 'No execution history matches the current filters.' : 'No execution history saved yet.'}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="wfr-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  return <pre className="wfr-json">{JSON.stringify(maskWorkflowSecrets(value), null, 2)}</pre>;
}
