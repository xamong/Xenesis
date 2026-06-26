export type DeskCapabilityKind = 'group' | 'property' | 'method' | 'event' | 'collection';
export type DeskCapabilityPermission = 'read' | 'control' | 'write' | 'execute' | 'danger';
export type DeskCapabilityApproval = 'never' | 'when-external' | 'always';
export type DeskCapabilitySource = 'internal' | 'mcp' | 'gowoori' | 'workflow' | 'xenesis';

export interface DeskCapabilityNode {
  path: string;
  label: string;
  description: string;
  kind: DeskCapabilityKind;
  permission: DeskCapabilityPermission;
  approval: DeskCapabilityApproval;
  readable?: boolean;
  writable?: boolean;
  callable?: boolean;
  subscribable?: boolean;
  schema?: Record<string, unknown>;
  children?: DeskCapabilityNode[];
}

export interface DeskCapabilityCallResult {
  ok: boolean;
  path: string;
  result?: unknown;
  error?: string;
  approvalRequired?: boolean;
  permission?: DeskCapabilityPermission;
  approval?: DeskCapabilityApproval;
  source?: DeskCapabilitySource;
}

export interface DeskCapabilityQuerySelector {
  path?: string;
  pathPrefix?: string;
  text?: string;
  kind?: DeskCapabilityKind;
  permission?: DeskCapabilityPermission;
  approval?: DeskCapabilityApproval;
  readable?: boolean;
  writable?: boolean;
  callable?: boolean;
  subscribable?: boolean;
  hasSchema?: boolean;
  predicate?: (node: DeskCapabilityNode) => boolean;
}

export type DeskCapabilityQueryInput = string | DeskCapabilityQuerySelector;
export type DeskCapabilitySubscribeCallback<T = unknown> = (payload: T, path: string) => void;
export type DeskCapabilityUnsubscribe = () => void;

export interface DeskCapabilityRegistryCallOptions {
  approved?: boolean;
}

export interface DeskCapabilityRegistryGetOptions extends DeskCapabilityRegistryCallOptions {
  args?: unknown;
}

export interface DeskCapabilityRegistryClient {
  source: DeskCapabilitySource;
  list(): Promise<DeskCapabilityNode[]>;
  describe(path?: string): Promise<DeskCapabilityNode | null>;
  query(selector?: DeskCapabilityQueryInput): Promise<DeskCapabilityNode[]>;
  get(path: string, options?: DeskCapabilityRegistryGetOptions): Promise<DeskCapabilityCallResult>;
  set(path: string, value: unknown, options?: DeskCapabilityRegistryCallOptions): Promise<DeskCapabilityCallResult>;
  call(path: string, args?: unknown, options?: DeskCapabilityRegistryCallOptions): Promise<DeskCapabilityCallResult>;
  subscribe<T = unknown>(path: string, callback: DeskCapabilitySubscribeCallback<T>): DeskCapabilityUnsubscribe;
  requestApproval(path: string, args?: unknown): Promise<DeskCapabilityCallResult>;
  approveAndCall(path: string, args?: unknown): Promise<DeskCapabilityCallResult>;
}

export interface DeskCapabilityRegistryClientOptions {
  bridgeUrl?: string;
  bridgeToken?: string;
  source?: DeskCapabilitySource;
  fetchImpl?: typeof fetch;
}

type BridgeJson = Record<string, unknown>;

const SETTABLE_PERMISSIONS = new Set<DeskCapabilityPermission>(['control', 'write', 'execute']);

function normalizeBridgeUrl(value: string | undefined): string {
  return String(value || '')
    .trim()
    .replace(/\/+$/, '');
}

