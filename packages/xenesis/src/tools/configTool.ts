import { randomBytes } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { loadConfig, providerNames } from '../config/index.js';
import type { Tool, ToolContext } from './types.js';

const configInputSchema = z
  .object({
    setting: z.string().min(1),
    value: z.union([z.string(), z.boolean(), z.number()]).optional(),
  })
  .strict();

const configOpenAIInputSchema = z
  .object({
    setting: z.string().min(1),
    value: z.union([z.string(), z.boolean(), z.number()]).nullable().optional(),
  })
  .strict();

type ConfigInput = z.infer<typeof configInputSchema>;

interface ConfigOutput {
  success: boolean;
  operation?: 'get' | 'set';
  setting?: string;
  value?: unknown;
  previousValue?: unknown;
  newValue?: unknown;
  effectiveValue?: unknown;
  error?: string;
}

type ConfigValueType = 'string' | 'boolean' | 'positiveInteger' | 'nonNegativeInteger' | 'ratio';

interface SupportedConfigSetting {
  type: ConfigValueType;
  description: string;
  path?: string[];
  options?: readonly string[];
  /** Inclusive bounds for ratio-typed settings. Defaults to [0.1, 1]. */
  min?: number;
  max?: number;
}

const approvalModes = ['safe', 'auto', 'readonly'] as const;

const supportedSettings: Record<string, SupportedConfigSetting> = {
  provider: {
    type: 'string',
    description: 'Primary model provider.',
    options: providerNames,
  },
  model: {
    type: 'string',
    description: 'Primary model name.',
  },
  baseURL: {
    type: 'string',
    description: 'Provider base URL.',
  },
  apiKeyEnv: {
    type: 'string',
    description: 'Environment variable containing the provider API key.',
  },
  providerRetries: {
    type: 'nonNegativeInteger',
    description: 'Provider retry attempts before fallback.',
  },
  maxTurns: {
    type: 'positiveInteger',
    description: 'Maximum turns for a run.',
  },
  approvalMode: {
    type: 'string',
    description: 'Default approval mode for tool usage.',
    options: approvalModes,
  },
  'context.autoCompact': {
    type: 'boolean',
    description: 'Auto-compact when context is large.',
  },
  'context.compactAfterMessages': {
    type: 'positiveInteger',
    description: 'Message count before compaction.',
  },
  'context.compactKeepMessages': {
    type: 'positiveInteger',
    description: 'Messages to keep after compaction.',
  },
  'context.maxToolResultChars': {
    type: 'positiveInteger',
    description: 'Maximum model-visible tool result characters.',
  },
  'context.operationalFailures.enabled': {
    type: 'boolean',
    description: 'Include recent operational failures as diagnostic context.',
  },
  'context.operationalFailures.maxItems': {
    type: 'nonNegativeInteger',
    description: 'Maximum operational failure context items.',
  },
  'context.llmSummary': {
    type: 'boolean',
    description: 'Use an LLM aux model to summarize compacted history instead of a deterministic line dump.',
  },
  'context.summarizationModel': {
    type: 'string',
    description: 'Aux model id used for compaction summaries.',
  },
  'context.summarizationProvider': {
    type: 'string',
    description: 'Provider name for the summarization model. Defaults to the primary provider when unset.',
  },
  'context.pruneToolResults': {
    type: 'boolean',
    description: 'Run a deterministic dedup/descriptor prune pass over the older slice before summarizing.',
  },
  'context.pruneToolResultThreshold': {
    type: 'positiveInteger',
    description: 'Char length above which an older tool result / tool-call arg block is pruned to a descriptor.',
  },
  'context.stripOldImages': {
    type: 'boolean',
    description:
      'Strip base64 image attachments from messages outside the recent window before sending to the provider.',
  },
  'context.compactTokenThresholdRatio': {
    type: 'ratio',
    min: 0.1,
    max: 1,
    description: 'Pre-flight compaction trigger as a fraction of the computed context-token budget (e.g. 0.8).',
  },
  'verification.autoRun': {
    type: 'boolean',
    description: 'Run verification automatically.',
  },
  'verification.autoFix': {
    type: 'boolean',
    description: 'Attempt repair when verification fails.',
  },
  'verification.timeoutMs': {
    type: 'positiveInteger',
    description: 'Verification command timeout in milliseconds.',
  },
  'verification.maxOutputChars': {
    type: 'positiveInteger',
    description: 'Maximum stored verification output characters.',
  },
  'verification.maxRepairAttempts': {
    type: 'positiveInteger',
    description: 'Maximum repair attempts.',
  },
  'verification.acceptOnPass': {
    type: 'boolean',
    description: 'Accept completed work when verification passes.',
  },
  'verification.rollbackFailedRepairs': {
    type: 'boolean',
    description: 'Rollback failed repair attempts.',
  },
  'guard.enabled': {
    type: 'boolean',
    description: 'Enable capability guard checks.',
  },
  'guard.useDefault': {
    type: 'boolean',
    description: 'Use default guard requirements.',
  },
  'worker.enabled': {
    type: 'boolean',
    description: 'Enable durable background worker.',
  },
  'worker.pollIntervalMs': {
    type: 'positiveInteger',
    description: 'Worker poll interval in milliseconds.',
  },
  'worker.concurrency': {
    type: 'positiveInteger',
    description: 'Concurrent worker task count.',
  },
  'worker.defaults.maxTurns': {
    type: 'positiveInteger',
    description: 'Default worker max turns.',
  },
  'worker.defaults.maxTokens': {
    type: 'positiveInteger',
    description: 'Default worker max tokens.',
  },
  'worker.defaults.approvalMode': {
    type: 'string',
    description: 'Default worker approval mode.',
    options: approvalModes,
  },
  'browser.enabled': {
    type: 'boolean',
    description: 'Enable browser tooling.',
  },
  'browser.headless': {
    type: 'boolean',
    description: 'Run browser tooling headless.',
  },
  'browser.idleTimeoutMs': {
    type: 'positiveInteger',
    description: 'Browser idle timeout in milliseconds.',
  },
  'extensions.memory.enabled': {
    type: 'boolean',
    description: 'Enable memory extension.',
  },
  'extensions.memory.path': {
    type: 'string',
    description: 'Memory file path.',
  },
  'extensions.subagents.enabled': {
    type: 'boolean',
    description: 'Enable subagent tools.',
  },
  'extensions.subagents.maxConcurrent': {
    type: 'positiveInteger',
    description: 'Maximum concurrent subagents.',
  },
  'extensions.skills.autoLoad': {
    type: 'boolean',
    description: 'Automatically load configured skills.',
  },
  'approval.timeoutMs': {
    type: 'positiveInteger',
    description: 'Approval gate timeout in milliseconds (default 300000 = 5 min).',
  },
  'approval.timeoutBehavior': {
    type: 'string',
    description: 'What to do when the approval gate times out: allow or deny.',
    options: ['allow', 'deny'] as const,
  },
  'hooks.enabled': {
    type: 'boolean',
    description: 'Enable blocking hooks (PreToolUse / Stop).',
  },
  'hooks.maxStopHookContinuations': {
    type: 'nonNegativeInteger',
    description: 'Maximum Stop hook continuation injections per run.',
  },
  'hooks.commandTimeoutMs': {
    type: 'positiveInteger',
    description: 'Default command hook subprocess timeout in milliseconds.',
  },
  workflow: {
    type: 'string',
    description: 'Active workflow name.',
  },
};

