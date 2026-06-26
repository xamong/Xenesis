import { describe, it, expect } from "vitest";
import { z } from "zod";
import { coerceToolArguments, buildSchemaGuidance } from "../../src/providers/toolArgCoercion.js";

// Integration: exercise the exact composition the runner performs at the tool-call
// validation seam — coerce the provider-supplied args via the tool's inputSchema,
// then safeParse, then (only on failure) build structured guidance. We test at this
// seam because AgentRunner requires a full provider/session/tool harness to drive a
// real turn; the composition below is what runToolCall / the kernel executor run.
function runnerValidate(rawInput: unknown, schema: z.ZodType) {
  const coerced = coerceToolArguments(rawInput, schema);
  const parsed = schema.safeParse(coerced);
  if (parsed.success) {
    return { ok: true as const, data: parsed.data };
  }
  const guidance = buildSchemaGuidance(parsed.error, schema, coerced);
  const structured = {
    error: "invalid_tool_input",
    issues: guidance.issues,
    schema: guidance.schemaFragment,
    received: guidance.received
  };
  return { ok: false as const, structured, content: JSON.stringify(structured) };
}

describe("tool-call guidance composition (S4 runner seam)", () => {
  it("(a) coercible invalid arg (string-encoded JSON) validates after coercion — tool would run", () => {
    const schema = z.object({ path: z.string(), depth: z.number() });
    // Provider handed us a JSON-encoded string instead of an object: coercion fixes
    // this with zero round-trips, so validation succeeds and no guidance is produced.
    const result = runnerValidate('{"path":"src","depth":2}', schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ path: "src", depth: 2 });
    }
  });

  it("preserves the no-parameter sentinel: empty string coerces to {} and validates for a parameterless tool", () => {
    const schema = z.object({});
    const result = runnerValidate("", schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({});
    }
  });

  it("(b) non-coercible invalid arg yields structured guidance with issues + schema fragment + received", () => {
    const schema = z.object({ count: z.number(), name: z.string() });
    // Wrong types that coercion does not (and must not) guess: structured guidance
    // is emitted so the model can self-correct.
    const result = runnerValidate({ count: "not-a-number", name: 42 }, schema);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Array.isArray(result.structured.issues)).toBe(true);
      expect(result.structured.issues.length).toBeGreaterThan(0);
      // issues reference the offending paths
      const joined = result.structured.issues.join("\n");
      expect(joined).toContain("count");
      expect(joined).toContain("name");
      // a JSON-schema fragment describing the expected shape is present
      expect(result.structured.schema).toBeTruthy();
      // the received (rejected) value is echoed back for self-correction
      expect(result.structured.received).toBeTruthy();
      // the machine-readable content is valid JSON the model can parse
      const reparsed = JSON.parse(result.content);
      expect(reparsed.error).toBe("invalid_tool_input");
    }
  });

  it("does NOT fabricate fields for a parameterless tool fed garbage (conservative coercion)", () => {
    const schema = z.object({});
    // A truncated/garbage non-object string coerces to {} (never invents fields) and
    // validates against a parameterless schema.
    const result = runnerValidate("garbage-not-json", schema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({});
    }
  });
});
