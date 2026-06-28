import {
  isXenesisConnectionNaturalPlannedGoogleToolTarget,
  XENESIS_CONNECTION_NATURAL_CONNECTION_TARGETS,
  XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS,
  XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS,
  XENESIS_CONNECTION_NATURAL_PROVIDER_TARGETS,
} from './xenesisConnections';

export type XenesisNaturalConnectionTargetKind = 'tool' | 'messenger';

export interface XenesisNaturalWordsTarget {
  id: string;
  label: string;
  words: readonly string[];
}

export interface XenesisNaturalCoreToolTarget extends XenesisNaturalWordsTarget {
  path: string;
  reasonName: string;
}

export interface XenesisNaturalViewTarget extends XenesisNaturalWordsTarget {
  kind: string;
  reason: string;
}

export interface XenesisNaturalGuideTarget extends XenesisNaturalWordsTarget {
  requiredWordGroups?: readonly (readonly string[])[];
  blockedByMatchedTargetIds?: readonly string[];
  fallback?: boolean;
}

export interface XenesisNaturalConnectionTarget extends XenesisNaturalWordsTarget {
  kind: XenesisNaturalConnectionTargetKind;
  supportLevel?: 'implemented' | 'planned' | 'manual';
}

export function isXenesisNaturalConnectionToolTarget(target: Pick<XenesisNaturalConnectionTarget, 'kind'>): boolean {
  return target.kind === 'tool';
}

export function isXenesisNaturalConnectionMessengerTarget(
  target: Pick<XenesisNaturalConnectionTarget, 'kind'>,
): boolean {
  return target.kind === 'messenger';
}

export function isXenesisNaturalPlannedGoogleToolTarget(
  target: Pick<XenesisNaturalConnectionTarget, 'id' | 'kind'>,
): boolean {
  return isXenesisConnectionNaturalPlannedGoogleToolTarget(target);
}

export interface XenesisNaturalDeskActionDescriptor {
  id: string;
  path: string;
  reason: string;
}

export interface XenesisNaturalDeskActionTemplateDescriptor<TArgs extends unknown[]> {
  path: string;
  idFor: (...args: TArgs) => string;
  reasonFor: (...args: TArgs) => string;
}

export interface XenesisNaturalDeskActionRequest {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  reason?: string;
}

export interface XenesisDeskActionParseResult {
  visibleText: string;
  actions: XenesisNaturalDeskActionRequest[];
  errors: string[];
}

export interface XenesisNaturalLanguagePlan extends XenesisDeskActionParseResult {
  matched: boolean;
}

export interface XenesisDeskActionRecordNormalizeResult {
  action?: XenesisNaturalDeskActionRequest;
  error?: string;
}

export type XenesisNaturalConnectionTargetRuleScope = 'any' | 'tool' | 'messenger' | 'planned-google-tool';

export type XenesisNaturalConnectionTargetArgsKind =
  | 'targetId'
  | 'targetIdVisible'
  | 'tool'
  | 'channel'
  | 'channelVisible';

export interface XenesisNaturalConnectionTargetActionRule {
  targetScope: XenesisNaturalConnectionTargetRuleScope;
  contextWords: readonly string[];
  action: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  argsKind: XenesisNaturalConnectionTargetArgsKind;
  fallback?: boolean;
}

export type XenesisNaturalProviderArgsKind = 'provider' | 'providerVisible';

export interface XenesisNaturalProviderActionRule {
  contextWords: readonly string[];
  action: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  argsKind: XenesisNaturalProviderArgsKind;
  fallback?: boolean;
}

export interface XenesisNaturalGuideOpenRule {
  contextWords: readonly string[];
  action: XenesisNaturalDeskActionTemplateDescriptor<[string, string, boolean]>;
}

export interface XenesisNaturalGuideStatusRule {
  contextWords: readonly string[];
  action: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
}

export interface XenesisNaturalOnboardingCenterActionRule {
  contextWords: readonly string[];
  action: XenesisNaturalDeskActionDescriptor;
  argsKind: 'ensureVisible';
  targetRequired: false;
}

export interface XenesisNaturalOnboardingStepActionRule {
  contextWords: readonly string[];
  action: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  argsKind: 'targetId' | 'targetIdVisible';
  targetRequired: true;
}

export type XenesisNaturalOnboardingActionRule =
  | XenesisNaturalOnboardingCenterActionRule
  | XenesisNaturalOnboardingStepActionRule;

export interface XenesisNaturalContextRule {
  contextWords: readonly string[];
  requiredContextWordGroups?: readonly (readonly string[])[];
  blockedContextWords?: readonly string[];
}

export function xenesisNaturalTextHasAny(value: string, words: readonly string[]): boolean {
  return words.some((word) => value.includes(word));
}

export function matchesXenesisNaturalContextRule(value: string, rule: XenesisNaturalContextRule): boolean {
  if (rule.contextWords.length > 0 && !xenesisNaturalTextHasAny(value, rule.contextWords)) return false;
  if ((rule.requiredContextWordGroups ?? []).some((contextWords) => !xenesisNaturalTextHasAny(value, contextWords))) {
    return false;
  }
  if (rule.blockedContextWords && xenesisNaturalTextHasAny(value, rule.blockedContextWords)) return false;
  return true;
}

export function findXenesisNaturalContextRule<TRule extends XenesisNaturalContextRule>(
  value: string,
  rules: readonly TRule[],
): TRule | null {
  for (const rule of rules) {
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;
    return rule;
  }

  return null;
}

export function matchesXenesisNaturalContextRules(value: string, rules: readonly XenesisNaturalContextRule[]): boolean {
  return findXenesisNaturalContextRule(value, rules) !== null;
}

export interface XenesisNaturalCatalogActionRule extends XenesisNaturalContextRule {
  action: XenesisNaturalDeskActionDescriptor;
  fallback?: boolean;
  visibleText?: string;
}

export type XenesisNaturalConnectionAggregateStatusRuleStage = 'early' | 'late';

export type XenesisNaturalConnectionAggregateOpenRuleStage = 'guide' | 'late';

export type XenesisNaturalConnectionAggregateRuleMatchKind =
  | 'guideCatalog'
  | 'diagnosticsCatalog'
  | 'setupRequestCatalog'
  | 'onboarding'
  | 'guideContext'
  | 'connectionContext'
  | 'connectionCenterOpen';

export type XenesisNaturalConnectionAggregateMatchRules = Record<
  XenesisNaturalConnectionAggregateRuleMatchKind,
  readonly XenesisNaturalContextRule[]
>;

export interface XenesisNaturalConnectionAggregateStatusRule {
  stage: XenesisNaturalConnectionAggregateStatusRuleStage;
  matchKind: XenesisNaturalConnectionAggregateRuleMatchKind;
  action: XenesisNaturalDeskActionDescriptor;
}

export interface XenesisNaturalConnectionAggregateOpenRule {
  stage: XenesisNaturalConnectionAggregateOpenRuleStage;
  matchKind: XenesisNaturalConnectionAggregateRuleMatchKind;
  action: XenesisNaturalDeskActionDescriptor;
}

export const XENESIS_DESK_ACTION_PROTOCOL = {
  pathPrefix: 'xd.',
} as const;

export const XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS = {
  actions: 'actions',
  approved: 'approved',
  args: 'args',
  id: 'id',
  path: 'path',
  reason: 'reason',
} as const;

export const XENESIS_DESK_ACTION_PROTOCOL_PATTERNS = {
  approvalRequiredError: /requires approval|approval required/i,
  crPath: /\bxd\.[A-Za-z0-9.*{}.-]+/g,
  deskActionFence: /```xenesis-desk-actions?(?:[ \t]*\r?\n([\s\S]*?)^```[ \t]*$|[ \t]+([{[][^\r\n]*))/gim,
  trailingCrPathPunctuation: /[.,;:)]$/,
  visibleTextRepeatedBlankLines: /\n{3,}/g,
  visibleTextTrailingLineWhitespace: /[ \t]+\n/g,
  windowsPathSeparator: /\\/g,
} as const;

export const XENESIS_DESK_ACTION_PROTOCOL_FORMAT = {
  actionBullet: (path: string, reason = '') => `- ${path}${reason ? ` - ${reason}` : ''}`,
  blankLine: '',
  capabilityPathSeparator: '.',
  compactJsonMaxLength: 180,
  compactJsonOverflow: (json: string, maxLength: number) => `${json.slice(0, maxLength - 1)}...`,
  defaultActionId: (index: number) => `desk-action-${index + 1}`,
  emptyText: '',
  joinLines: (lines: readonly (string | undefined)[]) =>
    lines.filter((line): line is string => line !== undefined).join('\n'),
  lineBreak: '\n',
  listSeparator: ', ',
  paragraphBreak: '\n\n',
  pathSeparator: '/',
  resultBullet: (path: string, summary = '') => (summary ? `- ${path}: ${summary}` : `- ${path}`),
  sentenceTerminator: '.',
} as const;

export const XENESIS_DESK_ACTION_ACTIVITY_PHASES = {
  approvalRequired: 'approval-required',
  failure: 'failure',
  start: 'start',
  success: 'success',
} as const;

export type XenesisDeskActionActivityPhase =
  (typeof XENESIS_DESK_ACTION_ACTIVITY_PHASES)[keyof typeof XENESIS_DESK_ACTION_ACTIVITY_PHASES];

export const XENESIS_DESK_ACTION_APPROVAL_STATE = {
  approved: true,
  pending: false,
} as const;

export const XENESIS_DESK_ACTION_EXECUTION_STATUS = {
  failed: false,
  isOk: (ok: boolean | undefined) => ok !== false,
} as const;

export const XENESIS_DESK_ACTION_VALUE_TYPE_NAMES = {
  number: 'number',
  object: 'object',
  string: 'string',
} as const;

export type XenesisDeskActionValueTypeName =
  (typeof XENESIS_DESK_ACTION_VALUE_TYPE_NAMES)[keyof typeof XENESIS_DESK_ACTION_VALUE_TYPE_NAMES];

export function isXenesisDeskActionValueType(
  value: unknown,
  typeName: typeof XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string,
): value is string;
export function isXenesisDeskActionValueType(
  value: unknown,
  typeName: typeof XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.number,
): value is number;
export function isXenesisDeskActionValueType(
  value: unknown,
  typeName: typeof XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.object,
): value is object;
export function isXenesisDeskActionValueType(value: unknown, typeName: XenesisDeskActionValueTypeName): boolean {
  return typeof value === typeName;
}

