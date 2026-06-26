import { z } from "zod";
import type { ReadSnapshot } from "./ReadStateGuard.js";

export const readSnapshotInputSchema = z.object({
  path: z.string().min(1),
  absolutePath: z.string().min(1),
  contentHash: z.string().min(1),
  mtimeMs: z.number(),
  size: z.number().int().nonnegative(),
  encoding: z.literal("utf8"),
  lineEndings: z.enum(["lf", "crlf", "mixed", "none"]),
  offset: z.number().int().nonnegative().nullable().optional(),
  limit: z.number().int().positive().nullable().optional(),
  isPartialView: z.boolean()
});

export type ReadSnapshotInput = z.infer<typeof readSnapshotInputSchema>;

export function normalizeReadSnapshotInput(readState: ReadSnapshotInput): ReadSnapshot {
  return {
    path: readState.path,
    absolutePath: readState.absolutePath,
    contentHash: readState.contentHash,
    mtimeMs: readState.mtimeMs,
    size: readState.size,
    encoding: readState.encoding,
    lineEndings: readState.lineEndings,
    ...(readState.offset != null ? { offset: readState.offset } : {}),
    ...(readState.limit != null ? { limit: readState.limit } : {}),
    isPartialView: readState.isPartialView
  };
}
