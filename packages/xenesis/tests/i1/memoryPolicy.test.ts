import { describe, expect, it } from 'vitest';
import type { MemoryInput, MemoryWriteContext } from '../../src/extensions/index.js';
import { classifyMemoryWrite } from '../../src/extensions/memoryPolicy.js';

const input: MemoryInput = {
  id: 'pref-short',
  text: '답변은 짧고 실행 중심으로 받는 것을 선호한다',
  tags: ['preference'],
};

function trustedContext(overrides: Partial<MemoryWriteContext> = {}): MemoryWriteContext {
  return {
    sourceKind: 'conversation',
    trust: 'trusted',
    externalTaint: false,
    actor: 'agent',
    runtime: 'test',
    ...overrides,
  };
}

describe('memory write policy', () => {
  it('accepts low-risk trusted untainted memory', () => {
    const decision = classifyMemoryWrite(input, trustedContext());

    expect(decision.action).toBe('accept');
    expect(decision.sensitivity).toBe('low');
    expect(decision.requiresApproval).toBe(false);
  });

  it('proposes when provenance is unknown', () => {
    const decision = classifyMemoryWrite(input, {
      sourceKind: 'unknown',
      trust: 'unknown',
      externalTaint: false,
      actor: 'agent',
      runtime: 'test',
    });

    expect(decision.action).toBe('propose');
    expect(decision.reason).toMatch(/unknown provenance/i);
  });

  it('proposes external-tainted memory', () => {
    const decision = classifyMemoryWrite(
      input,
      trustedContext({ sourceKind: 'external_document', externalTaint: true }),
    );

    expect(decision.action).toBe('propose');
    expect(decision.reason).toMatch(/external/i);
  });

  it('proposes sensitive memory even from trusted context', () => {
    const decision = classifyMemoryWrite(
      {
        id: 'secret',
        text: '내 API key는 sk-test-123 이다',
        tags: ['credential'],
      },
      trustedContext(),
    );

    expect(decision.action).toBe('propose');
    expect(decision.sensitivity).toBe('restricted');
    expect(decision.requiresApproval).toBe(true);
  });

  it('explicit propose never auto-accepts', () => {
    const decision = classifyMemoryWrite(input, trustedContext({ intent: 'propose' }));

    expect(decision.action).toBe('propose');
    expect(decision.reason).toMatch(/explicit propose/i);
  });

  it('proposes writes with declared conflicts', () => {
    const decision = classifyMemoryWrite({ ...input, conflictsWith: ['old-pref'] }, trustedContext());

    expect(decision.action).toBe('propose');
    expect(decision.reason).toMatch(/conflict/i);
  });
});
