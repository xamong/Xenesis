import type { ApprovalMode } from "../config/types.js";

export type ScheduleTrigger =
  | { type: "interval"; every: string }
  | { type: "daily"; at: string }
  | { type: "cron"; cron: string; recurring?: boolean; durable?: boolean };

export interface TaskScheduleDefaults {
  approvalMode?: ApprovalMode;
  maxTurns?: number;
  maxTokens?: number;
}

/**
 * P6 (c): optional cheap, MECHANICAL pre-filter evaluated BEFORE a schedule fires a task.
 * Evaluated by {@link evaluateWakeGate} (NO model). Fails OPEN (wakes) on error/timeout.
 *  - "command": spawn `run`; if its output ends with `{"wakeAgent":false}` → do not wake.
 *  - "file-changed": wake only when the file's mtime is newer than the schedule's lastFiredAt.
 */
export type ScheduleWakeCheck =
  | { type: "command"; run: string }
  | { type: "file-changed"; path: string };

export interface TaskSchedule {
  id: string;
  prompt: string;
  enabled: boolean;
  trigger: ScheduleTrigger;
  sessionId?: string;
  defaults?: TaskScheduleDefaults;
  wakeCheck?: ScheduleWakeCheck;
  lastFiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduleInput {
  prompt: string;
  trigger: ScheduleTrigger;
  enabled?: boolean;
  defaults?: TaskScheduleDefaults;
}

export interface UpdateScheduleInput {
  prompt?: string;
  trigger?: ScheduleTrigger;
  enabled?: boolean;
  defaults?: TaskScheduleDefaults;
  lastFiredAt?: string;
}

export interface ScheduleStore {
  create(input: CreateScheduleInput): Promise<TaskSchedule>;
  update(id: string, input: UpdateScheduleInput): Promise<TaskSchedule>;
  get(id: string): Promise<TaskSchedule | undefined>;
  list(): Promise<TaskSchedule[]>;
  remove(id: string): Promise<void>;
}

function now() {
  return new Date().toISOString();
}

export function createScheduleId() {
  return `schedule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const sessionScheduleState = new Map<string, TaskSchedule[]>();

function copySchedule(schedule: TaskSchedule): TaskSchedule {
  return {
    ...schedule,
    trigger: { ...schedule.trigger },
    ...(schedule.defaults ? { defaults: { ...schedule.defaults } } : {})
  };
}

export function parseEveryMs(value: string) {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid interval: ${value}`);

  const amount = Number(match[1]);
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error(`Invalid interval: ${value}`);

  const unit = match[2];
  const multiplier =
    unit === "ms" ? 1 :
      unit === "s" ? 1000 :
        unit === "m" ? 60_000 :
          unit === "h" ? 3_600_000 :
            86_400_000;
  return amount * multiplier;
}

export function parseDailyAt(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) throw new Error(`Invalid daily time: ${value}`);
  return {
    hours: Number(match[1]),
    minutes: Number(match[2])
  };
}

export interface CronFields {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
}

type CronFieldsTuple = [number[], number[], number[], number[], number[]];

export interface CronJitterConfig {
  recurringFrac: number;
  recurringCapMs: number;
  oneShotMaxMs: number;
  oneShotFloorMs: number;
  oneShotMinuteMod: number;
}

interface CronFieldRange {
  min: number;
  max: number;
  dayOfWeek?: boolean;
}

const cronFieldRanges: CronFieldRange[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6, dayOfWeek: true }
];

export const defaultCronJitterConfig: CronJitterConfig = {
  recurringFrac: 0.1,
  recurringCapMs: 15 * 60 * 1000,
  oneShotMaxMs: 90 * 1000,
  oneShotFloorMs: 0,
  oneShotMinuteMod: 30
};

function parseCronNumber(value: string, range: CronFieldRange) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  if (range.dayOfWeek && parsed === 7) return 0;
  if (parsed < range.min || parsed > range.max) return undefined;
  return parsed;
}

function addCronRange(values: Set<number>, start: number, end: number, step: number, range: CronFieldRange) {
  const effectiveEnd = range.dayOfWeek ? Math.min(end, 7) : end;
  if (start > effectiveEnd || step <= 0) return false;
  if (start < range.min || effectiveEnd > (range.dayOfWeek ? 7 : range.max)) return false;
  for (let value = start; value <= effectiveEnd; value += step) {
    values.add(range.dayOfWeek && value === 7 ? 0 : value);
  }
  return true;
}

function expandCronField(value: string, range: CronFieldRange) {
  const values = new Set<number>();
  for (const rawPart of value.split(",")) {
    const part = rawPart.trim();
    if (!part) return undefined;

    const wildcard = /^\*(?:\/(\d+))?$/.exec(part);
    if (wildcard) {
      const step = wildcard[1] ? Number(wildcard[1]) : 1;
      if (!addCronRange(values, range.min, range.max, step, range)) return undefined;
      continue;
    }

    const rangeMatch = /^(\d+)-(\d+)(?:\/(\d+))?$/.exec(part);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      const step = rangeMatch[3] ? Number(rangeMatch[3]) : 1;
      if (!addCronRange(values, start, end, step, range)) return undefined;
      continue;
    }

    const single = parseCronNumber(part, range);
    if (single === undefined) return undefined;
    values.add(single);
  }

  return values.size > 0 ? [...values].sort((left, right) => left - right) : undefined;
}

