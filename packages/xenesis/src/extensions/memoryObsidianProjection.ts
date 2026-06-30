import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { classifyMemorySensitivity } from './memoryPolicy.js';
import type { MemoryEvidenceRecord, MemoryLedgerEvent, MemoryProposal, MemorySensitivity } from './memoryTypes.js';
import type { MemoryRecord } from './types.js';

export type MemoryObsidianProjectionArea = 'working-notes' | 'outputs' | 'review' | 'tasks';

export interface MemoryObsidianProjectionSnapshot {
  generatedAt?: string;
  records: MemoryRecord[];
  proposals: MemoryProposal[];
  evidence: MemoryEvidenceRecord[];
  events: MemoryLedgerEvent[];
}

export interface MemoryObsidianProjectionPathInput {
  repoRoot: string;
  area: MemoryObsidianProjectionArea | string;
  fileName: string;
  requestedPath?: string;
}

export interface MemoryObsidianProjectionWriteInput extends MemoryObsidianProjectionSnapshot {
  repoRoot: string;
  area: MemoryObsidianProjectionArea | string;
  fileName: string;
}

export interface MemoryObsidianProjectionWriteResult {
  path: string;
  markdown: string;
  counts: {
    records: number;
    proposals: number;
    evidence: number;
    events: number;
  };
}

const AREA_SEGMENTS: Record<MemoryObsidianProjectionArea, string[]> = {
  'working-notes': ['80_AI', 'Working Notes'],
  outputs: ['80_AI', 'Outputs'],
  review: ['80_AI', 'Review'],
  tasks: ['70_Tasks'],
};

const SENSITIVITY_RANK: Record<MemorySensitivity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  restricted: 3,
};

function isSensitiveMemory(sensitivity: MemorySensitivity | undefined): boolean {
  return sensitivity === 'high' || sensitivity === 'restricted';
}

function maxSensitivity(left: MemorySensitivity | undefined, right: MemorySensitivity | undefined): MemorySensitivity {
  const leftValue = left ?? 'low';
  const rightValue = right ?? 'low';
  return SENSITIVITY_RANK[rightValue] > SENSITIVITY_RANK[leftValue] ? rightValue : leftValue;
}

function effectiveRecordSensitivity(record: MemoryRecord): MemorySensitivity {
  return maxSensitivity(
    record.sensitivity,
    classifyMemorySensitivity({
      id: record.id,
      text: [record.text, record.source ?? ''].join(' '),
      tags: record.tags,
      runbook: record.runbook,
      kind: record.kind,
    }),
  );
}

function effectiveProposalSensitivity(proposal: MemoryProposal): MemorySensitivity {
  return maxSensitivity(
    proposal.decision.sensitivity ?? proposal.input.sensitivity,
    classifyMemorySensitivity({
      ...proposal.input,
      text: [proposal.input.text, proposal.input.source ?? ''].join(' '),
    }),
  );
}

function effectiveEvidenceSensitivity(evidence: MemoryEvidenceRecord): MemorySensitivity {
  return maxSensitivity(
    evidence.sensitivity,
    classifyMemorySensitivity({
      id: evidence.id,
      text: [evidence.source, evidence.summary ?? '', evidence.uri ?? ''].join(' '),
      tags: [],
    }),
  );
}

function isPathInside(candidate: string, parent: string): boolean {
  const relative = path.relative(parent, candidate);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function canonicalVaultRoot(repoRoot: string): string {
  return path.resolve(repoRoot, 'docs', 'obsidian', 'Xenesis-desk');
}

function areaDirectory(repoRoot: string, area: string): string {
  const segments = AREA_SEGMENTS[area as MemoryObsidianProjectionArea];
  if (!segments) {
    throw new Error(`Unknown Obsidian projection area: ${area}`);
  }
  return path.join(canonicalVaultRoot(repoRoot), ...segments);
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) throw new Error('Obsidian projection fileName is required');
  if (!trimmed.toLowerCase().endsWith('.md')) throw new Error('Obsidian projection fileName must end with .md');
  return trimmed;
}

function sortedById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function sortedEvents(events: readonly MemoryLedgerEvent[]): MemoryLedgerEvent[] {
  return [...events].sort((left, right) => {
    const byTime = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return byTime === 0 ? left.id.localeCompare(right.id) : byTime;
  });
}

