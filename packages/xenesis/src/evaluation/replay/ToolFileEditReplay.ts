import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createBuiltInTools } from '../../tools/index.js';
import type { ToolContext, ToolResult } from '../../tools/types.js';
import type { OracleObservation } from './GoldenReplay.js';

export interface ToolFileEditReplayInput {
  fileEdit: {
    path: string;
    oldText: string;
    newText: string;
    replaceAll: boolean;
    expectedReplacements: number;
  };
}

interface ProjectedReadState {
  path: string;
  encoding: string;
  lineEndings: string;
  isPartialView: boolean;
  hasContentHash: boolean;
  hasMtime: boolean;
  size: number;
}

function context(workspaceRoot: string): ToolContext {
  return {
    workspaceRoot,
    cwd: workspaceRoot,
    sessionId: 'tool-file-edit-oracle',
    todos: [],
    emit: () => undefined,
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined,
    },
  };
}

function dataRecord(result: ToolResult): Record<string, unknown> {
  return result.data && typeof result.data === 'object' ? (result.data as Record<string, unknown>) : {};
}

function readStateFrom(result: ToolResult): Record<string, unknown> {
  const readState = dataRecord(result).readState;
  if (!readState || typeof readState !== 'object') {
    throw new Error('Expected read tool result to include readState');
  }
  return readState as Record<string, unknown>;
}

function projectReadState(result: ToolResult): ProjectedReadState {
  const readState = readStateFrom(result);
  return {
    path: String(readState.path),
    encoding: String(readState.encoding),
    lineEndings: String(readState.lineEndings),
    isPartialView: readState.isPartialView === true,
    hasContentHash: typeof readState.contentHash === 'string' && readState.contentHash.length > 0,
    hasMtime: typeof readState.mtimeMs === 'number',
    size: typeof readState.size === 'number' ? readState.size : -1,
  };
}

export async function collectToolFileEditObservation(
  workspaceRoot: string,
  input: ToolFileEditReplayInput,
): Promise<OracleObservation> {
  const tools = createBuiltInTools();
  const toolContext = context(workspaceRoot);
  const read = tools.get('read');
  const edit = tools.get('edit');
  if (!read || !edit) {
    throw new Error('Expected built-in read and edit tools');
  }

  const readResult = await read.run({ path: input.fileEdit.path }, toolContext);
  const freshEdit = await edit.run(
    {
      ...input.fileEdit,
      readState: readStateFrom(readResult),
    },
    toolContext,
  );
  const afterFreshEdit = await readFile(join(workspaceRoot, input.fileEdit.path), 'utf8');

  const staleRead = await read.run({ path: input.fileEdit.path }, toolContext);
  await writeFile(join(workspaceRoot, input.fileEdit.path), 'omega beta omega changed\n', 'utf8');
  const staleEdit = await edit.run(
    {
      path: input.fileEdit.path,
      oldText: input.fileEdit.newText,
      newText: input.fileEdit.oldText,
      replaceAll: false,
      expectedReplacements: undefined,
      readState: readStateFrom(staleRead),
    },
    toolContext,
  );
  const afterStaleEdit = await readFile(join(workspaceRoot, input.fileEdit.path), 'utf8');

  const partialRead = await read.run({ path: input.fileEdit.path, startLine: 1, maxLines: 1 }, toolContext);
  const partialEdit = await edit.run(
    {
      path: input.fileEdit.path,
      oldText: input.fileEdit.newText,
      newText: input.fileEdit.oldText,
      replaceAll: false,
      expectedReplacements: undefined,
      readState: readStateFrom(partialRead),
    },
    toolContext,
  );
  const afterPartialEdit = await readFile(join(workspaceRoot, input.fileEdit.path), 'utf8');

  return {
    ledgerEntries: [
      {
        type: 'tool.file_edit_read_state',
        read: {
          ok: readResult.ok,
          content: readResult.content,
          readState: projectReadState(readResult),
        },
        freshEdit: {
          ok: freshEdit.ok,
          content: freshEdit.content,
          finalContent: afterFreshEdit,
        },
        staleEdit: {
          ok: staleEdit.ok,
          messageIncludes: staleEdit.content.includes('Read state mismatch') ? 'Read state mismatch' : '',
          finalContent: afterStaleEdit,
        },
        partialEdit: {
          ok: partialEdit.ok,
          messageIncludes: partialEdit.content.includes('Partial read state cannot authorize mutation')
            ? 'Partial read state cannot authorize mutation'
            : '',
          finalContent: afterPartialEdit,
        },
      },
    ],
    finalStatus: 'tool_file_edit_read_state_oracle_ready',
    visibleResult:
      'file edit requires a fresh full read state for mutation, and stale or partial read states do not mutate files',
  };
}
