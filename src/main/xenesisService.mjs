import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { readCodexModel } from './codexIsolatedHome.mjs';

export const DEFAULT_XENESIS_GATEWAY_HOST = '127.0.0.1';
export const DEFAULT_XENESIS_GATEWAY_PORT = 3338;
export const DEFAULT_XENESIS_GATEWAY_WORKFLOW = 'xenis';

function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/]+$/, '');
}

function cliEntrypointPath(runtimePath) {
  return path.join(runtimePath, 'dist', 'cli', 'main.js');
}

function candidateRuntimePaths({ settingPath, settingsPath, env, appIsPackaged, dirname, resourcesPath }) {
  const candidates = [];
  const configured = normalizePath(settingsPath) || normalizePath(settingPath);
  const envPath = normalizePath(env?.XENESIS_RUNTIME_PATH);
  const devPackageFromDirname = path.resolve(dirname, '..', '..', 'packages', 'xenesis');
  const devPackageFromCwd = path.resolve(process.cwd(), 'packages', 'xenesis');
  const devNodeModuleFromDirname = path.resolve(dirname, '..', '..', 'node_modules', 'xenesis');
  const devNodeModuleFromCwd = path.resolve(process.cwd(), 'node_modules', 'xenesis');

  if (configured) candidates.push(configured);
  if (envPath) candidates.push(envPath);

  if (appIsPackaged) {
    candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'xenesis'));
    candidates.push(path.join(resourcesPath, 'node_modules', 'xenesis'));
    candidates.push(path.join(resourcesPath, 'app.asar.unpacked', 'vendor', 'xenesis'));
    candidates.push(path.join(resourcesPath, 'vendor', 'xenesis'));
    return [...new Set(candidates.map(normalizePath).filter(Boolean))];
  }

  candidates.push(devPackageFromDirname);
  candidates.push(devPackageFromCwd);
  candidates.push(devNodeModuleFromDirname);
  candidates.push(devNodeModuleFromCwd);
  candidates.push(path.resolve(dirname, '..', '..', 'vendor', 'xenesis'));
  candidates.push(path.resolve(process.cwd(), 'vendor', 'xenesis'));

  return [...new Set(candidates.map(normalizePath).filter(Boolean))];
}

export function resolveXenesisRuntimePath({
  settingPath = '',
  settingsPath = '',
  env = process.env,
  app,
  appIsPackaged,
  dirname = process.cwd(),
  resourcesPath,
  existsSync = fs.existsSync,
} = {}) {
  const packaged = typeof appIsPackaged === 'boolean' ? appIsPackaged : Boolean(app?.isPackaged);
  const resources = normalizePath(resourcesPath || process.resourcesPath || process.cwd());
  for (const candidate of candidateRuntimePaths({
    settingPath,
    settingsPath,
    env,
    appIsPackaged: packaged,
    dirname,
    resourcesPath: resources,
  })) {
    if (existsSync(cliEntrypointPath(candidate))) {
      return candidate;
    }
  }
  return '';
}

export function resolveXenesisStateHome({ xenisHome }) {
  return path.join(normalizePath(xenisHome), 'xenesis');
}

function pathStat(pathValue, statSync) {
  try {
    return statSync(pathValue);
  } catch {
    return undefined;
  }
}

function workspaceProfileDefaultCwd(filePath, readFileSync) {
  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    return normalizePath(raw?.settings?.defaultCwd || raw?.defaultCwd);
  } catch {
    return '';
  }
}