export function parseCronExpression(expression: string): CronFields | undefined {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return undefined;
  const expanded = parts.map((part, index) => expandCronField(part, cronFieldRanges[index]!));
  if (expanded.some((part) => part === undefined)) return undefined;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = expanded as CronFieldsTuple;
  return {
    minute,
    hour,
    dayOfMonth,
    month,
    dayOfWeek
  };
}

function isFullField(values: number[], range: CronFieldRange) {
  return values.length === range.max - range.min + 1;
}

export function nextCronRunDate(expression: string, after: Date): Date | undefined {
  const fields = parseCronExpression(expression);
  if (!fields) return undefined;

  const minute = new Set(fields.minute);
  const hour = new Set(fields.hour);
  const dayOfMonth = new Set(fields.dayOfMonth);
  const month = new Set(fields.month);
  const dayOfWeek = new Set(fields.dayOfWeek);
  const domWildcard = isFullField(fields.dayOfMonth, cronFieldRanges[2]!);
  const dowWildcard = isFullField(fields.dayOfWeek, cronFieldRanges[4]!);

  const cursor = new Date(after.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);

  for (let attempt = 0; attempt < 366 * 24 * 60; attempt += 1) {
    if (!month.has(cursor.getMonth() + 1)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    const dom = cursor.getDate();
    const dow = cursor.getDay();
    const dayMatches =
      domWildcard && dowWildcard ? true :
        domWildcard ? dayOfWeek.has(dow) :
          dowWildcard ? dayOfMonth.has(dom) :
            dayOfMonth.has(dom) || dayOfWeek.has(dow);
    if (!dayMatches) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hour.has(cursor.getHours())) {
      cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minute.has(cursor.getMinutes())) {
      cursor.setMinutes(cursor.getMinutes() + 1);
      continue;
    }

    return cursor;
  }

  return undefined;
}

