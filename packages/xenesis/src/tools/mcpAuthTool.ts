import { z } from 'zod';
import type { Tool, ToolContext } from './types.js';

const mcpAuthInputSchema = z.object({}).strict();
const mcpAuthOutputSchema = z.object({
  status: z.enum(['auth_url', 'unsupported', 'error']),
  message: z.string(),
  authUrl: z.string().optional(),
});

type McpAuthInput = z.infer<typeof mcpAuthInputSchema>;
export type McpAuthOutput = z.infer<typeof mcpAuthOutputSchema>;

export type McpAuthServerConfig = {
  type?: 'stdio' | 'sse' | 'http' | 'claudeai-proxy' | string;
  url?: string;
  scope?: string;
};

export interface McpAuthDependencies {
  startOAuthFlow?: (
    serverName: string,
    config: McpAuthServerConfig,
    onAuthorizationUrl: (url: string) => void,
    signal?: AbortSignal,
  ) => Promise<void>;
  onAuthenticated?: (serverName: string, config: McpAuthServerConfig, context: ToolContext) => Promise<void>;
}

function normalizeNameForMcp(name: string) {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (name.startsWith('claude.ai ')) {
    normalized = normalized.replace(/_+/g, '_').replace(/^_|_$/g, '');
  }
  return normalized;
}

function buildMcpToolName(serverName: string, toolName: string) {
  return `mcp__${normalizeNameForMcp(serverName)}__${normalizeNameForMcp(toolName)}`;
}

function transportLocation(serverName: string, config: McpAuthServerConfig) {
  const transport = config.type ?? 'stdio';
  const location = config.url ? `${transport} at ${config.url}` : transport;
  return `The \`${serverName}\` MCP server (${location}) is installed but requires authentication. Call this tool to start the OAuth flow - you'll receive an authorization URL to share with the user. Once the user completes authorization in their browser, the server's real tools will become available automatically.`;
}

function unsupported(statusMessage: string) {
  return {
    ok: false,
    content: statusMessage,
    data: {
      status: 'unsupported' as const,
      message: statusMessage,
    },
  };
}

export function createMcpAuthTool(
  serverName: string,
  config: McpAuthServerConfig,
  dependencies: McpAuthDependencies = {},
): Tool<McpAuthInput, McpAuthOutput> {
  const description = transportLocation(serverName, config);
  return {
    name: buildMcpToolName(serverName, 'authenticate'),
    description,
    inputSchema: mcpAuthInputSchema,
    outputSchema: mcpAuthOutputSchema,
    isMcp: true,
    maxResultSizeChars: 10_000,
    isReadOnly: () => false,
    isConcurrencySafe: () => false,
    toAutoClassifierInput: () => serverName,
    async checkPermissions(input) {
      return { behavior: 'allow', message: '', updatedInput: input };
    },
    mapToolResultToToolResultBlockParam(output, toolUseId) {
      return {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: output.message,
      };
    },
    async run(_input, context) {
      if (config.type === 'claudeai-proxy') {
        return unsupported(
          `This is a claude.ai MCP connector. Ask the user to run /mcp and select "${serverName}" to authenticate.`,
        );
      }
      if (config.type !== 'sse' && config.type !== 'http') {
        const transport = config.type ?? 'stdio';
        return unsupported(
          `Server "${serverName}" uses ${transport} transport which does not support OAuth from this tool. Ask the user to run /mcp and authenticate manually.`,
        );
      }
      if (!dependencies.startOAuthFlow) {
        return {
          ok: false,
          content: `Failed to start OAuth flow for ${serverName}: OAuth flow dependency is not configured. Ask the user to run /mcp and authenticate manually.`,
          data: {
            status: 'error',
            message: `Failed to start OAuth flow for ${serverName}: OAuth flow dependency is not configured. Ask the user to run /mcp and authenticate manually.`,
          },
        };
      }

      let resolveAuthUrl: ((url: string) => void) | undefined;
      const authUrlPromise = new Promise<string>((resolve) => {
        resolveAuthUrl = resolve;
      });
      const oauthPromise = dependencies.startOAuthFlow(
        serverName,
        config,
        (url) => resolveAuthUrl?.(url),
        context.abortSignal,
      );
      void oauthPromise
        .then(() => dependencies.onAuthenticated?.(serverName, config, context))
        .catch((error) => {
          context.logger.error(
            `OAuth flow failed after tool-triggered start for ${serverName}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });

      try {
        const authUrl = await Promise.race([authUrlPromise, oauthPromise.then(() => null as string | null)]);
        if (authUrl) {
          const message = `Ask the user to open this URL in their browser to authorize the ${serverName} MCP server:\n\n${authUrl}\n\nOnce they complete the flow, the server's tools will become available automatically.`;
          return {
            ok: true,
            content: message,
            data: {
              status: 'auth_url',
              authUrl,
              message,
            },
          };
        }
        const message = `Authentication completed silently for ${serverName}. The server's tools should now be available.`;
        return {
          ok: true,
          content: message,
          data: {
            status: 'auth_url',
            message,
          },
        };
      } catch (error) {
        const message = `Failed to start OAuth flow for ${serverName}: ${error instanceof Error ? error.message : String(error)}. Ask the user to run /mcp and authenticate manually.`;
        return {
          ok: false,
          content: message,
          data: {
            status: 'error',
            message,
          },
        };
      }
    },
  };
}