export function isXenesisDeskActionRecordValue(value: unknown): value is Record<string, unknown> {
  return (
    isXenesisDeskActionValueType(value, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.object) &&
    value !== null &&
    !Array.isArray(value)
  );
}

export const XENESIS_DESK_ACTION_CALL_RESULT_KEYS = {
  approval: 'approval',
  approvalRequired: 'approvalRequired',
  error: 'error',
  ok: 'ok',
  permission: 'permission',
  result: 'result',
  source: 'source',
} as const;

export const XENESIS_DESK_ACTION_PROTOCOL_TEXT = {
  appliedHeader: 'Applied:',
  approvalRequiredBody:
    '아래 Desk 동작은 실행 전에 승인이 필요합니다. 계속하려면 `승인`이라고 입력하거나 승인 버튼을 눌러 주세요.',
  approvalRequiredHeader: 'Desk action approval required.',
  completedHeader: (failedCount: number) =>
    failedCount > 0 ? `Desk action completed with ${failedCount} issue(s).` : 'Desk action completed.',
  executionSummary: (ok: boolean, path: string) => `${ok ? 'Desk action applied' : 'Desk action failed'}: ${path}`,
  failureFallback: 'failed',
  invalidPathPrefix: (index: number, path: string, prefix: string) =>
    `Desk action ${index + 1} path must start with ${prefix}: ${path}`,
  jsonParseFailed: (message: string) => `Desk action JSON parse failed: ${message}`,
  missingPath: (index: number) => `Desk action ${index + 1} is missing path.`,
  mustBeJsonObject: (index: number) => `Desk action ${index + 1} must be a JSON object.`,
  needsAttentionHeader: 'Needs attention:',
  usefulDirectCrPaths: (paths: string) => `Useful direct CR paths include ${paths}.`,
} as const;

export function normalizeXenesisDeskActionRecord(
  value: unknown,
  index: number,
): XenesisDeskActionRecordNormalizeResult {
  if (!isXenesisDeskActionRecordValue(value)) {
    return { error: XENESIS_DESK_ACTION_PROTOCOL_TEXT.mustBeJsonObject(index) };
  }

  const record = value;
  const pathValue = record[XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.path];
  const path = isXenesisDeskActionValueType(pathValue, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string)
    ? pathValue.trim()
    : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  if (!path) return { error: XENESIS_DESK_ACTION_PROTOCOL_TEXT.missingPath(index) };
  if (!path.startsWith(XENESIS_DESK_ACTION_PROTOCOL.pathPrefix)) {
    return {
      error: XENESIS_DESK_ACTION_PROTOCOL_TEXT.invalidPathPrefix(index, path, XENESIS_DESK_ACTION_PROTOCOL.pathPrefix),
    };
  }

  const idValue = record[XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.id];
  const id =
    isXenesisDeskActionValueType(idValue, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string) && idValue.trim()
      ? idValue.trim()
      : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.defaultActionId(index);
  const reasonValue = record[XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.reason];
  const reason =
    isXenesisDeskActionValueType(reasonValue, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string) && reasonValue.trim()
      ? reasonValue.trim()
      : undefined;

  return {
    action: {
      id,
      path,
      args: Object.hasOwn(record, XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.args)
        ? record[XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.args]
        : {},
      approved: record[XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.approved] === true,
      ...(reason ? { reason } : {}),
    },
  };
}

export function xenesisDeskActionRecordsFromJson(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isXenesisDeskActionRecordValue(value)) {
    const actions = value[XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS.actions];
    if (Array.isArray(actions)) return actions;
  }
  return [value];
}

export function normalizeXenesisDeskActionVisibleText(value: string): string {
  return value
    .replace(
      XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.visibleTextTrailingLineWhitespace,
      XENESIS_DESK_ACTION_PROTOCOL_FORMAT.lineBreak,
    )
    .replace(
      XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.visibleTextRepeatedBlankLines,
      XENESIS_DESK_ACTION_PROTOCOL_FORMAT.paragraphBreak,
    )
    .trim();
}

export function parseXenesisDeskActionBlocks(text: string): XenesisDeskActionParseResult {
  const actions: XenesisNaturalDeskActionRequest[] = [];
  const errors: string[] = [];
  let actionIndex = 0;

  const sourceText = String(text || XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText);
  const visibleText = normalizeXenesisDeskActionVisibleText(
    sourceText.replace(
      XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.deskActionFence,
      (_block, blockJsonText: string, inlineJsonText?: string) => {
        const jsonText = blockJsonText || inlineJsonText || XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
        try {
          const parsed = JSON.parse(jsonText);
          for (const record of xenesisDeskActionRecordsFromJson(parsed)) {
            const normalized = normalizeXenesisDeskActionRecord(record, actionIndex);
            if (normalized.action) actions.push(normalized.action);
            if (normalized.error) errors.push(normalized.error);
            actionIndex += 1;
          }
        } catch (error) {
          errors.push(
            XENESIS_DESK_ACTION_PROTOCOL_TEXT.jsonParseFailed(error instanceof Error ? error.message : String(error)),
          );
        }
        return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
      },
    ),
  );

  if (actions.length === 0 && errors.length === 0 && visibleText) {
    try {
      const parsed = JSON.parse(visibleText);
      const rawRecords = xenesisDeskActionRecordsFromJson(parsed);
      const normalizedRecords = rawRecords.map((record, index) => normalizeXenesisDeskActionRecord(record, index));
      if (normalizedRecords.some((record) => record.action)) {
        return {
          visibleText: XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
          actions: normalizedRecords.flatMap((record) => (record.action ? [record.action] : [])),
          errors: normalizedRecords.flatMap((record) => (record.error ? [record.error] : [])),
        };
      }
    } catch {
      // Not a raw Desk action JSON payload. Keep it as ordinary chat text.
    }
  }

  return { visibleText, actions, errors };
}

export function shouldRunXenesisDeskActionsDirectly(parsed: Pick<XenesisDeskActionParseResult, 'actions'>): boolean {
  return parsed.actions.length > 0;
}

export const XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS = {
  captureActivePane: 'xd.capture.activePane',
  filesListOpen: 'xd.files.listOpen',
  windowSizePreset: 'xd.window.sizer.applyPreset',
  workflowRun: 'xd.automation.workflow.run',
} as const;

export const XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS = {
  boundsRecord: 'bounds',
  captureFile: ['filePath', 'path', 'outputPath'],
  captureNestedFile: ['filePath', 'path'],
  captureRecord: 'capture',
  dimensionHeight: ['height'],
  dimensionWidth: ['width'],
  fileList: ['openFiles', 'files', 'items', 'entries'],
  message: ['message'],
  readableTitle: ['title', 'name', 'filePath', 'path', 'uri'],
  rendererRecord: 'renderer',
  workflowCompleted: ['completed'],
  workflowFailed: ['failed'],
  workflowName: ['name'],
  workflowPassed: ['passed'],
  workflowSkipped: ['skipped'],
} as const;

export const XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT = {
  compactEmptyJson: ['{}', '[]'] as readonly string[],
  dimension: (width: number, height: number) => `${width}x${height}`,
  fileList: (fileCount: number, firstTitle: string) => {
    const suffix = fileCount === 1 ? '1 file' : `${fileCount} files`;
    return firstTitle ? `${suffix}, first: ${firstTitle}` : suffix;
  },
  joinParts: (parts: readonly string[]) => parts.filter(Boolean).join(' '),
  workflowFallbackName: 'workflow',
  workflowMetric: (value: number, label: string) => `${value} ${label}`,
  workflowMetricLabels: {
    completed: 'completed',
    failed: 'failed',
    passed: 'passed',
    skipped: 'skipped',
  },
  workflowSummary: (name: string, parts: readonly string[]) => (parts.length ? `${name}: ${parts.join(', ')}` : name),
} as const;

export interface XenesisDeskActionMessageActionInput {
  path: string;
  reason?: string;
}

export interface XenesisDeskActionResultMessageInput {
  id?: string;
  path: string;
  args?: unknown;
  approved?: boolean;
  ok: boolean;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: string;
  approval?: string;
  source?: string;
}

export interface XenesisDeskActionApprovalResultInput {
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
}

export function asXenesisDeskActionRecord(value: unknown): Record<string, unknown> {
  return isXenesisDeskActionRecordValue(value) ? value : {};
}

export function compactXenesisDeskActionJson(
  value: unknown,
  maxLength = XENESIS_DESK_ACTION_PROTOCOL_FORMAT.compactJsonMaxLength,
): string {
  try {
    const json = JSON.stringify(value);
    if (!json) return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
    return json.length > maxLength ? XENESIS_DESK_ACTION_PROTOCOL_FORMAT.compactJsonOverflow(json, maxLength) : json;
  } catch {
    return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  }
}

export function basenameXenesisDeskActionValue(value: unknown): string {
  const text = isXenesisDeskActionValueType(value, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string)
    ? value.trim()
    : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  if (!text) return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  const normalized = text.replace(
    XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.windowsPathSeparator,
    XENESIS_DESK_ACTION_PROTOCOL_FORMAT.pathSeparator,
  );
  return normalized.split(XENESIS_DESK_ACTION_PROTOCOL_FORMAT.pathSeparator).filter(Boolean).pop() || text;
}

export function arrayFromXenesisDeskActionRecord(record: Record<string, unknown>, keys: readonly string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

export function stringFromXenesisDeskActionRecord(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (isXenesisDeskActionValueType(value, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string) && value.trim()) {
      return value.trim();
    }
  }
  return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
}

export function numberFromXenesisDeskActionRecord(
  record: Record<string, unknown>,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isXenesisDeskActionValueType(value, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.number)) return value;
  }
  return undefined;
}

export function basenameFromXenesisDeskActionRecord(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = basenameXenesisDeskActionValue(record[key]);
    if (value) return value;
  }
  return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
}

export function firstReadableXenesisDeskActionTitle(value: unknown): string {
  if (isXenesisDeskActionValueType(value, XENESIS_DESK_ACTION_VALUE_TYPE_NAMES.string)) {
    return basenameXenesisDeskActionValue(value) || value;
  }
  const record = asXenesisDeskActionRecord(value);
  return basenameFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.readableTitle);
}

export function summarizeXenesisDeskActionFileList(record: Record<string, unknown>): string {
  const files = arrayFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.fileList);
  if (files.length === 0) return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  const title = firstReadableXenesisDeskActionTitle(files[0]);
  return XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.fileList(files.length, title);
}

