#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:3847';
const DEFAULT_DEV_BRIDGE_URL = 'http://127.0.0.1:3848';
const DEFAULT_TRACE_CAPTURE_WAIT_MS = 15000;
const DEFAULT_TRACE_CAPTURE_POLL_MS = 1000;
const MAX_TRACE_CAPTURE_WAIT_MS = 300000;
const MAX_TRACE_CAPTURE_POLL_MS = 60000;

let cliBridgeTarget = '';
let cliAutoApprove = false;

function normalizeBridgeTarget(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();
  if (['dev', 'development'].includes(normalized)) return 'dev';
  if (['release', 'prod', 'production', 'packaged'].includes(normalized)) return 'release';
  return '';
}

function userHomeDir() {
  return process.env.USERPROFILE || process.env.HOME || '';
}

function defaultStateFileForTarget(target) {
  const home = userHomeDir();
  if (!home) return '';
  if (target === 'dev') return path.join(home, '.xenis-dev', 'mcp', 'bridge.json');
  if (target === 'release') return path.join(home, '.xenis', 'mcp', 'bridge.json');
  return '';
}

function bridgeTarget() {
  return cliBridgeTarget || normalizeBridgeTarget(process.env.XENIS_TARGET || process.env.XENIS_TARGET || '');
}

function resolveStateFilePath() {
  const target = bridgeTarget();
  if (target) {
    const home = String(process.env.XENIS_HOME || '').trim();
    if (home) return path.join(home, 'mcp', 'bridge.json');

    const explicitStateFile = String(process.env.XENIS_MCP_STATE_FILE || '').trim();
    const targetHomeName = target === 'dev' ? '.xenis-dev' : '.xenis';
    if (explicitStateFile && explicitStateFile.includes(targetHomeName)) {
      return explicitStateFile;
    }

    return defaultStateFileForTarget(target);
  }

  const explicitStateFile = String(process.env.XENIS_MCP_STATE_FILE || '').trim();
  if (explicitStateFile) return explicitStateFile;

  const home = String(process.env.XENIS_HOME || '').trim();
  if (home) return path.join(home, 'mcp', 'bridge.json');

  return defaultStateFileForTarget(bridgeTarget());
}

function readStateFile() {
  const stateFile = resolveStateFilePath();
  if (!stateFile || !fs.existsSync(stateFile)) return {};
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch {
    return {};
  }
}

function bridgeConfig() {
  const state = readStateFile();
  const target = bridgeTarget();
  const targetDefaultUrl = target === 'dev' ? DEFAULT_DEV_BRIDGE_URL : DEFAULT_BRIDGE_URL;
  const envBridgeUrl = String(process.env.XENIS_MCP_BRIDGE_URL || '');
  const stateBridgeUrl = String(state.bridgeUrl || '');
  const envBridgeToken = String(process.env.XENIS_MCP_BRIDGE_TOKEN || '');
  const stateBridgeToken = String(state.bridgeToken || '');
  const bridgeUrl = target
    ? stateBridgeUrl || envBridgeUrl || targetDefaultUrl
    : envBridgeUrl || stateBridgeUrl || DEFAULT_BRIDGE_URL;
  const bridgeToken = target ? stateBridgeToken || envBridgeToken : envBridgeToken || stateBridgeToken;
  return {
    bridgeUrl: bridgeUrl.replace(/\/+$/, ''),
    bridgeToken,
    botInputUrl: String(process.env.XENIS_BOT_INPUT_URL || state.botInputUrl || ''),
  };
}

function botSessionsFilePath() {
  if (process.env.XENIS_BOT_SESSIONS_FILE) {
    return path.resolve(process.env.XENIS_BOT_SESSIONS_FILE);
  }
  const stateFile = resolveStateFilePath();
  if (stateFile) {
    return path.join(path.dirname(path.resolve(stateFile)), 'bot-sessions.json');
  }
  const home = process.env.USERPROFILE || process.env.HOME || '';
  return home ? path.join(home, '.xenis', 'mcp', 'bot-sessions.json') : '';
}

function readBotSessionsFileSnapshot() {
  const filePath = botSessionsFilePath();
  if (!filePath || !fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const sessions = Array.isArray(parsed) ? parsed : parsed?.sessions;
    if (!Array.isArray(sessions)) return null;
    const firstInputUrl =
      sessions
        .map((session) => (session && typeof session.inputUrl === 'string' ? session.inputUrl.trim() : ''))
        .find(Boolean) || '';
    return {
      ok: true,
      botInputUrl: firstInputUrl,
      botSessions: sessions,
    };
  } catch {
    return null;
  }
}

