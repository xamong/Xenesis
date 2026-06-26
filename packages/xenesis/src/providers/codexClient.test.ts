import { describe, expect, it, vi } from "vitest";
import { buildCodexClient, type CodexResponsesClient } from "./codexClient.js";

const AUTH = { accessToken: "tok-abc", accountId: "acc-1" };

type CreateMock = ReturnType<typeof vi.fn>;
function factoryWith(create: CreateMock, sink?: (opts: Record<string, unknown>) => void) {
  return (opts: Record<string, unknown>): CodexResponsesClient => {
    sink?.(opts);
    return { responses: { create: create as CodexResponsesClient["responses"]["create"] } };
  };
}

describe("buildCodexClient", () => {
  it("targets the codex backend base_url and sets the Codex wire headers + bearer", () => {
    let captured: Record<string, unknown> | undefined;
    buildCodexClient({
      auth: AUTH,
      originator: "xenesis",
      reasoningEffort: "medium",
      openaiFactory: factoryWith(vi.fn(), (o) => { captured = o; })
    });
    const headers = captured!.defaultHeaders as Record<string, string>;
    expect(captured!.baseURL).toBe("https://chatgpt.com/backend-api/codex");
    expect(captured!.apiKey).toBe("tok-abc");
    expect(headers.Authorization).toBe("Bearer tok-abc");
    expect(headers["chatgpt-account-id"]).toBe("acc-1");
    expect(headers.originator).toBe("xenesis");
    expect(headers["OpenAI-Beta"]).toBe("responses=experimental");
  });

  it("sanitizes: store:false, include encrypted reasoning, drops max_output_tokens, omits empty tools, sets reasoning.effort", async () => {
    const inner = vi.fn().mockResolvedValue({ output: [] });
    const client = buildCodexClient({ auth: AUTH, reasoningEffort: "high", openaiFactory: factoryWith(inner) });
    await client.responses.create({ model: "gpt-5-codex", input: [], tools: [], max_output_tokens: 4096 });
    const sent = inner.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.store).toBe(false);
    expect(sent.include).toEqual(["reasoning.encrypted_content"]);
    expect(sent).not.toHaveProperty("max_output_tokens");
    expect(sent).not.toHaveProperty("tools");
    expect(sent).not.toHaveProperty("tool_choice");
    expect(sent.reasoning).toEqual({ effort: "high", summary: "auto" });
  });

  it("keeps non-empty tools and adds tool_choice:auto + parallel_tool_calls", async () => {
    const inner = vi.fn().mockResolvedValue({ output: [] });
    const client = buildCodexClient({ auth: AUTH, reasoningEffort: "low", openaiFactory: factoryWith(inner) });
    const tool = { type: "function", name: "xenesis_desk_capabilities", parameters: { type: "object", properties: {} } };
    await client.responses.create({ model: "gpt-5-codex", input: [], tools: [tool] });
    const sent = inner.mock.calls[0][0] as Record<string, unknown>;
    // Tool is kept but its schema is rewritten to codex strict form.
    expect(sent.tools).toEqual([
      { type: "function", name: "xenesis_desk_capabilities", parameters: { type: "object", properties: {}, additionalProperties: false, required: [] } }
    ]);
    expect(sent.tool_choice).toBe("auto");
    expect(sent.parallel_tool_calls).toBe(true);
  });

  it("rewrites tool parameter schemas to codex strict form (additionalProperties:false, all keys required, optional -> nullable, recursive)", async () => {
    const inner = vi.fn().mockResolvedValue({ output: [] });
    const client = buildCodexClient({ auth: AUTH, openaiFactory: factoryWith(inner) });
    const tool = {
      type: "function",
      name: "planning_finish",
      parameters: {
        type: "object",
        properties: {
          plan: { type: "string" },
          autoApprove: { type: "boolean" },
          meta: { type: "object", properties: { tag: { type: "string" } } }
        },
        required: ["plan"]
      }
    };
    await client.responses.create({ model: "gpt-5-codex", input: [], tools: [tool] });
    const sent = inner.mock.calls[0][0] as Record<string, unknown>;
    const p = (sent.tools as Array<Record<string, any>>)[0].parameters;
    expect(p.additionalProperties).toBe(false);
    expect(p.required).toEqual(["plan", "autoApprove", "meta"]);
    expect(p.properties.plan).toEqual({ type: "string" }); // originally required: unchanged
    expect(p.properties.autoApprove).toEqual({ type: ["boolean", "null"] }); // optional -> nullable
    // nested object is recursively made strict, and is itself optional -> nullable
    expect(p.properties.meta.additionalProperties).toBe(false);
    expect(p.properties.meta.type).toEqual(["object", "null"]);
    expect(p.properties.meta.required).toEqual(["tag"]);
    expect(p.properties.meta.properties.tag).toEqual({ type: ["string", "null"] });
  });

  it("clamps minimal effort to low (codex backend contract)", async () => {
    const inner = vi.fn().mockResolvedValue({ output: [] });
    const client = buildCodexClient({ auth: AUTH, reasoningEffort: "minimal", openaiFactory: factoryWith(inner) });
    await client.responses.create({ model: "gpt-5-codex", input: [] });
    expect((inner.mock.calls[0][0] as Record<string, unknown>).reasoning).toEqual({ effort: "low", summary: "auto" });
  });
});
