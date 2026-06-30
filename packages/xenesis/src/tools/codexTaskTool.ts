import { z } from 'zod';
import type { ProviderMetadata } from '../core/messages.js';
import { CodexCliProvider } from '../providers/index.js';
import { assertInsideWorkspace } from '../utils/workspace.js';
import type { Tool } from './types.js';

const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().min(1).nullable().optional(),
);

const codexTaskInput = z
  .object({
    prompt: z.string().min(1),
    cwd: optionalNonEmptyString,
    timeoutMs: z.number().int().positive().max(1_800_000).nullable().optional(),
    maxOutputChars: z.number().int().positive().max(200_000).nullable().optional(),
    readOnly: z.boolean().nullable().optional(),
  })
  .strict();

const codexTaskOpenAIInput = z
  .object({
    prompt: z.string(),
    cwd: z.string().nullable(),
    timeoutMs: z.number().int().positive().nullable(),
    maxOutputChars: z.number().int().positive().nullable(),
    readOnly: z.boolean().nullable(),
  })
  .strict();

type CodexTaskInput = z.infer<typeof codexTaskInput>;

interface CodexTaskResult {
  provider: 'codex-cli';
  cwd: string;
  output: string;
  truncated: boolean;
  exitCode?: number;
  timedOut?: boolean;
  aborted?: boolean;
  durationMs?: number;
  stderr?: string;
  error?: string;
}

function truncateText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return { text: value, truncated: false };
  }
  const suffix = `\n\n[truncated: ${value.length - maxChars} chars omitted]`;
  return {
    text: `${value.slice(0, Math.max(0, maxChars - suffix.length))}${suffix}`,
    truncated: true,
  };
}

function cliMetadata(metadata: ProviderMetadata | undefined) {
  return metadata?.cli;
}

function delegatedPrompt(input: CodexTaskInput) {
  if (input.readOnly === false) return input.prompt;
  return [
    'You are a delegated Codex CLI worker called by Xenesis.',
    'Work read-only unless the user explicitly requested edits and the CLI sandbox allows them.',
    'Return a concise result with concrete evidence, changed files if any, verification performed, and blockers.',
    '',
    input.prompt,
  ].join('\n');
}

function renderSuccess(data: CodexTaskResult) {
  return [
    'codex task completed',
    `provider: ${data.provider}`,
    `cwd: ${data.cwd}`,
    data.exitCode !== undefined ? `exitCode: ${data.exitCode}` : undefined,
    data.durationMs !== undefined ? `durationMs: ${data.durationMs}` : undefined,
    data.truncated ? 'truncated: true' : 'truncated: false',
    data.stderr ? `stderr: ${data.stderr}` : undefined,
    'output:',
    data.output,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

function renderFailure(data: Partial<CodexTaskResult> & { cwd: string; error: string }) {
  return [
    'codex task failed',
    'provider: codex-cli',
    `cwd: ${data.cwd}`,
    data.exitCode !== undefined ? `exitCode: ${data.exitCode}` : undefined,
    data.timedOut ? 'timedOut: true' : undefined,
    data.aborted ? 'aborted: true' : undefined,
    data.stderr ? `stderr: ${data.stderr}` : undefined,
    `error: ${data.error}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}

export const codexTaskTool: Tool<CodexTaskInput, CodexTaskResult> = {
  name: 'codex_task',
  description: [
    'Delegate a bounded subtask to the local Codex CLI and return its output.',
    'Use this when Xenesis should ask Codex CLI to independently inspect, review, or execute a focused task while keeping the main Xenesis run in control.',
  ].join(' '),
  inputSchema: codexTaskInput,
  openaiInputSchema: codexTaskOpenAIInput,
  isReadOnly: (input) => input.readOnly !== false,
  isConcurrencySafe: () => false,
  async run(input, context) {
    const cwd = assertInsideWorkspace(context.workspaceRoot, input.cwd ?? '.');
    const maxOutputChars = input.maxOutputChars ?? 40_000;
    const provider = new CodexCliProvider({
      cwd,
      env: context.env,
      timeoutMs: input.timeoutMs ?? undefined,
    });

    try {
      const response = await provider.complete({
        model: 'codex-cli',
        messages: [
          {
            role: 'user',
            content: delegatedPrompt(input),
          },
        ],
        tools: [],
      });
      const metadata = cliMetadata(response.message.providerMetadata);
      const truncated = truncateText(response.message.content, maxOutputChars);
      const data: CodexTaskResult = {
        provider: 'codex-cli',
        cwd,
        output: truncated.text,
        truncated: truncated.truncated,
        ...(metadata?.exitCode !== undefined ? { exitCode: metadata.exitCode } : {}),
        ...(metadata?.timedOut ? { timedOut: true } : {}),
        ...(metadata?.aborted ? { aborted: true } : {}),
        ...(metadata?.durationMs !== undefined ? { durationMs: metadata.durationMs } : {}),
        ...(metadata?.stderr ? { stderr: metadata.stderr } : {}),
        ...(metadata?.error ? { error: metadata.error } : {}),
      };

      return {
        ok: true,
        content: renderSuccess(data),
        data,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const data: CodexTaskResult = {
        provider: 'codex-cli',
        cwd,
        output: '',
        truncated: false,
        error: message,
      };
      return {
        ok: false,
        content: renderFailure({ cwd, error: message }),
        data,
      };
    }
  },
};
