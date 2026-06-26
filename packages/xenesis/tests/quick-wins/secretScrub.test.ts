import { describe, it, expect } from "vitest";
import { stripDangerousEnv, buildScrubbedEnv } from "../../src/core/isolation/secretScrub.js";
import { computeShellEnv } from "../../src/tools/shellTool.js";
import { buildMcpStdioEnv } from "../../src/extensions/mcp.js";

describe("stripDangerousEnv", () => {
  it("removes exec-hijack vars but keeps normal ones", () => {
    const out = stripDangerousEnv({
      PATH: "/usr/bin",
      LD_PRELOAD: "/evil.so",
      LD_LIBRARY_PATH: "/x",
      DYLD_INSERT_LIBRARIES: "/y",
      NODE_OPTIONS: "--require /z",
      NODE_REPL_EXTERNAL_MODULE: "/m",
      HOME: "/home/u"
    });
    expect(out.PATH).toBe("/usr/bin");
    expect(out.HOME).toBe("/home/u");
    expect(out.LD_PRELOAD).toBeUndefined();
    expect(out.LD_LIBRARY_PATH).toBeUndefined();
    expect(out.DYLD_INSERT_LIBRARIES).toBeUndefined();
    expect(out.NODE_OPTIONS).toBeUndefined();
    expect(out.NODE_REPL_EXTERNAL_MODULE).toBeUndefined();
  });
});

describe("shell scrub default", () => {
  it("scrubs secrets by default (no flag)", () => {
    const env = computeShellEnv({ OPENAI_API_KEY: "sk-x", PATH: "/b" } as NodeJS.ProcessEnv);
    expect(env?.OPENAI_API_KEY).toBeUndefined();
    expect(env?.PATH).toBe("/b");
  });
  it("opts out only with XENESIS_ISOLATION_SCRUB=0", () => {
    const env = computeShellEnv({ OPENAI_API_KEY: "sk-x", XENESIS_ISOLATION_SCRUB: "0" } as NodeJS.ProcessEnv);
    expect(env).toBeUndefined();
  });
  it("also strips dangerous env when scrubbing", () => {
    const env = computeShellEnv({ LD_PRELOAD: "/evil.so", PATH: "/b" } as NodeJS.ProcessEnv);
    expect(env?.LD_PRELOAD).toBeUndefined();
  });
});

describe("buildMcpStdioEnv (Q10 MCP stdio spawn)", () => {
  it("strips exec-hijack vars from config-supplied env but keeps normal ones", () => {
    const out = buildMcpStdioEnv({
      MY_TOKEN: "abc",
      PATH: "/usr/bin",
      LD_PRELOAD: "/evil.so",
      DYLD_INSERT_LIBRARIES: "/y",
      NODE_OPTIONS: "--require /z"
    });
    expect(out).toBeDefined();
    expect(out?.MY_TOKEN).toBe("abc");
    expect(out?.PATH).toBe("/usr/bin");
    expect(out?.LD_PRELOAD).toBeUndefined();
    expect(out?.DYLD_INSERT_LIBRARIES).toBeUndefined();
    expect(out?.NODE_OPTIONS).toBeUndefined();
  });
  it("returns undefined for undefined input", () => {
    expect(buildMcpStdioEnv(undefined)).toBeUndefined();
  });
});