function pathForSetting(setting: string) {
  return supportedSettings[setting]?.path ?? setting.split('.');
}

function stableStringify(value: unknown) {
  return JSON.stringify(value);
}

function formatSettingLine(setting: string, config: SupportedConfigSetting) {
  let line = `- ${setting}`;
  if (config.options) {
    line += `: ${config.options.map((option) => `"${option}"`).join(', ')}`;
  } else if (config.type === 'boolean') {
    line += ': true/false';
  }
  return `${line} - ${config.description}`;
}

function generateConfigDescription() {
  return [
    'Get or set Xenesis configuration settings.',
    '',
    'View or change Xenesis settings. Use when the user requests configuration changes, asks about current settings, or when adjusting a setting would benefit them.',
    '',
    '## Usage',
    '- Get current value: omit the value parameter.',
    '- Set new value: include the value parameter.',
    '',
    '## Configurable settings list',
    'The following settings are available:',
    ...Object.entries(supportedSettings).map(([setting, config]) => formatSettingLine(setting, config)),
  ].join('\n');
}

function configPathForContext(context: ToolContext) {
  return resolve(context.workspaceRoot, 'xenesis.config.json');
}

function temporaryWritePath(path: string) {
  return `${path}.${process.pid}.${Date.now()}.${randomBytes(4).toString('hex')}.tmp`;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readProjectConfig(path: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('Config file must contain a JSON object.');
    }
    return parsed;
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeProjectConfig(path: string, value: Record<string, unknown>) {
  await mkdir(dirname(path), { recursive: true });
  const tempPath = temporaryWritePath(path);
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tempPath, path);
}

function readPath(root: unknown, path: string[]) {
  let current = root;
  for (const key of path) {
    if (!isRecord(current) || !(key in current)) return undefined;
    current = current[key];
  }
  return current;
}

function writePath(root: Record<string, unknown>, path: string[], value: unknown) {
  let current = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]!;
    const existing = current[key];
    if (!isRecord(existing)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]!] = value;
}

function coerceBoolean(setting: string, value: string | boolean | number) {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true') return { ok: true as const, value: true };
    if (lower === 'false') return { ok: true as const, value: false };
  }
  if (typeof value === 'boolean') return { ok: true as const, value };
  return { ok: false as const, error: `${setting} requires true or false.` };
}

