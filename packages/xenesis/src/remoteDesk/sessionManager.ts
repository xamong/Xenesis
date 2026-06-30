import type {
  RemoteDeskBridge,
  RemoteDeskCommandAction,
  RemoteDeskCommandRequest,
  RemoteDeskCommandResponse,
  RemoteDeskCommandRouter,
  RemoteDeskPendingEvent,
  RemoteDeskPendingOption,
  RemoteDeskSession,
  RemoteDeskTerminalSummary,
} from './types.js';

export interface RemoteDeskSessionManagerOptions {
  bridge: RemoteDeskBridge;
  watchPollIntervalMs?: number;
}

export class RemoteDeskSessionManager implements RemoteDeskCommandRouter {
  private readonly sessions = new Map<string, RemoteDeskSession>();

  constructor(private readonly options: RemoteDeskSessionManagerOptions) {}

  canHandle(text: string, request?: RemoteDeskCommandRequest): boolean {
    const trimmed = text.trim();
    if (REMOTE_DESK_COMMAND_RE.test(trimmed)) return true;
    if (trimmed.startsWith('/')) return false;
    if (!request?.conversationId) return false;
    return Boolean(this.sessions.get(request.conversationId)?.termId);
  }

  async handle(request: RemoteDeskCommandRequest): Promise<RemoteDeskCommandResponse> {
    if (!REMOTE_DESK_COMMAND_RE.test(request.text.trim())) {
      return this.send(request, request.text);
    }

    const body = remoteDeskCommandBody(request.text);
    const [commandRaw, rest] = splitFirst(body);
    const command = commandRaw.toLowerCase();

    if (!command || command === 'help') return helpText();
    if (command === 'attach') return this.attach(request.conversationId, rest);
    if (command === 'detach') return this.detach(request.conversationId);
    if (command === 'terminals') return this.terminals(request.conversationId);
    if (command === 'status') return this.status(request.conversationId);
    if (command === 'watch') return this.watch(request);
    if (command === 'events') return this.events(request);
    if (command === 'send') return this.send(request, rest);
    if (command === 'choose') return this.choose(request, rest);

    return `Unknown /desk command: ${commandRaw}\n\n${helpText()}`;
  }

  private attach(
    conversationId: string,
    selectorText: string,
  ): RemoteDeskCommandResponse | Promise<RemoteDeskCommandResponse> {
    const selector = selectorText.trim();
    if (!selector) return this.terminals(conversationId);
    const session = this.session(conversationId);
    const resolved = resolveTerminalSelector(selector, session.lastTerminals ?? []);
    if (!resolved.ok) return resolved.error;
    this.stopWatchLoop(session);
    session.termId = resolved.termId;
    session.seenEventIds = new Set();
    session.lastPending = undefined;
    session.watching = false;
    return {
      text: `Attached to terminal ${resolved.termId}.`,
      actions: [
        { label: 'Watch', value: '/desk watch' },
        { label: 'Detach', value: '/desk detach' },
      ],
    };
  }

  private detach(conversationId: string) {
    const session = this.sessions.get(conversationId);
    if (session) this.stopWatchLoop(session);
    this.sessions.delete(conversationId);
    return 'Detached from Xenesis Desk terminal.';
  }

  private async terminals(conversationId: string): Promise<RemoteDeskCommandResponse> {
    const payload = await this.call('xd.terminals.list');
    if (isFailure(payload)) return formatFailure(payload, 'Failed to list terminals');
    const terminals = arrayFrom(payload, ['sessions'], ['result', 'sessions'])
      .map(terminalFromValue)
      .filter((terminal) => terminal.termId);
    const session = this.session(conversationId);
    session.lastTerminals = terminals;
    if (terminals.length === 0) return 'No Xenesis Desk terminals are currently visible.';
    const actions: RemoteDeskCommandAction[] = terminals.slice(0, 5).map((_terminal, index) => ({
      label: `Attach ${index + 1}`,
      value: `/desk attach ${index + 1}`,
    }));
    return {
      text: formatTerminalTable(terminals),
      actions,
    };
  }