export function resolveXenesisWorkspaceRoot({
  activeWorkspace = '',
  workspacePath = '',
  defaultCwd = '',
  fallbackCwd = process.cwd(),
  existsSync = fs.existsSync,
  statSync = fs.statSync,
  readFileSync = fs.readFileSync,
} = {}) {
  const active = normalizePath(activeWorkspace);
  if (active) return active;

  const fallback = normalizePath(defaultCwd) || normalizePath(fallbackCwd) || process.cwd();
  const configured = normalizePath(workspacePath);
  if (!configured) return fallback;

  if (!existsSync(configured)) return configured;

  const configuredStat = pathStat(configured, statSync);
  if (configuredStat?.isDirectory?.()) return configured;

  if (configuredStat?.isFile?.()) {
    const profileCwd = workspaceProfileDefaultCwd(configured, readFileSync);
    if (profileCwd) return profileCwd;
    return normalizePath(path.dirname(configured)) || fallback;
  }

  return fallback;
}

export function isPortAvailable(host = DEFAULT_XENESIS_GATEWAY_HOST, port = DEFAULT_XENESIS_GATEWAY_PORT) {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;
    const finish = (available) => {
      if (settled) return;
      settled = true;
      server.removeAllListeners();
      if (server.listening) {
        server.close(() => resolve(available));
      } else {
        resolve(available);
      }
    };
    server.once('error', () => finish(false));
    server.once('listening', () => finish(true));
    server.listen(port, host);
  });
}

export async function resolveXenesisGatewayPort({
  configuredPort = 0,
  host = DEFAULT_XENESIS_GATEWAY_HOST,
  defaultPort = DEFAULT_XENESIS_GATEWAY_PORT,
  isPortAvailable: isPortAvailableImpl = isPortAvailable,
  findOpenPort: findOpenPortImpl = findOpenPort,
} = {}) {
  const configured = Number.isInteger(Number(configuredPort))
    ? Math.max(0, Math.min(65535, Math.floor(Number(configuredPort))))
    : 0;
  const fallbackDefault = Number.isInteger(Number(defaultPort))
    ? Math.max(1, Math.min(65535, Math.floor(Number(defaultPort))))
    : DEFAULT_XENESIS_GATEWAY_PORT;
  const preferredPort = configured > 0 ? configured : fallbackDefault;

  if (await isPortAvailableImpl(host, preferredPort)) {
    return {
      port: preferredPort,
      preferredPort,
      fallback: false,
      fallbackReason: '',
    };
  }

  const fallbackPort = Number(await findOpenPortImpl(host));
  return {
    port: fallbackPort,
    preferredPort,
    fallback: true,
    fallbackReason: `Port ${preferredPort} is unavailable; using ${fallbackPort}.`,
  };
}

function resolveLaunchStateHome({ stateHome, xenesisHome, xenisHome }) {
  const explicitStateHome = normalizePath(stateHome);
  if (explicitStateHome) return explicitStateHome;

  const explicitXenesisHome = normalizePath(xenesisHome);
  if (explicitXenesisHome) return explicitXenesisHome;

  const deskHome = normalizePath(xenisHome);
  if (deskHome) return resolveXenesisStateHome({ xenisHome: deskHome });

  return '';
}

function trimmed(value) {
  return String(value || '').trim();
}

