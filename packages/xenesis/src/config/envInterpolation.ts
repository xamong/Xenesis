const ENV_VAR_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export class MissingEnvVarError extends Error {
  constructor(
    public readonly varName: string,
    public readonly configPath: string
  ) {
    super(`Missing env var "${varName}" referenced at config path: ${configPath}`);
    this.name = "MissingEnvVarError";
  }
}

type EnvToken =
  | { kind: "escaped"; name: string; end: number }
  | { kind: "substitution"; name: string; end: number };

function parseEnvTokenAt(value: string, index: number): EnvToken | null {
  if (value[index] !== "$") return null;

  const next = value[index + 1];
  const afterNext = value[index + 2];

  if (next === "$" && afterNext === "{") {
    const start = index + 3;
    const end = value.indexOf("}", start);
    if (end !== -1) {
      const name = value.slice(start, end);
      if (ENV_VAR_NAME_PATTERN.test(name)) return { kind: "escaped", name, end };
    }
  }

  if (next === "{") {
    const start = index + 2;
    const end = value.indexOf("}", start);
    if (end !== -1) {
      const name = value.slice(start, end);
      if (ENV_VAR_NAME_PATTERN.test(name)) return { kind: "substitution", name, end };
    }
  }

  return null;
}

function substituteString(value: string, env: NodeJS.ProcessEnv, configPath: string): string {
  if (!value.includes("$")) return value;

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char !== "$") {
      chunks.push(char);
      continue;
    }

    const token = parseEnvTokenAt(value, i);
    if (token?.kind === "escaped") {
      chunks.push(`\${${token.name}}`);
      i = token.end;
      continue;
    }
    if (token?.kind === "substitution") {
      const envValue = env[token.name];
      if (envValue === undefined || envValue === "") {
        throw new MissingEnvVarError(token.name, configPath);
      }
      chunks.push(envValue);
      i = token.end;
      continue;
    }

    chunks.push(char);
  }

  return chunks.join("");
}

export function containsEnvVarReference(value: string): boolean {
  if (!value.includes("$")) return false;

  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== "$") continue;

    const token = parseEnvTokenAt(value, i);
    if (token?.kind === "escaped") {
      i = token.end;
      continue;
    }
    if (token?.kind === "substitution") return true;
  }

  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function substituteAny(value: unknown, env: NodeJS.ProcessEnv, path: string): unknown {
  if (typeof value === "string") return substituteString(value, env, path);
  if (Array.isArray(value)) return value.map((item, index) => substituteAny(item, env, `${path}[${index}]`));
  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    result[key] = substituteAny(child, env, childPath);
  }
  return result;
}

export function resolveConfigEnvVars(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env
): unknown {
  return substituteAny(value, env, "");
}
