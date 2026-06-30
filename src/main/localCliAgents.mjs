import { spawnSync as defaultSpawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOCAL_CLI_AGENTS = [
  {
    id: 'claude',
    label: 'Claude Code',
    subtitle: 'Anthropic coding agent',
    commands: ['claude'],
    provider: 'anthropic',
    accent: 'rose',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    subtitle: 'OpenAI coding agent',
    commands: ['codex'],
    provider: 'openai',
    accent: 'green',
  },
  {
    id: 'devin',
    label: 'Devin for Terminal',
    subtitle: 'Cognition terminal agent',
    commands: ['devin'],
    provider: 'custom',
    accent: 'gray',
  },
  {
    id: 'gemini',
    label: 'Gemini CLI',
    subtitle: 'Google coding agent',
    commands: ['gemini'],
    provider: 'gemini',
    accent: 'violet',
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    subtitle: 'Open coding agent',
    commands: ['opencode', 'opencode-ai'],
    provider: 'custom',
    accent: 'teal',
  },
  {
    id: 'kimi',
    label: 'Kimi CLI',
    subtitle: 'Moonshot coding agent',
    commands: ['kimi'],
    provider: 'custom',
    accent: 'gray',
  },
  {
    id: 'cursor',
    label: 'Cursor Agent',
    subtitle: 'Cursor terminal agent',
    commands: ['cursor-agent', 'cursor'],
    provider: 'custom',
    accent: 'gray',
  },
  {
    id: 'qwen',
    label: 'Qwen Code',
    subtitle: 'Qwen coding agent',
    commands: ['qwen', 'qwen-code'],
    provider: 'custom',
    accent: 'purple',
  },
  {
    id: 'qoder',
    label: 'Qoder CLI',
    subtitle: 'Qoder coding agent',
    commands: ['qoder'],
    provider: 'custom',
    accent: 'green',
  },
  {
    id: 'github-copilot',
    label: 'GitHub Copilot CLI',
    subtitle: 'GitHub coding agent',
    commands: ['gh'],
    provider: 'github',
    accent: 'dark',
  },
  {
    id: 'pi',
    label: 'Pi',
    subtitle: 'Terminal assistant',
    commands: ['pi'],
    provider: 'custom',
    accent: 'gray',
  },
];

function isWindows(platform = process.platform) {
  return platform === 'win32';
}

function pathApi(platform = process.platform) {
  return isWindows(platform) ? path.win32 : path.posix;
}

function pathDelimiter(platform = process.platform) {
  return isWindows(platform) ? ';' : ':';
}

export function findPathEnvKey(env = process.env, platform = process.platform) {
  if (Object.hasOwn(env, 'Path')) return 'Path';
  if (Object.hasOwn(env, 'PATH')) return 'PATH';
  return isWindows(platform) ? 'Path' : 'PATH';
}

function executableExtensions(env = process.env, platform = process.platform) {
  if (!isWindows(platform)) return [''];
  const pathext = String(env.PATHEXT || '.COM;.EXE;.BAT;.CMD');
  return pathext
    .split(';')
    .map((ext) => ext.trim().toLowerCase())
    .filter(Boolean);
}

function commandCandidates(command, env, platform) {
  const pathImpl = pathApi(platform);
  const delimiter = pathDelimiter(platform);
  const pathKey = findPathEnvKey(env, platform);
  const pathEntries = String(env[pathKey] || '')
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const extName = pathImpl.extname(command);
  const suffixes = extName ? [''] : executableExtensions(env, platform);
  const candidates = [];

  for (const dir of pathEntries) {
    for (const suffix of suffixes) {
      candidates.push(pathImpl.join(dir, `${command}${suffix}`));
    }
  }
  return candidates;
}

export function resolveAgentCommand(agent, { env = process.env, platform = process.platform, existsSync } = {}) {
  const exists = existsSync || (() => false);
  for (const command of agent.commands || []) {
    for (const candidate of commandCandidates(command, env, platform)) {
      if (exists(candidate)) return candidate;
    }
  }
  return '';
}

function outputToString(value) {
  if (!value) return '';
  if (Buffer.isBuffer(value)) return value.toString('utf8');
  return String(value);
}

function readVersion(commandPath, { spawnSync = defaultSpawnSync } = {}) {
  if (!commandPath) return '';
  try {
    const result = spawnSync(commandPath, ['--version'], {
      encoding: 'buffer',
      timeout: 2500,
      windowsHide: true,
    });
    if (result?.status !== 0 && result?.status !== null) return '';
    const text = `${outputToString(result?.stdout)}${outputToString(result?.stderr)}`.trim();
    return (
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)[0] || ''
    );
  } catch {
    return '';
  }
}