function plainContext(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function optionalProviderRuntimeText(value) {
  const text = trimmed(value);
  return text || undefined;
}

export function buildXenesisProviderRuntimeOverride({
  providerRuntime,
  provider = '',
  model = '',
  profile = '',
  providerProfile = '',
  baseURL = '',
  baseUrl = '',
  apiKeyEnv = '',
} = {}) {
  const source = plainContext(providerRuntime);
  const override = {};
  const providerName = optionalProviderRuntimeText(source.provider ?? provider);
  const modelName = optionalProviderRuntimeText(source.model ?? model);
  const profileName = optionalProviderRuntimeText(
    source.profile ?? source.providerProfile ?? profile ?? providerProfile,
  );
  const runtimeBaseURL = optionalProviderRuntimeText(source.baseURL ?? source.baseUrl ?? baseURL ?? baseUrl);
  const runtimeApiKeyEnv = optionalProviderRuntimeText(source.apiKeyEnv ?? apiKeyEnv);

  if (providerName) override.provider = providerName;
  if (modelName) override.model = modelName;
  if (profileName) override.profile = profileName;
  if (runtimeBaseURL) override.baseURL = runtimeBaseURL;
  if (runtimeApiKeyEnv) override.apiKeyEnv = runtimeApiKeyEnv;
  return Object.keys(override).length > 0 ? override : undefined;
}

export function buildXenesisGatewayRunPayload({
  prompt = '',
  workflow = '',
  source = '',
  workspace = '',
  mode,
  context = {},
  providerRuntime,
  provider = '',
  model = '',
  profile = '',
  providerProfile = '',
  baseURL = '',
  baseUrl = '',
  apiKeyEnv = '',
} = {}) {
  const runtimeOverride = buildXenesisProviderRuntimeOverride({
    providerRuntime,
    provider,
    model,
    profile,
    providerProfile,
    baseURL,
    baseUrl,
    apiKeyEnv,
  });
  const runContext = plainContext(context);
  return {
    prompt: String(prompt || ''),
    workflow: trimmed(workflow) || DEFAULT_XENESIS_GATEWAY_WORKFLOW,
    ...(runtimeOverride ? { providerRuntime: runtimeOverride } : {}),
    ideContext: {
      source: trimmed(source) || 'xenesis-desk',
      workspace: String(workspace || ''),
      ...(mode ? { mode } : {}),
      context: runtimeOverride ? { ...runContext, providerRuntime: runtimeOverride } : runContext,
    },
  };
}

// 'auto' credential scan (hermes-style): when the user has NOT pinned a provider,
// pick the first AVAILABLE backend by scanning credentials — local CLI logins first
// (no API key needed), then keyed BYOK env vars. This NEVER silently overrides an
// explicit provider choice; it only runs for provider === 'auto' | ''. The mock
// provider has been removed — the agent always reasons against a real backend.
function resolveAutoProvider(env = {}) {
  const home = trimmed(env.USERPROFILE) || trimmed(env.HOME) || '';
  const codexHome = trimmed(env.CODEX_HOME) || (home ? path.join(home, '.codex') : '');
  // Prefer the persistent app-server runtime for a logged-in Codex: it reuses one
  // `codex app-server --stdio` process/thread, so the Windows sandbox is set up
  // once instead of per turn. CodexAppServerProvider falls back to one-shot
  // `codex exec` (codex-cli) automatically if app-server startup fails.
  if (codexHome && fs.existsSync(path.join(codexHome, 'auth.json'))) {
    // Opt-in Option B: talk to the ChatGPT Codex backend directly (no codex
    // binary, Xenesis owns the loop). XENESIS_CODEX_TRANSPORT=responses selects it.
    return trimmed(env.XENESIS_CODEX_TRANSPORT) === 'responses' ? 'codex-responses' : 'codex-app-server';
  }
  if (home && fs.existsSync(path.join(home, '.claude', '.credentials.json'))) return 'claude-cli';
  if (trimmed(env.ANTHROPIC_API_KEY)) return 'anthropic';
  if (trimmed(env.OPENAI_API_KEY)) return 'openai';
  if (trimmed(env.GEMINI_API_KEY)) return 'gemini';
  if (trimmed(env.GROQ_API_KEY)) return 'groq';
  if (trimmed(env.DEEPSEEK_API_KEY)) return 'deepseek';
  if (trimmed(env.DASHSCOPE_API_KEY)) return 'qwen';
  // Last resort: the Desk-native local CLI (works once the user logs into Codex).
  return 'codex-cli';
}

export function buildXenesisProviderRuntimeOptions({ xenesisSettings = {}, aiProvider = {}, env = process.env } = {}) {
  const profile = trimmed(xenesisSettings.profile);
  const preferredModel = trimmed(xenesisSettings.model) || trimmed(aiProvider.model);
  const requested = trimmed(aiProvider.provider);
  // 'auto' (or unset) → scan credentials for the first available backend. An
  // explicit, recognized provider choice is ALWAYS respected (never overridden).
  const resolvedProvider = requested === 'auto' || requested === '' ? resolveAutoProvider(env) : requested;
  // Option B opt-in: XENESIS_CODEX_TRANSPORT=responses redirects ANY codex variant
  // (auto-resolved or explicitly pinned) to the direct-backend codex-responses provider.
  const provider =
    trimmed(env.XENESIS_CODEX_TRANSPORT) === 'responses' && /^codex/.test(String(resolvedProvider))
      ? 'codex-responses'
      : resolvedProvider;
  const apiKey = trimmed(aiProvider.apiKey);
  const baseURL = trimmed(aiProvider.baseUrl);

  // Respect the chosen keyed (BYOK) provider even when no key is present: surface a
  // real auth error downstream rather than silently switching to another provider.
  const keyedProvider = (name, apiKeyEnv) => ({
    provider: name,
    model: preferredModel,
    profile,
    baseURL,
    apiKeyEnv,
    env: apiKey ? { [apiKeyEnv]: apiKey } : {},
  });

  if (provider === 'openai') return keyedProvider('openai', 'OPENAI_API_KEY');
  if (provider === 'anthropic') return keyedProvider('anthropic', 'ANTHROPIC_API_KEY');
  if (provider === 'gemini') return keyedProvider('gemini', 'GEMINI_API_KEY');
  if (provider === 'groq') return keyedProvider('groq', 'GROQ_API_KEY');
  if (provider === 'deepseek') return keyedProvider('deepseek', 'DEEPSEEK_API_KEY');
  if (provider === 'qwen') return keyedProvider('qwen', 'DASHSCOPE_API_KEY');
  if (provider === 'ollama') {
    return {
      provider: 'ollama',
      model: preferredModel,
      profile,
      baseURL,
      apiKeyEnv: 'OLLAMA_API_KEY',
      env:
        env?.OLLAMA_API_KEY || apiKey
          ? { OLLAMA_API_KEY: apiKey || env.OLLAMA_API_KEY }
          : { OLLAMA_API_KEY: 'xenesis-local' },
    };
  }

  // Option B: codex-responses talks to the ChatGPT Codex backend directly using
  // the OAuth token in ~/.codex/auth.json (no api key). The model is sent in the
  // request, so resolve it from the Desk setting or mirror the user's codex model.
  if (provider === 'codex-responses') {
    const cxHome = trimmed(env.USERPROFILE) || trimmed(env.HOME) || '';
    const codexHome = trimmed(env.CODEX_HOME) || (cxHome ? path.join(cxHome, '.codex') : '');
    return {
      provider: 'codex-responses',
      model: preferredModel || readCodexModel(codexHome) || 'gpt-5.5',
      profile,
      baseURL: '',
      apiKeyEnv: '',
      env: {},
    };
  }

  // Local CLI providers (codex/claude) authenticate via their own CLI (e.g.
  // CODEX_HOME), so they need no API key and run the embedded agent against the
  // local CLI binary. Pass them straight through to the runtime factory.
  if (
    provider === 'codex-cli' ||
    provider === 'codex-app-server' ||
    provider === 'claude-cli' ||
    provider === 'claude-interactive'
  ) {
    return {
      provider,
      model: preferredModel,
      profile,
      baseURL: '',
      apiKeyEnv: '',
      env: {},
    };
  }

  if (baseURL) {
    return {
      provider: 'openai-compatible',
      model: preferredModel,
      profile,
      baseURL,
      apiKeyEnv: 'XENESIS_API_KEY',
      env: { XENESIS_API_KEY: apiKey || env?.XENESIS_API_KEY || 'xenesis-local' },
    };
  }

  // Unknown provider string → fall back to the Desk-native local CLI (no key).
  return {
    provider: 'codex-cli',
    model: preferredModel,
    profile,
    baseURL: '',
    apiKeyEnv: '',
    env: {},
  };
}

export function findOpenPort(host = DEFAULT_XENESIS_GATEWAY_HOST) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close((error) => {
        if (error) reject(error);
        else resolve(port);
      });
    });
  });
}

