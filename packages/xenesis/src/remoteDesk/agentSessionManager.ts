import type {
  RemoteDeskAgentEvent,
  RemoteDeskAgentSession,
  RemoteDeskAgentSummary,
  RemoteDeskBridge,
  RemoteDeskCommandAction,
  RemoteDeskCommandRequest,
  RemoteDeskCommandResponse,
  RemoteDeskCommandRouter
} from "./types.js";

export interface RemoteDeskAgentSessionManagerOptions {
  bridge: RemoteDeskBridge;
  watchPollIntervalMs?: number;
}

export class RemoteDeskAgentSessionManager implements RemoteDeskCommandRouter {
  private readonly sessions = new Map<string, RemoteDeskAgentSession>();

  constructor(private readonly options: RemoteDeskAgentSessionManagerOptions) {}

  canHandle(text: string, request?: RemoteDeskCommandRequest): boolean {
    const trimmed = text.trim();
    if (REMOTE_DESK_AGENT_COMMAND_RE.test(trimmed)) return true;
    if (trimmed.startsWith("/")) return false;
    if (!request?.conversationId) return false;
    return Boolean(this.sessions.get(request.conversationId)?.agentId);
  }

  async handle(request: RemoteDeskCommandRequest): Promise<RemoteDeskCommandResponse> {
    const trimmed = request.text.trim();
    if (!REMOTE_DESK_AGENT_COMMAND_RE.test(trimmed)) {
      return this.send(request, request.text);
    }

    const body = remoteDeskCommandBody(trimmed);
    const [namespace, rest] = splitFirst(body);
    const command = namespace.toLowerCase();

    if (command === "agents") return this.agents(request.conversationId);
    if (command !== "agent") return helpText();

    const [subcommandRaw, subrest] = splitFirst(rest);
    const subcommand = subcommandRaw.toLowerCase();
    if (!subcommand || subcommand === "help") return helpText();
    if (subcommand === "list" || subcommand === "agents") return this.agents(request.conversationId);
    if (subcommand === "attach") return this.attach(request.conversationId, subrest);
    if (subcommand === "detach") return this.detach(request.conversationId);
    if (subcommand === "status") return this.status(request.conversationId);
    if (subcommand === "watch") return this.watch(request);
    if (subcommand === "unwatch") return this.unwatch(request.conversationId);
    if (subcommand === "events") return this.events(request.conversationId);
    if (subcommand === "send") return this.send(request, subrest);

    return `Unknown /desk agent command: ${subcommandRaw}\n\n${helpText()}`;
  }

  private async agents(conversationId: string) {
    const payload = await this.call("xd.xenesis.agents.list");
    if (isFailure(payload)) return formatFailure(payload, "Failed to list Xenesis Agents");
    const agents = arrayFrom(payload, ["agents"], ["result", "agents"])
      .map(agentFromValue)
      .filter((agent) => agent.agentId);
    const session = this.session(conversationId);
    session.lastAgents = agents;
    if (agents.length === 0) return "No Xenesis Agent is currently visible.";
    const actions: RemoteDeskCommandAction[] = agents.slice(0, 5).map((_agent, index) => ({
      label: `Attach ${index + 1}`,
      value: `/desk agent attach ${index + 1}`
    }));
    return {
      text: agents.map((agent, index) => formatAgentLine(agent, index + 1)).join("\n"),
      actions
    };
  }

  private attach(conversationId: string, selectorText: string) {
    const selector = selectorText.trim();
    if (!selector) return "Usage: /desk agent attach <agentId|number>";
    const session = this.session(conversationId);
    const resolved = resolveAgentSelector(selector, session.lastAgents ?? []);
    if (!resolved.ok) return resolved.error;
    this.stopWatchLoop(session);
    session.agentId = resolved.agentId;
    session.seenEventIds = new Set();
    session.watching = false;
    return {
      text: `Attached to Xenesis Agent ${resolved.agentId}.`,
      actions: [
        { label: "Watch", value: "/desk agent watch" },
        { label: "Events", value: "/desk agent events" },
        { label: "Detach", value: "/desk agent detach" }
      ]
    };
  }

  private detach(conversationId: string) {
    const session = this.session(conversationId);
    this.stopWatchLoop(session);
    session.agentId = undefined;
    session.seenEventIds = new Set();
    session.lastAgents = undefined;
    return "Detached from Xenesis Agent.";
  }

  private async status(conversationId: string) {
    const session = this.requireAttached(conversationId);
    if (typeof session === "string") return session;
    const payload = await this.call("xd.xenesis.agents.status", { agentId: session.agentId });
    const agent: Partial<RemoteDeskAgentSummary> = isFailure(payload)
      ? {}
      : agentFromValue(objectAt(payload, ["agent"]) ?? objectAt(payload, ["result", "agent"]) ?? payload);
    return [
      `Agent: ${session.agentId}`,
      `Watch: ${session.watching === true ? "on" : "off"}`,
      agent.workspace ? `Workspace: ${agent.workspace}` : undefined,
      agent.provider ? `Provider: ${agent.provider}` : undefined,
      agent.status ? `Status: ${agent.status}` : undefined
    ].filter((line): line is string => Boolean(line)).join("\n");
  }

