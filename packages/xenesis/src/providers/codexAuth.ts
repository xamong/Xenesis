import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// The embedded Desk "codex-responses" provider talks to the ChatGPT Codex backend
// directly using the OAuth token the codex CLI already stores in ~/.codex/auth.json
// (no api key). This reads that file. Live structure (verified):
//   { auth_mode, OPENAI_API_KEY|null, last_refresh,
//     tokens: { id_token, access_token, refresh_token, account_id } }
// account_id also appears inside the access_token JWT under the
// "https://api.openai.com/auth" claim as chatgpt_account_id (fallback).

const AUTH_CLAIM = "https://api.openai.com/auth";

export interface CodexAuth {
  accessToken: string;
  accountId: string;
  refreshToken?: string;
  lastRefresh?: string;
}

export function defaultCodexAuthPath(): string {
  const home = process.env.CODEX_HOME;
  return home ? join(home, "auth.json") : join(homedir(), ".codex", "auth.json");
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1] ?? "", "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function codexAccountIdFromToken(token: string): string | null {
  const claim = decodeJwtPayload(token)?.[AUTH_CLAIM];
  const id =
    claim && typeof claim === "object"
      ? (claim as Record<string, unknown>).chatgpt_account_id
      : undefined;
  return typeof id === "string" && id.length > 0 ? id : null;
}

export function isCodexTokenExpired(token: string, skewSeconds = 60): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  if (typeof exp !== "number") return false; // unknown -> let the server decide
  return Date.now() / 1000 >= exp - skewSeconds;
}

export function readCodexAuth(path: string = defaultCodexAuthPath()): CodexAuth {
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    tokens?: { access_token?: string; account_id?: string; refresh_token?: string };
    last_refresh?: string;
  };
  const accessToken = raw.tokens?.access_token;
  if (!accessToken) {
    throw new Error(`Codex auth at ${path} has no tokens.access_token (run 'codex login').`);
  }
  const accountId = raw.tokens?.account_id ?? codexAccountIdFromToken(accessToken);
  if (!accountId) {
    throw new Error(`Codex auth at ${path} has no account id (tokens.account_id or JWT claim).`);
  }
  return {
    accessToken,
    accountId,
    refreshToken: raw.tokens?.refresh_token,
    lastRefresh: raw.last_refresh
  };
}
