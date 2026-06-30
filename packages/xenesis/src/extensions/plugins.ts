import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { mcpServerConfigSchema } from '../config/loadConfig.js';
import { type ProviderFactory, registerProviderFactory } from '../providers/providerFactory.js';
import type { Tool, ToolRegistry } from '../tools/index.js';
import { assertExistingPathInsideWorkspace, assertInsideWorkspace, isPathInside } from '../utils/workspace.js';
import { createBundledSkillCommand } from './skills.js';
import type {
  BuiltinPluginDefinition,
  BuiltinPluginSettings,
  CreateRuntimeToolRegistryOptions,
  LoadedBuiltinPlugin,
  LoadPluginToolsOptions,
  PluginManifest,
  PluginProviderDescriptor,
  PluginRuntimeDiagnostic,
  PluginStateRecord,
  PluginToolDescriptor,
  PluginWorkflowDescriptor,
  SkillCommand,
} from './types.js';

export const BUILTIN_MARKETPLACE_NAME = 'builtin';

const builtinPlugins = new Map<string, BuiltinPluginDefinition>();

const pluginToolSchema = z.object({
  name: z.string().min(1),
  entry: z.string().min(1),
  exportName: z.string().min(1).default('default'),
  description: z.string().optional(),
});

const pluginWorkflowStepSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  mode: z.enum(['plan', 'work']).optional(),
  input: z.enum(['original', 'previous']).optional(),
  prompt: z.string().optional(),
  promptPrefix: z.string().optional(),
  promptSuffix: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const pluginWorkflowSchema = pluginWorkflowStepSchema.extend({
  steps: z.array(pluginWorkflowStepSchema).optional(),
});

const pluginProviderCapabilitiesSchema = z.object({
  supportsTools: z.boolean(),
  requiresApiKey: z.boolean(),
  transport: z.enum([
    'http-streaming',
    'http-nonstreaming',
    'cli-oneshot',
    'cli-interactive',
    'local-server',
    'mcp-agent',
  ]),
  streaming: z.boolean(),
  persistentSession: z.boolean(),
});

const pluginProviderSchema = z.object({
  name: z.string().min(1),
  entry: z.string().min(1),
  exportName: z.string().min(1),
  capabilities: pluginProviderCapabilitiesSchema,
});

const pluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().optional(),
  tools: z.array(pluginToolSchema).default([]),
  workflows: z.array(pluginWorkflowSchema).default([]),
  mcpServers: z.record(mcpServerConfigSchema).default({}),
  providers: z.array(pluginProviderSchema).default([]),
});

