import { join } from "node:path";
import { z } from "zod";
import {
  CombinedScheduleStore,
  SqliteScheduleStore,
  SessionScheduleStore,
  cronToHuman,
  nextCronRunDate,
  parseCronExpression,
  type TaskSchedule
} from "../orchestration/index.js";
import type { Tool, ToolContext } from "./types.js";

const maxCronJobs = 50;
const recurringMaxAgeDays = 7;

const cronCreateInputSchema = z.object({
  cron: z.string().min(1),
  prompt: z.string().min(1),
  recurring: z.boolean().optional(),
  durable: z.boolean().optional()
}).strict();

const cronCreateOpenAIInputSchema = z.object({
  cron: z.string().min(1),
  prompt: z.string().min(1),
  recurring: z.boolean().nullable().optional(),
  durable: z.boolean().nullable().optional()
}).strict();

const cronDeleteInputSchema = z.object({
  id: z.string().min(1)
}).strict();

const cronListInputSchema = z.object({}).strict();

type CronCreateInput = z.infer<typeof cronCreateInputSchema>;
type CronDeleteInput = z.infer<typeof cronDeleteInputSchema>;

interface CronCreateOutput {
  id: string;
  humanSchedule: string;
  recurring: boolean;
  durable: boolean;
}

interface CronDeleteOutput {
  id: string;
}

interface CronListJob {
  id: string;
  cron: string;
  humanSchedule: string;
  prompt: string;
  recurring?: boolean;
  durable?: boolean;
}

interface CronListOutput {
  jobs: CronListJob[];
}

function xenesisHomeFor(context: ToolContext) {
  return context.xenesisHome ?? join(context.workspaceRoot, ".xenesis");
}

function durableScheduleStore(context: ToolContext) {
  return new SqliteScheduleStore({ xenesisHome: xenesisHomeFor(context) });
}

function sessionScheduleStore(context: ToolContext) {
  return new SessionScheduleStore({ scope: xenesisHomeFor(context), sessionId: context.sessionId });
}

function visibleScheduleStore(context: ToolContext) {
  return new CombinedScheduleStore([
    durableScheduleStore(context),
    sessionScheduleStore(context)
  ]);
}

function createStoreFor(context: ToolContext, durable: boolean) {
  return durable ? durableScheduleStore(context) : sessionScheduleStore(context);
}

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

function cronCreateDescription() {
  return "Create a Xenesis agent schedule from a local-time 5-field cron expression. The schedule can run once in the current session, recur for a bounded period, or be saved in the durable Xenesis schedule store when the user asks for persistence.";
}

function cronCreatePrompt() {
  return [
    "Create a schedule entry that enqueues the supplied prompt when its cron trigger matches.",
    "",
    "## Cron format",
    "",
    'Use five local-time fields: minute hour day-of-month month day-of-week. For example, "0 9 * * *" means 9:00 AM in the user\'s local timezone.',
    "",
    "## Single-run reminders",
    "",
    "Use recurring: false when the user wants a reminder or task to happen only at the next matching time. Pin the calendar fields tightly enough that the next match is the intended date.",
    '  "today at 2:30pm, check the release" -> cron: "30 14 <today_dom> <today_month> *", recurring: false',
    '  "tomorrow morning, run smoke tests" -> choose a concrete morning minute/hour for tomorrow, recurring: false',
    "",
    "## Repeating schedules",
    "",
    "Use recurring: true, or omit it, when the user asks for repeated work. Examples: every five minutes -> \"*/5 * * * *\"; every hour near the top of the hour -> \"7 * * * *\"; weekdays at 9 AM -> \"0 9 * * 1-5\".",
    "",
    "## Spread flexible schedules",
    "",
    "When the user gives an approximate time, choose an off-minute instead of clustering everything at :00 or :30. Use exact :00 or :30 only when the wording clearly requires it, such as an exact meeting time or a half-hour boundary.",
    "",
    '  "around 9 every morning" can become "4 9 * * *" or "56 8 * * *".',
    '  "hourly" can become "7 * * * *" unless the user explicitly says "on the hour".',
    '  "in about an hour" should keep the natural minute instead of rounding.',
    "",
    "## Storage",
    "",
    "By default, durable is false. That keeps the job scoped to this Xenesis session, so it disappears when the process exits. Set durable: true only when the user clearly asks for a schedule that should survive restarts or continue long term.",
    "",
    "## Execution model",
    "",
    "Jobs fire only while the Xenesis scheduler is running and able to enqueue work. The scheduler applies deterministic spreading: recurring jobs may run up to 10% of the period late, capped at 15 minutes; one-time jobs on :00 or :30 can be pulled up to 90 seconds early.",
    "",
    `Recurring jobs are bounded to ${recurringMaxAgeDays} days. They can fire one final time when they expire, then Xenesis removes the schedule. Mention this ${recurringMaxAgeDays}-day bound when creating a recurring schedule.`,
    "",
    "The result includes an id that CronDelete can remove later."
  ].join("\n");
}

