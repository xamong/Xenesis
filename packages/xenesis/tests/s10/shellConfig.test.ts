import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { defaultConfig } from "../../src/config/types.js";
import { loadConfig } from "../../src/config/loadConfig.js";

async function loadFromObject(obj: unknown, env: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "xenesis-s10-cfg-"));
  try {
    await writeFile(
      resolve(root, "xenesis.config.json"),
      JSON.stringify(obj),
      "utf8"
    );
    return await loadConfig({ cwd: root, env });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("S10 shell config", () => {
  it("defaults", () => {
    expect(defaultConfig.shell.persistent).toBe(true);
    expect(defaultConfig.shell.idleTimeoutMs).toBe(300000);
  });
  it("parses overrides", async () => {
    const cfg = await loadFromObject({ shell: { persistent: false, idleTimeoutMs: 60000 } });
    expect(cfg.shell.persistent).toBe(false);
    expect(cfg.shell.idleTimeoutMs).toBe(60000);
  });
});
