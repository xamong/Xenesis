import type { GowooriApiPlanResult, GowooriArtifactResult } from './gowooriProviders';

export type GowooriApiFormat = 'openai' | 'azure' | 'anthropic' | 'gemini';

const AZURE_OPENAI_API_VERSION = '2024-10-21';
const GOWOORI_USER_REQUEST_MARKER = '\nUser request:\n';

interface GowooriApiPromptParts {
  system: string;
  user: string;
}

export interface GowooriApiRunnerOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  apiFormat?: GowooriApiFormat;
  apiKeyRequired?: boolean;
  signal?: AbortSignal;
  fetch?: typeof fetch;
  onChunk?: (chunk: string) => void;
  onStatus?: (status: string) => void;
}

export interface GowooriApiPreflightResult {
  ok: boolean;
  status: number;
  message: string;
  bodyPreview: string;
}

export async function runGowooriApiProvider(
  plan: GowooriApiPlanResult,
  options: GowooriApiRunnerOptions,
): Promise<GowooriArtifactResult> {
  const requestFetch = options.fetch ?? fetch;
  const baseUrl = normalizeApiUrl(options.baseUrl);
  if (!baseUrl) {
    throw new Error('BYOK API base URL is required.');
  }
  if (options.apiKeyRequired !== false && !options.apiKey.trim()) {
    throw new Error('BYOK API key is required.');
  }
  if (!options.model.trim()) {
    throw new Error('BYOK model is required.');
  }

  options.onStatus?.('Starting BYOK API stream...');
  const apiFormat = options.apiFormat ?? 'openai';
  const response = await requestFetch(
    buildRequestUrl(baseUrl, options.apiKey, apiFormat, options.model),
    buildRequestInit(plan, options, apiFormat),
  );

  if (!response.ok) {
    throw new Error(`BYOK API failed with status ${response.status}.`);
  }

  const source = await readStreamingResponse(response, apiFormat, options.onChunk);
  return {
    kind: 'artifact',
    provider: plan.provider,
    source: source.trim(),
    summary: source.trim() ? 'Generated artifact from BYOK API stream.' : 'BYOK API completed without artifact output.',
  };
}

export async function runGowooriApiPreflight(
  options: Omit<GowooriApiRunnerOptions, 'onChunk' | 'onStatus'>,
): Promise<GowooriApiPreflightResult> {
  const requestFetch = options.fetch ?? fetch;
  const baseUrl = normalizeApiUrl(options.baseUrl);
  if (!baseUrl) {
    throw new Error('BYOK API base URL is required.');
  }
  if (options.apiKeyRequired !== false && !options.apiKey.trim()) {
    throw new Error('BYOK API key is required.');
  }
  if (!options.model.trim()) {
    throw new Error('BYOK model is required.');
  }

  const apiFormat = options.apiFormat ?? 'openai';
  const response = await requestFetch(
    buildRequestUrl(baseUrl, options.apiKey, apiFormat, options.model),
    buildPreflightRequestInit(options, apiFormat),
  );
  const bodyPreview = (await readResponseText(response)).trim().slice(0, 500);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: `BYOK API preflight failed with status ${response.status}.`,
      bodyPreview,
    };
  }

  return {
    ok: true,
    status: response.status,
    message: `BYOK API endpoint is reachable with ${apiFormat}.`,
    bodyPreview,
  };
}

function buildRequestUrl(baseUrl: string, apiKey: string, apiFormat: GowooriApiFormat, model: string): string {
  if (apiFormat === 'azure') return buildAzureRequestUrl(baseUrl, model);
  if (apiFormat !== 'gemini') return baseUrl;
  const url = new URL(baseUrl);
  if (!url.searchParams.has('key')) {
    url.searchParams.set('key', apiKey);
  }
  return url.toString();
}

