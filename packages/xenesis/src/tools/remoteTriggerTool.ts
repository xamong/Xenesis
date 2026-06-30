import { z } from 'zod';
import type { Tool } from './types.js';

export const REMOTE_TRIGGER_TOOL_NAME = 'RemoteTrigger';
export const REMOTE_TRIGGER_BETA_HEADER = 'ccr-triggers-2026-01-30';

export const REMOTE_TRIGGER_DESCRIPTION =
  'Manage scheduled remote Claude Code agents (triggers) via the claude.ai CCR API. Auth is handled in-process - the token never reaches the shell.';

export const REMOTE_TRIGGER_PROMPT = `Call the claude.ai remote-trigger API. Use this instead of curl - the OAuth token is added automatically in-process and never exposed.

Actions:
- list: GET /v1/code/triggers
- get: GET /v1/code/triggers/{trigger_id}
- create: POST /v1/code/triggers (requires body)
- update: POST /v1/code/triggers/{trigger_id} (requires body, partial update)
- run: POST /v1/code/triggers/{trigger_id}/run

The response is the raw JSON from the API.`;

const remoteTriggerInputSchema = z
  .object({
    action: z.enum(['list', 'get', 'create', 'update', 'run']),
    trigger_id: z
      .string()
      .regex(/^[\w-]+$/u)
      .optional(),
    body: z.record(z.unknown()).optional(),
  })
  .strict();

const remoteTriggerOutputSchema = z.object({
  status: z.number(),
  json: z.string(),
});

type RemoteTriggerInput = z.infer<typeof remoteTriggerInputSchema>;
type RemoteTriggerOutput = z.infer<typeof remoteTriggerOutputSchema>;

export interface RemoteTriggerDependencies {
  baseApiUrl?: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getOrganizationUuid?: () => string | undefined | Promise<string | undefined>;
  fetch?: typeof fetch;
}

function baseTriggersUrl(baseApiUrl: string) {
  return `${baseApiUrl.replace(/\/+$/u, '')}/v1/code/triggers`;
}

function routeFor(input: RemoteTriggerInput, base: string) {
  switch (input.action) {
    case 'list':
      return { method: 'GET', url: base, data: undefined };
    case 'get':
      if (!input.trigger_id) throw new Error('get requires trigger_id');
      return { method: 'GET', url: `${base}/${input.trigger_id}`, data: undefined };
    case 'create':
      if (!input.body) throw new Error('create requires body');
      return { method: 'POST', url: base, data: input.body };
    case 'update':
      if (!input.trigger_id) throw new Error('update requires trigger_id');
      if (!input.body) throw new Error('update requires body');
      return { method: 'POST', url: `${base}/${input.trigger_id}`, data: input.body };
    case 'run':
      if (!input.trigger_id) throw new Error('run requires trigger_id');
      return { method: 'POST', url: `${base}/${input.trigger_id}/run`, data: {} };
  }
}

async function responseJsonString(response: Response) {
  const text = await response.text();
  if (!text) return '';
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return text;
  }
}

export function createRemoteTriggerTool(
  dependencies: RemoteTriggerDependencies = {},
): Tool<RemoteTriggerInput, RemoteTriggerOutput> {
  return {
    name: REMOTE_TRIGGER_TOOL_NAME,
    description: `${REMOTE_TRIGGER_DESCRIPTION}\n\n${REMOTE_TRIGGER_PROMPT}`,
    searchHint: 'manage scheduled remote agent triggers',
    maxResultSizeChars: 100_000,
    shouldDefer: true,
    inputSchema: remoteTriggerInputSchema,
    outputSchema: remoteTriggerOutputSchema,
    isReadOnly: (input) => input.action === 'list' || input.action === 'get',
    isConcurrencySafe: () => true,
    toAutoClassifierInput: (input) => `RemoteTrigger ${input.action}${input.trigger_id ? ` ${input.trigger_id}` : ''}`,
    mapToolResultToToolResultBlockParam(output, toolUseId) {
      return {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: `HTTP ${output.status}\n${output.json}`,
      };
    },
    async run(input, context) {
      try {
        const accessToken = await dependencies.getAccessToken?.();
        if (!accessToken) {
          return {
            ok: false,
            content: 'Not authenticated with a claude.ai account. Run /login and try again.',
          };
        }
        const organizationUuid = await dependencies.getOrganizationUuid?.();
        if (!organizationUuid) {
          return {
            ok: false,
            content: 'Unable to resolve organization UUID.',
          };
        }
        const base = baseTriggersUrl(dependencies.baseApiUrl ?? 'https://api.anthropic.com');
        const route = routeFor(input, base);
        const fetchImpl = dependencies.fetch ?? globalThis.fetch;
        const response = await fetchImpl(route.url, {
          method: route.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-beta': REMOTE_TRIGGER_BETA_HEADER,
            'x-organization-uuid': organizationUuid,
          },
          ...(route.data === undefined ? {} : { body: JSON.stringify(route.data) }),
          signal: context.abortSignal,
        });
        const data = {
          status: response.status,
          json: await responseJsonString(response),
        };
        return {
          ok: true,
          content: `HTTP ${data.status}\n${data.json}`,
          data,
        };
      } catch (error) {
        return {
          ok: false,
          content: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

export const remoteTriggerTool = createRemoteTriggerTool();
