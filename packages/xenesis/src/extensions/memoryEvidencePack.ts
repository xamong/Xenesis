import type { AgentMessage } from "../core/messages.js";
import { wrapExternalContent } from "../core/prompt/ExternalContentPolicy.js";
import {
  classifyMemoryEvidenceSensitivity,
  effectiveMemoryInputSensitivity,
  maxMemorySensitivity
} from "./memoryPolicy.js";
import { memoryRunbookSearchText } from "./memoryRunbook.js";
import { isMemoryValidAt } from "./memoryTemporal.js";
import type { MemoryConflict, MemoryEvidenceRecord, MemoryProposal, MemorySensitivity } from "./memoryTypes.js";
import type { MemoryRecord } from "./types.js";

export type MemoryQueryIntent =
  | "preference"
  | "project_history"
  | "decision"
  | "temporal_change"
  | "procedure"
  | "evidence"
  | "unknown";

export type MemoryPackRecency = "current" | "historical" | "mixed" | "unknown";

export type MemoryReadAuthority =
  | "live_user_instruction"
  | "current_workspace_state"
  | "ledger_memory_evidence"
  | "ledger_memory_no_evidence"
  | "historical_memory"
  | "pending_proposal";

export interface MemoryEvidencePack {
  intent: MemoryQueryIntent;
  records: MemoryRecord[];
  evidence: MemoryEvidenceRecord[];
  conflicts: MemoryConflict[];
  proposals: MemoryProposal[];
  confidence: number;
  sensitivity: MemorySensitivity;
  recency: MemoryPackRecency;
  abstainReason?: string;
  at: string;
}

export interface MemoryEvidencePackInput {
  intent: MemoryQueryIntent;
  query: string;
  records: MemoryRecord[];
  evidence: MemoryEvidenceRecord[];
  conflicts?: MemoryConflict[];
  proposals?: MemoryProposal[];
  at?: string;
  allowSensitive?: boolean;
}

type SystemMessage = Extract<AgentMessage, { role: "system" }>;

const READ_AUTHORITY_RANK: Record<MemoryReadAuthority, number> = {
  live_user_instruction: 0,
  current_workspace_state: 1,
  ledger_memory_evidence: 2,
  ledger_memory_no_evidence: 3,
  historical_memory: 4,
  pending_proposal: 5
};

