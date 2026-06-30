import type { SessionWriter } from '../sessions/types.js';
import type { AgentRunResult, AgentRunUsage } from './AgentRunner.js';
import type { AgentRunEvent, ApprovalRequest } from './events.js';
import type { AgentMessage, AgentMessageAttachment } from './messages.js';

export interface AgentRunExecutorRunner {
  run(input: string | Extract<AgentMessage, { role: 'user' }>): AsyncGenerator<AgentRunEvent, AgentRunResult, void>;
}

export interface ExecuteAgentRunOptions {
  runner: AgentRunExecutorRunner;
  prompt: string;
  attachments?: AgentMessageAttachment[];
  sessionWriter: SessionWriter;
  onEvent?: (event: AgentRunEvent) => void | Promise<void>;
  onMessages?: (messages: AgentMessage[]) => void | Promise<void>;
}

export interface AgentRunExecutionResult {
  events: AgentRunEvent[];
  doneContent?: string;
  turns: number;
  usage?: AgentRunUsage;
  /**
   * S6 — durable HITL. The terminal run status. `"paused"` when the run halted at
   * the approval gate with no resolver; the pipeline surfaces this + the
   * `pendingApproval` so background tasks record a resumable paused state instead
   * of treating the absence of a `done` as a failure.
   */
  status?: AgentRunResult['status'];
  pendingApproval?: ApprovalRequest;
}

function isAskEvent(event: AgentRunEvent): event is Extract<AgentRunEvent, { type: 'tool_event' }> {
  return event.type === 'tool_event' && event.event.type === 'ask';
}

export async function executeAgentRun(options: ExecuteAgentRunOptions): Promise<AgentRunExecutionResult> {
  let turns = 0;
  let pendingAskStop = false;
  let doneContent: string | undefined;
  let usage: AgentRunUsage | undefined;
  let status: AgentRunResult['status'] | undefined;
  let pendingApproval: ApprovalRequest | undefined;
  const events: AgentRunEvent[] = [];
  const runInput = options.attachments?.length
    ? { role: 'user' as const, content: options.prompt, attachments: options.attachments }
    : options.prompt;
  const iterator = options.runner.run(runInput);

  while (true) {
    const step = await iterator.next();
    if (step.done) {
      usage = step.value.usage;
      status = step.value.status;
      if (step.value.status === 'paused') pendingApproval = step.value.pendingApproval;
      await options.onMessages?.(step.value.messages.filter((message) => message.role !== 'system'));
      break;
    }

    const event = step.value;
    events.push(event);
    if (event.type === 'assistant_message') turns += 1;
    if (event.type === 'done') doneContent = event.content;
    await options.onEvent?.(event);

    if (isAskEvent(event)) {
      pendingAskStop = true;
    }

    if (pendingAskStop && event.type === 'tool_result') {
      await options.sessionWriter.write({
        type: 'run_state',
        status: 'stopped',
        phase: 'terminal',
        turns,
        summary: 'run stopped: user_input_required',
        reason: 'user_input_required',
      });
      const stoppedEvent: AgentRunEvent = {
        type: 'stopped',
        reason: 'user_input_required',
        turns,
      };
      await options.sessionWriter.write(stoppedEvent);
      events.push(stoppedEvent);
      await options.onEvent?.(stoppedEvent);
      await iterator.return?.({
        status: 'stopped',
        reason: 'max_turns',
        content: '',
        messages: [],
        turns,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      });
      break;
    }
  }

  return {
    events,
    ...(doneContent !== undefined ? { doneContent } : {}),
    turns,
    ...(usage ? { usage } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(pendingApproval !== undefined ? { pendingApproval } : {}),
  };
}
