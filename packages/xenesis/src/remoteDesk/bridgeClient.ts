import type { RemoteDeskBridge } from "./types.js";

export interface RemoteDeskBridgeClientOptions {
  baseUrl?: string;
  token?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class RemoteDeskBridgeClient implements RemoteDeskBridge {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(options: RemoteDeskBridgeClientOptions = {}) {
    this.baseUrl = String(options.baseUrl ?? "").trim().replace(/\/+$/, "");
    this.token = String(options.token ?? "").trim();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async callCapability(path: string, args: Record<string, unknown> = {}, options: { approved?: boolean; timeoutMs?: number } = {}) {
    if (!this.baseUrl) {
      return { ok: false, error: "Xenesis Desk bridge URL is not configured." };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/capabilities/call`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {})
        },
        body: JSON.stringify({
          path,
          args,
          source: "xenesis-remote-desk",
          approved: options.approved === true
        }),
        signal: controller.signal
      });
      const text = await response.text();
      const payload = parsePayload(text);
      if (!response.ok && payload.ok !== false) {
        return { ...payload, ok: false, error: `Xenesis Desk bridge HTTP ${response.status}: ${response.statusText}` };
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }
}

function parsePayload(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return { ok: false, error: String(parsed) };
  } catch {
    return { ok: false, error: text };
  }
}

export function createRemoteDeskBridgeFromEnv(env: NodeJS.ProcessEnv | undefined): RemoteDeskBridgeClient {
  return new RemoteDeskBridgeClient({
    baseUrl: env?.XENIS_MCP_BRIDGE_URL,
    token: env?.XENIS_MCP_BRIDGE_TOKEN
  });
}