export function summarizeXenesisDeskActionCaptureResult(record: Record<string, unknown>): string {
  const nested = asXenesisDeskActionRecord(record[XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.captureRecord]);
  const file =
    basenameFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.captureFile) ||
    basenameFromXenesisDeskActionRecord(nested, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.captureNestedFile);
  const width =
    numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth) ??
    numberFromXenesisDeskActionRecord(nested, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth);
  const height =
    numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight) ??
    numberFromXenesisDeskActionRecord(nested, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight);
  const size =
    width && height
      ? XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.dimension(width, height)
      : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  return XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.joinParts([file, size]);
}

export function summarizeXenesisDeskActionBoundsResult(record: Record<string, unknown>): string {
  const bounds = asXenesisDeskActionRecord(record[XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.boundsRecord]);
  const width =
    numberFromXenesisDeskActionRecord(bounds, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth) ??
    numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionWidth);
  const height =
    numberFromXenesisDeskActionRecord(bounds, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight) ??
    numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.dimensionHeight);
  if (!width || !height) return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  return XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.dimension(width, height);
}

export function summarizeXenesisDeskActionWorkflowResult(record: Record<string, unknown>): string {
  const name =
    stringFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.workflowName) ||
    XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowFallbackName;
  const completed = numberFromXenesisDeskActionRecord(
    record,
    XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.workflowCompleted,
  );
  const passed = numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.workflowPassed);
  const failed = numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.workflowFailed);
  const skipped = numberFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.workflowSkipped);
  const labels = XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetricLabels;
  const parts = [
    completed !== undefined
      ? XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(completed, labels.completed)
      : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
    passed !== undefined
      ? XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(passed, labels.passed)
      : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
    failed !== undefined
      ? XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(failed, labels.failed)
      : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
    skipped !== undefined
      ? XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowMetric(skipped, labels.skipped)
      : XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
  ].filter(Boolean);
  return XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.workflowSummary(name, parts);
}

export function summarizeXenesisDeskActionResult(
  result: Pick<XenesisDeskActionResultMessageInput, 'path' | 'result'>,
): string {
  const resultValue = result.result;
  const record = asXenesisDeskActionRecord(resultValue);
  if (result.path === XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS.filesListOpen) {
    return summarizeXenesisDeskActionFileList(record);
  }
  if (result.path === XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS.captureActivePane) {
    return summarizeXenesisDeskActionCaptureResult(record);
  }
  if (result.path === XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS.windowSizePreset) {
    return summarizeXenesisDeskActionBoundsResult(record);
  }
  if (result.path === XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS.workflowRun) {
    return summarizeXenesisDeskActionWorkflowResult(record);
  }

  const renderer = asXenesisDeskActionRecord(record[XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.rendererRecord]);
  const message =
    stringFromXenesisDeskActionRecord(record, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.message) ||
    stringFromXenesisDeskActionRecord(renderer, XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS.message);
  if (message) return message;

  const compact = compactXenesisDeskActionJson(resultValue);
  if (!compact || XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT.compactEmptyJson.includes(compact)) {
    return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText;
  }
  return compact;
}

export function describeXenesisDeskAction(action: XenesisDeskActionMessageActionInput): string {
  return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.actionBullet(action.path, action.reason);
}

export function buildXenesisDeskActionPendingMessage(
  actions: readonly XenesisDeskActionMessageActionInput[],
  leadText: string = XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
): string {
  return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.joinLines([
    leadText.trim(),
    leadText.trim() ? XENESIS_DESK_ACTION_PROTOCOL_FORMAT.blankLine : undefined,
    XENESIS_DESK_ACTION_PROTOCOL_TEXT.approvalRequiredHeader,
    XENESIS_DESK_ACTION_PROTOCOL_TEXT.approvalRequiredBody,
    XENESIS_DESK_ACTION_PROTOCOL_FORMAT.blankLine,
    ...actions.map(describeXenesisDeskAction),
  ]);
}

export function buildXenesisDeskActionCompletedMessage(
  results: readonly XenesisDeskActionResultMessageInput[],
): string {
  const failed = results.filter((result) => !result.ok);
  const successful = results.filter((result) => result.ok);
  const header = XENESIS_DESK_ACTION_PROTOCOL_TEXT.completedHeader(failed.length);
  const appliedLines = successful.map((result) => {
    const summary = summarizeXenesisDeskActionResult(result);
    return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.resultBullet(result.path, summary);
  });
  return XENESIS_DESK_ACTION_PROTOCOL_FORMAT.joinLines([
    header,
    ...(successful.length > 0
      ? [
          XENESIS_DESK_ACTION_PROTOCOL_FORMAT.blankLine,
          XENESIS_DESK_ACTION_PROTOCOL_TEXT.appliedHeader,
          ...appliedLines,
        ]
      : []),
    ...(failed.length > 0
      ? [
          XENESIS_DESK_ACTION_PROTOCOL_FORMAT.blankLine,
          XENESIS_DESK_ACTION_PROTOCOL_TEXT.needsAttentionHeader,
          ...failed.map((result) =>
            XENESIS_DESK_ACTION_PROTOCOL_FORMAT.resultBullet(
              result.path,
              result.error || XENESIS_DESK_ACTION_PROTOCOL_TEXT.failureFallback,
            ),
          ),
        ]
      : []),
  ]);
}

export function summarizeXenesisDeskActionExecution(
  result: Pick<XenesisDeskActionResultMessageInput, 'ok' | 'path'>,
): string {
  return XENESIS_DESK_ACTION_PROTOCOL_TEXT.executionSummary(result.ok, result.path);
}

export function xenesisDeskActionResultRecord(
  value: Pick<XenesisDeskActionApprovalResultInput, 'result'>,
): Record<string, unknown> {
  return asXenesisDeskActionRecord(value[XENESIS_DESK_ACTION_CALL_RESULT_KEYS.result]);
}

export function isXenesisDeskActionApprovalRequiredResult(result: XenesisDeskActionApprovalResultInput): boolean {
  const record = xenesisDeskActionResultRecord(result);
  return (
    result[XENESIS_DESK_ACTION_CALL_RESULT_KEYS.approvalRequired] === true ||
    record[XENESIS_DESK_ACTION_CALL_RESULT_KEYS.approvalRequired] === true ||
    (!result.ok &&
      XENESIS_DESK_ACTION_PROTOCOL_PATTERNS.approvalRequiredError.test(
        result[XENESIS_DESK_ACTION_CALL_RESULT_KEYS.error] || XENESIS_DESK_ACTION_PROTOCOL_FORMAT.emptyText,
      ))
  );
}

export function pendingXenesisDeskActionsFromResults(
  actions: readonly XenesisNaturalDeskActionRequest[],
  results: readonly XenesisDeskActionApprovalResultInput[],
): XenesisNaturalDeskActionRequest[] {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  return results
    .filter(isXenesisDeskActionApprovalRequiredResult)
    .map((result) => actionById.get(result.id))
    .filter((action): action is XenesisNaturalDeskActionRequest => Boolean(action))
    .map((action) => ({ ...action, approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending }));
}

export function approveXenesisDeskActions(
  actions: readonly XenesisNaturalDeskActionRequest[],
): XenesisNaturalDeskActionRequest[] {
  return actions.map((action) => ({ ...action, approved: XENESIS_DESK_ACTION_APPROVAL_STATE.approved }));
}

export const XENESIS_NATURAL_CORE_TOOL_OPEN_REASON = (reasonName: string): string =>
  `Open ${reasonName} from natural language request.`;

export const XENESIS_NATURAL_INTENT_PATTERNS = {
  explicitOpenEnglish: /\b(open|focus)\b/,
} as const;

export const XENESIS_NATURAL_PROVIDER_AUTO_TARGET = {
  id: 'auto',
  label: 'auto',
} as const;

