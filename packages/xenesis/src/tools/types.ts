import type { z } from "zod";
import type { AgentMessage, AgentMessageAttachment } from "../core/messages.js";
import type { ExecutionBackend } from "../core/isolation/executionBackend.js";

export interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

export interface ToolAskEvent {
  type: "ask";
  question: string;
  questions?: Array<{
    question: string;
    header: string;
    options: Array<{
      label: string;
      description: string;
      preview?: string;
    }>;
    multiSelect?: boolean;
  }>;
  metadata?: {
    source?: string;
  };
}

export interface ToolExternalContentWarningEvent {
  type: "external_content_warning";
  source: "tool_result";
  toolCallId: string;
  toolName: string;
  warnings: string[];
}

export type ToolEvent = ToolAskEvent | ToolExternalContentWarningEvent;

export interface ToolLogger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export interface ToolContext {
  workspaceRoot: string;
  xenesisHome?: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  executionBackend?: ExecutionBackend;
  skillPaths?: string[];
  sessionId: string;
  abortSignal?: AbortSignal;
  toolExecutionPolicy?: unknown;
  todos: TodoItem[];
  emit(event: ToolEvent): void;
  setCwd?(cwd: string): void;
  setWorkspaceRoot?(workspaceRoot: string): void;
  recordUsage?(usage: { inputTokens: number; outputTokens: number }): void;
  logger: ToolLogger;
}

export interface ToolContextUpdates {
  allowedTools?: string[];
  model?: string;
  effort?: string;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  content: string;
  data?: T;
  newMessages?: AgentMessage[];
  contextUpdates?: ToolContextUpdates;
  attachments?: AgentMessageAttachment[];
}

export interface Tool<I = unknown, O = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<I, z.ZodTypeDef, unknown>;
  outputSchema?: z.ZodType<O, z.ZodTypeDef, unknown>;
  openaiInputSchema?: z.ZodType;
  maxResultSizeChars?: number;
  aliases?: string[];
  alwaysLoad?: boolean;
  isMcp?: boolean;
  searchHint?: string;
  shouldDefer?: boolean;
  isReadOnly(input: I): boolean;
  isConcurrencySafe?(input: I): boolean;
  requiresUserInteraction?(): boolean;
  toAutoClassifierInput?(input: I): string;
  validateInput?(input: I, context?: ToolContext): Promise<{ result: true } | { result: false; message: string; errorCode?: number }>;
  checkPermissions?(input: I, context?: ToolContext): Promise<{
    behavior: "ask" | "allow" | "deny";
    message?: string;
    updatedInput: I;
    suggestions?: Array<{
      type: "addRules";
      rules: Array<{
        toolName: string;
        ruleContent: string;
      }>;
      behavior: "allow" | "deny";
      destination: "localSettings";
    }>;
    metadata?: Record<string, unknown>;
  }>;
  mapToolResultToToolResultBlockParam?(
    result: O,
    toolUseId: string
  ): { type: "tool_result"; content: string; tool_use_id: string };
  run(input: I, context: ToolContext): Promise<ToolResult<O>>;
  cleanupSession?(sessionId: string): Promise<void>;
}

export type ToolRegistry = Map<string, Tool>;
