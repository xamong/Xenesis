import type { ApprovalMode, ProviderName } from '../../config/index.js';
import type { ApprovalHandler } from '../../core/AgentRunner.js';
import type { AgentRunEvent } from '../../core/events.js';
import type { AgentMessage } from '../../core/messages.js';
import type { JsonlSessionWriter } from '../../sessions/index.js';

export type TuiNoticeKind = 'info' | 'warning' | 'error';

export type TuiSessionWriterSetter = (writer: JsonlSessionWriter, sessionId: string) => void;

export interface TuiRuntimeParsedArgs {
  command?: string;
  prompt?: string;
  provider?: ProviderName;
  model?: string;
  approvalMode?: ApprovalMode;
  configPath?: string;
  sessionCommand?: string;
  sessionId?: string;
}

export interface TuiRuntimeIo {
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  traceId?: string;
  approvalHandler?: ApprovalHandler;
  abortSignal?: AbortSignal;
  ideContext?: any;
}

export interface RunTuiPromptOptions {
  sessionId?: string;
  traceId?: string;
  onEvent?: (event: AgentRunEvent) => void;
  onMessages?: (messages: AgentMessage[]) => void;
  onNotice?: (line: string) => void;
  approvalHandler?: ApprovalHandler;
  abortSignal?: AbortSignal;
  ideContext?: any;
  preserveManagedServers?: boolean;
}

export interface TuiTerminalImageRequest {
  path: 'xd.terminals.image.show' | 'xd.terminals.image.showXcon' | 'xd.terminals.ui.clearScreen';
  args: Record<string, string>;
  label: string;
}
