#!/usr/bin/env node
import process from 'node:process';

const MAX_DETAIL_CHARS = 12_000;
const DEFAULT_BRIDGE_TIMEOUT_MS = 2500;

function parseArgs(argv) {
  const result = {};
  for (const arg of argv) {
    if (arg.startsWith('--provider=')) result.provider = arg.slice('--provider='.length);
    if (arg.startsWith('--timeout-ms=')) result.timeoutMs = Number(arg.slice('--timeout-ms='.length));
  }
  return result;
}

function compactText(value, maxLength) {
  const text = value === undefined || value === null ? '' : String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function normalizeProvider(value, event) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'codex' || raw === 'claude') return raw;
  const transcriptPath = String(event?.agent_transcript_path || event?.transcript_path || '').toLowerCase();
  if (transcriptPath.includes('.claude')) return 'claude';
  if (event && typeof event.model === 'string' && event.model.trim()) return 'codex';
  return 'unknown';
}

function displayProvider(provider) {
  if (provider === 'codex') return 'Codex';
  if (provider === 'claude') return 'Claude';
  return 'External CLI';
}

function eventName(event) {
  const raw = String(event?.hook_event_name || '').trim();
  return raw || 'SubagentEvent';
}

function eventVerb(name) {
  if (/start/i.test(name)) return 'started';
  if (/stop/i.test(name)) return 'stopped';
  return 'reported';
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
    });
    process.stdin.on('end', () => {
      const text = raw.trim();
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch {
        resolve({ rawInput: text });
      }
    });
  });
}

function buildDiagnosticRecord(event, provider) {
  const name = eventName(event);
  const agentId = compactText(event?.agent_id, 200);
  const agentType = compactText(event?.agent_type, 200);
  const detail = {
    provider,
    eventName: name,
    sessionId: compactText(event?.session_id, 200),
    turnId: compactText(event?.turn_id, 200),
    cwd: compactText(event?.cwd, 2000),
    permissionMode: compactText(event?.permission_mode, 200),
    model: compactText(event?.model, 200),
    agentId,
    agentType,
    transcriptPath: compactText(event?.transcript_path, 2000),
    agentTranscriptPath: compactText(event?.agent_transcript_path, 2000),
    lastAssistantMessage: compactText(event?.last_assistant_message, 6000),
  };
  return {
    level: 'info',
    source: 'subagent-hook',
    scope: `subagent-hook:${provider}:${name}`,
    message: `${displayProvider(provider)} native subagent ${eventVerb(name)}${agentType ? `: ${agentType}` : ''}${agentId ? ` (${agentId})` : ''}`,
    detail: compactText(JSON.stringify(detail), MAX_DETAIL_CHARS),
  };
}

async function postDiagnostic(record, env, timeoutMs) {
  const bridgeUrl = String(env.XENIS_MCP_BRIDGE_URL || env.XENESIS_DESK_BRIDGE_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const bridgeToken = String(env.XENIS_MCP_BRIDGE_TOKEN || env.XENESIS_DESK_BRIDGE_TOKEN || '').trim();
  if (!bridgeUrl || !bridgeToken) return { ok: false, skipped: true, reason: 'missing bridge env' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${bridgeUrl}/capabilities/call`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${bridgeToken}`,
      },
      body: JSON.stringify({
        path: 'xd.diagnostics.record',
        args: record,
        source: 'subagent-hook',
        approved: true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

function buildHookOutput(event) {
  const name = eventName(event);
  if (/start/i.test(name)) {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SubagentStart',
        additionalContext: [
          'This native subagent is being observed by Xenesis Desk.',
          'For future delegated work that should be visible in Xenesis Desk, prefer the MCP tool `xenesis_desk_subagent_start` over hidden native delegation when that tool is available.',
        ].join(' '),
      },
    };
  }
  return { continue: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const event = await readStdin();
  const provider = normalizeProvider(args.provider, event);
  const timeoutMs =
    Number.isFinite(args.timeoutMs) && args.timeoutMs > 0
      ? Math.min(Math.trunc(args.timeoutMs), 30_000)
      : DEFAULT_BRIDGE_TIMEOUT_MS;
  const record = buildDiagnosticRecord(event, provider);
  await postDiagnostic(record, process.env, timeoutMs);
  process.stdout.write(`${JSON.stringify(buildHookOutput(event))}\n`);
}

main().catch(() => {
  process.stdout.write(`${JSON.stringify({ continue: true })}\n`);
});
