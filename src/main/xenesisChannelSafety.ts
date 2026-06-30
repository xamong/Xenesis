export interface XenesisChannelSendSensitiveValues {
  secrets?: readonly unknown[];
  targets?: readonly unknown[];
}

const SECRET_PLACEHOLDER = '[secret]';
const TARGET_PLACEHOLDER = '[target]';
const HTTP_URL_PATTERN = /\bhttps?:\/\/[^\s"'<>]+/gi;

function normalizeSensitiveValues(values: readonly unknown[] | undefined): string[] {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => String(value ?? '').trim())
        .filter(Boolean)
        .sort((left, right) => right.length - left.length),
    ),
  );
}

function stripOperationLabel(message: string, label: string): string {
  const trimmedMessage = message.trim();
  const trimmedLabel = label.trim();
  if (!trimmedLabel) return trimmedMessage;
  if (trimmedMessage === trimmedLabel) return '';
  if (!trimmedMessage.startsWith(trimmedLabel)) return trimmedMessage;
  return trimmedMessage
    .slice(trimmedLabel.length)
    .replace(/^\s*[:-]\s*/, '')
    .trim();
}

function redactLiteralValues(message: string, values: string[], placeholder: string): string {
  return values.reduce((current, value) => current.split(value).join(placeholder), message);
}

export function redactXenesisChannelTargetList(value: string): string {
  return value.trim() ? '<configured>' : '';
}

export function sanitizeXenesisChannelSendError(
  label: string,
  error: unknown,
  sensitiveValues: XenesisChannelSendSensitiveValues = {},
): Error {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const detail = stripOperationLabel(rawMessage, label).replace(HTTP_URL_PATTERN, SECRET_PLACEHOLDER).trim();
  const withoutSecrets = redactLiteralValues(
    detail,
    normalizeSensitiveValues(sensitiveValues.secrets),
    SECRET_PLACEHOLDER,
  );
  const withoutTargets = redactLiteralValues(
    withoutSecrets,
    normalizeSensitiveValues(sensitiveValues.targets),
    TARGET_PLACEHOLDER,
  );
  const sanitizedDetail = withoutTargets.trim();
  return new Error(sanitizedDetail ? `${label}: ${sanitizedDetail}` : label);
}
