export {
  createXenisSystemMessage,
  createXenisWorkflowMetadata,
  defaultWorkflowHandlers as defaultGatewayWorkflows,
  listWorkflows as listGatewayWorkflows,
  summarizeWorkflow as summarizeGatewayWorkflow,
  workflowHandlers as gatewayWorkflowHandlers
} from "../workflows/index.js";
import {
  resolveWorkflow,
  type ResolveWorkflowOptions,
  type WorkflowHandler,
  type WorkflowSelection
} from "../workflows/index.js";

export async function resolveGatewayWorkflow(
  context: ResolveWorkflowOptions,
  customWorkflows: WorkflowHandler[] = []
): Promise<WorkflowSelection> {
  try {
    return await resolveWorkflow(context, customWorkflows);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const match = message.match(/^Unknown workflow: (.*)$/);
    if (match) throw new Error(`Unknown gateway workflow: ${match[1]}`);
    throw error;
  }
}

export type {
  WorkflowContext as GatewayWorkflowContext,
  WorkflowHandler as GatewayWorkflowHandler,
  WorkflowPipelineOverrides as GatewayWorkflowPipelineOverrides,
  WorkflowPrepareResult as GatewayWorkflowPrepareResult,
  WorkflowRequestBody as GatewayWorkflowBody,
  WorkflowSelection as GatewayWorkflowSelection,
  WorkflowStep as GatewayWorkflowStep,
  WorkflowStepInput as GatewayWorkflowStepInput,
  WorkflowStepRun as GatewayWorkflowStepRun,
  WorkflowSummary as GatewayWorkflowSummary
} from "../workflows/index.js";