function oneLine(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function markdownListItem(value: string): string {
  return oneLine(value).replace(/\|/g, '\\|') || '-';
}

function recordProjectionText(record: MemoryRecord): string {
  const sensitivity = effectiveRecordSensitivity(record);
  return isSensitiveMemory(sensitivity) ? `[redacted: ${sensitivity} memory]` : record.text;
}

function recordProjectionTags(record: MemoryRecord): string {
  const sensitivity = effectiveRecordSensitivity(record);
  return isSensitiveMemory(sensitivity) ? `[redacted: ${sensitivity} memory tags]` : record.tags.join(', ');
}

function proposalProjectionText(proposal: MemoryProposal): string {
  const sensitivity = effectiveProposalSensitivity(proposal);
  return isSensitiveMemory(sensitivity) ? `[redacted: ${sensitivity} memory proposal]` : proposal.input.text;
}

function evidenceProjectionSource(evidence: MemoryEvidenceRecord): string {
  const sensitivity = effectiveEvidenceSensitivity(evidence);
  return isSensitiveMemory(sensitivity) ? `[redacted: ${sensitivity} evidence]` : evidence.source;
}

function evidenceProjectionSummary(evidence: MemoryEvidenceRecord): string {
  const sensitivity = effectiveEvidenceSensitivity(evidence);
  if (isSensitiveMemory(sensitivity)) return `[redacted: ${sensitivity} evidence summary]`;
  return evidence.summary ?? '';
}

function eventProjectionReason(event: MemoryLedgerEvent): string {
  const reason = event.reason ?? '';
  if (!reason) return '';
  const sensitivity = classifyMemorySensitivity({
    id: event.id,
    text: reason,
    tags: [],
  });
  return isSensitiveMemory(sensitivity) ? `[redacted: ${sensitivity} event reason]` : reason;
}

export function resolveMemoryObsidianProjectionPath(input: MemoryObsidianProjectionPathInput): string {
  const repoRoot = path.resolve(input.repoRoot);
  const vaultRoot = canonicalVaultRoot(repoRoot);
  if (input.requestedPath) {
    const requested = path.resolve(input.requestedPath);
    if (requested !== vaultRoot && !isPathInside(requested, vaultRoot)) {
      throw new Error('Memory Obsidian projection must use repo-local docs/obsidian, not an external mirror path');
    }
  }

  const base = areaDirectory(repoRoot, input.area);
  const target = path.resolve(base, sanitizeFileName(input.fileName));
  if (!isPathInside(target, base)) {
    throw new Error('Resolved path is outside allowed Obsidian projection area');
  }
  return target;
}

export function buildMemoryObsidianProjectionMarkdown(input: MemoryObsidianProjectionSnapshot): string {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const records = sortedById(input.records);
  const proposals = sortedById(input.proposals);
  const evidence = sortedById(input.evidence);
  const events = sortedEvents(input.events);
  const lines: string[] = [
    '---',
    'type: agent-handoff',
    'repo: xenesis-desk',
    'status: draft',
    'ai_generated: true',
    'reviewed: false',
    'confidence: medium',
    `generated_at: ${generatedAt}`,
    '---',
    '',
    '# Memory Projection',
    '',
    '> Regenerable projection from the Evidence-Governed Memory ledger. The ledger remains the source of truth.',
    '',
    '## Counts',
    '',
    `- Records: ${records.length}`,
    `- Pending proposals: ${proposals.filter((proposal) => proposal.status === 'pending').length}`,
    `- Evidence: ${evidence.length}`,
    `- Events: ${events.length}`,
    '',
    '## Memories',
    '',
    '| ID | Kind | Sensitivity | Tags | Evidence | Text |',
    '|---|---|---|---|---|---|',
  ];

  if (records.length === 0) {
    lines.push('| - | - | - | - | - | No memory records. |');
  } else {
    for (const record of records) {
      lines.push(
        `| ${markdownListItem(record.id)} | ${markdownListItem(record.kind ?? 'fact')} | ${markdownListItem(effectiveRecordSensitivity(record))} | ${markdownListItem(recordProjectionTags(record))} | ${markdownListItem((record.evidenceIds ?? []).join(', '))} | ${markdownListItem(recordProjectionText(record))} |`,
      );
    }
  }

  lines.push('', '## Pending Proposals', '', '| ID | Sensitivity | Requires Approval | Text |', '|---|---|---|---|');
  const pendingProposals = proposals.filter((proposal) => proposal.status === 'pending');
  if (pendingProposals.length === 0) {
    lines.push('| - | - | - | No pending proposals. |');
  } else {
    for (const proposal of pendingProposals) {
      const sensitivity = effectiveProposalSensitivity(proposal);
      lines.push(
        `| ${markdownListItem(proposal.id)} | ${markdownListItem(sensitivity)} | ${proposal.decision.requiresApproval ? 'yes' : 'no'} | ${markdownListItem(proposalProjectionText(proposal))} |`,
      );
    }
  }

  lines.push(
    '',
    '## Evidence',
    '',
    '| ID | Kind | Sensitivity | Status | Source | Summary |',
    '|---|---|---|---|---|---|',
  );
  if (evidence.length === 0) {
    lines.push('| - | - | - | - | - | No evidence records. |');
  } else {
    for (const item of evidence) {
      const sensitivity = effectiveEvidenceSensitivity(item);
      lines.push(
        `| ${markdownListItem(item.id)} | ${markdownListItem(item.kind)} | ${markdownListItem(sensitivity)} | ${markdownListItem(item.status ?? 'active')} | ${markdownListItem(evidenceProjectionSource(item))} | ${markdownListItem(evidenceProjectionSummary(item))} |`,
      );
    }
  }

  lines.push('', '## Recent Ledger Events', '', '| Created | Type | Target | Reason |', '|---|---|---|---|');
  if (events.length === 0) {
    lines.push('| - | - | - | No ledger events. |');
  } else {
    for (const event of events.slice(-25)) {
      lines.push(
        `| ${markdownListItem(event.createdAt)} | ${markdownListItem(event.type)} | ${markdownListItem(event.targetId)} | ${markdownListItem(eventProjectionReason(event))} |`,
      );
    }
  }

  lines.push('');
  return lines.join('\n');
}

export async function writeMemoryObsidianProjection(
  input: MemoryObsidianProjectionWriteInput,
): Promise<MemoryObsidianProjectionWriteResult> {
  const target = resolveMemoryObsidianProjectionPath(input);
  const markdown = buildMemoryObsidianProjectionMarkdown(input);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, markdown, 'utf8');
  return {
    path: target,
    markdown,
    counts: {
      records: input.records.length,
      proposals: input.proposals.length,
      evidence: input.evidence.length,
      events: input.events.length,
    },
  };
}
