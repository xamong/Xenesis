import type { ToolRegistry } from '../../tools/types.js';
import type { ToolExecutionPolicy } from '../AgentRunner.js';
import type { ToolCall } from '../messages.js';
import type { ToolConcurrencyClassifier, ToolConcurrencyMetadata } from './ToolScheduler.js';

export interface ToolRegistryConcurrencyClassifierOptions {
  registry: ToolRegistry;
  toolExecutionPolicy?: ToolExecutionPolicy;
}

function blockedByPolicy(toolName: string, policy?: ToolExecutionPolicy): boolean {
  const requiredBefore = policy?.requiredBefore?.[toolName] ?? [];
  const requiredBeforeAny = policy?.requiredBeforeAny?.[toolName] ?? [];
  return requiredBefore.length > 0 || requiredBeforeAny.length > 0;
}

function result(isConcurrent: boolean, reason: string): ToolConcurrencyMetadata {
  return { isConcurrent, reason };
}

export function createToolRegistryConcurrencyClassifier(
  options: ToolRegistryConcurrencyClassifierOptions,
): ToolConcurrencyClassifier {
  return (toolCall: ToolCall) => {
    const tool = options.registry.get(toolCall.name);
    if (!tool) return result(false, 'tool is unavailable');

    if (blockedByPolicy(tool.name, options.toolExecutionPolicy)) {
      return result(false, 'tool has required predecessor policy');
    }

    let parsed;
    try {
      parsed = tool.inputSchema.safeParse(toolCall.input);
    } catch {
      return result(false, 'tool input validation failed');
    }
    if (!parsed.success) return result(false, 'tool input is invalid');

    try {
      if (!tool.isReadOnly(parsed.data)) return result(false, 'tool is not read-only');
      if (tool.isConcurrencySafe?.(parsed.data) !== true) {
        return result(false, 'tool is not concurrency safe');
      }
      return result(true, 'tool is read-only and concurrency safe');
    } catch {
      return result(false, 'tool concurrency metadata failed');
    }
  };
}
