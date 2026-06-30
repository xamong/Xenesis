import { resolve } from 'node:path';
import { z } from 'zod';
import { FileArtifactStore } from '../artifacts/index.js';
import { FileWorkspaceContextIndexStore } from '../context/index.js';
import type { Tool, ToolContext } from './types.js';

const contextIndexInput = z.object({
  maxFiles: z.number().int().positive().max(10000).default(1000),
  previewBytes: z.number().int().min(0).max(5000).default(600),
});

const contextSearchInput = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(100).default(20),
});

const artifactSaveInput = z.object({
  title: z.string().min(1),
  content: z.string(),
  kind: z.string().min(1).default('text'),
});

const artifactReadInput = z.object({
  id: z.string().min(1),
});

function homeFromContext(context: ToolContext) {
  return context.xenesisHome ?? resolve(context.workspaceRoot, '.xenesis');
}

function contextStore(context: ToolContext) {
  return new FileWorkspaceContextIndexStore({
    workspaceRoot: context.workspaceRoot,
    xenesisHome: homeFromContext(context),
  });
}

function artifactStore(context: ToolContext) {
  return new FileArtifactStore({
    xenesisHome: homeFromContext(context),
  });
}

export const contextIndexTool: Tool<z.infer<typeof contextIndexInput>> = {
  name: 'context_index',
  description: 'Build a reusable workspace context index under XENESIS_HOME.',
  inputSchema: contextIndexInput,
  isReadOnly: () => true,
  async run(input, context) {
    const index = await contextStore(context).rebuild({
      maxFiles: input.maxFiles,
      previewBytes: input.previewBytes,
    });
    return {
      ok: true,
      content: `context: indexed ${index.fileCount} files (${index.totalSize} bytes)`,
    };
  },
};

export const contextSearchTool: Tool<z.infer<typeof contextSearchInput>> = {
  name: 'context_search',
  description: 'Search the saved workspace context index.',
  inputSchema: contextSearchInput,
  isReadOnly: () => true,
  async run(input, context) {
    const matches = await contextStore(context).search(input.query, input.limit);
    return {
      ok: true,
      content:
        matches.length === 0
          ? 'No context matches.'
          : matches.map((file) => `${file.path} (${file.size} bytes)`).join('\n'),
    };
  },
};

export const artifactSaveTool: Tool<z.infer<typeof artifactSaveInput>> = {
  name: 'artifact_save',
  description: 'Save an important text result as a durable Xenesis artifact.',
  inputSchema: artifactSaveInput,
  isReadOnly: () => false,
  async run(input, context) {
    const record = await artifactStore(context).save({
      title: input.title,
      content: input.content,
      kind: input.kind,
      sessionId: context.sessionId,
    });
    return {
      ok: true,
      content: `artifact: saved ${record.id}`,
      data: record,
    };
  },
};

export const artifactListTool: Tool<Record<string, never>> = {
  name: 'artifact_list',
  description: 'List saved Xenesis artifacts.',
  inputSchema: z.object({}),
  isReadOnly: () => true,
  async run(_input, context) {
    const records = await artifactStore(context).list();
    return {
      ok: true,
      content:
        records.length === 0
          ? 'artifacts: none'
          : records
              .map((record) => `${record.id} - ${record.title} (${record.kind}, ${record.bytes} bytes)`)
              .join('\n'),
    };
  },
};

export const artifactReadTool: Tool<z.infer<typeof artifactReadInput>> = {
  name: 'artifact_read',
  description: 'Read a saved Xenesis artifact by id.',
  inputSchema: artifactReadInput,
  isReadOnly: () => true,
  async run(input, context) {
    const artifact = await artifactStore(context).read(input.id);
    if (!artifact) return { ok: false, content: `Artifact not found: ${input.id}` };
    return {
      ok: true,
      content: artifact.content,
      data: artifact,
    };
  },
};
