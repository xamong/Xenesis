export const REPL_TOOL_NAME = "REPL";

function isEnvTruthy(value: string | undefined) {
  return value !== undefined && /^(1|true|yes|on)$/iu.test(value);
}

function isEnvDefinedFalsy(value: string | undefined) {
  return value !== undefined && /^(0|false|no|off)$/iu.test(value);
}

export function isReplModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (isEnvDefinedFalsy(env.CLAUDE_CODE_REPL)) return false;
  if (isEnvTruthy(env.CLAUDE_REPL_MODE)) return true;
  return env.USER_TYPE === "ant" && env.CLAUDE_CODE_ENTRYPOINT === "cli";
}

export const REPL_ONLY_TOOLS = new Set([
  "read",
  "write",
  "edit",
  "glob",
  "search",
  "shell",
  "notebook_edit",
  "agent"
]);