function bridgeEndpoint(bridgeUrl: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${bridgeUrl}${normalizedPath}`;
}

function capabilityResult(
  path: string,
  result: unknown,
  source: DeskCapabilitySource,
  node?: DeskCapabilityNode | null,
): DeskCapabilityCallResult {
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
  source: DeskCapabilitySource,
  node?: DeskCapabilityNode | null,
): DeskCapabilityCallResult {
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

function matchesCapabilityQuery(node: DeskCapabilityNode, selector?: DeskCapabilityQueryInput): boolean {
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
  if (selector.text && !matchesCapabilityQuery(node, selector.text)) return false;
  if (selector.predicate && !selector.predicate(node)) return false;
  return true;
}

function requireBridgeUrl(bridgeUrl: string): void {
  if (!bridgeUrl) {
    throw new Error('Xenesis Desk MCP bridge URL is required for Capability Registry access.');
  }
}

async function readBridgeJson(response: Response): Promise<BridgeJson> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? (parsed as BridgeJson) : {};
  } catch {
    return { ok: false, error: text };
  }
}

async function postBridgeJson(
  bridgeUrl: string,
  bridgeToken: string | undefined,
  fetchImpl: typeof fetch,
  path: string,
  body: unknown,
): Promise<BridgeJson> {
  requireBridgeUrl(bridgeUrl);
  const response = await fetchImpl(bridgeEndpoint(bridgeUrl, path), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(bridgeToken ? { authorization: `Bearer ${bridgeToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const payload = await readBridgeJson(response);
  if (!response.ok && payload.ok !== false) {
    return { ok: false, error: `Xenesis Desk bridge request failed: HTTP ${response.status}` };
  }
  return payload;
}

function nodeFromPayload(payload: BridgeJson): DeskCapabilityNode | null {
  const capability = payload.capability;
  return capability && typeof capability === 'object' ? (capability as DeskCapabilityNode) : null;
}

function nodesFromPayload(payload: BridgeJson): DeskCapabilityNode[] {
  return Array.isArray(payload.capabilities)
    ? payload.capabilities.filter((node): node is DeskCapabilityNode => Boolean(node && typeof node === 'object'))
    : [];
}

export function createDeskCapabilityRegistryClient(
  options: DeskCapabilityRegistryClientOptions = {},
): DeskCapabilityRegistryClient {
  const bridgeUrl = normalizeBridgeUrl(options.bridgeUrl ?? process.env.XENIS_MCP_BRIDGE_URL);
  const bridgeToken = options.bridgeToken ?? process.env.XENIS_MCP_BRIDGE_TOKEN;
  const source = options.source ?? 'xenesis';
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new Error('A fetch implementation is required for Capability Registry access.');
  }

  async function describe(path = 'xd'): Promise<DeskCapabilityNode | null> {
    const payload = await postBridgeJson(bridgeUrl, bridgeToken, fetchImpl, '/capabilities/describe', { path });
    if (payload.ok === false) return null;
    return nodeFromPayload(payload);
  }

  async function call(
    path: string,
    args?: unknown,
    callOptions?: DeskCapabilityRegistryCallOptions,
  ): Promise<DeskCapabilityCallResult> {
    const payload = await postBridgeJson(bridgeUrl, bridgeToken, fetchImpl, '/capabilities/call', {
      path,
      args,
      source,
      approved: callOptions?.approved === true,
    });
    return payload as unknown as DeskCapabilityCallResult;
  }

  return {
    source,
    async list() {
      const payload = await postBridgeJson(bridgeUrl, bridgeToken, fetchImpl, '/capabilities/list', {});
      if (payload.ok === false) return [];
      return nodesFromPayload(payload);
    },
    describe,
    async query(selector?: DeskCapabilityQueryInput) {
      const capabilities = await this.list();
      return capabilities.filter((node) => matchesCapabilityQuery(node, selector));
    },
    async get(path: string, getOptions?: DeskCapabilityRegistryGetOptions) {
      const node = await describe(path);
      if (!node) return capabilityError(path, `Unknown capability: ${path}`, source);
      if (node.callable && node.permission === 'read') {
        return call(path, getOptions?.args, getOptions);
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
    async set(path: string, value: unknown, callOptions?: DeskCapabilityRegistryCallOptions) {
      const node = await describe(path);
      if (!node) return capabilityError(path, `Unknown capability: ${path}`, source);
      if (!node.callable || !SETTABLE_PERMISSIONS.has(node.permission)) {
        return capabilityError(path, `Capability is read-only or not settable: ${path}`, source, node);
      }
      return call(path, value, callOptions);
    },
    call,
    subscribe<T = unknown>(path: string, _callback: DeskCapabilitySubscribeCallback<T>) {
      throw new Error(`Capability subscriptions are not available through the HTTP bridge: ${path}`);
    },
    requestApproval(path: string, args?: unknown) {
      return call(path, args);
    },
    approveAndCall(path: string, args?: unknown) {
      return call(path, args, { approved: true });
    },
  };
}