function includesAny(value: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function classifyMemoryQueryIntent(query: string): MemoryQueryIntent {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return "unknown";
  if (includesAny(normalized, [/바뀌|변경|달라|이전|나중|과거|현재|change|changed|update|supersede/iu])) {
    return "temporal_change";
  }
  if (includesAny(normalized, [/근거|증거|출처|source|evidence|citation|cite/iu])) return "evidence";
  if (includesAny(normalized, [/절차|방법|런북|워크플로|workflow|runbook|procedure|process/iu])) return "procedure";
  if (includesAny(normalized, [/프로젝트|project|히스토리|history|상태|status/iu])) return "project_history";
  if (includesAny(normalized, [/결정|decision|decided|보류|승인|거절/iu])) return "decision";
  if (includesAny(normalized, [/선호|좋아|싫어|허용|피한다|prefer|preference|like|dislike|avoid|allow/iu])) {
    return "preference";
  }
  return "unknown";
}

function maxSensitivity(values: MemorySensitivity[]): MemorySensitivity {
  return maxMemorySensitivity(...values);
}

function isSensitive(value: MemorySensitivity | undefined): boolean {
  return value === "high" || value === "restricted";
}

function currentAt(record: MemoryRecord, at: string): boolean {
  return isMemoryValidAt(record, at);
}

export function memoryReadAuthority(
  record: MemoryRecord,
  at: string = new Date().toISOString(),
  visibleEvidenceIds: ReadonlySet<string> = new Set(record.evidenceIds ?? []),
): MemoryReadAuthority {
  if (!currentAt(record, at)) return "historical_memory";
  if ((record.evidenceIds ?? []).some((id) => visibleEvidenceIds.has(id))) return "ledger_memory_evidence";
  return "ledger_memory_no_evidence";
}

function recencyFor(records: MemoryRecord[], at: string): MemoryPackRecency {
  if (records.length === 0) return "unknown";
  const current = records.filter((record) => currentAt(record, at)).length;
  const historical = records.length - current;
  if (current > 0 && historical > 0) return "mixed";
  if (current > 0) return "current";
  return "historical";
}

function confidenceFor(input: {
  records: MemoryRecord[];
  proposals: MemoryProposal[];
  recency: MemoryPackRecency;
  visibleEvidenceIds: ReadonlySet<string>;
  abstainReason?: string;
}): number {
  if (input.records.length === 0) return input.proposals.length > 0 ? 0.25 : 0;
  const hasEvidence = input.records.some((record) => (record.evidenceIds ?? []).some((id) => input.visibleEvidenceIds.has(id)));
  const hasNoEvidence = input.records.some((record) => record.noEvidenceReason);
  let confidence = hasEvidence ? 0.88 : hasNoEvidence ? 0.66 : 0.58;
  if (input.recency === "historical") confidence -= 0.12;
  if (input.recency === "mixed") confidence -= 0.06;
  if (input.abstainReason) confidence = Math.min(confidence, 0.4);
  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
}

function sortByAuthority(records: MemoryRecord[], at: string, visibleEvidenceIds: ReadonlySet<string>): MemoryRecord[] {
  return [...records].sort((left, right) => {
    const authority =
      READ_AUTHORITY_RANK[memoryReadAuthority(left, at, visibleEvidenceIds)] -
      READ_AUTHORITY_RANK[memoryReadAuthority(right, at, visibleEvidenceIds)];
    if (authority !== 0) return authority;
    return Date.parse(right.validFrom ?? right.updatedAt) - Date.parse(left.validFrom ?? left.updatedAt) ||
      left.id.localeCompare(right.id);
  });
}

function redactProposal(proposal: MemoryProposal): MemoryProposal {
  const sensitivity = maxMemorySensitivity(
    proposal.decision.sensitivity,
    proposal.input.sensitivity,
    effectiveMemoryInputSensitivity(proposal.input, proposal.input.sensitivity)
  );
  if (!isSensitive(sensitivity)) {
    return {
      ...proposal,
      decision: { ...proposal.decision, sensitivity },
      input: { ...proposal.input, sensitivity }
    };
  }
  return {
    ...proposal,
    decision: { ...proposal.decision, sensitivity },
    input: {
      ...proposal.input,
      text: `[redacted: ${sensitivity} memory proposal]`,
      tags: [],
      source: undefined,
      sensitivity
    }
  };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderEvidenceLine(evidence: MemoryEvidenceRecord): string {
  const status = evidence.status ?? "active";
  const summary = evidence.summary ? ` summary="${escapeAttribute(evidence.summary)}"` : "";
  const hash = evidence.contentHash ? ` contentHash="${escapeAttribute(evidence.contentHash)}"` : "";
  return `<evidence id="${escapeAttribute(evidence.id)}" kind="${evidence.kind}" sensitivity="${evidence.sensitivity}" status="${status}"${hash}${summary} />`;
}

function memoryContentForContext(record: MemoryRecord): string {
  const runbookText = memoryRunbookSearchText(record);
  if (!runbookText) return record.text;
  return [record.text, "", "Structured runbook:", runbookText].join("\n");
}

export function buildMemoryEvidencePack(input: MemoryEvidencePackInput): MemoryEvidencePack {
  const at = input.at ?? new Date().toISOString();
  const allowSensitive = input.allowSensitive === true;
  const recordSensitivity = new Map(
    input.records.map((record) => [record.id, effectiveMemoryInputSensitivity(record, record.sensitivity)])
  );
  const evidenceSensitivity = new Map(
    input.evidence.map((evidence) => [evidence.id, classifyMemoryEvidenceSensitivity(evidence)])
  );
  const rawSensitivity = maxSensitivity([
    ...Array.from(recordSensitivity.values()),
    ...Array.from(evidenceSensitivity.values()),
    ...(input.proposals ?? []).map((proposal) =>
      maxMemorySensitivity(
        proposal.decision.sensitivity,
        proposal.input.sensitivity,
        effectiveMemoryInputSensitivity(proposal.input, proposal.input.sensitivity)
      )
    )
  ]);
  const visibleRecords = !allowSensitive
    ? input.records.filter((record) => !isSensitive(recordSensitivity.get(record.id)))
    : input.records;
  const referencedEvidenceIds = new Set(visibleRecords.flatMap((record) => record.evidenceIds ?? []));
  const visibleEvidence = input.evidence.filter((evidence) => {
    if (!referencedEvidenceIds.has(evidence.id)) return false;
    return allowSensitive || !isSensitive(evidenceSensitivity.get(evidence.id));
  });
  const visibleEvidenceIds = new Set(visibleEvidence.map((evidence) => evidence.id));
  const records = sortByAuthority(visibleRecords, at, visibleEvidenceIds);
  const recency = recencyFor(records, at);
  const proposals = (input.proposals ?? []).map(redactProposal);
  const abstainReason = records.length > 0
    ? undefined
    : input.records.length > 0
      ? "matching memory is sensitive and requires proof"
      : proposals.length > 0
        ? "only pending proposal matches this query"
        : "no accepted memory matches this query";

  return {
    intent: input.intent,
    records,
    evidence: visibleEvidence,
    conflicts: input.conflicts ?? [],
    proposals,
    confidence: confidenceFor({ records, proposals, recency, visibleEvidenceIds, abstainReason }),
    sensitivity: rawSensitivity,
    recency,
    at,
    ...(abstainReason ? { abstainReason } : {})
  };
}

export function buildMemoryEvidencePackSystemMessage(pack: MemoryEvidencePack): SystemMessage | undefined {
  const recordBlocks = pack.records.map((record) => {
    const wrapped = wrapExternalContent({
      kind: "memory",
      source: record.source ?? "memory",
      authority: "untrusted",
      content: memoryContentForContext(record)
    });
    return [
      `<memory id="${escapeAttribute(record.id)}" authority="${memoryReadAuthority(record, pack.at, new Set(pack.evidence.map((item) => item.id)))}" tags="${record.tags.map(escapeAttribute).join(",")}" updatedAt="${escapeAttribute(record.updatedAt)}"${record.validFrom ? ` validFrom="${escapeAttribute(record.validFrom)}"` : ""}${record.validTo ? ` validTo="${escapeAttribute(record.validTo)}"` : ""}>`,
      wrapped.content,
      "</memory>"
    ].join("\n");
  });
  const evidenceLines = pack.evidence.map(renderEvidenceLine);
  const proposalLines = pack.proposals.map((proposal) =>
    `<proposal id="${escapeAttribute(proposal.id)}" status="${proposal.status}" sensitivity="${proposal.decision.sensitivity}" inputId="${escapeAttribute(proposal.input.id)}">${escapeAttribute(proposal.input.text)}</proposal>`
  );
  return {
    role: "system",
    content: [
      "Xenesis evidence-governed memory pack:",
      `intent=${pack.intent} confidence=${pack.confidence} recency=${pack.recency} sensitivity=${pack.sensitivity}${pack.abstainReason ? ` abstainReason="${escapeAttribute(pack.abstainReason)}"` : ""}`,
      "",
      recordBlocks.length > 0 ? recordBlocks.join("\n\n") : "No accepted memory records matched this query.",
      evidenceLines.length > 0 ? ["", "Evidence:", ...evidenceLines].join("\n") : "",
      proposalLines.length > 0 ? ["", "Pending proposals:", ...proposalLines].join("\n") : ""
    ].filter(Boolean).join("\n")
  };
}
