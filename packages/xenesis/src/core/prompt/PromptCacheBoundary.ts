import type { ComposedSystemPrompt } from './PromptComposer.js';

export interface PromptCacheBoundaryReport {
  boundaryCount: number;
  boundaryIndex: number;
  stableBlockIds: string[];
  volatileBlockIds: string[];
  cacheSafe: boolean;
}

export function promptCacheBoundaryReport(prompt: ComposedSystemPrompt): PromptCacheBoundaryReport {
  const boundaryIndexes = prompt.blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.id === 'prompt.dynamic_boundary')
    .map(({ index }) => index);
  const boundaryIndex = boundaryIndexes[0] ?? -1;
  const stableBlockIds = boundaryIndex >= 0 ? prompt.blocks.slice(0, boundaryIndex).map((block) => block.id) : [];
  const volatileBlockIds = boundaryIndex >= 0 ? prompt.blocks.slice(boundaryIndex + 1).map((block) => block.id) : [];
  return {
    boundaryCount: boundaryIndexes.length,
    boundaryIndex,
    stableBlockIds,
    volatileBlockIds,
    cacheSafe: boundaryIndexes.length === 1,
  };
}
