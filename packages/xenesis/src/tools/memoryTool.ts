import { z } from 'zod';
import type { MemoryRecord, MemoryStore } from '../extensions/index.js';
import type { Tool } from './types.js';

const memoryInput = z.object({
  action: z.enum(['save', 'search', 'list', 'delete']),
  id: z.string().min(1).nullable().optional(),
  text: z.string().min(1).max(2000).nullable().optional(),
  tags: z.array(z.string().min(1)).max(8).nullable().optional(),
  priority: z.number().int().min(0).max(10).nullable().optional(),
  query: z.string().min(1).nullable().optional(),
});

const memoryOpenAIInput = z.object({
  action: z.enum(['save', 'search', 'list', 'delete']),
  id: z.string().nullable(),
  text: z.string().max(2000).nullable(),
  tags: z.array(z.string()).max(8).nullable(),
  priority: z.number().int().min(0).max(10).nullable(),
  query: z.string().nullable(),
});

export type MemoryToolInput = z.infer<typeof memoryInput>;

function createMemoryId() {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireText(input: MemoryToolInput) {
  if (!input.text) throw new Error('Action "save" requires text.');
  return input.text;
}

function requireQuery(input: MemoryToolInput) {
  if (!input.query) throw new Error('Action "search" requires query.');
  return input.query;
}

function requireId(input: MemoryToolInput) {
  if (!input.id) throw new Error(`Action "${input.action}" requires id.`);
  return input.id;
}

function renderRecordLine(record: MemoryRecord) {
  const tags = record.tags.length > 0 ? ` tags=${record.tags.join(',')}` : '';
  const priority = record.priority !== undefined ? ` priority=${record.priority}` : '';
  return `${record.id}${tags}${priority} - ${record.text}`;
}

export function createMemoryTool(store: MemoryStore): Tool<MemoryToolInput, MemoryRecord | MemoryRecord[]> {
  return {
    name: 'memory',
    description: 'Save, search, list, and delete persistent memories for future Xenesis runs.',
    inputSchema: memoryInput,
    openaiInputSchema: memoryOpenAIInput,
    isReadOnly: (input) => input.action === 'search' || input.action === 'list',
    async run(input) {
      try {
        if (input.action === 'save') {
          const record = await store.upsert({
            id: input.id ?? createMemoryId(),
            text: requireText(input),
            tags: input.tags ?? [],
            source: 'agent',
            ...(input.priority !== undefined && input.priority !== null ? { priority: input.priority } : {}),
          });
          return { ok: true, content: `memory: saved ${record.id}`, data: record };
        }

        if (input.action === 'search') {
          const records = (await store.search(requireQuery(input))).slice(0, 10);
          return {
            ok: true,
            content: records.length > 0 ? records.map(renderRecordLine).join('\n') : 'memory: no matches',
            data: records,
          };
        }

        if (input.action === 'list') {
          const records = await store.list();
          return {
            ok: true,
            content: records.length > 0 ? records.map(renderRecordLine).join('\n') : 'memory: empty',
            data: records,
          };
        }

        const id = requireId(input);
        await store.remove(id);
        return { ok: true, content: `memory: deleted ${id}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, content: `memory ${input.action} failed: ${message}` };
      }
    },
  };
}
