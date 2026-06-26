import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { closeAllDatabases } from "../../src/db/database.js";

export async function createTempWorkspace(prefix = "xenesis-") {
  const root = await mkdtemp(join(tmpdir(), prefix));

  return {
    root,
    async cleanup() {
      await removeTempWorkspace(root);
    }
  };
}

async function removeTempWorkspace(root: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    try {
      closeAllDatabases();
      await rm(root, { recursive: true, force: true });
      return;
    } catch (error) {
      lastError = error;
      const code = error instanceof Error && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
      if (code !== "EBUSY" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
      closeAllDatabases();
      const delayMs = Math.min(1000, 100 * (attempt + 1));
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  try {
    closeAllDatabases();
    await rm(root, { recursive: true, force: true });
  } catch {
    throw lastError;
  }
}