function coerceInteger(setting: string, value: string | boolean | number, minimum: number) {
  if (typeof value === 'boolean') {
    return {
      ok: false as const,
      error: `${setting} requires ${minimum > 0 ? 'a positive' : 'a non-negative'} integer.`,
    };
  }
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < minimum) {
    return {
      ok: false as const,
      error: `${setting} requires ${minimum > 0 ? 'a positive' : 'a non-negative'} integer.`,
    };
  }
  return { ok: true as const, value: parsed };
}

function coerceRatio(setting: string, value: string | boolean | number, minimum: number, maximum: number) {
  if (typeof value === 'boolean') {
    return { ok: false as const, error: `${setting} requires a number between ${minimum} and ${maximum}.` };
  }
  const parsed = typeof value === 'number' ? value : Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return { ok: false as const, error: `${setting} requires a number between ${minimum} and ${maximum}.` };
  }
  return { ok: true as const, value: parsed };
}

function coerceValue(setting: string, value: string | boolean | number) {
  const config = supportedSettings[setting];
  if (!config) {
    return { ok: false as const, error: `Unknown setting: "${setting}"` };
  }

  if (config.type === 'boolean') {
    return coerceBoolean(setting, value);
  }
  if (config.type === 'positiveInteger') {
    return coerceInteger(setting, value, 1);
  }
  if (config.type === 'nonNegativeInteger') {
    return coerceInteger(setting, value, 0);
  }
  if (config.type === 'ratio') {
    return coerceRatio(setting, value, config.min ?? 0.1, config.max ?? 1);
  }

  const finalValue = String(value).trim();
  if (finalValue.length === 0) {
    return {
      ok: false as const,
      error: `${setting} requires a non-empty string.`,
    };
  }
  if (config.options && !config.options.includes(finalValue)) {
    return {
      ok: false as const,
      error: `Invalid value "${value}". Options: ${config.options.join(', ')}`,
    };
  }
  return { ok: true as const, value: finalValue };
}

function resultFromData(data: ConfigOutput) {
  if (data.success) {
    if (data.operation === 'get') {
      return {
        ok: true,
        content: `${data.setting} = ${stableStringify(data.value)}`,
        data,
      };
    }
    const baseContent = `Set ${data.setting} to ${stableStringify(data.newValue)}`;
    if (
      Object.hasOwn(data, 'effectiveValue') &&
      stableStringify(data.effectiveValue) !== stableStringify(data.newValue)
    ) {
      return {
        ok: true,
        content: `${baseContent}; effective value remains ${stableStringify(data.effectiveValue)} because a higher-precedence configuration layer overrides it.`,
        data,
      };
    }
    return {
      ok: true,
      content: baseContent,
      data,
    };
  }
  return {
    ok: false,
    content: `Error: ${data.error}`,
    data,
  };
}

async function runConfigTool(input: ConfigInput, context: ToolContext) {
  const config = supportedSettings[input.setting];
  if (!config) {
    return resultFromData({
      success: false,
      error: `Unknown setting: "${input.setting}"`,
    });
  }

  const path = pathForSetting(input.setting);
  const effective = await loadConfig({
    cwd: context.workspaceRoot,
    env: context.env ?? process.env,
  });

  if (input.value === undefined) {
    return resultFromData({
      success: true,
      operation: 'get',
      setting: input.setting,
      value: readPath(effective, path),
    });
  }

  const coerced = coerceValue(input.setting, input.value);
  if (!coerced.ok) {
    return resultFromData({
      success: false,
      operation: 'set',
      setting: input.setting,
      error: coerced.error,
    });
  }

  const projectConfigPath = configPathForContext(context);
  const projectConfig = await readProjectConfig(projectConfigPath);
  const previousValue = readPath(effective, path);
  writePath(projectConfig, path, coerced.value);
  await writeProjectConfig(projectConfigPath, projectConfig);
  const effectiveAfter = await loadConfig({
    cwd: context.workspaceRoot,
    env: context.env ?? process.env,
  });
  const effectiveValue = readPath(effectiveAfter, path);

  const output: ConfigOutput = {
    success: true,
    operation: 'set',
    setting: input.setting,
    previousValue,
    newValue: coerced.value,
  };
  if (stableStringify(effectiveValue) !== stableStringify(coerced.value)) {
    output.effectiveValue = effectiveValue;
  }
  return resultFromData(output);
}

export const configTool: Tool<ConfigInput, ConfigOutput> = {
  name: 'config',
  description: generateConfigDescription(),
  inputSchema: configInputSchema,
  openaiInputSchema: configOpenAIInputSchema,
  isReadOnly: (input) => input.value === undefined,
  isConcurrencySafe: (input) => input.value === undefined,
  async run(input, context) {
    try {
      return await runConfigTool(input, context);
    } catch (error) {
      return resultFromData({
        success: false,
        operation: input.value === undefined ? 'get' : 'set',
        setting: input.setting,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
};
