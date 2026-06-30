import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveXenisTaskPolicy } from './xenisPolicy.js';

describe('resolveXenisTaskPolicy', () => {
  it('does not select specialized workflow policies from ordinary prompt keywords', () => {
    for (const prompt of [
      '브라우저 탭 몇 개야?',
      '파일 수정해줘',
      '서브에이전트 터미널 보이게 실행해',
      '전체 프로젝트 단계별 검증해',
      '오류 원인 진단해',
      '현재 패널 확인해줘',
    ]) {
      const policy = resolveXenisTaskPolicy(prompt);

      expect(policy.id).toBe('desk-general');
      expect(policy.label).toBe('General Desk orchestration');
      expect(policy.priorityTools).toEqual(['desk_state', 'desk_active_context', 'desk_capabilities']);
    }
  });

  it('keeps explicit /xd and literal xd.* handling because the user supplied a command', () => {
    expect(resolveXenisTaskPolicy('/xd panes list').id).toBe('xd-command');
    expect(resolveXenisTaskPolicy('xd.panes.settings.open').id).toBe('xd-command');
  });

  it('keeps keyword, regex, and natural Desk prompt classifiers out of the source', () => {
    const source = readFileSync(new URL('./xenisPolicy.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/includesAny/);
    expect(source).not.toMatch(/isNaturalDeskControlPrompt/);
    expect(source).not.toMatch(/isBrowserExplorerStatusPrompt/);
    expect(source).not.toMatch(/isLongRunningHandoffPrompt/);
    expect(source).not.toMatch(/isVisibleSubagentPrompt/);
    expect(source).not.toMatch(/Natural-language Desk control/);
  });
});