async function callBridge(route, body = {}) {
  const { bridgeUrl, bridgeToken } = bridgeConfig();
  const response = await fetch(`${bridgeUrl}${route}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(bridgeToken ? { authorization: `Bearer ${bridgeToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { ok: false, text };
  }
  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

async function sendBotMessage(text, options = {}) {
  const botInputUrl = await resolveBotInputUrl(options.state);
  const xenesisDesk = {
    surface: 'cli',
    mode: 'visual-cockpit',
    artifactFormats: ['markdown', 'xcon', 'xcon-sketch'],
  };
  if (!botInputUrl) {
    return callBridge('/bot/message', {
      sessionId: 'xenesis-bot',
      messageId: `xd-cli-${Date.now().toString(36)}`,
      role: 'user',
      content: text,
      source: 'XD CLI',
      xenesis_desk: xenesisDesk,
    });
  }
  const response = await fetch(botInputUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'xenesis-bot',
      text,
      userId: 'xd-cli',
      userName: 'XD CLI',
      xenesis_desk: xenesisDesk,
    }),
  });
  if (!response.ok) throw new Error(`Bot send failed: HTTP ${response.status}`);
  return { ok: true };
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBotInputUrl(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const direct = typeof value.botInputUrl === 'string' ? value.botInputUrl.trim() : '';
  if (direct) return direct;
  const sessions = Array.isArray(value.botSessions) ? value.botSessions : [];
  for (const session of sessions) {
    if (!session || typeof session !== 'object' || Array.isArray(session)) continue;
    const inputUrl = typeof session.inputUrl === 'string' ? session.inputUrl.trim() : '';
    if (inputUrl) return inputUrl;
  }
  return '';
}

async function resolveBotInputUrl(state) {
  const { botInputUrl } = bridgeConfig();
  if (botInputUrl) return botInputUrl;
  const fromState = extractBotInputUrl(state);
  if (fromState) return fromState;
  try {
    const fromBridge = extractBotInputUrl(await callBridge('/state', {}));
    if (fromBridge) return fromBridge;
  } catch {
    // Fall through to the persisted session fallback for older running apps.
  }
  return extractBotInputUrl(readBotSessionsFileSnapshot());
}

function latestAssistantMarkerFromState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const sessions = Array.isArray(value.botSessions) ? value.botSessions : [];
  let latest = null;
  for (const session of sessions) {
    if (!session || typeof session !== 'object' || Array.isArray(session)) continue;
    const sessionId = typeof session.id === 'string' ? session.id : '';
    const sessionUpdatedAt = typeof session.updatedAt === 'string' ? session.updatedAt : '';
    const messages = Array.isArray(session.messages) ? session.messages : [];
    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      if (!message || typeof message !== 'object' || Array.isArray(message)) continue;
      if (message.role !== 'assistant') continue;
      const updatedAt = typeof message.updatedAt === 'string' ? message.updatedAt : sessionUpdatedAt;
      const createdAt = typeof message.createdAt === 'string' ? message.createdAt : '';
      const orderKey = updatedAt || sessionUpdatedAt || createdAt || String(index).padStart(6, '0');
      const kind = classifyAssistantMessage(message);
      if (kind === 'progress') continue;
      const marker = {
        sessionId,
        messageId: typeof message.id === 'string' ? message.id : '',
        updatedAt,
        orderKey,
        contentLength: typeof message.content === 'string' ? message.content.length : 0,
        kind,
        streaming: Boolean(message.streaming),
      };
      if (!latest || marker.orderKey > latest.orderKey) {
        latest = marker;
      }
    }
  }
  return latest;
}

function classifyAssistantMessage(message) {
  const content = typeof message?.content === 'string' ? message.content.trim() : '';
  if (message?.approvalUi || /^\*\*Approval required\*\*/i.test(content) || /Approval required/i.test(content)) {
    return 'approval';
  }
  if (
    /^⏳\s*Working\b/i.test(content) ||
    /^⚙️\s*/u.test(content) ||
    /^📚\s*skill_view\b/i.test(content) ||
    /^Need\b/i.test(content) ||
    /^✅\s*Command approved/i.test(content) ||
    /^💾\s*Self-improvement review\b/i.test(content)
  ) {
    return 'progress';
  }
  return 'final';
}

