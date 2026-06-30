import type { WorkflowConfig, WorkflowStepConfig } from '../config/index.js';
import { defaultWorkflowHandlers } from './builtins.js';
import type {
  ResolveWorkflowOptions,
  WorkflowHandler,
  WorkflowPipelineOverrides,
  WorkflowSelection,
  WorkflowStep,
  WorkflowSummary,
} from './types.js';

export function normalizeWorkflowName(name: string) {
  return name.trim();
}

function assertWorkflowName(name: string, source: string) {
  const normalized = normalizeWorkflowName(name);
  if (!normalized) throw new Error(`${source} workflow name must be non-empty.`);
  if (!/^[A-Za-z0-9_.-]+$/.test(normalized)) {
    throw new Error(`${source} workflow name must contain only letters, numbers, '.', '_', or '-'.`);
  }
  return normalized;
}

function normalizeHandler(handler: WorkflowHandler, source: string): WorkflowHandler {
  return {
    ...handler,
    name: assertWorkflowName(handler.name, source),
  };
}

function normalizeStep(step: WorkflowStep, source: string, index: number): WorkflowStep {
  return {
    ...step,
    name: assertWorkflowName(step.name, `${source} step ${index + 1}`),
  };
}

function normalizeSteps(steps: WorkflowStep[] | undefined, source: string) {
  if (steps === undefined) return undefined;
  if (steps.length === 0) throw new Error(`${source} workflow steps must not be empty.`);
  return steps.map((step, index) => normalizeStep(step, source, index));
}

function pipelineMode(mode: WorkflowConfig['mode']): WorkflowPipelineOverrides['mode'] | undefined {
  if (mode === 'plan' || mode === 'work') return mode;
  return undefined;
}

function configuredPrompt(workflow: WorkflowConfig, prompt: string) {
  if (workflow.prompt !== undefined) return workflow.prompt;
  if (workflow.promptPrefix !== undefined || workflow.promptSuffix !== undefined) {
    return `${workflow.promptPrefix ?? ''}${prompt}${workflow.promptSuffix ?? ''}`;
  }
  return prompt;
}

function configuredPipeline(
  workflow: Pick<WorkflowConfig, 'mode' | 'guard' | 'systemMessage'>,
): WorkflowPipelineOverrides {
  const mode = pipelineMode(workflow.mode);
  return {
    ...(mode ? { mode } : {}),
    ...(workflow.guard ? { guard: workflow.guard } : {}),
    ...(workflow.systemMessage
      ? {
          systemMessages: [{ role: 'system', content: workflow.systemMessage }],
        }
      : {}),
  };
}

function configuredStep(step: WorkflowStepConfig): WorkflowStep {
  const mode = pipelineMode(step.mode);
  return {
    name: step.name,
    ...(step.description ? { description: step.description } : {}),
    ...(step.input ? { input: step.input } : {}),
    ...(step.prompt !== undefined ? { prompt: step.prompt } : {}),
    ...(step.promptPrefix !== undefined ? { promptPrefix: step.promptPrefix } : {}),
    ...(step.promptSuffix !== undefined ? { promptSuffix: step.promptSuffix } : {}),
    ...(mode ? { pipeline: { mode } } : {}),
    ...(step.metadata ? { metadata: step.metadata } : {}),
  };
}

export function configuredWorkflowHandlers(
  configuredWorkflows: Record<string, WorkflowConfig> = {},
): WorkflowHandler[] {
  return Object.entries(configuredWorkflows).map(([name, workflow]) => ({
    name,
    ...(workflow.description ? { description: workflow.description } : {}),
    ...(workflow.metadata ? { metadata: workflow.metadata } : {}),
    matches: ({ body }) => body.workflow === name,
    prepare: ({ body }) => ({
      prompt: configuredPrompt(workflow, body.prompt),
      pipeline: configuredPipeline(workflow),
      ...(workflow.steps ? { steps: workflow.steps.map(configuredStep) } : {}),
      ...(workflow.metadata ? { metadata: workflow.metadata } : {}),
    }),
  }));
}

export function workflowHandlers(customWorkflows: WorkflowHandler[] = []) {
  const custom = customWorkflows.map((handler, index) => normalizeHandler(handler, `custom workflow ${index + 1}`));
  const customNames = new Set(custom.map((handler) => handler.name));
  const defaults = defaultWorkflowHandlers()
    .map((handler) => normalizeHandler(handler, 'default workflow'))
    .filter((handler) => !customNames.has(handler.name));
  return [...custom, ...defaults];
}

function publicWorkflow(handler: WorkflowHandler, metadata?: Record<string, unknown>): WorkflowSummary {
  return {
    name: handler.name,
    ...(handler.description ? { description: handler.description } : {}),
    ...((metadata ?? handler.metadata) ? { metadata: metadata ?? handler.metadata } : {}),
  };
}

export function listWorkflows(customWorkflows: WorkflowHandler[] = []): WorkflowSummary[] {
  return workflowHandlers(customWorkflows).map((handler) => publicWorkflow(handler));
}

export function summarizeWorkflow(selection: WorkflowSelection): WorkflowSummary {
  return {
    name: selection.name,
    ...(selection.metadata ? { metadata: selection.metadata } : {}),
  };
}

async function firstMatchingWorkflow(context: ResolveWorkflowOptions, handlers: WorkflowHandler[]) {
  for (const handler of handlers) {
    if (await (handler.matches?.(context) ?? false)) return handler;
  }
  return undefined;
}

export async function resolveWorkflow(
  context: ResolveWorkflowOptions,
  customWorkflows: WorkflowHandler[] = [],
): Promise<WorkflowSelection> {
  const handlers = workflowHandlers(customWorkflows);
  const explicitWorkflow =
    typeof context.body.workflow === 'string' ? normalizeWorkflowName(context.body.workflow) : '';
  const handler = explicitWorkflow
    ? handlers.find((candidate) => candidate.name === explicitWorkflow)
    : await firstMatchingWorkflow(context, handlers);

  if (!handler) {
    throw new Error(`Unknown workflow: ${explicitWorkflow}`);
  }

  const prepared = (await handler.prepare?.(context)) ?? {};
  const steps = normalizeSteps(prepared.steps, handler.name);
  return {
    name: handler.name,
    ...(handler.description ? { description: handler.description } : {}),
    prompt: prepared.prompt ?? context.body.prompt,
    configPath: prepared.configPath ?? context.body.configPath,
    ideContext: prepared.ideContext ?? context.body.ideContext,
    pipeline: prepared.pipeline ?? {},
    ...(steps ? { steps } : {}),
    ...((prepared.metadata ?? handler.metadata) ? { metadata: prepared.metadata ?? handler.metadata } : {}),
  };
}