function formatCronTime(hour: number, minute: number) {
  return new Date(2000, 0, 1, hour, minute, 0, 0).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });
}

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function cronToHuman(expression: string) {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return expression;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [string, string, string, string, string];

  const everyMinute = /^\*\/(\d+)$/.exec(minute);
  if (everyMinute && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const amount = Number(everyMinute[1]);
    return amount === 1 ? "Every minute" : `Every ${amount} minutes`;
  }

  if (/^\d+$/.test(minute) && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const parsedMinute = Number(minute);
    return parsedMinute === 0 ? "Every hour" : `Every hour at :${String(parsedMinute).padStart(2, "0")}`;
  }

  const everyHour = /^\*\/(\d+)$/.exec(hour);
  if (/^\d+$/.test(minute) && everyHour && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const parsedMinute = Number(minute);
    const suffix = parsedMinute === 0 ? "" : ` at :${String(parsedMinute).padStart(2, "0")}`;
    const amount = Number(everyHour[1]);
    return amount === 1 ? `Every hour${suffix}` : `Every ${amount} hours${suffix}`;
  }

  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return expression;
  const parsedMinute = Number(minute);
  const parsedHour = Number(hour);

  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every day at ${formatCronTime(parsedHour, parsedMinute)}`;
  }

  if (dayOfMonth === "*" && month === "*" && /^\d$/.test(dayOfWeek)) {
    return `Every ${weekdayNames[Number(dayOfWeek) % 7]} at ${formatCronTime(parsedHour, parsedMinute)}`;
  }

  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "1-5") {
    return `Weekdays at ${formatCronTime(parsedHour, parsedMinute)}`;
  }

  return expression;
}

export function validateTrigger(trigger: ScheduleTrigger) {
  if (trigger.type === "interval") {
    parseEveryMs(trigger.every);
    return;
  }
  if (trigger.type === "daily") {
    parseDailyAt(trigger.at);
    return;
  }
  if (trigger.type === "cron") {
    if (!parseCronExpression(trigger.cron)) {
      throw new Error(`Invalid cron expression '${trigger.cron}'. Expected 5 fields: M H DoM Mon DoW.`);
    }
    if (!nextCronRunDate(trigger.cron, new Date())) {
      throw new Error(`Cron expression '${trigger.cron}' does not match any calendar date in the next year.`);
    }
    return;
  }
  throw new Error(`Invalid schedule trigger: ${JSON.stringify(trigger)}`);
}

function sameLocalDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

function dateOrUndefined(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function stableScheduleFraction(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) + 1) / 0x1_0000_0000;
}

function jitteredCronRunDate(schedule: TaskSchedule, anchor: Date, config = defaultCronJitterConfig) {
  if (schedule.trigger.type !== "cron") return undefined;
  const next = nextCronRunDate(schedule.trigger.cron, anchor);
  if (!next) return undefined;

  const fraction = stableScheduleFraction(schedule.id);
  if (schedule.trigger.recurring === false) {
    if (next.getMinutes() % config.oneShotMinuteMod !== 0) return next;
    const lead = config.oneShotFloorMs + fraction * (config.oneShotMaxMs - config.oneShotFloorMs);
    return new Date(Math.max(next.getTime() - lead, anchor.getTime()));
  }

  const following = nextCronRunDate(schedule.trigger.cron, next);
  if (!following) return next;
  const delay = Math.min(
    fraction * config.recurringFrac * (following.getTime() - next.getTime()),
    config.recurringCapMs
  );
  return new Date(next.getTime() + delay);
}

export function shouldFireSchedule(schedule: TaskSchedule, at = new Date()) {
  if (!schedule.enabled) return false;

  if (schedule.trigger.type === "interval") {
    const lastFired = dateOrUndefined(schedule.lastFiredAt);
    if (!lastFired) return true;
    return at.getTime() - lastFired.getTime() >= parseEveryMs(schedule.trigger.every);
  }

  if (schedule.trigger.type === "cron") {
    const anchor = dateOrUndefined(schedule.lastFiredAt) ?? dateOrUndefined(schedule.createdAt);
    if (!anchor) return false;
    const next = jitteredCronRunDate(schedule, anchor);
    return next ? next.getTime() <= at.getTime() : false;
  }

  const lastFired = dateOrUndefined(schedule.lastFiredAt);
  if (lastFired && sameLocalDay(lastFired, at)) return false;

  const { hours, minutes } = parseDailyAt(schedule.trigger.at);
  const todayAt = new Date(at);
  todayAt.setHours(hours, minutes, 0, 0);
  return at.getTime() >= todayAt.getTime();
}

export class SessionScheduleStore implements ScheduleStore {
  constructor(private readonly options: { scope: string; sessionId?: string }) {}

  private allSchedules() {
    return sessionScheduleState.get(this.options.scope) ?? [];
  }

  private writeAll(schedules: TaskSchedule[]) {
    if (schedules.length === 0) {
      sessionScheduleState.delete(this.options.scope);
      return;
    }
    sessionScheduleState.set(this.options.scope, schedules);
  }

  private visible(schedule: TaskSchedule) {
    return !this.options.sessionId || schedule.sessionId === this.options.sessionId;
  }

  async create(input: CreateScheduleInput) {
    if (!this.options.sessionId) {
      throw new Error("Session id is required to create a session schedule.");
    }
    validateTrigger(input.trigger);
    const timestamp = now();
    const schedule: TaskSchedule = {
      id: createScheduleId(),
      prompt: input.prompt,
      enabled: input.enabled ?? true,
      trigger: input.trigger,
      sessionId: this.options.sessionId,
      defaults: input.defaults,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const schedules = this.allSchedules();
    schedules.push(schedule);
    this.writeAll(schedules);
    return copySchedule(schedule);
  }

  async update(id: string, input: UpdateScheduleInput) {
    if (input.trigger) validateTrigger(input.trigger);
    const schedules = this.allSchedules();
    const index = schedules.findIndex((schedule) => schedule.id === id && this.visible(schedule));
    if (index === -1) throw new Error(`Schedule not found: ${id}`);
    const updated: TaskSchedule = {
      ...schedules[index],
      ...input,
      updatedAt: now()
    };
    schedules[index] = updated;
    this.writeAll(schedules);
    return copySchedule(updated);
  }

  async get(id: string) {
    const schedule = this.allSchedules().find((item) => item.id === id && this.visible(item));
    return schedule ? copySchedule(schedule) : undefined;
  }

  async list() {
    return this.allSchedules()
      .filter((schedule) => this.visible(schedule))
      .map(copySchedule);
  }

  async remove(id: string) {
    const schedules = this.allSchedules();
    const next = schedules.filter((schedule) => !(schedule.id === id && this.visible(schedule)));
    if (next.length === schedules.length) throw new Error(`Schedule not found: ${id}`);
    this.writeAll(next);
  }
}

export class CombinedScheduleStore implements ScheduleStore {
  constructor(private readonly stores: ScheduleStore[]) {}

  async create(input: CreateScheduleInput) {
    if (this.stores.length === 0) throw new Error("No schedule stores configured.");
    return await this.stores[0]!.create(input);
  }

  async update(id: string, input: UpdateScheduleInput) {
    for (const store of this.stores) {
      if (await store.get(id)) return await store.update(id, input);
    }
    throw new Error(`Schedule not found: ${id}`);
  }

  async get(id: string) {
    for (const store of this.stores) {
      const schedule = await store.get(id);
      if (schedule) return schedule;
    }
    return undefined;
  }

  async list() {
    const groups = await Promise.all(this.stores.map((store) => store.list()));
    return groups.flat();
  }

  async remove(id: string) {
    for (const store of this.stores) {
      if (await store.get(id)) {
        await store.remove(id);
        return;
      }
    }
    throw new Error(`Schedule not found: ${id}`);
  }
}
