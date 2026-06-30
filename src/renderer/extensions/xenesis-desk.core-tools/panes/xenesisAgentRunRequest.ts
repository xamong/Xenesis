import type { XenesisRunAttachment, XenesisRunRequest } from '../../../../shared/types';
import { buildXenesisAgentHistoryMessages } from './xenesisAgentChatHistory';
import type { XenesisChatMessage, XenesisMode } from './xenesisAgentTypes';

export interface BuildXenesisAgentRunRequestInput {
  prompt: string;
  mode: XenesisMode;
  workspace?: string;
  source: string;
  activeSessionId?: string;
  contextMessages: XenesisChatMessage[];
  context?: Record<string, unknown>;
  attachments?: XenesisRunAttachment[];
}

export function buildXenesisAgentRunRequest(input: BuildXenesisAgentRunRequestInput): XenesisRunRequest {
  const runHistoryMessages = buildXenesisAgentHistoryMessages(input.contextMessages);
  // Standing Desk-control framing lives in the system prompt (built once), not on
  // the user turn — re-stamping it here makes the agent treat every input (even a
  // greeting) as a Desk action. The user turn carries only the user text.
  const prompt = input.prompt;

  return {
    prompt,
    mode: input.mode,
    stream: true,
    workspace: input.workspace || undefined,
    source: input.source,
    context: input.context,
    ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    ...(input.activeSessionId?.trim() ? { sessionId: input.activeSessionId.trim() } : {}),
    ...(runHistoryMessages.length ? { historyMessages: runHistoryMessages } : {}),
  };
}

export function buildXenesisAgentRunContextDetail(_input: {
  prompt: string;
  contextMessages: XenesisChatMessage[];
}): string {
  return '';
}
