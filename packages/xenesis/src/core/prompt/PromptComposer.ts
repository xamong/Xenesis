import { createHash } from 'node:crypto';

export const systemPromptDynamicBoundary = '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__';

export type PromptCacheScope = 'global' | 'session' | 'turn' | 'none';

export interface PromptBlock {
  id: string;
  source: string;
  cacheScope: PromptCacheScope;
  content: string;
  priority: number;
}

export interface ComposeSystemPromptOptions {
  overrideBlocks?: PromptBlock[];
  coordinatorBlocks?: PromptBlock[];
  agentBlocks?: PromptBlock[];
  customBlocks?: PromptBlock[];
  defaultBlocks?: PromptBlock[];
  appendBlocks?: PromptBlock[];
  proactiveAgentMode?: boolean;
}

export interface ComposedSystemPrompt {
  blocks: PromptBlock[];
  text: string;
  staticPrefixFingerprint: string;
  dynamicTailFingerprint: string;
}

export interface SystemPromptSnapshot {
  version: 1;
  blockIds: string[];
  boundaryIndex: number;
  staticPrefixFingerprint: string;
  dynamicTailFingerprint: string;
}

export interface SystemPromptSnapshotDiff {
  path: keyof Omit<SystemPromptSnapshot, 'version'>;
  expected: unknown;
  actual: unknown;
}

export interface SystemPromptBoundaryParts {
  hasBoundary: boolean;
  stablePrefix: string;
  dynamicTail: string;
}

