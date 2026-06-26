import type { DeskBridgeApi } from '../shared/types';
import {
  callDeskBridgeCapability,
  type DeskBridgeCapabilityApproval,
  type DeskBridgeCapabilityCallResult,
  type DeskBridgeCapabilityKind,
  type DeskBridgeCapabilityNode,
  type DeskBridgeCapabilityPermission,
  type DeskBridgeCapabilitySource,
  describeDeskBridgeCapability,
  listDeskBridgeCapabilities,
} from './deskBridgeCapabilities';
import { startDeskBridgeCapabilityObservation } from './observability/deskBridgeObservability';

export function getDeskBridgeApi(): DeskBridgeApi | undefined {
  return window.deskBridgeAPI ?? window.mcpBridgeAPI;
}

export function describeDeskBridge(path = 'xd'): DeskBridgeCapabilityNode | null {
  return describeDeskBridgeCapability(path) ?? describeTerminalDynamicPath(path) ?? describeDockDynamicPath(path);
}

export function listDeskBridge(): DeskBridgeCapabilityNode[] {
  const seen = new Set<string>();
  return [
    ...listDeskBridgeCapabilities(),
    ...getTerminalDynamicTemplateNodes(),
    ...getDockDynamicTemplateNodes(),
  ].filter((node) => {
    if (seen.has(node.path)) return false;
    seen.add(node.path);
    return true;
  });
}

export interface DeskBridgeCallOptions {
  approved?: boolean;
}

export interface DeskBridgeGetOptions extends DeskBridgeCallOptions {
  args?: unknown;
}

export interface DeskBridgeQuerySelector {
  path?: string;
  pathPrefix?: string;
  text?: string;
  kind?: DeskBridgeCapabilityKind;
  permission?: DeskBridgeCapabilityPermission;
  approval?: DeskBridgeCapabilityApproval;
  readable?: boolean;
  writable?: boolean;
  callable?: boolean;
  subscribable?: boolean;
  hasSchema?: boolean;
  predicate?: (node: DeskBridgeCapabilityNode) => boolean;
}

export type DeskBridgeQueryInput = string | DeskBridgeQuerySelector;
export type DeskBridgeSubscribeCallback<T = unknown> = (payload: T, path: string) => void;
export type DeskBridgeUnsubscribe = () => void;

export interface DeskCapabilityClient {
  source: DeskBridgeCapabilitySource;
  describe(path?: string): DeskBridgeCapabilityNode | null;
  list(): DeskBridgeCapabilityNode[];
  query(selector?: DeskBridgeQueryInput): DeskBridgeCapabilityNode[];
  get(path: string, options?: DeskBridgeGetOptions): Promise<DeskBridgeCapabilityCallResult>;
  set(path: string, value: unknown, options?: DeskBridgeCallOptions): Promise<DeskBridgeCapabilityCallResult>;
  call(path: string, args?: unknown, options?: DeskBridgeCallOptions): Promise<DeskBridgeCapabilityCallResult>;
  subscribe<T = unknown>(path: string, callback: DeskBridgeSubscribeCallback<T>): DeskBridgeUnsubscribe;
  requestApproval(path: string, args?: unknown): Promise<DeskBridgeCapabilityCallResult>;
  approveAndCall(path: string, args?: unknown): Promise<DeskBridgeCapabilityCallResult>;
}

type DeskBridgeSubscriptionWire = (
  api: ReturnType<typeof getDeskBridgeApi>,
  callback: DeskBridgeSubscribeCallback,
  path: string,
) => DeskBridgeUnsubscribe;

