/**
 * Alert rules engine for fixture-based threshold monitoring.
 *
 * Evaluates SUGAR expressions against fixture values and triggers
 * notifications when conditions are met. Supports cooldown to
 * prevent alert storms.
 *
 * Usage:
 *   const engine = createAlertRulesEngine();
 *   engine.addRule({ id: 'cpu-high', condition: '= $.cpu > 90', severity: 'critical', ... });
 *   engine.evaluate(fixtureData); // triggers matching rules
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertChannel = 'toast' | 'slack' | 'telegram' | 'discord';

export interface AlertRule {
  id: string;
  name: string;
  fixtureRef?: string;
  condition: string;
  severity: AlertSeverity;
  message: string;
  channels: AlertChannel[];
  cooldownMs: number;
  enabled: boolean;
  actions?: string[];
}

export interface AlertEvent {
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  message: string;
  channels: AlertChannel[];
  triggeredAt: number;
  fixtureValue?: unknown;
  actions?: string[];
}

export interface AlertRulesEngine {
  addRule(rule: AlertRule): void;
  removeRule(id: string): boolean;
  getRule(id: string): AlertRule | undefined;
  listRules(): AlertRule[];
  evaluate(data: Record<string, unknown>): AlertEvent[];
  clearCooldowns(): void;
  onAlert: ((event: AlertEvent) => void) | null;
}

export function createAlertRulesEngine(): AlertRulesEngine {
  const rules = new Map<string, AlertRule>();
  const lastTriggered = new Map<string, number>();

  function evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
    try {
      const expression = condition.startsWith('=') ? condition.slice(1).trim() : condition.trim();
      const fn = new Function('$', `try { return Boolean(${expression}); } catch { return false; }`);
      return fn(data);
    } catch {
      return false;
    }
  }

  function resolveMessage(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{\s*\$\.(\w+)\s*\}\}/g, (_match, key) => {
      const value = data[key];
      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  function isInCooldown(ruleId: string, cooldownMs: number): boolean {
    const last = lastTriggered.get(ruleId);
    if (!last) return false;
    return Date.now() - last < cooldownMs;
  }

  const engine: AlertRulesEngine = {
    onAlert: null,

    addRule(rule: AlertRule): void {
      rules.set(rule.id, { ...rule });
    },

    removeRule(id: string): boolean {
      lastTriggered.delete(id);
      return rules.delete(id);
    },

    getRule(id: string): AlertRule | undefined {
      const rule = rules.get(id);
      return rule ? { ...rule } : undefined;
    },

    listRules(): AlertRule[] {
      return Array.from(rules.values()).map((r) => ({ ...r }));
    },

    evaluate(data: Record<string, unknown>): AlertEvent[] {
      const events: AlertEvent[] = [];

      for (const rule of rules.values()) {
        if (!rule.enabled) continue;
        if (isInCooldown(rule.id, rule.cooldownMs)) continue;

        const fixtureData =
          rule.fixtureRef && data[rule.fixtureRef] ? (data[rule.fixtureRef] as Record<string, unknown>) : data;

        if (evaluateCondition(rule.condition, fixtureData)) {
          lastTriggered.set(rule.id, Date.now());

          const event: AlertEvent = {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: resolveMessage(rule.message, fixtureData),
            channels: [...rule.channels],
            triggeredAt: Date.now(),
            fixtureValue: fixtureData,
            actions: rule.actions ? [...rule.actions] : undefined,
          };

          events.push(event);
          engine.onAlert?.(event);
        }
      }

      return events;
    },

    clearCooldowns(): void {
      lastTriggered.clear();
    },
  };

  return engine;
}