function cronDeletePrompt() {
  return "Remove a Xenesis cron schedule by the id returned from CronCreate.";
}

function cronListPrompt() {
  return "Show Xenesis cron schedules visible to the current session, including durable schedules.";
}

function invalidCronResult(cron: string) {
  return {
    ok: false,
    content: `Invalid cron expression '${cron}'. Expected 5 fields: M H DoM Mon DoW.`,
    data: {
      error: `Invalid cron expression '${cron}'. Expected 5 fields: M H DoM Mon DoW.`
    }
  };
}

function scheduleToJob(schedule: TaskSchedule): CronListJob | undefined {
  if (schedule.trigger.type !== "cron") return undefined;
  return {
    id: schedule.id,
    cron: schedule.trigger.cron,
    humanSchedule: cronToHuman(schedule.trigger.cron),
    prompt: schedule.prompt,
    ...(schedule.trigger.recurring !== false ? { recurring: true } : {}),
    durable: schedule.trigger.durable ?? true
  };
}

export const cronCreateTool: Tool<CronCreateInput, CronCreateOutput | { error: string }> = {
  name: "CronCreate",
  description: `${cronCreateDescription()}\n\n${cronCreatePrompt()}`,
  inputSchema: cronCreateInputSchema,
  openaiInputSchema: cronCreateOpenAIInputSchema,
  isReadOnly: () => false,
  async run(input, context) {
    if (!parseCronExpression(input.cron)) {
      return invalidCronResult(input.cron);
    }
    if (!nextCronRunDate(input.cron, new Date())) {
      return {
        ok: false,
        content: `Cron expression '${input.cron}' does not match any calendar date in the next year.`,
        data: {
          error: `Cron expression '${input.cron}' does not match any calendar date in the next year.`
        }
      };
    }

    const store = visibleScheduleStore(context);
    const schedules = await store.list();
    const cronSchedules = schedules.filter((schedule) => schedule.trigger.type === "cron");
    if (cronSchedules.length >= maxCronJobs) {
      return {
        ok: false,
        content: `Too many scheduled jobs (max ${maxCronJobs}). Cancel one first.`,
        data: {
          error: `Too many scheduled jobs (max ${maxCronJobs}). Cancel one first.`
        }
      };
    }

    const recurring = input.recurring ?? true;
    const durable = input.durable ?? false;
    const schedule = await createStoreFor(context, durable).create({
      prompt: input.prompt,
      trigger: {
        type: "cron",
        cron: input.cron,
        recurring,
        durable
      }
    });
    const output = {
      id: schedule.id,
      humanSchedule: cronToHuman(input.cron),
      recurring,
      durable
    };
    const where = durable
      ? "Saved in the durable Xenesis schedule store"
      : "Session-scoped schedule; it is not saved for restart";
    return {
      ok: true,
      content: recurring
        ? `Created recurring schedule ${output.id} (${output.humanSchedule}). ${where}. It expires after ${recurringMaxAgeDays} days unless CronDelete removes it earlier.`
        : `Created one-time schedule ${output.id} (${output.humanSchedule}). ${where}. It will enqueue once and then remove itself.`,
      data: output
    };
  }
};

export const cronDeleteTool: Tool<CronDeleteInput, CronDeleteOutput | { error: string }> = {
  name: "CronDelete",
  description: `Cancel a scheduled cron job by ID.\n\n${cronDeletePrompt()}`,
  inputSchema: cronDeleteInputSchema,
  isReadOnly: () => false,
  async run(input, context) {
    const store = visibleScheduleStore(context);
    const schedule = await store.get(input.id);
    if (!schedule || schedule.trigger.type !== "cron") {
      return {
        ok: false,
        content: `No scheduled job with id '${input.id}'`,
        data: { error: `No scheduled job with id '${input.id}'` }
      };
    }
    await store.remove(input.id);
    return {
      ok: true,
      content: `Removed scheduled job ${input.id}.`,
      data: { id: input.id }
    };
  }
};

export const cronListTool: Tool<Record<string, never>, CronListOutput> = {
  name: "CronList",
  description: `List scheduled cron jobs.\n\n${cronListPrompt()}`,
  inputSchema: cronListInputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(_input, context) {
    const jobs = (await visibleScheduleStore(context).list())
      .map(scheduleToJob)
      .filter((job): job is CronListJob => Boolean(job));

    return {
      ok: true,
      content: jobs.length > 0
        ? jobs.map((job) => (
          `${job.id} - ${job.humanSchedule}${job.recurring ? " (recurring)" : " (one-shot)"}${job.durable === false ? " [session-only]" : ""}: ${truncate(job.prompt, 80)}`
        )).join("\n")
        : "No scheduled jobs.",
      data: { jobs }
    };
  }
};