  private async watch(request: RemoteDeskCommandRequest) {
    const session = this.requireAttached(request.conversationId);
    if (typeof session === "string") return session;
    if (request.send) {
      this.startWatchLoop(request.conversationId, request.send);
    } else {
      session.watching = false;
      return `Agent watch is available for push-capable channels. Use /desk agent events to read ${session.agentId}.`;
    }
    return `Agent watch enabled for ${session.agentId}.`;
  }

  private unwatch(conversationId: string) {
    const session = this.requireAttached(conversationId);
    if (typeof session === "string") return session;
    this.stopWatchLoop(session);
    return `Agent watch disabled for ${session.agentId}.`;
  }

  private async events(conversationId: string) {
    const response = await this.collectEvents(conversationId);
    return response ?? "No new Xenesis Agent events.";
  }

  private async send(request: RemoteDeskCommandRequest, input: string) {
    const session = this.requireAttached(request.conversationId);
    if (typeof session === "string") return session;
    const text = input.trim();
    if (!text) return "Usage: /desk agent send <text>";
    const payload = await this.call("xd.xenesis.agents.submit", {
      agentId: session.agentId,
      text,
      conversationId: request.conversationId,
      senderId: request.senderId,
      source: "external-channel"
    }, true);
    if (isFailure(payload)) return formatFailure(payload, "Failed to send Xenesis Agent message");
    return `Sent message to Xenesis Agent ${session.agentId}.`;
  }

  private async collectEvents(
    conversationId: string,
    options: { expectedAgentId?: string; watchGeneration?: number } = {}
  ): Promise<RemoteDeskCommandResponse | undefined> {
    const session = this.requireAttached(conversationId);
    if (typeof session === "string") return session;
    const agentId = session.agentId;
    if (options.expectedAgentId && agentId !== options.expectedAgentId) return undefined;
    if (options.watchGeneration !== undefined && session.watchGeneration !== options.watchGeneration) return undefined;
    const payload = await this.call("xd.xenesis.agents.events", { agentId });
    if (options.expectedAgentId && session.agentId !== options.expectedAgentId) return undefined;
    if (options.watchGeneration !== undefined && session.watchGeneration !== options.watchGeneration) return undefined;
    if (isFailure(payload)) return formatFailure(payload, "Failed to read Xenesis Agent events");
    const lines: string[] = [];
    for (const rawEvent of arrayFrom(payload, ["events"], ["result", "events"])) {
      const event = eventFromValue(rawEvent);
      const text = formatExternalAgentEvent(event);
      if (!text) continue;
      const eventKey = eventDedupKey(event);
      if (eventKey && session.seenEventIds.has(eventKey)) continue;
      if (eventKey) session.seenEventIds.add(eventKey);
      lines.push(text);
    }
    return lines.length > 0 ? lines.join("\n\n") : undefined;
  }

  private startWatchLoop(
    conversationId: string,
    send: NonNullable<RemoteDeskCommandRequest["send"]>
  ) {
    const session = this.session(conversationId);
    this.stopWatchLoop(session);
    const agentId = session.agentId;
    const generation = (session.watchGeneration ?? 0) + 1;
    session.watchGeneration = generation;
    session.watching = true;
    const pollIntervalMs = this.options.watchPollIntervalMs ?? 5000;
    const tick = async () => {
      if (!session.watching) return;
      try {
        const response = await this.collectEvents(conversationId, {
          expectedAgentId: agentId,
          watchGeneration: generation
        });
        if (response && session.watching && session.agentId === agentId && session.watchGeneration === generation) {
          await send(response);
        }
      } catch (error) {
        if (session.watching && session.agentId === agentId && session.watchGeneration === generation) {
          await send(`Xenesis Agent watch failed: ${error instanceof Error ? error.message : String(error)}`).catch(() => undefined);
        }
      } finally {
        if (session.watching && session.agentId === agentId && session.watchGeneration === generation) {
          session.watchTimer = setTimeout(tick, pollIntervalMs);
          session.watchTimer.unref?.();
        }
      }
    };
    session.watchTimer = setTimeout(tick, 0);
    session.watchTimer.unref?.();
  }

  private stopWatchLoop(session: RemoteDeskAgentSession) {
    session.watching = false;
    session.watchGeneration = (session.watchGeneration ?? 0) + 1;
    if (session.watchTimer) clearTimeout(session.watchTimer);
    session.watchTimer = undefined;
  }

  private requireAttached(conversationId: string): RemoteDeskAgentSession | string {
    const session = this.session(conversationId);
    if (!session.agentId) {
      return "No Xenesis Agent is attached. Use /desk agents, then /desk agent attach <agentId>.";
    }
    return session;
  }

