import { createHash } from "node:crypto";
import type { ComposedSystemPrompt, PromptCacheScope } from "./PromptComposer.js";

export type PromptAuditCacheRegion = "stable" | "boundary" | "dynamic";

export interface PromptAuditBlock {
  id: string;
  source: string;
  cacheScope: PromptCacheScope;
  cacheRegion: PromptAuditCacheRegion;
  contentFingerprint: string;
}

export interface PromptAuditReport {
  type: "prompt_audit";
  renderedBlockIds: string[];
  boundaryIndex: number;
  staticPrefixFingerprint: string;
  dynamicTailFingerprint: string;
  disabledSectionIds: string[];
  blocks: PromptAuditBlock[];
}

export interface AuditComposedSystemPromptOptions {
  disabledSectionIds?: readonly string[];
}

function fingerprintContent(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function cacheRegion(index: number, boundaryIndex: number): PromptAuditCacheRegion {
  if (index === boundaryIndex) return "boundary";
  return index < boundaryIndex ? "stable" : "dynamic";
}

export function auditComposedSystemPrompt(
  prompt: ComposedSystemPrompt,
  options: AuditComposedSystemPromptOptions = {}
): PromptAuditReport {
  const boundaryIndex = prompt.blocks.findIndex((block) => block.id === "prompt.dynamic_boundary");
  return {
    type: "prompt_audit",
    renderedBlockIds: prompt.blocks.map((block) => block.id),
    boundaryIndex,
    staticPrefixFingerprint: prompt.staticPrefixFingerprint,
    dynamicTailFingerprint: prompt.dynamicTailFingerprint,
    disabledSectionIds: [...(options.disabledSectionIds ?? [])],
    blocks: prompt.blocks.map((block, index) => ({
      id: block.id,
      source: block.source,
      cacheScope: block.cacheScope,
      cacheRegion: cacheRegion(index, boundaryIndex),
      contentFingerprint: fingerprintContent(block.content)
    }))
  };
}
