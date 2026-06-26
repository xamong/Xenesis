import { relative } from "node:path";
import { createBuiltInTools } from "../../tools/index.js";
import type { ToolContext, ToolResult } from "../../tools/types.js";
import { readPlanSession } from "../../tools/planSessionStore.js";
import type { PlanSessionState } from "../../tools/planModeTools.js";
import type { OracleObservation } from "./GoldenReplay.js";

export interface ToolPlanModeReplayInput {
  savedPlan: string;
  inlinePlan: string;
  allowedPrompts: Array<{
    tool: "Bash";
    prompt: string;
  }>;
}

export interface ToolPlanModeReplayOptions {
  workspaceRoot: string;
  xenesisHome: string;
  input: ToolPlanModeReplayInput;
}

function context(options: Pick<ToolPlanModeReplayOptions, "workspaceRoot" | "xenesisHome">): ToolContext {
  return {
    workspaceRoot: options.workspaceRoot,
    xenesisHome: options.xenesisHome,
    cwd: options.workspaceRoot,
    sessionId: "plan-mode-oracle-session",
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
}

function dataRecord(result: ToolResult): Record<string, unknown> {
  return result.data && typeof result.data === "object" ? result.data as Record<string, unknown> : {};
}

function stringData(result: ToolResult, key: string): string {
  const value = dataRecord(result)[key];
  return typeof value === "string" ? value : "";
}

function booleanData(result: ToolResult, key: string): boolean {
  return dataRecord(result)[key] === true;
}

function contentIncludes(content: string, expected: string): string {
  return content.includes(expected) ? expected : "";
}

function pathSuffix(root: string, path: string): string {
  return relative(root, path).replace(/\\/gu, "/");
}

function arrayData<T>(result: ToolResult, key: string): T[] | undefined {
  const value = dataRecord(result)[key];
  return Array.isArray(value) ? value as T[] : undefined;
}

function projectPlanSession(session: PlanSessionState | undefined, root: string, mode: "plan" | "work") {
  if (!session) {
    throw new Error("Expected plan session state");
  }
  if (mode === "plan") {
    return {
      mode: session.mode,
      prePlanApprovalMode: session.prePlanApprovalMode,
      planFilePathSuffix: pathSuffix(root, session.planFilePath),
      hasEnteredAt: typeof session.enteredAt === "string"
    };
  }
  return {
    mode: session.mode,
    hasExitedAt: typeof session.exitedAt === "string",
    prePlanApprovalModeCleared: session.prePlanApprovalMode === undefined,
    ...(session.allowedPrompts ? { allowedPrompts: session.allowedPrompts } : {})
  };
}

export async function collectToolPlanModeObservation(
  options: ToolPlanModeReplayOptions
): Promise<OracleObservation> {
  const tools = createBuiltInTools();
  const enter = tools.get("planning_start");
  const exit = tools.get("planning_finish");
  if (!enter || !exit) {
    throw new Error("Expected built-in planning_start and planning_finish tools");
  }

  const toolContext = context(options);
  const exitBeforeEnter = await exit.run({}, toolContext);
  const entered = await enter.run({}, toolContext);
  const planSession = await readPlanSession(options.xenesisHome, toolContext.sessionId);
  const exitFromSavedPlan = await exit.run({ allowedPrompts: options.input.allowedPrompts }, toolContext);
  const savedPlanSession = await readPlanSession(options.xenesisHome, toolContext.sessionId);
  const reEnter = await enter.run({}, toolContext);
  const reEnteredSession = await readPlanSession(options.xenesisHome, toolContext.sessionId);
  const exitFromInlinePlan = await exit.run({ plan: options.input.inlinePlan }, toolContext);
  const inlinePlanSession = await readPlanSession(options.xenesisHome, toolContext.sessionId);

  return {
    ledgerEntries: [
      {
        type: "tool.plan_mode_lifecycle",
        exitBeforeEnter: {
          ok: exitBeforeEnter.ok,
          contentIncludes: contentIncludes(exitBeforeEnter.content, "You are not in plan mode")
        },
        enter: {
          ok: entered.ok,
          contentIncludes: [
            contentIncludes(entered.content, "Entered plan mode"),
            contentIncludes(entered.content, "In plan mode, do not write or edit workspace files")
          ],
          data: {
            messageIncludes: contentIncludes(stringData(entered, "message"), "Entered plan mode")
          },
          session: projectPlanSession(planSession, options.workspaceRoot, "plan")
        },
        exitFromSavedPlan: {
          ok: exitFromSavedPlan.ok,
          contentIncludes: [
            contentIncludes(exitFromSavedPlan.content, "User has approved your plan"),
            contentIncludes(exitFromSavedPlan.content, "## Approved Plan:"),
            contentIncludes(exitFromSavedPlan.content, options.input.savedPlan.trimEnd())
          ],
          data: {
            plan: stringData(exitFromSavedPlan, "plan"),
            isAgent: dataRecord(exitFromSavedPlan).isAgent === true,
            hasTaskTool: booleanData(exitFromSavedPlan, "hasTaskTool"),
            planWasEdited: booleanData(exitFromSavedPlan, "planWasEdited"),
            allowedPrompts: arrayData(exitFromSavedPlan, "allowedPrompts"),
            filePathSuffix: pathSuffix(options.workspaceRoot, stringData(exitFromSavedPlan, "filePath"))
          },
          session: projectPlanSession(savedPlanSession, options.workspaceRoot, "work")
        },
        reEnter: {
          ok: reEnter.ok,
          session: {
            mode: reEnteredSession?.mode,
            prePlanApprovalMode: reEnteredSession?.prePlanApprovalMode
          }
        },
        exitFromInlinePlan: {
          ok: exitFromInlinePlan.ok,
          data: {
            plan: stringData(exitFromInlinePlan, "plan"),
            planWasEdited: booleanData(exitFromInlinePlan, "planWasEdited"),
            filePathSuffix: pathSuffix(options.workspaceRoot, stringData(exitFromInlinePlan, "filePath"))
          },
          contentIncludes: [
            contentIncludes(exitFromInlinePlan.content, "User has approved your plan"),
            contentIncludes(exitFromInlinePlan.content, options.input.inlinePlan)
          ],
          session: projectPlanSession(inlinePlanSession, options.workspaceRoot, "work")
        }
      }
    ],
    finalStatus: "tool_plan_mode_lifecycle_oracle_ready",
    visibleResult: "plan mode tools persist read-only planning state, reject exit before entry, return approved saved or inline plans, preserve allowed prompts, and restore work mode"
  };
}
