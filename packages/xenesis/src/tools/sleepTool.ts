import { z } from "zod";
import type { Tool } from "./types.js";

export const WAIT_TOOL_NAME = "wait";
export const SLEEP_TOOL_LEGACY_ALIAS = "sleep";

const waitInput = z.object({
  waitMs: z.number().int().min(1).max(300_000).optional(),
  durationMs: z.number().int().min(1).max(300_000).optional(),
  note: z.preprocess(
    (value) => value === null ? undefined : value,
    z.string().trim().min(1).max(500).optional()
  ),
  reason: z.preprocess(
    (value) => value === null ? undefined : value,
    z.string().trim().min(1).max(500).optional()
  )
}).strict().superRefine((input, context) => {
  if (input.waitMs === undefined && input.durationMs === undefined) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waitMs"],
      message: "waitMs is required."
    });
  }
});

const waitOpenAIInput = z.object({
  waitMs: z.number().int().min(1).max(300_000),
  note: z.string().trim().min(1).max(500).nullable()
});

export interface WaitToolResult {
  requestedMs: number;
  elapsedMs: number;
  interrupted: boolean;
}

export type SleepToolResult = WaitToolResult;

function waitForDuration(durationMs: number, signal?: AbortSignal): Promise<WaitToolResult> {
  const startedAt = Date.now();
  if (signal?.aborted) {
    return Promise.resolve({
      requestedMs: durationMs,
      elapsedMs: 0,
      interrupted: true
    });
  }

  return new Promise((resolveWait) => {
    let settled = false;
    let timer: NodeJS.Timeout | undefined;
    const finish = (interrupted: boolean) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolveWait({
        requestedMs: durationMs,
        elapsedMs: Math.max(0, Date.now() - startedAt),
        interrupted
      });
    };
    const onAbort = () => finish(true);

    timer = setTimeout(() => finish(false), durationMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function requestedMsFromInput(input: z.infer<typeof waitInput>) {
  return input.waitMs ?? input.durationMs ?? 1;
}

function noteFromInput(input: z.infer<typeof waitInput>) {
  return input.note ?? input.reason ?? undefined;
}

export const sleepTool: Tool<z.infer<typeof waitInput>, WaitToolResult> = {
  name: WAIT_TOOL_NAME,
  aliases: [SLEEP_TOOL_LEGACY_ALIAS],
  description: [
    "Pause the agent loop for a bounded amount of time without starting an operating-system command.",
    "Use this for short backoff windows, polling gaps, or user-requested waiting when no Desk or workspace action is ready yet.",
    "The runtime may cancel the wait through the active abort signal. This tool is read-only and safe to run beside other read-only work."
  ].join("\n\n"),
  inputSchema: waitInput,
  openaiInputSchema: waitOpenAIInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const requestedMs = requestedMsFromInput(input);
    const result = await waitForDuration(requestedMs, context.abortSignal);
    if (result.interrupted) {
      return {
        ok: false,
        content: `Wait interrupted after ${Math.min(result.elapsedMs, requestedMs)}ms.`,
        data: result
      };
    }

    const note = noteFromInput(input);
    return {
      ok: true,
      content: `Wait completed after ${requestedMs}ms.${note ? ` note: ${note}` : ""}`,
      data: result
    };
  }
};