export function scanLocalCliAgents({
  env = process.env,
  platform = process.platform,
  existsSync,
  spawnSync = defaultSpawnSync,
  includeVersions = true,
} = {}) {
  return LOCAL_CLI_AGENTS.map((agent) => {
    const commandPath = resolveAgentCommand(agent, { env, platform, existsSync });
    const installed = !!commandPath;
    return {
      id: agent.id,
      label: agent.label,
      subtitle: agent.subtitle,
      provider: agent.provider,
      accent: agent.accent,
      commands: [...agent.commands],
      installed,
      commandPath,
      version: installed && includeVersions ? readVersion(commandPath, { spawnSync }) : '',
    };
  });
}

export function resolveLocalCliAgentStatus(
  agentId,
  {
    env = process.env,
    platform = process.platform,
    existsSync,
    spawnSync = defaultSpawnSync,
    includeVersions = false,
  } = {},
) {
  const normalizedAgentId = String(agentId || '').trim();
  const agent = LOCAL_CLI_AGENTS.find((item) => item.id === normalizedAgentId);
  if (!agent) return null;

  const commandPath = resolveAgentCommand(agent, { env, platform, existsSync });
  const installed = !!commandPath;
  return {
    id: agent.id,
    label: agent.label,
    subtitle: agent.subtitle,
    provider: agent.provider,
    accent: agent.accent,
    commands: [...agent.commands],
    installed,
    commandPath,
    version: installed && includeVersions ? readVersion(commandPath, { spawnSync }) : '',
  };
}

function setIfEmpty(env, key, value) {
  const normalized = String(value || '').trim();
  if (!normalized || env[key]) return;
  env[key] = normalized;
}

function defaultMcpServerPath() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'mcp', 'xenesis-desk-mcp-server.mjs');
}

function normalizeMcpServerPath(value) {
  const normalized = String(value || '').trim();
  return normalized || defaultMcpServerPath();
}

function normalizeMcpBridgeUrl(value) {
  const normalized = String(value || '').trim();
  return normalized || 'http://127.0.0.1:3847';
}

export function buildMcpConfigSnippet({ serverPath, bridgeUrl, bridgeToken, stateFilePath } = {}) {
  const resolvedServerPath = normalizeMcpServerPath(serverPath);
  const env = {
    XENIS_MCP_BRIDGE_URL: normalizeMcpBridgeUrl(bridgeUrl),
  };
  if (bridgeToken) env.XENIS_MCP_BRIDGE_TOKEN = String(bridgeToken);
  if (stateFilePath) env.XENIS_MCP_STATE_FILE = String(stateFilePath);

  return JSON.stringify(
    {
      mcpServers: {
        xenesis: {
          command: 'node',
          args: [resolvedServerPath],
          env,
        },
      },
    },
    null,
    2,
  );
}

function applyMcpEnv(env, { mcp = {} } = {}) {
  if (mcp.enabled === false) return;

  const serverPath = normalizeMcpServerPath(mcp.serverPath);
  const bridgeUrl = normalizeMcpBridgeUrl(mcp.bridgeUrl);
  const bridgeToken = String(mcp.bridgeToken || '').trim();
  const stateFilePath = String(mcp.stateFilePath || '').trim();
  const configFilePath = String(mcp.configFilePath || '').trim();

  env.XENIS_MCP_SERVER_COMMAND = 'node';
  env.XENIS_MCP_SERVER_PATH = serverPath;
  env.XENIS_MCP_BRIDGE_URL = bridgeUrl;
  if (bridgeToken) env.XENIS_MCP_BRIDGE_TOKEN = bridgeToken;
  if (stateFilePath) env.XENIS_MCP_STATE_FILE = stateFilePath;
  if (configFilePath) env.XENIS_MCP_CONFIG_FILE = configFilePath;
  env.XENIS_MCP_CONFIG_SNIPPET = buildMcpConfigSnippet({
    serverPath,
    bridgeUrl,
    bridgeToken,
    stateFilePath,
  });
}