function assistantMarkerChanged(marker, baseline) {
  if (!marker) return false;
  if (!baseline) return true;
  return (
    marker.sessionId !== baseline.sessionId ||
    marker.messageId !== baseline.messageId ||
    marker.updatedAt !== baseline.updatedAt ||
    marker.contentLength !== baseline.contentLength ||
    marker.kind !== baseline.kind ||
    marker.streaming !== baseline.streaming
  );
}

function publicAssistantMarker(marker) {
  if (!marker) return null;
  return {
    sessionId: marker.sessionId,
    messageId: marker.messageId,
    updatedAt: marker.updatedAt,
    contentLength: marker.contentLength,
    kind: marker.kind,
    streaming: marker.streaming,
  };
}

function latestAssistantMarkerFromSources(state) {
  const stateMarker = latestAssistantMarkerFromState(state);
  if (stateMarker) return { marker: stateMarker, source: 'state' };
  const fileMarker = latestAssistantMarkerFromState(readBotSessionsFileSnapshot());
  if (fileMarker) return { marker: fileMarker, source: 'file' };
  return { marker: null, source: 'none' };
}

function parseGlobalArgs(argv) {
  const rest = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dev') {
      cliBridgeTarget = 'dev';
      continue;
    }
    if (arg === '--auto-approve') {
      cliAutoApprove = true;
      continue;
    }
    if (arg === '--release') {
      cliBridgeTarget = 'release';
      continue;
    }
    if (arg === '--target') {
      const value = argv[index + 1] || '';
      cliBridgeTarget = normalizeBridgeTarget(value);
      index += 1;
      continue;
    }
    if (arg.startsWith('--target=')) {
      cliBridgeTarget = normalizeBridgeTarget(arg.slice('--target='.length));
      continue;
    }
    rest.push(...argv.slice(index));
    break;
  }
  return rest;
}

async function waitForBotFinal(options) {
  const startedAt = Date.now();
  const deadlineAt = startedAt + options.maxWaitMs;
  let polls = 0;
  let latest = null;
  let source = 'none';

  do {
    polls += 1;
    const state = await callBridge('/state', {});
    const candidate = latestAssistantMarkerFromSources(state);
    latest = candidate.marker;
    source = candidate.source;
    if (assistantMarkerChanged(latest, options.baseline) && latest.kind === 'approval') {
      return {
        completed: false,
        reason: 'approval',
        source,
        polls,
        waitedMs: Date.now() - startedAt,
        latestAssistant: publicAssistantMarker(latest),
      };
    }
    if (assistantMarkerChanged(latest, options.baseline) && latest.streaming === false) {
      return {
        completed: true,
        reason: 'final',
        source,
        polls,
        waitedMs: Date.now() - startedAt,
        latestAssistant: publicAssistantMarker(latest),
      };
    }
    const remainingMs = deadlineAt - Date.now();
    if (remainingMs <= 0) break;
    await delay(Math.min(options.pollMs, remainingMs));
  } while (Date.now() < deadlineAt);

  return {
    completed: false,
    reason: 'timeout',
    source,
    polls,
    waitedMs: Date.now() - startedAt,
    latestAssistant: publicAssistantMarker(latest),
  };
}

function parseRunArgs(args) {
  let shell = process.env.XENIS_SHELL || 'powershell';
  let cwd = process.cwd();
  const commandParts = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--shell' && args[i + 1]) {
      shell = args[++i];
      continue;
    }
    if (arg === '--cwd' && args[i + 1]) {
      cwd = path.resolve(args[++i]);
      continue;
    }
    if (arg === '--') {
      commandParts.push(...args.slice(i + 1));
      break;
    }
    commandParts.push(arg);
  }
  return { shell, cwd, command: commandParts.join(' ').trim() };
}

function parseTraceArgs(args) {
  const [mode = 'status', ...rest] = args;
  const payload = {};
  const scopes = [];
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--clear') {
      payload.clear = true;
      continue;
    }
    if ((arg === '--setting' || arg === '--scope' || arg === '--scopes') && rest[i + 1]) {
      payload.setting = rest[++i];
      continue;
    }
    scopes.push(arg);
  }

  if (mode === 'on' || mode === 'enable') {
    payload.enabled = true;
    payload.setting = payload.setting || scopes.join(' ').trim() || 'xdbot markdown-xcon';
  } else if (mode === 'off' || mode === 'disable') {
    payload.enabled = false;
  } else if (mode === 'clear' || mode === 'reset') {
    payload.clear = true;
  } else if (mode !== 'status' && mode !== 'read') {
    throw new Error('Usage: xd trace [status|on|off|clear|capture] [scope...] [--clear]');
  }

  return payload;
}

