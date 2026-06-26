/**
 * Loader/runtime-injection environment guard. This is a true leaf module: it
 * imports nothing from the project so that low-level utilities (e.g.
 * {@link ../utils/command.ts}) can strip injection vectors at spawn without
 * depending on `core/isolation`. The richer secret-scrubbing surface in
 * `core/isolation/secretScrub.ts` re-exports these symbols and builds on top of
 * `isDangerousEnvName`.
 */

// Environment variables that can hijack process execution (code injection via the loader/runtime).
export const DANGEROUS_ENV: readonly string[] = [
  "LD_PRELOAD",
  "LD_AUDIT",
  "LD_LIBRARY_PATH",
  "NODE_OPTIONS",
  "NODE_REPL_EXTERNAL_MODULE",
  "BROWSER",
  "GIT_EXTERNAL_DIFF",
  "GIT_SSH_COMMAND",
  "PYTHONSTARTUP"
];

const DANGEROUS_ENV_SET = new Set(DANGEROUS_ENV);

export function isDangerousEnvName(key: string): boolean {
  return DANGEROUS_ENV_SET.has(key) || key.startsWith("DYLD_") || key.startsWith("LD_");
}

export function stripDangerousEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) continue;
    if (isDangerousEnvName(key)) continue;
    result[key] = value;
  }
  return result;
}
