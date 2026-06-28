import { buildXenesisDeskControlPromptHint as buildXenesisDeskControlPromptHintFromShared } from '../../../../shared/xenesisDeskControlPromptHint';
import {
  approveXenesisDeskActions as approveXenesisDeskActionsFromCatalog,
  buildXenesisDeskActionCompletedMessage as buildXenesisDeskActionCompletedMessageFromCatalog,
  buildXenesisDeskActionPendingMessage as buildXenesisDeskActionPendingMessageFromCatalog,
  isXenesisDeskActionApprovalRequiredResult as isXenesisDeskActionApprovalRequiredResultFromCatalog,
  parseXenesisDeskActionBlocks as parseXenesisDeskActionBlocksFromCatalog,
  pendingXenesisDeskActionsFromResults as pendingXenesisDeskActionsFromResultsFromCatalog,
  shouldRunXenesisDeskActionsDirectly as shouldRunXenesisDeskActionsDirectlyFromCatalog,
  summarizeXenesisDeskActionExecution as summarizeXenesisDeskActionExecutionFromCatalog,
  XENESIS_DESK_ACTION_ACTIVITY_PHASES,
  XENESIS_DESK_ACTION_CALL_RESULT_KEYS,
  XENESIS_DESK_ACTION_EXECUTION_STATUS,
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  type XenesisDeskActionActivityPhase as XenesisDeskActionActivityPhaseCatalog,
  type XenesisDeskActionParseResult as XenesisDeskActionParseResultCatalog,
  type XenesisNaturalDeskActionRequest,
} from '../../../../shared/xenesisNaturalLanguageCatalog';
import {
  planXenesisDeskNaturalLanguageActions as planXenesisDeskNaturalLanguageActionsFromShared,
  type XenesisDeskNaturalLanguagePlan as XenesisDeskNaturalLanguagePlanFromShared,
} from '../../../../shared/xenesisNaturalLanguagePlanner';

export type XenesisDeskActionRequest = XenesisNaturalDeskActionRequest;

export type XenesisDeskActionParseResult = XenesisDeskActionParseResultCatalog;

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

export type XenesisDeskActionActivityPhase = XenesisDeskActionActivityPhaseCatalog;

export interface XenesisDeskActionActivity {
  phase: XenesisDeskActionActivityPhase;
  action: XenesisDeskActionRequest;
  result?: XenesisDeskActionExecutionResult;
  error?: string;
}

export interface XenesisDeskActionRunOptions {
  onActivity?: (activity: XenesisDeskActionActivity) => void;
}

export type XenesisDeskNaturalLanguagePlan = XenesisDeskNaturalLanguagePlanFromShared;

const DESK_ACTION_ACTIVITY_PHASES = XENESIS_DESK_ACTION_ACTIVITY_PHASES;
const DESK_ACTION_CALL_RESULT_KEYS = XENESIS_DESK_ACTION_CALL_RESULT_KEYS;
const DESK_ACTION_EXECUTION_STATUS = XENESIS_DESK_ACTION_EXECUTION_STATUS;
const DESK_ACTION_PROTOCOL_FORMAT = XENESIS_DESK_ACTION_PROTOCOL_FORMAT;
export function planXenesisDeskNaturalLanguageActions(text: string): XenesisDeskNaturalLanguagePlan {
  return planXenesisDeskNaturalLanguageActionsFromShared(text);
}

export function parseXenesisDeskActionBlocks(text: string): XenesisDeskActionParseResult {
  return parseXenesisDeskActionBlocksFromCatalog(text);
}

export function shouldRunXenesisDeskActionsDirectly(parsed: XenesisDeskActionParseResult): boolean {
  return shouldRunXenesisDeskActionsDirectlyFromCatalog(parsed);
}

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

export function isXenesisDeskActionApprovalRequiredResult(result: XenesisDeskActionExecutionResult): boolean {
  return isXenesisDeskActionApprovalRequiredResultFromCatalog(result);
}

export function pendingXenesisDeskActionsFromResults(
  actions: XenesisDeskActionRequest[],
  results: XenesisDeskActionExecutionResult[],
): XenesisDeskActionRequest[] {
  return pendingXenesisDeskActionsFromResultsFromCatalog(actions, results);
}

export function approveXenesisDeskActions(actions: XenesisDeskActionRequest[]): XenesisDeskActionRequest[] {
  return approveXenesisDeskActionsFromCatalog(actions);
}

export function buildXenesisDeskActionPendingMessage(
  actions: XenesisDeskActionRequest[],
  leadText: string = DESK_ACTION_PROTOCOL_FORMAT.emptyText,
): string {
  return buildXenesisDeskActionPendingMessageFromCatalog(actions, leadText);
}

export function buildXenesisDeskActionCompletedMessage(results: XenesisDeskActionExecutionResult[]): string {
  return buildXenesisDeskActionCompletedMessageFromCatalog(results);
}

export function summarizeXenesisDeskActionExecution(result: XenesisDeskActionExecutionResult): string {
  return summarizeXenesisDeskActionExecutionFromCatalog(result);
}

export function buildXenesisDeskControlPromptHint(): string {
  return buildXenesisDeskControlPromptHintFromShared();
}
