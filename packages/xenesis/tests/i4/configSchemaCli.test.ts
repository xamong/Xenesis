import { join } from "node:path";
import { describe, it, expect } from "vitest";
import { configJsonSchema } from "../../src/config/index.js";
import { runCli, type CliIo } from "../../src/cli/main.js";
import { createTempWorkspace } from "../helpers/tempWorkspace.js";

function createIo(cwd: string) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    cwd,
    env: { ...process.env, XENESIS_HOME: join(cwd, ".xenesis") },
    stdout: (line) => stdout.push(line),
    stderr: (line) => stderr.push(line)
  };
  return { io, stdout, stderr };
}

describe("configJsonSchema()", () => {
  it("returns a JSON Schema for XenesisConfig", () => {
    const schema = configJsonSchema() as { $ref?: string; definitions?: Record<string, unknown> };
    expect(schema).toBeTypeOf("object");
    expect(schema.$ref).toBe("#/definitions/XenesisConfig");
    expect(schema.definitions?.XenesisConfig).toBeTypeOf("object");
  });
});

describe("config schema CLI", () => {
  it("emits the JSON schema to stdout without requiring a local config", async () => {
    const workspace = await createTempWorkspace();
    try {
      const { io, stdout, stderr } = createIo(workspace.root);
      const exitCode = await runCli(["node", "xenesis", "config", "schema"], io);
      expect(exitCode).toBe(0);
      expect(stderr).toEqual([]);
      const parsed = JSON.parse(stdout.join("\n")) as { $ref?: string; definitions?: Record<string, unknown> };
      expect(parsed.$ref).toBe("#/definitions/XenesisConfig");
      expect(parsed.definitions?.XenesisConfig).toBeTypeOf("object");
    } finally {
      await workspace.cleanup();
    }
  });

  it("rejects positional arguments after `config schema`", async () => {
    const workspace = await createTempWorkspace();
    try {
      const { io, stderr } = createIo(workspace.root);
      const exitCode = await runCli(["node", "xenesis", "config", "schema", "extra"], io);
      expect(exitCode).not.toBe(0);
      expect(stderr.join("\n")).toContain("does not accept positional arguments");
    } finally {
      await workspace.cleanup();
    }
  });
});
