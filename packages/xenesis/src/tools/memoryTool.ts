import { z } from 'zod';
import type {
  MemoryEvidenceRecord,
  MemoryLedgerEvent,
  MemoryProposal,
  MemoryRecord,
  MemoryStore,
  MemoryWriteContext,
  MemoryWriteResult,
} from '../extensions/index.js';
import { MemoryLedger } from '../extensions/MemoryLedger.js';
import { defaultMemoryWriteContext } from '../extensions/memoryDefaults.js';
import {
  classifyMemoryEvidenceSensitivity,
  effectiveMemoryInputSensitivity,
  maxMemorySensitivity,
} from '../extensions/memoryPolicy.js';
import { createRunbookMemoryInput } from '../extensions/memoryRunbook.js';
import type { Tool } from './types.js';

const runbookInput = z.object({
  trigger: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1).max(24),
  preferredFormat: z.array(z.string().min(1)).max(12).nullable().optional(),
  evidenceRequired: z.array(z.string().min(1)).max(12).nullable().optional(),
  permissionLevel: z.enum(['read', 'draft', 'suggest', 'execute_requires_approval']).nullable().optional(),
  lastUsedAt: z.string().nullable().optional(),
  validFrom: z.string().nullable().optional(),
  validTo: z.string().nullable().optional(),
});

const memoryInput = z.object({
  action: z.enum(['save', 'propose', 'proposals', 'history', 'evidence', 'search', 'list', 'delete']),
  id: z.string().min(1).nullable().optional(),
  text: z.string().min(1).max(2000).nullable().optional(),
  runbook: runbookInput.nullable().optional(),
  tags: z.array(z.string().min(1)).max(8).nullable().optional(),
  priority: z.number().int().min(0).max(10).nullable().optional(),
  query: z.string().min(1).nullable().optional(),
});

const memoryOpenAIInput = z.object({
  action: z.enum(['save', 'propose', 'proposals', 'history', 'evidence', 'search', 'list', 'delete']),
  id: z.string().nullable(),
  text: z.string().max(2000).nullable(),
  runbook: runbookInput.nullable().optional(),
  tags: z.array(z.string()).max(8).nullable(),
  priority: z.number().int().min(0).max(10).nullable(),
  query: z.string().nullable(),
});

export type MemoryToolInput = z.infer<typeof memoryInput>;

