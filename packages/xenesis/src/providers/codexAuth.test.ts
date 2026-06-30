import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codexAccountIdFromToken, isCodexTokenExpired, readCodexAuth } from './codexAuth.js';

// access_token JWT with auth claim chatgpt_account_id = "acc-jwt", exp far future
const JWT = [
  Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(
    JSON.stringify({ 'https://api.openai.com/auth': { chatgpt_account_id: 'acc-jwt' }, exp: 9999999999 }),
  ).toString('base64url'),
  'sig',
].join('.');

function writeAuth(obj: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'codex-auth-'));
  const p = join(dir, 'auth.json');
  writeFileSync(p, JSON.stringify(obj));
  return p;
}

describe('readCodexAuth', () => {
  it('parses tokens.access_token and tokens.account_id with the exact field names', () => {
    const p = writeAuth({
      auth_mode: 'chatgpt',
      OPENAI_API_KEY: null,
      tokens: { id_token: 'id', access_token: JWT, refresh_token: 'rt.1.xyz', account_id: 'acc-file' },
      last_refresh: '2026-06-23T08:22:39.581369100Z',
    });
    const auth = readCodexAuth(p);
    expect(auth.accessToken).toBe(JWT);
    expect(auth.accountId).toBe('acc-file'); // prefers tokens.account_id
    expect(auth.refreshToken).toBe('rt.1.xyz');
  });

  it('falls back to the JWT chatgpt_account_id claim when tokens.account_id is missing', () => {
    const p = writeAuth({ auth_mode: 'chatgpt', tokens: { access_token: JWT } });
    expect(readCodexAuth(p).accountId).toBe('acc-jwt');
  });

  it('throws a clear error when access_token is missing', () => {
    const p = writeAuth({ auth_mode: 'chatgpt', tokens: {} });
    expect(() => readCodexAuth(p)).toThrow(/no tokens.access_token/);
  });
});

describe('codexAccountIdFromToken', () => {
  it('decodes the auth claim', () => {
    expect(codexAccountIdFromToken(JWT)).toBe('acc-jwt');
  });
  it('returns null for a non-JWT string', () => {
    expect(codexAccountIdFromToken('not-a-jwt')).toBeNull();
  });
});

describe('isCodexTokenExpired', () => {
  it('is false for a future exp and true for a past exp', () => {
    expect(isCodexTokenExpired(JWT)).toBe(false);
    const past = JWT.split('.');
    past[1] = Buffer.from(JSON.stringify({ exp: 1 })).toString('base64url');
    expect(isCodexTokenExpired(past.join('.'))).toBe(true);
  });
});
