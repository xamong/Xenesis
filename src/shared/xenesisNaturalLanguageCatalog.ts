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

export const XENESIS_NATURAL_PLANNED_GOOGLE_TOOL_IDS = ['google-calendar', 'google-workspace'] as const;

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
  return (
    isXenesisNaturalConnectionToolTarget(target) &&
    (XENESIS_NATURAL_PLANNED_GOOGLE_TOOL_IDS as readonly string[]).includes(target.id)
  );
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
  path: string;
  ok: boolean;
  result?: unknown;
  error?: string;
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

export const XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS = {
  placement: 'tab',
  windowState: 'document',
} as const;

export const XENESIS_NATURAL_DESK_ACTION_ARGS = {
  agentId: (agentId: string) => ({ agentId }),
  agentSubmit: (agentId: string, text: string) => ({ agentId, text }),
  channel: (channel: string) => ({ channel }),
  channelVisible: (channel: string) => ({ channel, ensureVisible: true }),
  dockPaneArrange: (mode: string) => ({ useActive: true, mode }),
  dockSize: (side: string, size: number) => ({ [side]: size }),
  dockWindowArrange: (windowState: string | undefined, mode: string) => ({
    windowState: windowState || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.windowState,
    mode,
  }),
  empty: () => ({}),
  ensureVisible: () => ({ ensureVisible: true }),
  explorerPath: (path: string) => ({ path }),
  filterQuery: (query: string) => ({ query }),
  openFileVisible: (id: string, openFile: boolean) => ({
    id,
    ensureVisible: true,
    ...(openFile ? { openFile: true } : {}),
  }),
  optionalFilePath: (filePath: string) => (filePath ? { filePath } : {}),
  placement: (placement: string | undefined) => ({
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  prompt: (prompt: string) => ({ prompt }),
  provider: (provider: string) => ({ provider }),
  providerVisible: (provider: string) => ({ provider, ensureVisible: true }),
  presetId: (presetId: string) => ({ presetId }),
  targetId: (id: string) => ({ id }),
  targetIdVisible: (id: string) => ({ id, ensureVisible: true }),
  terminalMany: (count: number, placement: string | undefined) => ({
    count,
    shell: XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL,
    command: XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND,
    idPrefix: XENESIS_NATURAL_TERMINAL_ID_PREFIX,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  terminalRun: (command: string, placement: string | undefined) => ({
    command: command || XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND,
    shell: XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  tool: (tool: string) => ({ tool }),
  toolVisible: (tool: string) => ({ tool, ensureVisible: true }),
  useActive: () => ({ useActive: true }),
  viewKind: (kind: string) => ({ kind }),
  withPlacement: (args: Record<string, unknown>, placement: string | undefined) => ({
    ...args,
    placement: placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
  }),
  workspacePath: (path: string) => ({ path }),
} as const;

export const XENESIS_NATURAL_VIEW_OPEN_PATH = 'xd.views.open';

export const XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS = {
  settingsOpen: {
    id: 'natural-settings-open',
    path: 'xd.panes.settings.open',
    reason: 'Open settings from natural language request.',
  },
  diagnosticsOpen: {
    id: 'natural-diagnostics-open',
    path: 'xd.panes.diagnostics.open',
    reason: 'Open diagnostics from natural language request.',
  },
  capabilityExplorerOpen: {
    id: 'natural-capability-explorer-open',
    path: 'xd.tools.core.capabilityExplorer.open',
    reason: 'Open Capability Explorer from natural language request.',
  },
  captureList: {
    id: 'natural-capture-list',
    path: 'xd.capture.list',
    reason: 'List captures from natural language request.',
  },
  captureActivePane: {
    id: 'natural-capture-active-pane',
    path: 'xd.capture.activePane',
    reason: 'Capture the active pane from natural language request.',
  },
  dockFocusActive: {
    id: 'natural-dock-focus-active',
    path: 'xd.dock.focus',
    reason: 'Focus the active dock content from natural language request.',
  },
  dockCloseActive: {
    id: 'natural-dock-close-active',
    path: 'xd.dock.close',
    reason: 'Close the active dock content from natural language request.',
  },
  dockCloseRight: {
    id: 'natural-dock-close-right-active',
    path: 'xd.dock.closeRight',
    reason: 'Close tabs to the right of active dock content from natural language request.',
  },
  dockCloseOthers: {
    id: 'natural-dock-close-others-active',
    path: 'xd.dock.closeOthers',
    reason: 'Close other tabs around active dock content from natural language request.',
  },
  dockCloseAll: {
    id: 'natural-dock-close-all-active',
    path: 'xd.dock.closeAll',
    reason: 'Close all tabs in active dock pane from natural language request.',
  },
  dockSizeSet: {
    id: 'natural-dock-size-set',
    path: 'xd.dock.sizes.set',
    reason: 'Resize a dock side from natural language request.',
  },
  windowSizePreset: {
    id: 'natural-window-size-preset',
    path: 'xd.window.sizer.applyPreset',
    reason: 'Apply window size preset from natural language request.',
  },
  filesListOpen: {
    id: 'natural-files-list-open',
    path: 'xd.files.listOpen',
    reason: 'List open files from natural language request.',
  },
  fileOpen: {
    id: 'natural-file-open',
    path: 'xd.files.open',
    reason: 'Open file from natural language request.',
  },
  fileRead: {
    id: 'natural-file-read',
    path: 'xd.files.read',
    reason: 'Read file from natural language request.',
  },
  explorerHide: {
    id: 'natural-explorer-hide',
    path: 'xd.explorer.local.hide',
    reason: 'Hide explorer from natural language request.',
  },
  explorerToggle: {
    id: 'natural-explorer-toggle',
    path: 'xd.explorer.local.toggle',
    reason: 'Toggle explorer from natural language request.',
  },
  explorerRefresh: {
    id: 'natural-explorer-refresh',
    path: 'xd.explorer.local.refresh',
    reason: 'Refresh explorer from natural language request.',
  },
  explorerGoUp: {
    id: 'natural-explorer-go-up',
    path: 'xd.explorer.local.goUp',
    reason: 'Go to parent folder from natural language request.',
  },
  explorerFilter: {
    id: 'natural-explorer-filter',
    path: 'xd.explorer.local.setFilter',
    reason: 'Filter explorer from natural language request.',
  },
  explorerNavigate: {
    id: 'natural-explorer-navigate',
    path: 'xd.explorer.local.navigate',
    reason: 'Navigate explorer from natural language request.',
  },
  explorerShow: {
    id: 'natural-explorer-show',
    path: 'xd.explorer.local.show',
    reason: 'Show explorer from natural language request.',
  },
  favoritesShow: {
    id: 'natural-favorites-show',
    path: 'xd.favorites.showTab',
    reason: 'Show favorites from natural language request.',
  },
  terminalsList: {
    id: 'natural-terminals-list',
    path: 'xd.terminals.list',
    reason: 'List terminals from natural language request.',
  },
  terminalRunMany: {
    id: 'natural-terminal-run-many',
    path: 'xd.terminals.runMany',
    reason: 'Open multiple terminals from natural language request.',
  },
  terminalRun: {
    id: 'natural-terminal-run',
    path: 'xd.terminals.run',
    reason: 'Run terminal command from natural language request.',
  },
  dockWindowArrange: {
    id: 'natural-dock-window-arrange',
    path: 'xd.dock.window.arrange',
    reason: 'Arrange a Desk window area from natural language request.',
  },
  dockPaneArrange: {
    id: 'natural-dock-pane-arrange',
    path: 'xd.dock.pane.arrange',
    reason: 'Arrange the active dock pane from natural language request.',
  },
  dockArrangeGrid: {
    id: 'natural-dock-arrange-grid',
    path: 'xd.dock.arrangeGrid',
    reason: 'Arrange dock group as grid from natural language request.',
  },
  dockArrangeHorizontal: {
    id: 'natural-dock-arrange-horizontal',
    path: 'xd.dock.arrangeHorizontal',
    reason: 'Arrange dock group horizontally from natural language request.',
  },
  dockArrangeVertical: {
    id: 'natural-dock-arrange-vertical',
    path: 'xd.dock.arrangeVertical',
    reason: 'Arrange dock group vertically from natural language request.',
  },
  dockWindowMerge: {
    id: 'natural-dock-window-merge',
    path: 'xd.dock.window.merge',
    reason: 'Merge a Desk window area from natural language request.',
  },
  dockPaneMerge: {
    id: 'natural-dock-pane-merge',
    path: 'xd.dock.pane.merge',
    reason: 'Merge the active dock pane from natural language request.',
  },
  dockMergeGroup: {
    id: 'natural-dock-merge',
    path: 'xd.dock.mergeGroup',
    reason: 'Merge dock layout from natural language request.',
  },
  dockMergeAll: {
    id: 'natural-dock-merge',
    path: 'xd.dock.mergeAll',
    reason: 'Merge dock layout from natural language request.',
  },
  dockPanesList: {
    id: 'natural-dock-panes-list',
    path: 'xd.dock.panes.list',
    reason: 'List dock panes from natural language request.',
  },
  artifactTargetSet: {
    id: 'natural-artifact-target-set',
    path: 'xd.dock.artifactTarget.set',
    reason: 'Set active pane as artifact target from natural language request.',
  },
  appStatus: {
    id: 'natural-app-status',
    path: 'xd.app.status',
    reason: 'Read app status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_DESK_PANE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.settingsOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.settingsPaneOpen,
  },
  {
    contextWords: XENESIS_NATURAL_DESK_DIAGNOSTICS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.diagnosticsOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.diagnosticsPaneOpen,
  },
  {
    contextWords: XENESIS_NATURAL_CORE_CAPABILITY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.capabilityExplorerOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.capabilityExplorerOpen,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_CAPTURE_RULES = [
  {
    contextWords: XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.captureList,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.captureListRead,
  },
  {
    contextWords: XENESIS_NATURAL_CAPTURE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.captureActivePane,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activePaneCapture,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_FILE_LIST_RULES = [
  {
    contextWords: XENESIS_NATURAL_FILE_LIST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.filesListOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.filesListRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_FILE_PATH_RULES = [
  {
    contextWords: XENESIS_NATURAL_FILE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_OPEN_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.fileOpen,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.fileOpen,
  },
  {
    contextWords: XENESIS_NATURAL_FILE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_FILE_READ_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.fileRead,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.fileContentRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DESK_MISC_READ_RULES = [
  {
    contextWords: XENESIS_NATURAL_FAVORITES_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.favoritesShow,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.favoritesShow,
  },
  {
    contextWords: XENESIS_NATURAL_APP_STATUS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_APP_STATUS_TARGET_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.appStatus,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.appStatusRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_GENERIC_FOCUS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockFocusActive,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockFocus,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_ACTIVE_DOCK_CLOSE_RULES = [
  {
    contextWords: XENESIS_NATURAL_RIGHT_SCOPE_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
      XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
    ],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseRight,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
  {
    contextWords: XENESIS_NATURAL_OTHER_SCOPE_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
      XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
    ],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseOthers,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
  {
    contextWords: XENESIS_NATURAL_ALL_SCOPE_WORDS,
    requiredContextWordGroups: [
      XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
      XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS,
    ],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseAll,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
  {
    contextWords: XENESIS_NATURAL_GENERIC_CLOSE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_PANE_TAB_CURRENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockCloseActive,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockClose,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_SIZE_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_SIZE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RESIZE_COMMAND_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockSizeSet,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockAreaResize,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_WINDOW_SIZE_PRESET_RULES = [
  {
    contextWords: [],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.windowSizePreset,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_EXPLORER_SIMPLE_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXPLORER_HIDE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerHide,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerHide,
  },
  {
    contextWords: XENESIS_NATURAL_TOGGLE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerToggle,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerToggle,
  },
  {
    contextWords: XENESIS_NATURAL_REFRESH_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerRefresh,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerRefresh,
  },
  {
    contextWords: XENESIS_NATURAL_PARENT_NAVIGATION_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerGoUp,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerGoUp,
  },
  {
    contextWords: XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerShow,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerShow,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_EXPLORER_FILTER_RULES = [
  {
    contextWords: XENESIS_NATURAL_FILTER_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerFilter,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerFilterApply,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_EXPLORER_NAVIGATE_RULES = [
  {
    contextWords: XENESIS_NATURAL_EXPLORER_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.explorerNavigate,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.explorerNavigate,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_TERMINAL_LIST_RULES = [
  {
    contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_GENERIC_LIST_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.terminalsList,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.terminalListRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_TERMINAL_MANY_RULES = [
  {
    contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_TERMINAL_MULTI_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.terminalRunMany,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.multipleTerminalsOpenAndArrange,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_TERMINAL_RUN_RULES = [
  {
    contextWords: XENESIS_NATURAL_TERMINAL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_TERMINAL_RUN_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.terminalRun,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.terminalCommandRun,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_WINDOW_ARRANGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockWindowArrange,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.scopedDeskAreaArrange,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_PANE_ARRANGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_ARRANGE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockPaneArrange,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockPaneArrange,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_GROUP_ARRANGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_DOCK_GRID_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockArrangeGrid,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupTile,
  },
  {
    contextWords: XENESIS_NATURAL_DOCK_HORIZONTAL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockArrangeHorizontal,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupHorizontal,
  },
  {
    contextWords: XENESIS_NATURAL_DOCK_VERTICAL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockArrangeVertical,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockGroupVertical,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_WINDOW_MERGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockWindowMerge,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.scopedDockMerge,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_PANE_MERGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockPaneMerge,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.activeDockPaneMerge,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_GROUP_MERGE_RULES = [
  {
    contextWords: XENESIS_NATURAL_DOCK_MERGE_ALL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockMergeAll,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockMerge,
  },
  {
    contextWords: XENESIS_NATURAL_DOCK_MERGE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockMergeGroup,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockMerge,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_DOCK_PANES_LIST_RULES = [
  {
    contextWords: XENESIS_NATURAL_PANE_LIST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.dockPanesList,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.dockPanesListRead,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_ARTIFACT_TARGET_RULES = [
  {
    contextWords: XENESIS_NATURAL_ARTIFACT_TARGET_CONTEXT_WORDS,
    action: XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS.artifactTargetSet,
    visibleText: XENESIS_NATURAL_PLAN_VISIBLE_TEXT.artifactTargetSet,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS = {
  localCliScan: {
    id: 'natural-local-cli-scan',
    path: 'xd.localCli.scan',
    reason: 'Scan local CLI agents from natural language request.',
  },
  mcpBridgeStatus: {
    id: 'natural-mcp-bridge-status',
    path: 'xd.mcp.bridge.status',
    reason: 'Read MCP bridge status from natural language request.',
  },
  mcpSettingsStatus: {
    id: 'natural-mcp-settings-status',
    path: 'xd.mcp.settings.status',
    reason: 'Read MCP settings status from natural language request.',
  },
  actionInboxList: {
    id: 'natural-mcp-action-inbox-list',
    path: 'xd.mcp.actionInbox.list',
    reason: 'List Action Inbox items from natural language request.',
  },
  gatewayDashboardOpen: {
    id: 'natural-xenesis-gateway-dashboard-open',
    path: 'xd.xenesis.gateway.openDashboard',
    reason: 'Open Xenesis gateway dashboard from natural language request.',
  },
  gatewayStatus: {
    id: 'natural-xenesis-gateway-status',
    path: 'xd.xenesis.gateway.status',
    reason: 'Read Xenesis gateway status from natural language request.',
  },
  agentEvents: {
    id: 'natural-xenesis-agent-events',
    path: 'xd.xenesis.agents.events',
    reason: 'List Xenesis Agent pane events from natural language request.',
  },
  agentStatus: {
    id: 'natural-xenesis-agent-status',
    path: 'xd.xenesis.agents.status',
    reason: 'Read Xenesis Agent pane status from natural language request.',
  },
  runtimeStatus: {
    id: 'natural-xenesis-status',
    path: 'xd.xenesis.status',
    reason: 'Read Xenesis runtime status from natural language request.',
  },
  reportsList: {
    id: 'natural-xenesis-reports-list',
    path: 'xd.xenesis.reports.list',
    reason: 'List Xenesis reports from natural language request.',
  },
  tasksList: {
    id: 'natural-xenesis-tasks-list',
    path: 'xd.xenesis.tasks.list',
    reason: 'List Xenesis tasks from natural language request.',
  },
  agentsList: {
    id: 'natural-xenesis-agents-list',
    path: 'xd.xenesis.agents.list',
    reason: 'List registered Xenesis Agent panes from natural language request.',
  },
  diagnostics: {
    id: 'natural-xenesis-diagnostics',
    path: 'xd.xenesis.diagnostics',
    reason: 'Read Xenesis operational diagnostics from natural language request.',
  },
  profilesList: {
    id: 'natural-xenesis-profiles-list',
    path: 'xd.xenesis.profiles.list',
    reason: 'List Xenesis profiles from natural language request.',
  },
  agentSubmit: {
    id: 'natural-xenesis-agent-submit',
    path: 'xd.xenesis.agents.submit',
    reason: 'Submit Xenesis Agent pane message from natural language request.',
  },
  runsStart: {
    id: 'natural-xenesis-runs-start',
    path: 'xd.xenesis.runs.start',
    reason: 'Start Xenesis run from natural language request.',
  },
  runsCancel: {
    id: 'natural-xenesis-runs-cancel',
    path: 'xd.xenesis.runs.cancel',
    reason: 'Cancel active Xenesis run from natural language request.',
  },
  sessionsReset: {
    id: 'natural-xenesis-sessions-reset',
    path: 'xd.xenesis.sessions.reset',
    reason: 'Reset active Xenesis session from natural language request.',
  },
  workspaceSet: {
    id: 'natural-xenesis-workspace-set',
    path: 'xd.xenesis.workspace.set',
    reason: 'Set Xenesis workspace from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS = {
  actionInboxList: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.actionInboxList.path,
} as const;

export const XENESIS_NATURAL_AGENT_READBACK_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentEvents,
  },
  {
    contextWords: XENESIS_NATURAL_RUNTIME_READBACK_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentStatus,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_AGENT_SUBMIT_RULES = [
  {
    contextWords: XENESIS_NATURAL_AGENT_SUBMIT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_AGENT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentSubmit,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUN_START_RULES = [
  {
    contextWords: XENESIS_NATURAL_RUN_START_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_RUN_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_CANCEL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runsStart,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_WORKSPACE_SET_RULES = [
  {
    contextWords: XENESIS_NATURAL_WORKSPACE_SET_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_WORKSPACE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.workspaceSet,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_SUPPORT_RULES = [
  {
    contextWords: XENESIS_NATURAL_LOCAL_CLI_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_LOCAL_CLI_SCAN_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.localCliScan,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_BRIDGE_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.mcpBridgeStatus,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_SETTINGS_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.mcpSettingsStatus,
  },
  {
    contextWords: XENESIS_NATURAL_ACTION_INBOX_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.actionInboxList,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_GATEWAY_ACTION_RULES = [
  {
    contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DASHBOARD_CONTEXT_WORDS, XENESIS_NATURAL_OPEN_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayDashboardOpen,
  },
  {
    contextWords: XENESIS_NATURAL_GATEWAY_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.gatewayStatus,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_INVENTORY_RULES = [
  {
    contextWords: XENESIS_NATURAL_BROAD_RUNTIME_STATUS_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS],
    blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runtimeStatus,
  },
  {
    contextWords: XENESIS_NATURAL_RUNTIME_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_RUNTIME_READBACK_WORDS],
    blockedContextWords: XENESIS_NATURAL_RUNTIME_STATUS_TARGET_WORDS,
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runtimeStatus,
  },
  {
    contextWords: XENESIS_NATURAL_REPORT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.reportsList,
  },
  {
    contextWords: XENESIS_NATURAL_TASK_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.tasksList,
  },
  {
    contextWords: XENESIS_NATURAL_AGENT_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_LIST_OR_SHOW_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.agentsList,
  },
  {
    contextWords: XENESIS_NATURAL_RUNTIME_DIAGNOSTIC_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.diagnostics,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROFILE_INVENTORY_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROFILE_LIST_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_PROFILE_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.profilesList,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_RUNTIME_CONTROL_RULES = [
  {
    contextWords: XENESIS_NATURAL_RUN_CANCEL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_CANCEL_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.runsCancel,
  },
  {
    contextWords: XENESIS_NATURAL_SESSION_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_XENESIS_CONTEXT_WORDS, XENESIS_NATURAL_SESSION_RESET_CONTEXT_WORDS],
    action: XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS.sessionsReset,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS = {
  open: {
    path: 'xd.xenesis.guides.open',
    idFor: (id: string, _label: string, _openFile: boolean) => `natural-xenesis-guide-open-${id}`,
    reasonFor: (_id: string, label: string, openFile: boolean) =>
      `Open ${label} guide${openFile ? ' file' : ''} from natural language request.`,
  },
  status: {
    path: 'xd.xenesis.guides.status',
    idFor: (id: string, _label: string) => `natural-xenesis-guide-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} guide catalog status from natural language request.`,
  },
} as const satisfies {
  open: XenesisNaturalDeskActionTemplateDescriptor<[string, string, boolean]>;
  status: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
};

export const XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS = {
  centerOpen: {
    id: 'natural-xenesis-onboarding-center-open',
    path: 'xd.xenesis.onboarding.open',
    reason: 'Open Xenesis onboarding checklist in Connection Center from natural language request.',
  },
  stepOpen: {
    path: 'xd.xenesis.onboarding.open',
    idFor: (id: string, _label: string) => `natural-xenesis-onboarding-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} onboarding checklist step from natural language request.`,
  },
  stepStatus: {
    path: 'xd.xenesis.onboarding.status',
    idFor: (id: string, _label: string) => `natural-xenesis-onboarding-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} onboarding checklist status from natural language request.`,
  },
} as const satisfies {
  centerOpen: XenesisNaturalDeskActionDescriptor;
  stepOpen: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
  stepStatus: XenesisNaturalDeskActionTemplateDescriptor<[string, string]>;
};

export const XENESIS_NATURAL_GUIDE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS.open,
  },
] as const satisfies readonly XenesisNaturalGuideOpenRule[];

export const XENESIS_NATURAL_GUIDE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_GUIDE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS.status,
  },
] as const satisfies readonly XenesisNaturalGuideStatusRule[];

export const XENESIS_NATURAL_ONBOARDING_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.stepOpen,
    argsKind: 'targetIdVisible',
    targetRequired: true,
  },
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.centerOpen,
    argsKind: 'ensureVisible',
    targetRequired: false,
  },
] as const satisfies readonly XenesisNaturalOnboardingActionRule[];

export const XENESIS_NATURAL_ONBOARDING_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS.stepStatus,
    argsKind: 'targetId',
    targetRequired: true,
  },
] as const satisfies readonly XenesisNaturalOnboardingActionRule[];

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  guides: {
    id: 'natural-xenesis-guides-catalog-open',
    path: 'xd.xenesis.guides.open',
    reason: 'Open Xenesis guide catalog in Connection Center from natural language request.',
  },
  diagnostics: {
    id: 'natural-xenesis-connection-diagnostics-catalog-open',
    path: 'xd.xenesis.connections.diagnostics.open',
    reason: 'Open Xenesis connection diagnostics catalog in Connection Center from natural language request.',
  },
  setupRequests: {
    id: 'natural-xenesis-connection-setup-requests-catalog-open',
    path: 'xd.xenesis.connections.setupRequests.open',
    reason: 'Open Xenesis connection setup request catalog in Connection Center from natural language request.',
  },
  connections: {
    id: 'natural-xenesis-connections-center-open',
    path: 'xd.xenesis.connections.open',
    reason: 'Open Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES = [
  {
    stage: 'guide',
    matchKind: 'guideCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.guides,
  },
  {
    stage: 'late',
    matchKind: 'diagnosticsCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.diagnostics,
  },
  {
    stage: 'late',
    matchKind: 'setupRequestCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setupRequests,
  },
  {
    stage: 'late',
    matchKind: 'connectionCenterOpen',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS.connections,
  },
] as const satisfies readonly XenesisNaturalConnectionAggregateOpenRule[];

export const XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  connectors: {
    id: 'natural-xenesis-tools-connectors-catalog-open',
    path: 'xd.xenesis.tools.connectors.open',
    reason: 'Open external tool connector catalog in Xenesis Connection Center from natural language request.',
  },
  mcpInstallDrafts: {
    id: 'natural-xenesis-tools-mcp-install-drafts-catalog-open',
    path: 'xd.xenesis.tools.mcpInstallDrafts.open',
    reason: 'Open external tool MCP install draft catalog in Xenesis Connection Center from natural language request.',
  },
  oauthDrafts: {
    id: 'natural-xenesis-tools-oauth-drafts-catalog-open',
    path: 'xd.xenesis.tools.oauthDrafts.open',
    reason: 'Open external tool OAuth draft catalog in Xenesis Connection Center from natural language request.',
  },
  views: {
    id: 'natural-xenesis-tools-views-catalog-open',
    path: 'xd.xenesis.tools.views.open',
    reason: 'Open external tool view catalog in Xenesis Connection Center from natural language request.',
  },
  installPlans: {
    id: 'natural-xenesis-tools-install-plans-catalog-open',
    path: 'xd.xenesis.tools.installPlans.open',
    reason: 'Open external tool install plan catalog in Xenesis Connection Center from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-tools-setup-catalog-open',
    path: 'xd.xenesis.tools.setup.open',
    reason: 'Open external tool setup catalog in Xenesis Connection Center from natural language request.',
  },
  actions: {
    id: 'natural-xenesis-tools-actions-catalog-open',
    path: 'xd.xenesis.tools.actions.open',
    reason: 'Open external tool action policy catalog in Xenesis Connection Center from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-tools-user-stories-catalog-open',
    path: 'xd.xenesis.tools.userStories.open',
    reason: 'Open external tool user-story catalog in Xenesis Connection Center from natural language request.',
  },
  catalog: {
    id: 'natural-xenesis-tool-catalog-open',
    path: 'xd.xenesis.tools.setup.open',
    reason: 'Open external tool catalog in Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.connectors,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DRAFT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.mcpInstallDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.oauthDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.installPlans,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setup,
  },
  {
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.actions,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.userStories,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS.catalog,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  profileDrafts: {
    id: 'natural-xenesis-messengers-profile-drafts-catalog-open',
    path: 'xd.xenesis.channels.profileDrafts.open',
    reason: 'Open external messenger profile draft catalog in Xenesis Connection Center from natural language request.',
  },
  routing: {
    id: 'natural-xenesis-messengers-routing-catalog-open',
    path: 'xd.xenesis.channels.routing.open',
    reason: 'Open external messenger routing catalog in Xenesis Connection Center from natural language request.',
  },
  safety: {
    id: 'natural-xenesis-messengers-safety-catalog-open',
    path: 'xd.xenesis.channels.safety.open',
    reason: 'Open external messenger safety catalog in Xenesis Connection Center from natural language request.',
  },
  accessGroups: {
    id: 'natural-xenesis-messengers-access-groups-catalog-open',
    path: 'xd.xenesis.channels.accessGroups.open',
    reason: 'Open external messenger access-group catalog in Xenesis Connection Center from natural language request.',
  },
  pairing: {
    id: 'natural-xenesis-messengers-pairing-catalog-open',
    path: 'xd.xenesis.channels.pairing.open',
    reason: 'Open external messenger pairing catalog in Xenesis Connection Center from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-messengers-user-stories-catalog-open',
    path: 'xd.xenesis.channels.userStories.open',
    reason: 'Open external messenger user-story catalog in Xenesis Connection Center from natural language request.',
  },
  views: {
    id: 'natural-xenesis-messengers-views-catalog-open',
    path: 'xd.xenesis.messengers.views.open',
    reason: 'Open external messenger view catalog in Xenesis Connection Center from natural language request.',
  },
  catalog: {
    id: 'natural-xenesis-messenger-catalog-open',
    path: 'xd.xenesis.messengers.views.open',
    reason: 'Open external messenger catalog in Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.safety,
  },
  {
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.accessGroups,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.pairing,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.userStories,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.catalog,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS = {
  routing: {
    id: 'natural-xenesis-providers-routing-catalog-open',
    path: 'xd.xenesis.providers.routing.open',
    reason: 'Open AI provider routing in Xenesis Connection Center from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-providers-setup-catalog-open',
    path: 'xd.xenesis.providers.setup.open',
    reason: 'Open AI provider setup catalog in Xenesis Connection Center from natural language request.',
  },
  views: {
    id: 'natural-xenesis-providers-views-catalog-open',
    path: 'xd.xenesis.providers.views.open',
    reason: 'Open AI provider view catalog in Xenesis Connection Center from natural language request.',
  },
  profileDrafts: {
    id: 'natural-xenesis-providers-profile-drafts-catalog-open',
    path: 'xd.xenesis.providers.profileDrafts.open',
    reason: 'Open AI provider profile draft catalog in Xenesis Connection Center from natural language request.',
  },
  catalog: {
    id: 'natural-xenesis-provider-catalog-open',
    path: 'xd.xenesis.providers.setup.open',
    reason: 'Open AI provider catalog in Xenesis Connection Center from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  connectors: {
    id: 'natural-xenesis-tools-connectors-status',
    path: 'xd.xenesis.tools.connectors.status',
    reason: 'Read external tool connector catalog status from natural language request.',
  },
  mcpInstallDrafts: {
    id: 'natural-xenesis-tools-mcp-install-drafts-status',
    path: 'xd.xenesis.tools.mcpInstallDrafts.status',
    reason: 'Read external tool MCP install draft catalog status from natural language request.',
  },
  oauthDrafts: {
    id: 'natural-xenesis-tools-oauth-drafts-status',
    path: 'xd.xenesis.tools.oauthDrafts.status',
    reason: 'Read external tool OAuth draft catalog status from natural language request.',
  },
  views: {
    id: 'natural-xenesis-tools-views-status',
    path: 'xd.xenesis.tools.views.status',
    reason: 'Read external tool view catalog status from natural language request.',
  },
  installPlans: {
    id: 'natural-xenesis-tools-install-plans-status',
    path: 'xd.xenesis.tools.installPlans.status',
    reason: 'Read external tool install plan catalog status from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-tools-setup-status',
    path: 'xd.xenesis.tools.setup.status',
    reason: 'Read external tool setup catalog status from natural language request.',
  },
  actions: {
    id: 'natural-xenesis-tools-actions-status',
    path: 'xd.xenesis.tools.actions.status',
    reason: 'Read external tool action policy catalog status from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-tools-user-stories-status',
    path: 'xd.xenesis.tools.userStories.status',
    reason: 'Read external tool user-story catalog status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.connectors,
  },
  {
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    requiredContextWordGroups: [XENESIS_NATURAL_DRAFT_CONTEXT_WORDS],
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.mcpInstallDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.oauthDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.installPlans,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setup,
  },
  {
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.actions,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS.userStories,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  profileDrafts: {
    id: 'natural-xenesis-messengers-profile-drafts-status',
    path: 'xd.xenesis.channels.profileDrafts.status',
    reason: 'Read external messenger profile draft catalog status from natural language request.',
  },
  routing: {
    id: 'natural-xenesis-messengers-routing-status',
    path: 'xd.xenesis.channels.routing.status',
    reason: 'Read external messenger routing catalog status from natural language request.',
  },
  safety: {
    id: 'natural-xenesis-messengers-safety-status',
    path: 'xd.xenesis.channels.safety.status',
    reason: 'Read external messenger safety catalog status from natural language request.',
  },
  accessGroups: {
    id: 'natural-xenesis-messengers-access-groups-status',
    path: 'xd.xenesis.channels.accessGroups.status',
    reason: 'Read external messenger access-group catalog status from natural language request.',
  },
  pairing: {
    id: 'natural-xenesis-messengers-pairing-status',
    path: 'xd.xenesis.channels.pairing.status',
    reason: 'Read external messenger pairing catalog status from natural language request.',
  },
  userStories: {
    id: 'natural-xenesis-messengers-user-stories-status',
    path: 'xd.xenesis.channels.userStories.status',
    reason: 'Read external messenger user-story catalog status from natural language request.',
  },
  views: {
    id: 'natural-xenesis-messengers-views-status',
    path: 'xd.xenesis.messengers.views.status',
    reason: 'Read external messenger view catalog status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.safety,
  },
  {
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.accessGroups,
  },
  {
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.pairing,
  },
  {
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.userStories,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_OR_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.views,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  routing: {
    id: 'natural-xenesis-providers-routing-status',
    path: 'xd.xenesis.providers.routing.status',
    reason: 'Read AI provider routing catalog status from natural language request.',
  },
  views: {
    id: 'natural-xenesis-providers-views-status',
    path: 'xd.xenesis.providers.views.status',
    reason: 'Read AI provider view catalog status from natural language request.',
  },
  profileDrafts: {
    id: 'natural-xenesis-providers-profile-drafts-status',
    path: 'xd.xenesis.providers.profileDrafts.status',
    reason: 'Read AI provider profile draft catalog status from natural language request.',
  },
  setup: {
    id: 'natural-xenesis-providers-setup-status',
    path: 'xd.xenesis.providers.setup.status',
    reason: 'Read AI provider setup catalog status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setup,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.routing,
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.setup,
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.views,
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.profileDrafts,
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS.catalog,
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalCatalogActionRule[];

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS = {
  guides: {
    id: 'natural-xenesis-guides-status',
    path: 'xd.xenesis.guides.status',
    reason: 'Read Xenesis guide catalog status from natural language request.',
  },
  diagnostics: {
    id: 'natural-xenesis-connection-diagnostics-status',
    path: 'xd.xenesis.connections.diagnostics.status',
    reason: 'Read Xenesis connection diagnostics catalog from natural language request.',
  },
  setupRequests: {
    id: 'natural-xenesis-connection-setup-requests-status',
    path: 'xd.xenesis.connections.setupRequests.status',
    reason: 'Read Xenesis connection setup request catalog from natural language request.',
  },
  onboarding: {
    id: 'natural-xenesis-onboarding-status',
    path: 'xd.xenesis.onboarding.status',
    reason: 'Read Xenesis onboarding status from natural language request.',
  },
  connections: {
    id: 'natural-xenesis-connections-status',
    path: 'xd.xenesis.connections.status',
    reason: 'Read Xenesis connection status from natural language request.',
  },
} as const satisfies Record<string, XenesisNaturalDeskActionDescriptor>;

export const XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES = [
  {
    stage: 'early',
    matchKind: 'guideCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.guides,
  },
  {
    stage: 'early',
    matchKind: 'diagnosticsCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.diagnostics,
  },
  {
    stage: 'early',
    matchKind: 'setupRequestCatalog',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.setupRequests,
  },
  {
    stage: 'late',
    matchKind: 'onboarding',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.onboarding,
  },
  {
    stage: 'late',
    matchKind: 'guideContext',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.guides,
  },
  {
    stage: 'late',
    matchKind: 'connectionContext',
    action: XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS.connections,
  },
] as const satisfies readonly XenesisNaturalConnectionAggregateStatusRule[];

export const XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS = {
  routing: {
    path: 'xd.xenesis.providers.routing.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-routing-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider routing from natural language request.`,
  },
  profileDrafts: {
    path: 'xd.xenesis.providers.profileDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider profile draft from natural language request.`,
  },
  views: {
    path: 'xd.xenesis.providers.views.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-view-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider view from natural language request.`,
  },
  setup: {
    path: 'xd.xenesis.providers.setup.open',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-setup-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} provider setup from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS = {
  routing: {
    path: 'xd.xenesis.providers.routing.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-routing-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} provider routing status from natural language request.`,
  },
  views: {
    path: 'xd.xenesis.providers.views.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-view-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} provider view status from natural language request.`,
  },
  profileDrafts: {
    path: 'xd.xenesis.providers.profileDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} provider profile draft status from natural language request.`,
  },
  setup: {
    path: 'xd.xenesis.providers.setup.status',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-setup-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} provider setup status from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_PROVIDER_STATUS_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.routing,
    argsKind: 'provider',
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.views,
    argsKind: 'provider',
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.profileDrafts,
    argsKind: 'provider',
  },
  {
    contextWords: [],
    action: XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS.setup,
    argsKind: 'provider',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_PROVIDER_OPEN_RULES = [
  {
    contextWords: XENESIS_NATURAL_ROUTING_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.routing,
    argsKind: 'providerVisible',
  },
  {
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.profileDrafts,
    argsKind: 'providerVisible',
  },
  {
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.views,
    argsKind: 'providerVisible',
  },
  {
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS.setup,
    argsKind: 'providerVisible',
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS = {
  diagnostics: {
    path: 'xd.xenesis.connections.diagnostics.status',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-diagnostics-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} connection diagnostics from natural language request.`,
  },
  setupRequest: {
    path: 'xd.xenesis.connections.setupRequests.status',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-request-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} connection setup request status from natural language request.`,
  },
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} MCP install draft status from natural language request.`,
  },
  toolOauthDraft: {
    path: 'xd.xenesis.tools.oauthDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-draft-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} OAuth draft status from natural language request.`,
  },
  toolUserStory: {
    path: 'xd.xenesis.tools.userStories.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-user-story-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool user story status from natural language request.`,
  },
  toolActionPolicy: {
    path: 'xd.xenesis.tools.actions.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-action-policy-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool action policy status from natural language request.`,
  },
  toolInstallPlan: {
    path: 'xd.xenesis.tools.installPlans.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-install-plan-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool install plan status from natural language request.`,
  },
  toolSetup: {
    path: 'xd.xenesis.tools.setup.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-setup-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool setup status from natural language request.`,
  },
  toolConnector: {
    path: 'xd.xenesis.tools.connectors.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-connector-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool connector status from natural language request.`,
  },
  toolView: {
    path: 'xd.xenesis.tools.views.status',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-view-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} tool view status from natural language request.`,
  },
  channelRouting: {
    path: 'xd.xenesis.channels.routing.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-routing-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel routing status from natural language request.`,
  },
  channelSafety: {
    path: 'xd.xenesis.channels.safety.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-safety-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel safety status from natural language request.`,
  },
  channelAccessGroups: {
    path: 'xd.xenesis.channels.accessGroups.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-access-groups-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} channel access groups status from natural language request.`,
  },
  channelPairing: {
    path: 'xd.xenesis.channels.pairing.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-pairing-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel pairing status from natural language request.`,
  },
  channelUserStory: {
    path: 'xd.xenesis.channels.userStories.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-user-story-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} channel user story status from natural language request.`,
  },
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.status',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-status-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Read ${label} channel profile draft status from natural language request.`,
  },
  messengerView: {
    path: 'xd.xenesis.messengers.views.status',
    idFor: (id: string, _label: string) => `natural-xenesis-messenger-view-status-${id}`,
    reasonFor: (_id: string, label: string) => `Read ${label} messenger view status from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES = [
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.diagnostics,
    argsKind: 'targetId',
  },
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.setupRequest,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'tool',
  },
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolOauthDraft,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolUserStory,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolActionPolicy,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolInstallPlan,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolSetup,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolConnector,
    argsKind: 'tool',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.toolView,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelRouting,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelSafety,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelAccessGroups,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelPairing,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelUserStory,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channel',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_VIEW_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.messengerView,
    argsKind: 'targetId',
  },
  {
    targetScope: 'any',
    contextWords: [],
    action: XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS.diagnostics,
    argsKind: 'targetId',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS = {
  diagnostics: {
    path: 'xd.xenesis.connections.diagnostics.open',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-diagnostics-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} connection diagnostics from natural language request.`,
  },
  setupRequest: {
    path: 'xd.xenesis.connections.setupRequests.open',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-request-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} connection setup request from natural language request.`,
  },
  toolOauthDraft: {
    path: 'xd.xenesis.tools.oauthDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} OAuth draft from natural language request.`,
  },
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} MCP install draft from natural language request.`,
  },
  toolUserStory: {
    path: 'xd.xenesis.tools.userStories.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-user-story-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool user story from natural language request.`,
  },
  toolActionPolicy: {
    path: 'xd.xenesis.tools.actions.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-action-policy-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool action policy from natural language request.`,
  },
  toolInstallPlan: {
    path: 'xd.xenesis.tools.installPlans.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-install-plan-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool install plan from natural language request.`,
  },
  toolConnector: {
    path: 'xd.xenesis.tools.connectors.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-connector-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool connector from natural language request.`,
  },
  toolSetup: {
    path: 'xd.xenesis.tools.setup.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-setup-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool setup from natural language request.`,
  },
  toolView: {
    path: 'xd.xenesis.tools.views.open',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-view-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} tool view from natural language request.`,
  },
  channelUserStory: {
    path: 'xd.xenesis.channels.userStories.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-user-story-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel user story from natural language request.`,
  },
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel profile draft from natural language request.`,
  },
  channelRouting: {
    path: 'xd.xenesis.channels.routing.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-routing-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel routing from natural language request.`,
  },
  channelSafety: {
    path: 'xd.xenesis.channels.safety.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-safety-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel safety from natural language request.`,
  },
  channelAccessGroups: {
    path: 'xd.xenesis.channels.accessGroups.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-access-groups-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel access groups from natural language request.`,
  },
  channelPairing: {
    path: 'xd.xenesis.channels.pairing.open',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-pairing-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} channel pairing from natural language request.`,
  },
  messengerView: {
    path: 'xd.xenesis.messengers.views.open',
    idFor: (id: string, _label: string) => `natural-xenesis-messenger-view-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} messenger view from natural language request.`,
  },
  connectionCard: {
    path: 'xd.xenesis.connections.open',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-open-${id}`,
    reasonFor: (_id: string, label: string) => `Open ${label} connection card from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES = [
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.diagnostics,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'any',
    contextWords: XENESIS_NATURAL_CONNECTION_SETUP_REQUEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.setupRequest,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolOauthDraft,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolUserStory,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolActionPolicy,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolInstallPlan,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_CONNECTOR_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolConnector,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_SETUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolSetup,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_VIEW_SURFACE_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.toolView,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_USER_STORY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelUserStory,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_PROFILE_DRAFT_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_ROUTING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelRouting,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_SAFETY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelSafety,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_ACCESS_GROUP_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelAccessGroups,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_PAIRING_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.channelPairing,
    argsKind: 'channelVisible',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_MESSENGER_VIEW_OPEN_FALLBACK_CONTEXT_WORDS,
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.messengerView,
    argsKind: 'targetIdVisible',
  },
  {
    targetScope: 'any',
    contextWords: [],
    action: XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS.connectionCard,
    argsKind: 'targetIdVisible',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

export const XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS = {
  providerProfileDraft: {
    path: 'xd.xenesis.providers.profileDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-provider-profile-draft-request-${id}`,
    reasonFor: (id: string, label: string) =>
      id === 'auto'
        ? 'Request AI provider profile draft review from natural language request.'
        : `Request ${label} provider profile draft review from natural language request.`,
  },
  toolInstallPlan: {
    path: 'xd.xenesis.tools.installPlans.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-install-plan-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} tool install plan review from natural language request.`,
  },
  toolMcpInstallDraft: {
    path: 'xd.xenesis.tools.mcpInstallDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-mcp-install-draft-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} MCP install draft review from natural language request.`,
  },
  toolOauthDraft: {
    path: 'xd.xenesis.tools.oauthDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-oauth-draft-request-${id}`,
    reasonFor: (_id: string, label: string) => `Request ${label} OAuth draft review from natural language request.`,
  },
  toolActionPolicy: {
    path: 'xd.xenesis.tools.actions.request',
    idFor: (id: string, _label: string) => `natural-xenesis-tool-action-policy-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} tool action policy review from natural language request.`,
  },
  channelProfileDraft: {
    path: 'xd.xenesis.channels.profileDrafts.request',
    idFor: (id: string, _label: string) => `natural-xenesis-channel-profile-draft-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} channel profile draft review from natural language request.`,
  },
  connectionSetupRequest: {
    path: 'xd.xenesis.connections.setupRequests.request',
    idFor: (id: string, _label: string) => `natural-xenesis-connection-setup-request-${id}`,
    reasonFor: (_id: string, label: string) =>
      `Request ${label} connection setup review from natural language request.`,
  },
} as const satisfies Record<string, XenesisNaturalDeskActionTemplateDescriptor<[string, string]>>;

export const XENESIS_NATURAL_REVIEW_REQUEST_PROVIDER_RULES = [
  {
    contextWords: [],
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.providerProfileDraft,
    argsKind: 'provider',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalProviderActionRule[];

export const XENESIS_NATURAL_REVIEW_REQUEST_TARGET_RULES = [
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_INSTALL_PLAN_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolInstallPlan,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_MCP_INSTALL_REVIEW_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolMcpInstallDraft,
    argsKind: 'targetId',
  },
  {
    targetScope: 'planned-google-tool',
    contextWords: XENESIS_NATURAL_OAUTH_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolOauthDraft,
    argsKind: 'targetId',
  },
  {
    targetScope: 'tool',
    contextWords: XENESIS_NATURAL_ACTION_POLICY_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.toolActionPolicy,
    argsKind: 'targetId',
  },
  {
    targetScope: 'messenger',
    contextWords: XENESIS_NATURAL_CHANNEL_PROFILE_DRAFT_REQUEST_CONTEXT_WORDS,
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.channelProfileDraft,
    argsKind: 'channel',
  },
  {
    targetScope: 'any',
    contextWords: [],
    action: XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS.connectionSetupRequest,
    argsKind: 'targetId',
    fallback: true,
  },
] as const satisfies readonly XenesisNaturalConnectionTargetActionRule[];

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

export const XENESIS_NATURAL_GUIDE_TARGETS: readonly XenesisNaturalGuideTarget[] = [
  {
    id: 'agent-user-stories',
    label: 'Agent user stories',
    words: ['user story', 'user stories', '사용자 스토리', '스토리', 'hermes story', '헤르메스 스토리'],
    requiredWordGroups: [['hermes', '헤르메스']],
    blockedByMatchedTargetIds: ['external-tool-integrations', 'openclaw-channel-setup'],
  },
  {
    id: 'external-tool-integrations',
    label: 'External tool integrations',
    words: [
      'external tool',
      'external tools',
      'tool integration',
      'tool integrations',
      'mcp tool',
      'mcp tools',
      'hermes integration',
      'hermes integrations',
      '헤르메스 통합',
      '외부 도구',
      '도구 통합',
      'oauth',
      'connector',
      '커넥터',
      'google workspace',
      'google drive',
      'google docs',
      'google calendar',
      '구글 워크스페이스',
      '구글 드라이브',
      '구글 독스',
      '구글 캘린더',
      'notion',
      '노션',
      'linear',
      '리니어',
      'fetch',
      'filesystem',
      '파일 시스템',
      '파일시스템',
    ],
    requiredWordGroups: [
      ['integration', 'integrations', '통합'],
      [
        'tool',
        'tools',
        '도구',
        'mcp',
        'oauth',
        'google',
        '구글',
        'notion',
        '노션',
        'linear',
        '리니어',
        'hermes',
        '헤르메스',
      ],
    ],
  },
  {
    id: 'openclaw-channel-setup',
    label: 'OpenClaw-style channel setup',
    words: [
      'openclaw',
      '오픈클로',
      '오픈클로우',
      'channel',
      'channels',
      '채널',
      'messenger',
      'messengers',
      '메신저',
      'access group',
      'access groups',
      '액세스 그룹',
      '접근 그룹',
      'routing',
      '라우팅',
      'pairing',
      '페어링',
      'troubleshooting',
      'troubleshoot',
      '문제 해결',
      'telegram',
      '텔레그램',
      'slack',
      '슬랙',
      'discord',
      '디스코드',
      'whatsapp',
      '왓츠앱',
      'google chat',
      '구글 챗',
    ],
    requiredWordGroups: [
      ['integration', 'integrations', '통합'],
      ['channel', 'channels', '채널', 'messenger', 'messengers', '메신저'],
    ],
  },
  {
    id: 'cr-mcp-gateway-bots',
    label: 'Capability Registry, MCP, gateway, and bots',
    words: ['cr', 'mcp', 'gateway', '게이트웨이', 'bot', '봇'],
  },
  {
    id: 'onboarding-connections',
    label: 'Onboarding and connections',
    words: [],
    fallback: true,
  },
] as const;

export const XENESIS_NATURAL_ONBOARDING_STEP_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  {
    id: 'first-chat',
    label: 'First chat',
    words: ['first chat', '첫 채팅', '첫채팅', '첫 응답', 'first response'],
  },
  {
    id: 'local-cli-mcp',
    label: 'Local CLI and MCP',
    words: ['local cli', '로컬 cli', 'local-cli', 'mcp', 'mcp bridge', 'mcp 브리지', '로컬 런타임'],
  },
  {
    id: 'recommended-tools',
    label: 'Recommended tools',
    words: ['recommended tools', '추천 도구', '외부 도구', 'external tools', 'tool onboarding', '도구 온보딩'],
  },
  {
    id: 'gateway',
    label: 'Gateway',
    words: ['gateway', '게이트웨이'],
  },
  {
    id: 'messenger-routing',
    label: 'Messenger routing',
    words: ['messenger routing', '메신저 라우팅', 'channel routing', '채널 라우팅', 'external bots', '외부 봇'],
  },
  {
    id: 'test-send',
    label: 'End-to-end test',
    words: ['end-to-end', 'e2e', '엔드투엔드', 'test send', '테스트 전송', '최종 테스트'],
  },
] as const;

export const XENESIS_NATURAL_CONNECTION_TARGETS: readonly XenesisNaturalConnectionTarget[] = [
  { id: 'notion', label: 'Notion', kind: 'tool', supportLevel: 'manual', words: ['notion', '노션'] },
  {
    id: 'google-calendar',
    label: 'Google Calendar',
    kind: 'tool',
    supportLevel: 'planned',
    words: ['google calendar', '구글 캘린더', '캘린더'],
  },
  {
    id: 'google-workspace',
    label: 'Google Workspace',
    kind: 'tool',
    supportLevel: 'planned',
    words: [
      'google workspace',
      '구글 워크스페이스',
      'gmail',
      '지메일',
      'google docs',
      'google drive',
      '구글 문서',
      '구글 독스',
      '구글 드라이브',
      'workspace',
      '워크스페이스',
    ],
  },
  { id: 'github', label: 'GitHub', kind: 'tool', supportLevel: 'manual', words: ['github', '깃허브'] },
  { id: 'linear', label: 'Linear', kind: 'tool', supportLevel: 'manual', words: ['linear', '리니어'] },
  {
    id: 'fetch',
    label: 'Fetch',
    kind: 'tool',
    supportLevel: 'manual',
    words: [
      'fetch',
      '웹 fetch',
      '웹 가져오기',
      'web page fetch',
      'webpage fetch',
      '웹페이지 가져오기',
      '웹 페이지 가져오기',
    ],
  },
  {
    id: 'filesystem',
    label: 'Filesystem',
    kind: 'tool',
    supportLevel: 'manual',
    words: ['filesystem', 'file system', '파일시스템', '파일 시스템', 'workspace files', '워크스페이스 파일'],
  },
  {
    id: 'telegram',
    label: 'Telegram',
    kind: 'messenger',
    supportLevel: 'implemented',
    words: ['telegram', '텔레그램'],
  },
  { id: 'slack', label: 'Slack', kind: 'messenger', supportLevel: 'implemented', words: ['slack', '슬랙'] },
  { id: 'discord', label: 'Discord', kind: 'messenger', supportLevel: 'implemented', words: ['discord', '디스코드'] },
  { id: 'webhook', label: 'Webhook', kind: 'messenger', supportLevel: 'implemented', words: ['webhook', '웹훅'] },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['whatsapp', '왓츠앱', '와츠앱'],
  },
  { id: 'signal', label: 'Signal', kind: 'messenger', supportLevel: 'planned', words: ['signal', '시그널'] },
  {
    id: 'microsoft-teams',
    label: 'Microsoft Teams',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['microsoft teams', 'microsoft-teams', 'ms teams', 'teams', '팀즈', '마이크로소프트 팀즈'],
  },
  {
    id: 'google-chat',
    label: 'Google Chat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['google chat', 'google-chat', '구글 챗', '구글 채팅'],
  },
  {
    id: 'imessage',
    label: 'iMessage',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['imessage', '아이메시지', '아이메세지', 'bluebubbles', '블루버블'],
  },
  { id: 'matrix', label: 'Matrix', kind: 'messenger', supportLevel: 'planned', words: ['matrix', '매트릭스'] },
  { id: 'irc', label: 'IRC', kind: 'messenger', supportLevel: 'planned', words: ['irc', '아이알씨'] },
  {
    id: 'mattermost',
    label: 'Mattermost',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['mattermost', '매터모스트'],
  },
  {
    id: 'nextcloud-talk',
    label: 'Nextcloud Talk',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['nextcloud talk', 'nextcloud-talk', '넥스트클라우드 톡', '넥스트클라우드 토크'],
  },
  { id: 'nostr', label: 'Nostr', kind: 'messenger', supportLevel: 'planned', words: ['nostr', '노스트르'] },
  { id: 'raft', label: 'Raft', kind: 'messenger', supportLevel: 'planned', words: ['raft', '래프트'] },
  { id: 'tlon', label: 'Tlon', kind: 'messenger', supportLevel: 'planned', words: ['tlon', '틀론'] },
  {
    id: 'synology-chat',
    label: 'Synology Chat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['synology chat', 'synology-chat', '시놀로지 챗', '시놀로지 채팅'],
  },
  {
    id: 'rocket-chat',
    label: 'Rocket.Chat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['rocket chat', 'rocket-chat', 'rocketchat', '로켓챗', '로켓 채팅'],
  },
  { id: 'twitch', label: 'Twitch', kind: 'messenger', supportLevel: 'planned', words: ['twitch', '트위치'] },
  { id: 'line', label: 'LINE', kind: 'messenger', supportLevel: 'planned', words: ['line', '라인'] },
  {
    id: 'wechat',
    label: 'WeChat',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['wechat', 'weixin', '위챗', '웨이신'],
  },
  {
    id: 'qqbot',
    label: 'QQ Bot',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['qqbot', 'qq bot', 'qq 봇', '큐큐봇'],
  },
  {
    id: 'feishu',
    label: 'Feishu / Lark',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['feishu', 'lark', '페이슈', '페이수', '라크'],
  },
  {
    id: 'dingding',
    label: 'DingTalk / Dingding',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['dingtalk', 'ding talk', 'dingding', '딩톡', '딩딩'],
  },
  { id: 'yuanbao', label: 'Yuanbao', kind: 'messenger', supportLevel: 'planned', words: ['yuanbao', '위안바오'] },
  { id: 'zalo', label: 'Zalo', kind: 'messenger', supportLevel: 'planned', words: ['zalo', '잘로'] },
  {
    id: 'email',
    label: 'Email',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['email', '이메일', 'mailbox', '메일박스', '메일'],
  },
  {
    id: 'sms',
    label: 'SMS',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['sms', '문자 메시지', '문자메시지', '문자'],
  },
  {
    id: 'home-assistant',
    label: 'Home Assistant',
    kind: 'messenger',
    supportLevel: 'planned',
    words: ['home assistant', 'home-assistant', '홈 어시스턴트', '홈어시스턴트'],
  },
  { id: 'ntfy', label: 'ntfy', kind: 'messenger', supportLevel: 'planned', words: ['ntfy', '엔티파이'] },
] as const;

export const XENESIS_NATURAL_PROVIDER_TARGETS: readonly XenesisNaturalWordsTarget[] = [
  {
    id: 'codex-app-server',
    label: 'codex-app-server',
    words: ['codex app-server', 'codex-app-server', 'codex app server', 'app-server', 'app server'],
  },
  { id: 'codex-cli', label: 'codex-cli', words: ['codex cli', 'codex-cli'] },
  { id: 'claude-cli', label: 'claude-cli', words: ['claude cli', 'claude-cli'] },
  {
    id: 'claude-interactive',
    label: 'claude-interactive',
    words: ['claude interactive', 'claude-interactive', '클로드 interactive', '클로드 인터랙티브'],
  },
  { id: 'azure', label: 'azure', words: ['azure openai', 'azure-openai', 'azure', '애저 오픈ai', '애저 오픈 ai'] },
  { id: 'openai', label: 'openai', words: ['openai', '오픈ai', '오픈 ai'] },
  { id: 'anthropic', label: 'anthropic', words: ['anthropic', 'anthropic claude', '앤트로픽'] },
  { id: 'gemini', label: 'gemini', words: ['gemini', '제미나이'] },
  { id: 'groq', label: 'groq', words: ['groq', '그록'] },
  { id: 'deepseek', label: 'deepseek', words: ['deepseek', 'deep seek', '딥시크'] },
  { id: 'qwen', label: 'qwen', words: ['qwen', 'dashscope', 'dash scope', '큐원', '큐웬'] },
  { id: 'ollama', label: 'ollama', words: ['ollama', '올라마'] },
  { id: 'lmstudio', label: 'lmstudio', words: ['lm studio', 'lmstudio', 'lm-studio', '엘엠 스튜디오'] },
  { id: 'together', label: 'together', words: ['together ai', 'together', '투게더'] },
  { id: 'fireworks', label: 'fireworks', words: ['fireworks ai', 'fireworks', '파이어웍스'] },
  { id: 'auto', label: 'auto', words: ['auto', '자동'] },
] as const;

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

export function buildXenesisNaturalAction(
  id: string,
  path: string,
  args: unknown,
  reason: string,
): XenesisNaturalDeskActionRequest {
  return { id, path, args, approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending, reason };
}

export function buildXenesisNaturalCatalogAction(
  descriptor: XenesisNaturalDeskActionDescriptor,
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisNaturalDeskActionRequest {
  return buildXenesisNaturalAction(descriptor.id, descriptor.path, args, descriptor.reason);
}

export function buildXenesisNaturalTemplateAction<TArgs extends unknown[]>(
  descriptor: XenesisNaturalDeskActionTemplateDescriptor<TArgs>,
  templateArgs: TArgs,
  args: unknown,
): XenesisNaturalDeskActionRequest {
  return buildXenesisNaturalAction(
    descriptor.idFor(...templateArgs),
    descriptor.path,
    args,
    descriptor.reasonFor(...templateArgs),
  );
}

export function buildXenesisNaturalCoreToolOpenAction(
  definition: XenesisNaturalCoreToolTarget,
  placement: string | undefined,
): XenesisNaturalDeskActionRequest {
  return {
    id: definition.id,
    path: definition.path,
    args: XENESIS_NATURAL_DESK_ACTION_ARGS.placement(placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement),
    approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending,
    reason: XENESIS_NATURAL_CORE_TOOL_OPEN_REASON(definition.reasonName),
  };
}

export function buildXenesisNaturalViewOpenAction(
  view: Pick<XenesisNaturalViewTarget, 'id' | 'kind' | 'reason'>,
  placement: string | undefined,
): XenesisNaturalDeskActionRequest {
  return {
    id: view.id,
    path: XENESIS_NATURAL_VIEW_OPEN_PATH,
    args: XENESIS_NATURAL_DESK_ACTION_ARGS.withPlacement(
      XENESIS_NATURAL_DESK_ACTION_ARGS.viewKind(view.kind),
      placement || XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS.placement,
    ),
    approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending,
    reason: view.reason,
  };
}

export function findXenesisNaturalCatalogRuleAction(
  value: string,
  rules: readonly XenesisNaturalCatalogActionRule[],
  args: unknown = XENESIS_NATURAL_DESK_ACTION_ARGS.empty(),
): XenesisNaturalDeskActionRequest | null {
  const rule = findXenesisNaturalContextRule(value, rules);
  return rule ? buildXenesisNaturalCatalogAction(rule.action, args) : null;
}

export function xenesisNaturalConnectionTargetMatchesRule(
  target: XenesisNaturalConnectionTarget,
  rule: XenesisNaturalConnectionTargetActionRule,
): boolean {
  if (rule.targetScope === 'any') return true;
  if (rule.targetScope === 'tool') return isXenesisNaturalConnectionToolTarget(target);
  if (rule.targetScope === 'messenger') return isXenesisNaturalConnectionMessengerTarget(target);
  return isXenesisNaturalPlannedGoogleToolTarget(target);
}

export function buildXenesisNaturalConnectionTargetArgsForRule(
  rule: XenesisNaturalConnectionTargetActionRule,
  target: XenesisNaturalConnectionTarget,
): unknown {
  if (rule.argsKind === 'targetId') return XENESIS_NATURAL_DESK_ACTION_ARGS.targetId(target.id);
  if (rule.argsKind === 'targetIdVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.targetIdVisible(target.id);
  if (rule.argsKind === 'tool') return XENESIS_NATURAL_DESK_ACTION_ARGS.tool(target.id);
  if (rule.argsKind === 'channelVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.channelVisible(target.id);
  return XENESIS_NATURAL_DESK_ACTION_ARGS.channel(target.id);
}

export function findXenesisNaturalConnectionTargetRuleAction(
  value: string,
  target: XenesisNaturalConnectionTarget,
  rules: readonly XenesisNaturalConnectionTargetActionRule[],
): XenesisNaturalDeskActionRequest | null {
  for (const rule of rules) {
    if (!xenesisNaturalConnectionTargetMatchesRule(target, rule)) continue;
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;
    return buildXenesisNaturalTemplateAction(
      rule.action,
      [target.id, target.label],
      buildXenesisNaturalConnectionTargetArgsForRule(rule, target),
    );
  }

  return null;
}

export function buildXenesisNaturalProviderArgsForRule(
  rule: XenesisNaturalProviderActionRule,
  provider: Pick<XenesisNaturalWordsTarget, 'id'>,
): unknown {
  if (rule.argsKind === 'providerVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.providerVisible(provider.id);
  return XENESIS_NATURAL_DESK_ACTION_ARGS.provider(provider.id);
}

export function findXenesisNaturalProviderRuleAction(
  value: string,
  provider: Pick<XenesisNaturalWordsTarget, 'id' | 'label'>,
  rules: readonly XenesisNaturalProviderActionRule[],
): XenesisNaturalDeskActionRequest | null {
  for (const rule of rules) {
    if (!matchesXenesisNaturalContextRule(value, rule)) continue;
    return buildXenesisNaturalTemplateAction(
      rule.action,
      [provider.id, provider.label],
      buildXenesisNaturalProviderArgsForRule(rule, provider),
    );
  }

  return null;
}

export function buildXenesisNaturalOnboardingArgsForRule(
  rule: XenesisNaturalOnboardingActionRule,
  id?: string,
): unknown {
  if (rule.argsKind === 'ensureVisible') return XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible();
  if (rule.argsKind === 'targetIdVisible') {
    return XENESIS_NATURAL_DESK_ACTION_ARGS.targetIdVisible(id || XENESIS_NATURAL_TEXT_DEFAULTS.empty);
  }
  return XENESIS_NATURAL_DESK_ACTION_ARGS.targetId(id || XENESIS_NATURAL_TEXT_DEFAULTS.empty);
}

export function matchesXenesisNaturalConnectionAggregateRule(
  value: string,
  matchKind: XenesisNaturalConnectionAggregateRuleMatchKind,
): boolean {
  return matchesXenesisNaturalContextRules(value, XENESIS_NATURAL_CONNECTION_AGGREGATE_MATCH_RULES[matchKind]);
}

export function findXenesisNaturalConnectionAggregateStatusAction(
  value: string,
  stage: XenesisNaturalConnectionAggregateStatusRuleStage,
): XenesisNaturalDeskActionRequest | null {
  for (const rule of XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES) {
    if (rule.stage !== stage) continue;
    if (!matchesXenesisNaturalConnectionAggregateRule(value, rule.matchKind)) continue;
    return buildXenesisNaturalCatalogAction(rule.action);
  }

  return null;
}

export function findXenesisNaturalConnectionAggregateOpenAction(
  value: string,
  stage: XenesisNaturalConnectionAggregateOpenRuleStage,
): XenesisNaturalDeskActionRequest | null {
  for (const rule of XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES) {
    if (rule.stage !== stage) continue;
    if (!matchesXenesisNaturalConnectionAggregateRule(value, rule.matchKind)) continue;
    return buildXenesisNaturalCatalogAction(rule.action, XENESIS_NATURAL_DESK_ACTION_ARGS.ensureVisible());
  }

  return null;
}
