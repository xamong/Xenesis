import type { ContextSourceAdapter } from './ContextOrchestrator.js';
import {
  type ContextAuthority,
  type ContextCacheScope,
  type ContextRecordKind,
  createContextRecord,
} from './ContextRecord.js';

export function staticRecordAdapter(input: {
  id: string;
  kind: ContextRecordKind;
  authority: ContextAuthority;
  cacheScope: ContextCacheScope;
  priority: number;
  messages: Array<{ content: string }>;
}): ContextSourceAdapter {
  return {
    id: input.id,
    load() {
      const content = input.messages
        .map((message) => message.content.trim())
        .filter((contentPart) => contentPart.length > 0)
        .join('\n\n');
      if (content.length === 0) return [];

      return [
        createContextRecord({
          id: `${input.id}:0`,
          kind: input.kind,
          authority: input.authority,
          content,
          cacheScope: input.cacheScope,
          priority: input.priority,
          conflictKey: input.id,
        }),
      ];
    },
  };
}
