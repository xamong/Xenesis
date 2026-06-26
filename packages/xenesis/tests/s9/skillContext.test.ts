import { describe, it, expect } from "vitest";
import { partitionSkillContext } from "../../src/core/AgentRuntimeFactory.js";
import type { SkillDefinition } from "../../src/extensions/types.js";

const mk = (name: string, body: string, always = false): SkillDefinition =>
  ({ name, description: `desc ${name}`, path: `/skills/${name}/SKILL.md`, body, ...(always ? { always: true } : {}) } as SkillDefinition);

describe("partitionSkillContext", () => {
  it("catalog mode: always-skill keeps full body, normal skill is catalog-only (no body)", () => {
    const { messages } = partitionSkillContext([mk("keep", "ALWAYS_BODY_XYZ", true), mk("lazy", "LAZY_BODY_XYZ")], "catalog");
    const all = messages.map((m) => m.content).join("\n");
    expect(all).toContain("ALWAYS_BODY_XYZ");       // always-skill body present
    expect(all).not.toContain("LAZY_BODY_XYZ");     // normal-skill body absent
    expect(all).toContain('name="lazy"');           // but listed in catalog
  });
  it("full mode: all bodies present (backward-compat)", () => {
    const { messages } = partitionSkillContext([mk("a", "BODY_A"), mk("b", "BODY_B")], "full");
    const all = messages.map((m) => m.content).join("\n");
    expect(all).toContain("BODY_A");
    expect(all).toContain("BODY_B");
  });
});
