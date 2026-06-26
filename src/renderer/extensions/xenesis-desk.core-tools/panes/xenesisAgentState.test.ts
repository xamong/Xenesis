import assert from 'node:assert/strict';
import test from 'node:test';
import { XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY, type XenesisAgentState } from './xenesisAgentTypes';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

function installStorage(name: 'localStorage' | 'sessionStorage', storage: Storage): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: storage,
  });
}

async function loadStateModule(): Promise<typeof import('./xenesisAgentState')> {
  return import(`./xenesisAgentState.ts?test=${Date.now()}-${Math.random()}`) as Promise<
    typeof import('./xenesisAgentState')
  >;
}

test('persistAgentState stores status bar selections in durable local storage', async () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  installStorage('localStorage', localStorage);
  installStorage('sessionStorage', sessionStorage);
  const { initialAgentState, persistAgentState } = await loadStateModule();

  persistAgentState({
    ...initialAgentState(),
    statusBarKeys: ['workspace', 'session'],
  } satisfies XenesisAgentState);

  assert.deepEqual(JSON.parse(localStorage.getItem(XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY) || '[]'), [
    'workspace',
    'session',
  ]);
});

test('loadPersistedAgentState restores status bar selections when session state is missing', async () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  installStorage('localStorage', localStorage);
  installStorage('sessionStorage', sessionStorage);
  localStorage.setItem(XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY, JSON.stringify(['workspace', 'session']));
  const { loadPersistedAgentState } = await loadStateModule();

  assert.deepEqual(loadPersistedAgentState().statusBarKeys, ['workspace', 'session']);
});

test('xenesisAgentStateStore persists status bar changes immediately while a run is active', async () => {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  installStorage('localStorage', localStorage);
  installStorage('sessionStorage', sessionStorage);
  const { xenesisAgentStateStore } = await loadStateModule();

  xenesisAgentStateStore.update((state) => ({
    ...state,
    running: true,
    statusBarKeys: ['workspace', 'session'],
  }));

  assert.deepEqual(JSON.parse(localStorage.getItem(XENESIS_AGENT_STATUS_BAR_KEYS_STORAGE_KEY) || '[]'), [
    'workspace',
    'session',
  ]);
});