const DESK_BRIDGE_SET_PERMISSIONS = new Set<DeskBridgeCapabilityPermission>(['control', 'write']);
const TERMINAL_DYNAMIC_ROOT = 'xd.terminals';
const TERMINAL_DYNAMIC_SESSIONS_ROOT = 'xd.terminals.sessions';
const TERMINAL_DYNAMIC_STATIC_SEGMENTS = new Set([
  'list',
  'shells',
  'openDefault',
  'openPowerShell',
  'openCmd',
  'openPwsh',
  'openWsl',
  'preview',
  'spawn',
  'run',
  'write',
  'resize',
  'kill',
  'adopt',
  'image',
  'ui',
  'dialog',
  'tail',
  'stop',
]);
const TERMINAL_DYNAMIC_METHODS = new Set(['tail', 'write', 'resize', 'stop', 'kill']);
const TERMINAL_DYNAMIC_READ_PROPERTIES = new Set([
  'id',
  'kind',
  'label',
  'title',
  'detail',
  'cwd',
  'hostname',
  'host',
  'shell',
  'command',
  'pid',
  'ownerWindowId',
  'mcpCommand',
  'scrollbackBytes',
  'active',
  'fitLocked',
  'isAltBuffer',
  'imageAddonLoaded',
  'imageAddonUnavailableReason',
  'lastSentCommand',
  'groupId',
  'groupName',
  'status',
  'connectionStatus',
]);
const DOCK_DYNAMIC_PANES_ROOT = 'xd.dock.panes';
const DOCK_DYNAMIC_CONTENTS_ROOT = 'xd.dock.contents';
const DOCK_DYNAMIC_PANE_STATIC_SEGMENTS = new Set(['list']);
const DOCK_DYNAMIC_PANE_METHODS = new Set(['focus', 'close', 'closeAll', 'arrange', 'merge', 'setArtifactTarget']);
const DOCK_DYNAMIC_CONTENT_METHODS = new Set([
  'focus',
  'close',
  'closeOthers',
  'closeRight',
  'closeAll',
  'arrange',
  'merge',
  'setArtifactTarget',
]);
const DOCK_DYNAMIC_PANE_READ_PROPERTIES = new Set([
  'id',
  'state',
  'windowState',
  'group',
  'active',
  'activeContentId',
  'contents',
  'contentIds',
  'contentCount',
  'title',
]);
const DOCK_DYNAMIC_CONTENT_READ_PROPERTIES = new Set([
  'id',
  'title',
  'label',
  'type',
  'kind',
  'contentType',
  'filePath',
  'fileName',
  'fileOrigin',
  'remoteFilePath',
  'paneId',
  'windowState',
  'active',
  'termId',
]);

const DESK_BRIDGE_SUBSCRIPTION_WIRES: Record<string, DeskBridgeSubscriptionWire> = {
  'xd.events.mcp.actionInboxChanged': (api, callback, path) => {
    if (!api?.onActionInboxChanged) throw new Error(`Capability event is not wired: ${path}`);
    return api.onActionInboxChanged((payload) => callback(payload, path));
  },
  'xd.events.mcp.botEvent': (api, callback, path) => {
    if (!api?.onBotEvent) throw new Error(`Capability event is not wired: ${path}`);
    return api.onBotEvent((payload) => callback(payload, path));
  },
  'xd.events.files.openLocalRequested': (api, callback, path) => {
    if (!api?.onOpenFile) throw new Error(`Capability event is not wired: ${path}`);
    return api.onOpenFile((payload) => callback(payload, path));
  },
  'xd.events.files.openRemoteRequested': (api, callback, path) => {
    if (!api?.onOpenFile) throw new Error(`Capability event is not wired: ${path}`);
    return api.onOpenFile((payload) => callback(payload, path));
  },
  'xd.events.terminals.openLocalRequested': (api, callback, path) => {
    if (!api?.onOpenTerminal) throw new Error(`Capability event is not wired: ${path}`);
    return api.onOpenTerminal((payload) => callback(payload, path));
  },
  'xd.events.terminals.openRemoteRequested': (api, callback, path) => {
    if (!api?.onOpenTerminal) throw new Error(`Capability event is not wired: ${path}`);
    return api.onOpenTerminal((payload) => callback(payload, path));
  },
  'xd.events.gowoori.openRequested': (api, callback, path) => {
    if (!api?.onGowooriChatRun) throw new Error(`Capability event is not wired: ${path}`);
    return api.onGowooriChatRun((payload) => callback(payload, path));
  },
  'xd.events.gowoori.applyRequested': (api, callback, path) => {
    if (!api?.onGowooriChatRun) throw new Error(`Capability event is not wired: ${path}`);
    return api.onGowooriChatRun((payload) => callback(payload, path));
  },
  'xd.events.gowoori.instanceRequested': (api, callback, path) => {
    if (!api?.onGowooriChatRun) throw new Error(`Capability event is not wired: ${path}`);
    return api.onGowooriChatRun((payload) => callback(payload, path));
  },
};

function capabilityResult(
  path: string,
  result: unknown,
  source: DeskBridgeCapabilitySource,
  node?: DeskBridgeCapabilityNode | null,
): DeskBridgeCapabilityCallResult {
  return {
    ok: true,
    path,
    result,
    permission: node?.permission,
    approval: node?.approval,
    source,
  };
}

function capabilityError(
  path: string,
  error: string,
  source: DeskBridgeCapabilitySource,
  node?: DeskBridgeCapabilityNode | null,
): DeskBridgeCapabilityCallResult {
  return {
    ok: false,
    path,
    error,
    permission: node?.permission,
    approval: node?.approval,
    source,
  };
}

