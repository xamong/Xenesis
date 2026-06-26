import type { WorkflowRunResult } from './workflowEngine';
import {
  createWorkflowLogFileName,
  createWorkflowReportFileName,
  serializeWorkflowRunCsvReport,
  serializeWorkflowRunJsonReport,
  serializeWorkflowRunLog,
} from './workflowRunnerRuntimeUtils';
import type {
  WorkflowExecutionHistoryItem,
  WorkflowReportFormat,
  WorkflowTerminalCommandStatus,
} from './workflowRunnerTypes';

interface UseWorkflowRunnerReportsOptions {
  result: WorkflowRunResult | null;
  visibleHistoryItem?: WorkflowExecutionHistoryItem;
  commandStatuses: WorkflowTerminalCommandStatus[];
  setExportStatus: (status: string) => void;
}

export function useWorkflowRunnerReports({
  result,
  visibleHistoryItem,
  commandStatuses,
  setExportStatus,
}: UseWorkflowRunnerReportsOptions) {
  async function saveVisibleResultLog() {
    await saveVisibleResultReport('log');
  }

  async function saveVisibleResultReport(format: WorkflowReportFormat) {
    if (!result) return;
    setExportStatus('');
    try {
      if (format === 'log') {
        const saveResult = await window.terminalAPI.saveLog({
          defaultName: createWorkflowLogFileName(result.workflow.name, visibleHistoryItem?.startedAt),
          text: serializeWorkflowRunLog(result, visibleHistoryItem, commandStatuses),
        });
        setExportStatus(saveResult.saved ? `Saved: ${saveResult.path ?? 'log file'}` : 'Save canceled');
        return;
      }

      let content = '';
      switch (format) {
        case 'json':
          content = serializeWorkflowRunJsonReport(result, visibleHistoryItem, commandStatuses);
          break;
        case 'csv':
          content = serializeWorkflowRunCsvReport(result, visibleHistoryItem, commandStatuses);
          break;
        default:
          content = serializeWorkflowRunLog(result, visibleHistoryItem, commandStatuses);
          break;
      }
      const saveResult = await window.fileAPI.saveTextAs({
        defaultName: createWorkflowReportFileName(result.workflow.name, visibleHistoryItem?.startedAt, format),
        content,
        filters: [
          format === 'json'
            ? { name: 'Workflow JSON Report', extensions: ['json'] }
            : { name: 'Workflow CSV Report', extensions: ['csv'] },
          { name: 'All files', extensions: ['*'] },
        ],
      });
      setExportStatus(saveResult.saved ? `Saved: ${saveResult.path ?? `${format} report`}` : 'Save canceled');
    } catch (saveError) {
      setExportStatus(`Save failed: ${saveError instanceof Error ? saveError.message : String(saveError)}`);
    }
  }

  return {
    saveVisibleResultLog,
    saveVisibleResultReport,
  };
}
