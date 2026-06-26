import { z } from "zod";

/**
 * CR Operation-DSL (AGENT-SIDE schema + validation).
 *
 * An Operation is a VERIFIABLE, approval-gated unit of app control (Office / PDF /
 * media / SaaS) that the agent COMPILES and SUBMITS to the Xenesis Desk generic
 * Operation runner (`xd.ops.{plan,dryRun,run,status}`). Execution happens Desk-side;
 * the handlers are a Desk follow-on. This module is the agent's defense-in-depth:
 * it validates the shape BEFORE dispatch (mirroring computer_use's pre-dispatch
 * hard-blocks) so malformed Operations never leave the agent process.
 *
 * Security note: client-side validation is BEST-EFFORT. The Desk MUST also validate
 * + enforce approval server-side — the agent process is not a trust boundary.
 */

// ---------------------------------------------------------------------------
// Op-kind NAME table (string allowlist). Execution is Desk-side; the agent only
// asserts that each step.type is a KNOWN kind. Extensible: add a kind here + a
// required-args entry below.
// ---------------------------------------------------------------------------
export const OPERATION_STEP_KINDS = [
  // Office: spreadsheets
  "readWorkbook",
  "buildWorkbook",
  "insertChart",
  // Office: documents
  "fillDocumentTemplate",
  "generateDocument",
  "editDocument",
  "inspectDocument",
  // Office: slides
  "generateSlides",
  // Generic export (docx/xlsx/pptx → pdf, etc.)
  "export",
  // PDF
  "pdfMerge",
  "pdfSplit",
  "pdfExtractText",
  "pdfFillForm",
  // Media (ffmpeg-class)
  "mediaProbe",
  "mediaTranscode",
  "mediaTrim",
  "mediaSubtitle",
  // SaaS connectors
  "saas.get",
  "saas.list",
  "saas.create",
  "saas.send",
  // Destructive
  "delete"
] as const;

export type OperationStepKind = (typeof OPERATION_STEP_KINDS)[number];

const STEP_KIND_SET: ReadonlySet<string> = new Set(OPERATION_STEP_KINDS);

/**
 * Required args per step kind (defense-in-depth). Keys here MUST be present (non
 * null/undefined) in `step.args`. Kinds absent from this table require no args.
 * Keep conservative: only assert args that are truly mandatory to even submit.
 */
const STEP_REQUIRED_ARGS: Partial<Record<OperationStepKind, readonly string[]>> = {
  readWorkbook: ["path"],
  buildWorkbook: ["outPath"],
  insertChart: ["path"],
  fillDocumentTemplate: ["templatePath", "outPath"],
  generateDocument: ["outPath"],
  editDocument: ["path"],
  inspectDocument: ["path"],
  generateSlides: ["outPath"],
  export: ["path", "outPath"],
  pdfMerge: ["inputs", "outPath"],
  pdfSplit: ["path"],
  pdfExtractText: ["path"],
  pdfFillForm: ["path", "outPath"],
  mediaProbe: ["path"],
  mediaTranscode: ["path", "outPath"],
  mediaTrim: ["path", "outPath"],
  mediaSubtitle: ["path", "outPath"],
  "saas.get": ["connector"],
  "saas.list": ["connector"],
  "saas.create": ["connector"],
  "saas.send": ["connector"],
  delete: ["path"]
};

// ---------------------------------------------------------------------------
// Operation + Result TYPES
// ---------------------------------------------------------------------------
export interface OperationStep {
  type: string;
  args?: Record<string, unknown>;
}

export interface Operation {
  operationId?: string;
  /** Human/agent-readable workflow label (e.g. "build-quarterly-report"). */
  workflow: string;
  inputs?: Record<string, unknown>;
  steps: OperationStep[];
  /** Verify recipes to run after the steps (e.g. file readback, export check). */
  verify?: string[];
  requiresApproval?: boolean;
  dryRun?: boolean;
  workspaceRoot?: string;
}

export type OperationStatus =
  | "succeeded"
  | "failed"
  | "partial"
  | "awaiting_approval"
  | "running";

export interface OperationStepResult {
  type: string;
  ok: boolean;
  detail?: string;
  artifacts?: string[];
  [key: string]: unknown;
}

