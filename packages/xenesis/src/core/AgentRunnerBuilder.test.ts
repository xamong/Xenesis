import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { effectiveAgentMaxTurns } from './AgentRunnerBuilder.js';

describe('effectiveAgentMaxTurns', () => {
  it('does not change runtime limits from natural prompt keywords', () => {
    for (const prompt of [
      '브라우저 화면 확인하고 서버까지 검증해줘',
      '구현 끝까지 하고 browser app_e2e_check로 확인해',
      'start the server, run browser verification, and fix the UI',
      '그냥 대화해줘',
    ]) {
      expect(effectiveAgentMaxTurns({ maxTurns: 8, mode: 'work', prompt })).toBe(8);
      expect(effectiveAgentMaxTurns({ maxTurns: 8, mode: 'plan', prompt })).toBe(8);
      expect(effectiveAgentMaxTurns({ maxTurns: 8, prompt })).toBe(8);
    }
  });

  it('keeps prompt keyword classifiers out of AgentRunnerBuilder', () => {
    const source = readFileSync(new URL('./AgentRunnerBuilder.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/promptRequiresExtendedWorkLoop/);
    expect(source).not.toMatch(/asksForWork|asksForServer|asksForVisualVerification|asksForVerification/);
    expect(source).not.toMatch(/구현\|수정|브라우저\|화면|browser\|app_e2e_check/);
  });
});