export const XENESIS_NATURAL_EXTRACTION_PATTERNS = {
  filterQueryWords:
    /탐색기|파일|폴더|필터|검색|찾아|보여|표시|걸어줘|걸어|적용|에서|에|로|set|filter|search|find|explorer/gi,
  firstInteger: /\d+/,
  localUnixPath: /(?:\.{1,2}|~|\/)[^\s"'`]+/,
  localWindowsPath: /[a-z]:\\[^\s"'`]+(?:\s+[^\s"'`]+)*/i,
  normalizedWhitespace: /\s+/g,
  quotedText: /["'“”‘’`](.+?)["'“”‘’`]/g,
  terminalCommandPrefix: /^.*?(?:터미널에서|terminal\s+run|terminal에서|terminal)\s*/i,
  terminalCommandSuffix: /(?:실행해줘|실행해|실행|돌려줘|돌려|run|execute|start).*$/i,
  terminalCommandTrim: /^[\s:：-]+|[\s.。]+$/g,
  trailingPathPunctuation: /[.,;]+$/,
} as const;

export const XENESIS_NATURAL_TEXT_DEFAULTS = {
  empty: '',
  firstItemIndex: 0,
  unicodeNormalizationForm: 'NFKC',
  wordSeparator: ' ',
} as const;

export const XENESIS_NATURAL_NUMERIC_LIMITS = {
  dockSize: {
    max: 4096,
    min: 120,
  },
  firstInteger: {
    max: 100,
    min: 1,
  },
  terminalCount: {
    max: 50,
    min: 1,
  },
} as const;

export const XENESIS_NATURAL_PLAN_VISIBLE_TEXT = {
  activeDockClose: '현재 도킹 콘텐츠를 닫습니다.',
  activeDockFocus: '현재 도킹 콘텐츠에 포커스를 맞춥니다.',
  activeDockPaneArrange: '현재 도킹 패인을 정렬합니다.',
  activeDockPaneMerge: '현재 도킹 패인의 배열을 합칩니다.',
  activePaneCapture: '현재 패인을 캡처합니다.',
  agentSubmitRecorded: 'Xenesis Agent 메시지 제출 요청을 기록합니다.',
  appStatusRead: '앱 상태를 조회합니다.',
  artifactTargetSet: '현재 패인을 아티팩트 대상으로 지정합니다.',
  capabilityExplorerOpen: 'Capability Explorer를 엽니다.',
  captureListRead: '캡처 목록을 조회합니다.',
  connectionReviewRequestRecorded: 'Xenesis 연결 검토 요청을 기록합니다.',
  connectionStatusRead: 'Xenesis 연결 상태를 조회합니다.',
  connectionSurfaceOpen: 'Xenesis 연결 표면을 엽니다.',
  diagnosticsPaneOpen: '진단 패인을 엽니다.',
  dockAreaResize: '도킹 영역 크기를 변경합니다.',
  dockGroupHorizontal: '현재 도킹 그룹을 가로로 정렬합니다.',
  dockGroupTile: '현재 도킹 그룹을 바둑판으로 정렬합니다.',
  dockGroupVertical: '현재 도킹 그룹을 세로로 정렬합니다.',
  dockMerge: '도킹 배열을 합칩니다.',
  dockPanesListRead: '열린 패인 목록을 조회합니다.',
  explorerFilterApply: '탐색기 필터를 적용합니다.',
  explorerGoUp: '탐색기를 상위 폴더로 이동합니다.',
  explorerHide: '탐색기를 숨깁니다.',
  explorerNavigate: '탐색기 위치를 이동합니다.',
  explorerRefresh: '탐색기를 새로고침합니다.',
  explorerShow: '탐색기를 표시합니다.',
  explorerToggle: '탐색기 표시 상태를 전환합니다.',
  favoritesShow: '즐겨찾기 패널을 표시합니다.',
  fileContentRead: '파일 내용을 읽습니다.',
  fileOpen: '파일을 엽니다.',
  filesListRead: '열린 파일 목록을 조회합니다.',
  gatewayStatusOrOpen: 'Xenesis gateway 상태를 조회하거나 엽니다.',
  localCliMcpStatusRead: '로컬 CLI/MCP 상태를 조회합니다.',
  actionInboxListRead: 'Action Inbox 목록을 조회합니다.',
  multipleTerminalsOpenAndArrange: '터미널을 여러 개 열고 필요한 배열을 적용합니다.',
  profileInventoryRead: 'Xenesis 프로필 목록을 조회합니다.',
  requestedToolPanelOpen: '요청한 도구 패널을 엽니다.',
  requestedViewOpen: '요청한 화면을 엽니다.',
  runStartRecorded: 'Xenesis 런타임 실행 요청을 기록합니다.',
  runtimeControlRecorded: 'Xenesis 런타임 제어 요청을 기록합니다.',
  runtimeInventoryRead: 'Xenesis 런타임 인벤토리를 조회합니다.',
  scopedDeskAreaArrange: '지정한 Desk 영역을 정렬합니다.',
  scopedDockMerge: '지정한 Desk 영역의 도킹 배열을 합칩니다.',
  settingsPaneOpen: '설정 패인을 엽니다.',
  terminalCommandRun: '터미널 명령을 실행합니다.',
  terminalListRead: '터미널 목록을 조회합니다.',
  windowSizePreset: (presetId: string) => `창 크기를 ${presetId.toUpperCase()} 프리셋으로 변경합니다.`,
  workspaceSetRecorded: 'Xenesis 워크스페이스 설정 요청을 기록합니다.',
} as const;

export const XENESIS_NATURAL_EXPLICIT_OPEN_WORDS = ['열어', '켜줘', '띄워', '포커스', '집중'] as const;

export const XENESIS_NATURAL_ACTION_INTENT_WORDS = [
  '열어',
  '켜줘',
  '켜',
  '띄워',
  '보여',
  '표시',
  '실행',
  '돌려',
  '바꿔',
  '변경',
  '연결',
  '설치',
  '인증',
  '연동',
  '설정',
  '구성',
  '캡쳐',
  '캡처',
  '정렬',
  '합쳐',
  '닫아',
  '닫기',
  '취소',
  '중단',
  '초기화',
  '리셋',
  '이동',
  '선택',
  '필터',
  '찾아',
  '목록',
  '리스트',
  '스캔',
  '새로고침',
  '요청',
  '검토',
  '리뷰',
  '등록',
  '포커스',
  '집중',
  '폭',
  '너비',
  '크기',
  'open',
  'show',
  'display',
  'connect',
  'configure',
  'install',
  'authorize',
  'setup',
  'set up',
  'run',
  'execute',
  'start',
  'cancel',
  'stop',
  'reset',
  'clear',
  'capture',
  'screenshot',
  'arrange',
  'resize',
  'list',
  'scan',
  'select',
  'filter',
  'refresh',
  'request',
  'review',
  'approval',
  '확인',
  '상태',
  '진단',
  '라우팅',
  'focus',
  'close',
  'width',
  'height',
  'status',
  'diagnostic',
  'diagnostics',
  'routing',
  'terminal',
  'pane',
] as const;

export const XENESIS_NATURAL_GUIDE_CONTEXT_WORDS = [
  '가이드',
  'guide',
  'guides',
  '문서',
  'playbook',
  '플레이북',
] as const;

export const XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS = [
  '파일',
  'file',
  'manual file',
  '문서 파일',
  'repo-local',
  'repo local',
  '로컬 문서',
] as const;

export const XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS = [
  '온보딩',
  'onboarding',
  '초기 설정',
  '초기 셋팅',
  '초기 세팅',
  'initial setup',
  'setup checklist',
  '체크리스트',
  'checklist',
] as const;

export const XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS = [
  '상태',
  'status',
  '확인',
  'inspect',
  '진단',
  'diagnostic',
  'diagnostics',
  '라우팅',
  'routing',
  '안전',
  'safety',
] as const;

export const XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS = [
  '연결',
  'connection',
  'connections',
  'connection center',
  '도구',
  'tool',
  '메신저',
  'messenger',
  '채널',
  'channel',
  'oauth',
  '오어스',
] as const;

export const XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS = [
  'external tool',
  'external tools',
  'tool catalog',
  'tool catalogs',
  'tools catalog',
  '외부 툴',
  '외부 도구',
  '툴 전체',
  '도구 전체',
  '전체 툴',
  '전체 도구',
] as const;

export const XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS = [
  'external messenger',
  'external messengers',
  'messenger catalog',
  'messenger catalogs',
  'channel catalog',
  'channel catalogs',
  '외부 메신저',
  '외부 채널',
  '메신저 전체',
  '채널 전체',
  '전체 메신저',
  '전체 채널',
] as const;

export const XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS = [
  '전체',
  'all',
  'catalog',
  '카탈로그',
  '목록',
  'list',
] as const;

export const XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS = [
  '진단',
  'diagnostic',
  'diagnostics',
  'runbook',
  'runbooks',
  '런북',
] as const;

export const XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS = [
  'setup request',
  'setup requests',
  '설정 요청',
  '연결 요청',
  'setup 요청',
] as const;

export const XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS = ['요청', 'request', '등록', 'enqueue', '승인 요청'] as const;

export const XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS = [
  '연결해줘',
  '연결 해줘',
  '설정해줘',
  '설정 해줘',
  '구성해줘',
  '구성 해줘',
  '설치해줘',
  '설치 해줘',
  '인증해줘',
  '인증 해줘',
  '연동해줘',
  '연동 해줘',
  'connect',
  'configure',
  'install',
  'authorize',
  'set up',
  'setup',
] as const;

export const XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS = [
  '검토',
  '리뷰',
  'review',
  'approval',
  'setup',
  '설정',
  '연결',
] as const;

export const XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS = [
  'provider',
  '프로바이더',
  'mcp',
  '설치',
  'install',
  'oauth',
  '오어스',
  '정책',
  'policy',
  '프로필',
] as const;

export const XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS = ['프로필', 'profile', 'draft', 'drafts', '초안'] as const;

export const XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS = [
  'channel profile',
  'channel profiles',
  '채널 프로필',
] as const;

export const XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS = [
  '프로필',
  'profile',
  '채널',
  'channel',
  '메신저',
  'messenger',
  'bot',
  '봇',
] as const;

export const XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS = [
  'provider',
  '프로바이더',
  'ai provider',
  'ai 설정',
  '모델 provider',
  'provider profile',
] as const;

export const XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS = ['connector', 'connectors', '커넥터', '연결자'] as const;

export const XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS = ['mcp', 'mcp install', 'mcp 설치'] as const;

export const XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS = ['mcp', '설치', 'install', 'server', '서버'] as const;

export const XENESIS_NATURAL_DRAFT_CONTEXT_WORDS = ['draft', 'drafts', '초안', '설치 초안', '인증 초안'] as const;

export const XENESIS_NATURAL_OAUTH_CONTEXT_WORDS = ['oauth', '오어스', '인증', 'token', '토큰'] as const;

export const XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS = [
  ...XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
  ...XENESIS_NATURAL_DRAFT_CONTEXT_WORDS,
] as const;

export const XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS = ['view', 'views', '뷰', '화면', 'surface'] as const;

export const XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS = [
  '설치 계획',
  '설치계획',
  '설치 플랜',
  'install plan',
  'install plans',
  'install-plan',
] as const;

export const XENESIS_NATURAL_SETUP_CONTEXT_WORDS = [
  'setup',
  '초기 설정',
  '설정 상태',
  '설정',
  'settings',
  'config',
  'configuration',
  '구성',
] as const;

export const XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS = [
  ...XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
  ...XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
] as const;

export const XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS = [
  '액션',
  'action',
  '정책',
  'policy',
  '권한',
  'permission',
] as const;

export const XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS = [
  'user story',
  'user stories',
  '사용자 스토리',
  '스토리',
] as const;

export const XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS = ['라우팅', 'routing', 'route'] as const;

export const XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS = [
  '라우팅',
  'routing',
  'route',
  'fallback',
  '폴백',
] as const;

export const XENESIS_NATURAL_SAFETY_CONTEXT_WORDS = ['안전', 'safety', '가드레일', 'guardrail'] as const;

export const XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS = [
  '접근 그룹',
  '액세스 그룹',
  '액세스그룹',
  'access group',
  'access groups',
  'allowlist',
] as const;

export const XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS = ['페어링', 'pairing', 'pair', '연동'] as const;

export const XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS = [
  'view',
  'views',
  '뷰',
  '화면',
  '메신저',
  'setup',
  '초기 설정',
  '설정',
  'config',
  'configuration',
  '구성',
  'integration',
  '라우팅',
  'routing',
  'route',
  '안전',
  'safety',
  '가드레일',
  'guardrail',
  '접근 그룹',
  '액세스 그룹',
  '액세스그룹',
  'access group',
  'access groups',
  'allowlist',
  '프로필',
  'profile',
  'draft',
  '초안',
] as const;

export const XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS = [
  '메신저',
  'messenger',
  '채널',
  'channel',
  '설정',
  'view',
  '뷰',
  'setup',
  '초기 설정',
  'config',
  'configuration',
  '구성',
  '연결',
  'integration',
  '프로필',
  'profile',
  'draft',
  '초안',
  '접근 그룹',
  '액세스 그룹',
  '액세스그룹',
  'access group',
  'access groups',
  'allowlist',
] as const;

export const XENESIS_NATURAL_RUNTIME_READBACK_WORDS = [
  '상태',
  'status',
  '확인',
  'check',
  '보여',
  'show',
  '조회',
] as const;

export const XENESIS_NATURAL_OPEN_OR_SHOW_WORDS = ['열어', '켜줘', '띄워', 'open', 'show', '보여'] as const;

export const XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS = ['local cli', 'local-cli', '로컬 cli', '로컬cli'] as const;

export const XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS = [
  '스캔',
  'scan',
  '목록',
  'list',
  '상태',
  'status',
  '확인',
  'check',
  '보여',
  'show',
] as const;

export const XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS = ['mcp bridge', 'mcp 브리지', '브리지', 'bridge'] as const;

export const XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS = [
  'mcp settings',
  'mcp setting',
  'mcp 설정',
  'mcp config',
  'mcp 구성',
  'mcp',
] as const;

export const XENESIS_NATURAL_ACTION_INBOX_CONTEXT_WORDS = [
  'action inbox',
  'action-inbox',
  '액션 인박스',
  '액션인박스',
] as const;

export const XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS = ['gateway', '게이트웨이'] as const;

export const XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS = ['dashboard', '대시보드'] as const;

export const XENESIS_NATURAL_XENESIS_CONTEXT_WORDS = ['xenesis', '제네시스'] as const;

export const XENESIS_NATURAL_AGENT_CONTEXT_WORDS = ['agent', 'agents', '에이전트'] as const;

export const XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS = ['event', 'events', '이벤트', '로그', 'log'] as const;

export const XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS = [
  'connection center',
  'connection',
  'connections',
  '연결',
  'provider',
  'providers',
  '프로바이더',
  'tool',
  'tools',
  '툴',
  '도구',
  'mcp',
  'messenger',
  'messengers',
  '메신저',
  'channel',
  'channels',
  '채널',
  'onboarding',
  '온보딩',
  'checklist',
  '체크리스트',
  'guide',
  'guides',
  '가이드',
  'gateway',
  '게이트웨이',
  'profile',
  'profiles',
  '프로필',
  'agent',
  'agents',
  '에이전트',
  'report',
  'reports',
  '리포트',
  '보고서',
  'task',
  'tasks',
  '태스크',
  '작업',
] as const;

export const XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS = [
  'xenesis status',
  'xenesis 상태',
  '제네시스 status',
  '제네시스 상태',
  'xenesis runtime status',
  'xenesis runtime 상태',
  '제네시스 런타임 status',
  '제네시스 런타임 상태',
] as const;

export const XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS = ['runtime', '런타임'] as const;

export const XENESIS_NATURAL_REPORT_CONTEXT_WORDS = ['report', 'reports', '리포트', '보고서'] as const;

export const XENESIS_NATURAL_TASK_CONTEXT_WORDS = ['task', 'tasks', '태스크', '작업'] as const;

export const XENESIS_NATURAL_LIST_OR_SHOW_WORDS = ['목록', 'list', '보여', 'show'] as const;

export const XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS = [
  '운영 진단',
  'runtime diagnostics',
  'operational diagnostics',
  '진단',
  'diagnostics',
] as const;

export const XENESIS_NATURAL_PROFILE_CONTEXT_WORDS = ['profile', 'profiles', '프로필'] as const;

export const XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS = [
  '목록',
  'list',
  '보여',
  'show',
  '확인',
  'check',
  'active',
  '현재',
] as const;

export const XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS = [
  '보내',
  '전송',
  'submit',
  'send',
  'message',
  '메시지',
  '말해',
  'prompt',
  '프롬프트',
] as const;

export const XENESIS_NATURAL_RUN_CONTEXT_WORDS = ['run', 'runs', 'runtime', 'prompt', '프롬프트', '런'] as const;

export const XENESIS_NATURAL_RUN_START_CONTEXT_WORDS = ['실행', '돌려', 'start', 'run', 'execute'] as const;

export const XENESIS_NATURAL_CANCEL_CONTEXT_WORDS = ['취소', '중단', 'cancel', 'stop'] as const;

export const XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS = [
  'run',
  'runs',
  'runtime',
  '런',
  '실행',
  '요청',
  'request',
] as const;

export const XENESIS_NATURAL_SESSION_CONTEXT_WORDS = ['session', 'sessions', '세션', 'conversation', '대화'] as const;

export const XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS = ['초기화', '리셋', 'reset', 'clear'] as const;

export const XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS = ['workspace', '워크스페이스'] as const;

export const XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS = [
  '설정',
  '바꿔',
  '변경',
  'set',
  'change',
  'bind',
  'binding',
] as const;

export const XENESIS_NATURAL_GENERIC_OPEN_WORDS = ['열어', 'open'] as const;

export const XENESIS_NATURAL_OPEN_COMMAND_WORDS = ['열어', '켜줘', '띄워', 'open'] as const;

export const XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS = ['열어', '보여', 'open', 'show'] as const;

export const XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS = [
  '연결 센터',
  'connection center',
  'connections center',
  '연결 목록',
] as const;

export const XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS = ['설정', 'settings'] as const;

export const XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS = ['진단', 'diagnostics', '로그'] as const;

export const XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS = [
  'capability',
  'cr',
  'registry',
  '레지스트리',
  '기능 탐색',
  'capability explorer',
] as const;

export const XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS = ['캡쳐', '캡처', '스크린샷', 'screenshot', 'capture'] as const;

export const XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS = ['목록', '리스트', 'list'] as const;

export const XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS = ['포커스', '집중', 'focus'] as const;

export const XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS = ['닫아', '닫기', 'close'] as const;

export const XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS = ['패인', '탭', 'pane', 'tab', '현재'] as const;

export const XENESIS_NATURAL_RIGHT_SCOPE_WORDS = ['오른쪽', '우측', 'right'] as const;

export const XENESIS_NATURAL_OTHER_SCOPE_WORDS = ['나머지', '다른', 'others', 'other'] as const;

export const XENESIS_NATURAL_ALL_SCOPE_WORDS = ['모두', '전체', 'all'] as const;

export const XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS = [
  '패인',
  '영역',
  '폭',
  '너비',
  '사이즈',
  'pane',
  'area',
  'width',
  'size',
] as const;

export const XENESIS_NATURAL_RESIZE_COMMAND_WORDS = ['바꿔', '변경', '설정', '조절', 'resize', 'set'] as const;

export const XENESIS_NATURAL_WINDOW_SIZE_CONTEXT_WORDS = [
  '창 크기',
  'window size',
  'viewport',
  '해상도',
  '크기를',
] as const;

export const XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS = ['열린 파일', 'open files', '파일 목록', '파일 리스트'] as const;

export const XENESIS_NATURAL_FILE_CONTEXT_WORDS = ['파일', '문서'] as const;

export const XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS = ['읽어', 'read'] as const;

export const XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS = ['탐색기', 'explorer', '파일 트리'] as const;

export const XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS = ['숨겨', '닫아', 'hide'] as const;

export const XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS = ['토글', 'toggle'] as const;

export const XENESIS_NATURAL_REFRESH_CONTEXT_WORDS = ['새로고침', 'refresh'] as const;

export const XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS = ['상위', '부모', '위로', 'go up', 'parent'] as const;

export const XENESIS_NATURAL_FILTER_CONTEXT_WORDS = ['필터', '검색', '찾아', 'filter', 'search'] as const;

export const XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS = ['즐겨찾기', 'favorites', 'favorite'] as const;

export const XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS = ['터미널', 'terminal', 'shell', '콘솔'] as const;

export const XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS = ['개', '여러', 'multiple', '띄워', '열어', 'open'] as const;

export const XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS = ['정렬', 'arrange'] as const;

export const XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS = ['실행', '돌려', 'run', 'execute'] as const;

export const XENESIS_NATURAL_PANE_CONTEXT_WORDS = ['패인', 'pane'] as const;

export const XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS = ['바둑판', 'grid'] as const;

export const XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS = ['가로', '수평', 'horizontal'] as const;

export const XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS = ['세로', '수직', 'vertical'] as const;

export const XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS = ['합쳐', '되돌리', 'merge'] as const;

export const XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS = ['전체', '모든', 'all'] as const;

export const XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS = ['패인 목록', 'pane list', 'panes list', '열린 패인'] as const;

export const XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS = [
  '아티팩트 지정',
  'artifact target',
  '아티팩트 타겟',
] as const;

export const XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS = ['상태', 'status'] as const;

export const XENESIS_NATURAL_APP_STATUS_TARGET_WORDS = ['앱', 'desk', 'xenesis', '보여', '확인'] as const;

export const XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS = [
  '열어',
  '켜줘',
  '띄워',
  '보여',
  'open',
  'show',
  'start',
] as const;

export const XENESIS_NATURAL_ACTION_INTENT_RULES = [
  {
    contextWords: XENESIS_NATURAL_ACTION_INTENT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXPLICIT_OPEN_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_OPEN_COMMAND_RULES = [
  {
    contextWords: XENESIS_NATURAL_OPEN_COMMAND_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_OPEN_OR_SHOW_RULES = [
  {
    contextWords: XENESIS_NATURAL_OPEN_OR_SHOW_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_VIEW_OPEN_COMMAND_RULES = [
  {
    contextWords: XENESIS_NATURAL_VIEW_OPEN_COMMAND_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_GUIDE_FILE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_ONBOARDING_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_GUIDE_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS],
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_CONNECTION_DIAGNOSTICS_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
      XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS,
    ],
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS],
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_MESSENGER_PROFILE_DRAFT_CATALOG_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
      XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS,
    ],
  },
  {
    contextWords: XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
      XENESIS_NATURAL_CHANNEL_PROFILE_CONTEXT_WORDS,
    ],
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_CONNECTION_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

const XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS = [
  ...XENESIS_NATURAL_GENERIC_OPEN_WORDS,
  ...XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS,
] as const;

export const XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES = [
  {
    contextWords: XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS,
  },
  {
    contextWords: XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS,
  },
  {
    contextWords: XENESIS_NATURAL_REVIEW_REQUEST_INTENT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS],
    blockedContextWords: XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_REVIEW_REQUEST_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_CONNECTION_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_IMPERATIVE_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_REVIEW_REQUEST_TARGET_WORDS],
    blockedContextWords: XENESIS_NATURAL_REVIEW_REQUEST_BLOCKED_WORDS,
  },
] as const satisfies readonly XenesisNaturalContextRule[];

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES = {
  guideCatalog: XENESIS_NATURAL_GUIDE_CATALOG_CONTEXT_RULES,
  diagnosticsCatalog: XENESIS_NATURAL_CONNECTION_DIAGNOSTICS_CATALOG_CONTEXT_RULES,
  setupRequestCatalog: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CATALOG_CONTEXT_RULES,
  onboarding: XENESIS_NATURAL_ONBOARDING_CONTEXT_RULES,
  guideContext: [
    {
      contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
    },
  ],
  connectionContext: XENESIS_NATURAL_CONNECTION_CONTEXT_RULES,
  connectionCenterOpen: XENESIS_NATURAL_CONNECTION_CENTER_OPEN_CONTEXT_RULES,
} as const satisfies XenesisNaturalConnectionAggregateMatchRules;

export function hasXenesisNaturalExplicitOpenIntent(value: string): boolean {
  return (
    matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXPLICIT_OPEN_INTENT_RULES) ||
    XENESIS_NATURAL_INTENT_PATTERNS.explicitOpenEnglish.test(value)
  );
}

export function hasXenesisNaturalActionIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_ACTION_INTENT_RULES);
}

export function hasXenesisNaturalOnboardingContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_ONBOARDING_CONTEXT_RULES);
}

export function hasXenesisNaturalConnectionReadbackIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_CONNECTION_READBACK_INTENT_RULES);
}

export function hasXenesisNaturalExternalToolCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_RULES);
}

export function hasXenesisNaturalExternalMessengerCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_RULES);
}

export function hasXenesisNaturalAggregateCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_RULES);
}

export function hasXenesisNaturalMessengerProfileDraftCatalogContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_MESSENGER_PROFILE_DRAFT_CATALOG_CONTEXT_RULES);
}

export function hasXenesisNaturalConnectionReviewRequestIntent(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_CONNECTION_REVIEW_REQUEST_INTENT_RULES);
}

export function hasXenesisNaturalProviderProfileContext(value: string): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_PROVIDER_PROFILE_CONTEXT_RULES);
}

export const XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES = [
  'xd.xenesis.connections',
  'xd.xenesis.onboarding',
  'xd.xenesis.guides',
  'xd.xenesis.providers',
  'xd.xenesis.tools',
  'xd.xenesis.channels',
  'xd.xenesis.messengers',
  'xd.testing.connectionCenter',
] as const;

export const XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX =
  '- Connection Center CR paths discovered from Capability Registry: ';

export const XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES = [
  'Native Xenesis Desk Capability Registry control:',
  '- You are running inside Xenesis Desk. Use the native Capability Registry directly for Desk control; do not require external MCP, skills, or plugins for built-in Desk actions.',
  '- When a Desk action is needed, include a fenced JSON block using exactly ```xenesis-desk-action.',
  '- If the user asks you to open, focus, capture, arrange, resize, inspect, or test a Desk surface, you MUST return a `xenesis-desk-action` block for the requested Desk operation.',
  '- Each action must use an `xd.*` Capability Registry path and optional `args` object.',
  '- Use read-only actions first when inspecting state. Use approval-gated control actions only when the user clearly asked for the operation.',
  '- For ordered multi-step Desk control, prefer `xd.automation.workflow.preview` to validate the plan and `xd.automation.workflow.run` to execute the approved plan. Put ordered CR calls under `args.steps` instead of emitting many unrelated action blocks.',
  '- Do not refuse a requested Desk UI control action solely because the language runtime is read-only. Returning a `xenesis-desk-action` block is a request to Xenesis Desk; the Capability Registry will enforce permissions, approvals, and failures after your response.',
  '- Returning a `xenesis-desk-action` block is not executing code, running shell commands, or editing files. The file/process sandbox does not apply to a Desk action request; Xenesis Desk validates and executes the request through the Capability Registry after the model response.',
  '- If a requested Desk action is reasonable but may need approval, include the action block with `approved:true` only when the user already gave clear approval in the conversation. Otherwise explain the needed approval and omit `approved:true`. This applies to `xd.automation.workflow.run` as well.',
  '- Keep the normal user-facing answer outside the action block. The action block is for Xenesis Desk to execute internally.',
  '- Prefer `xd.views.open` for opening built-in surfaces. Use `kind:"gowoori"` for the artifact viewer, `kind:"gowooriChat"` only when the user explicitly asks for GowooriChat or Xenesis Agent needs a fallback, `kind:"terminal"` for terminals, and `kind:"xenesisAgent"` for Xenesis Agent.',
  '- Use `placement:"tab"`, `"right"`, `"left"`, `"top"`, or `"bottom"` when opening views. If a specific pane is known, pass `targetPaneId`.',
  '- Use `xd.window.sizer.applyPreset` with `args.presetId`, for example `{"presetId":"qhd"}`.',
  '- Use `xd.dock.artifactTarget.set` with `args.paneId` after opening a Gowoori pane that should receive artifacts.',
  '- Use Connection Center CR paths from the Capability Registry to inspect readiness, focus provider/tool/messenger cards, open diagnostics and setup requests, follow onboarding steps, and open repo-local guides.',
  '- Use provider setup, routing, view, and profile-draft CR paths from the Capability Registry before changing provider-related Desk state.',
  '- Use `xd.localCli.scan`, `xd.mcp.settings.status`, and `xd.mcp.bridge.status` to inspect local CLI discovery and MCP setup or bridge readiness before suggesting installs, config writes, gateway starts, or local CLI switching.',
  '- Use `xd.xenesis.gateway.status` to inspect runtime gateway readiness and `xd.xenesis.gateway.openDashboard` to open the Desk gateway dashboard; do not start, stop, or restart the gateway unless the user clearly asks and approval policy is satisfied.',
  '- Use `xd.xenesis.workspace.set` only when the user clearly asks to bind the Xenesis workspace to a specific local path; leave approval handling to the Capability Registry, especially for outside-workspace paths.',
  '- Use `xd.xenesis.status` to inspect gateway, workspace, and active-run status before starting runs, changing workspaces, or troubleshooting runtime setup.',
  '- Use `xd.xenesis.diagnostics`, `xd.xenesis.reports.list`, `xd.xenesis.tasks.list`, `xd.xenesis.agents.list`, `xd.xenesis.agents.status`, `xd.xenesis.agents.events`, and `xd.xenesis.agents.submit` to inspect runtime diagnostics, verification reports, task inventory, registered Agent panes, quoted Agent pane status/events, or submit a quoted Agent pane message before mutating broader runtime state. Agent status/events require `args.agentId`; Agent submit requires `args.agentId` and `args.text`.',
  '- Use `xd.xenesis.profiles.list` to inspect installed and active Xenesis profiles before installing profiles, switching the active profile, updating channel settings, or sending profile channel test messages.',
  '- Use `xd.xenesis.runs.start` only when the user clearly asks to run a quoted prompt through the Xenesis runtime. Use `xd.xenesis.runs.cancel` only for explicit user requests to cancel the active Xenesis runtime request, and `xd.xenesis.sessions.reset` only for explicit user requests to reset the active Xenesis conversation/session.',
  '- Use external tool setup, connector, view, user-story, install-plan, MCP install draft, OAuth draft, and action-policy CR paths from the Capability Registry to inspect, open, or request review of internal Desk tool readiness surfaces. Tool install plans are review-only and do not execute installs, write MCP config, complete OAuth, store tokens, execute provider tools, mutate settings, or mutate external systems.',
  '- Use tool MCP install draft CR paths from the Capability Registry to inspect templates, focus owning cards, or record local Action Inbox review items without writing MCP config, running shell commands, completing OAuth, storing tokens, executing provider tools, or mutating settings.',
  '- Use tool OAuth draft CR paths from the Capability Registry to inspect Google OAuth app and token-store drafts, focus owning cards, or record local Action Inbox review items. Tool OAuth drafts are review-only and do not complete OAuth, store tokens, write MCP config, execute provider tools, send email, mutate documents, or mutate calendar events.',
  '- Use external tool action-policy CR paths from the Capability Registry to inspect review-only action catalogs, focus owning cards, or record local Action Inbox review items. Tool action catalogs are review-only and do not execute provider tools or mutate external systems.',
  '- Use provider profile-draft CR paths from the Capability Registry to inspect field drafts, focus provider draft cards, or record local Action Inbox review items. Provider profile drafts are review-only and do not mutate provider settings, store credentials, switch local CLI selection, or run provider prompts.',
  '- Use external messenger routing, safety, access-group, pairing, view, user-story, and profile-draft CR paths from the Capability Registry before testing or changing external messenger setup.',
  '- Channel profile drafts are review-only and do not mutate channel settings, update allowlists, write profiles, send test messages, start the gateway, store secrets, or bypass approvals.',
  '- Use `xd.testing.connectionCenter.snapshot`, `xd.testing.xenesisAgent.snapshot`, and `xd.testing.xenesisAgent.submitPrompt` only for development smoke verification of live Desk surfaces.',
  '- For dashboard or XCON/SKETCH artifact generation, Xenesis Agent should own generation through `/artifact`; Gowoori is the render target and GowooriChat is fallback only.',
] as const;

