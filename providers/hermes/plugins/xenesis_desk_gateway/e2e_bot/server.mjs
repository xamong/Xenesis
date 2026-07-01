import { spawn } from 'node:child_process';
import { existsSync, readFile, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const staticRoot = path.join(__dirname, 'static');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
]);

function parseArgs(argv) {
  const options = {
    host: process.env.XD_E2E_HOST || '127.0.0.1',
    port: Number(process.env.XD_E2E_PORT || 8765),
    python: process.env.XD_E2E_PYTHON || process.env.PYTHON || '',
    bridgeProfile: process.env.XD_E2E_BRIDGE_PROFILE || 'dev',
    bridgeStateFile: process.env.XD_E2E_BRIDGE_STATE_FILE || '',
    xenisHome: process.env.XD_E2E_XENIS_HOME || '',
    useEnvBridge: /^(1|true|yes)$/i.test(process.env.XD_E2E_USE_ENV_BRIDGE || ''),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--host' && argv[i + 1]) options.host = argv[++i];
    if (arg === '--port' && argv[i + 1]) options.port = Number(argv[++i]);
    if (arg === '--python' && argv[i + 1]) options.python = argv[++i];
    if (arg === '--bridge-profile' && argv[i + 1]) options.bridgeProfile = argv[++i];
    if (arg === '--bridge-state-file' && argv[i + 1]) options.bridgeStateFile = argv[++i];
    if (arg === '--xenis-home' && argv[i + 1]) options.xenisHome = argv[++i];
    if (arg === '--use-env-bridge') options.useEnvBridge = true;
  }
  return options;
}

