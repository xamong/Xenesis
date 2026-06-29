export interface XenesisDeskActionRequest {
  id: string;
  path: string;
  args: unknown;
  approved: boolean;
  reason?: string;
}

export interface XenesisDeskActionParseResult {
  visibleText: string;
  actions: XenesisDeskActionRequest[];
  errors: string[];
}

export interface XenesisDeskActionRecordNormalizeResult {
  action?: XenesisDeskActionRequest;
  error?: string;
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
  const actions: XenesisDeskActionRequest[] = [];
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
  actions: readonly XenesisDeskActionRequest[],
  results: readonly XenesisDeskActionApprovalResultInput[],
): XenesisDeskActionRequest[] {
  const actionById = new Map(actions.map((action) => [action.id, action]));
  return results
    .filter(isXenesisDeskActionApprovalRequiredResult)
    .map((result) => actionById.get(result.id))
    .filter((action): action is XenesisDeskActionRequest => Boolean(action))
    .map((action) => ({ ...action, approved: XENESIS_DESK_ACTION_APPROVAL_STATE.pending }));
}

export function approveXenesisDeskActions(actions: readonly XenesisDeskActionRequest[]): XenesisDeskActionRequest[] {
  return actions.map((action) => ({ ...action, approved: XENESIS_DESK_ACTION_APPROVAL_STATE.approved }));
}