function normalizeQueryText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function matchesDeskBridgeQuery(node: DeskBridgeCapabilityNode, selector?: DeskBridgeQueryInput): boolean {
  if (!selector) return true;
  if (typeof selector === 'string') {
    const needle = normalizeQueryText(selector);
    if (!needle) return true;
    return [node.path, node.label, node.description, node.kind, node.permission, node.approval].some((value) =>
      normalizeQueryText(value).includes(needle),
    );
  }

  if (selector.path && node.path !== selector.path) return false;
  if (selector.pathPrefix && !node.path.startsWith(selector.pathPrefix)) return false;
  if (selector.kind && node.kind !== selector.kind) return false;
  if (selector.permission && node.permission !== selector.permission) return false;
  if (selector.approval && node.approval !== selector.approval) return false;
  if (typeof selector.readable === 'boolean' && Boolean(node.readable) !== selector.readable) return false;
  if (typeof selector.writable === 'boolean' && Boolean(node.writable) !== selector.writable) return false;
  if (typeof selector.callable === 'boolean' && Boolean(node.callable) !== selector.callable) return false;
  if (typeof selector.subscribable === 'boolean' && Boolean(node.subscribable) !== selector.subscribable) return false;
  if (typeof selector.hasSchema === 'boolean' && Boolean(node.schema) !== selector.hasSchema) return false;
  if (selector.text && !matchesDeskBridgeQuery(node, selector.text)) return false;
  if (selector.predicate && !selector.predicate(node)) return false;
  return true;
}

function normalizeDeskBridgePath(path: string): string {
  return String(path || '')
    .trim()
    .replace(/^\.+|\.+$/g, '');
}

interface TerminalDynamicPath {
  path: string;
  sessionRef?: string;
  member?: string;
  viaIndex: boolean;
}

type DockDynamicKind = 'pane' | 'content';

interface DockDynamicPath {
  path: string;
  kind: DockDynamicKind;
  ref?: string;
  member?: string;
}

function parseTerminalDynamicPath(path: string): TerminalDynamicPath | null {
  const normalizedPath = normalizeDeskBridgePath(path);
  const segments = normalizedPath.split('.').filter(Boolean);
  if (segments[0] !== 'xd' || segments[1] !== 'terminals') return null;

  if (segments[2] === 'sessions') {
    return {
      path: normalizedPath,
      sessionRef: segments[3],
      member: segments[4],
      viaIndex: false,
    };
  }

  const sessionRef = segments[2];
  if (!sessionRef || TERMINAL_DYNAMIC_STATIC_SEGMENTS.has(sessionRef)) return null;
  return {
    path: normalizedPath,
    sessionRef,
    member: segments[3],
    viaIndex: /^\d+$/.test(sessionRef),
  };
}

function parseDockDynamicPath(path: string): DockDynamicPath | null {
  const normalizedPath = normalizeDeskBridgePath(path);
  const segments = normalizedPath.split('.').filter(Boolean);
  if (segments[0] !== 'xd' || segments[1] !== 'dock') return null;

  if (segments[2] === 'panes') {
    const ref = segments[3];
    if (!ref || DOCK_DYNAMIC_PANE_STATIC_SEGMENTS.has(ref)) return null;
    return {
      path: normalizedPath,
      kind: 'pane',
      ref,
      member: segments[4],
    };
  }

  if (segments[2] === 'contents') {
    const ref = segments[3];
    if (!ref) return null;
    return {
      path: normalizedPath,
      kind: 'content',
      ref,
      member: segments[4],
    };
  }

  return null;
}

function createTerminalDynamicNode(
  path: string,
  label: string,
  description: string,
  kind: DeskBridgeCapabilityKind,
  permission: DeskBridgeCapabilityPermission = 'read',
  options: Partial<DeskBridgeCapabilityNode> = {},
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind,
    permission,
    approval: permission === 'read' ? 'never' : 'when-external',
    readable: permission === 'read' || kind === 'collection' || kind === 'property',
    callable: kind === 'method',
    ...options,
  };
}

function createDockDynamicNode(
  path: string,
  label: string,
  description: string,
  kind: DeskBridgeCapabilityKind,
  permission: DeskBridgeCapabilityPermission = 'read',
  options: Partial<DeskBridgeCapabilityNode> = {},
): DeskBridgeCapabilityNode {
  return {
    path,
    label,
    description,
    kind,
    permission,
    approval: permission === 'read' ? 'never' : 'when-external',
    readable: permission === 'read' || kind === 'collection' || kind === 'property',
    callable: kind === 'method',
    ...options,
  };
}