function parseTraceCaptureArgs(args) {
  let clear = true;
  let keepOn = false;
  let setting = 'xdbot markdown-xcon';
  let waitMs = DEFAULT_TRACE_CAPTURE_WAIT_MS;
  let untilFinal = false;
  let pollMs = DEFAULT_TRACE_CAPTURE_POLL_MS;
  let maxWaitMs = MAX_TRACE_CAPTURE_WAIT_MS;
  const messageParts = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--') {
      messageParts.push(...args.slice(i + 1));
      break;
    }
    if (arg === '--clear') {
      clear = true;
      continue;
    }
    if (arg === '--no-clear') {
      clear = false;
      continue;
    }
    if (arg === '--keep-on') {
      keepOn = true;
      continue;
    }
    if (arg === '--until-final' || arg === '--wait-for-final') {
      untilFinal = true;
      continue;
    }
    if (arg === '--no-until-final') {
      untilFinal = false;
      continue;
    }
    if (arg === '--wait-ms') {
      const value = args[++i];
      if (!value)
        throw new Error(
          'Usage: xd trace capture [--wait-ms 15000] [--until-final] [--keep-on] [--scope ...] -- <message>',
        );
      waitMs = Number(value);
      continue;
    }
    if (arg === '--poll-ms') {
      const value = args[++i];
      if (!value)
        throw new Error('Usage: xd trace capture --until-final [--poll-ms 1000] [--max-wait-ms 300000] -- <message>');
      pollMs = Number(value);
      continue;
    }
    if (arg === '--max-wait-ms') {
      const value = args[++i];
      if (!value)
        throw new Error('Usage: xd trace capture --until-final [--poll-ms 1000] [--max-wait-ms 300000] -- <message>');
      maxWaitMs = Number(value);
      continue;
    }
    if (arg === '--setting' || arg === '--scope' || arg === '--scopes') {
      const value = args[++i];
      if (!value)
        throw new Error(
          'Usage: xd trace capture [--wait-ms 15000] [--until-final] [--keep-on] [--scope ...] -- <message>',
        );
      setting = value.trim() || setting;
      continue;
    }
    messageParts.push(arg);
  }

  if (!Number.isFinite(waitMs) || waitMs < 0 || waitMs > MAX_TRACE_CAPTURE_WAIT_MS) {
    throw new Error(`Usage: xd trace capture --wait-ms <0..${MAX_TRACE_CAPTURE_WAIT_MS}> -- <message>`);
  }
  if (!Number.isFinite(pollMs) || pollMs < 1 || pollMs > MAX_TRACE_CAPTURE_POLL_MS) {
    throw new Error(`Usage: xd trace capture --poll-ms <1..${MAX_TRACE_CAPTURE_POLL_MS}> -- <message>`);
  }
  if (!Number.isFinite(maxWaitMs) || maxWaitMs < 0 || maxWaitMs > MAX_TRACE_CAPTURE_WAIT_MS) {
    throw new Error(`Usage: xd trace capture --max-wait-ms <0..${MAX_TRACE_CAPTURE_WAIT_MS}> -- <message>`);
  }

  const message = messageParts.join(' ').trim();
  if (!message) {
    throw new Error('Usage: xd trace capture [--wait-ms 15000] [--until-final] [--keep-on] [--scope ...] -- <message>');
  }

  return {
    clear,
    keepOn,
    maxWaitMs: Math.round(maxWaitMs),
    message,
    pollMs: Math.round(pollMs),
    setting,
    untilFinal,
    waitMs: Math.round(waitMs),
  };
}

function normalizeTraceError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/not found|http 404/i.test(message)) {
    return new Error(
      [
        'Xenesis Desk renderer performance trace endpoint is not available.',
        'Build, release/restart Xenesis Desk, and confirm the running app includes /renderer-performance-trace support.',
      ].join('\n'),
    );
  }
  return error instanceof Error ? error : new Error(message);
}

async function commandState() {
  printJson(await callBridge('/state', {}));
}

async function commandOpen(args) {
  const filePath = args[0] ? path.resolve(args[0]) : '';
  if (!filePath) throw new Error('Usage: xd open <path> [placement]');
  printJson(await callBridge('/open-file', { filePath, placement: args[1] || 'tab' }));
}

async function commandRun(args) {
  const parsed = parseRunArgs(args);
  if (!parsed.command) throw new Error('Usage: xd run [--shell powershell|cmd|pwsh|wsl] [--cwd path] -- <command>');
  printJson(await callBridge('/terminal/run', parsed));
}

