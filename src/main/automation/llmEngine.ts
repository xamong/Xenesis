export interface LlmDecision {
  source: 'llm';
  input: string | null;
  reason: string;
  error?: boolean;
}

export class LlmEngine {
  private lastRunAt = 0;
  private readonly minIntervalMs = 8000;

  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  get enabled(): boolean {
    return Boolean(this.apiKey);
  }

  /** API 키/모델 동적 갱신 (설정 변경 시 호출) */
  update(apiKey: string, model: string): void {
    this.apiKey = apiKey;
    this.model = model;
  }

  private shouldAsk(text: string): boolean {
    return /(\?|y\/n|yes\/no|select an option|choose|approve|continue|proceed|failed|error)/i.test(text);
  }

  async decide(text: string): Promise<LlmDecision | null> {
    if (!this.enabled) return null;
    if (!this.shouldAsk(text)) return null;

    const now = Date.now();
    if (now - this.lastRunAt < this.minIntervalMs) return null;
    this.lastRunAt = now;

    const prompt =
      `You are controlling a local terminal running an AI coding CLI (Codex, Claude, etc).\n\n` +
      `Decide whether to send an automatic input.\n\n` +
      `Rules:\n` +
      `- Only answer with strict JSON.\n` +
      `- If unsafe, ambiguous, or destructive, return {"action":"none","reason":"..."}.\n` +
      `- Do not approve deletion, credential access, .env access, rm -rf, database drop, or irreversible changes.\n` +
      `- Prefer no action unless the prompt is clearly asking for harmless continuation, ` +
      `selecting a safe default, or asking the CLI to fix a normal build/test error.\n\n` +
      `JSON schema:\n{ "action": "input" | "none", "input": string, "reason": string }\n\n` +
      `Terminal output tail:\n---\n${text.slice(-6000)}\n---`;

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: prompt, temperature: 0 }),
      });

      if (!response.ok) {
        return { source: 'llm', input: null, reason: `LLM request failed: ${response.status}`, error: true };
      }

      const json = (await response.json()) as Record<string, unknown>;
      const textOut = extractOutputText(json);
      const decision = safeParseJson(textOut) as { action?: string; input?: string; reason?: string } | null;
      if (!decision || decision.action !== 'input' || !decision.input) return null;

      return {
        source: 'llm',
        input: normalizeInput(decision.input),
        reason: decision.reason ?? 'LLM decided to send input.',
      };
    } catch (err) {
      return { source: 'llm', input: null, reason: (err as Error).message, error: true };
    }
  }
}

function extractOutputText(responseJson: Record<string, unknown>): string {
  if (typeof responseJson.output_text === 'string') return responseJson.output_text;
  const output = (responseJson.output as { content?: { type?: string; text?: string }[] }[] | undefined) ?? [];
  const parts: string[] = [];
  for (const item of output) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) parts.push(content.text);
    }
  }
  return parts.join('\n');
}

function safeParseJson(raw: string): unknown {
  if (!raw) return null;
  const trimmed = raw
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeInput(input: string): string {
  if (input.endsWith('\r') || input.endsWith('\n')) return input;
  return input + '\r';
}