function resolvePython(explicitPython) {
  if (explicitPython) return explicitPython;
  const candidates = [
    path.join(repoRoot, '.venv', 'Scripts', 'python.exe'),
    path.join(repoRoot, 'venv', 'Scripts', 'python.exe'),
    path.join(repoRoot, '.venv', 'bin', 'python'),
    path.join(repoRoot, 'venv', 'bin', 'python'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function readJsonFile(filePath) {
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function bridgeStateFromFile(filePath, source) {
  if (!filePath || !existsSync(filePath)) return null;
  const state = readJsonFile(filePath);
  if (!state.bridgeUrl && !state.url) return null;
  let modifiedAt = 0;
  try {
    modifiedAt = statSync(filePath).mtimeMs;
  } catch {
    modifiedAt = 0;
  }
  return {
    source,
    stateFile: filePath,
    xenisHome: path.dirname(path.dirname(filePath)),
    bridgeUrl: String(state.bridgeUrl || state.url || '').trim(),
    bridgeToken: String(state.bridgeToken || state.token || '').trim(),
    modifiedAt,
  };
}

function bridgeStateFromEnv(source = 'environment') {
  const stateFile = String(process.env.XENIS_MCP_STATE_FILE || process.env.XENESIS_MCP_STATE_FILE || '').trim();
  const fromStateFile = bridgeStateFromFile(stateFile, source);
  const bridgeUrl = String(
    process.env.XENIS_MCP_BRIDGE_URL || process.env.XENESIS_MCP_BRIDGE_URL || fromStateFile?.bridgeUrl || '',
  ).trim();
  if (!bridgeUrl) return fromStateFile;
  const bridgeToken = String(
    process.env.XENIS_MCP_BRIDGE_TOKEN || process.env.XENESIS_MCP_BRIDGE_TOKEN || fromStateFile?.bridgeToken || '',
  ).trim();
  const xenisHome = String(process.env.XENIS_HOME || process.env.XENESIS_HOME || fromStateFile?.xenisHome || '').trim();
  return {
    source,
    stateFile: stateFile || fromStateFile?.stateFile || '',
    xenisHome: xenisHome || (stateFile ? path.dirname(path.dirname(stateFile)) : ''),
    bridgeUrl,
    bridgeToken,
    modifiedAt: fromStateFile?.modifiedAt || 0,
  };
}

function userHomeCandidates() {
  return [
    ...new Set(
      [process.env.USERPROFILE, process.env.HOME, homedir()].filter(Boolean).map((item) => path.resolve(item)),
    ),
  ];
}

function bridgeStateCandidates(options) {
  if (options.bridgeStateFile) {
    return [bridgeStateFromFile(path.resolve(options.bridgeStateFile), 'explicit-state-file')].filter(Boolean);
  }
  if (options.xenisHome) {
    return [
      bridgeStateFromFile(path.join(path.resolve(options.xenisHome), 'mcp', 'bridge.json'), 'explicit-xenis-home'),
    ].filter(Boolean);
  }

  const candidates = [];
  const profile = String(options.bridgeProfile || 'dev').toLowerCase();
  for (const home of userHomeCandidates()) {
    const devState = path.join(home, '.xenis-dev', 'mcp', 'bridge.json');
    const releaseState = path.join(home, '.xenis', 'mcp', 'bridge.json');
    if (profile === 'release') {
      candidates.push(bridgeStateFromFile(releaseState, 'release-profile'));
      candidates.push(bridgeStateFromFile(devState, 'release-fallback-dev'));
    } else if (profile === 'auto') {
      candidates.push(bridgeStateFromFile(devState, 'auto-dev'));
      candidates.push(bridgeStateFromFile(releaseState, 'auto-release'));
    } else {
      candidates.push(bridgeStateFromFile(devState, 'dev-profile'));
      candidates.push(bridgeStateFromFile(releaseState, 'dev-fallback-release'));
    }
  }
  return candidates.filter(Boolean);
}

function firstProfileBridgeState(profile) {
  const candidates = bridgeStateCandidates({ ...options, bridgeProfile: profile, bridgeStateFile: '', xenisHome: '' });
  return candidates[0] || null;
}

function bridgePort(bridgeUrl) {
  try {
    return new URL(bridgeUrl).port || '';
  } catch {
    return '';
  }
}

function redactBridgeState(state) {
  if (!state) return null;
  return {
    source: state.source || '',
    stateFile: state.stateFile || '',
    xenisHome: state.xenisHome || '',
    bridgeUrl: state.bridgeUrl || '',
    bridgePort: bridgePort(state.bridgeUrl),
    hasToken: Boolean(state.bridgeToken),
    modifiedAt: state.modifiedAt || 0,
  };
}

function makeBridgeChoice(id, label, state, hint = '') {
  if (!state) return null;
  const port = bridgePort(state.bridgeUrl);
  return {
    id,
    label: port ? `${port} · ${label}` : label,
    hint,
    activeLabel: label,
    ...redactBridgeState(state),
    state,
  };
}

function bridgeChoiceCandidates() {
  const choices = [
    makeBridgeChoice(
      'profile:dev',
      'DEV bridge (.xenis-dev)',
      firstProfileBridgeState('dev'),
      'Usually Xenesis Desk DEV on 3848',
    ),
    makeBridgeChoice(
      'profile:release',
      'Release bridge (.xenis)',
      firstProfileBridgeState('release'),
      'Usually packaged Desk or release bridge',
    ),
    makeBridgeChoice('environment', 'Environment bridge', bridgeStateFromEnv(), 'Inherited XENIS_MCP_BRIDGE_URL/token'),
  ].filter(Boolean);
  const seen = new Set();
  return choices.filter((choice) => {
    const key = choice.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function findBridgeChoice(selection) {
  const value = String(selection || '').trim();
  const choices = bridgeChoiceCandidates();
  const exact = choices.find((choice) => choice.id === value);
  if (exact) return exact;
  if (/^port:\d+$/.test(value)) {
    const port = value.slice('port:'.length);
    return choices.find((choice) => choice.bridgePort === port) || null;
  }
  if (/^\d+$/.test(value)) {
    return choices.find((choice) => choice.bridgePort === value) || null;
  }
  return null;
}

function resolveBridgeState(options) {
  if (options.useEnvBridge) return null;
  const candidates = bridgeStateCandidates(options);
  if (String(options.bridgeProfile || '').toLowerCase() === 'auto') {
    return candidates.sort((a, b) => b.modifiedAt - a.modifiedAt)[0] || null;
  }
  return candidates[0] || null;
}

function buildWorkerEnv(bridgeState) {
  const env = {
    ...process.env,
    PYTHONUTF8: process.env.PYTHONUTF8 || '1',
    PYTHONIOENCODING: process.env.PYTHONIOENCODING || 'utf-8',
  };
  if (!bridgeState) return env;
  env.XENIS_HOME = bridgeState.xenisHome;
  env.XENESIS_HOME = bridgeState.xenisHome;
  env.XENIS_MCP_STATE_FILE = bridgeState.stateFile;
  env.XENESIS_MCP_STATE_FILE = bridgeState.stateFile;
  env.XENIS_MCP_BRIDGE_URL = bridgeState.bridgeUrl;
  env.XENESIS_MCP_BRIDGE_URL = bridgeState.bridgeUrl;
  env.XENIS_MCP_BRIDGE_TOKEN = bridgeState.bridgeToken;
  env.XENESIS_MCP_BRIDGE_TOKEN = bridgeState.bridgeToken;
  return env;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

class WorkerClient {
  constructor(pythonCommand, bridgeState) {
    this.pythonCommand = pythonCommand;
    this.bridgeState = bridgeState;
    this.worker = null;
    this.readline = null;
    this.nextId = 1;
    this.pending = new Map();
    this.logs = [];
  }

  appendLog(line) {
    const text = String(line || '').trimEnd();
    if (!text) return;
    this.logs.push(text);
    if (this.logs.length > 200) this.logs.shift();
  }

  stop(reason = 'bridge changed') {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
    if (this.worker && !this.worker.killed && this.worker.exitCode === null) {
      this.worker.kill();
    }
    this.worker = null;
    for (const [, item] of this.pending) {
      clearTimeout(item.timer);
      item.reject(new Error(`XD E2E worker stopped: ${reason}`));
    }
    this.pending.clear();
  }

  setBridgeState(bridgeState) {
    this.stop('bridge target changed');
    this.bridgeState = bridgeState;
    this.appendLog(`bridge target changed to ${bridgeState?.bridgeUrl || 'environment'}`);
  }

  start() {
    if (this.worker && !this.worker.killed && this.worker.exitCode === null) return;
    const workerPath = path.join(__dirname, 'worker.py');
    this.worker = spawn(this.pythonCommand, [workerPath], {
      cwd: repoRoot,
      env: buildWorkerEnv(this.bridgeState),
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const child = this.worker;
    this.readline = createInterface({ input: this.worker.stdout });
    this.readline.on('line', (line) => {
      if (this.worker === child) this.handleLine(line);
    });
    this.worker.stderr.on('data', (chunk) => this.appendLog(chunk.toString('utf8')));
    this.worker.on('exit', (code, signal) => {
      if (this.worker !== child) {
        this.appendLog(`old worker exited code=${code ?? ''} signal=${signal ?? ''}`);
        return;
      }
      this.appendLog(`worker exited code=${code ?? ''} signal=${signal ?? ''}`);
      for (const [, item] of this.pending) {
        clearTimeout(item.timer);
        item.reject(new Error('XD E2E worker exited before responding'));
      }
      this.pending.clear();
    });
  }

  handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.appendLog(`invalid worker JSON: ${line}`);
      return;
    }
    const id = String(message.id ?? '');
    const item = this.pending.get(id);
    if (!item) return;
    clearTimeout(item.timer);
    this.pending.delete(id);
    item.resolve(message);
  }

  request(payload, timeoutMs = 20000) {
    this.start();
    const id = String(this.nextId++);
    const message = { id, ...payload };
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('XD E2E worker timeout'));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.worker.stdin.write(`${JSON.stringify(message)}\n`, 'utf8', (error) => {
        if (!error) return;
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      });
    });
  }
}

const options = parseArgs(process.argv.slice(2));
const pythonCommand = resolvePython(options.python);
let activeBridgeState = resolveBridgeState(options);
let activeBridgeSelection = options.useEnvBridge
  ? 'environment'
  : `profile:${String(options.bridgeProfile || 'dev').toLowerCase()}`;
const worker = new WorkerClient(pythonCommand, activeBridgeState);

function bridgeApiPayload() {
  const choices = bridgeChoiceCandidates().map(({ state, ...choice }) => choice);
  return {
    ok: true,
    activeSelection: activeBridgeSelection,
    active: redactBridgeState(activeBridgeState),
    choices,
  };
}

function sameBridgeState(left, right) {
  return (
    String(left?.bridgeUrl || '') === String(right?.bridgeUrl || '') &&
    String(left?.bridgeToken || '') === String(right?.bridgeToken || '') &&
    String(left?.stateFile || '') === String(right?.stateFile || '') &&
    String(left?.xenisHome || '') === String(right?.xenisHome || '')
  );
}

function refreshActiveBridgeState(reason = 'bridge state refreshed') {
  if (!activeBridgeSelection) return;
  const choice = findBridgeChoice(activeBridgeSelection);
  if (!choice?.state || sameBridgeState(choice.state, activeBridgeState)) return;
  activeBridgeState = choice.state;
  worker.setBridgeState(activeBridgeState, reason);
}

async function handleApi(req, res, pathname) {
  try {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && pathname === '/api/health') {
      refreshActiveBridgeState('health bridge refresh');
      const health = await worker.request({ method: 'health' }, 5000);
      sendJson(res, 200, {
        ok: true,
        node: {
          host: options.host,
          port: options.port,
          python: pythonCommand,
          repoRoot,
          bridgeProfile: options.bridgeProfile,
          bridgeSelection: activeBridgeSelection,
          bridgeStateFile: activeBridgeState?.stateFile || '',
          bridgeStateSource: activeBridgeState?.source || (options.useEnvBridge ? 'environment' : ''),
        },
        worker: health,
        logs: worker.logs.slice(-40),
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/bridge') {
      refreshActiveBridgeState('bridge api refresh');
      sendJson(res, 200, bridgeApiPayload());
      return;
    }

    if (req.method === 'POST' && pathname === '/api/bridge') {
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      const choice = findBridgeChoice(payload.selection);
      if (!choice) {
        sendJson(res, 400, {
          ok: false,
          error: `Unknown bridge selection: ${payload.selection || ''}`,
          ...bridgeApiPayload(),
        });
        return;
      }
      activeBridgeSelection = choice.id;
      activeBridgeState = choice.state;
      worker.setBridgeState(activeBridgeState);
      sendJson(res, 200, bridgeApiPayload());
      return;
    }

    if (req.method === 'POST' && pathname === '/api/reset') {
      refreshActiveBridgeState('reset bridge refresh');
      const response = await worker.request({ method: 'reset' }, 5000);
      sendJson(res, response.ok ? 200 : 500, { ok: response.ok, response });
      return;
    }

    if (req.method === 'GET' && pathname === '/api/poll') {
      refreshActiveBridgeState('poll bridge refresh');
      const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
      const response = await worker.request(
        {
          method: 'poll',
          sessionKey: url.searchParams.get('sessionKey') || undefined,
        },
        5000,
      );
      sendJson(res, response.ok ? 200 : 500, response);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/send') {
      refreshActiveBridgeState('send bridge refresh');
      const body = await readBody(req);
      const payload = body ? JSON.parse(body) : {};
      const text = String(payload.text || '');
      if (!text.trim()) {
        sendJson(res, 400, { ok: false, error: 'text is required' });
        return;
      }
      const response = await worker.request(
        {
          method: 'send',
          text,
          sessionKey: payload.sessionKey,
          platform: payload.platform,
          userId: payload.userId,
          userName: payload.userName,
          chatId: payload.chatId,
          chatName: payload.chatName,
          messageId: payload.messageId,
          simulator: payload.simulator,
          xenesis_desk: payload.xenesis_desk,
          xd: payload.xd,
          xenis: payload.xenis,
          gatewayUrl: payload.gatewayUrl,
          gatewayToken: payload.gatewayToken,
          workflow: payload.workflow,
          gatewayTimeoutMs: payload.gatewayTimeoutMs,
        },
        Number(payload.gatewayTimeoutMs) || 60000,
      );
      sendJson(res, response.ok ? 200 : 500, response);
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Unknown API route' });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message, logs: worker.logs.slice(-40) });
  }
}

function serveStatic(_req, res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(staticRoot, relativePath);
  if (!filePath.startsWith(staticRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'content-type': mimeTypes.get(path.extname(filePath)) || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  if (url.pathname.startsWith('/api/')) {
    void handleApi(req, res, url.pathname);
    return;
  }
  serveStatic(req, res, decodeURIComponent(url.pathname));
});

server.listen(options.port, options.host, () => {
  console.log(`Xenesis Desk E2E bot: http://${options.host}:${options.port}`);
  console.log(`Python worker: ${pythonCommand}`);
  console.log(
    `Desk bridge: ${activeBridgeState ? `${activeBridgeState.bridgeUrl} (${activeBridgeState.source})` : 'environment'}`,
  );
});
