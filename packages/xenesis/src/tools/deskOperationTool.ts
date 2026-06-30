import { z } from 'zod';
import {
  type Operation,
  operationOpenAISchema,
  operationSchema,
  validateOperation,
} from '../core/operations/operationSchema.js';
import { callCapabilityPath } from './deskBridgeTools.js';
import type { Tool, ToolContext } from './types.js';

/**
 * CR AGENT-SIDE: `desk_operation` — submit VERIFIABLE, approval-gated app-control
 * Operations (Office / PDF / media / SaaS) to the Xenesis Desk generic Operation
 * runner (`xd.ops.{plan,dryRun,run,status}`) instead of clicking a screen. This is
 * the PRODUCT path for app automation.
 *
 * The Desk runner + per-kind handlers are a Desk follow-on. This tool ROUTES
 * Operations to those capabilities and DEGRADES cleanly when they are not yet wired
 * (exactly like the P7 `computer_use` tool degrades when `xd.computer.*` is absent):
 * on a not-wired / unknown-capability payload it returns a clear fallback pointing
 * at the headless ms-office / pdf / media skills.
 *
 * Security model: client-side `validateOperation` is BEST-EFFORT defense-in-depth.
 * The Desk MUST also validate + enforce approval server-side (the agent process is
 * not a trust boundary).
 */

const operationModeSchema = z.enum(['plan', 'dryRun', 'run', 'status']);

const deskOperationInput = z.object({
  mode: operationModeSchema,
  operation: operationSchema.optional(),
  operationId: z.string().min(1).optional(),
  approved: z.boolean().default(false),
  timeoutMs: z.number().int().positive().max(600_000).default(60_000),
});

// OpenAI/strict-schema twin: every optional becomes .nullable() with NO .default/.optional.
const deskOperationOpenAIInput = z.object({
  mode: operationModeSchema,
  operation: operationOpenAISchema.nullable(),
  operationId: z.string().min(1).nullable(),
  approved: z.boolean().nullable(),
  timeoutMs: z.number().int().positive().max(600_000).nullable(),
});

type DeskOperationInput = z.infer<typeof deskOperationInput>;

// "Not wired" / "unknown capability" / "unavailable" Desk payload error signatures
// → degrade cleanly. Extends the P7 isNotWired matcher to ALSO match "unknown
// capability" (the Desk returns "Unknown capability: <path>" when the node is
// absent — deskBridgeCapabilities.ts) and "registered but not wired".
function isNotWired(error: unknown): boolean {
  const message = String(error ?? '').toLowerCase();
  return (
    message.includes('not wired') ||
    message.includes('unknown capability') ||
    message.includes('registered but not wired') ||
    message.includes('unavailable') ||
    message.includes('not registered')
  );
}

const NOT_AVAILABLE_MESSAGE =
  'Desk Operation runner not available; use the ms-office / pdf / media skill (headless path) instead.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Approval-relay extractor — mirrors computer_use / deskCallCapability. When the
 * Desk payload signals approvalRequired, surface the approval/inbox id WITHOUT
 * claiming the Operation succeeded.
 */
function approvalInboxId(payload: Record<string, unknown>): string {
  const item = isRecord(payload.actionInboxItem) ? (payload.actionInboxItem as { id?: unknown }) : {};
  const id = typeof item.id === 'string' && item.id ? item.id : undefined;
  if (id) return ` Approval request: ${id}`;
  // Some runners may nest the inbox id under approval.actionInboxItemId.
  if (isRecord(payload.approval)) {
    const nested = payload.approval as { actionInboxItemId?: unknown };
    if (typeof nested.actionInboxItemId === 'string' && nested.actionInboxItemId) {
      return ` Approval request: ${nested.actionInboxItemId}`;
    }
  }
  return '';
}

