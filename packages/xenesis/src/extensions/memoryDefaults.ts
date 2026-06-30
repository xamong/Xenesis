import type { MemorySourceKind, MemoryTrustLevel, MemoryWriteContext } from './memoryTypes.js';
import type { MemoryInput } from './types.js';

function randomSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createMemoryProposalId(): string {
  return `memprop-${randomSuffix()}`;
}

export function createMemoryEvidenceId(): string {
  return `mev-${randomSuffix()}`;
}

export function createMemoryLedgerEventId(): string {
  return `mevt-${randomSuffix()}`;
}

export function nowIso(context?: Pick<MemoryWriteContext, 'now'>): string {
  return (context?.now?.() ?? new Date()).toISOString();
}

export function defaultMemoryWriteContext(overrides: Partial<MemoryWriteContext> = {}): MemoryWriteContext {
  return {
    sourceKind: 'unknown',
    trust: 'unknown',
    externalTaint: false,
    actor: 'agent',
    runtime: 'unknown',
    ...overrides,
  };
}

export function trustedMemoryWriteContext(
  runtime: string,
  sourceKind: Exclude<MemorySourceKind, 'unknown' | 'external_document'> = 'conversation',
): MemoryWriteContext {
  return defaultMemoryWriteContext({
    runtime,
    sourceKind,
    trust: 'trusted',
    externalTaint: false,
  });
}

export function normalizeMemoryTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const tag of tags ?? []) {
    const value = tag.trim().toLowerCase().slice(0, 40);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
    if (normalized.length >= 8) break;
  }
  return normalized;
}

export function normalizeMemoryInput(input: MemoryInput): MemoryInput {
  return {
    ...input,
    text: input.text.trim(),
    tags: normalizeMemoryTags(input.tags),
  };
}

export function isTrustedMemoryContext(context: MemoryWriteContext): boolean {
  const trust: MemoryTrustLevel = context.trust;
  return trust === 'trusted' && context.sourceKind !== 'unknown' && context.externalTaint !== true;
}
