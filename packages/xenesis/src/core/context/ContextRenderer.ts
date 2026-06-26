import { wrapExternalContent } from "../prompt/ExternalContentPolicy.js";
import type { PromptBlock } from "../prompt/PromptComposer.js";
import type { ContextCacheScope, ContextRecord } from "./ContextRecord.js";

export interface ContextRenderAudit {
  id: string;
  suspicious: boolean;
  truncated: boolean;
  sensitive: boolean;
  warnings: string[];
  cacheScope: ContextCacheScope;
}

export interface ContextPromptRenderResult {
  blocks: PromptBlock[];
  audit: ContextRenderAudit[];
}

function contextSource(record: ContextRecord) {
  return record.sourcePath ?? record.id;
}

function renderableContent(record: ContextRecord) {
  return record.sensitive ? "[sensitive context redacted]" : record.content;
}

function renderableCacheScope(record: ContextRecord): ContextCacheScope {
  return record.sensitive ? "none" : record.cacheScope;
}

function renderWarnings(record: ContextRecord, warnings: string[]) {
  if (!record.sensitive) return warnings;
  return [
    ...warnings,
    "Sensitive context content was redacted before prompt injection."
  ];
}

export function renderContextRecordsForPrompt(records: readonly ContextRecord[]): ContextPromptRenderResult {
  const blocks: PromptBlock[] = [];
  const audit: ContextRenderAudit[] = [];

  for (const record of records) {
    const wrapped = wrapExternalContent({
      kind: record.kind,
      source: contextSource(record),
      authority: record.authority,
      content: renderableContent(record),
      maxChars: Math.max(1, record.tokenEstimate * 4)
    });
    const cacheScope = renderableCacheScope(record);

    blocks.push({
      id: `context.${record.id}`,
      source: `context:${record.kind}:${record.authority}`,
      cacheScope,
      content: wrapped.content,
      priority: record.priority
    });
    audit.push({
      id: record.id,
      suspicious: wrapped.suspicious,
      truncated: wrapped.truncated,
      sensitive: record.sensitive,
      warnings: renderWarnings(record, wrapped.warnings),
      cacheScope
    });
  }

  return { blocks, audit };
}

export function contextRecordsToPromptBlocks(records: readonly ContextRecord[]): PromptBlock[] {
  return renderContextRecordsForPrompt(records).blocks;
}
