import type { AgentRunPipelineOptions, AgentRunPipelineResult } from '../core/AgentRunPipeline.js';
import type { WorkflowStepEvent } from '../core/events.js';
import type { AgentMessage, AgentMessageAttachment } from '../core/messages.js';
import type { IdeContextInput } from '../ide/index.js';

export interface WorkflowRequestBody {
  prompt: string;
  configPath?: string;
  ideContext?: IdeContextInput;
  workflow?: string;
}

export type WorkflowPipelineOverrides = Partial<
  Pick<
    AgentRunPipelineOptions,
    'mode' | 'savePlan' | 'fromPlan' | 'systemMessages' | 'historyMessages' | 'guard' | 'toolExecutionPolicy'
  >
>;

export type WorkflowStepInput = 'original' | 'previous';

export interface WorkflowStep {
  name: string;
  description?: string;
  input?: WorkflowStepInput;
  prompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  pipeline?: WorkflowPipelineOverrides;
  metadata?: Record<string, unknown>;
}

export interface WorkflowPrepareResult {
  prompt?: string;
  configPath?: string;
  ideContext?: IdeContextInput;
  pipeline?: WorkflowPipelineOverrides;
  steps?: WorkflowStep[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowContext {
  body: WorkflowRequestBody;
  stream: boolean;
  env?: NodeJS.ProcessEnv;
}

export interface WorkflowHandler {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
  matches?: (context: WorkflowContext) => boolean | Promise<boolean>;
  prepare?: (context: WorkflowContext) => WorkflowPrepareResult | Promise<WorkflowPrepareResult>;
}

export interface WorkflowSelection {
  name: string;
  description?: string;
  prompt: string;
  configPath?: string;
  ideContext?: IdeContextInput;
  pipeline: WorkflowPipelineOverrides;
  steps?: WorkflowStep[];
  metadata?: Record<string, unknown>;
}

export interface WorkflowSummary {
  name: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export type WorkflowStepRun = Omit<WorkflowStepEvent, 'type'> & {
  sessionId?: string;
};

export type WorkflowRunPipeline = (options: AgentRunPipelineOptions) => Promise<AgentRunPipelineResult>;

export interface WorkflowRunResult {
  exitCode: number;
  sessionId?: string;
  traceId?: string;
  events: AgentRunPipelineResult['events'];
  doneContent?: string;
  turns: number;
  workflowSteps: WorkflowStepRun[];
  output: string;
}

export interface RunResolvedWorkflowOptions {
  workflow: WorkflowSelection;
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: AgentRunPipelineOptions['cli'];
  traceId?: string;
  sessionId?: string;
  historyMessages?: AgentMessage[];
  attachments?: AgentMessageAttachment[];
  abortSignal?: AbortSignal;
  stream?: boolean;
  disposeRunner?: AgentRunPipelineOptions['disposeRunner'];
  approvalHandler?: AgentRunPipelineOptions['approvalHandler'];
  runPipeline: WorkflowRunPipeline;
  turnLedger?: AgentRunPipelineOptions['turnLedger'];
  onEvent?: (event: AgentRunPipelineResult['events'][number]) => void | Promise<void>;
  onNotice?: (line: string) => void | Promise<void>;
  onSession?: (sessionId: string) => void | Promise<void>;
  onMessages?: AgentRunPipelineOptions['onMessages'];
  includeStepOutput?: boolean;
}

export interface ResolveWorkflowOptions {
  body: WorkflowRequestBody;
  stream: boolean;
  env?: NodeJS.ProcessEnv;
}

export type WorkflowSystemMessage = Extract<AgentMessage, { role: 'system' }>;
