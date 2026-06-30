import { type AgentRunPipelineOptions, type AgentRunPipelineResult, runAgentPipeline } from './AgentRunPipeline.js';

export type { AgentRunMode } from './AgentRuntimeFactory.js';
export type AgentRunServiceOptions = AgentRunPipelineOptions;
export type AgentRunServiceResult = AgentRunPipelineResult;

export async function runAgentPrompt(options: AgentRunServiceOptions): Promise<AgentRunServiceResult> {
  return await runAgentPipeline(options);
}
