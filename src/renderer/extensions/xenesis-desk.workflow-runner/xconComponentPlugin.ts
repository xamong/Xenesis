/**
 * XCON Component Plugin system (Sprint 9-1).
 *
 * Allows third-party developers to register custom XCON renderers
 * that extend the built-in 85 component types.
 */

export interface XconComponentPlugin {
  type: string;
  label: string;
  version: string;
  schema?: Record<string, unknown>;
  render: (data: Record<string, unknown>, container: HTMLElement) => void;
  streamingSupport: boolean;
}

const pluginRegistry = new Map<string, XconComponentPlugin>();

export function registerXconComponent(plugin: XconComponentPlugin): void {
  pluginRegistry.set(plugin.type, plugin);
}

export function unregisterXconComponent(type: string): boolean {
  return pluginRegistry.delete(type);
}

export function getXconComponentPlugin(type: string): XconComponentPlugin | undefined {
  return pluginRegistry.get(type);
}

export function listXconComponentPlugins(): XconComponentPlugin[] {
  return Array.from(pluginRegistry.values());
}

export function isCustomXconComponent(type: string): boolean {
  return pluginRegistry.has(type);
}