export const XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES = [
  '- Common natural Desk requests map to Capability Registry paths before the LLM run when they are clear commands: settings `xd.panes.settings.open`, files `xd.files.listOpen`, `xd.files.open`, `xd.files.read`, explorer `xd.explorer.local.show`, `xd.explorer.local.navigate`, `xd.explorer.local.setFilter`, capture `xd.capture.activePane`, terminals `xd.terminals.list`, `xd.terminals.run`, `xd.terminals.runMany`, layout `xd.dock.window.arrange`, `xd.dock.pane.arrange`, `xd.dock.arrangeHorizontal`, `xd.dock.arrangeVertical`, `xd.dock.arrangeGrid`, `xd.dock.mergeGroup`, `xd.dock.mergeAll`, pane focus/close `xd.dock.focus`, `xd.dock.close`, sizing `xd.dock.sizes.current`, `xd.dock.sizes.set`, panes `xd.dock.panes.list`, tools `xd.tools.core.capabilityExplorer.open`, `xd.tools.core.networkMonitor.open`, and other `xd.tools.core.*.open` surfaces.',
  '- If the user asks in natural language for a supported local Desk operation, prefer the exact CR path rather than explaining how to do it manually.',
  '',
  'Open a right-side terminal example:',
  '```xenesis-desk-action',
  '{"path":"xd.views.open","args":{"kind":"terminal","placement":"right","command":"Write-Output \\"ready\\"","shell":"powershell"},"reason":"Open a terminal beside the current work."}',
  '```',
  '',
  'Prepare a Xenesis-led artifact workspace example:',
  '```xenesis-desk-action',
  '[',
  '  {"path":"xd.window.sizer.applyPreset","args":{"presetId":"qhd"},"approved":true,"reason":"Use a large test viewport."},',
  '  {"path":"xd.views.open","args":{"kind":"gowoori","placement":"tab"},"approved":true,"reason":"Open Gowoori as the artifact surface."},',
  '  {"path":"xd.dock.artifactTarget.set","args":{"useActive":true},"approved":true,"reason":"Use the active Gowoori pane as the artifact target."},',
  '  {"path":"xd.views.open","args":{"kind":"xenesisAgent","placement":"right"},"approved":true,"reason":"Keep Xenesis Agent in the right dock as the control surface."}',
  ']',
  '```',
  '',
  'Open and focus a Xenesis Agent connection card example:',
  '```xenesis-desk-action',
  '{"path":"xd.xenesis.connections.open","args":{"id":"notion","ensureVisible":true},"approved":true,"reason":"Open Settings > Xenesis Agent > Connections and focus Notion."}',
  '```',
  '',
  'Approved multi-step workflow example:',
  '```xenesis-desk-action',
  '{"path":"xd.automation.workflow.run","approved":true,"args":{"name":"settings-tour","steps":[{"path":"xd.dock.panes.list"},{"path":"xd.panes.settings.open","args":{"category":"run-model","mode":"hermes","section":"hermes-provider"}}]}}',
  '```',
  '',
] as const;

