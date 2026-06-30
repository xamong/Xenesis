import { buildSchemaGuidance, coerceToolArguments } from '../../providers/toolArgCoercion.js';
import type { TodoItem, ToolContext, ToolEvent, ToolLogger, ToolRegistry, ToolResult } from '../../tools/types.js';
import { type ExecutionBackend, LOCAL_BACKEND } from '../isolation/executionBackend.js';
import type { AgentKernelToolExecutor, AgentKernelToolExecutorOptions } from './AgentKernel.js';

export type ToolRegistryKernelExecutorErrorCode = 'tool_unavailable' | 'invalid_tool_input';

export class ToolRegistryKernelExecutorError extends Error {
  constructor(
    public readonly code: ToolRegistryKernelExecutorErrorCode,
    public readonly toolCallId: string,
    public readonly toolName: string,
    message: string,
  ) {
    super(message);
    this.name = 'ToolRegistryKernelExecutorError';
  }
}

export interface ToolRegistryKernelExecutorOptions {
  registry: ToolRegistry;
  workspaceRoot: string;
  cwd: string;
  xenesisHome?: string;
  env?: NodeJS.ProcessEnv;
  todos?: TodoItem[];
  toolExecutionPolicy?: unknown;
  logger: ToolLogger;
  onToolEvent?: (event: ToolEvent) => void;
  onUsage?: (usage: { inputTokens: number; outputTokens: number }) => void;
  /**
   * I3 — execution backend seam. When absent, defaults to LOCAL_BACKEND
   * (delegates to runCommand/runCommandArgs byte-for-byte). Inject for Docker / remote exec.
   */
  executionBackend?: ExecutionBackend;
}

export function createToolRegistryKernelExecutor(options: ToolRegistryKernelExecutorOptions): AgentKernelToolExecutor {
  const sessionState = new Map<string, { workspaceRoot: string; cwd: string }>();
  function stateForRun(runId: string) {
    const existing = sessionState.get(runId);
    if (existing) return existing;
    const created = {
      workspaceRoot: options.workspaceRoot,
      cwd: options.cwd,
    };
    sessionState.set(runId, created);
    return created;
  }

  return {
    async execute(executeOptions: AgentKernelToolExecutorOptions): Promise<ToolResult> {
      const tool = options.registry.get(executeOptions.toolCall.name);
      if (!tool) {
        throw new ToolRegistryKernelExecutorError(
          'tool_unavailable',
          executeOptions.toolCall.id,
          executeOptions.toolCall.name,
          `Tool "${executeOptions.toolCall.name}" is not available.`,
        );
      }

      const coerced = coerceToolArguments(executeOptions.toolCall.input, tool.inputSchema);
      const parsed = tool.inputSchema.safeParse(coerced);
      if (!parsed.success) {
        const guidance = buildSchemaGuidance(parsed.error, tool.inputSchema, coerced);
        let structured: string;
        try {
          structured = JSON.stringify({
            issues: guidance.issues,
            schema: guidance.schemaFragment,
            received: guidance.received,
          });
        } catch {
          structured = parsed.error.message;
        }
        // Headless kernel has no tool_result feedback channel, so embed the structured
        // schema guidance directly in the thrown error message.
        throw new ToolRegistryKernelExecutorError(
          'invalid_tool_input',
          executeOptions.toolCall.id,
          executeOptions.toolCall.name,
          `Invalid input for tool "${executeOptions.toolCall.name}": ${parsed.error.message} ${structured}`,
        );
      }

      const state = stateForRun(executeOptions.runId);
      const context: ToolContext = {
        workspaceRoot: state.workspaceRoot,
        cwd: state.cwd,
        ...(options.xenesisHome ? { xenesisHome: options.xenesisHome } : {}),
        ...(options.env ? { env: options.env } : {}),
        executionBackend: options.executionBackend ?? LOCAL_BACKEND,
        sessionId: executeOptions.runId,
        ...(options.toolExecutionPolicy ? { toolExecutionPolicy: options.toolExecutionPolicy } : {}),
        todos: options.todos ?? [],
        emit: (event) => options.onToolEvent?.(event),
        setCwd: (nextCwd) => {
          state.cwd = nextCwd;
        },
        setWorkspaceRoot: (nextWorkspaceRoot) => {
          state.workspaceRoot = nextWorkspaceRoot;
        },
        recordUsage: (usage) => options.onUsage?.(usage),
        logger: options.logger,
      };

      return await tool.run(parsed.data, context);
    },
  };
}