  private async status(conversationId: string) {
    const session = this.requireAttached(conversationId);
    if (typeof session === 'string') return session;
    const payload = await this.call('xd.automation.terminals.status', { termId: session.termId });
    if (isFailure(payload)) return formatFailure(payload, 'Failed to read automation status');
    const status = automationStatusFromPayload(payload);
    return [
      `Terminal: ${session.termId}`,
      `Automation: ${stringValue(status.enabled) || 'unknown'}`,
      `Mode: ${stringValue(status.mode) || 'unknown'}`,
      `Stage: ${stringValue(status.stage) || 'unknown'}`,
      status.blocked === true ? `Blocked: ${stringValue(status.blockReason) || 'yes'}` : undefined,
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  private async watch(request: RemoteDeskCommandRequest) {
    const session = this.requireAttached(request.conversationId);
    if (typeof session === 'string') return session;
    const blockReason = await this.externalChannelBlockReason(request);
    if (blockReason) return blockReason;
    const payload = await this.call(
      'xd.automation.terminals.setEnabled',
      {
        termId: session.termId,
        enabled: true,
      },
      true,
    );
    if (isFailure(payload)) return formatFailure(payload, 'Failed to enable automation');
    if (request.send) {
      this.startWatchLoop(request.conversationId, request.send);
      return `Automation enabled for ${session.termId}. New filtered output will be sent automatically. Use /desk detach to stop watching.`;
    }
    return `Automation enabled for ${session.termId}. Use /desk events to read filtered Codex output and pending input requests.`;
  }

  private async events(request: RemoteDeskCommandRequest) {
    const session = this.requireAttached(request.conversationId);
    if (typeof session === 'string') return session;
    const blockReason = await this.externalChannelBlockReason(request);
    if (blockReason) return blockReason;
    const response = await this.collectEvents(request.conversationId);
    return response ?? 'No new automation events.';
  }

  private async collectEvents(
    conversationId: string,
    options: { externalRelay?: boolean } = {},
  ): Promise<RemoteDeskCommandResponse | undefined> {
    const session = this.requireAttached(conversationId);
    if (typeof session === 'string') return session;
    if (options.externalRelay) {
      const blockReason = await this.externalChannelBlockReason({ conversationId, send: async () => undefined });
      if (blockReason) return undefined;
    }
    const payload = await this.call('xd.automation.terminals.events', { termId: session.termId });
    if (isFailure(payload)) return formatFailure(payload, 'Failed to read automation events');

    const events = arrayFrom(payload, ['events'], ['result', 'events']);
    const lines: string[] = [];
    const streamLines: string[] = [];
    const streamFilterState: RemoteDeskStreamFilterState = {
      toolOutputContinuationBudget: 0,
      editBlockContinuationBudget: 0,
    };
    const actions: RemoteDeskCommandAction[] = [];
    for (const event of events) {
      const item = objectValue(event);
      const id = stringValue(item.id);
      if (id && session.seenEventIds.has(id)) continue;
      if (id) session.seenEventIds.add(id);

      if (stringValue(item.kind) === 'stream') {
        const streamText = normalizedStreamText(item, streamFilterState);
        if (streamText) streamLines.push(streamText);
      } else {
        const formatted = this.formatEvent(item);
        if (formatted) lines.push(formatted);
      }

      const pending = pendingFromEvent(item);
      if (pending) {
        session.lastPending = pending;
        actions.splice(
          0,
          actions.length,
          ...pending.options.map((option) => ({
            label: option.label.replace(/^\d+\.\s*/, ''),
            value: `/desk choose ${option.index}`,
          })),
        );
      }
    }
    const compactStreamLines = compactStreamOutput(streamLines);
    if (compactStreamLines.length > 0) lines.unshift(['Output', ...compactStreamLines].join('\n'));
    if (lines.length === 0) return undefined;
    const text = lines.join('\n\n');
    return actions.length > 0 ? { text, actions } : text;
  }

  private startWatchLoop(conversationId: string, send: NonNullable<RemoteDeskCommandRequest['send']>) {
    const session = this.session(conversationId);
    this.stopWatchLoop(session);
    session.watching = true;
    const pollIntervalMs = this.options.watchPollIntervalMs ?? 5000;
    const tick = async () => {
      if (!session.watching) return;
      try {
        const response = await this.collectEvents(conversationId, { externalRelay: true });
        if (response) await send(response);
      } catch (error) {
        await send(`Remote Desk watch failed: ${error instanceof Error ? error.message : String(error)}`).catch(
          () => undefined,
        );
      } finally {
        if (session.watching) {
          session.watchTimer = setTimeout(tick, pollIntervalMs);
          session.watchTimer.unref?.();
        }
      }
    };
    session.watchTimer = setTimeout(tick, 0);
    session.watchTimer.unref?.();
  }

  private stopWatchLoop(session: RemoteDeskSession) {
    session.watching = false;
    if (session.watchTimer) clearTimeout(session.watchTimer);
    session.watchTimer = undefined;
  }

  private async send(request: RemoteDeskCommandRequest, input: string) {
    const session = this.requireAttached(request.conversationId);
    if (typeof session === 'string') return session;
    const blockReason = await this.externalChannelBlockReason(request);
    if (blockReason) return blockReason;
    const normalized = normalizeTerminalInput(input);
    if (!normalized) return 'Usage: /desk send <text>';
    const payload = await this.call(
      'xd.automation.terminals.manualSend',
      {
        termId: session.termId,
        input: normalized,
      },
      true,
    );
    if (isFailure(payload)) return formatFailure(payload, 'Failed to send terminal input');
    return `Sent input to ${session.termId}.`;
  }

  private async choose(request: RemoteDeskCommandRequest, choiceText: string) {
    const session = this.requireAttached(request.conversationId);
    if (typeof session === 'string') return session;
    const blockReason = await this.externalChannelBlockReason(request);
    if (blockReason) return blockReason;
    const choice = Number.parseInt(choiceText.trim(), 10);
    if (!Number.isFinite(choice)) return 'Usage: /desk choose <number>';
    const pending = session.lastPending;
    if (!pending) return 'No pending automation input request is available.';
    const option = pending.options.find((item) => item.index === choice);
    const input = option?.input ?? (choice === 1 ? pending.suggestedInput : undefined);
    if (!input) return `No pending option ${choice} is available.`;

    const payload = await this.call(
      'xd.automation.terminals.manualSend',
      {
        termId: session.termId,
        input,
        pendingEventId: pending.id,
      },
      true,
    );
    if (isFailure(payload)) return formatFailure(payload, 'Failed to send selected option');
    session.lastPending = undefined;
    return `Sent option ${choice} to ${session.termId}.`;
  }

  private async externalChannelBlockReason(
    request: Pick<RemoteDeskCommandRequest, 'conversationId' | 'send'>,
  ): Promise<string | undefined> {
    if (!request.send) return undefined;
    const session = this.requireAttached(request.conversationId);
    if (typeof session === 'string') return session;
    const payload = await this.call('xd.automation.terminals.status', { termId: session.termId });
    if (isFailure(payload))
      return formatFailure(
        payload,
        'Remote Desk external channel relay is disabled because automation status could not be read',
      );
    const status = automationStatusFromPayload(payload);
    const mode = stringValue(status.mode).trim().toLowerCase();
    const profile = (stringValue(status.streamFilterProfile) || stringValue(status.defaultStreamFilterProfile))
      .trim()
      .toLowerCase();
    if (!mode) {
      return 'Remote Desk external channel relay is disabled because automation mode could not be confirmed.';
    }
    if (mode !== 'stream') {
      return `Remote Desk external channel relay is disabled because automation mode is ${mode}. Switch this terminal to Stream mode, or use the local monitor/e2e bot for Watch/Respond.`;
    }
    if (!profile) {
      return 'Remote Desk external channel relay is disabled because Stream filter profile could not be confirmed.';
    }
    if (profile === 'none') {
      return 'Remote Desk external channel relay is disabled because Stream filter is set to none. Use the e2e bot for unfiltered testing.';
    }
    return undefined;
  }

  private requireAttached(conversationId: string): RemoteDeskSession | string {
    const session = this.session(conversationId);
    if (!session.termId) {
      return 'No Xenesis Desk terminal is attached. Use /desk terminals, then /desk attach <termId|number|suffix>.';
    }
    return session;
  }

  private session(conversationId: string): RemoteDeskSession {
    let session = this.sessions.get(conversationId);
    if (!session) {
      session = { seenEventIds: new Set() };
      this.sessions.set(conversationId, session);
    }
    return session;
  }

  private async call(path: string, args: Record<string, unknown> = {}, approved = false) {
    return objectValue(await this.options.bridge.callCapability(path, args, { approved }));
  }

  private formatEvent(event: Record<string, unknown>) {
    const kind = stringValue(event.kind);
    if (kind === 'stream') {
      const text = normalizedStreamText(event);
      return text ? `Output\n${text}` : '';
    }
    if (kind === 'user_input') return '';
    if (kind === 'pending') {
      const reason = stringValue(event.reason) || 'Input requested.';
      const options = pendingOptionsFromEvent(event);
      const optionLines = options.map((option) => `${option.index}. ${option.label}`);
      return [`Input requested`, reason, ...optionLines].join('\n');
    }
    if (kind === 'blocked') return `Automation blocked\n${stringValue(event.reason) || 'Blocked.'}`;
    if (kind === 'manual_sent') return `Manual input sent\n${stringValue(event.reason) || ''}`.trim();
    if (kind === 'auto_input') return `Automatic input sent\n${stringValue(event.reason) || ''}`.trim();
    if (kind === 'llm_error') return `Automation LLM error\n${stringValue(event.reason) || 'Unknown error.'}`;
    return '';
  }
}

const REMOTE_DESK_COMMAND_RE = /^\/desk(?:@[A-Za-z0-9_]+)?(?:\s|$)/i;

function remoteDeskCommandBody(value: string) {
  const match = /^\/desk(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i.exec(value.trim());
  return match?.[1]?.trim() ?? '';
}

function helpText() {
  return [
    'Remote Desk commands:',
    '/desk terminals',
    '/desk attach <termId|number|suffix>',
    '/desk status',
    '/desk watch',
    '/desk events',
    '/desk send <text>',
    '/desk choose <number>',
    '/desk detach',
  ].join('\n');
}

function splitFirst(value: string): [string, string] {
  const trimmed = value.trim();
  if (!trimmed) return ['', ''];
  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  return match ? [match[1] ?? '', match[2] ?? ''] : [trimmed, ''];
}

function normalizeTerminalInput(input: string) {
  if (!input) return '';
  return /[\r\n]$/.test(input) ? input : `${input}\r`;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function objectAt(value: unknown, path: string[]) {
  let current: unknown = value;
  for (const key of path) {
    const container = objectValue(current);
    if (!(key in container)) return undefined;
    current = container[key];
  }
  const record = objectValue(current);
  return Object.keys(record).length > 0 ? record : undefined;
}

function automationStatusFromPayload(payload: Record<string, unknown>) {
  return objectAt(payload, ['status']) ?? objectAt(payload, ['result', 'status']) ?? objectValue(payload);
}

function terminalFromValue(value: unknown): RemoteDeskTerminalSummary {
  const item = objectValue(value);
  const shellContext = objectValue(item.shellContext);
  const termId =
    [item.id, item.termId, item.sessionId].map((candidate) => stringValue(candidate).trim()).find(Boolean) ?? '';
  return {
    termId,
    title:
      stringValue(item.title) ||
      stringValue(item.name) ||
      stringValue(item.label) ||
      stringValue(item.displayTitle) ||
      stringValue(item.tabTitle) ||
      stringValue(item.paneTitle) ||
      stringValue(item.mcpTitle) ||
      undefined,
    detail: stringValue(item.detail) || stringValue(item.shell) || stringValue(item.command) || undefined,
    cwd: stringValue(item.cwd) || stringValue(shellContext.cwd) || undefined,
    lastSentCommand: stringValue(item.lastSentCommand) || stringValue(shellContext.lastSentCommand) || undefined,
    active: item.active === true,
  };
}

function formatTerminalTable(terminals: RemoteDeskTerminalSummary[]) {
  const rows = terminals.flatMap((terminal, index) => {
    const title = terminal.title || lastPathSegment(terminal.cwd) || 'terminal';
    const lines = [`${index + 1}. ${shortTerminalId(terminal.termId)} · ${truncateTerminalMeta(title, 48)}`];
    if (terminal.active) lines.push('   status: active');
    if (terminal.cwd) lines.push(`   cwd: ${truncateTerminalMeta(terminal.cwd, 120)}`);
    if (terminal.lastSentCommand) lines.push(`   last: ${truncateTerminalMeta(terminal.lastSentCommand, 96)}`);
    return lines;
  });
  return ['Terminals', '', ...rows].join('\n');
}

function shortTerminalId(termId: string) {
  const normalized = termId.trim();
  return normalized.length > 8 ? normalized.slice(0, 8) : normalized;
}

function lastPathSegment(value: string | undefined) {
  return (
    String(value || '')
      .split(/[\\/]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .pop() || ''
  );
}

function resolveTerminalSelector(
  selector: string,
  terminals: RemoteDeskTerminalSummary[],
): { ok: true; termId: string } | { ok: false; error: string } {
  const exact = terminals.find((terminal) => terminal.termId === selector);
  if (exact) return { ok: true, termId: exact.termId };
  if (/^\d+$/.test(selector)) {
    const index = Number.parseInt(selector, 10);
    const terminal = terminals[index - 1];
    if (terminal?.termId) return { ok: true, termId: terminal.termId };
    if (selector.length === 1) {
      return { ok: false, error: `No terminal list item ${index} is available. Run /desk terminals again.` };
    }
    return { ok: true, termId: selector };
  }
  const matches = terminals.filter((terminal) => terminal.termId.endsWith(selector));
  if (matches.length === 1) return { ok: true, termId: matches[0].termId };
  if (matches.length > 1) {
    return { ok: false, error: `Terminal selector ${selector} is ambiguous. Use the full terminal id or list number.` };
  }
  return { ok: true, termId: selector };
}

function arrayFrom(value: unknown, ...paths: string[][]): unknown[] {
  for (const path of paths) {
    let current: unknown = value;
    for (const key of path) current = objectValue(current)[key];
    if (Array.isArray(current)) return current;
  }
  return [];
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function truncateTerminalMeta(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
}

interface RemoteDeskStreamFilterState {
  toolOutputContinuationBudget: number;
  editBlockContinuationBudget: number;
}

const remoteDeskToolOutputContinuationBudget = 12;
const remoteDeskEditBlockContinuationBudget = 160;

function normalizedStreamText(
  event: Record<string, unknown>,
  state: RemoteDeskStreamFilterState = { toolOutputContinuationBudget: 0, editBlockContinuationBudget: 0 },
) {
  const lines: string[] = [];
  for (const line of stringValue(event.streamText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)) {
    if (startsRemoteDeskEditBlockContext(line)) {
      state.editBlockContinuationBudget = remoteDeskEditBlockContinuationBudget;
      continue;
    }
    if (state.editBlockContinuationBudget > 0) {
      if (!isRemoteDeskNarrativeBoundary(line)) {
        state.editBlockContinuationBudget -= 1;
        continue;
      }
      state.editBlockContinuationBudget = 0;
    }
    if (startsRemoteDeskToolOutputContext(line)) {
      state.toolOutputContinuationBudget = remoteDeskToolOutputContinuationBudget;
      continue;
    }
    if (isRemoteDeskInternalCommandLine(line)) continue;
    if (state.toolOutputContinuationBudget > 0) {
      if (!isRemoteDeskNarrativeBoundary(line)) {
        state.toolOutputContinuationBudget -= 1;
        continue;
      }
      state.toolOutputContinuationBudget = 0;
    }
    if (isRemoteDeskClippedNumericArtifactLine(normalizeRemoteDeskLineForClassification(line))) continue;
    if (isNoisyStreamText(line)) continue;
    const visible = normalizeRemoteDeskVisibleLine(line);
    if (visible) lines.push(visible);
  }
  return lines.join('\n');
}

function compactStreamOutput(lines: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line || seen.has(line)) continue;
    seen.add(line);
    result.push(line);
  }
  return result.slice(-8);
}

function isNoisyStreamText(text: string) {
  if (!text) return true;
  const trimmed = text.trim();
  const normalized = normalizeRemoteDeskLineForClassification(trimmed);
  if (!normalized) return true;
  if (isRemoteDeskInternalCommandLine(trimmed)) return true;
  if (/^›\s*/.test(trimmed)) return true;
  if (/^[─\-\s]+$/.test(normalized)) return true;
  if (/^[│└]\s*/.test(trimmed)) return true;
  if (/^[✔□]\s+/.test(trimmed)) return true;
  if (/^…\s+\+\d+\s+lines\b/i.test(normalized)) return true;
  if (isRemoteDeskEditedBlockLine(trimmed)) return true;
  if (isRemoteDeskToolOutputLine(trimmed)) return true;
  if (
    /^(?:Running|Ran|You ran|Edited|Exploring|Explored|Read|List|Search|Run|Interacted with|Waited for|Proposed Command|Updated Plan)(?:\s|:|$)/i.test(
      normalized,
    )
  )
    return true;
  if (
    /^(?:Using\s+superpowers:|Instructions\s+say\b|execution error:|Write tests for @filename$|Searching the web$|Searched the web\b|Worked for\b|Output$|Implement\s+\{feature\}$)/i.test(
      normalized,
    )
  )
    return true;
  if (
    /^(?:ing|ning|nning)\s+(?:Get-|Set-|Select-|Where-|ForEach-|rg\b|node\b|python\b|npm\b|npx\b|tsx\b|git\b)/i.test(
      normalized,
    )
  )
    return true;
  if (/^(?:ent|tent|ontent)\s+-Raw\b/i.test(normalized)) return true;
  if (/^Working(?:\s*\(\d+s[\s\S]*\))?$/i.test(normalized)) return true;
  if (/^(?:\d+m\s*)?\d+s\s*•\s*esc\s*to\s*interr?upt\)?$/i.test(normalized)) return true;
  if (/^(?:W|Wo|Wor|Work|Worki|Workin|orking|rking|king|ing|ng|g|\d+)$/i.test(normalized)) return true;
  if (/^(?:B|Bo|Boo|Boot|Booti|Bootin|Booting(?:\s+MCP\b.*)?|ing MCP\b.*)$/i.test(normalized)) return true;
  if (/^gpt-[\w.-]+\s+[\s\S]*\bleft\b/i.test(normalized)) return true;
  if (/·\s+[\s\S]*\bleft\b/i.test(normalized)) return true;
  return false;
}

function isRemoteDeskInternalCommandLine(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  const attached = /^(Running|Ran)(\S[\s\S]*)$/i.exec(normalized);
  if (attached && looksLikeRemoteDeskCommandText(attached[2])) return true;
  if (
    /^(?:Running|Ran)(?:\s|:)/i.test(normalized) &&
    looksLikeRemoteDeskCommandText(normalized.replace(/^(?:Running|Ran)(?:\s|:)+/i, ''))
  )
    return true;
  return false;
}

function startsRemoteDeskToolOutputContext(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  const attached = /^(Running|Ran)(\S[\s\S]*)$/i.exec(normalized);
  if (attached && looksLikeRemoteDeskCommandText(attached[2])) return true;
  const ran = /^Ran(?:\s|:)+([\s\S]+)$/i.exec(normalized);
  if (ran && looksLikeRemoteDeskCommandText(ran[1])) return true;
  return /^Runningif\b/i.test(normalized);
}

function startsRemoteDeskEditBlockContext(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  return /^Edited(?:\s|:|$)/i.test(normalized) || isRemoteDeskEditedBlockLine(text);
}

function looksLikeRemoteDeskCommandText(text: string) {
  return /^(?:if\b|\$|\(|\[|'|"|\.?\\|\/|[A-Z]:\\|Get-|Set-|Select-|Where-|ForEach-|Measure-|New-|Remove-|Copy-|Move-|rg\b|node\b|python\b|py\b|npm\b|npx\b|tsx\b|git\b|cat\b|ls\b|dir\b|type\b|curl\b|pwsh\b|powershell\b|cmd\b)/i.test(
    text.trim(),
  );
}

function isRemoteDeskToolOutputLine(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  if (!normalized) return true;
  if (
    /^(?:[A-Za-z0-9_.\\/-]+\.(?:html|js|ts|tsx|css|md|json|xconj):\d+:|\d{1,6}:)(?:\s|$|<|\{|\}|\(|\)|["'])/.test(
      normalized,
    )
  )
    return true;
  if (/^(?:\.\\|\.\/|[A-Za-z]:\\|[A-Za-z0-9_.-]+\\)[^\s]+/.test(normalized)) return true;
  if (/^(?:design|guitar|assets|xcon|src|packages|providers|docs|examples)[\\/][^\s]+/i.test(normalized)) return true;
  if (
    /^(?:-a---|d----|Count\s+Name\b|FullName\b|Lines\s+Words\s+Characters\b|Line\s*\||Name\s+Source\b|Path\s+Exists\b)/i.test(
      normalized,
    )
  )
    return true;
  if (/^\|[~\s]/.test(normalized)) return true;
  if (/^"[\w.-]+":\s*/.test(normalized)) return true;
  if (/^name:\s*[\w.-]+/i.test(normalized)) return true;
  if (/^(?:ERROR|WARNING)\s+[\w./\\-]+/i.test(normalized)) return true;
  if (/^\S+\s+@\S+/.test(normalized)) return true;
  return false;
}

function isRemoteDeskEditedBlockLine(text: string) {
  const normalized = normalizeRemoteDeskLineForClassification(text);
  if (!normalized) return true;
  if (isRemoteDeskClippedNumericArtifactLine(normalized)) return true;
  if (/^⋮+$/.test(normalized)) return true;
  if (/^@@\s/.test(normalized)) return true;
  if (/^\d+\s+[+-]\s?/.test(normalized)) return true;
  if (
    /^[+-]\s+(?:import|export|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|<\/?|\/\/|\/\*)/i.test(
      normalized,
    )
  )
    return true;
  return /^\d+\s{2,}(?:import|export|from\b|const|let|var|function|class|interface|type|enum|if|else|for|while|switch|case|return|await|async|try|catch|finally|throw|new\s+|describe\(|test\(|it\(|expect\(|beforeEach\(|afterEach\(|[}\])];,]|<\/?|\/\/|\/\*|[\w.]+\(|[\w$]+:\s*)/i.test(
    normalized,
  );
}

function isRemoteDeskClippedNumericArtifactLine(normalized: string) {
  if (/^\d{1,6}[+-](?!\d)(?:\s|$|[A-Za-z_$()[\]{}"'`])/.test(normalized)) return true;
  if (!/^\d{1,4}[a-z][A-Za-z0-9_.-]*/.test(normalized) || /[가-힣]/.test(normalized)) return false;
  return /(?:connection-refused|signature|elapsedms|tool:|server|app_|guards|worki|readiness|failed|error|timeout|result|content|context|workspace)/i.test(
    normalized,
  );
}

function isRemoteDeskNarrativeBoundary(text: string) {
  const normalized = normalizeRemoteDeskVisibleLine(text);
  if (!normalized || normalized.length < 10) return false;
  if (/^[-*•□✔\d]+(?:\s|[.:])/.test(normalized)) return false;
  if (isNoisyStreamText(normalized)) return false;
  if (/[가-힣]/.test(normalized)) {
    return /(?:습니다|겠습니다|입니다|합니다|됩니다|보겠습니다|확인|정리|결과|현재|오늘|내일|서울|대전|제주|좋겠습니다|필요합니다|가능성이|중심으로)/.test(
      normalized,
    );
  }
  return /^[A-Z][A-Za-z0-9 ,'"()[\].:;/-]{12,}[.!?]$/.test(normalized);
}

function normalizeRemoteDeskLineForClassification(line: string) {
  return line
    .replace(/^[›>\s]+/, '')
    .replace(/^[─\-\s]+/, '')
    .replace(/^•\s*/, '')
    .trim();
}

function normalizeRemoteDeskVisibleLine(line: string) {
  return stripAttachedRemoteDeskNarrativePrefix(line).replace(/^\s+/, '').replace(/^•\s*/, '').trim();
}

function stripAttachedRemoteDeskNarrativePrefix(line: string) {
  const normalized = line.trim();
  const match = /^(Running|Ran)([A-Z가-힣][\s\S]*)$/.exec(normalized);
  if (!match) return line;
  if (looksLikeRemoteDeskCommandText(match[2])) return line;
  return match[2];
}

function isFailure(payload: Record<string, unknown>) {
  return payload.ok === false;
}

function formatFailure(payload: Record<string, unknown>, fallback: string) {
  return `${fallback}: ${stringValue(payload.error) || 'unknown error'}`;
}

function pendingFromEvent(event: Record<string, unknown>): RemoteDeskPendingEvent | undefined {
  if (stringValue(event.kind) !== 'pending') return undefined;
  const id = stringValue(event.id);
  if (!id) return undefined;
  return {
    id,
    suggestedInput: stringValue(event.suggestedInput) || undefined,
    options: pendingOptionsFromEvent(event),
  };
}

function pendingOptionsFromEvent(event: Record<string, unknown>): RemoteDeskPendingOption[] {
  const rawOptions = Array.isArray(event.options) ? event.options : [];
  return rawOptions.map((raw, index) => {
    const option = objectValue(raw);
    const optionIndex = Number.parseInt(stringValue(option.index || index + 1), 10);
    const input = stringValue(option.input || option.value || `${optionIndex}\r`);
    return {
      index: Number.isFinite(optionIndex) ? optionIndex : index + 1,
      input: normalizeTerminalInput(input),
      label: stringValue(option.label || option.text || input.trim() || `Option ${index + 1}`),
    };
  });
}