function buildAzureRequestUrl(baseUrl: string, model: string): string {
  const url = new URL(baseUrl);
  const trimmedPath = url.pathname.replace(/\/+$/, '');
  if (/\/openai\/deployments\/[^/]+\/chat\/completions$/i.test(trimmedPath)) {
    url.pathname = trimmedPath;
  } else if (/\/openai\/deployments\/[^/]+$/i.test(trimmedPath)) {
    url.pathname = `${trimmedPath}/chat/completions`;
  } else {
    const deployment = encodeURIComponent(model.trim());
    url.pathname = `${trimmedPath}/openai/deployments/${deployment}/chat/completions`.replace(/\/{2,}/g, '/');
  }
  if (!url.searchParams.has('api-version')) {
    url.searchParams.set('api-version', AZURE_OPENAI_API_VERSION);
  }
  return url.toString();
}

function buildRequestInit(
  plan: GowooriApiPlanResult,
  options: GowooriApiRunnerOptions,
  apiFormat: GowooriApiFormat,
): RequestInit {
  const promptParts = splitGowooriApiPrompt(plan.prompt);
  if (apiFormat === 'anthropic') {
    return {
      method: 'POST',
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 4096,
        stream: true,
        system: promptParts.system,
        messages: [
          {
            role: 'user',
            content: promptParts.user,
          },
        ],
      }),
      signal: options.signal,
    };
  }

  if (apiFormat === 'gemini') {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: promptParts.system }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: promptParts.user }],
          },
        ],
      }),
      signal: options.signal,
    };
  }

  if (apiFormat === 'azure') {
    return {
      method: 'POST',
      headers: {
        'api-key': options.apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stream: true,
        messages: [
          {
            role: 'system',
            content: promptParts.system,
          },
          {
            role: 'user',
            content: promptParts.user,
          },
        ],
      }),
      signal: options.signal,
    };
  }

  return {
    method: 'POST',
    headers: {
      ...(options.apiKey.trim() ? { Authorization: `Bearer ${options.apiKey.trim()}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      stream: true,
      messages: [
        {
          role: 'system',
          content: promptParts.system,
        },
        {
          role: 'user',
          content: promptParts.user,
        },
      ],
    }),
    signal: options.signal,
  };
}

function splitGowooriApiPrompt(prompt: string): GowooriApiPromptParts {
  const source = String(prompt || '').trim();
  const markerIndex = source.lastIndexOf(GOWOORI_USER_REQUEST_MARKER);
  if (markerIndex < 0) {
    return {
      system: [
        'You are Gowoori, an XCON Viewer artifact generator.',
        'Return only directly renderable Markdown + XCON/SKETCH artifacts.',
        'Every UI block must be fenced as ```xcon-sketch and start with a screen declaration.',
      ].join('\n'),
      user: source,
    };
  }
  const system = source.slice(0, markerIndex).trim();
  const user = source.slice(markerIndex + GOWOORI_USER_REQUEST_MARKER.length).trim();
  return {
    system,
    user,
  };
}