function comparePromptBlocks(left: PromptBlock, right: PromptBlock) {
  if (left.priority !== right.priority) return left.priority - right.priority;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function normalizePromptBlocks(blocks: PromptBlock[] | undefined) {
  return [...(blocks ?? [])].filter((block) => block.content.trim().length > 0).sort(comparePromptBlocks);
}

function withProactiveAgentInstructionHeading(blocks: PromptBlock[]) {
  if (blocks.length === 0) return blocks;
  const [first, ...rest] = blocks;
  return [
    {
      ...first,
      content: `\n# Custom Agent Instructions\n${first.content}`,
    },
    ...rest,
  ];
}

function assertUniqueBlockIds(blocks: PromptBlock[]) {
  const seen = new Set<string>();
  for (const block of blocks) {
    if (seen.has(block.id)) {
      throw new Error(`duplicate prompt block id: ${block.id}`);
    }
    seen.add(block.id);
  }
}

function isStaticCacheable(block: PromptBlock) {
  return block.cacheScope === 'global';
}

function boundaryBlock(): PromptBlock {
  return {
    id: 'prompt.dynamic_boundary',
    source: 'prompt_composer',
    cacheScope: 'none',
    content: systemPromptDynamicBoundary,
    priority: Number.MAX_SAFE_INTEGER,
  };
}

function trimBoundaryPart(text: string) {
  return text.replace(/^\s+|\s+$/g, '');
}

export function splitSystemPromptAtDynamicBoundary(content: string): SystemPromptBoundaryParts {
  if (!content.includes(systemPromptDynamicBoundary)) {
    return {
      hasBoundary: false,
      stablePrefix: content,
      dynamicTail: '',
    };
  }

  const [stablePrefix = '', ...dynamicParts] = content.split(systemPromptDynamicBoundary);
  return {
    hasBoundary: true,
    stablePrefix: trimBoundaryPart(stablePrefix),
    dynamicTail: trimBoundaryPart(dynamicParts.join(systemPromptDynamicBoundary)),
  };
}

export function stripSystemPromptDynamicBoundary(content: string) {
  const parts = splitSystemPromptAtDynamicBoundary(content);
  if (!parts.hasBoundary) return content;
  return [parts.stablePrefix, parts.dynamicTail].filter((part) => part.length > 0).join('\n\n');
}

export function fingerprintPromptBlocks(blocks: readonly PromptBlock[]) {
  const hash = createHash('sha256');
  for (const block of blocks) {
    hash.update(
      JSON.stringify({
        id: block.id,
        source: block.source,
        cacheScope: block.cacheScope,
        content: block.content,
      }),
    );
    hash.update('\n');
  }
  return hash.digest('hex');
}

export function resolveEffectiveSystemPromptBlocks(options: ComposeSystemPromptOptions): PromptBlock[] {
  const overrideBlocks = normalizePromptBlocks(options.overrideBlocks);
  if (overrideBlocks.length > 0) {
    return overrideBlocks;
  }

  const appendBlocks = normalizePromptBlocks(options.appendBlocks);
  const agentBlocks = normalizePromptBlocks(options.agentBlocks);
  const coordinatorBlocks = normalizePromptBlocks(options.coordinatorBlocks);
  const defaultBlocks = normalizePromptBlocks(options.defaultBlocks);

  if (coordinatorBlocks.length > 0 && agentBlocks.length === 0) {
    return [...coordinatorBlocks, ...appendBlocks];
  }

  if (agentBlocks.length > 0) {
    return options.proactiveAgentMode
      ? [...defaultBlocks, ...withProactiveAgentInstructionHeading(agentBlocks), ...appendBlocks]
      : [...agentBlocks, ...appendBlocks];
  }

  const customBlocks = normalizePromptBlocks(options.customBlocks);
  if (customBlocks.length > 0) {
    return [...customBlocks, ...appendBlocks];
  }

  return [...defaultBlocks, ...appendBlocks];
}

export function composeSystemPrompt(options: ComposeSystemPromptOptions): ComposedSystemPrompt {
  const ordered = resolveEffectiveSystemPromptBlocks(options);
  assertUniqueBlockIds(ordered);

  const staticBlocks = ordered.filter(isStaticCacheable);
  const dynamicBlocks = ordered.filter((block) => !isStaticCacheable(block));
  const blocks = [...staticBlocks, boundaryBlock(), ...dynamicBlocks];

  return {
    blocks,
    text: blocks.map((block) => block.content).join('\n\n'),
    staticPrefixFingerprint: fingerprintPromptBlocks(staticBlocks),
    dynamicTailFingerprint: fingerprintPromptBlocks(dynamicBlocks),
  };
}

function sameArray(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function toSystemPromptSnapshot(prompt: ComposedSystemPrompt): SystemPromptSnapshot {
  return {
    version: 1,
    blockIds: prompt.blocks.map((block) => block.id),
    boundaryIndex: prompt.blocks.findIndex((block) => block.id === 'prompt.dynamic_boundary'),
    staticPrefixFingerprint: prompt.staticPrefixFingerprint,
    dynamicTailFingerprint: prompt.dynamicTailFingerprint,
  };
}

export function compareSystemPromptSnapshots(
  expected: SystemPromptSnapshot,
  actual: SystemPromptSnapshot,
): SystemPromptSnapshotDiff[] {
  const diffs: SystemPromptSnapshotDiff[] = [];
  if (!sameArray(expected.blockIds, actual.blockIds)) {
    diffs.push({ path: 'blockIds', expected: expected.blockIds, actual: actual.blockIds });
  }
  if (expected.boundaryIndex !== actual.boundaryIndex) {
    diffs.push({ path: 'boundaryIndex', expected: expected.boundaryIndex, actual: actual.boundaryIndex });
  }
  if (expected.staticPrefixFingerprint !== actual.staticPrefixFingerprint) {
    diffs.push({
      path: 'staticPrefixFingerprint',
      expected: expected.staticPrefixFingerprint,
      actual: actual.staticPrefixFingerprint,
    });
  }
  if (expected.dynamicTailFingerprint !== actual.dynamicTailFingerprint) {
    diffs.push({
      path: 'dynamicTailFingerprint',
      expected: expected.dynamicTailFingerprint,
      actual: actual.dynamicTailFingerprint,
    });
  }
  return diffs;
}
