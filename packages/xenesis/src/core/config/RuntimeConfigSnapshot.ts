import {
  loadConfig,
  type ApprovalMode,
  type CliConfigOverrides,
  type LoadConfigOptions,
  type XenesisConfig
} from "../../config/index.js";

export const runtimeConfigSnapshotVersion = 1 as const;

export interface ResolveRuntimeConfigSnapshotOptions extends LoadConfigOptions {
  now?: () => Date;
}

export interface RuntimeConfigSnapshot {
  readonly version: typeof runtimeConfigSnapshotVersion;
  readonly resolvedAt: string;
  readonly cwd: string;
  readonly configPath?: string;
  readonly sourceOrder: readonly string[];
  readonly effective: XenesisConfig;
  readonly legacy: {
    readonly approvalMode: ApprovalMode;
    readonly workspace: string;
    readonly cliOverrides: readonly (keyof CliConfigOverrides)[];
  };
  readonly migration: {
    readonly compatibilityMode: "legacy-v1-safe" | "legacy-v1-auto" | "legacy-v1-readonly";
    readonly rewritesConfigFiles: false;
  };
}

function compatibilityMode(approvalMode: ApprovalMode): RuntimeConfigSnapshot["migration"]["compatibilityMode"] {
  if (approvalMode === "auto") return "legacy-v1-auto";
  if (approvalMode === "readonly") return "legacy-v1-readonly";
  return "legacy-v1-safe";
}

function readonlyArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items]);
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value !== "object" && typeof value !== "function" || value === null) {
    return value;
  }

  const objectValue = value as object;
  if (seen.has(objectValue)) {
    return value;
  }
  seen.add(objectValue);

  for (const key of Reflect.ownKeys(objectValue)) {
    deepFreeze((objectValue as Record<PropertyKey, unknown>)[key], seen);
  }

  return Object.freeze(value);
}

export async function resolveRuntimeConfigSnapshot(
  options: ResolveRuntimeConfigSnapshotOptions
): Promise<RuntimeConfigSnapshot> {
  const effective = await loadConfig(options);
  const resolvedAt = (options.now ?? (() => new Date()))().toISOString();
  const cliOverrides = Object.keys(options.cli ?? {}).sort() as Array<keyof CliConfigOverrides>;
  const snapshot: RuntimeConfigSnapshot = {
    version: runtimeConfigSnapshotVersion,
    resolvedAt,
    cwd: options.cwd,
    ...(options.configPath ? { configPath: options.configPath } : {}),
    sourceOrder: readonlyArray(["defaults", "configFile", "profile", "environment", "cli", "runtime"]),
    effective: deepFreeze(effective),
    legacy: Object.freeze({
      approvalMode: effective.approvalMode,
      workspace: effective.workspace,
      cliOverrides: readonlyArray(cliOverrides)
    }),
    migration: Object.freeze({
      compatibilityMode: compatibilityMode(effective.approvalMode),
      rewritesConfigFiles: false
    })
  };

  return Object.freeze(snapshot);
}
