import type { McpServerConfig } from '../config/index.js';

export interface ResolveRecommendedOptions {
  workspaceRoot?: string;
  overrides?: Partial<McpServerConfig>;
  env?: Record<string, string | undefined>;
}

export type ResolvedRecommendedConfig = McpServerConfig & { missingEnv: string[] };

export interface MergeRecommendedResult {
  servers: Record<string, McpServerConfig>;
  warnings: string[];
}

export interface RecommendedMcpServer {
  name: string;
  displayName: string;
  description: string;
  transport: 'stdio' | 'http' | 'sse';
  template:
    | {
        type: 'stdio';
        command: string;
        args?: string[];
        env?: Record<string, string>;
      }
    | {
        type: 'http' | 'sse';
        url: string;
        headers?: Record<string, string>;
        transport?: 'http' | 'sse';
        auth?: 'oauth' | 'none';
        oauth?: { scope?: string; authServerMetadataUrl?: string };
      };
  requiredEnv?: string[];
  defaultEnabledTools?: string[];
}

export const RECOMMENDED_MCP_SERVERS: Record<string, RecommendedMcpServer> = {
  fetch: {
    name: 'fetch',
    displayName: 'Fetch',
    description: 'Fetch and convert web pages to markdown for the model to read.',
    transport: 'stdio',
    template: {
      type: 'stdio',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      env: {},
    },
    requiredEnv: [],
  },
  filesystem: {
    name: 'filesystem',
    displayName: 'Filesystem',
    description: 'Read-only access to files under the workspace root.',
    transport: 'stdio',
    template: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '${WORKSPACE_ROOT}'],
      env: {},
    },
    requiredEnv: [],
    defaultEnabledTools: [
      'read_file',
      'read_multiple_files',
      'list_directory',
      'directory_tree',
      'search_files',
      'get_file_info',
    ],
  },
  github: {
    name: 'github',
    displayName: 'GitHub',
    description: 'Read GitHub repositories, code, issues, and pull requests.',
    transport: 'stdio',
    template: {
      type: 'stdio',
      command: 'docker',
      args: ['run', '-i', '--rm', '-e', 'GITHUB_PERSONAL_ACCESS_TOKEN', 'ghcr.io/github/github-mcp-server'],
      env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}' },
    },
    requiredEnv: ['GITHUB_TOKEN'],
    defaultEnabledTools: [
      'search_repositories',
      'search_code',
      'get_file_contents',
      'list_issues',
      'get_issue',
      'list_pull_requests',
      'get_pull_request',
    ],
  },
  notion: {
    name: 'notion',
    displayName: 'Notion',
    description: 'Search and read Notion pages and databases.',
    transport: 'stdio',
    template: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: { NOTION_TOKEN: '${NOTION_TOKEN}' },
    },
    requiredEnv: ['NOTION_TOKEN'],
  },
  linear: {
    name: 'linear',
    displayName: 'Linear',
    description: 'Find, read, and update Linear issues, projects, and comments.',
    transport: 'http',
    template: {
      type: 'http',
      transport: 'http',
      url: 'https://mcp.linear.app/mcp',
      auth: 'oauth',
    },
    requiredEnv: [],
  },
};

export function listRecommendedMcpServers(): RecommendedMcpServer[] {
  return Object.values(RECOMMENDED_MCP_SERVERS);
}

export function getRecommendedMcpServer(name: string): RecommendedMcpServer | undefined {
  return RECOMMENDED_MCP_SERVERS[name];
}

function resolveTemplateString(
  value: string,
  options: { workspaceRoot: string; env: Record<string, string | undefined> },
) {
  return value.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (match, name: string) => {
    if (name === 'WORKSPACE_ROOT') return options.workspaceRoot;
    const envValue = options.env[name];
    return envValue === undefined ? match : envValue;
  });
}

function resolveTemplateEnv(
  env: Record<string, string> | undefined,
  options: { workspaceRoot: string; env: Record<string, string | undefined> },
) {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(env ?? {})) {
    resolved[key] = resolveTemplateString(value, options);
  }
  return resolved;
}

export function resolveRecommendedServer(
  server: RecommendedMcpServer,
  options: ResolveRecommendedOptions = {},
): ResolvedRecommendedConfig {
  const workspaceRoot = options.workspaceRoot ?? '.';
  const env = options.env ?? process.env;
  const missingEnv = (server.requiredEnv ?? []).filter((key) => env[key] === undefined || env[key] === '');
  const resolveOptions = { workspaceRoot, env };

  const base: McpServerConfig =
    server.template.type === 'stdio'
      ? {
          type: 'stdio',
          command: server.template.command,
          args: (server.template.args ?? []).map((arg) => resolveTemplateString(arg, resolveOptions)),
          env: resolveTemplateEnv(server.template.env, resolveOptions),
        }
      : {
          type: server.template.type,
          url: server.template.url,
          ...(server.template.headers ? { headers: server.template.headers } : {}),
          ...(server.template.transport ? { transport: server.template.transport } : {}),
          ...(server.template.auth ? { auth: server.template.auth } : {}),
          ...(server.template.oauth ? { oauth: server.template.oauth } : {}),
        };

  if (server.defaultEnabledTools && server.defaultEnabledTools.length > 0) {
    base.toolFilter = { include: [...server.defaultEnabledTools] };
  }

  const resolved = { ...base, ...options.overrides } as McpServerConfig;
  return { ...resolved, missingEnv } as ResolvedRecommendedConfig;
}

export function mergeRecommendedMcpServers(
  existing: Record<string, McpServerConfig>,
  names: string[],
  options: { workspaceRoot?: string; env?: Record<string, string | undefined> } = {},
): MergeRecommendedResult {
  const servers: Record<string, McpServerConfig> = { ...existing };
  const warnings: string[] = [];

  for (const name of names) {
    if (name in servers) continue;
    const recommended = RECOMMENDED_MCP_SERVERS[name];
    if (!recommended) continue;
    const resolved = resolveRecommendedServer(recommended, {
      workspaceRoot: options.workspaceRoot,
      env: options.env,
    });
    if (resolved.missingEnv.length > 0) {
      warnings.push(`${name}: missing env ${resolved.missingEnv.join(', ')}; skipped`);
      continue;
    }
    const { missingEnv: _missingEnv, ...server } = resolved;
    servers[name] = server;
  }

  return { servers, warnings };
}
