export interface SystemPromptMetadata {
  section13?: {
    type: 'prompt_section_trace';
    source: 'reference.section_13';
    boundarySentinel: string;
    boundaryIndex: number;
    staticReferenceNames: readonly string[];
    dynamicReferenceNames: readonly string[];
    volatileReferenceNames: readonly string[];
  };
  cacheControl?: {
    anthropic?: {
      disabled: boolean;
      reason?: string;
    };
  };
}

export type AgentMessageAttachmentKind = 'image' | 'file';

export interface AgentMessageAttachment {
  kind: AgentMessageAttachmentKind;
  name: string;
  mimeType?: string;
  size?: number;
  path?: string;
  dataUrl?: string;
  text?: string;
}

export type AgentMessage =
  | { role: 'system'; content: string; id?: string; promptMetadata?: SystemPromptMetadata }
  | { role: 'user'; content: string; id?: string; attachments?: AgentMessageAttachment[] }
  | { role: 'assistant'; content: string; id?: string; toolCalls?: ToolCall[]; providerMetadata?: ProviderMetadata }
  | {
      role: 'tool';
      toolCallId: string;
      name: string;
      content: string;
      id?: string;
      attachments?: AgentMessageAttachment[];
    };

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export const SYNTHETIC_TOOL_RESULT_PLACEHOLDER = '[Tool result missing due to internal error]';

export interface ToolResultPairingRepairOptions {
  strict?: boolean;
  /**
   * S6 — durable HITL resume. Tool call ids that must be left UN-paired (no
   * synthetic placeholder result is appended for them). A durably paused
   * approval intentionally leaves its `tool_call` dangling so resume can pair it
   * by applying the human decision (execute/deny) rather than a placeholder.
   */
  excludeToolCallIds?: Set<string>;
}

export interface ProviderMetadata {
  openai?: {
    output?: unknown[];
  };
  anthropic?: {
    content?: unknown[];
  };
  cli?: {
    provider: string;
    command: string;
    args?: string[];
    exitCode?: number;
    timedOut?: boolean;
    aborted?: boolean;
    durationMs?: number;
    error?: string;
    xenesisDeskMcpConfigured?: boolean;
    stderr?: string;
    transport?: string;
    runtimeTransport?: string;
    processModel?: 'persistent-process' | 'process-per-turn';
    streaming?: boolean;
    threadId?: string;
    turnId?: string;
    sessionId?: string;
    persistentSession?: boolean;
    sessionReuse?: boolean;
    sessionReuseMode?: 'provider-resume-args';
    preflight?: {
      provider: string;
      command: string;
      resolvedCommand: string;
      resolvedArgs?: string[];
      installed: boolean;
      version?: string;
      authStatus: 'env-configured' | 'unknown' | 'unavailable';
      authSource?: string;
      checkedAt: string;
      cacheKey?: string;
      cacheTtlMs?: number;
      cacheHit?: boolean;
      error?: string;
    };
    raw?: unknown;
  };
}

type AssistantMessage = Extract<AgentMessage, { role: 'assistant' }>;
type ToolMessage = Extract<AgentMessage, { role: 'tool' }>;
type PairedToolCall = {
  originalId: string;
  toolCall: ToolCall;
};

function syntheticToolResult(toolCall: ToolCall): ToolMessage {
  return {
    role: 'tool',
    toolCallId: toolCall.id,
    name: toolCall.name,
    content: SYNTHETIC_TOOL_RESULT_PLACEHOLDER,
  };
}

function toolCallOriginalIds(toolCalls: readonly PairedToolCall[]) {
  return new Map(toolCalls.map((toolCall, index) => [index, toolCall.originalId]));
}

