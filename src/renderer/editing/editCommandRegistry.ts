import {
  createDefaultEditCommandState,
  type EditableSurfaceAdapter,
  type EditCommand,
  type EditCommandState,
} from './editCommandModel';

export interface EditCommandRegistry {
  register(adapter: EditableSurfaceAdapter): () => void;
  unregister(id: string): void;
  activate(id: string): boolean;
  getActiveSurface(): EditableSurfaceAdapter | null;
  getState(): EditCommandState;
  run(command: EditCommand): Promise<boolean>;
}

export function createEditCommandRegistry(): EditCommandRegistry {
  const adapters = new Map<string, EditableSurfaceAdapter>();
  let activeId = '';

  const registry: EditCommandRegistry = {
    register(adapter) {
      adapters.set(adapter.id, adapter);
      activeId = adapter.id;
      return () => registry.unregister(adapter.id);
    },
    unregister(id) {
      adapters.delete(id);
      if (activeId === id) activeId = Array.from(adapters.keys()).at(-1) || '';
    },
    activate(id) {
      if (!adapters.has(id)) return false;
      activeId = id;
      return true;
    },
    getActiveSurface() {
      return activeId ? (adapters.get(activeId) ?? null) : null;
    },
    getState() {
      return registry.getActiveSurface()?.getState() ?? createDefaultEditCommandState();
    },
    async run(command) {
      const adapter = registry.getActiveSurface();
      if (!adapter) return false;
      return Boolean(await adapter.run(command));
    },
  };

  return registry;
}

export const editCommandRegistry = createEditCommandRegistry();
