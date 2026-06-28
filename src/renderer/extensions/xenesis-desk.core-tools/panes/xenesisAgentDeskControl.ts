import {
  runXenesisDeskActions as runXenesisDeskActionsFromShared,
  type XenesisDeskActionActivity as XenesisDeskActionActivityFromShared,
  type XenesisDeskActionActivityPhase as XenesisDeskActionActivityPhaseFromShared,
  type XenesisDeskActionCallOptions as XenesisDeskActionCallOptionsFromShared,
  type XenesisDeskActionCallResult as XenesisDeskActionCallResultFromShared,
  type XenesisDeskActionExecutionResult as XenesisDeskActionExecutionResultFromShared,
  type XenesisDeskActionExecutor as XenesisDeskActionExecutorFromShared,
  type XenesisDeskActionRequest as XenesisDeskActionRequestFromShared,
  type XenesisDeskActionRunOptions as XenesisDeskActionRunOptionsFromShared,
} from '../../../../shared/xenesisDeskActionRunner';
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
  XENESIS_DESK_ACTION_PROTOCOL_FORMAT,
  type XenesisDeskActionParseResult as XenesisDeskActionParseResultCatalog,
} from '../../../../shared/xenesisNaturalLanguageCatalog';
import {
  planXenesisDeskNaturalLanguageActions as planXenesisDeskNaturalLanguageActionsFromShared,
  type XenesisDeskNaturalLanguagePlan as XenesisDeskNaturalLanguagePlanFromShared,
} from '../../../../shared/xenesisNaturalLanguagePlanner';

export type XenesisDeskActionParseResult = XenesisDeskActionParseResultCatalog;

export type XenesisDeskActionRequest = XenesisDeskActionRequestFromShared;
export type XenesisDeskActionCallOptions = XenesisDeskActionCallOptionsFromShared;
export type XenesisDeskActionCallResult = XenesisDeskActionCallResultFromShared;
export type XenesisDeskActionExecutionResult = XenesisDeskActionExecutionResultFromShared;
export type XenesisDeskActionExecutor = XenesisDeskActionExecutorFromShared;
export type XenesisDeskActionActivityPhase = XenesisDeskActionActivityPhaseFromShared;
export type XenesisDeskActionActivity = XenesisDeskActionActivityFromShared;
export type XenesisDeskActionRunOptions = XenesisDeskActionRunOptionsFromShared;

export type XenesisDeskNaturalLanguagePlan = XenesisDeskNaturalLanguagePlanFromShared;

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
  return runXenesisDeskActionsFromShared(actions, executor, options);
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