function repairSummary(messages: readonly AgentMessage[]) {
  return messages
    .map((message, index) => {
      if (message.role === 'assistant') {
        return `[${index}] assistant(tool_calls=[${(message.toolCalls ?? []).map((toolCall) => toolCall.id).join(',')}])`;
      }
      if (message.role === 'tool') {
        return `[${index}] tool(toolCallId=${message.toolCallId})`;
      }
      return `[${index}] ${message.role}`;
    })
    .join('; ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nextUniqueToolCallId(id: string, seenToolCallIds: ReadonlySet<string>) {
  let suffix = 2;
  let candidate = `${id}__repair_${suffix}`;
  while (seenToolCallIds.has(candidate)) {
    suffix += 1;
    candidate = `${id}__repair_${suffix}`;
  }
  return candidate;
}

function idRewriteQueues(toolCalls: readonly PairedToolCall[]) {
  const queues = new Map<string, string[]>();
  for (const { originalId, toolCall } of toolCalls) {
    const queue = queues.get(originalId) ?? [];
    queue.push(toolCall.id);
    queues.set(originalId, queue);
  }
  return queues;
}

function shiftRewrittenId(queues: Map<string, string[]>, originalId: string) {
  const queue = queues.get(originalId);
  return queue?.shift() ?? originalId;
}

function rewriteOpenAIOutputIds(output: unknown[], toolCalls: readonly PairedToolCall[]) {
  const queues = idRewriteQueues(toolCalls);
  let changed = false;
  const rewritten = output.map((item) => {
    if (!isRecord(item) || item.type !== 'function_call') return item;
    const originalId = String(item.call_id ?? item.id ?? '');
    if (!originalId) return item;
    const nextId = shiftRewrittenId(queues, originalId);
    if (nextId === originalId) return item;
    changed = true;
    return {
      ...item,
      call_id: nextId,
      ...(item.id === originalId ? { id: nextId } : {}),
    };
  });
  return changed ? rewritten : output;
}

function rewriteAnthropicContentIds(content: unknown[], toolCalls: readonly PairedToolCall[]) {
  const queues = idRewriteQueues(toolCalls);
  let changed = false;
  const rewritten = content.map((block) => {
    if (!isRecord(block) || block.type !== 'tool_use' || typeof block.id !== 'string') return block;
    const nextId = shiftRewrittenId(queues, block.id);
    if (nextId === block.id) return block;
    changed = true;
    return { ...block, id: nextId };
  });
  return changed ? rewritten : content;
}

function rewriteProviderMetadata(
  metadata: ProviderMetadata | undefined,
  toolCalls: readonly PairedToolCall[],
): ProviderMetadata | undefined {
  if (!metadata) return undefined;
  let changed = false;
  const next: ProviderMetadata = { ...metadata };

  if (metadata.openai?.output) {
    const output = rewriteOpenAIOutputIds(metadata.openai.output, toolCalls);
    if (output !== metadata.openai.output) {
      changed = true;
      next.openai = { ...metadata.openai, output };
    }
  }

  if (metadata.anthropic?.content) {
    const content = rewriteAnthropicContentIds(metadata.anthropic.content, toolCalls);
    if (content !== metadata.anthropic.content) {
      changed = true;
      next.anthropic = { ...metadata.anthropic, content };
    }
  }

  return changed ? next : metadata;
}

function assistantWithToolCalls(message: AssistantMessage, pairedToolCalls: PairedToolCall[]): AssistantMessage {
  const toolCalls = pairedToolCalls.map((entry) => entry.toolCall);
  const providerMetadata = rewriteProviderMetadata(message.providerMetadata, pairedToolCalls);
  const next: AssistantMessage = {
    ...message,
    content: message.content || (toolCalls.length === 0 ? '[Tool use interrupted]' : message.content),
  };
  if (providerMetadata !== undefined) next.providerMetadata = providerMetadata;
  if (toolCalls.length > 0) {
    next.toolCalls = toolCalls;
  } else {
    delete next.toolCalls;
  }
  return next;
}

/**
 * Repair provider-bound tool call/result pairing without mutating the stored transcript.
 *
 * Provider APIs reject histories where assistant tool calls have no following
 * result, tool results reference missing calls, or a resumed transcript repeats
 * the same tool call id. This mirrors the reference runtime's defensive repair
 * behavior for Xenesis' simpler AgentMessage shape.
 */
export function repairToolResultPairing(
  messages: readonly AgentMessage[],
  options: ToolResultPairingRepairOptions = {},
): AgentMessage[] {
  const repairedMessages: AgentMessage[] = [];
  const seenToolCallIds = new Set<string>();
  let repaired = false;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index]!;

    if (message.role !== 'assistant') {
      if (message.role === 'tool') {
        repaired = true;
        continue;
      }
      repairedMessages.push(message);
      continue;
    }

    const originalToolCalls = message.toolCalls ?? [];
    const keptToolCalls: PairedToolCall[] = [];
    for (const toolCall of originalToolCalls) {
      if (seenToolCallIds.has(toolCall.id)) {
        const repairedId = nextUniqueToolCallId(toolCall.id, seenToolCallIds);
        repaired = true;
        seenToolCallIds.add(repairedId);
        keptToolCalls.push({
          originalId: toolCall.id,
          toolCall: { ...toolCall, id: repairedId },
        });
        continue;
      }
      seenToolCallIds.add(toolCall.id);
      keptToolCalls.push({ originalId: toolCall.id, toolCall });
    }

    repairedMessages.push(assistantWithToolCalls(message, keptToolCalls));

    const followingToolResults: ToolMessage[] = [];
    let cursor = index + 1;
    while (cursor < messages.length && messages[cursor]!.role === 'tool') {
      followingToolResults.push(messages[cursor]! as ToolMessage);
      cursor += 1;
    }

    if (keptToolCalls.length === 0 && followingToolResults.length === 0) {
      continue;
    }

    const expectedOriginalIds = toolCallOriginalIds(keptToolCalls);
    const assignedResultByIndex = new Map<number, ToolMessage>();
    for (const toolResult of followingToolResults) {
      const targetIndex = Array.from(expectedOriginalIds.entries()).find(
        ([candidateIndex, originalId]) =>
          originalId === toolResult.toolCallId && !assignedResultByIndex.has(candidateIndex),
      )?.[0];
      if (targetIndex === undefined) {
        repaired = true;
        continue;
      }
      if (assignedResultByIndex.has(targetIndex)) {
        repaired = true;
        continue;
      }
      assignedResultByIndex.set(targetIndex, toolResult);
    }

    for (const [toolCallIndex, { originalId, toolCall }] of keptToolCalls.entries()) {
      const toolResult = assignedResultByIndex.get(toolCallIndex);
      if (toolResult) {
        repairedMessages.push({
          ...toolResult,
          toolCallId: toolCall.id,
          name: toolCall.name,
        });
      } else if (options.excludeToolCallIds?.has(originalId) || options.excludeToolCallIds?.has(toolCall.id)) {
      } else {
        repaired = true;
        repairedMessages.push(syntheticToolResult(toolCall));
      }
    }

    index = cursor - 1;
  }

  if (repaired && options.strict) {
    throw new Error(
      `repairToolResultPairing: tool_use/tool_result pairing mismatch detected. ` +
        `Message structure: ${repairSummary(messages)}`,
    );
  }

  return repaired ? repairedMessages : [...messages];
}
