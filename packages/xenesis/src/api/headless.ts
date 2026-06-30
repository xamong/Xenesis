import type { CliConfigOverrides } from '../config/index.js';
import {
  type AgentRunPipelineOptions,
  type AgentRunPipelineResult,
  runAgentPipeline,
} from '../core/AgentRunPipeline.js';
import type { AgentRunEvent } from '../core/events.js';
import { createRuntimeSurfaceObjectModel, type RuntimeSurfaceDescriptor } from '../core/runtime/index.js';
import type { IdeContextInput } from '../ide/index.js';
import type { JsonlSessionWriter } from '../sessions/index.js';

export type HeadlessRunPipeline = (options: AgentRunPipelineOptions) => Promise<AgentRunPipelineResult>;

export interface HeadlessPromptOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  prompt: string;
  configPath?: string;
  cli?: CliConfigOverrides;
  traceId?: string;
  ideContext?: IdeContextInput;
  abortSignal?: AbortSignal;
  runPipeline?: HeadlessRunPipeline;
}

export interface HeadlessPromptResult {
  exitCode: number;
  surface: RuntimeSurfaceDescriptor;
  events: AgentRunEvent[];
  output: string;
  errors: string;
}

export async function runHeadlessPrompt(options: HeadlessPromptOptions): Promise<HeadlessPromptResult> {
  const surface = createRuntimeSurfaceObjectModel({
    name: 'headless',
    outputMode: 'stream-json',
    interactive: false,
  });
  let sessionWriter: JsonlSessionWriter | undefined;
  const runPipeline = options.runPipeline ?? runAgentPipeline;

  try {
    const result = await runPipeline({
      cwd: options.cwd,
      configPath: options.configPath,
      env: options.env,
      cli: options.cli,
      prompt: options.prompt,
      traceId: options.traceId,
      ideContext: options.ideContext,
      abortSignal: options.abortSignal,
      stream: false,
      onSessionWriter: (writer) => {
        sessionWriter = writer;
      },
      onEvent: (event) => {
        surface.recordEvent(event);
      },
      onNotice: (line) => {
        surface.recordNotice(line);
      },
    });

    let snapshot = surface.snapshot();
    if (snapshot.events.length === 0 && result.events.length > 0) {
      surface.importEvents(result.events);
      snapshot = surface.snapshot();
    }

    return {
      exitCode: result.exitCode,
      surface: snapshot.surface,
      events: snapshot.events,
      output: snapshot.output,
      errors: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      await sessionWriter?.write({ type: 'error', message });
    } catch {
      // Keep the original runtime error visible even if writing the transcript fails.
    }
    return {
      exitCode: 1,
      surface: surface.surface,
      events: surface.snapshot().events,
      output: surface.snapshot().output,
      errors: `error: ${message}`,
    };
  }
}