  private session(conversationId: string): RemoteDeskAgentSession {
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
}

const REMOTE_DESK_AGENT_COMMAND_RE = /^\/desk(?:@[A-Za-z0-9_]+)?\s+(?:agents|agent)(?:\s|$)/i;

function remoteDeskCommandBody(value: string) {
  const match = /^\/desk(?:@[A-Za-z0-9_]+)?(?:\s+([\s\S]*))?$/i.exec(value.trim());
  return match?.[1]?.trim() ?? "";
}

function helpText() {
  return [
    "Xenesis Agent commands:",
    "/desk agents",
    "/desk agent attach <agentId|number>",
    "/desk agent status",
    "/desk agent watch",
    "/desk agent unwatch",
    "/desk agent events",
    "/desk agent send <text>",
    "/desk agent detach"
  ].join("\n");
}

function splitFirst(value: string): [string, string] {
  const trimmed = value.trim();
  if (!trimmed) return ["", ""];
  const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(trimmed);
  return match ? [match[1] ?? "", match[2] ?? ""] : [trimmed, ""];
}

function resolveAgentSelector(
  selector: string,
  agents: RemoteDeskAgentSummary[]
): { ok: true; agentId: string } | { ok: false; error: string } {
  if (/^\d+$/.test(selector)) {
    const index = Number.parseInt(selector, 10);
    const agent = agents[index - 1];
    if (!agent?.agentId) {
      return { ok: false, error: `No Xenesis Agent list item ${index} is available. Run /desk agents again.` };
    }
    return { ok: true, agentId: agent.agentId };
  }
  const matches = agents.filter((agent) => agent.agentId === selector || agent.agentId.endsWith(selector));
  if (matches.length === 1) return { ok: true, agentId: matches[0].agentId };
  if (matches.length > 1) return { ok: false, error: `Agent selector ${selector} is ambiguous. Use the full agent id.` };
  return { ok: true, agentId: selector };
}

function formatAgentLine(agent: RemoteDeskAgentSummary, index: number) {
  const title = agent.title && agent.title !== agent.agentId ? ` - ${agent.title}` : "";
  const meta = [
    agent.workspace ? `workspace: ${truncateMeta(agent.workspace, 140)}` : "",
    agent.provider ? `provider: ${truncateMeta(agent.provider, 80)}` : "",
    agent.status ? `state: ${truncateMeta(agent.status, 80)}` : ""
  ].filter(Boolean);
  const heading = `${index}. ${agent.agentId}${title}`;
  return meta.length > 0 ? `${heading}\n   ${meta.join(" | ")}` : heading;
}

function formatExternalAgentEvent(event: RemoteDeskAgentEvent) {
  if (event.externalSafe !== true) return "";
  if (!isFinalAgentEvent(event)) return "";
  return stringValue(event.text).trim();
}

function isFinalAgentEvent(event: RemoteDeskAgentEvent) {
  const kind = stringValue(event.kind).toLowerCase();
  return event.final === true || kind === "assistant_final" || kind === "final";
}

function eventDedupKey(event: RemoteDeskAgentEvent) {
  if (event.id) return event.id;
  const text = stringValue(event.text).trim();
  return text ? `${stringValue(event.kind)}:${text}` : "";
}

function agentFromValue(value: unknown): RemoteDeskAgentSummary {
  const item = objectValue(value);
  const agentId = stringValue(item.agentId) || stringValue(item.id) || stringValue(item.sessionId);
  return {
    agentId,
    id: agentId,
    title: stringValue(item.title) || stringValue(item.name) || undefined,
    workspace: stringValue(item.workspace) || stringValue(item.cwd) || undefined,
    provider: stringValue(item.provider) || undefined,
    status: stringValue(item.status) || stringValue(item.state) || undefined,
    runtimeMode: stringValue(item.runtimeMode) || undefined,
    running: typeof item.running === "boolean" ? item.running : undefined,
    lastActivityAt: stringValue(item.lastActivityAt) || undefined
  };
}

function eventFromValue(value: unknown): RemoteDeskAgentEvent {
  const item = objectValue(value);
  return {
    id: stringValue(item.id) || stringValue(item.eventId),
    agentId: stringValue(item.agentId) || undefined,
    kind: stringValue(item.kind) || stringValue(item.type) || undefined,
    text: stringValue(item.text) || stringValue(item.content) || stringValue(item.summary) || undefined,
    final: typeof item.final === "boolean" ? item.final : undefined,
    externalSafe: item.externalSafe === true || item.safeToDeliver === true,
    at: stringValue(item.at) || stringValue(item.timestamp) || undefined
  };
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
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

function arrayFrom(value: unknown, ...paths: string[][]): unknown[] {
  for (const path of paths) {
    let current: unknown = value;
    for (const key of path) current = objectValue(current)[key];
    if (Array.isArray(current)) return current;
  }
  return [];
}

function stringValue(value: unknown) {
  if (value === undefined || value === null) return "";
  return String(value);
}

function truncateMeta(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, Math.max(0, maxLength - 3))}...` : normalized;
}

function isFailure(payload: Record<string, unknown>) {
  return payload.ok === false;
}

function formatFailure(payload: Record<string, unknown>, fallback: string) {
  return `${fallback}: ${stringValue(payload.error) || "unknown error"}`;
}
