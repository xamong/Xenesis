import path from 'node:path';
import { getDefaultXamongCodeConfigDir } from './xenisHome.mjs';

export const DEFAULT_XAMONG_CODE_API_HOST = '127.0.0.1';
export const DEFAULT_XAMONG_CODE_API_PORT = 3337;
export const DEFAULT_XAMONG_CODE_CONFIG_DIR = getDefaultXamongCodeConfigDir();

function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/]+$/, '');
}

function apiServerPath(runtimePath) {
  return path.join(runtimePath, 'runtime-compat', 'apiServer.mjs');
}

function candidateRuntimePaths({ settingPath, env, appIsPackaged, dirname, resourcesPath }) {
  const candidates = [];
  const configured = normalizePath(settingPath);
  const envPath = normalizePath(env?.XAMONG_CODE_RUNTIME_PATH);

  if (configured) candidates.push(configured);
  if (envPath) candidates.push(envPath);

  if (appIsPackaged) {
    candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'vendor', 'xamongcode'));
    candidates.push(path.join(resourcesPath, 'vendor', 'xamongcode'));
  }

  candidates.push(path.resolve(dirname, '..', '..', 'vendor', 'xamongcode'));
  candidates.push(path.resolve(dirname, '..', '..', '..', 'xamongcode'));

  return [...new Set(candidates.map(normalizePath).filter(Boolean))];
}

export function resolveXamongCodeRuntimePath({
  settingPath = '',
  env = process.env,
  appIsPackaged = false,
  dirname = process.cwd(),
  resourcesPath = process.cwd(),
  existsSync,
} = {}) {
  const exists = existsSync || (() => false);
  for (const candidate of candidateRuntimePaths({ settingPath, env, appIsPackaged, dirname, resourcesPath })) {
    if (exists(apiServerPath(candidate))) {
      return candidate;
    }
  }
  return '';
}

export function buildXamongCodeApiLaunch({
  runtimePath,
  host = DEFAULT_XAMONG_CODE_API_HOST,
  port = DEFAULT_XAMONG_CODE_API_PORT,
  configDir = '',
  openAiApiKey = '',
  openAiModel = '',
  workspacesConfigPath = '',
  directGeneralChat,
  directChatModel = '',
  workerTierPolicies = '',
  env = process.env,
  existsSync,
} = {}) {
  const exists = existsSync || (() => false);
  const runtime = normalizePath(runtimePath);
  const scriptPath = runtime ? apiServerPath(runtime) : '';

  if (!scriptPath || !exists(scriptPath)) {
    return {
      ok: false,
      error: `xamongcode apiServer.mjs not found: ${scriptPath || '(runtime path is empty)'}`,
    };
  }

  const normalizedHost = String(host || DEFAULT_XAMONG_CODE_API_HOST).trim();
  const normalizedPort = Number.isInteger(Number(port))
    ? Math.max(1, Math.min(65535, Math.floor(Number(port))))
    : DEFAULT_XAMONG_CODE_API_PORT;
  const normalizedConfigDir = normalizePath(configDir);
  const launchEnv = {
    ...env,
    XAMONG_API_HOST: normalizedHost,
    XAMONG_API_PORT: String(normalizedPort),
  };

  if (normalizedConfigDir) {
    launchEnv.XAMONG_CONFIG_DIR = normalizedConfigDir;
    const defaultWorkspaceConfigPath = path.join(normalizedConfigDir, 'xamong-api-workspaces.json');
    if (!launchEnv.XAMONG_API_WORKSPACES_CONFIG && exists(defaultWorkspaceConfigPath)) {
      launchEnv.XAMONG_API_WORKSPACES_CONFIG = defaultWorkspaceConfigPath;
    }
  }

  const normalizedWorkspaceConfigPath = normalizePath(workspacesConfigPath);
  if (normalizedWorkspaceConfigPath) {
    launchEnv.XAMONG_API_WORKSPACES_CONFIG = normalizedWorkspaceConfigPath;
  }

  const normalizedOpenAiApiKey = String(openAiApiKey || '').trim();
  const normalizedOpenAiModel = String(openAiModel || '').trim();
  if (normalizedOpenAiApiKey) launchEnv.OPENAI_API_KEY = normalizedOpenAiApiKey;
  if (normalizedOpenAiModel) launchEnv.OPENAI_MODEL = normalizedOpenAiModel;
  if (typeof directGeneralChat === 'boolean') {
    launchEnv.XAMONG_API_DIRECT_GENERAL_CHAT = directGeneralChat ? '1' : '0';
  }
  const normalizedDirectChatModel = String(directChatModel || '').trim();
  if (normalizedDirectChatModel) launchEnv.XAMONG_API_DIRECT_CHAT_MODEL = normalizedDirectChatModel;
  const normalizedWorkerTierPolicies = String(workerTierPolicies || '').trim();
  if (normalizedWorkerTierPolicies) {
    launchEnv.XAMONG_API_INTERACTIVE_WORKER_TIER_POLICIES = normalizedWorkerTierPolicies;
  }

  return {
    ok: true,
    command: process.platform === 'win32' ? 'node.exe' : 'node',
    args: [scriptPath, '--host', normalizedHost, '--port', String(normalizedPort)],
    cwd: runtime,
    env: launchEnv,
    url: `http://${normalizedHost}:${normalizedPort}`,
  };
}

