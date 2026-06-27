import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

const EVIDENCE_HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

export interface MemoryEvidenceSnapshot {
  contentHash: string;
  relativePath: string;
  absolutePath: string;
}

export function hashMemoryEvidenceContent(content: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export function assertMemoryEvidenceContentHash(contentHash: string): string {
  if (!EVIDENCE_HASH_PATTERN.test(contentHash)) {
    throw new Error("invalid evidence content hash");
  }
  return contentHash;
}

export function resolveMemoryEvidenceSnapshotPath(options: {
  xenesisHome: string;
  contentHash: string;
}): MemoryEvidenceSnapshot {
  const contentHash = assertMemoryEvidenceContentHash(options.contentHash);
  const hex = contentHash.slice("sha256:".length);
  const relativePath = join("memory-evidence", "sha256", hex.slice(0, 2), `${hex}.txt`).replace(/\\/g, "/");
  const root = resolve(options.xenesisHome);
  const absolutePath = resolve(root, relativePath);
  const relativeToRoot = relative(root, absolutePath);
  if (relativeToRoot.startsWith("..") || isAbsolute(relativeToRoot)) {
    throw new Error("evidence snapshot path escaped xenesis home");
  }
  return { contentHash, relativePath, absolutePath };
}

export async function writeMemoryEvidenceSnapshot(options: {
  xenesisHome: string;
  content: string | Uint8Array;
  contentHash?: string;
}): Promise<MemoryEvidenceSnapshot> {
  const actualHash = hashMemoryEvidenceContent(options.content);
  if (options.contentHash && assertMemoryEvidenceContentHash(options.contentHash) !== actualHash) {
    throw new Error("evidence content hash mismatch");
  }
  const snapshot = resolveMemoryEvidenceSnapshotPath({
    xenesisHome: options.xenesisHome,
    contentHash: actualHash
  });
  await mkdir(dirname(snapshot.absolutePath), { recursive: true });
  await writeFile(snapshot.absolutePath, options.content);
  return snapshot;
}

export async function readMemoryEvidenceSnapshot(options: {
  xenesisHome: string;
  contentHash: string;
}): Promise<string> {
  const snapshot = resolveMemoryEvidenceSnapshotPath(options);
  return readFile(snapshot.absolutePath, "utf8");
}
