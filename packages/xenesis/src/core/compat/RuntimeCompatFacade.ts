import {
  runAgentPrompt,
  type AgentRunServiceOptions,
  type AgentRunServiceResult
} from "../AgentRunService.js";

export type RuntimeCompatRunOptions = AgentRunServiceOptions;
export type RuntimeCompatRunResult = AgentRunServiceResult;

export interface RuntimeCompatFacadeOptions {
  runAgentPrompt?: (options: AgentRunServiceOptions) => Promise<AgentRunServiceResult>;
  runPipeline?: (options: AgentRunServiceOptions) => Promise<AgentRunServiceResult>;
}

export class RuntimeCompatFacade {
  private readonly runAgentPrompt: (options: AgentRunServiceOptions) => Promise<AgentRunServiceResult>;

  constructor(options: RuntimeCompatFacadeOptions = {}) {
    this.runAgentPrompt = options.runAgentPrompt ?? options.runPipeline ?? runAgentPrompt;
  }

  run(options: RuntimeCompatRunOptions): Promise<RuntimeCompatRunResult> {
    return this.runAgentPrompt(options);
  }
}

export function createRuntimeCompatFacade(options: RuntimeCompatFacadeOptions = {}) {
  return new RuntimeCompatFacade(options);
}
