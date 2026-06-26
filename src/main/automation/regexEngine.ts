import type { AutomationRegexRule } from '../../shared/types';

export interface RegexDecision {
  source: 'regex';
  rule: string;
  input: string;
  reason: string;
}

/** 기본 내장 규칙 — 사용자 규칙이 없어도 동작하는 안전한 패턴 */
const BUILTIN_RULES: AutomationRegexRule[] = [
  {
    id: '__builtin_yes_no',
    name: 'yes_no_continue',
    pattern: '(continue|proceed|confirm|approve).{0,60}(y\\/n|yes\\/no|\\[y\\/n\\])',
    flags: 'i',
    response: 'y\r',
    cooldownMs: 4000,
    enabled: true,
  },
  {
    id: '__builtin_press_enter',
    name: 'press_enter',
    pattern: '(press enter|hit enter|return to continue)',
    flags: 'i',
    response: '\r',
    cooldownMs: 3000,
    enabled: true,
  },
  {
    id: '__builtin_select_first',
    name: 'select_first_option',
    pattern: '(select an option|choose one|pick one).{0,200}(\\n|\\r\\n)\\s*(1|\\[1\\]|①)',
    flags: 'i',
    response: '1\r',
    cooldownMs: 5000,
    enabled: true,
  },
  {
    id: '__builtin_retry_fix',
    name: 'retry_fix_tests',
    pattern: '(test failed|failed tests|npm test failed|pytest failed|build failed)',
    flags: 'i',
    response: 'Fix the error, then run the relevant tests again.\r',
    cooldownMs: 12000,
    enabled: true,
  },
];

export class RegexEngine {
  private lastRun = new Map<string, number>();

  decide(text: string, userRules: AutomationRegexRule[]): RegexDecision | null {
    // 사용자 규칙 먼저, 그다음 기본 규칙
    const allRules = [...userRules.filter((r) => r.enabled), ...BUILTIN_RULES];

    for (const rule of allRules) {
      let re: RegExp;
      try {
        re = new RegExp(rule.pattern, rule.flags || 'i');
      } catch {
        continue;
      }
      if (!re.test(text)) continue;
      if (!this.canRun(rule.id, rule.cooldownMs)) continue;

      return {
        source: 'regex',
        rule: rule.name,
        input: rule.response,
        reason: `Matched regex rule: ${rule.name}`,
      };
    }
    return null;
  }

  private canRun(ruleId: string, cooldownMs: number): boolean {
    const now = Date.now();
    const prev = this.lastRun.get(ruleId) ?? 0;
    if (now - prev < cooldownMs) return false;
    this.lastRun.set(ruleId, now);
    return true;
  }

  reset(): void {
    this.lastRun.clear();
  }
}