function describeTerminalDynamicPath(path: string): DeskBridgeCapabilityNode | null {
  const parsed = parseTerminalDynamicPath(path);
  if (!parsed) return null;
  if (!parsed.sessionRef) {
    return createTerminalDynamicNode(
      TERMINAL_DYNAMIC_SESSIONS_ROOT,
      'Terminal sessions',
      'Runtime terminal session instances materialized from xd.terminals.list.',
      'collection',
    );
  }
  if (!parsed.member) {
    return createTerminalDynamicNode(
      parsed.path,
      `Terminal ${parsed.sessionRef}`,
      'Runtime terminal session instance.',
      'collection',
    );
  }
  if (TERMINAL_DYNAMIC_METHODS.has(parsed.member)) {
    const permission: DeskBridgeCapabilityPermission =
      parsed.member === 'tail' ? 'read' : parsed.member === 'write' ? 'execute' : 'control';
    return createTerminalDynamicNode(
      parsed.path,
      `Terminal ${parsed.member}`,
      `Runtime terminal session ${parsed.member} operation.`,
      'method',
      permission,
    );
  }
  if (TERMINAL_DYNAMIC_READ_PROPERTIES.has(parsed.member)) {
    return createTerminalDynamicNode(
      parsed.path,
      `Terminal ${parsed.member}`,
      `Runtime terminal session ${parsed.member} property.`,
      'property',
    );
  }
  return null;
}

function describeDockDynamicPath(path: string): DeskBridgeCapabilityNode | null {
  const parsed = parseDockDynamicPath(path);
  if (!parsed || !parsed.ref) return null;
  if (!parsed.member) {
    return createDockDynamicNode(
      parsed.path,
      parsed.kind === 'pane' ? `Dock pane ${parsed.ref}` : `Dock content ${parsed.ref}`,
      parsed.kind === 'pane' ? 'Runtime dock pane instance.' : 'Runtime dock content instance.',
      'collection',
    );
  }

  const methods = parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_METHODS : DOCK_DYNAMIC_CONTENT_METHODS;
  if (methods.has(parsed.member)) {
    return createDockDynamicNode(
      parsed.path,
      parsed.kind === 'pane' ? `Pane ${parsed.member}` : `Content ${parsed.member}`,
      parsed.kind === 'pane'
        ? `Runtime dock pane ${parsed.member} operation.`
        : `Runtime dock content ${parsed.member} operation.`,
      'method',
      'control',
    );
  }

  const properties = parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_READ_PROPERTIES : DOCK_DYNAMIC_CONTENT_READ_PROPERTIES;
  if (properties.has(parsed.member)) {
    return createDockDynamicNode(
      parsed.path,
      parsed.kind === 'pane' ? `Pane ${parsed.member}` : `Content ${parsed.member}`,
      parsed.kind === 'pane'
        ? `Runtime dock pane ${parsed.member} property.`
        : `Runtime dock content ${parsed.member} property.`,
      'property',
    );
  }

  return null;
}

function getTerminalDynamicTemplateNodes(): DeskBridgeCapabilityNode[] {
  return [
    describeTerminalDynamicPath(TERMINAL_DYNAMIC_SESSIONS_ROOT),
    describeTerminalDynamicPath(`${TERMINAL_DYNAMIC_SESSIONS_ROOT}.{termId}`),
    ...[...TERMINAL_DYNAMIC_READ_PROPERTIES].map((property) =>
      describeTerminalDynamicPath(`${TERMINAL_DYNAMIC_SESSIONS_ROOT}.{termId}.${property}`),
    ),
    ...[...TERMINAL_DYNAMIC_METHODS].map((method) =>
      describeTerminalDynamicPath(`${TERMINAL_DYNAMIC_SESSIONS_ROOT}.{termId}.${method}`),
    ),
  ].filter(Boolean) as DeskBridgeCapabilityNode[];
}

function getDockDynamicTemplateNodes(): DeskBridgeCapabilityNode[] {
  return [
    describeDockDynamicPath(`${DOCK_DYNAMIC_PANES_ROOT}.{paneId}`),
    ...[...DOCK_DYNAMIC_PANE_READ_PROPERTIES].map((property) =>
      describeDockDynamicPath(`${DOCK_DYNAMIC_PANES_ROOT}.{paneId}.${property}`),
    ),
    ...[...DOCK_DYNAMIC_PANE_METHODS].map((method) =>
      describeDockDynamicPath(`${DOCK_DYNAMIC_PANES_ROOT}.{paneId}.${method}`),
    ),
    describeDockDynamicPath(`${DOCK_DYNAMIC_CONTENTS_ROOT}.{contentId}`),
    ...[...DOCK_DYNAMIC_CONTENT_READ_PROPERTIES].map((property) =>
      describeDockDynamicPath(`${DOCK_DYNAMIC_CONTENTS_ROOT}.{contentId}.${property}`),
    ),
    ...[...DOCK_DYNAMIC_CONTENT_METHODS].map((method) =>
      describeDockDynamicPath(`${DOCK_DYNAMIC_CONTENTS_ROOT}.{contentId}.${method}`),
    ),
  ].filter(Boolean) as DeskBridgeCapabilityNode[];
}

