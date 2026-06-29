import {
  isXenesisDeskActionApprovalRequiredResult,
  XENESIS_DESK_ACTION_ACTIVITY_PHASES,
  XENESIS_DESK_ACTION_CALL_RESULT_KEYS,
  XENESIS_DESK_ACTION_EXECUTION_STATUS,
  type XenesisDeskActionActivityPhase,
  type XenesisDeskActionRequest,
} from './xenesisDeskActionProtocol';

export type { XenesisDeskActionRequest };

export interface XenesisDeskActionCallOptions {
  approved?: boolean;
}

export interface XenesisDeskActionCallResult {
  ok?: boolean;
  path?: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export interface XenesisDeskActionExecutionResult {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  ok: boolean;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export type XenesisDeskActionExecutor = (
  path: string,
  args?: unknown,
  options?: XenesisDeskActionCallOptions,
) => Promise<XenesisDeskActionCallResult>;

export type { XenesisDeskActionActivityPhase };

export interface XenesisDeskActionActivity {
  phase: XenesisDeskActionActivityPhase;
  action: XenesisDeskActionRequest;
  result?: XenesisDeskActionExecutionResult;
  error?: string;
}

export interface XenesisDeskActionRunOptions {
  onActivity?: (activity: XenesisDeskActionActivity) => void;
}

const DESK_ACTION_ACTIVITY_PHASES = XENESIS_DESK_ACTION_ACTIVITY_PHASES;
const DESK_ACTION_CALL_RESULT_KEYS = XENESIS_DESK_ACTION_CALL_RESULT_KEYS;
const DESK_ACTION_EXECUTION_STATUS = XENESIS_DESK_ACTION_EXECUTION_STATUS;

export async function runXenesisDeskActions(
  actions: XenesisDeskActionRequest[],
  executor: XenesisDeskActionExecutor,
  options: XenesisDeskActionRunOptions = {},
): Promise<XenesisDeskActionExecutionResult[]> {
  const results: XenesisDeskActionExecutionResult[] = [];
  const reportActivity = (activity: XenesisDeskActionActivity): void => {
    try {
      options.onActivity?.(activity);
    } catch {
      // Activity reporting is observational and must not affect Desk action execution.
    }
  };

  for (const action of actions) {
    reportActivity({ phase: DESK_ACTION_ACTIVITY_PHASES.start, action });
    try {
      const callResult = await executor(action.path, action.args, { approved: action.approved });
      const callError = callResult[DESK_ACTION_CALL_RESULT_KEYS.error];
      const callApprovalRequired = callResult[DESK_ACTION_CALL_RESULT_KEYS.approvalRequired];
      const callPermission = callResult[DESK_ACTION_CALL_RESULT_KEYS.permission];
      const callApproval = callResult[DESK_ACTION_CALL_RESULT_KEYS.approval];
      const callSource = callResult[DESK_ACTION_CALL_RESULT_KEYS.source];
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: DESK_ACTION_EXECUTION_STATUS.isOk(callResult[DESK_ACTION_CALL_RESULT_KEYS.ok]),
        result: callResult[DESK_ACTION_CALL_RESULT_KEYS.result] ?? callResult,
        ...(callError ? { error: callError } : {}),
        ...(callApprovalRequired ? { approvalRequired: callApprovalRequired } : {}),
        ...(callPermission ? { permission: callPermission } : {}),
        ...(callApproval ? { approval: callApproval } : {}),
        ...(callSource ? { source: callSource } : {}),
      };
      results.push(result);
      reportActivity({
        phase: isXenesisDeskActionApprovalRequiredResult(result)
          ? DESK_ACTION_ACTIVITY_PHASES.approvalRequired
          : result.ok
            ? DESK_ACTION_ACTIVITY_PHASES.success
            : DESK_ACTION_ACTIVITY_PHASES.failure,
        action,
        result,
        ...(result[DESK_ACTION_CALL_RESULT_KEYS.error] ? { error: result[DESK_ACTION_CALL_RESULT_KEYS.error] } : {}),
      });
    } catch (error) {
      const result: XenesisDeskActionExecutionResult = {
        id: action.id,
        path: action.path,
        args: action.args,
        approved: action.approved,
        ok: DESK_ACTION_EXECUTION_STATUS.failed,
        error: error instanceof Error ? error.message : String(error),
      };
      results.push(result);
      reportActivity({
        phase: DESK_ACTION_ACTIVITY_PHASES.failure,
        action,
        result,
        error: result[DESK_ACTION_CALL_RESULT_KEYS.error],
      });
    }
  }
  return results;
}
