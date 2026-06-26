/** 자동 입력 전송을 즉시 차단해야 하는 위험 패턴 목록 */
const BUILTIN_DANGER_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'rm_rf', pattern: /\brm\s+-rf\b/i },
  { name: 'delete_all', pattern: /\bdelete\s+all\b/i },
  { name: 'drop_database', pattern: /\bdrop\s+database\b/i },
  { name: 'format_disk', pattern: /\bformat\s+(disk|drive|volume)\b/i },
  { name: 'env_file', pattern: /(^|[^\w])\.env([^\w]|$)/i },
  { name: 'api_key', pattern: /api[_ -]?key/i },
  { name: 'secret', pattern: /\bsecret\b/i },
  { name: 'credential', pattern: /credential/i },
  { name: 'private_key', pattern: /private\s+key/i },
];

/**
 * text 에서 위험 패턴이 감지되면 패턴 이름을 반환, 없으면 null.
 * extraPatterns: 사용자 설정에서 추가된 정규식 소스 문자열 목록.
 */
export function detectDanger(text: string, extraPatterns: string[] = []): string | null {
  for (const item of BUILTIN_DANGER_PATTERNS) {
    if (item.pattern.test(text)) return item.name;
  }
  for (const src of extraPatterns) {
    try {
      if (new RegExp(src, 'i').test(text)) return `custom:${src}`;
    } catch {
      // 잘못된 패턴은 무시
    }
  }
  return null;
}
