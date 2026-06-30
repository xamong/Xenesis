import { arch, platform, release } from 'node:os';
import OpenAI from 'openai';
import type { CodexAuth } from './codexAuth.js';

// The ChatGPT Codex backend speaks the Responses API but with a few fixed
// contract differences from the public OpenAI endpoint (mirrors hermes
// _preflight_codex_api_kwargs + openclaw buildRequestBody):
//   - base_url = https://chatgpt.com/backend-api/codex
//   - OAuth bearer + chatgpt-account-id + originator headers (no api key)
//   - store:false, include:["reasoning.encrypted_content"], reasoning.effort
//   - max_output_tokens is REJECTED -> stripped
//   - empty/undefined tools crash the SDK / 400 the backend -> omitted
export const CODEX_BASE_URL = 'https://chatgpt.com/backend-api/codex';

export type CodexReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

export interface CodexResponsesClient {
  responses: {
    create(request: unknown, options?: { signal?: AbortSignal }): Promise<unknown> | unknown;
  };
}

export interface BuildCodexClientOptions {
  auth: CodexAuth;
  originator?: string;
  reasoningEffort?: CodexReasoningEffort;
  // Injectable client factory for tests (defaults to the real OpenAI SDK).
  openaiFactory?: (opts: Record<string, unknown>) => CodexResponsesClient;
}

function codexHeaders(auth: CodexAuth, originator: string): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    'chatgpt-account-id': auth.accountId,
    originator,
    'User-Agent': `${originator} (${platform()} ${release()}; ${arch()})`,
    'OpenAI-Beta': 'responses=experimental',
  };
}

// The ChatGPT Codex backend validates every function tool against OpenAI strict
// schema rules and 400s otherwise (e.g. "Invalid schema for function 'x': ...
// 'additionalProperties' is required to be supplied and to be false."). Normal
// Xenesis tool schemas are not authored strict, so rewrite each tool's parameter
// schema to the strict form: additionalProperties:false on every object, every
// property listed in `required`, and originally-optional properties made nullable
// so their semantics are preserved (the model can still omit them via null).
function toCodexNullableSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return schema;
  const s = schema as Record<string, unknown>;
  const t = s.type;
  if (typeof t === 'string') return t === 'null' ? s : { ...s, type: [t, 'null'] };
  if (Array.isArray(t)) return t.includes('null') ? s : { ...s, type: [...t, 'null'] };
  if (Array.isArray(s.anyOf)) {
    const hasNull = (s.anyOf as unknown[]).some(
      (x) => x != null && typeof x === 'object' && (x as Record<string, unknown>).type === 'null',
    );
    return hasNull ? s : { ...s, anyOf: [...(s.anyOf as unknown[]), { type: 'null' }] };
  }
  return s;
}

function toCodexStrictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toCodexStrictSchema);
  if (!node || typeof node !== 'object') return node;
  const src = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(src)) out[key] = toCodexStrictSchema(value);
  const props = out.properties;
  const isObjectSchema = out.type === 'object' || (props != null && typeof props === 'object' && !Array.isArray(props));
  if (isObjectSchema) {
    out.additionalProperties = false;
    if (props != null && typeof props === 'object' && !Array.isArray(props)) {
      const propObj = props as Record<string, unknown>;
      const keys = Object.keys(propObj);
      const originalRequired = Array.isArray(out.required)
        ? (out.required as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
      for (const key of keys) {
        if (!originalRequired.includes(key)) propObj[key] = toCodexNullableSchema(propObj[key]);
      }
      out.required = keys;
    }
  }
  return out;
}

function toCodexStrictTool(tool: unknown): unknown {
  if (!tool || typeof tool !== 'object') return tool;
  const t = tool as Record<string, unknown>;
  // Responses API flat function tool: { type:"function", name, description, parameters }
  if (t.parameters != null && typeof t.parameters === 'object') {
    return { ...t, parameters: toCodexStrictSchema(t.parameters) };
  }
  // Defensive: chat-completions nested shape { type:"function", function:{ parameters } }
  if (t.function != null && typeof t.function === 'object') {
    const fn = t.function as Record<string, unknown>;
    if (fn.parameters != null && typeof fn.parameters === 'object') {
      return { ...t, function: { ...fn, parameters: toCodexStrictSchema(fn.parameters) } };
    }
  }
  return tool;
}

function sanitizeCodexRequest(
  request: Record<string, unknown>,
  reasoningEffort?: CodexReasoningEffort,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...request,
    store: false,
    include: ['reasoning.encrypted_content'],
  };
  delete out.max_output_tokens;
  const tools = Array.isArray(request.tools) ? request.tools : undefined;
  if (!tools || tools.length === 0) {
    delete out.tools;
    delete out.tool_choice;
    delete out.parallel_tool_calls;
  } else {
    out.tools = tools.map(toCodexStrictTool);
    out.tool_choice = out.tool_choice ?? 'auto';
    out.parallel_tool_calls = out.parallel_tool_calls ?? true;
  }
  if (reasoningEffort) {
    // hermes clamps "minimal" -> "low" for the codex backend.
    const effort = reasoningEffort === 'minimal' ? 'low' : reasoningEffort;
    out.reasoning = { effort, summary: 'auto' };
  }
  return out;
}

export function buildCodexClient(opts: BuildCodexClientOptions): CodexResponsesClient {
  const make = opts.openaiFactory ?? ((o: Record<string, unknown>) => new OpenAI(o) as unknown as CodexResponsesClient);
  const originator = opts.originator ?? 'xenesis';
  const inner = make({
    apiKey: opts.auth.accessToken,
    baseURL: CODEX_BASE_URL,
    defaultHeaders: codexHeaders(opts.auth, originator),
  });
  return {
    responses: {
      create: (request: unknown, callOpts?: { signal?: AbortSignal }) =>
        inner.responses.create(
          sanitizeCodexRequest((request ?? {}) as Record<string, unknown>, opts.reasoningEffort),
          callOpts,
        ),
    },
  };
}