async function commandTail(args) {
  const id = args[0] || '';
  const lines = Number(args[1] || 200);
  if (!id) throw new Error('Usage: xd tail <terminalId> [lines]');
  printJson(await callBridge('/terminal/tail', { id, lines }));
}

function collectionValues(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  return Object.values(value);
}

function normalizeCliOptionKey(value) {
  return String(value || '')
    .replace(/^-+/, '')
    .replace(/-([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
}

function parseNamedOptions(args, allowedKeys) {
  const opts = {};
  const allowed = new Set(allowedKeys);
  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || '');
    if (!token.startsWith('--')) continue;

    const equalsIndex = token.indexOf('=');
    const rawKey = equalsIndex >= 0 ? token.slice(2, equalsIndex) : token.slice(2);
    const key = normalizeCliOptionKey(rawKey);
    let value = '';
    if (equalsIndex >= 0) {
      value = token.slice(equalsIndex + 1);
    } else if (index + 1 < args.length && !String(args[index + 1] || '').startsWith('--')) {
      value = args[index + 1];
      index += 1;
    }

    let outputKey = '';
    if (key === 'term' || key === 'termId' || key === 'id') outputKey = 'termId';
    else if (allowed.has(key)) outputKey = key;
    if (outputKey) opts[outputKey] = value;
  }
  return opts;
}

function terminalIdFromContent(content) {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return '';
  if (content.contentType !== 'terminal' && content.kind !== 'terminal' && content.type !== 'terminal') return '';
  return String(content.termId || content.terminalId || '').trim();
}

function terminalIdFromSession(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) return '';
  return String(session.id || session.termId || session.terminalId || '').trim();
}

function terminalImageTargetIdFromState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return '';

  const activeTerminal = state.activeContext?.activeTerminal || state.activeTerminal;
  const activeTerminalId = terminalIdFromSession(activeTerminal);
  if (activeTerminalId) return activeTerminalId;

  const rendererState = state.rendererState || {};
  const panes = collectionValues(rendererState.panes);
  const contents = collectionValues(rendererState.contents);
  const activePane = panes.find((pane) => pane && pane.id === rendererState.activePaneId);
  const activeContentId = String(activePane?.activeContentId || activePane?.activeContent?.id || '').trim();
  const activeContent = contents.find((content) => content && content.id === activeContentId);
  const activeContentTermId = terminalIdFromContent(activeContent);
  if (activeContentTermId) return activeContentTermId;

  for (const content of contents) {
    const termId = terminalIdFromContent(content);
    if (termId) return termId;
  }

  for (const sessionList of [
    state.terminals,
    state.terminalSessions,
    rendererState.terminals,
    rendererState.terminalSessions,
  ]) {
    for (const session of collectionValues(sessionList)) {
      const termId = terminalIdFromSession(session);
      if (termId) return termId;
    }
  }

  return '';
}

async function withResolvedTerminalImageTarget(opts) {
  if (opts.termId) return opts;
  try {
    const termId = terminalImageTargetIdFromState(await callBridge('/state', {}));
    return termId ? { ...opts, termId } : opts;
  } catch {
    return opts;
  }
}

async function commandImage(args) {
  const source = args[0] || '';
  if (source === '--help' || source === '-h') return printImageHelp();
  if (!source) throw new Error('Usage: xd image <file-or-url> [--term-id id] [--width=80%] [--height=auto]');
  const opts = await withResolvedTerminalImageTarget(parseNamedOptions(args.slice(1), ['width', 'height']));
  if (source.startsWith('http://') || source.startsWith('https://')) {
    printJson(await callCapability('xd.terminals.image.show', { source, ...opts }, true));
  } else {
    const resolved = path.resolve(source);
    printJson(await callCapability('xd.terminals.image.show', { source: resolved, ...opts }, true));
  }
}

async function commandXconImage(args) {
  const source = args[0] || '';
  if (source === '--help' || source === '-h') return printXconImageHelp();
  if (!source)
    throw new Error(
      'Usage: xd xcon-image <file-or-inline> [--term-id id] [--width=80%] [--height=auto] [--theme=light|dark] [--title text]',
    );
  const opts = await withResolvedTerminalImageTarget(
    parseNamedOptions(args.slice(1), ['width', 'height', 'theme', 'title']),
  );
  let xcon;
  if (fs.existsSync(path.resolve(source))) {
    xcon = fs.readFileSync(path.resolve(source), 'utf8');
  } else {
    xcon = source;
  }
  printJson(await callCapability('xd.terminals.image.showXcon', { xcon, ...opts }, true));
}