function buildPreflightRequestInit(
  options: Omit<GowooriApiRunnerOptions, 'onChunk' | 'onStatus'>,
  apiFormat: GowooriApiFormat,
): RequestInit {
  if (apiFormat === 'anthropic') {
    return {
      method: 'POST',
      headers: {
        'x-api-key': options.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: 1,
        stream: false,
        messages: [
          {
            role: 'user',
            content: 'Reply with OK.',
          },
        ],
      }),
      signal: options.signal,
    };
  }

  if (apiFormat === 'gemini') {
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Reply with OK.' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1,
        },
      }),
      signal: options.signal,
    };
  }

  if (apiFormat === 'azure') {
    return {
      method: 'POST',
      headers: {
        'api-key': options.apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stream: false,
        max_tokens: 1,
        messages: [
          {
            role: 'user',
            content: 'Reply with OK.',
          },
        ],
      }),
      signal: options.signal,
    };
  }

  return {
    method: 'POST',
    headers: {
      ...(options.apiKey.trim() ? { Authorization: `Bearer ${options.apiKey.trim()}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      stream: false,
      max_tokens: 1,
      messages: [
        {
          role: 'user',
          content: 'Reply with OK.',
        },
      ],
    }),
    signal: options.signal,
  };
}

async function readStreamingResponse(
  response: Response,
  apiFormat: GowooriApiFormat,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  if (!response.body) {
    const text = await response.text();
    const content = extractNonStreamingContent(text, apiFormat);
    if (content) onChunk?.(content);
    return content;
  }

  if (apiFormat === 'gemini') {
    return readGeminiStreamingResponse(response, onChunk);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const chunk = extractSseContent(line, apiFormat);
      if (!chunk) continue;
      output += chunk;
      onChunk?.(chunk);
    }
  }

  buffer += decoder.decode();
  for (const line of buffer.split(/\r?\n/)) {
    const chunk = extractSseContent(line, apiFormat);
    if (!chunk) continue;
    output += chunk;
    onChunk?.(chunk);
  }
  return output;
}

async function readGeminiStreamingResponse(response: Response, onChunk?: (chunk: string) => void): Promise<string> {
  const text = await readResponseText(response);
  let output = '';
  for (const chunk of extractGeminiContentChunks(text)) {
    output += chunk;
    onChunk?.(chunk);
  }
  return output;
}

async function readResponseText(response: Response): Promise<string> {
  if (!response.body) return response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function extractSseContent(line: string, apiFormat: GowooriApiFormat): string {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.startsWith('data:')) return '';
  const data = trimmed.slice(5).trim();
  if (!data || data === '[DONE]') return '';
  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string }; text?: string }>;
      delta?: { text?: string };
      type?: string;
      output_text?: string;
      content?: string;
    };
    if (apiFormat === 'anthropic') {
      return parsed.delta?.text ?? parsed.content ?? '';
    }
    return (
      parsed.choices?.[0]?.delta?.content ??
      parsed.choices?.[0]?.message?.content ??
      parsed.choices?.[0]?.text ??
      parsed.output_text ??
      parsed.content ??
      ''
    );
  } catch {
    return data;
  }
}

function extractNonStreamingContent(text: string, apiFormat: GowooriApiFormat): string {
  const raw = String(text || '').trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string }; text?: string }>;
      content?: string | Array<{ text?: string; type?: string }>;
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      output_text?: string;
    };
    if (apiFormat === 'anthropic') {
      if (Array.isArray(parsed.content)) {
        return parsed.content.map((item) => item.text ?? '').join('');
      }
      return typeof parsed.content === 'string' ? parsed.content : raw;
    }
    if (apiFormat === 'gemini') {
      return extractGeminiCandidateText(parsed);
    }
    return (
      parsed.choices?.[0]?.message?.content ??
      parsed.choices?.[0]?.text ??
      parsed.output_text ??
      (typeof parsed.content === 'string' ? parsed.content : '') ??
      raw
    );
  } catch {
    return raw;
  }
}

function extractGeminiContentChunks(text: string): string[] {
  const raw = String(text || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const responses = Array.isArray(parsed) ? parsed : [parsed];
    return responses.map((item) => extractGeminiCandidateText(item)).filter(Boolean);
  } catch {
    return extractGeminiTextByRegex(raw);
  }
}

function extractGeminiCandidateText(parsed: {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}): string {
  return (
    parsed.candidates
      ?.flatMap((candidate) => candidate.content?.parts?.map((part) => part.text ?? '') ?? [])
      .join('') ?? ''
  );
}

function extractGeminiTextByRegex(raw: string): string[] {
  const chunks: string[] = [];
  const pattern = /"text"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    chunks.push(JSON.parse(`"${match[1]}"`) as string);
  }
  return chunks;
}

function normalizeApiUrl(baseUrl: string): string {
  return String(baseUrl || '').trim();
}
