import type { ToolCall } from '../messages.js';

export interface ScheduledToolCall {
  sequence: number;
  toolCall: ToolCall;
}

export interface ToolConcurrencyMetadata {
  isConcurrent: boolean;
  reason?: string;
}

export type ToolConcurrencyClassifier = (toolCall: ToolCall) => ToolConcurrencyMetadata;

export interface ScheduleToolCallBlocksOptions {
  classify?: ToolConcurrencyClassifier;
}

export interface ScheduledToolCallBlock {
  blockId: number;
  concurrent: boolean;
  toolCalls: ScheduledToolCall[];
}

export function scheduleToolCalls(toolCalls: readonly ToolCall[]): ScheduledToolCall[] {
  const seen = new Set<string>();
  return toolCalls.map((toolCall, index) => {
    if (seen.has(toolCall.id)) {
      throw new Error(`duplicate tool call id: ${toolCall.id}`);
    }
    seen.add(toolCall.id);
    return {
      sequence: index + 1,
      toolCall: structuredClone(toolCall),
    };
  });
}

export function scheduleToolCallBlocks(
  toolCalls: readonly ToolCall[],
  options: ScheduleToolCallBlocksOptions = {},
): ScheduledToolCallBlock[] {
  const scheduledToolCalls = scheduleToolCalls(toolCalls);
  const blocks: ScheduledToolCallBlock[] = [];

  for (const scheduled of scheduledToolCalls) {
    const concurrent = options.classify?.(scheduled.toolCall).isConcurrent ?? false;
    const previous = blocks[blocks.length - 1];
    if (concurrent && previous?.concurrent) {
      previous.toolCalls.push(scheduled);
      continue;
    }

    blocks.push({
      blockId: blocks.length + 1,
      concurrent,
      toolCalls: [scheduled],
    });
  }

  return blocks;
}
