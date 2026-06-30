import type { AgentRunEvent } from '../core/events.js';
import { summarizeWorkflow } from './resolver.js';
import type {
  RunResolvedWorkflowOptions,
  WorkflowPipelineOverrides,
  WorkflowSelection,
  WorkflowStep,
  WorkflowStepRun,
  WorkflowSummary,
} from './types.js';

export function formatWorkflowStepPrompt(
  workflow: WorkflowSelection,
  step: WorkflowStep,
  previousContent: string | undefined,
) {
  if (step.prompt !== undefined) return step.prompt;
  const input = step.input === 'previous' ? (previousContent ?? workflow.prompt) : workflow.prompt;
  return `${step.promptPrefix ?? ''}${input}${step.promptSuffix ?? ''}`;
}

export function workflowStepPipeline(workflow: WorkflowSelection, step: WorkflowStep): WorkflowPipelineOverrides {
  return {
    ...workflow.pipeline,
    ...(step.pipeline ?? {}),
  };
}

function workflowStepSummary(step: WorkflowStep) {
  return {
    name: step.name,
    ...(step.description ? { description: step.description } : {}),
    ...(step.metadata ? { metadata: step.metadata } : {}),
  };
}

export function createWorkflowStepRun(
  workflow: WorkflowSummary,
  step: WorkflowStep,
  index: number,
  total: number,
): WorkflowStepRun {
  return {
    workflow,
    step: workflowStepSummary(step),
    index: index + 1,
    total,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
}

export function completeWorkflowStepRun(stepRun: WorkflowStepRun, result: { exitCode: number; sessionId: string }) {
  const endedAt = new Date().toISOString();
  stepRun.status = result.exitCode === 0 ? 'completed' : 'failed';
  stepRun.endedAt = endedAt;
  stepRun.durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(stepRun.startedAt));
  stepRun.sessionId = result.sessionId;
  stepRun.exitCode = result.exitCode;
}

export function failWorkflowStepRun(stepRun: WorkflowStepRun, error: unknown) {
  const endedAt = new Date().toISOString();
  stepRun.status = 'failed';
  stepRun.endedAt = endedAt;
  stepRun.durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(stepRun.startedAt));
  stepRun.error = error instanceof Error ? error.message : String(error);
}

export function singleWorkflowStep(workflow: WorkflowSelection): WorkflowStep {
  return {
    name: workflow.name,
    description: workflow.description,
    prompt: workflow.prompt,
    pipeline: workflow.pipeline,
    ...(workflow.metadata ? { metadata: workflow.metadata } : {}),
  };
}

export function workflowSteps(workflow: WorkflowSelection) {
  return workflow.steps ?? [singleWorkflowStep(workflow)];
}

export function isWorkflowClientEvent(event: AgentRunEvent) {
  return event.type !== 'context_source' && event.type !== 'run_stage' && event.type !== 'repair_decision';
}

export async function runResolvedWorkflow(options: RunResolvedWorkflowOptions) {
  let exitCode = 0;
  let previousContent: string | undefined;
  let sessionId: string | undefined;
  let doneContent: string | undefined;
  let turns = 0;
  const events: AgentRunEvent[] = [];
  const stdout: string[] = [];
  const workflowStepRuns: WorkflowStepRun[] = [];
  const steps = workflowSteps(options.workflow);
  const hasExplicitSteps = options.workflow.steps !== undefined;
  const workflowSummary = summarizeWorkflow(options.workflow);

  for (let index = 0; index < steps.length; index += 1) {
    if (options.abortSignal?.aborted) break;
    const step = steps[index];
    const prompt = formatWorkflowStepPrompt(options.workflow, step, previousContent);
    const beforeEventCount = events.length;
    const stepRun = createWorkflowStepRun(workflowSummary, step, index, steps.length);
    if (hasExplicitSteps) {
      workflowStepRuns.push(stepRun);
      if (options.includeStepOutput) stdout.push(`workflow step ${index + 1}/${steps.length}: ${step.name}`);
    }

    let result;
    try {
      result = await options.runPipeline({
        cwd: options.cwd,
        configPath: options.workflow.configPath ?? options.configPath,
        env: options.env,
        cli: options.cli,
        prompt,
        attachments: index === 0 ? options.attachments : undefined,
        abortSignal: options.abortSignal,
        stream: options.stream,
        ideContext: options.workflow.ideContext,
        traceId: options.traceId,
        sessionId: options.sessionId ?? sessionId,
        historyMessages: index === 0 ? options.historyMessages : undefined,
        ...workflowStepPipeline(options.workflow, step),
        applyConfiguredWorkflow: false,
        ...(hasExplicitSteps
          ? {
              workflowStep: {
                workflow: stepRun.workflow,
                step: stepRun.step,
                index: stepRun.index,
                total: stepRun.total,
                startedAt: stepRun.startedAt,
              },
            }
          : {}),
        onSessionWriter: (_writer, createdSessionId) => {
          sessionId = createdSessionId;
          void options.onSession?.(createdSessionId);
        },
        onEvent: async (event) => {
          if (!isWorkflowClientEvent(event)) return;
          events.push(event);
          await options.onEvent?.(event);
        },
        onNotice: async (line) => {
          stdout.push(line);
          await options.onNotice?.(line);
        },
        onMessages: index === 0 ? options.onMessages : undefined,
      });
    } catch (error) {
      if (hasExplicitSteps) failWorkflowStepRun(stepRun, error);
      throw error;
    }

    if (hasExplicitSteps) completeWorkflowStepRun(stepRun, result);
    if (events.length === beforeEventCount && result.events.length > 0) {
      const clientEvents = result.events.filter(isWorkflowClientEvent);
      events.push(...clientEvents);
      for (const event of clientEvents) {
        await options.onEvent?.(event);
      }
    }
    sessionId = result.sessionId;
    await options.onSession?.(result.sessionId);
    previousContent = result.doneContent ?? previousContent;
    doneContent = result.doneContent ?? doneContent;
    turns += result.turns;
    exitCode = result.exitCode;
    if (result.exitCode !== 0) break;
  }

  stdout.push(...events.map((event) => JSON.stringify(event)));
  return {
    exitCode,
    sessionId,
    traceId: options.traceId,
    events,
    ...(doneContent !== undefined ? { doneContent } : {}),
    turns,
    workflowSteps: workflowStepRuns,
    output: stdout.join('\n'),
  };
}