export interface OperationVerifyResult {
  check: string;
  ok: boolean;
  detail?: string;
  [key: string]: unknown;
}

export interface OperationArtifact {
  path?: string;
  kind?: string;
  [key: string]: unknown;
}

export interface OperationApprovalInfo {
  required?: boolean;
  actionInboxItemId?: string;
  level?: string;
  [key: string]: unknown;
}

export interface OperationResult {
  ok: boolean;
  operationId: string;
  status: OperationStatus;
  stepResults: OperationStepResult[];
  verifyResults: OperationVerifyResult[];
  artifacts: OperationArtifact[];
  renderedPreview?: string;
  approval?: OperationApprovalInfo;
}

// ---------------------------------------------------------------------------
// zod schema
// ---------------------------------------------------------------------------
export const operationStepSchema = z.object({
  type: z.string().min(1),
  args: z.record(z.unknown()).optional()
});

export const operationSchema = z.object({
  operationId: z.string().min(1).optional(),
  workflow: z.string().min(1),
  inputs: z.record(z.unknown()).optional(),
  steps: z.array(operationStepSchema).min(1),
  verify: z.array(z.string().min(1)).optional(),
  requiresApproval: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  workspaceRoot: z.string().min(1).optional()
});

export type ValidatedOperation = z.infer<typeof operationSchema>;

/**
 * OpenAI/strict-schema twin of the Operation schema: every optional becomes
 * `.nullable()` with NO `.optional()`/`.default()`. Used when embedding the Operation
 * inside the strict tool input schema (the OpenAI Responses API requires all fields
 * present + nullable instead of optional).
 */
export const operationStepOpenAISchema = z.object({
  type: z.string().min(1),
  args: z.record(z.unknown()).nullable()
});

export const operationOpenAISchema = z.object({
  operationId: z.string().min(1).nullable(),
  workflow: z.string().min(1),
  inputs: z.record(z.unknown()).nullable(),
  steps: z.array(operationStepOpenAISchema).min(1),
  verify: z.array(z.string().min(1)).nullable(),
  requiresApproval: z.boolean().nullable(),
  dryRun: z.boolean().nullable(),
  workspaceRoot: z.string().min(1).nullable()
});

export interface OperationValidationResult {
  ok: boolean;
  operation?: Operation;
  errors: string[];
}

/**
 * Validate an Operation BEFORE dispatch. Rejects:
 *  - non-object / missing required fields (via zod),
 *  - empty steps,
 *  - unknown step.type (not in OPERATION_STEP_KINDS),
 *  - missing required args for a known step kind.
 *
 * Returns a structured result (never throws on a normal validation failure) so the
 * tool can surface a clear client-side error with NO dispatch.
 */
export function validateOperation(input: unknown): OperationValidationResult {
  const parsed = operationSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "(root)";
      return `${path}: ${issue.message}`;
    });
    return { ok: false, errors };
  }

  const op = parsed.data;
  const errors: string[] = [];

  // zod already enforces steps.length >= 1, but assert defensively in case the
  // schema is relaxed later.
  if (op.steps.length === 0) {
    errors.push("steps: an Operation must contain at least one step.");
  }

  op.steps.forEach((step, index) => {
    if (!STEP_KIND_SET.has(step.type)) {
      errors.push(
        `steps[${index}].type: unknown step kind "${step.type}". ` +
          `Allowed kinds: ${OPERATION_STEP_KINDS.join(", ")}.`
      );
      return;
    }
    const required = STEP_REQUIRED_ARGS[step.type as OperationStepKind];
    if (required && required.length > 0) {
      const args = step.args ?? {};
      const missing = required.filter(
        (key) => args[key] === undefined || args[key] === null
      );
      if (missing.length > 0) {
        errors.push(
          `steps[${index}] (${step.type}): missing required arg(s): ${missing.join(", ")}.`
        );
      }
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, operation: op as Operation, errors: [] };
}

/** True when a step kind is a known op-kind (allowlist membership). */
export function isKnownStepKind(type: string): type is OperationStepKind {
  return STEP_KIND_SET.has(type);
}
