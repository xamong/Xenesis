import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { type ApprovalMode, xenesisStatePath } from '../config/index.js';
import { readPlanSession, writePlanSession } from './planSessionStore.js';
import type { Tool, ToolContext } from './types.js';

const allowedPromptSchema = z.object({
  tool: z.enum(['Bash']),
  prompt: z.string().min(1),
});

const enterPlanModeInputSchema = z.object({});

const exitPlanModeInputSchema = z
  .object({
    allowedPrompts: z.array(allowedPromptSchema).nullable().optional(),
    plan: z.string().nullable().optional(),
    planFilePath: z.string().nullable().optional(),
  })
  .passthrough();

type EnterPlanModeInput = z.infer<typeof enterPlanModeInputSchema>;
type ExitPlanModeInput = z.infer<typeof exitPlanModeInputSchema>;
type AllowedPrompt = z.infer<typeof allowedPromptSchema>;

export interface PlanSessionState {
  mode: 'plan' | 'work';
  prePlanApprovalMode?: ApprovalMode;
  planFilePath: string;
  enteredAt?: string;
  exitedAt?: string;
  updatedAt: string;
  allowedPrompts?: AllowedPrompt[];
}

interface EnterPlanModeOutput {
  message: string;
}

interface ExitPlanModeOutput {
  plan: string | null;
  isAgent: boolean;
  filePath?: string;
  hasTaskTool?: boolean;
  planWasEdited?: boolean;
  allowedPrompts?: AllowedPrompt[];
}

function requireXenesisHome(context: ToolContext) {
  if (!context.xenesisHome) {
    throw new Error('Xenesis home is required for durable plan mode state.');
  }
  return context.xenesisHome;
}

function latestPlanPath(context: ToolContext) {
  return xenesisStatePath(requireXenesisHome(context), 'plans', 'latest.txt');
}

function now() {
  return new Date().toISOString();
}

function currentApprovalMode(context: ToolContext): ApprovalMode {
  const policy = context.toolExecutionPolicy;
  if (policy && typeof policy === 'object' && 'approvalMode' in policy) {
    const value = (policy as { approvalMode?: unknown }).approvalMode;
    if (value === 'readonly' || value === 'safe' || value === 'auto') return value;
  }
  const envValue = context.env?.XENESIS_APPROVAL_MODE;
  if (envValue === 'readonly' || envValue === 'safe' || envValue === 'auto') return envValue;
  return 'safe';
}

async function enterPlanMode(_input: EnterPlanModeInput, context: ToolContext) {
  const home = requireXenesisHome(context);
  const timestamp = now();
  const session: PlanSessionState = {
    mode: 'plan',
    prePlanApprovalMode: currentApprovalMode(context),
    planFilePath: latestPlanPath(context),
    enteredAt: timestamp,
    updatedAt: timestamp,
  };
  await writePlanSession(home, context.sessionId, session);

  const data: EnterPlanModeOutput = {
    message:
      'Entered plan mode. You should now focus on exploring the codebase and designing an implementation approach.',
  };
  return {
    ok: true,
    content: [
      data.message,
      '',
      'In plan mode, do not write or edit workspace files. Explore, reason about trade-offs, and use planning_finish when the plan is ready.',
    ].join('\n'),
    data,
  };
}

async function readPlanFromDisk(path: string) {
  try {
    return (await readFile(path, 'utf8')).trimEnd();
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

async function exitPlanMode(input: ExitPlanModeInput, context: ToolContext) {
  const home = requireXenesisHome(context);
  const current = await readPlanSession(home, context.sessionId);
  if (!current || current.mode !== 'plan') {
    return {
      ok: false,
      content:
        'You are not in plan mode. This tool is only for exiting plan mode after writing a plan. If your plan was already approved, continue with implementation.',
    };
  }

  const filePath = input.planFilePath || current.planFilePath || latestPlanPath(context);
  const inputPlan = typeof input.plan === 'string' ? input.plan.trimEnd() : undefined;
  const plan = inputPlan ?? (await readPlanFromDisk(filePath));
  const timestamp = now();
  const nextSession: PlanSessionState = {
    ...current,
    mode: 'work',
    prePlanApprovalMode: undefined,
    exitedAt: timestamp,
    updatedAt: timestamp,
    ...(input.allowedPrompts ? { allowedPrompts: input.allowedPrompts } : {}),
  };
  await writePlanSession(home, context.sessionId, nextSession);

  const data: ExitPlanModeOutput = {
    plan: plan.trim().length > 0 ? plan : null,
    isAgent: false,
    filePath,
    hasTaskTool: true,
    planWasEdited: inputPlan !== undefined,
    ...(input.allowedPrompts ? { allowedPrompts: input.allowedPrompts } : {}),
  };
  const planText = data.plan ? `\n\n## Approved Plan:\n${data.plan}` : '';
  return {
    ok: true,
    content: [
      'User has approved your plan. You can now start coding. Start with updating your todo list if applicable.',
      `Your plan has been saved to: ${filePath}${planText}`,
    ].join('\n\n'),
    data,
  };
}

export const enterPlanModeTool: Tool<EnterPlanModeInput, EnterPlanModeOutput> = {
  name: 'planning_start',
  aliases: ['enter_plan_mode'],
  description: 'Enter read-only plan mode before a non-trivial implementation task.',
  inputSchema: enterPlanModeInputSchema,
  openaiInputSchema: enterPlanModeInputSchema,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    try {
      return await enterPlanMode(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `planning_start failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export const exitPlanModeTool: Tool<ExitPlanModeInput, ExitPlanModeOutput> = {
  name: 'planning_finish',
  aliases: ['exit_plan_mode'],
  description: 'Present the saved plan for approval and restore work mode.',
  inputSchema: exitPlanModeInputSchema,
  openaiInputSchema: exitPlanModeInputSchema,
  isReadOnly: () => false,
  isConcurrencySafe: () => true,
  async run(input, context) {
    try {
      return await exitPlanMode(input, context);
    } catch (error) {
      return {
        ok: false,
        content: `planning_finish failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
