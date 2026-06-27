import { isProcedureMemoryInput, memoryRunbookSearchText, validateMemoryRunbookInput } from "./memoryRunbook.js";
import type { MemoryEvidenceRecord, MemorySensitivity, MemoryWriteContext, MemoryWriteDecision } from "./memoryTypes.js";
import type { MemoryInput } from "./types.js";

const RESTRICTED_PATTERNS = [
  /\b(api[_ -]?key|secret|password|credential|token)\b/i,
  /\bsk-[a-z0-9_-]{6,}\b/i,
  /비밀번호|인증키|토큰|자격증명/i
];

const HIGH_PATTERNS = [
  /건강|질병|병원|가족|재무|법률|정치|종교/i,
  /\b(health|medical|family|finance|legal|political|religion)\b/i
];

const POISONING_PATTERNS = [
  /ignore\s+(?:all\s+)?previous\s+instructions?/i,
  /store\s+this\s+as\s+(?:trusted\s+)?(?:long[- ]term\s+)?memory/i,
  /approvalrequired\s*=\s*false/i,
  /approved\s*=\s*true/i,
  /sourcekind\s*=\s*conversation/i,
  /externaltaint\s*=\s*false/i,
  /<system>[\s\S]*<\/system>/i,
  /<!--\s*hidden\s+instruction:/i,
  /이전\s*지시(?:를)?\s*무시/i
];

function runbookText(input: MemoryInput): string {
  return memoryRunbookSearchText(input);
}

function tagsText(input: MemoryInput): string {
  return [input.text, runbookText(input), ...(input.tags ?? [])].join(" ");
}

function provenanceText(input: MemoryInput): string {
  return [input.text, runbookText(input), input.source ?? "", ...(input.tags ?? [])].join(" ");
}

export function isMemoryPoisoningAttempt(text: string): boolean {
  return POISONING_PATTERNS.some((pattern) => pattern.test(text));
}

export function classifyMemorySensitivity(input: MemoryInput): MemorySensitivity {
  const text = tagsText(input);
  if (RESTRICTED_PATTERNS.some((pattern) => pattern.test(text))) return "restricted";
  if (HIGH_PATTERNS.some((pattern) => pattern.test(text))) return "high";
  return "low";
}

const SENSITIVITY_RANK: Record<MemorySensitivity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  restricted: 3
};

export function maxMemorySensitivity(
  ...values: Array<MemorySensitivity | undefined>
): MemorySensitivity {
  return values.reduce<MemorySensitivity>(
    (current, next) => {
      const candidate = next ?? "low";
      return SENSITIVITY_RANK[candidate] > SENSITIVITY_RANK[current] ? candidate : current;
    },
    "low"
  );
}

export function effectiveMemoryInputSensitivity(
  input: MemoryInput,
  declared?: MemorySensitivity,
): MemorySensitivity {
  return maxMemorySensitivity(declared, classifyMemorySensitivity(input));
}

export function classifyMemoryEvidenceSensitivity(evidence: MemoryEvidenceRecord): MemorySensitivity {
  const metadata = evidence.metadata ? JSON.stringify(evidence.metadata) : "";
  return effectiveMemoryInputSensitivity({
    id: evidence.id,
    text: [
      evidence.source,
      evidence.summary ?? "",
      evidence.uri ?? "",
      metadata
    ].join(" "),
    tags: []
  }, evidence.sensitivity);
}

export function classifyMemoryWrite(input: MemoryInput, context: MemoryWriteContext): MemoryWriteDecision {
  validateMemoryRunbookInput(input);
  const sensitivity = classifyMemorySensitivity(input);
  if (isProcedureMemoryInput(input) && (context.actor === "agent" || context.sourceKind === "agent")) {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "agent-inferred runbook requires review" };
  }
  if (isMemoryPoisoningAttempt(provenanceText(input))) {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "poisoning attempt quarantine" };
  }
  if (context.intent === "propose") {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "explicit propose" };
  }
  if (Array.isArray(input.conflictsWith) && input.conflictsWith.length > 0) {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "conflict detected" };
  }
  if (context.externalTaint || context.sourceKind === "external_document") {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "external or tainted provenance" };
  }
  if (context.trust !== "trusted" || context.sourceKind === "unknown") {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "unknown provenance" };
  }
  if (sensitivity === "high" || sensitivity === "restricted") {
    return { action: "propose", sensitivity, requiresApproval: true, reason: "sensitive memory requires approval" };
  }
  return { action: "accept", sensitivity, requiresApproval: false, reason: "trusted low-risk memory" };
}