export const XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL = 'powershell';

export const XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND = 'Write-Host Xenesis-Desk-terminal';

export const XENESIS_NATURAL_TERMINAL_ID_PREFIX = 'xenesis-agent-natural';

export const XENESIS_NATURAL_PLACEMENT_TARGETS = [
  { id: 'right', label: 'right', words: ['오른쪽', '우측', 'right'] },
  { id: 'left', label: 'left', words: ['왼쪽', '좌측', 'left'] },
  { id: 'top', label: 'top', words: ['상단', '위쪽', '위에', 'top'] },
  { id: 'bottom', label: 'bottom', words: ['하단', '아래쪽', '아래에', 'bottom'] },
  { id: 'tab', label: 'tab', words: ['탭', '중앙', '문서 영역', 'document', 'tab', 'center'] },
] as const satisfies readonly XenesisNaturalWordsTarget[];

export type XenesisNaturalPlacementId = (typeof XENESIS_NATURAL_PLACEMENT_TARGETS)[number]['id'];

export const XENESIS_NATURAL_DOCK_SIDE_TARGETS = [
  { id: 'right', label: 'right', words: ['오른쪽', '우측', 'right'] },
  { id: 'left', label: 'left', words: ['왼쪽', '좌측', 'left'] },
  { id: 'top', label: 'top', words: ['상단', '위쪽', '위에', 'top'] },
  { id: 'bottom', label: 'bottom', words: ['하단', '아래쪽', '아래에', 'bottom'] },
] as const satisfies readonly XenesisNaturalWordsTarget[];

export type XenesisNaturalDockSideId = (typeof XENESIS_NATURAL_DOCK_SIDE_TARGETS)[number]['id'];

export const XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS = [
  { id: 'document', label: 'document', words: ['문서 영역', '문서영역', 'document', 'center', '중앙'] },
  { id: 'right', label: 'right', words: ['오른쪽 영역', '우측 영역', 'right area'] },
  { id: 'left', label: 'left', words: ['왼쪽 영역', '좌측 영역', 'left area'] },
  { id: 'top', label: 'top', words: ['상단 영역', '위쪽 영역', 'top area'] },
  { id: 'bottom', label: 'bottom', words: ['하단 영역', '아래쪽 영역', 'bottom area'] },
] as const satisfies readonly XenesisNaturalWordsTarget[];

export type XenesisNaturalDockWindowStateId = (typeof XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS)[number]['id'];

export const XENESIS_NATURAL_ARRANGE_MODE_TARGETS = [
  { id: 'grid', label: 'grid', words: ['바둑판', '타일', 'grid', 'tile'] },
  { id: 'column', label: 'column', words: ['세로', '수직', 'vertical', 'column'] },
  { id: 'row', label: 'row', words: ['가로', '수평', 'horizontal', 'row'] },
] as const satisfies readonly XenesisNaturalWordsTarget[];

export type XenesisNaturalArrangeModeId = (typeof XENESIS_NATURAL_ARRANGE_MODE_TARGETS)[number]['id'];

export const XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  { id: 'uhd', label: 'uhd', words: ['uhd', '3840', '2160', '4k'] },
  { id: 'qhd', label: 'qhd', words: ['qhd', '2560', '1440'] },
  { id: 'fhd', label: 'fhd', words: ['fhd', '1920', '1080'] },
  { id: 'hd', label: 'hd', words: ['hd', '1280', '720'] },
] as const;

export const XENESIS_NATURAL_CORE_TOOL_TARGETS: readonly XenesisNaturalCoreToolTarget[] = [
  {
    id: 'natural-tool-capability-explorer-open',
    path: 'xd.tools.core.capabilityExplorer.open',
    label: 'Capability Explorer',
    reasonName: 'Capability Explorer',
    words: ['capability', 'cr', 'registry', '레지스트리', '기능 탐색', 'capability explorer'],
  },
  {
    id: 'natural-tool-ai-workbench-open',
    path: 'xd.tools.core.aiWorkbench.open',
    label: 'AI Workbench',
    reasonName: 'AI Workbench',
    words: ['ai workbench', '워크벤치'],
  },
  {
    id: 'natural-tool-artifact-library-open',
    path: 'xd.tools.core.artifactLibrary.open',
    label: 'Artifact Library',
    reasonName: 'Artifact Library',
    words: ['artifact library', '아티팩트 라이브러리'],
  },
  {
    id: 'natural-tool-terminal-inspector-open',
    path: 'xd.tools.core.terminalInspector.open',
    label: 'Terminal Inspector',
    reasonName: 'Terminal Inspector',
    words: ['terminal inspector', '터미널 인스펙터'],
  },
  {
    id: 'natural-tool-process-viewer-open',
    path: 'xd.tools.core.processViewer.open',
    label: 'Process Viewer',
    reasonName: 'Process Viewer',
    words: ['process viewer', '프로세스 뷰어', '프로세스'],
  },
  {
    id: 'natural-tool-remote-sync-planner-open',
    path: 'xd.tools.core.remoteSyncPlanner.open',
    label: 'Remote Sync Planner',
    reasonName: 'Remote Sync Planner',
    words: ['remote sync', '원격 동기화'],
  },
  {
    id: 'natural-tool-run-task-panel-open',
    path: 'xd.tools.core.runTaskPanel.open',
    label: 'Run Task Panel',
    reasonName: 'Run Task Panel',
    words: ['run task', '작업 실행', '작업 패널'],
  },
  {
    id: 'natural-tool-safe-file-edit-center-open',
    path: 'xd.tools.core.safeFileEditCenter.open',
    label: 'Safe File Edit Center',
    reasonName: 'Safe File Edit Center',
    words: ['safe file', '안전 파일', '파일 편집 센터'],
  },
  {
    id: 'natural-tool-hermes-status-open',
    path: 'xd.tools.core.hermesStatus.open',
    label: 'Hermes Status',
    reasonName: 'Hermes Status',
    words: ['hermes status', '헤르메스 상태'],
  },
  {
    id: 'natural-tool-hermes-action-inbox-open',
    path: 'xd.tools.core.hermesActionInbox.open',
    label: 'Hermes Action Inbox',
    reasonName: 'Hermes Action Inbox',
    words: ['hermes action', '헤르메스 액션', 'action inbox', 'action-inbox', '액션 인박스', '액션인박스'],
  },
  {
    id: 'natural-tool-hermes-timeline-open',
    path: 'xd.tools.core.hermesTimeline.open',
    label: 'Hermes Timeline',
    reasonName: 'Hermes Timeline',
    words: ['hermes timeline', '헤르메스 타임라인'],
  },
  {
    id: 'natural-tool-network-monitor-open',
    path: 'xd.tools.core.networkMonitor.open',
    label: 'Network Monitor',
    reasonName: 'Network Monitor',
    words: ['network monitor', '네트워크 모니터'],
  },
  {
    id: 'natural-tool-audit-log-open',
    path: 'xd.tools.core.auditLog.open',
    label: 'Audit Log',
    reasonName: 'Audit Log',
    words: ['audit log', '감사 로그'],
  },
  {
    id: 'natural-tool-agent-performance-open',
    path: 'xd.tools.core.agentPerformance.open',
    label: 'Agent Performance',
    reasonName: 'Agent Performance',
    words: ['agent performance', '에이전트 성능'],
  },
  {
    id: 'natural-tool-xapp-preview-open',
    path: 'xd.tools.core.xappPreview.open',
    label: 'XApp Preview',
    reasonName: 'XApp Preview',
    words: ['xapp preview', 'xapp'],
  },
  {
    id: 'natural-tool-bot-open',
    path: 'xd.tools.core.bot.open',
    label: 'Bot',
    reasonName: 'Bot',
    words: ['bot', '봇'],
  },
] as const;

export const XENESIS_NATURAL_VIEW_TARGETS: readonly XenesisNaturalViewTarget[] = [
  {
    id: 'natural-gowoori-chat-open',
    label: 'GowooriChat',
    kind: 'gowooriChat',
    reason: 'Open GowooriChat from natural language request.',
    words: ['거울이 챗', '거울이챗', 'gowoorichat', 'gowoori chat', 'kouri chat', 'kourichat'],
  },
  {
    id: 'natural-gowoori-open',
    label: 'Gowoori',
    kind: 'gowoori',
    reason: 'Open Gowoori from natural language request.',
    words: ['거울이', 'gowoori', 'kouri'],
  },
  {
    id: 'natural-xenesis-agent-open',
    label: 'Xenesis Agent',
    kind: 'xenesisAgent',
    reason: 'Open Xenesis Agent from natural language request.',
    words: ['제니스', 'xenis', 'xenesis agent', 'xenesisagent'],
  },
  {
    id: 'natural-terminal-open',
    label: 'Terminal',
    kind: 'terminal',
    reason: 'Open terminal from natural language request.',
    words: ['터미널', 'terminal', 'shell', '콘솔'],
  },
  {
    id: 'natural-browser-open',
    label: 'Browser',
    kind: 'browser',
    reason: 'Open browser from natural language request.',
    words: ['브라우저', 'browser', '웹뷰', 'web'],
  },
] as const;

