import { describe, expect, it } from 'vitest';
import {
  createMemoryEvidenceId,
  createMemoryLedgerEventId,
  createMemoryProposalId,
  defaultMemoryWriteContext,
  normalizeMemoryTags,
} from '../../src/extensions/memoryDefaults.js';

describe('memory defaults', () => {
  it('does not treat missing provenance as trusted', () => {
    const context = defaultMemoryWriteContext();

    expect(context.trust).toBe('unknown');
    expect(context.sourceKind).toBe('unknown');
    expect(context.externalTaint).toBe(false);
  });

  it('normalizes tags deterministically', () => {
    expect(normalizeMemoryTags([' Work ', 'work', '', 'AI', 'a'.repeat(80)])).toEqual(['work', 'ai', 'a'.repeat(40)]);
  });

  it('creates typed ids for sidecar rows', () => {
    expect(createMemoryProposalId()).toMatch(/^memprop-/);
    expect(createMemoryEvidenceId()).toMatch(/^mev-/);
    expect(createMemoryLedgerEventId()).toMatch(/^mevt-/);
  });
});