export function buildXenesisGatewayLaunch({
  runtimePath,
  stateHome = '',
  xenesisHome = '',
  xenisHome,
  workspace,
  host = DEFAULT_XENESIS_GATEWAY_HOST,
  port = DEFAULT_XENESIS_GATEWAY_PORT,
  token = '',
  gatewayToken = '',
  bridgeUrl = '',
  mcpBridgeUrl = '',
  bridgeToken = '',
  mcpBridgeToken = '',
  profile = '',
  provider = '',
  model = '',
  baseURL = '',
  apiKeyEnv = '',
  env = process.env,
  existsSync = fs.existsSync,
} = {}) {
  const runtime = normalizePath(runtimePath);
  const entrypoint = runtime ? cliEntrypointPath(runtime) : '';

  if (!entrypoint || !existsSync(entrypoint)) {
    return {
      ok: false,
      error: `Xenesis CLI entrypoint not found: ${entrypoint || '(runtime path is empty)'}`,
    };
  }

  const resolvedStateHome = resolveLaunchStateHome({ stateHome, xenesisHome, xenisHome });
  if (!resolvedStateHome) {
    return {
      ok: false,
      error: 'XENESIS_HOME is required; provide stateHome, xenesisHome, or xenisHome',
    };
  }

  const normalizedHost = String(host || DEFAULT_XENESIS_GATEWAY_HOST).trim();
  const normalizedPort = Number.isInteger(Number(port))
    ? Math.max(0, Math.min(65535, Math.floor(Number(port))))
    : DEFAULT_XENESIS_GATEWAY_PORT;
  const cwd = normalizePath(workspace) || runtime;
  const resolvedGatewayToken = String(gatewayToken || token || '');
  const resolvedBridgeUrl = String(mcpBridgeUrl || bridgeUrl || '');
  const resolvedBridgeToken = String(mcpBridgeToken || bridgeToken || '');
  const normalizedProfile = String(profile || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const normalizedModel = String(model || '').trim();
  const normalizedBaseURL = String(baseURL || '').trim();
  const normalizedApiKeyEnv = String(apiKeyEnv || '').trim();
  const { XENIS_MCP_BRIDGE_URL: _staleBridgeUrl, XENIS_MCP_BRIDGE_TOKEN: _staleBridgeToken, ...baseEnv } = env || {};
  const launchEnv = {
    ...baseEnv,
    XENESIS_HOME: resolvedStateHome,
    XENESIS_MODE: 'desk',
    XENIS_XENESIS: '1',
    ELECTRON_RUN_AS_NODE: '1',
    XENESIS_GATEWAY_PORT: String(normalizedPort),
    XENESIS_GATEWAY_TOKEN: resolvedGatewayToken,
    ...(resolvedBridgeUrl ? { XENIS_MCP_BRIDGE_URL: resolvedBridgeUrl } : {}),
    ...(resolvedBridgeToken ? { XENIS_MCP_BRIDGE_TOKEN: resolvedBridgeToken } : {}),
  };
  const args = [entrypoint, 'gateway', '--host', normalizedHost, '--port', String(normalizedPort)];
  if (resolvedGatewayToken) args.push('--auth-token-env', 'XENESIS_GATEWAY_TOKEN');
  if (normalizedProfile) args.push('--profile', normalizedProfile);
  if (normalizedProvider) args.push('--provider', normalizedProvider);
  if (normalizedModel) args.push('--model', normalizedModel);
  if (normalizedBaseURL) args.push('--base-url', normalizedBaseURL);
  if (normalizedApiKeyEnv) args.push('--api-key-env', normalizedApiKeyEnv);

  return {
    ok: true,
    command: process.execPath,
    args,
    cwd,
    env: launchEnv,
    url: normalizedPort === 0 ? '' : `http://${normalizedHost}:${normalizedPort}`,
    host: normalizedHost,
    port: normalizedPort,
    entrypoint,
  };
}

export function readGatewayJson(url, token, pathname, timeoutMs = 1500) {
  return new Promise((resolve, reject) => {
    const target = new URL(pathname || '/', url);
    const client = target.protocol === 'https:' ? https : http;
    const request = client.request(
      target,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Xenesis gateway returned HTTP ${response.statusCode}`));
            return;
          }
          try {
            resolve(body ? JSON.parse(body) : null);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.once('error', reject);
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      request.setTimeout(timeoutMs, () => {
        request.destroy(new Error(`Xenesis gateway request timed out after ${timeoutMs}ms`));
      });
    }
    request.end();
  });
}

function messageFromUnknown(error) {
  return error instanceof Error ? error.message : String(error);
}

export async function waitForGatewayReady(
  url,
  token,
  {
    timeoutMs = 5000,
    intervalMs = 100,
    requestTimeoutMs = 750,
    readJson = readGatewayJson,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = () => Date.now(),
  } = {},
) {
  if (!url) {
    return { ready: false, error: 'Xenesis gateway URL is not available.', attempts: 0 };
  }

  const deadline = now() + Math.max(0, Number(timeoutMs) || 0);
  const interval = Math.max(0, Number(intervalMs) || 0);
  let attempts = 0;
  let lastError = '';

  do {
    attempts += 1;
    try {
      await readJson(url, token, '/status', requestTimeoutMs);
      return { ready: true, error: '', attempts };
    } catch (error) {
      lastError = messageFromUnknown(error);
    }

    if (now() >= deadline) break;
    if (interval > 0) {
      await sleep(interval);
    }
  } while (now() <= deadline);

  return {
    ready: false,
    error: `Xenesis gateway is not ready or reachable: ${lastError || 'timed out'}`,
    attempts,
  };
}

function xenesisSseFieldValue(line, fieldName) {
  const raw = line.slice(fieldName.length + 1);
  return raw.startsWith(' ') ? raw.slice(1) : raw;
}

export function parseXenesisSseChunk(chunk) {
  const rawChunk = String(chunk || '');
  const frameEnd = rawChunk.search(/\r?\n\r?\n/);
  if (frameEnd < 0) return undefined;

  const frame = rawChunk.slice(0, frameEnd);
  let event = 'message';
  const dataLines = [];

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      const value = xenesisSseFieldValue(line, 'event').trim();
      event = value || 'message';
    } else if (line.startsWith('data:')) {
      dataLines.push(xenesisSseFieldValue(line, 'data'));
    }
  }

  if (dataLines.length === 0) return undefined;

  const data = dataLines.join('\n');
  if (!data.trim()) return undefined;

  return {
    event,
    data: JSON.parse(data),
  };
}

export function postGatewayJson(url, token, pathname, body, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const target = new URL(pathname || '/', url);
    const client = target.protocol === 'https:' ? https : http;
    const payload = JSON.stringify(body ?? {});
    const request = client.request(
      target,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          const statusCode = response.statusCode ?? 0;
          if (statusCode < 200 || statusCode >= 300) {
            const detail = responseBody ? `: ${responseBody}` : '';
            reject(new Error(`Xenesis gateway returned HTTP ${statusCode}${detail}`));
            return;
          }
          try {
            resolve(responseBody ? JSON.parse(responseBody) : null);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    request.once('error', reject);
    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      request.setTimeout(timeoutMs, () => {
        request.destroy(new Error(`Xenesis gateway request timed out after ${timeoutMs}ms`));
      });
    }
    request.end(payload);
  });
}

const GATEWAY_CHILD_LOG_LIMIT = 12000;

function appendLimitedOutput(current, chunk) {
  const text = Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk ?? '');
  if (!text) return current;
  const combined = `${current || ''}${text}`;
  return combined.length > GATEWAY_CHILD_LOG_LIMIT ? combined.slice(-GATEWAY_CHILD_LOG_LIMIT) : combined;
}

function gatewayExitErrorMessage(exitCode, signal, stdoutText, stderrText) {
  const reason = signal ? `signal ${signal}` : `exit code ${exitCode ?? 'unknown'}`;
  const detail = [trimmed(stderrText), trimmed(stdoutText)].filter(Boolean).join('\n');
  return detail ? `Xenesis gateway exited with ${reason}: ${detail}` : `Xenesis gateway exited with ${reason}`;
}

export function createXenesisService({ spawnImpl = spawn, now = () => Date.now() } = {}) {
  let child = null;
  let status = {
    state: 'stopped',
    pid: null,
    url: '',
    host: '',
    port: 0,
    startedAt: null,
    stoppedAt: null,
    exitCode: null,
    signal: null,
    error: '',
  };

  function setStatus(update) {
    status = { ...status, ...update };
    return status;
  }

  return {
    getStatus() {
      return { ...status };
    },

    start(launch) {
      if (child) return { ...status };
      if (!launch?.ok) {
        const error = launch?.error || 'Xenesis launch options are not ready';
        setStatus({ state: 'error', pid: null, url: '', host: '', port: 0, error, stoppedAt: now() });
        return { ...status };
      }

      try {
        child = spawnImpl(launch.command, launch.args, {
          cwd: launch.cwd,
          env: launch.env,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        });
      } catch (error) {
        child = null;
        setStatus({
          state: 'error',
          pid: null,
          url: '',
          host: '',
          port: 0,
          stoppedAt: now(),
          error: error?.message || String(error),
        });
        return { ...status };
      }
      const launchedChild = child;
      let childStdout = '';
      let childStderr = '';

      setStatus({
        state: 'running',
        pid: launchedChild?.pid ?? null,
        url: launch.url || (launch.host && launch.port ? `http://${launch.host}:${launch.port}` : ''),
        host: launch.host || '',
        port: Number.isFinite(Number(launch.port)) ? Number(launch.port) : 0,
        startedAt: now(),
        stoppedAt: null,
        exitCode: null,
        signal: null,
        error: '',
      });

      launchedChild?.stdout?.on?.('data', (chunk) => {
        childStdout = appendLimitedOutput(childStdout, chunk);
      });

      launchedChild?.stderr?.on?.('data', (chunk) => {
        childStderr = appendLimitedOutput(childStderr, chunk);
      });

      launchedChild?.once?.('error', (error) => {
        if (child !== launchedChild) return;
        child = null;
        setStatus({
          state: 'error',
          pid: null,
          url: '',
          host: '',
          port: 0,
          stoppedAt: now(),
          error: error?.message || String(error),
        });
      });

      launchedChild?.once?.('exit', (exitCode, signal) => {
        if (child !== launchedChild) return;
        child = null;
        const failed = Number(exitCode || 0) !== 0 || Boolean(signal);
        setStatus({
          state: failed ? 'error' : 'stopped',
          pid: null,
          url: '',
          host: '',
          port: 0,
          stoppedAt: now(),
          exitCode,
          signal,
          error: failed ? gatewayExitErrorMessage(exitCode, signal, childStdout, childStderr) : '',
        });
      });

      return { ...status };
    },

    stop() {
      if (!child) {
        setStatus({ state: 'stopped', pid: null, url: '', host: '', port: 0, stoppedAt: status.stoppedAt || now() });
        return { ...status };
      }

      const current = child;
      child = null;
      try {
        current.kill?.();
        setStatus({
          state: 'stopped',
          pid: null,
          url: '',
          host: '',
          port: 0,
          stoppedAt: now(),
          error: '',
        });
      } catch (error) {
        setStatus({
          state: 'error',
          pid: null,
          url: '',
          host: '',
          port: 0,
          stoppedAt: now(),
          error: error?.message || String(error),
        });
      }
      return { ...status };
    },
  };
}
