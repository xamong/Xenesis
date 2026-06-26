import { Cron } from 'croner';

export interface WorkflowCronTrigger {
  id: string;
  workflowId: string;
  expression: string;
  label?: string;
  enabled: boolean;
  cron: Cron | null;
  lastRun?: Date;
  nextRun?: Date;
}

const activeTriggers = new Map<string, WorkflowCronTrigger>();

export function createCronTrigger(
  id: string,
  workflowId: string,
  expression: string,
  onTrigger: (trigger: WorkflowCronTrigger) => void,
  label?: string,
): WorkflowCronTrigger {
  stopCronTrigger(id);

  const trigger: WorkflowCronTrigger = {
    id,
    workflowId,
    expression,
    label,
    enabled: true,
    cron: null,
  };

  trigger.cron = new Cron(expression, () => {
    trigger.lastRun = new Date();
    trigger.nextRun = trigger.cron?.nextRun() ?? undefined;
    onTrigger(trigger);
  });

  trigger.nextRun = trigger.cron.nextRun() ?? undefined;
  activeTriggers.set(id, trigger);
  return trigger;
}

export function stopCronTrigger(id: string): boolean {
  const existing = activeTriggers.get(id);
  if (!existing) return false;
  existing.cron?.stop();
  existing.enabled = false;
  activeTriggers.delete(id);
  return true;
}

export function stopAllCronTriggers(): void {
  for (const trigger of activeTriggers.values()) {
    trigger.cron?.stop();
    trigger.enabled = false;
  }
  activeTriggers.clear();
}

export function listCronTriggers(): WorkflowCronTrigger[] {
  return Array.from(activeTriggers.values()).map((t) => ({
    ...t,
    cron: null,
    nextRun: t.cron?.nextRun() ?? t.nextRun,
  }));
}

export function getCronNextRuns(expression: string, count = 5): Date[] {
  try {
    const cron = new Cron(expression);
    const runs: Date[] = [];
    let ref: Date | undefined;
    for (let i = 0; i < count; i++) {
      const next = cron.nextRun(ref);
      if (!next) break;
      runs.push(next);
      ref = new Date(next.getTime() + 1000);
    }
    cron.stop();
    return runs;
  } catch {
    return [];
  }
}

export function isValidCronExpression(expression: string): boolean {
  try {
    const cron = new Cron(expression);
    cron.stop();
    return true;
  } catch {
    return false;
  }
}
