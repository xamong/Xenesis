import type { WorkflowRunResult } from './workflowEngine';
import { HistoryView, renderResult } from './workflowRunnerResultViews';
import type {
  ResultTab,
  WorkflowExecutionHistoryItem,
  WorkflowHistoryStatusFilter,
  WorkflowReportFormat,
  WorkflowTerminalResponseComparison,
  WorkflowTerminalResponseGroup,
  WorkflowTerminalResultFilter,
  WorkflowTerminalResultSummary,
} from './workflowRunnerTypes';

const RESULT_TABS: ResultTab[] = ['summary', 'trace', 'events', 'updates', 'variables', 'context', 'history'];

export function WorkflowRunnerOutputView({
  tab,
  onTabChange,
  exportStatus,
  result,
  onSaveLog,
  onSaveReport,
  error,
  history,
  historyTotalCount,
  historyQuery,
  historyStatusFilter,
  historyStorageStatus,
  onHistoryQueryChange,
  onHistoryStatusFilterChange,
  onOpenHistoryItem,
  onRerunHistoryItem,
  onDeleteHistoryItem,
  onClearHistory,
  stats,
  terminalResultSummary,
  totalTerminalResultCount,
  terminalResponseComparison,
  summaryQuery,
  summaryStatusFilter,
  onSummaryQueryChange,
  onSummaryStatusFilterChange,
  onSelectResponseGroupTargets,
}: {
  tab: ResultTab;
  onTabChange: (tab: ResultTab) => void;
  exportStatus: string;
  result: WorkflowRunResult | null;
  onSaveLog: () => void;
  onSaveReport: (format: WorkflowReportFormat) => void;
  error: string;
  history: WorkflowExecutionHistoryItem[];
  historyTotalCount: number;
  historyQuery: string;
  historyStatusFilter: WorkflowHistoryStatusFilter;
  historyStorageStatus: string;
  onHistoryQueryChange: (value: string) => void;
  onHistoryStatusFilterChange: (value: WorkflowHistoryStatusFilter) => void;
  onOpenHistoryItem: (itemId: string) => void;
  onRerunHistoryItem: (itemId: string) => void;
  onDeleteHistoryItem: (itemId: string) => void;
  onClearHistory: () => void;
  stats: { actions: number; completed: number; failed: number; events: number; updates: number };
  terminalResultSummary: WorkflowTerminalResultSummary[];
  totalTerminalResultCount: number;
  terminalResponseComparison: WorkflowTerminalResponseComparison[];
  summaryQuery: string;
  summaryStatusFilter: WorkflowTerminalResultFilter;
  onSummaryQueryChange: (value: string) => void;
  onSummaryStatusFilterChange: (value: WorkflowTerminalResultFilter) => void;
  onSelectResponseGroupTargets: (group: WorkflowTerminalResponseGroup) => void;
}) {
  return (
    <section className="wfr-output">
      <div className="wfr-output-head">
        <div className="wfr-tabs">
          {RESULT_TABS.map((item) => (
            <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => onTabChange(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="wfr-output-actions">
          {exportStatus ? <span className="wfr-export-status">{exportStatus}</span> : null}
          <button type="button" disabled={!result} onClick={onSaveLog}>
            Save Log
          </button>
          <button type="button" disabled={!result} onClick={() => onSaveReport('json')}>
            Save JSON
          </button>
          <button type="button" disabled={!result} onClick={() => onSaveReport('csv')}>
            Save CSV
          </button>
        </div>
      </div>

      {error ? <div className="wfr-error">{error}</div> : null}
      {!result && !error && tab !== 'history' ? (
        <div className="wfr-empty">
          Run a workflow to inspect execution trace, runtime events, host updates, and final context.
        </div>
      ) : null}
      {tab === 'history' ? (
        <HistoryView
          history={history}
          totalCount={historyTotalCount}
          query={historyQuery}
          statusFilter={historyStatusFilter}
          storageStatus={historyStorageStatus}
          onQueryChange={onHistoryQueryChange}
          onStatusFilterChange={onHistoryStatusFilterChange}
          onOpenHistoryItem={onOpenHistoryItem}
          onRerunHistoryItem={onRerunHistoryItem}
          onDeleteHistoryItem={onDeleteHistoryItem}
          onClearHistory={onClearHistory}
        />
      ) : result ? (
        renderResult(
          tab,
          result,
          stats,
          terminalResultSummary,
          totalTerminalResultCount,
          terminalResponseComparison,
          summaryQuery,
          summaryStatusFilter,
          onSummaryQueryChange,
          onSummaryStatusFilterChange,
          onSelectResponseGroupTargets,
        )
      ) : null}
    </section>
  );
}
