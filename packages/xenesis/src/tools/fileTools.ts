import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { z } from 'zod';
import type { ReadSnapshot } from '../core/files/index.js';
import {
  normalizeReadSnapshotInput,
  readFreshTextForMutation,
  readSnapshotInputSchema,
  readTextWithSnapshot,
  writeTextIfReadStateFresh,
} from '../core/files/index.js';
import { assertExistingPathInsideWorkspace, prepareWorkspaceWritePath } from '../utils/workspace.js';
import type { Tool } from './types.js';

const pathInput = z.object({ path: z.string().min(1) });
const DEFAULT_READ_MAX_CHARS = 12_000;
const DEFAULT_READ_RANGE_LINES = 200;
const MAX_AGENT_READ_CHARS = 12_000;
const MAX_AGENT_READ_LINES = 500;

const readInput = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive().nullable().optional(),
  maxLines: z.number().int().positive().max(2000).nullable().optional(),
  maxChars: z.number().int().positive().max(50_000).nullable().optional(),
});

const readOpenAIInput = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive().nullable(),
  maxLines: z.number().int().positive().max(MAX_AGENT_READ_LINES).nullable(),
  maxChars: z.number().int().positive().max(MAX_AGENT_READ_CHARS).nullable(),
});

function normalizedLines(content: string) {
  return content.replace(/\r\n/g, '\n').split('\n');
}

function readRangeContent(input: z.infer<typeof readInput>, content: string) {
  if (input.startLine == null && input.maxLines == null) return undefined;

  const lines = normalizedLines(content);
  const startLine = input.startLine ?? 1;
  const maxLines = Math.min(input.maxLines ?? DEFAULT_READ_RANGE_LINES, MAX_AGENT_READ_LINES);
  const startIndex = startLine - 1;
  const selected = lines.slice(startIndex, startIndex + maxLines).join('\n');
  const endLine = Math.min(lines.length, startLine + maxLines - 1);
  const header = `[read range: lines ${startLine}-${endLine} of ${lines.length} from ${input.path}]`;
  const maxChars = Math.min(input.maxChars ?? DEFAULT_READ_MAX_CHARS, MAX_AGENT_READ_CHARS);

  if (selected.length <= maxChars) return `${header}\n${selected}`;
  return [
    `${header}`,
    `[read truncated: showing first ${maxChars} of ${selected.length} selected characters]`,
    selected.slice(0, maxChars),
    '',
    `Use read with a narrower startLine/maxLines range for more detail.`,
  ].join('\n');
}

function boundedReadContent(input: z.infer<typeof readInput>, content: string) {
  const range = readRangeContent(input, content);
  if (range !== undefined) return range;

  const maxChars = Math.min(input.maxChars ?? DEFAULT_READ_MAX_CHARS, MAX_AGENT_READ_CHARS);
  if (content.length <= maxChars) return content;
  return [
    `[read truncated: showing first ${maxChars} of ${content.length} characters from ${input.path}]`,
    content.slice(0, maxChars),
    '',
    `Use read with startLine/maxLines or a smaller maxChars value to inspect a narrower section.`,
  ].join('\n');
}

function readSnapshotBounds(input: z.infer<typeof readInput>, content: string) {
  if (input.startLine != null || input.maxLines != null) {
    const startLine = input.startLine ?? 1;
    const maxLines = Math.min(input.maxLines ?? DEFAULT_READ_RANGE_LINES, MAX_AGENT_READ_LINES);
    return { isPartialView: true, offset: startLine - 1, limit: maxLines };
  }

  const maxChars = Math.min(input.maxChars ?? DEFAULT_READ_MAX_CHARS, MAX_AGENT_READ_CHARS);
  if (content.length > maxChars) {
    return { isPartialView: true, offset: 0, limit: maxChars };
  }

  return { isPartialView: false };
}

function readStateFailure(toolName: 'Edit', path: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `${toolName} not applied: ${message} No changes were applied to ${path}.`;
}

