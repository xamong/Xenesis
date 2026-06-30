import type { XenesisConfig } from '../../config/types.js';
import { DANGEROUS_ENV, isDangerousEnvName, stripDangerousEnv } from '../../utils/dangerousEnv.js';

// Re-exported from the leaf guard so existing `core/isolation/secretScrub`
// importers keep their public surface. The loader-injection guard itself lives
// in `utils/dangerousEnv` so leaf utilities can import it without depending on
// `core/isolation`.
export { DANGEROUS_ENV, stripDangerousEnv };

export const KNOWN_SECRET_ENV: readonly string[] = [
  'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY',
  'XENESIS_API_KEY',
  'XENESIS_BASE_URL',
  'GEMINI_API_KEY',
  'OLLAMA_API_KEY',
  'OPENROUTER_API_KEY',
  'GROQ_API_KEY',
  'DEEPSEEK_API_KEY',
  'MISTRAL_API_KEY',
  'XAI_API_KEY',
  'TELEGRAM_BOT_TOKEN',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_WEBHOOK_URL',
  'DISCORD_BOT_TOKEN',
  'DISCORD_WEBHOOK_URL',
];

const SECRET_PATTERN = /_(API_KEY|TOKEN|SECRET|SIGNING_SECRET|WEBHOOK_URL)$/i;

export function collectSecretEnvNames(config: XenesisConfig): Set<string> {
  const names = new Set<string>(KNOWN_SECRET_ENV);
  if (config.apiKeyEnv) names.add(config.apiKeyEnv);
  for (const fallback of config.providerFallbacks ?? []) {
    if (fallback.apiKeyEnv) names.add(fallback.apiKeyEnv);
  }
  const channels = config.channels ?? {};
  if (channels.telegram?.tokenEnv) names.add(channels.telegram.tokenEnv);
  if (channels.slack?.botTokenEnv) names.add(channels.slack.botTokenEnv);
  if (channels.slack?.signingSecretEnv) names.add(channels.slack.signingSecretEnv);
  if (channels.slack?.webhookUrlEnv) names.add(channels.slack.webhookUrlEnv);
  if (channels.discord?.botTokenEnv) names.add(channels.discord.botTokenEnv);
  if (channels.discord?.webhookUrlEnv) names.add(channels.discord.webhookUrlEnv);
  if (channels.webhook?.urlEnv) names.add(channels.webhook.urlEnv);
  return names;
}

export function buildScrubbedEnv(
  baseEnv: NodeJS.ProcessEnv,
  opts: { secretNames: Set<string>; allowlist?: readonly string[] },
): NodeJS.ProcessEnv {
  const allow = new Set(opts.allowlist ?? []);
  const result: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(baseEnv)) {
    if (value === undefined) continue;
    if (allow.has(key)) {
      result[key] = value;
      continue;
    }
    if (opts.secretNames.has(key)) continue;
    if (SECRET_PATTERN.test(key)) continue;
    if (isDangerousEnvName(key)) continue;
    result[key] = value;
  }
  return result;
}

// Default secret env names scrubbed from any shell child (one-shot or persistent).
const SHELL_SECRET_NAMES = new Set<string>(KNOWN_SECRET_ENV);

/**
 * Compute the scrubbed env handed to a shell child. Strips BOTH secrets
 * (SHELL_SECRET_NAMES + the `_(API_KEY|TOKEN|SECRET|...)$` pattern, via buildScrubbedEnv)
 * AND loader/injection vars (stripDangerousEnv). Idempotent. Returns `undefined`
 * (inherit the full source env) only when isolation is explicitly opted out with
 * `XENESIS_ISOLATION_SCRUB="0"`. This lives in the secretScrub leaf module so both
 * the one-shot shellTool and the persistent ShellSession can scrub at spawn without
 * a tool<->session import cycle.
 */
export function computeShellEnv(sourceEnv: NodeJS.ProcessEnv): NodeJS.ProcessEnv | undefined {
  // Opt OUT only with an explicit "0"; everything else scrubs by default.
  if (sourceEnv.XENESIS_ISOLATION_SCRUB === '0') return undefined;
  const allowlist = (sourceEnv.XENESIS_ISOLATION_SCRUB_ALLOW ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const configuredSecretNames = (sourceEnv.XENESIS_ISOLATION_SCRUB_NAMES ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const scrubbed = buildScrubbedEnv(sourceEnv, {
    secretNames: new Set([...SHELL_SECRET_NAMES, ...configuredSecretNames]),
    allowlist,
  });
  return stripDangerousEnv(scrubbed);
}