function unwrapTerminalSessions(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload))
    return payload.filter((item) => item && typeof item === 'object') as Record<string, unknown>[];
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.sessions)) {
    return record.sessions.filter((item) => item && typeof item === 'object') as Record<string, unknown>[];
  }
  if (record.result) return unwrapTerminalSessions(record.result);
  return [];
}

function unwrapDockInventory(payload: unknown): {
  panes: Record<string, unknown>[];
  contents: Record<string, unknown>[];
  activePaneId?: string | null;
} {
  if (!payload || typeof payload !== 'object') return { panes: [], contents: [], activePaneId: null };
  const record = payload as Record<string, unknown>;
  if (record.result && typeof record.result === 'object') return unwrapDockInventory(record.result);
  const panes = Array.isArray(record.panes)
    ? (record.panes.filter((item) => item && typeof item === 'object') as Record<string, unknown>[])
    : [];
  const contents = Array.isArray(record.contents)
    ? (record.contents.filter((item) => item && typeof item === 'object') as Record<string, unknown>[])
    : [];
  const activePaneId = typeof record.activePaneId === 'string' ? record.activePaneId : null;
  return { panes, contents, activePaneId };
}

function resolveDockItemByRef(
  items: Record<string, unknown>[],
  ref: string | undefined,
): Record<string, unknown> | null {
  if (!ref) return null;
  if (/^\d+$/.test(ref)) {
    const index = Number(ref);
    return Number.isSafeInteger(index) && index >= 0 ? (items[index] ?? null) : null;
  }
  return items.find((item) => String(item.id ?? '') === ref) ?? null;
}

function dockContentIdsFromPane(pane: Record<string, unknown>): string[] {
  return Array.isArray(pane.contents) ? pane.contents.map((item) => String(item)) : [];
}

function readDockPaneProperty(
  pane: Record<string, unknown>,
  property: string,
  inventory: { activePaneId?: string | null },
): unknown {
  if (property === 'active') return String(pane.id ?? '') === inventory.activePaneId;
  if (property === 'windowState') return pane.windowState ?? pane.state;
  if (property === 'contentIds' || property === 'contents') return dockContentIdsFromPane(pane);
  if (property === 'contentCount') return dockContentIdsFromPane(pane).length;
  if (property === 'title') return pane.title ?? pane.label ?? pane.id;
  return pane[property];
}

function readDockContentProperty(
  content: Record<string, unknown>,
  property: string,
  inventory: { panes: Record<string, unknown>[] },
): unknown {
  if (property === 'type' || property === 'kind') return content.contentType ?? content.type ?? content.kind;
  if (property === 'windowState') {
    const paneId = String(content.paneId ?? '');
    return inventory.panes.find((pane) => String(pane.id ?? '') === paneId)?.state;
  }
  if (property === 'active') {
    const paneId = String(content.paneId ?? '');
    const pane = inventory.panes.find((item) => String(item.id ?? '') === paneId);
    return pane?.activeContentId === content.id;
  }
  return content[property];
}