export const XENESIS_NATURAL_GUIDE_TARGETS: readonly XenesisNaturalGuideTarget[] =
  XENESIS_CONNECTION_NATURAL_GUIDE_TARGETS;

export const XENESIS_NATURAL_ONBOARDING_STEP_TARGETS: readonly XenesisNaturalWordsTarget[] =
  XENESIS_CONNECTION_NATURAL_ONBOARDING_STEP_TARGETS;

export const XENESIS_NATURAL_CONNECTION_TARGETS: readonly XenesisNaturalConnectionTarget[] =
  XENESIS_CONNECTION_NATURAL_CONNECTION_TARGETS;

export const XENESIS_NATURAL_PROVIDER_TARGETS: readonly XenesisNaturalWordsTarget[] =
  XENESIS_CONNECTION_NATURAL_PROVIDER_TARGETS;

export function findXenesisNaturalWordsTarget<T extends XenesisNaturalWordsTarget>(
  value: string,
  targets: readonly T[],
): T | null {
  return targets.find((target) => target.words.some((word) => value.includes(word))) ?? null;
}

export function findXenesisNaturalPlacementTarget(
  value: string,
): (typeof XENESIS_NATURAL_PLACEMENT_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PLACEMENT_TARGETS);
}

export function findXenesisNaturalDockSideTarget(
  value: string,
): (typeof XENESIS_NATURAL_DOCK_SIDE_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_DOCK_SIDE_TARGETS);
}

export function findXenesisNaturalDockWindowStateTarget(
  value: string,
): (typeof XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS);
}

export function findXenesisNaturalArrangeModeTarget(
  value: string,
): (typeof XENESIS_NATURAL_ARRANGE_MODE_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ARRANGE_MODE_TARGETS);
}

export function findXenesisNaturalWindowSizePresetTarget(
  value: string,
): (typeof XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS);
}

export function normalizeXenesisNaturalLanguageText(value: string): string {
  return String(value || XENESIS_NATURAL_TEXT_DEFAULTS.empty)
    .normalize(XENESIS_NATURAL_TEXT_DEFAULTS.unicodeNormalizationForm)
    .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.normalizedWhitespace, XENESIS_NATURAL_TEXT_DEFAULTS.wordSeparator)
    .trim()
    .toLowerCase();
}

export function detectXenesisNaturalPlacement(value: string): XenesisNaturalPlacementId | undefined {
  return findXenesisNaturalPlacementTarget(value)?.id;
}

export function detectXenesisNaturalDockSide(value: string): XenesisNaturalDockSideId | undefined {
  return findXenesisNaturalDockSideTarget(value)?.id;
}

export function detectXenesisNaturalDockWindowState(value: string): XenesisNaturalDockWindowStateId | undefined {
  return findXenesisNaturalDockWindowStateTarget(value)?.id;
}

export function detectXenesisNaturalArrangeMode(value: string): XenesisNaturalArrangeModeId | undefined {
  return findXenesisNaturalArrangeModeTarget(value)?.id;
}

export function detectXenesisNaturalWindowSizePreset(value: string): string | undefined {
  return findXenesisNaturalWindowSizePresetTarget(value)?.id;
}

export function extractXenesisNaturalFirstInteger(
  value: string,
  min: number = XENESIS_NATURAL_NUMERIC_LIMITS.firstInteger.min,
  max: number = XENESIS_NATURAL_NUMERIC_LIMITS.firstInteger.max,
): number | undefined {
  const match = String(value || XENESIS_NATURAL_TEXT_DEFAULTS.empty).match(
    XENESIS_NATURAL_EXTRACTION_PATTERNS.firstInteger,
  );
  if (!match) return undefined;
  const parsed = Number.parseInt(match[0] || XENESIS_NATURAL_TEXT_DEFAULTS.empty, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(min, Math.min(max, parsed));
}

export function extractXenesisNaturalDockSize(value: string): number | undefined {
  return extractXenesisNaturalFirstInteger(
    value,
    XENESIS_NATURAL_NUMERIC_LIMITS.dockSize.min,
    XENESIS_NATURAL_NUMERIC_LIMITS.dockSize.max,
  );
}

export function extractXenesisNaturalTerminalCount(value: string): number | undefined {
  return extractXenesisNaturalFirstInteger(
    value,
    XENESIS_NATURAL_NUMERIC_LIMITS.terminalCount.min,
    XENESIS_NATURAL_NUMERIC_LIMITS.terminalCount.max,
  );
}

export function stripXenesisNaturalQuotedText(value: string): string {
  return String(value || XENESIS_NATURAL_TEXT_DEFAULTS.empty).replace(
    XENESIS_NATURAL_EXTRACTION_PATTERNS.quotedText,
    XENESIS_NATURAL_TEXT_DEFAULTS.wordSeparator,
  );
}

export function extractXenesisNaturalQuotedTexts(value: string): string[] {
  const texts: string[] = [];
  for (const match of String(value || XENESIS_NATURAL_TEXT_DEFAULTS.empty).matchAll(
    XENESIS_NATURAL_EXTRACTION_PATTERNS.quotedText,
  )) {
    const quoted = match[1]?.trim();
    if (quoted) texts.push(quoted);
  }
  return texts;
}

export function extractXenesisNaturalQuotedText(value: string): string {
  return (
    extractXenesisNaturalQuotedTexts(value)[XENESIS_NATURAL_TEXT_DEFAULTS.firstItemIndex] ||
    XENESIS_NATURAL_TEXT_DEFAULTS.empty
  );
}

export function extractXenesisNaturalLocalPath(value: string): string {
  const quoted = extractXenesisNaturalQuotedText(value);
  if (quoted) return quoted;
  const windowsPath = value.match(XENESIS_NATURAL_EXTRACTION_PATTERNS.localWindowsPath);
  if (windowsPath?.[0]) {
    return windowsPath[0]
      .trim()
      .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.trailingPathPunctuation, XENESIS_NATURAL_TEXT_DEFAULTS.empty);
  }
  const unixPath = value.match(XENESIS_NATURAL_EXTRACTION_PATTERNS.localUnixPath);
  return (
    unixPath?.[0]
      ?.trim()
      .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.trailingPathPunctuation, XENESIS_NATURAL_TEXT_DEFAULTS.empty) ||
    XENESIS_NATURAL_TEXT_DEFAULTS.empty
  );
}

export function extractXenesisNaturalFilterQuery(value: string): string {
  const quoted = extractXenesisNaturalQuotedText(value);
  if (quoted) return quoted;
  const cleaned = value
    .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.filterQueryWords, XENESIS_NATURAL_TEXT_DEFAULTS.wordSeparator)
    .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.normalizedWhitespace, XENESIS_NATURAL_TEXT_DEFAULTS.wordSeparator)
    .trim();
  const parts = cleaned.split(XENESIS_NATURAL_TEXT_DEFAULTS.wordSeparator).filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

export function extractXenesisNaturalTerminalCommand(rawText: string): string {
  const quoted = extractXenesisNaturalQuotedText(rawText);
  if (quoted) return quoted;
  return String(rawText || XENESIS_NATURAL_TEXT_DEFAULTS.empty)
    .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.terminalCommandPrefix, XENESIS_NATURAL_TEXT_DEFAULTS.empty)
    .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.terminalCommandSuffix, XENESIS_NATURAL_TEXT_DEFAULTS.empty)
    .replace(XENESIS_NATURAL_EXTRACTION_PATTERNS.terminalCommandTrim, XENESIS_NATURAL_TEXT_DEFAULTS.empty)
    .trim();
}

export function findXenesisNaturalCoreToolTarget(value: string): XenesisNaturalCoreToolTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CORE_TOOL_TARGETS);
}

export function findXenesisNaturalViewTarget(value: string): XenesisNaturalViewTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_VIEW_TARGETS);
}

export function findXenesisNaturalConnectionTarget(value: string): XenesisNaturalConnectionTarget | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_CONNECTION_TARGETS);
}

export function findXenesisNaturalOnboardingStepTarget(
  value: string,
): (typeof XENESIS_NATURAL_ONBOARDING_STEP_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ONBOARDING_STEP_TARGETS);
}

export function findXenesisNaturalProviderTarget(
  value: string,
): (typeof XENESIS_NATURAL_PROVIDER_TARGETS)[number] | null {
  return findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_PROVIDER_TARGETS);
}

function matchesXenesisNaturalGuideTarget(value: string, target: XenesisNaturalGuideTarget): boolean {
  if (target.words.some((word) => value.includes(word))) return true;
  if (!target.requiredWordGroups?.length) return false;
  return target.requiredWordGroups.every((wordGroup) => wordGroup.some((word) => value.includes(word)));
}

export function findXenesisNaturalGuideTarget(value: string): XenesisNaturalGuideTarget | null {
  const matchedIds = new Set(
    XENESIS_NATURAL_GUIDE_TARGETS.filter(
      (target) => !target.fallback && matchesXenesisNaturalGuideTarget(value, target),
    ).map((target) => target.id),
  );

  return (
    XENESIS_NATURAL_GUIDE_TARGETS.find(
      (target) =>
        !target.fallback &&
        matchedIds.has(target.id) &&
        !target.blockedByMatchedTargetIds?.some((blockedId) => matchedIds.has(blockedId)),
    ) ??
    XENESIS_NATURAL_GUIDE_TARGETS.find((target) => target.fallback) ??
    null
  );
}

export function isXenesisNaturalImplementedMessengerTarget(target: {
  kind: XenesisNaturalConnectionTargetKind;
  supportLevel?: string;
}): boolean {
  return target.kind === 'messenger' && target.supportLevel === 'implemented';
}

export function buildXenesisNaturalLanguagePlan(
  visibleText: string,
  actions: XenesisNaturalDeskActionRequest[],
  errors: string[] = [],
): XenesisNaturalLanguagePlan {
  return { visibleText, actions, errors, matched: actions.length > 0 || errors.length > 0 };
}

export function emptyXenesisNaturalLanguagePlan(): XenesisNaturalLanguagePlan {
  return {
    visibleText: XENESIS_NATURAL_TEXT_DEFAULTS.empty,
    actions: [],
    errors: [],
    matched: false,
  };
}
