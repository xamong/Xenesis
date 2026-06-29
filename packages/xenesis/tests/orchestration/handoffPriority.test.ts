import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  type HandoffPriorityPolicy,
  isHandoffPriorityPolicy,
  resolveHandoffPriority,
} from '../../src/orchestration/handoffPriority.js';

describe('resolveHandoffPriority', () => {
  it('honors explicit task priority', () => {
    expect(
      resolveHandoffPriority({
        prompt: '긴급 버그 수정',
        explicitPriority: 42,
        policy: { defaultPriority: 5 },
      }),
    ).toEqual({
      priority: 42,
      reason: 'explicit',
    });
  });

  it('uses only the policy default for natural task text', () => {
    const policy: HandoffPriorityPolicy = { defaultPriority: 5 };

    for (const prompt of [
      'urgent production blocker fix',
      '검증 테스트 진단 확인',
      '새 기능 구현하고 배포 오류 고쳐',
      'please research and review the failure',
    ]) {
      expect(resolveHandoffPriority({ label: prompt, prompt, policy })).toEqual({
        priority: 5,
        reason: 'default',
      });
    }
  });

  it('does not accept legacy keyword heuristic priority policy fields', () => {
    expect(
      isHandoffPriorityPolicy({
        defaultPriority: 5,
        urgentPriority: 50,
        taskTypePriorities: { repair: 35 },
      }),
    ).toBe(false);
  });

  it('keeps keyword and includes-based priority classifiers out of the source', () => {
    const source = readFileSync(new URL('../../src/orchestration/handoffPriority.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/taskTypeKeywords/);
    expect(source).not.toMatch(/urgentKeywords/);
    expect(source).not.toMatch(/includesAny/);
    expect(source).not.toMatch(/\.includes\(keyword\)/);
    expect(source).not.toMatch(/type:/);
    expect(source).not.toMatch(/urgent/);
  });
});
