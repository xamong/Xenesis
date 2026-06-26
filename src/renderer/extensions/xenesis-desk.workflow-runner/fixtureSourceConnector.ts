/**
 * Fixture live data connector framework.
 *
 * Allows fixtures to declare a `source` that auto-refreshes data
 * from external systems without LLM re-invocation.
 *
 * Supported source types:
 *   - http:       REST API polling
 *   - terminal:   Terminal command execution result
 *   - sqlite:     Internal SQLite query (periodic)
 *   - meta:       MetaManagement instances
 *   - file-watch: Local file change detection (future)
 *   - websocket:  WebSocket stream subscription (future)
 */

export type FixtureSourceType = 'http' | 'terminal' | 'sqlite' | 'meta' | 'file-watch' | 'websocket';

export interface FixtureSourceConfig {
  type: FixtureSourceType;
  url?: string;
  command?: string;
  query?: string;
  node?: string;
  path?: string;
  intervalMs: number;
  transform?: string;
  enabled: boolean;
}

export interface FixtureSourceState {
  config: FixtureSourceConfig;
  status: 'idle' | 'connecting' | 'active' | 'error';
  lastFetchAt?: number;
  lastError?: string;
  fetchCount: number;
  timer?: ReturnType<typeof setInterval>;
}

export interface FixtureSourceConnector {
  register(fixtureId: string, config: FixtureSourceConfig): void;
  unregister(fixtureId: string): void;
  start(fixtureId: string): void;
  stop(fixtureId: string): void;
  stopAll(): void;
  getState(fixtureId: string): FixtureSourceState | undefined;
  listSources(): Array<{ fixtureId: string; state: FixtureSourceState }>;
  onData: ((fixtureId: string, data: unknown) => void) | null;
  onError: ((fixtureId: string, error: string) => void) | null;
}

async function fetchHttpSource(config: FixtureSourceConfig): Promise<unknown> {
  if (!config.url) throw new Error('HTTP source requires url');
  const response = await fetch(config.url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (config.transform) {
    const fn = new Function('$', `return ${config.transform.replace(/^=\s*/, '')}`);
    return fn(data);
  }
  return data;
}

async function fetchTerminalSource(config: FixtureSourceConfig): Promise<unknown> {
  if (!config.command) throw new Error('Terminal source requires command');
  return { command: config.command, note: 'Terminal execution requires main process bridge' };
}

async function fetchSqliteSource(config: FixtureSourceConfig): Promise<unknown> {
  if (!config.query) throw new Error('SQLite source requires query');
  return { query: config.query, note: 'SQLite execution requires server bridge' };
}

async function fetchMetaSource(config: FixtureSourceConfig): Promise<unknown> {
  if (!config.node) throw new Error('Meta source requires node (CODE)');
  const bridgeUrl = (window as any).__xenesisBridgeUrl || 'http://127.0.0.1:3847';
  const bridgeToken = (window as any).__xenesisBridgeToken || '';
  try {
    const response = await fetch(`${bridgeUrl}/capabilities/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(bridgeToken ? { Authorization: `Bearer ${bridgeToken}` } : {}),
      },
      body: JSON.stringify({
        path: 'xd.meta.instances.toFixture',
        args: { node: config.node },
        source: 'fixture-connector',
        approved: true,
      }),
    });
    if (!response.ok) throw new Error(`Bridge HTTP ${response.status}`);
    const json = await response.json();
    const result = json.result || json;
    if (config.transform) {
      const fn = new Function('$', `return ${config.transform.replace(/^=\s*/, '')}`);
      return fn(result);
    }
    return result;
  } catch (error) {
    throw new Error(`Meta source fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const SOURCE_FETCHERS: Record<FixtureSourceType, (config: FixtureSourceConfig) => Promise<unknown>> = {
  http: fetchHttpSource,
  terminal: fetchTerminalSource,
  sqlite: fetchSqliteSource,
  meta: fetchMetaSource,
  'file-watch': async () => ({ note: 'file-watch not yet implemented' }),
  websocket: async () => ({ note: 'websocket not yet implemented' }),
};

export function createFixtureSourceConnector(): FixtureSourceConnector {
  const sources = new Map<string, FixtureSourceState>();

  const connector: FixtureSourceConnector = {
    onData: null,
    onError: null,

    register(fixtureId: string, config: FixtureSourceConfig): void {
      connector.unregister(fixtureId);
      sources.set(fixtureId, {
        config: { ...config },
        status: 'idle',
        fetchCount: 0,
      });
    },

    unregister(fixtureId: string): void {
      connector.stop(fixtureId);
      sources.delete(fixtureId);
    },

    start(fixtureId: string): void {
      const state = sources.get(fixtureId);
      if (!state || !state.config.enabled) return;

      const fetch = async () => {
        state.status = 'connecting';
        try {
          const fetcher = SOURCE_FETCHERS[state.config.type];
          if (!fetcher) throw new Error(`Unknown source type: ${state.config.type}`);
          const data = await fetcher(state.config);
          state.status = 'active';
          state.lastFetchAt = Date.now();
          state.fetchCount += 1;
          state.lastError = undefined;
          connector.onData?.(fixtureId, data);
        } catch (error) {
          state.status = 'error';
          state.lastError = error instanceof Error ? error.message : String(error);
          connector.onError?.(fixtureId, state.lastError);
        }
      };

      fetch();
      if (state.config.intervalMs > 0) {
        state.timer = setInterval(fetch, Math.max(state.config.intervalMs, 1000));
      }
    },

    stop(fixtureId: string): void {
      const state = sources.get(fixtureId);
      if (!state) return;
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = undefined;
      }
      state.status = 'idle';
    },

    stopAll(): void {
      for (const fixtureId of sources.keys()) {
        connector.stop(fixtureId);
      }
    },

    getState(fixtureId: string): FixtureSourceState | undefined {
      return sources.get(fixtureId);
    },

    listSources(): Array<{ fixtureId: string; state: FixtureSourceState }> {
      return Array.from(sources.entries()).map(([fixtureId, state]) => ({ fixtureId, state }));
    },
  };

  return connector;
}
