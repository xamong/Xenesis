import { useMemo, useState } from 'react';
import {
  buildTerminalResponseComparison,
  buildTerminalResultSummary,
  filterTerminalResultSummary,
} from './workflowRunnerRuntimeUtils';
import type { WorkflowTerminalCommandStatus, WorkflowTerminalResultFilter } from './workflowRunnerTypes';

export function useWorkflowRunnerResultSummary(commandStatuses: WorkflowTerminalCommandStatus[]) {
  const [summaryQuery, setSummaryQuery] = useState('');
  const [summaryStatusFilter, setSummaryStatusFilter] = useState<WorkflowTerminalResultFilter>('all');

  const terminalResultSummary = useMemo(() => buildTerminalResultSummary(commandStatuses), [commandStatuses]);

  const filteredTerminalResultSummary = useMemo(
    () => filterTerminalResultSummary(terminalResultSummary, summaryQuery, summaryStatusFilter),
    [summaryQuery, summaryStatusFilter, terminalResultSummary],
  );

  const terminalResponseComparison = useMemo(
    () => buildTerminalResponseComparison(filteredTerminalResultSummary),
    [filteredTerminalResultSummary],
  );

  return {
    terminalResultSummary,
    filteredTerminalResultSummary,
    terminalResponseComparison,
    summaryQuery,
    setSummaryQuery,
    summaryStatusFilter,
    setSummaryStatusFilter,
  };
}