export function findPathEnvKey(env = process.env) {
  if (Object.hasOwn(env, 'Path')) return 'Path';
  if (Object.hasOwn(env, 'PATH')) return 'PATH';
  return process.platform === 'win32' ? 'Path' : 'PATH';
}

export function buildXamongCodeTerminalEnv({
  baseEnv = process.env,
  runtimePath = '',
  configDir = '',
  apiUrl = '',
  openAiApiKey = '',
  openAiModel = '',
  workspacesConfigPath = '',
  directGeneralChat,
  directChatModel = '',
  workerTierPolicies = '',
  shimDir = '',
  pathKey = findPathEnvKey(baseEnv),
} = {}) {
  const env = { ...baseEnv };
  const runtime = normalizePath(runtimePath);
  const config = normalizePath(configDir);
  const shim = normalizePath(shimDir);

  if (runtime) env.XAMONG_CODE_RUNTIME_PATH = runtime;
  if (config) env.XAMONG_CONFIG_DIR = config;
  if (apiUrl) env.XAMONG_API_URL = apiUrl;
  if (openAiApiKey) env.OPENAI_API_KEY = String(openAiApiKey).trim();
  if (openAiModel) env.OPENAI_MODEL = String(openAiModel).trim();
  if (typeof directGeneralChat === 'boolean') {
    env.XAMONG_API_DIRECT_GENERAL_CHAT = directGeneralChat ? '1' : '0';
  }
  if (directChatModel) env.XAMONG_API_DIRECT_CHAT_MODEL = String(directChatModel).trim();
  if (workerTierPolicies) {
    env.XAMONG_API_INTERACTIVE_WORKER_TIER_POLICIES = String(workerTierPolicies).trim();
  }
  if (workspacesConfigPath) {
    env.XAMONG_API_WORKSPACES_CONFIG = normalizePath(workspacesConfigPath);
  } else if (config && !env.XAMONG_API_WORKSPACES_CONFIG) {
    env.XAMONG_API_WORKSPACES_CONFIG = path.join(config, 'xamong-api-workspaces.json');
  }

  if (shim) {
    const currentPath = String(env[pathKey] || '');
    const segments = currentPath.split(path.delimiter).filter(Boolean);
    const hasShim = segments.some((segment) => normalizePath(segment).toLowerCase() === shim.toLowerCase());
    env[pathKey] = hasShim ? currentPath : [shim, currentPath].filter(Boolean).join(path.delimiter);
  }

  return env;
}