function createMemoryId() {
  return `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function requireText(input: MemoryToolInput) {
  if (!input.text) throw new Error(`Action "${input.action}" requires text.`);
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

function toolRunbookInput(input: MemoryToolInput) {
  if (!input.runbook) return undefined;
  return {
    trigger: input.runbook.trigger,
    steps: input.runbook.steps,
    ...(input.runbook.preferredFormat ? { preferredFormat: input.runbook.preferredFormat } : {}),
    ...(input.runbook.evidenceRequired ? { evidenceRequired: input.runbook.evidenceRequired } : {}),
    ...(input.runbook.permissionLevel ? { permissionLevel: input.runbook.permissionLevel } : {}),
    ...(input.runbook.lastUsedAt ? { lastUsedAt: input.runbook.lastUsedAt } : {}),
    ...(input.runbook.validFrom ? { validFrom: input.runbook.validFrom } : {}),
    ...(input.runbook.validTo ? { validTo: input.runbook.validTo } : {}),
  };
}

function buildMemoryInputForWrite(input: MemoryToolInput) {
  const runbook = toolRunbookInput(input);
  if (runbook) {
    return createRunbookMemoryInput({
      id: input.id ?? createMemoryId(),
      runbook,
      ...(input.text ? { text: input.text } : {}),
      tags: input.tags ?? [],
      ...(input.priority !== undefined && input.priority !== null ? { priority: input.priority } : {}),
    });
  }
  return {
    id: input.id ?? createMemoryId(),
    text: requireText(input),
    tags: input.tags ?? [],
    ...(input.priority !== undefined && input.priority !== null ? { priority: input.priority } : {}),
  };
}

function renderRecordLine(record: MemoryRecord) {
  const tags = record.tags.length > 0 ? ` tags=${record.tags.join(',')}` : '';
  const priority = record.priority !== undefined ? ` priority=${record.priority}` : '';
  return `${record.id}${tags}${priority} - ${record.text}`;
}

export interface MemoryToolOptions {
  writeContext?: MemoryWriteContext | (() => MemoryWriteContext);
}

type MemoryToolData =
  | MemoryRecord
  | MemoryRecord[]
  | MemoryProposal
  | MemoryProposal[]
  | MemoryEvidenceRecord
  | MemoryEvidenceRecord[]
  | MemoryLedgerEvent
  | MemoryLedgerEvent[]
  | MemoryWriteResult;

function isSensitiveMemoryValue(value: unknown): boolean {
  return value === 'high' || value === 'restricted';
}

function redactRecordForModel(record: MemoryRecord): MemoryRecord {
  const sensitivity = effectiveMemoryInputSensitivity(record, record.sensitivity);
  if (!isSensitiveMemoryValue(sensitivity)) return { ...record, sensitivity };
  const { source: _source, runbook: _runbook, noEvidenceReason: _noEvidenceReason, ...safeRecord } = record;
  return {
    ...safeRecord,
    text: `[redacted: ${sensitivity} memory]`,
    tags: [],
    sensitivity,
    embedding: undefined,
  };
}

function redactProposalForModel(proposal: MemoryProposal): MemoryProposal {
  const sensitivity = maxMemorySensitivity(
    proposal.decision.sensitivity,
    proposal.input.sensitivity,
    effectiveMemoryInputSensitivity(proposal.input, proposal.input.sensitivity),
  );
  if (!isSensitiveMemoryValue(sensitivity)) return proposal;
  return {
    ...proposal,
    decision: { ...proposal.decision, sensitivity },
    input: {
      ...proposal.input,
      text: `[redacted: ${sensitivity} memory proposal]`,
      tags: [],
      source: undefined,
      runbook: undefined,
      sensitivity,
    },
  };
}

function redactEvidenceForModel(record: MemoryEvidenceRecord): MemoryEvidenceRecord {
  const sensitivity = classifyMemoryEvidenceSensitivity(record);
  if (!isSensitiveMemoryValue(sensitivity)) return { ...record, sensitivity };
  return {
    ...record,
    source: `[redacted: ${sensitivity} evidence source]`,
    summary: record.summary ? `[redacted: ${sensitivity} evidence summary]` : undefined,
    contentHash: undefined,
    uri: undefined,
    metadata: undefined,
    sensitivity,
  };
}

function redactLedgerEventForModel(event: MemoryLedgerEvent): MemoryLedgerEvent {
  return {
    ...event,
    reason: event.reason ? '[redacted: ledger event reason]' : undefined,
    metadata: undefined,
  };
}

function redactWriteResultForModel(result: MemoryWriteResult): MemoryWriteResult {
  return {
    ...result,
    record: result.record ? redactRecordForModel(result.record) : undefined,
    proposal: result.proposal ? redactProposalForModel(result.proposal) : undefined,
  };
}

function resolveWriteContext(options?: MemoryToolOptions): MemoryWriteContext {
  const value = typeof options?.writeContext === 'function' ? options.writeContext() : options?.writeContext;
  return defaultMemoryWriteContext(value);
}

function isMemoryLedger(target: MemoryStore | MemoryLedger): target is MemoryLedger {
  return target instanceof MemoryLedger;
}

export function createMemoryTool(
  target: MemoryStore | MemoryLedger,
  options: MemoryToolOptions = {},
): Tool<MemoryToolInput, MemoryToolData> {
  return {
    name: 'memory',
    description: 'Save, propose, search, list, inspect, and archive persistent memories for future Xenesis runs.',
    inputSchema: memoryInput,
    openaiInputSchema: memoryOpenAIInput,
    isReadOnly: (input) =>
      input.action === 'search' ||
      input.action === 'list' ||
      input.action === 'proposals' ||
      input.action === 'history' ||
      input.action === 'evidence',
    async run(input) {
      try {
        if (isMemoryLedger(target)) {
          if (input.action === 'save') {
            const result = await target.write(buildMemoryInputForWrite(input), resolveWriteContext(options));
            if (result.status === 'accepted' && result.record) {
              return {
                ok: true,
                content: `memory: saved ${result.record.id}`,
                data: redactWriteResultForModel(result),
              };
            }
            return {
              ok: true,
              content: `memory: proposed ${result.proposal?.id ?? '(unknown)'}`,
              data: redactWriteResultForModel(result),
            };
          }

          if (input.action === 'propose') {
            const proposal = await target.propose(buildMemoryInputForWrite(input), resolveWriteContext(options));
            return { ok: true, content: `memory: proposed ${proposal.id}`, data: redactProposalForModel(proposal) };
          }

          if (input.action === 'proposals') {
            const proposals = (await target.listProposals({ status: 'pending' })).map(redactProposalForModel);
            return {
              ok: true,
              content:
                proposals.length > 0
                  ? proposals.map((proposal) => `${proposal.id} ${proposal.status} - ${proposal.input.text}`).join('\n')
                  : 'memory: no proposals',
              data: proposals,
            };
          }

          if (input.action === 'history') {
            const events = (await target.history({ memoryId: requireId(input) })).map(redactLedgerEventForModel);
            return {
              ok: true,
              content:
                events.length > 0
                  ? events.map((event) => `${event.createdAt} ${event.type} ${event.targetId}`).join('\n')
                  : 'memory: no history',
              data: events,
            };
          }

          if (input.action === 'evidence') {
            const records = (
              input.id
                ? [await target.getEvidence(input.id)].filter((record): record is MemoryEvidenceRecord =>
                    Boolean(record),
                  )
                : await target.listEvidence()
            ).map(redactEvidenceForModel);
            return {
              ok: true,
              content:
                records.length > 0
                  ? records.map((record) => `${record.id} ${record.kind} ${record.sensitivity}`).join('\n')
                  : 'memory: no evidence',
              data: records,
            };
          }

          if (input.action === 'search') {
            const records = (await target.searchRecords({ query: requireQuery(input), limit: 10 })).map(
              redactRecordForModel,
            );
            return {
              ok: true,
              content: records.length > 0 ? records.map(renderRecordLine).join('\n') : 'memory: no matches',
              data: records,
            };
          }

          if (input.action === 'list') {
            const records = (await target.listRecords()).map(redactRecordForModel);
            return {
              ok: true,
              content: records.length > 0 ? records.map(renderRecordLine).join('\n') : 'memory: empty',
              data: records,
            };
          }

          const id = requireId(input);
          const event = await target.archive(id, { ...resolveWriteContext(options), intent: 'delete' });
          return { ok: true, content: `memory: archived ${id}`, data: event };
        }

        if (input.action === 'save') {
          const record = await target.upsert({
            id: input.id ?? createMemoryId(),
            text: requireText(input),
            tags: input.tags ?? [],
            source: 'agent',
            ...(input.priority !== undefined && input.priority !== null ? { priority: input.priority } : {}),
          });
          return { ok: true, content: `memory: saved ${record.id}`, data: record };
        }

        if (input.action === 'search') {
          const records = (await target.search(requireQuery(input))).slice(0, 10);
          return {
            ok: true,
            content: records.length > 0 ? records.map(renderRecordLine).join('\n') : 'memory: no matches',
            data: records,
          };
        }

        if (input.action === 'list') {
          const records = await target.list();
          return {
            ok: true,
            content: records.length > 0 ? records.map(renderRecordLine).join('\n') : 'memory: empty',
            data: records,
          };
        }

        if (input.action !== 'delete') {
          throw new Error(`Action "${input.action}" requires ledger-backed memory.`);
        }

        const id = requireId(input);
        await target.remove(id);
        return { ok: true, content: `memory: deleted ${id}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, content: `memory ${input.action} failed: ${message}` };
      }
    },
  };
}