async function resolveManifestPath(path: string) {
  const fileStat = await stat(path);
  return fileStat.isDirectory() ? join(path, 'xenesis.plugin.json') : path;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isNotFoundError(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isTool(value: unknown): value is Tool {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const inputSchema = candidate.inputSchema as { safeParse?: unknown } | undefined;
  return (
    typeof candidate.name === 'string' &&
    candidate.name.length > 0 &&
    typeof candidate.description === 'string' &&
    typeof inputSchema?.safeParse === 'function' &&
    typeof candidate.isReadOnly === 'function' &&
    typeof candidate.run === 'function'
  );
}

async function resolvePluginPath(workspaceRoot: string, path: string) {
  return await assertExistingPathInsideWorkspace(workspaceRoot, path);
}

export function registerBuiltinPlugin(definition: BuiltinPluginDefinition): void {
  builtinPlugins.set(definition.name, { ...definition });
}

export function clearBuiltinPlugins(): void {
  builtinPlugins.clear();
}

export function isPackagedPluginId(pluginId: string): boolean {
  return pluginId.endsWith(`@${BUILTIN_MARKETPLACE_NAME}`);
}

export function getBuiltinPluginDefinition(name: string): BuiltinPluginDefinition | undefined {
  const definition = builtinPlugins.get(name);
  return definition ? { ...definition } : undefined;
}

export function getBuiltinPlugins(settings: BuiltinPluginSettings = {}): {
  enabled: LoadedBuiltinPlugin[];
  disabled: LoadedBuiltinPlugin[];
} {
  const enabled: LoadedBuiltinPlugin[] = [];
  const disabled: LoadedBuiltinPlugin[] = [];

  for (const [name, definition] of builtinPlugins) {
    if (definition.isAvailable && !definition.isAvailable()) continue;

    const pluginId = `${name}@${BUILTIN_MARKETPLACE_NAME}`;
    const userSetting = settings.enabledPlugins?.[pluginId];
    const isEnabled = userSetting !== undefined ? userSetting === true : (definition.defaultEnabled ?? true);
    const plugin: LoadedBuiltinPlugin = {
      name,
      manifest: {
        name,
        description: definition.description,
        ...(definition.version ? { version: definition.version } : {}),
      },
      path: BUILTIN_MARKETPLACE_NAME,
      source: pluginId,
      repository: pluginId,
      enabled: isEnabled,
      isBuiltin: true,
      ...(definition.hooks ? { hooksConfig: definition.hooks } : {}),
      ...(definition.mcpServers ? { mcpServers: definition.mcpServers } : {}),
    };

    if (isEnabled) enabled.push(plugin);
    else disabled.push(plugin);
  }

  return { enabled, disabled };
}

export function getBuiltinPluginSkillCommands(settings: BuiltinPluginSettings = {}): SkillCommand[] {
  const { enabled } = getBuiltinPlugins(settings);
  const commands: SkillCommand[] = [];
  for (const plugin of enabled) {
    const definition = builtinPlugins.get(plugin.name);
    if (!definition?.skills) continue;
    commands.push(
      ...definition.skills.map((skill) =>
        createBundledSkillCommand({
          ...skill,
          isEnabled: skill.isEnabled ?? (() => true),
        }),
      ),
    );
  }
  return commands;
}

async function readPluginBundle(workspaceRoot: string, path: string) {
  const pluginPath = await resolvePluginPath(workspaceRoot, path);
  const manifestPath = await resolveManifestPath(pluginPath);
  const manifest = await readPluginManifest(manifestPath);
  return {
    manifest,
    manifestPath,
    pluginRoot: dirname(manifestPath),
  };
}

function resolveEntryPath(pluginRoot: string, descriptor: { entry: string; name: string }) {
  const entryPath = isAbsolute(descriptor.entry) ? resolve(descriptor.entry) : resolve(pluginRoot, descriptor.entry);
  if (!isPathInside(pluginRoot, entryPath)) {
    throw new Error(`Plugin entry is outside the plugin directory: ${descriptor.entry}`);
  }
  return entryPath;
}

async function loadToolExport(pluginRoot: string, descriptor: PluginToolDescriptor): Promise<Tool> {
  const entryPath = resolveEntryPath(pluginRoot, descriptor);
  const source = await readFile(entryPath);
  const cacheKey = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const module = await import(`${pathToFileURL(entryPath).href}?v=${cacheKey}`);
  const exported = (module as Record<string, unknown>)[descriptor.exportName];
  if (!isTool(exported)) {
    throw new Error(`Plugin tool "${descriptor.name}" export "${descriptor.exportName}" is not a valid Xenesis tool.`);
  }
  if (exported.name !== descriptor.name) {
    throw new Error(`Plugin tool export name mismatch: manifest="${descriptor.name}", export="${exported.name}".`);
  }
  return exported;
}

export async function readPluginManifest(path: string): Promise<PluginManifest> {
  const manifestPath = await resolveManifestPath(path);
  const raw = await readFile(manifestPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return pluginManifestSchema.parse(parsed);
}

export async function loadPluginTools(options: LoadPluginToolsOptions): Promise<Tool[]> {
  const tools: Tool[] = [];
  const seen = new Set<string>();

  for (const path of options.paths) {
    const bundle = await readPluginBundle(options.workspaceRoot, path);
    for (const descriptor of bundle.manifest.tools) {
      const tool = await loadToolExport(bundle.pluginRoot, descriptor);
      if (seen.has(tool.name)) {
        throw new Error(`Plugin tool "${tool.name}" is already registered by another plugin.`);
      }
      seen.add(tool.name);
      tools.push(tool);
    }
  }

  return tools;
}

export async function loadPluginWorkflows(options: LoadPluginToolsOptions): Promise<PluginWorkflowDescriptor[]> {
  const workflows: PluginWorkflowDescriptor[] = [];
  const seen = new Set<string>();

  for (const path of options.paths) {
    const bundle = await readPluginBundle(options.workspaceRoot, path);
    for (const descriptor of bundle.manifest.workflows) {
      if (seen.has(descriptor.name)) {
        throw new Error(`Plugin workflow "${descriptor.name}" is already registered by another plugin.`);
      }
      seen.add(descriptor.name);
      workflows.push(descriptor);
    }
  }

  return workflows;
}

function isProviderFactory(value: unknown): value is ProviderFactory {
  return typeof value === 'function';
}

async function loadProviderExport(pluginRoot: string, descriptor: PluginProviderDescriptor): Promise<ProviderFactory> {
  const entryPath = resolveEntryPath(pluginRoot, descriptor);
  const source = await readFile(entryPath);
  const cacheKey = createHash('sha256').update(source).digest('hex').slice(0, 16);
  const module = await import(`${pathToFileURL(entryPath).href}?v=${cacheKey}`);
  const exported = (module as Record<string, unknown>)[descriptor.exportName];
  if (!isProviderFactory(exported)) {
    throw new Error(
      `Plugin provider "${descriptor.name}" export "${descriptor.exportName}" is not a function (ProviderFactory).`,
    );
  }
  return exported;
}

export async function loadPluginProviders(options: LoadPluginToolsOptions): Promise<void> {
  const tolerant = options.pluginLoadPolicy === 'tolerant';
  const seen = new Set<string>();
  for (const path of options.paths) {
    try {
      const bundle = await readPluginBundle(options.workspaceRoot, path);
      for (const descriptor of bundle.manifest.providers) {
        // Duplicate-name is a hard error regardless of policy: it signals a
        // configuration conflict, not a single faulty plugin to skip.
        if (seen.has(descriptor.name)) {
          throw new Error(`Plugin provider "${descriptor.name}" is already registered by another plugin.`);
        }
        seen.add(descriptor.name);
        const factory = await loadProviderExport(bundle.pluginRoot, descriptor);
        registerProviderFactory(descriptor.name, factory, descriptor.capabilities);
      }
    } catch (error) {
      // Tolerant policy: a provider plugin that throws at import/registration is
      // skipped so one faulty plugin cannot crash boot. Strict re-throws.
      if (!tolerant) throw error;
    }
  }
}

export async function createRuntimeToolRegistry(options: CreateRuntimeToolRegistryOptions): Promise<ToolRegistry> {
  const registry: ToolRegistry = new Map(options.baseTools);
  const pluginTools: Tool[] = [];
  for (const path of options.pluginPaths) {
    try {
      pluginTools.push(
        ...(await loadPluginTools({
          workspaceRoot: options.workspaceRoot,
          paths: [path],
        })),
      );
    } catch (error) {
      if (options.pluginLoadPolicy !== 'tolerant') throw error;
    }
  }

  for (const tool of pluginTools) {
    if (registry.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    registry.set(tool.name, tool);
  }

  return registry;
}

export async function diagnosePluginRuntime(options: LoadPluginToolsOptions): Promise<PluginRuntimeDiagnostic[]> {
  if (options.paths.length === 0) return [];

  const diagnostics: PluginRuntimeDiagnostic[] = [];
  for (const path of options.paths) {
    try {
      const bundle = await readPluginBundle(options.workspaceRoot, path);
      const tools = await loadPluginTools({
        workspaceRoot: options.workspaceRoot,
        paths: [path],
      });
      diagnostics.push({
        path,
        ok: true,
        pluginName: bundle.manifest.name,
        version: bundle.manifest.version,
        toolCount: tools.length,
        toolNames: tools.map((tool) => tool.name).sort((left, right) => left.localeCompare(right)),
        workflowCount: bundle.manifest.workflows.length,
        workflowNames: bundle.manifest.workflows
          .map((workflow) => workflow.name)
          .sort((left, right) => left.localeCompare(right)),
        mcpServerCount: Object.keys(bundle.manifest.mcpServers).length,
      });
    } catch (error) {
      diagnostics.push({
        path,
        ok: false,
        message: isNodeError(error) && error.code === 'ENOENT' ? `not found: ${path}` : errorMessage(error),
      });
    }
  }
  return diagnostics;
}