async function commandTrace(args) {
  if (args[0] === 'capture') {
    return commandTraceCapture(args.slice(1));
  }

  try {
    printJson(await callBridge('/renderer-performance-trace', parseTraceArgs(args)));
  } catch (error) {
    throw normalizeTraceError(error);
  }
}

async function commandTraceCapture(args) {
  const parsed = parseTraceCaptureArgs(args);
  let baselineState = null;
  let baselineAssistant = null;
  let traceEnabled = false;
  let started = null;
  let bot = null;
  let trace = null;
  let stopped = null;
  let wait = null;

  try {
    started = await callBridge('/renderer-performance-trace', {
      enabled: true,
      setting: parsed.setting,
      ...(parsed.clear ? { clear: true } : {}),
    });
    traceEnabled = true;
    if (parsed.untilFinal) {
      baselineState = await callBridge('/state', {});
      baselineAssistant = latestAssistantMarkerFromSources(baselineState).marker;
    }
    bot = await sendBotMessage(parsed.message, { state: baselineState });
    if (parsed.untilFinal) {
      wait = await waitForBotFinal({
        baseline: baselineAssistant,
        maxWaitMs: parsed.maxWaitMs,
        pollMs: parsed.pollMs,
      });
    } else if (parsed.waitMs > 0) {
      await delay(parsed.waitMs);
    }
    trace = await callBridge('/renderer-performance-trace', {});
    if (!parsed.keepOn) {
      stopped = await callBridge('/renderer-performance-trace', { enabled: false });
      traceEnabled = false;
    }
  } catch (error) {
    if (traceEnabled && !parsed.keepOn) {
      try {
        await callBridge('/renderer-performance-trace', { enabled: false });
      } catch {
        // Preserve the original failure; the capture command is diagnostic glue.
      }
    }
    throw normalizeTraceError(error);
  }

  printJson({
    ok: true,
    capture: {
      message: parsed.message,
      waitMs: parsed.waitMs,
      setting: parsed.setting,
      clear: parsed.clear,
      keepOn: parsed.keepOn,
      maxWaitMs: parsed.maxWaitMs,
      pollMs: parsed.pollMs,
      untilFinal: parsed.untilFinal,
    },
    started,
    bot,
    wait,
    trace,
    stopped,
  });
}

async function commandAi(args) {
  const text = args.join(' ').trim();
  if (!text) throw new Error('Usage: xd ai <message>');
  printJson(await sendBotMessage(text));
}

function printImageHelp() {
  process.stdout.write(`Usage: xd image <file-or-url> [--term-id id] [--width=80%] [--height=auto]

Display a PNG, JPEG, GIF, or WebP image inside a Xenesis Desk terminal.
When --term-id is omitted, the CLI asks the running Desk bridge for the active terminal first.

Options:
  --term-id <id>     Target a specific terminal id. Aliases: --term, --id, --termId.
  --width <value>    Inline image width, for example 80%, 60%, or 600px.
  --height <value>   Inline image height, usually auto.

Examples:
  xd --dev image "<workspace-root>/sample-image.png" --width=80% --height=auto
  xd image https://example.test/image.png --term-id term-123
`);
}

function printXconImageHelp() {
  process.stdout.write(`Usage: xd xcon-image <file-or-inline> [--term-id id] [--width=80%] [--height=auto] [--theme=light|dark] [--title text]

Render XCON/SKETCH markup as an image and display it inside a Xenesis Desk terminal.
The first argument can be a file path or a quoted inline snippet.

Options:
  --term-id <id>     Target a specific terminal id. Aliases: --term, --id, --termId.
  --width <value>    Inline image width, for example 80%, 60%, or 600px.
  --height <value>   Inline image height, usually auto.
  --theme <value>    Render theme, light or dark.
  --title <text>     Optional image title.

Examples:
  xd --dev xcon-image ".\\artifact.xcon.md" --theme=dark --title=Preview
  xd xcon-image "# Demo" --width=80%
`);
}