function readTerminalSessionString(session: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = session[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function deriveTerminalHostname(session: Record<string, unknown>): string {
  const explicit = readTerminalSessionString(session, ['hostname', 'host']);
  if (explicit) return explicit;
  const detail = readTerminalSessionString(session, ['detail']);
  const remoteMatch = detail.match(/\b(?:SSH|TELNET)\s+(?:[^@\s]+@)?([^:\s]+)/i);
  if (remoteMatch?.[1]) return remoteMatch[1];
  const kind = readTerminalSessionString(session, ['kind']);
  return kind === 'ssh' || kind === 'telnet' ? '' : 'localhost';
}

function readTerminalDynamicProperty(session: Record<string, unknown>, property: string): unknown {
  if (property === 'hostname' || property === 'host') return deriveTerminalHostname(session);
  if (property === 'status') {
    const shellContext =
      session.shellContext && typeof session.shellContext === 'object'
        ? (session.shellContext as Record<string, unknown>)
        : null;
    return shellContext?.connectionStatus ?? (session.active === true ? 'active' : 'idle');
  }
  if (property === 'connectionStatus') {
    const shellContext =
      session.shellContext && typeof session.shellContext === 'object'
        ? (session.shellContext as Record<string, unknown>)
        : null;
    return shellContext?.connectionStatus ?? undefined;
  }
  return session[property];
}

function resolveTerminalSessionByRef(
  sessions: Record<string, unknown>[],
  sessionRef: string | undefined,
): Record<string, unknown> | null {
  if (!sessionRef) return null;
  if (/^\d+$/.test(sessionRef)) {
    const index = Number(sessionRef);
    return Number.isSafeInteger(index) && index >= 0 ? (sessions[index] ?? null) : null;
  }
  return sessions.find((session) => String(session.id ?? '') === sessionRef) ?? null;
}

async function getTerminalDynamicSessions(
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const result = await callDeskBridge('xd.terminals.list', undefined, source, options);
  if (!result.ok) return result;
  return capabilityResult(TERMINAL_DYNAMIC_SESSIONS_ROOT, unwrapTerminalSessions(result.result), source);
}

async function getDockDynamicInventory(
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const result = await callDeskBridge('xd.dock.panes.list', undefined, source, options);
  if (!result.ok) return result;
  return capabilityResult(DOCK_DYNAMIC_PANES_ROOT, unwrapDockInventory(result.result), source);
}

async function resolveDockDynamicItem(
  parsed: DockDynamicPath,
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeCallOptions,
): Promise<{
  inventory: { panes: Record<string, unknown>[]; contents: Record<string, unknown>[]; activePaneId?: string | null };
  item: Record<string, unknown> | null;
  error?: DeskBridgeCapabilityCallResult;
}> {
  const inventoryResult = await getDockDynamicInventory(source, options);
  if (!inventoryResult.ok)
    return { inventory: { panes: [], contents: [], activePaneId: null }, item: null, error: inventoryResult };
  const inventory = unwrapDockInventory(inventoryResult.result);
  const item =
    parsed.kind === 'pane'
      ? resolveDockItemByRef(inventory.panes, parsed.ref)
      : resolveDockItemByRef(inventory.contents, parsed.ref);
  if (!item) {
    return {
      inventory,
      item: null,
      error: capabilityError(
        parsed.path,
        `${parsed.kind === 'pane' ? 'Dock pane' : 'Dock content'} not found: ${parsed.ref}`,
        source,
        describeDockDynamicPath(parsed.path),
      ),
    };
  }
  return { inventory, item };
}

async function resolveTerminalDynamicSession(
  parsed: TerminalDynamicPath,
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeCallOptions,
): Promise<{
  sessions: Record<string, unknown>[];
  session: Record<string, unknown> | null;
  error?: DeskBridgeCapabilityCallResult;
}> {
  const sessionsResult = await getTerminalDynamicSessions(source, options);
  if (!sessionsResult.ok) return { sessions: [], session: null, error: sessionsResult };
  const sessions = unwrapTerminalSessions(sessionsResult.result);
  const session = resolveTerminalSessionByRef(sessions, parsed.sessionRef);
  if (!session) {
    return {
      sessions,
      session: null,
      error: capabilityError(
        parsed.path,
        `Terminal session not found: ${parsed.sessionRef}`,
        source,
        describeTerminalDynamicPath(parsed.path),
      ),
    };
  }
  return { sessions, session };
}

function mergeTerminalDynamicArgs(id: string, args: unknown): Record<string, unknown> {
  const base = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  return { ...base, id };
}

function mergeDockDynamicArgs(
  targetKey: 'paneId' | 'contentId',
  targetId: string,
  args: unknown,
): Record<string, unknown> {
  const base = args && typeof args === 'object' && !Array.isArray(args) ? (args as Record<string, unknown>) : {};
  return { ...base, [targetKey]: targetId };
}

async function getTerminalDynamicPath(
  parsed: TerminalDynamicPath,
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeGetOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const node = describeTerminalDynamicPath(parsed.path);
  if (!node) return capabilityError(parsed.path, `Unknown dynamic capability: ${parsed.path}`, source);
  if (!parsed.sessionRef) return getTerminalDynamicSessions(source, options);
  const resolved = await resolveTerminalDynamicSession(parsed, source, options);
  if (resolved.error) return resolved.error;
  const session = resolved.session!;
  if (!parsed.member) return capabilityResult(parsed.path, session, source, node);
  if (parsed.member === 'tail') return callTerminalDynamicPath(parsed, options?.args, source, options);
  if (!TERMINAL_DYNAMIC_READ_PROPERTIES.has(parsed.member)) {
    return capabilityError(parsed.path, `Capability is not readable: ${parsed.path}`, source, node);
  }
  return capabilityResult(parsed.path, readTerminalDynamicProperty(session, parsed.member), source, node);
}

async function getDockDynamicPath(
  parsed: DockDynamicPath,
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeGetOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const node = describeDockDynamicPath(parsed.path);
  if (!node) return capabilityError(parsed.path, `Unknown dynamic capability: ${parsed.path}`, source);
  const resolved = await resolveDockDynamicItem(parsed, source, options);
  if (resolved.error) return resolved.error;
  const item = resolved.item!;
  if (!parsed.member) return capabilityResult(parsed.path, item, source, node);
  const readProperties =
    parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_READ_PROPERTIES : DOCK_DYNAMIC_CONTENT_READ_PROPERTIES;
  if (!readProperties.has(parsed.member)) {
    return capabilityError(parsed.path, `Capability is not readable: ${parsed.path}`, source, node);
  }
  const value =
    parsed.kind === 'pane'
      ? readDockPaneProperty(item, parsed.member, resolved.inventory)
      : readDockContentProperty(item, parsed.member, resolved.inventory);
  return capabilityResult(parsed.path, value, source, node);
}

async function callTerminalDynamicPath(
  parsed: TerminalDynamicPath,
  args: unknown,
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const node = describeTerminalDynamicPath(parsed.path);
  if (!node) return capabilityError(parsed.path, `Unknown dynamic capability: ${parsed.path}`, source);
  if (!parsed.sessionRef || !parsed.member || !TERMINAL_DYNAMIC_METHODS.has(parsed.member)) {
    return capabilityError(parsed.path, `Capability is not callable: ${parsed.path}`, source, node);
  }
  const resolved = await resolveTerminalDynamicSession(parsed, source, options);
  if (resolved.error) return resolved.error;
  const id = String(resolved.session?.id ?? parsed.sessionRef);
  const targetPath = `${TERMINAL_DYNAMIC_ROOT}.${parsed.member}`;
  return callDeskBridge(targetPath, mergeTerminalDynamicArgs(id, args), source, options);
}

async function callDockDynamicPath(
  parsed: DockDynamicPath,
  args: unknown,
  source: DeskBridgeCapabilitySource,
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const node = describeDockDynamicPath(parsed.path);
  if (!node) return capabilityError(parsed.path, `Unknown dynamic capability: ${parsed.path}`, source);
  const methods = parsed.kind === 'pane' ? DOCK_DYNAMIC_PANE_METHODS : DOCK_DYNAMIC_CONTENT_METHODS;
  if (!parsed.ref || !parsed.member || !methods.has(parsed.member)) {
    return capabilityError(parsed.path, `Capability is not callable: ${parsed.path}`, source, node);
  }
  const resolved = await resolveDockDynamicItem(parsed, source, options);
  if (resolved.error) return resolved.error;
  const id = String(resolved.item?.id ?? parsed.ref);
  const targetKey = parsed.kind === 'pane' ? 'paneId' : 'contentId';
  if (parsed.member === 'focus')
    return callDeskBridge('xd.dock.focus', mergeDockDynamicArgs(targetKey, id, args), source, options);
  if (parsed.member === 'close')
    return callDeskBridge('xd.dock.close', mergeDockDynamicArgs(targetKey, id, args), source, options);
  if (parsed.member === 'closeAll')
    return callDeskBridge('xd.dock.closeAll', mergeDockDynamicArgs(targetKey, id, args), source, options);
  if (parsed.member === 'arrange')
    return callDeskBridge('xd.dock.pane.arrange', mergeDockDynamicArgs(targetKey, id, args), source, options);
  if (parsed.member === 'merge')
    return callDeskBridge('xd.dock.pane.merge', mergeDockDynamicArgs(targetKey, id, args), source, options);
  if (parsed.member === 'setArtifactTarget')
    return callDeskBridge('xd.dock.artifactTarget.set', mergeDockDynamicArgs(targetKey, id, args), source, options);
  if (parsed.kind === 'content' && parsed.member === 'closeOthers')
    return callDeskBridge('xd.dock.closeOthers', mergeDockDynamicArgs('contentId', id, args), source, options);
  if (parsed.kind === 'content' && parsed.member === 'closeRight')
    return callDeskBridge('xd.dock.closeRight', mergeDockDynamicArgs('contentId', id, args), source, options);
  return capabilityError(parsed.path, `Capability is not callable: ${parsed.path}`, source, node);
}

export function callDeskBridge(
  path: string,
  args?: unknown,
  source: DeskBridgeCapabilitySource = 'internal',
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  const api = getDeskBridgeApi();
  const request = { path, args, source, approved: options?.approved };
  const observation = startDeskBridgeCapabilityObservation(request);
  try {
    const result = api?.callCapability
      ? (api.callCapability(request) as Promise<DeskBridgeCapabilityCallResult>)
      : callDeskBridgeCapability(getDeskBridgeApi(), request);
    return Promise.resolve(result).then(
      (value) => {
        observation.complete(value);
        return value;
      },
      (error) => {
        observation.complete(undefined, error);
        throw error;
      },
    );
  } catch (error) {
    observation.complete(undefined, error);
    return Promise.reject(error);
  }
}

export function createDeskCapabilityClient(source: DeskBridgeCapabilitySource): DeskCapabilityClient {
  return {
    source,
    describe: describeDeskBridge,
    list: listDeskBridge,
    query(selector?: DeskBridgeQueryInput) {
      return listDeskBridge().filter((node) => matchesDeskBridgeQuery(node, selector));
    },
    async get(path: string, options?: DeskBridgeGetOptions) {
      const dynamicTerminalPath = parseTerminalDynamicPath(path);
      if (dynamicTerminalPath) return getTerminalDynamicPath(dynamicTerminalPath, source, options);
      const dynamicDockPath = parseDockDynamicPath(path);
      if (dynamicDockPath) return getDockDynamicPath(dynamicDockPath, source, options);

      const node = describeDeskBridge(path);
      if (!node) return capabilityError(path, `Unknown capability: ${path}`, source);
      if (node.callable && node.permission === 'read') {
        return callDeskBridge(path, options?.args, source, options);
      }
      if (
        node.readable ||
        node.kind === 'group' ||
        node.kind === 'collection' ||
        node.kind === 'property' ||
        node.subscribable
      ) {
        return capabilityResult(node.path, node, source, node);
      }
      return capabilityError(path, `Capability is not readable: ${path}`, source, node);
    },
    async set(path: string, value: unknown, options?: DeskBridgeCallOptions) {
      const dynamicTerminalPath = parseTerminalDynamicPath(path);
      if (dynamicTerminalPath) {
        if (dynamicTerminalPath.member !== 'write') {
          throw new Error(`Capability is read-only or not settable: ${path}`);
        }
        const args = typeof value === 'string' ? { data: value } : value;
        return callTerminalDynamicPath(dynamicTerminalPath, args, source, options);
      }
      const dynamicDockPath = parseDockDynamicPath(path);
      if (dynamicDockPath) {
        throw new Error(`Capability is read-only or not settable: ${path}`);
      }

      const node = describeDeskBridge(path);
      if (!node) throw new Error(`Unknown capability: ${path}`);
      if (!node.callable || !DESK_BRIDGE_SET_PERMISSIONS.has(node.permission)) {
        throw new Error(`Capability is read-only or not settable: ${path}`);
      }
      return callDeskBridge(path, value, source, options);
    },
    call(path: string, args?: unknown, options?: DeskBridgeCallOptions) {
      const dynamicTerminalPath = parseTerminalDynamicPath(path);
      if (dynamicTerminalPath) return callTerminalDynamicPath(dynamicTerminalPath, args, source, options);
      const dynamicDockPath = parseDockDynamicPath(path);
      if (dynamicDockPath) return callDockDynamicPath(dynamicDockPath, args, source, options);
      return callDeskBridge(path, args, source, options);
    },
    subscribe<T = unknown>(path: string, callback: DeskBridgeSubscribeCallback<T>) {
      const node = describeDeskBridge(path);
      if (!node) throw new Error(`Unknown capability: ${path}`);
      if (!node.subscribable) throw new Error(`Capability is not subscribable: ${path}`);
      const wire = DESK_BRIDGE_SUBSCRIPTION_WIRES[path];
      if (!wire) throw new Error(`Capability event is not wired: ${path}`);
      return wire(getDeskBridgeApi(), callback as DeskBridgeSubscribeCallback, path);
    },
    requestApproval(path: string, args?: unknown) {
      return callDeskBridge(path, args, source);
    },
    approveAndCall(path: string, args?: unknown) {
      return callDeskBridge(path, args, source, { approved: true });
    },
  };
}

export const createDeskBridgeFacade = createDeskCapabilityClient;
export const deskBridge = createDeskCapabilityClient('internal');

const gowooriDeskCapabilityClient = createDeskCapabilityClient('gowoori');
const workflowDeskCapabilityClient = createDeskCapabilityClient('workflow');

export function callGowooriDeskCapability(
  path: string,
  args?: unknown,
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  return gowooriDeskCapabilityClient.call(path, args, options);
}

export function callWorkflowDeskCapability(
  path: string,
  args?: unknown,
  options?: DeskBridgeCallOptions,
): Promise<DeskBridgeCapabilityCallResult> {
  return workflowDeskCapabilityClient.call(path, args, options);
}
