const VISION_PATTERNS: RegExp[] = [
  /claude-3/i,
  /claude-3-5/i,
  /claude-opus-4/i,
  /claude-sonnet-4/i,
  /claude-haiku-4/i,
  /gpt-4o/i,
  /gpt-4\.1/i,
  /gpt-4-vision/i,
  /gpt-4-turbo/i,
  // o1 only when NOT followed by "-mini" (o1-mini is text-only)
  /^o1(?!-mini)/i,
  /^o3\b/i,
  /^o4\b/i,
  /gemini/i,
];

export function supportsVision(model: string, _provider?: string): boolean {
  if (process.env.XENESIS_FORCE_VISION === "1") return true;
  if (!model) return false;
  return VISION_PATTERNS.some((re) => re.test(model));
}
