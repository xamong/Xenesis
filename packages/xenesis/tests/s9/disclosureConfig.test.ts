import { describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { defaultConfig } from "../../src/config/types.js";
import { loadConfig } from "../../src/config/loadConfig.js";

async function loadFromObject(obj: unknown, env: Record<string, string> = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "xenesis-s9-cfg-"));
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

describe("S9 skills.disclosure config", () => {
  it("defaults to catalog", () => {
    expect(defaultConfig.extensions.skills.disclosure).toBe("catalog");
  });
  it("parses the full opt-out", async () => {
    const cfg = await loadFromObject({ extensions: { skills: { disclosure: "full" } } });
    expect(cfg.extensions.skills.disclosure).toBe("full");
    // unrelated skills defaults preserved
    expect(typeof cfg.extensions.skills.autoLoad).toBe("boolean");
  });
});
