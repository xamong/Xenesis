import {
  arbitrateContextRecords,
  type ContextArbitrationAudit
} from "./ContextArbitrator.js";
import {
  renderContextRecordsForPrompt,
  type ContextRenderAudit
} from "./ContextRenderer.js";
import type { ContextRecord } from "./ContextRecord.js";
import type { PromptBlock } from "../prompt/PromptComposer.js";

export interface ContextSourceAdapter {
  id: string;
  load(): Promise<ContextRecord[]> | ContextRecord[];
}

export interface BuildContextPromptBlocksOptions {
  adapters: ContextSourceAdapter[];
  tokenBudget: number;
  now?: Date;
}

export interface ContextPromptBlockBuildResult {
  records: ContextRecord[];
  blocks: PromptBlock[];
  audit: ContextArbitrationAudit & {
    sourceAdapters: string[];
    sourceRecordCount: number;
    rendered: ContextRenderAudit[];
  };
}

export async function buildContextPromptBlocks(
  options: BuildContextPromptBlocksOptions
): Promise<ContextPromptBlockBuildResult> {
  const records: ContextRecord[] = [];
  const sourceAdapters: string[] = [];

  for (const adapter of options.adapters) {
    sourceAdapters.push(adapter.id);
    records.push(...await adapter.load());
  }

  const arbitration = arbitrateContextRecords({
    records,
    tokenBudget: options.tokenBudget,
    now: options.now
  });
  const rendered = renderContextRecordsForPrompt(arbitration.selected);

  return {
    records: arbitration.selected,
    blocks: rendered.blocks,
    audit: {
      ...arbitration.audit,
      sourceAdapters,
      sourceRecordCount: records.length,
      rendered: rendered.audit
    }
  };
}