export const readTool: Tool<z.infer<typeof readInput>> = {
  name: 'read',
  description:
    'Read a UTF-8 text file inside the workspace. Large files are previewed by default; use startLine/maxLines for focused ranges.',
  inputSchema: readInput,
  openaiInputSchema: readOpenAIInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const filePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    if ((await stat(filePath)).isDirectory()) {
      return {
        ok: false,
        content: `${input.path} is a directory. Use list to inspect directory entries or code_symbols to summarize code files.`,
      };
    }
    const read = await readTextWithSnapshot({
      workspaceRoot: context.workspaceRoot,
      path: input.path,
      isPartialView: false,
    });
    const readState = { ...read.snapshot, ...readSnapshotBounds(input, read.content) };
    return { ok: true, content: boundedReadContent(input, read.content), data: { readState } };
  },
};

const writeInput = z.object({
  path: z.string().min(1),
  content: z.string(),
});

export const writeTool: Tool<z.infer<typeof writeInput>> = {
  name: 'write',
  description: 'Create or replace a UTF-8 text file inside the workspace.',
  inputSchema: writeInput,
  isReadOnly: () => false,
  async run(input, context) {
    const filePath = await prepareWorkspaceWritePath(context.workspaceRoot, input.path);
    await writeFile(filePath, input.content, 'utf8');
    return { ok: true, content: `Wrote ${input.content.length} characters to ${input.path}.` };
  },
};

const editInput = z.object({
  path: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string(),
  replaceAll: z.boolean().default(false),
  expectedReplacements: z.number().int().positive().nullable().optional(),
  readState: readSnapshotInputSchema.nullable().optional(),
});

const editOpenAIInput = z.object({
  path: z.string().min(1),
  oldText: z.string().min(1),
  newText: z.string(),
  replaceAll: z.boolean(),
  expectedReplacements: z.number().int().positive().nullable(),
  readState: readSnapshotInputSchema.nullable().optional(),
});

export const editTool: Tool<z.infer<typeof editInput>> = {
  name: 'edit',
  description: 'Replace exact text in one UTF-8 file inside the workspace.',
  inputSchema: editInput,
  openaiInputSchema: editOpenAIInput,
  isReadOnly: () => false,
  async run(input, context) {
    let guardedReadState: ReadSnapshot | undefined;
    let filePath: string;
    let content: string;
    if (input.readState != null) {
      try {
        guardedReadState = normalizeReadSnapshotInput(input.readState);
        const fresh = await readFreshTextForMutation({
          workspaceRoot: context.workspaceRoot,
          path: input.path,
          readState: guardedReadState,
        });
        filePath = fresh.absolutePath;
        content = fresh.content;
      } catch (error) {
        return { ok: false, content: readStateFailure('Edit', input.path, error) };
      }
    } else {
      filePath = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
      content = await readFile(filePath, 'utf8');
    }
    if (!content.includes(input.oldText)) {
      return { ok: false, content: `Edit not applied: text not found in ${input.path}. No changes were applied.` };
    }

    const replacementCount = content.split(input.oldText).length - 1;
    const actualReplacements = input.replaceAll ? replacementCount : 1;
    if (input.expectedReplacements != null && input.expectedReplacements !== actualReplacements) {
      return {
        ok: false,
        content: `Edit not applied: expected ${input.expectedReplacements} replacement(s) in ${input.path}, found ${actualReplacements}. No changes were applied.`,
      };
    }

    const updated = input.replaceAll
      ? content.split(input.oldText).join(input.newText)
      : content.replace(input.oldText, input.newText);
    if (guardedReadState) {
      try {
        await writeTextIfReadStateFresh({
          workspaceRoot: context.workspaceRoot,
          path: input.path,
          readState: guardedReadState,
          content: updated,
        });
      } catch (error) {
        return { ok: false, content: readStateFailure('Edit', input.path, error) };
      }
    } else {
      await writeFile(filePath, updated, 'utf8');
    }
    return {
      ok: true,
      content:
        input.replaceAll || input.expectedReplacements != null
          ? `Edited ${input.path} with ${actualReplacements} replacements.`
          : `Edited ${input.path}.`,
    };
  },
};

export const listTool: Tool<z.infer<typeof pathInput>> = {
  name: 'list',
  description: 'List files and directories inside the workspace.',
  inputSchema: pathInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const directory = await assertExistingPathInsideWorkspace(context.workspaceRoot, input.path);
    const entries = await readdir(directory, { withFileTypes: true });
    const lines = entries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => `${entry.isDirectory() ? 'dir ' : 'file'} ${basename(join(directory, entry.name))}`);
    return { ok: true, content: lines.join('\n') };
  },
};