function parseJsonArgs(value, usage) {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${usage}\nInvalid JSON args: ${message}`);
  }
}

async function commandCapabilityShortcut(path) {
  printJson(
    await callBridge('/capabilities/call', {
      path,
      source: 'cli',
      approved: false,
    }),
  );
}

async function callCapability(path, args = {}, approved = false) {
  return callBridge('/capabilities/call', {
    path,
    args,
    source: 'cli',
    approved: approved || cliAutoApprove,
  });
}

async function commandPanes() {
  return commandCapabilityShortcut('xd.dock.panes.list');
}

async function commandPanels() {
  return commandCapabilityShortcut('xd.panels.list');
}

async function commandFiles() {
  return commandCapabilityShortcut('xd.files.listOpen');
}

function parseDockTarget(value = '', defaultKey = 'contentId') {
  const target = String(value || '').trim();
  if (!target) return {};
  if (target.startsWith('pane:')) return { paneId: target.slice('pane:'.length) };
  if (target.startsWith('content:')) return { contentId: target.slice('content:'.length) };
  return { [defaultKey]: target };
}

function parseViewArgs(args) {
  const kind = args[0] || '';
  if (!kind)
    throw new Error(
      'Usage: xd view <kind> [placement] [--target-pane paneId] [--file path] [--tool toolId] [--command command]',
    );
  const payload = { kind };
  let index = 1;
  if (args[index] && !args[index].startsWith('--')) {
    payload.placement = args[index];
    index += 1;
  }
  for (; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if ((arg === '--target-pane' || arg === '--targetPaneId') && value) {
      payload.targetPaneId = value;
      index += 1;
      continue;
    }
    if (arg === '--file' && value) {
      payload.filePath = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === '--tool' && value) {
      payload.toolId = value;
      index += 1;
      continue;
    }
    if (arg === '--command' && value) {
      payload.command = value;
      index += 1;
      continue;
    }
    if (arg === '--cwd' && value) {
      payload.cwd = path.resolve(value);
      index += 1;
      continue;
    }
    if (arg === '--shell' && value) {
      payload.shell = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown view option: ${arg}`);
  }
  return payload;
}

async function commandView(args) {
  printJson(await callCapability('xd.views.open', parseViewArgs(args)));
}

async function commandDockTarget(path, args, defaultKey = 'contentId') {
  printJson(await callCapability(path, parseDockTarget(args[0], defaultKey), true));
}

async function commandArrange(args) {
  const mode = args[0] || '';
  if (!['row', 'column', 'grid'].includes(mode)) {
    throw new Error('Usage: xd arrange <row|column|grid> [pane:<paneId>|content:<contentId>|id]');
  }
  printJson(
    await callCapability(
      'xd.dock.pane.arrange',
      {
        mode,
        ...parseDockTarget(args[1], 'paneId'),
      },
      true,
    ),
  );
}

async function commandMerge(args) {
  printJson(await callCapability('xd.dock.pane.merge', parseDockTarget(args[0], 'paneId'), true));
}

async function commandArtifactTarget(args) {
  const target = args[0] || '';
  const payload =
    target === 'clear'
      ? { clear: true }
      : target === 'current' || target === 'active' || !target
        ? { useActive: true }
        : parseDockTarget(target, 'paneId');
  printJson(await callCapability('xd.dock.artifactTarget.set', payload, true));
}

async function commandWindowSize(args) {
  const preset = args[0] || '';
  if (!preset) throw new Error('Usage: xd window-size <hd|fhd|qhd|uhd|presetId>');
  printJson(await callCapability('xd.window.sizer.applyPreset', { presetId: preset }, true));
}

async function commandDockSize(args) {
  const side = String(args[0] || '').trim();
  if (!side || side === 'current' || side === 'status') {
    printJson(await callCapability('xd.dock.sizes.current'));
    return;
  }
  if (!['left', 'right', 'top', 'bottom'].includes(side)) {
    throw new Error('Usage: xd dock-size [current|left|right|top|bottom <pixels>]');
  }
  const value = Number(args[1]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Usage: xd dock-size [current|left|right|top|bottom <pixels>]');
  }
  printJson(await callCapability('xd.dock.sizes.set', { [side]: Math.trunc(value) }, true));
}

async function commandCapabilities() {
  printJson(await callBridge('/capabilities/list', {}));
}

async function commandCapability(args) {
  const capabilityPath = args[0] || '';
  if (!capabilityPath) throw new Error('Usage: xd capability <path>');
  printJson(await callBridge('/capabilities/describe', { path: capabilityPath }));
}

async function commandCall(args) {
  const usage = 'Usage: xd call <path> [jsonArgs] [--approved]';
  const approved = args.includes('--approved') || cliAutoApprove;
  const filteredArgs = args.filter((arg) => arg !== '--approved');
  const capabilityPath = filteredArgs[0] || '';
  if (!capabilityPath) throw new Error(usage);
  printJson(
    await callBridge('/capabilities/call', {
      path: capabilityPath,
      args: parseJsonArgs(filteredArgs[1], usage),
      source: 'cli',
      approved,
    }),
  );
}