function appendSelectedCommandToPath(env, selectedAgent, platform) {
  const commandPath = String(selectedAgent?.commandPath || '').trim();
  if (!commandPath) return;
  const pathImpl = pathApi(platform);
  const dir = pathImpl.dirname(commandPath);
  const pathKey = findPathEnvKey(env, platform);
  const delimiter = pathDelimiter(platform);
  const current = String(env[pathKey] || '');
  const normalizedDir = dir.replace(/[\\/]+$/, '').toLowerCase();
  const segments = current.split(delimiter).filter(Boolean);
  const alreadyIncluded = segments.some((segment) => segment.replace(/[\\/]+$/, '').toLowerCase() === normalizedDir);
  env.XAMONG_DESK_LOCAL_CLI_COMMAND = commandPath;
  env.XAMONG_DESK_LOCAL_CLI_DIR = dir;
  if (!alreadyIncluded) {
    env[pathKey] = [dir, current].filter(Boolean).join(delimiter);
  }
}

function applyProviderEnv(env, { aiProvider = {}, xamongCode = {}, selectedAgent = null } = {}) {
  const agentProvider = String(selectedAgent?.provider || '');
  const provider =
    agentProvider && agentProvider !== 'custom' && agentProvider !== 'github'
      ? agentProvider
      : aiProvider.provider || '';
  if (provider) env.XAMONG_DESK_LOCAL_CLI_PROVIDER = provider;
  if (provider === 'openai') {
    setIfEmpty(
      env,
      'OPENAI_API_KEY',
      xamongCode.openAiApiKey || (aiProvider.provider === 'openai' ? aiProvider.apiKey : ''),
    );
    setIfEmpty(
      env,
      'OPENAI_MODEL',
      xamongCode.openAiModel || (aiProvider.provider === 'openai' ? aiProvider.model : ''),
    );
    setIfEmpty(env, 'OPENAI_BASE_URL', aiProvider.provider === 'openai' ? aiProvider.baseUrl : '');
  } else if (provider === 'anthropic') {
    setIfEmpty(env, 'ANTHROPIC_API_KEY', aiProvider.provider === 'anthropic' ? aiProvider.apiKey : '');
    setIfEmpty(env, 'ANTHROPIC_MODEL', aiProvider.provider === 'anthropic' ? aiProvider.model : '');
  } else if (provider === 'gemini') {
    setIfEmpty(env, 'GEMINI_API_KEY', aiProvider.provider === 'gemini' ? aiProvider.apiKey : '');
    setIfEmpty(env, 'GOOGLE_API_KEY', aiProvider.provider === 'gemini' ? aiProvider.apiKey : '');
    setIfEmpty(env, 'GEMINI_MODEL', aiProvider.provider === 'gemini' ? aiProvider.model : '');
  } else if (provider === 'groq') {
    setIfEmpty(env, 'GROQ_API_KEY', aiProvider.apiKey);
    setIfEmpty(env, 'GROQ_MODEL', aiProvider.model);
  } else if (provider === 'together') {
    setIfEmpty(env, 'TOGETHER_API_KEY', aiProvider.apiKey);
  } else if (provider === 'fireworks') {
    setIfEmpty(env, 'FIREWORKS_API_KEY', aiProvider.apiKey);
  } else if (provider === 'azure') {
    setIfEmpty(env, 'AZURE_OPENAI_API_KEY', aiProvider.apiKey);
    setIfEmpty(env, 'AZURE_OPENAI_ENDPOINT', aiProvider.baseUrl);
  }
}

export function buildLocalCliTerminalEnv({
  baseEnv = process.env,
  localCli = {},
  aiProvider = {},
  xamongCode = {},
  selectedAgent = null,
  platform = process.platform,
  mcp = {},
} = {}) {
  const env = { ...baseEnv };
  if (localCli.autoConfigureTerminal === false) return env;

  const selectedAgentId = String(localCli.selectedAgentId || selectedAgent?.id || '').trim();
  if (selectedAgentId) {
    env.XAMONG_DESK_LOCAL_CLI = selectedAgentId;
  }

  appendSelectedCommandToPath(env, selectedAgent, platform);
  applyProviderEnv(env, { aiProvider, xamongCode, selectedAgent });
  applyMcpEnv(env, { mcp });

  return env;
}
