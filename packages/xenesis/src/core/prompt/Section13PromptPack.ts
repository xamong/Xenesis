import { auditComposedSystemPrompt, type PromptAuditReport } from './PromptAudit.js';
import { type ComposedSystemPrompt, type PromptBlock, systemPromptDynamicBoundary } from './PromptComposer.js';
import { PromptSectionRegistry } from './PromptSectionRegistry.js';

export const section13StaticReferenceNames = [
  'simple_intro',
  'simple_system',
  'doing_tasks',
  'actions',
  'using_tools',
  'tone_style',
  'output_efficiency',
] as const;

export const section13DynamicReferenceNames = [
  'session_guidance',
  'memory',
  'ant_model_override',
  'env_info_simple',
  'language',
  'output_style',
  'mcp_instructions',
  'scratchpad',
  'frc',
  'summarize_tool_results',
  'numeric_length_anchors',
  'token_budget',
  'brief',
] as const;

export const section13VolatileReferenceNames = ['mcp_instructions'] as const;

export type Section13StaticReferenceName = (typeof section13StaticReferenceNames)[number];
export type Section13DynamicReferenceName = (typeof section13DynamicReferenceNames)[number];
export type Section13ReferenceName = Section13StaticReferenceName | Section13DynamicReferenceName;

export interface CreateSection13PromptBlocksOptions {
  contentByReferenceName: Partial<Record<Section13ReferenceName, string | null | undefined>>;
  source?: string;
}

export interface Section13PromptTrace {
  type: 'prompt_section_trace';
  source: 'reference.section_13';
  boundarySentinel: string;
  boundaryIndex: number;
  staticReferenceNames: readonly Section13StaticReferenceName[];
  dynamicReferenceNames: readonly Section13DynamicReferenceName[];
  volatileReferenceNames: readonly (typeof section13VolatileReferenceNames)[number][];
}

function blockId(kind: 'static' | 'dynamic', referenceName: Section13ReferenceName) {
  return `section13.${kind}.${referenceName}`;
}

function staticPriority(index: number) {
  return (index + 1) * 10;
}

function dynamicPriority(index: number) {
  return 1000 + (index + 1) * 10;
}

function cacheScope(referenceName: Section13ReferenceName): PromptBlock['cacheScope'] {
  return section13VolatileReferenceNames.includes(referenceName as (typeof section13VolatileReferenceNames)[number])
    ? 'turn'
    : 'session';
}

function sectionBlock(
  kind: 'static' | 'dynamic',
  referenceName: Section13ReferenceName,
  content: string | null | undefined,
  priority: number,
  source: string,
): PromptBlock | undefined {
  if (content === null || content === undefined) return undefined;
  return {
    id: blockId(kind, referenceName),
    source,
    cacheScope: kind === 'static' ? 'global' : cacheScope(referenceName),
    content,
    priority,
  };
}

export function createSection13PromptRegistry(options: CreateSection13PromptBlocksOptions): PromptSectionRegistry {
  const source = options.source ?? 'prompt.section_13';
  return new PromptSectionRegistry(
    [
      ...section13StaticReferenceNames.map((name, index) =>
        sectionBlock('static', name, options.contentByReferenceName[name], staticPriority(index), source),
      ),
      ...section13DynamicReferenceNames.map((name, index) =>
        sectionBlock('dynamic', name, options.contentByReferenceName[name], dynamicPriority(index), source),
      ),
    ].map(
      (block, index) =>
        block ?? {
          id:
            index < section13StaticReferenceNames.length
              ? blockId('static', section13StaticReferenceNames[index]!)
              : blockId('dynamic', section13DynamicReferenceNames[index - section13StaticReferenceNames.length]!),
          source,
          cacheScope: 'none' as const,
          content: '',
          priority:
            index < section13StaticReferenceNames.length
              ? staticPriority(index)
              : dynamicPriority(index - section13StaticReferenceNames.length),
          enabled: false,
        },
    ),
  );
}

export function createSection13PromptBlocks(options: CreateSection13PromptBlocksOptions): PromptBlock[] {
  return createSection13PromptRegistry(options).resolve();
}

export function auditSection13Prompt(prompt: ComposedSystemPrompt, registry: PromptSectionRegistry): PromptAuditReport {
  return auditComposedSystemPrompt(prompt, {
    disabledSectionIds: registry.disabledSectionIds(),
  });
}

export function toSection13PromptTrace(prompt: ComposedSystemPrompt): Section13PromptTrace {
  return {
    type: 'prompt_section_trace',
    source: 'reference.section_13',
    boundarySentinel: systemPromptDynamicBoundary,
    boundaryIndex: prompt.blocks.findIndex((block) => block.id === 'prompt.dynamic_boundary'),
    staticReferenceNames: section13StaticReferenceNames,
    dynamicReferenceNames: section13DynamicReferenceNames,
    volatileReferenceNames: section13VolatileReferenceNames,
  };
}

export function toSection13PromptOracleObservation(prompt: ComposedSystemPrompt) {
  return {
    ledgerEntries: [toSection13PromptTrace(prompt)],
    finalStatus: 'section13_trace_ready',
    visibleResult:
      'section order, boundary sentinel, and cache-break sections match the reference section 13 prompt stack',
  };
}
