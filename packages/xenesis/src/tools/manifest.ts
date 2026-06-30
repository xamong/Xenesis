import type { Tool } from './types.js';

export type ToolRisk = 'read' | 'external';
export type ToolConcurrency = 'parallelRead' | 'exclusive';

export interface ToolManifest {
  name: string;
  category: string;
  risk: ToolRisk;
  concurrency: ToolConcurrency;
  requiresApproval: boolean;
  mutatesWorkspace: boolean;
  requiresWorkspaceRead: boolean;
  supportsRetry: boolean;
  outputKind: string;
  promptDescription: string;
  capabilityPath?: string;
  requiresStorage?: string;
}

function safeReadOnly<I>(tool: Tool<I>, input: I | undefined) {
  try {
    return tool.isReadOnly(input as I);
  } catch {
    return false;
  }
}

function safeConcurrencySafe<I>(tool: Tool<I>, input: I | undefined) {
  try {
    return tool.isConcurrencySafe?.(input as I) === true;
  } catch {
    return false;
  }
}

function inferredCategory(tool: Tool) {
  if (tool.isMcp) return 'mcp';
  if (tool.name.startsWith('desk_') || tool.name.startsWith('xenesis_desk_')) return 'desk';
  if (tool.name.includes('browser')) return 'browser';
  if (tool.name.includes('file') || tool.name === 'read' || tool.name === 'write') return 'workspace';
  return 'tool';
}

export function createToolManifest<I>(tool: Tool<I>, input?: I): ToolManifest {
  const readOnly = safeReadOnly(tool, input);
  return {
    name: tool.name,
    category: inferredCategory(tool as Tool),
    risk: readOnly ? 'read' : 'external',
    concurrency: readOnly && safeConcurrencySafe(tool, input) ? 'parallelRead' : 'exclusive',
    requiresApproval: !readOnly,
    mutatesWorkspace: !readOnly,
    requiresWorkspaceRead: false,
    supportsRetry: readOnly,
    outputKind: 'text',
    promptDescription: tool.searchHint ?? tool.description ?? '',
  };
}

export function renderToolManifestLine(manifest: ToolManifest) {
  const approval = manifest.requiresApproval ? 'approval=yes' : 'approval=no';
  const storage = manifest.requiresStorage ? ` storage=${manifest.requiresStorage}` : '';
  const capability = manifest.capabilityPath ? ` capability=${manifest.capabilityPath}` : '';
  const description = manifest.promptDescription ? ` - ${manifest.promptDescription}` : '';
  return `${manifest.name} [${manifest.category}/${manifest.risk}] concurrency=${manifest.concurrency} ${approval} output=${manifest.outputKind}${storage}${capability}${description}`;
}