export function createDeskOperationTool(): Tool<DeskOperationInput, Record<string, unknown>> {
  return {
    name: 'desk_operation',
    description: [
      'Submit verifiable, approval-gated app-control Operations (Office/PDF/media/SaaS) to the',
      'Xenesis Desk Operation runner (xd.ops.{plan,dryRun,run,status}) — NOT screen-clicking.',
      'Compile the request into an Operation { workflow, steps[{type,args}], verify[] } and submit:',
      'plan (preview) → dryRun (simulate, no writes) → run (execute). status reads a prior run by operationId.',
      'overwrite-existing / send / delete / external-share / pay / submit require approval (set approved=true on run).',
      'If the runner is not available, fall back to the ms-office / pdf / media skill (headless path).',
    ].join(' '),
    inputSchema: deskOperationInput,
    openaiInputSchema: deskOperationOpenAIInput,
    isReadOnly: (input) => input.mode === 'plan' || input.mode === 'dryRun' || input.mode === 'status',
    shouldDefer: true,
    searchHint:
      'office word excel powerpoint pdf media ffmpeg saas operation verify approval document spreadsheet slides report',
    async run(input, context) {
      const mode = input.mode;
      try {
        // -----------------------------------------------------------------
        // status — read a prior Operation by id (no Operation body).
        // -----------------------------------------------------------------
        if (mode === 'status') {
          if (!input.operationId) {
            return { ok: false, content: 'desk_operation status requires "operationId".' };
          }
          const payload = await callCapabilityPath(
            context,
            'xd.ops.status',
            { source: 'xenesis', operationId: input.operationId },
            false,
            input.timeoutMs,
          );
          if (payload.ok === false) {
            if (isNotWired(payload.error)) {
              return { ok: false, content: NOT_AVAILABLE_MESSAGE, data: payload };
            }
            return {
              ok: false,
              content: String(payload.error ?? 'desk_operation status failed.'),
              data: payload,
            };
          }
          return {
            ok: true,
            content: `desk_operation status: ${input.operationId}`,
            data: payload,
          };
        }

        // -----------------------------------------------------------------
        // plan / dryRun / run — require + VALIDATE the Operation FIRST
        // (client-side defense-in-depth; reject with NO dispatch).
        // -----------------------------------------------------------------
        if (!input.operation) {
          return { ok: false, content: `desk_operation ${mode} requires an "operation".` };
        }
        const validation = validateOperation(input.operation);
        if (!validation.ok || !validation.operation) {
          return {
            ok: false,
            content: `desk_operation ${mode} rejected: invalid Operation. ` + validation.errors.join(' '),
          };
        }
        const operation: Operation = validation.operation;

        // plan/dryRun/status NEVER send approved:true.
        const approved = mode === 'run' && input.approved === true;

        const operationArgs: Record<string, unknown> = {
          source: 'xenesis',
          operation,
        };

        const payload = await callCapabilityPath(context, `xd.ops.${mode}`, operationArgs, approved, input.timeoutMs);

        // Approval relay — return ok:true with the approval/inbox message; do NOT
        // claim the Operation succeeded (mirror computer_use / deskCallCapability).
        if (payload.approvalRequired) {
          const id = approvalInboxId(payload as Record<string, unknown>);
          return {
            ok: true,
            content:
              `desk_operation ${mode} requires Desk approval before it can run: ` +
              `${String(payload.path ?? `xd.ops.${mode}`)}.${id} ` +
              'Re-run with approved=true after the Desk approval is granted.',
            data: payload,
          };
        }

        if (payload.ok === false) {
          // Degrade cleanly on not-wired / unknown-capability / unavailable.
          if (isNotWired(payload.error)) {
            return { ok: false, content: NOT_AVAILABLE_MESSAGE, data: payload };
          }
          return {
            ok: false,
            content: String(payload.error ?? `desk_operation ${mode} failed.`),
            data: payload,
          };
        }

        return {
          ok: true,
          content: `desk_operation ${mode}: ${String(payload.path ?? `xd.ops.${mode}`)}`,
          data: payload,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isNotWired(message)) return { ok: false, content: NOT_AVAILABLE_MESSAGE };
        return { ok: false, content: `desk_operation ${mode} failed: ${message}` };
      }
    },
  };
}