function printHelp() {
  process.stdout.write(`Xenesis Desk CLI bridge

Usage:
  xd [--dev|--release|--target dev|release] [--auto-approve] state
  xd panes
  xd panels
  xd files
  xd view <kind> [placement] [--target-pane paneId]
  xd focus [pane:<paneId>|content:<contentId>|id]
  xd close [pane:<paneId>|content:<contentId>|id]
  xd close-others <content:<contentId>|contentId>
  xd close-right <content:<contentId>|contentId>
  xd close-all [pane:<paneId>|content:<contentId>|id]
  xd arrange <row|column|grid> [pane:<paneId>|content:<contentId>|id]
  xd merge [pane:<paneId>|content:<contentId>|id]
  xd artifact-target [current|clear|pane:<paneId>|content:<contentId>|id]
  xd window-size <hd|fhd|qhd|uhd|presetId>
  xd dock-size [current|left|right|top|bottom <pixels>]
  xd open <path> [tab|left|right|top|bottom]
  xd run [--shell powershell|cmd|pwsh|wsl] [--cwd path] -- <command>
  xd tail <terminalId> [lines]
  xd image <file-or-url> [--term-id id] [--width=80%] [--height=auto]
  xd xcon-image <file-or-inline> [--term-id id] [--width=80%] [--height=auto] [--theme=light|dark] [--title text]
  xd trace [status|on|off|clear] [xdbot|markdown-xcon|all] [--clear]
  xd trace capture [--wait-ms 15000] [--until-final] [--poll-ms 1000] [--max-wait-ms 300000] [--keep-on] [--scope scopes] -- <message>
  xd ai <message>
  xd capabilities
  xd capability <path>
  xd call <path> [jsonArgs] [--approved]

Examples:
  xd --dev state
  xd --dev window-size qhd
  xd --dev dock-size right 620
  xd panes
  xd view gowooriChat right --target-pane main
  xd artifact-target pane:main
  xd window-size qhd
  xd files
  xd capability xd.files.listOpen
  xd call xd.terminals.sessions.term-a.tail {"maxBytes":128}
  xd --dev image "<workspace-root>/sample-image.png" --width=80% --height=auto
  xd xcon-image ".\\artifact.xcon.md" --theme=dark --title=Preview
  xd trace on --clear
  xd trace capture --wait-ms 15000 -- "Render a small XCON card"
  xd trace capture --until-final --max-wait-ms 300000 -- "Render an XCON dashboard"
  xd trace status
  xd trace off

Environment:
  XENIS_TARGET=dev|release
  XENIS_HOME
  XENIS_MCP_BRIDGE_URL
  XENIS_MCP_BRIDGE_TOKEN
  XENIS_MCP_STATE_FILE
  XENIS_BOT_INPUT_URL
  XENIS_BOT_SESSIONS_FILE
`);
}

async function main() {
  const [command = 'help', ...args] = parseGlobalArgs(process.argv.slice(2));
  if (command === 'help' || command === '--help' || command === '-h') return printHelp();
  if (command === 'state') return commandState();
  if (command === 'panes') return commandPanes();
  if (command === 'panels' || command === 'bridge-panels') return commandPanels();
  if (command === 'files') return commandFiles();
  if (command === 'view') return commandView(args);
  if (command === 'focus') return commandDockTarget('xd.dock.focus', args);
  if (command === 'close') return commandDockTarget('xd.dock.close', args);
  if (command === 'close-others') return commandDockTarget('xd.dock.closeOthers', args, 'contentId');
  if (command === 'close-right') return commandDockTarget('xd.dock.closeRight', args, 'contentId');
  if (command === 'close-all') return commandDockTarget('xd.dock.closeAll', args, 'paneId');
  if (command === 'arrange') return commandArrange(args);
  if (command === 'merge') return commandMerge(args);
  if (command === 'artifact-target') return commandArtifactTarget(args);
  if (command === 'window-size') return commandWindowSize(args);
  if (command === 'dock-size') return commandDockSize(args);
  if (command === 'open') return commandOpen(args);
  if (command === 'run') return commandRun(args);
  if (command === 'tail') return commandTail(args);
  if (command === 'trace') return commandTrace(args);
  if (command === 'ai') return commandAi(args);
  if (command === 'capabilities') return commandCapabilities();
  if (command === 'capability' || command === 'describe') return commandCapability(args);
  if (command === 'call') return commandCall(args);
  if (command === 'image') return commandImage(args);
  if (command === 'xcon-image') return commandXconImage(args);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
