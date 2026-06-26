import type { RemoteFileProfile, RemoteTerminalProfile, WorkflowRunHistoryRecord } from '../../../shared/types';
import type {
  WorkflowDesignerAction,
  WorkflowDesignerActionType,
  WorkflowDesignerBranchKey,
  WorkflowDesignerModel,
  WorkflowDesignerVariable,
} from './workflowDesigner';
import type { WorkflowRunResult, WorkflowTraceStep } from './workflowEngine';

export type ResultTab = 'summary' | 'trace' | 'events' | 'updates' | 'variables' | 'context' | 'history';
export type WorkspaceTab = 'designer' | 'code' | 'monitor';
export type WorkflowRunScope = 'all' | 'selected' | 'until';
export type WorkflowTargetMode = 'selected' | 'active' | 'all' | 'group' | 'failed';
export type WorkflowDiagnosticItem = WorkflowRunResult['diagnostics'][number];
export type WorkflowReportFormat = 'log' | 'json' | 'csv';
export type WorkflowHistoryStatusFilter = 'all' | 'success' | 'failed';
export type WorkflowTerminalResultFilter = 'all' | 'failed' | 'responded' | 'sent';
export type WorkflowCommandStatusFilter = 'all' | 'sent' | 'responded' | 'failed';

export interface WorkflowRunOptions {
  simulateApi: boolean;
  sequential: boolean;
  actionId?: string;
  targetMode: WorkflowTargetMode;
  targetGroupId: string;
  commandConcurrency: number;
}

export interface WorkflowExecutionPreset {
  id: string;
  label: string;
  source: 'builtin' | 'user';
  workflow: string;
  fixture: string;
  scope: WorkflowRunScope;
  actionId?: string;
  simulateApi: boolean;
  sequential: boolean;
  targetMode: WorkflowTargetMode;
  targetGroupId: string;
  commandConcurrency: number;
}

export interface WorkflowExecutionHistoryItem {
  id: string;
  workflowName: string;
  workflowSource?: string;
  fixture?: string;
  success: boolean;
  scope: WorkflowRunScope;
  actionId?: string;
  simulateApi?: boolean;
  sequential?: boolean;
  targetMode: WorkflowTargetMode;
  targetGroupId?: string;
  commandConcurrency?: number;
  targetCount: number;
  actionCount: number;
  startedAt: string;
  durationMs: number;
  result: WorkflowRunResult;
  savedAt?: string;
  filePath?: string;
  persisted?: boolean;
  commandStatuses?: WorkflowTerminalCommandStatus[];
  failedTargetIds?: string[];
  terminalResultSummary?: WorkflowTerminalResultSummary[];
}

export interface WorkflowTerminalCommandStatus {
  id: string;
  source: 'monitor' | 'workflow' | 'control';
  terminalId: string;
  terminalLabel: string;
  command: string;
  state: 'sent' | 'responded' | 'failed';
  sentAt: string;
  updatedAt: string;
  responsePreview?: string;
  error?: string;
  retryable: boolean;
}

export interface WorkflowTerminalResultSummary {
  terminalId: string;
  terminalLabel: string;
  sent: number;
  responded: number;
  failed: number;
  lastState: WorkflowTerminalCommandStatus['state'];
  lastCommand: string;
  lastResponsePreview?: string;
  lastError?: string;
  updatedAt: string;
}

export interface WorkflowTerminalResponseComparison {
  terminalId: string;
  terminalLabel: string;
  status: 'same' | 'different' | 'missing';
  responsePreview: string;
}

export interface WorkflowTerminalResponseGroup {
  groupKey: string;
  status: WorkflowTerminalResponseComparison['status'];
  responsePreview: string;
  terminalIds: string[];
  terminalLabels: string[];
  count: number;
}

export interface WorkflowRunControlState {
  cancelled: boolean;
  paused: boolean;
  resumeWaiters: Array<() => void>;
}

export interface WorkflowRunProgress {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentActionId: string;
  currentActionType: string;
  currentScope: string;
  startedAt: string;
  updatedAt: string;
  completed: number;
  failed: number;
  total: number;
  percent: number;
  lastEventKind: string;
  lastError: string;
}

export interface WorkflowCommandTemplate {
  id: string;
  label: string;
  command: string;
  category: string;
  source: 'builtin' | 'user';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  defaultValues?: Record<string, string>;
}

export interface WorkflowCommandBatchPreset {
  id: string;
  label: string;
  commands: string;
  source: 'builtin' | 'user';
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface WorkflowTargetSet {
  id: string;
  label: string;
  sessionIds: string[];
  sessionLabels: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

export interface WorkflowDesignerFlowMapNode {
  id: string;
  type: WorkflowDesignerActionType;
  label: string;
  enabled: boolean;
  index: number;
  depth: number;
  summary: string;
  parentId?: string;
  branchKey?: WorkflowDesignerBranchKey;
  previousId?: string;
  nextId?: string;
  successLabel?: string;
  failureLabel?: string;
  branchSummaries?: Partial<Record<WorkflowDesignerBranchKey, string>>;
}

export type WorkflowProfileVariableSource =
  | { kind: 'terminal'; profile: RemoteTerminalProfile }
  | { kind: 'remoteFile'; profile: RemoteFileProfile };

export interface WorkflowProfileVariableOption {
  key: string;
  label: string;
  detail: string;
  source: WorkflowProfileVariableSource;
}

export type {
  RemoteFileProfile,
  RemoteTerminalProfile,
  WorkflowDesignerAction,
  WorkflowDesignerActionType,
  WorkflowDesignerBranchKey,
  WorkflowDesignerModel,
  WorkflowDesignerVariable,
  WorkflowRunHistoryRecord,
  WorkflowRunResult,
  WorkflowTraceStep,
};
