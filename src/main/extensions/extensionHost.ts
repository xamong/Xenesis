import fs from 'node:fs';
import path from 'node:path';
import * as vm from 'node:vm';
import {
  canUseXenisPhase5XamongCodeCommand,
  canUseXenisPhase5XamongCodeTool,
  isXenisPhase5Enabled,
  type XenisPhase5VisibilityOptions,
} from '../../shared/phase5';
import type {
  AppSettings,
  ExtensionApi,
  ExtensionCommandContribution,
  ExtensionCommandDescriptor,
  ExtensionHostAction,
  ExtensionInfo,
  ExtensionLogEntry,
  ExtensionManifest,
  ExtensionMenuLocation,
  ExtensionOpenPanelOptions,
  ExtensionPanelPlacement,
  ExtensionPermission,
  ExtensionRunResult,
  ExtensionSource,
  ExtensionTool,
} from '../../shared/types';

type ExtensionCommandHandler = () => unknown | Promise<unknown>;

interface ExtensionHostOptions {
  builtinExtensionsDir: string;
  additionalBuiltinExtensionsDirs?: string[];
  userDataExtensionsDir: string;
  storageDir: string;
  getSettings(): AppSettings;
  saveSettings(settings: Partial<AppSettings>): AppSettings;
}

interface LoadedExtension {
  manifest: ExtensionManifest;
  extensionPath: string;
  mainPath: string;
  builtin: boolean;
  source: ExtensionSource;
  permissions: ExtensionPermission[];
  enabled: boolean;
  error?: string;
  logs: ExtensionLogEntry[];
  currentActions: ExtensionHostAction[] | null;
}

interface RegisteredCommand {
  extension: LoadedExtension;
  descriptor: ExtensionCommandDescriptor;
  handler?: ExtensionCommandHandler;
}

interface ExtensionRuntimeApi {
  registerCommand(commandId: string, handler: ExtensionCommandHandler): void;
  showInformationMessage(text: string): void;
  openTool(tool: ExtensionTool, options?: ExtensionOpenPanelOptions | ExtensionPanelPlacement): void;
  openPanel(title: string, html: string, options?: ExtensionOpenPanelOptions | ExtensionPanelPlacement): void;
  openMarkdown(title: string, content: string): void;
  openCode(title: string, content: string, language?: string): void;
  readTextFile(filePath: string): string;
  writeTextFile(filePath: string, content: string): void;
  getSettings(): AppSettings;
  updateSettings(settings: Partial<AppSettings>): AppSettings;
  storagePath: string;
  extensionPath: string;
}

const MENU_LOCATIONS: ExtensionMenuLocation[] = ['tools', 'commandPalette', 'settings'];
const EXTENSION_SOURCES: ExtensionSource[] = ['public', 'internal', 'user'];
const EXTENSION_PERMISSIONS: ExtensionPermission[] = [
  'commands',
  'files.read',
  'files.write',
  'settings.read',
  'settings.write',
  'tools.open',
  'panels.open',
];
const EXTENSION_TOOLS: ExtensionTool[] = [
  'xenesis-desk.core-tools.xamong-code-chat',
  'xenesis-desk.core-tools.xenesis-bot',
  'xenesis-desk.core-tools.ai-workbench',
  'xenesis-desk.core-tools.xenesis-agent-workbench',
  'xenesis-desk.core-tools.artifact-library',
  'xenesis-desk.core-tools.terminal-inspector',
  'xenesis-desk.core-tools.process-viewer',
  'xenesis-desk.core-tools.remote-sync-planner',
  'xenesis-desk.core-tools.run-task-panel',
  'xenesis-desk.core-tools.safe-file-edit-center',
  'xenesis-desk.core-tools.agent-sessions',
  'xenesis-desk.core-tools.xenesis-agent',
  'xenesis-desk.core-tools.hermes-status',
  'xenesis-desk.core-tools.hermes-action-inbox',
  'xenesis-desk.core-tools.capability-explorer',
  'xenesis-desk.core-tools.hermes-timeline',
  'xenesis-desk.core-tools.xapp-preview',
  'xenesis-desk.data-tools.meta-management',
  'xenesis-desk.data-tools.query-analyzer',
  'xenesis-desk.data-tools.query-analyzer-od',
  'xenesis-desk.data-tools.sqlite-server-settings',
  'xenesis-desk.workflow-runner.runner',
  'xenesis-desk.workflow-runner.demo-lab-playback',
  'xenesis-desk.workflow-runner.demo-lab-player',
  'xenesis-desk.workflow-runner.gowoori',
  'xenesis-desk.workflow-runner.gowoori-chat',
  'xenesis-desk.core-tools.activity-timeline',
  'xenesis-desk.core-tools.network-monitor',
  'xenesis-desk.core-tools.app-control-lab',
  'xenesis-desk.core-tools.xd-blaster',
  'xenesis-desk.core-tools.audit-log',
  'xenesis-desk.core-tools.agent-performance',
  'xenesis-desk.core-tools.memory-dashboard',
  'xenesis-desk.workflow-runner.alert-rules',
  'xenesis-desk.workflow-runner.template-catalog',
  'xenesis-desk.workflow-runner.artifact-versions',
  'xenesis-desk.obsidian-vault.viewer',
];

const EXTENSION_PANEL_PLACEMENTS = new Set<ExtensionPanelPlacement>(['tab', 'left', 'right', 'top', 'bottom']);

function normalizeOpenPanelOptions(
  value: ExtensionOpenPanelOptions | ExtensionPanelPlacement | undefined,
): ExtensionOpenPanelOptions {
  if (typeof value === 'string') {
    return EXTENSION_PANEL_PLACEMENTS.has(value) ? { placement: value } : {};
  }
  const object = asObject(value);
  if (!object) return {};
  const placement = asString(object.placement).trim();
  return EXTENSION_PANEL_PLACEMENTS.has(placement as ExtensionPanelPlacement)
    ? { placement: placement as ExtensionPanelPlacement }
    : {};
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeCommands(value: unknown): ExtensionCommandContribution[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item): ExtensionCommandContribution | null => {
      const object = asObject(item);
      if (!object) {
        return null;
      }
      const command = asString(object.command).trim();
      const title = asString(object.title).trim();
      if (!command || !title) {
        return null;
      }
      const contribution: ExtensionCommandContribution = {
        command,
        title,
      };
      const titleKey = asString(object.titleKey).trim();
      const category = asString(object.category).trim();
      const categoryKey = asString(object.categoryKey).trim();
      const icon = asString(object.icon).trim();
      if (titleKey) contribution.titleKey = titleKey;
      if (category) contribution.category = category;
      if (categoryKey) contribution.categoryKey = categoryKey;
      if (icon) contribution.icon = icon;
      return contribution;
    })
    .filter((item): item is ExtensionCommandContribution => Boolean(item));
}

function normalizeMenus(value: unknown): Partial<Record<ExtensionMenuLocation, string[]>> {
  const menus = asObject(value);
  if (!menus) {
    return {};
  }
  const normalized: Partial<Record<ExtensionMenuLocation, string[]>> = {};
  for (const location of MENU_LOCATIONS) {
    const rawItems = menus[location];
    if (!Array.isArray(rawItems)) {
      continue;
    }
    normalized[location] = rawItems.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  }
  return normalized;
}

function normalizeExtensionPermissions(value: unknown): ExtensionPermission[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value.filter(
        (item): item is ExtensionPermission =>
          typeof item === 'string' && EXTENSION_PERMISSIONS.includes(item as ExtensionPermission),
      ),
    ),
  );
}

function normalizeManifestSource(value: unknown): ExtensionSource | undefined {
  return typeof value === 'string' && EXTENSION_SOURCES.includes(value as ExtensionSource)
    ? (value as ExtensionSource)
    : undefined;
}

function normalizeManifest(raw: unknown): ExtensionManifest | null {
  const object = asObject(raw);
  if (!object) {
    return null;
  }
  const id = asString(object.id).trim();
  const name = asString(object.name).trim();
  const version = asString(object.version).trim();
  const main = asString(object.main).trim();
  if (!id || !name || !version || !main) {
    return null;
  }
  const contributes = asObject(object.contributes);
  return {
    id,
    name,
    version,
    publisher: asString(object.publisher).trim() || undefined,
    description: asString(object.description).trim() || undefined,
    source: normalizeManifestSource(object.source),
    permissions: normalizeExtensionPermissions(object.permissions),
    main,
    contributes: {
      commands: normalizeCommands(contributes?.commands),
      menus: normalizeMenus(contributes?.menus),
    },
  };
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
}

function listExtensionDirs(parentDir: string): string[] {
  if (!fs.existsSync(parentDir)) {
    return [];
  }
  return fs
    .readdirSync(parentDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(parentDir, entry.name));
}

function uniqueStrings(values: unknown): string[] {
  return Array.isArray(values)
    ? Array.from(new Set(values.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
    : [];
}

function isExtensionTool(value: string): value is ExtensionTool {
  return EXTENSION_TOOLS.includes(value as ExtensionTool);
}

export class ExtensionHost {
  private loaded = false;
  private extensions = new Map<string, LoadedExtension>();
  private commands = new Map<string, RegisteredCommand>();

  constructor(private readonly options: ExtensionHostOptions) {}

  listExtensions(): ExtensionInfo[] {
    this.ensureLoaded();
    return this.toExtensionInfos();
  }

  reload(): ExtensionInfo[] {
    this.loaded = false;
    this.extensions.clear();
    this.commands.clear();
    return this.listExtensions();
  }

  clearLogs(): void {
    this.ensureLoaded();
    for (const extension of this.extensions.values()) {
      extension.logs.splice(0, extension.logs.length);
      extension.error = undefined;
    }
  }

  retry(extensionId: string): ExtensionInfo[] {
    this.ensureLoaded();
    const existing = this.extensions.get(extensionId);
    if (!existing) {
      return this.toExtensionInfos();
    }
    this.extensions.delete(extensionId);
    this.removeCommandsForExtension(extensionId);
    this.loadExtension(existing.extensionPath, existing.builtin);
    return this.toExtensionInfos();
  }

  setEnabled(extensionId: string, enabled: boolean): ExtensionInfo[] {
    const current = this.options.getSettings().extensions;
    const disabledExtensionIds = new Set(uniqueStrings(current?.disabledExtensionIds));
    if (enabled) {
      disabledExtensionIds.delete(extensionId);
    } else {
      disabledExtensionIds.add(extensionId);
    }
    this.options.saveSettings({
      extensions: {
        disabledExtensionIds: Array.from(disabledExtensionIds),
        userExtensionsDir: current?.userExtensionsDir ?? '',
      },
    });
    return this.reload();
  }

  async runCommand(commandId: string): Promise<ExtensionRunResult> {
    this.ensureLoaded();
    if (!canUseXenisPhase5XamongCodeCommand(commandId, this.getPhase5VisibilityOptions())) {
      return {
        ok: false,
        commandId,
        error: 'XamongCode is hidden until XENIS_PHASE_5=true or featureFlags.xenisPhase5 is enabled.',
      };
    }
    const command = this.commands.get(commandId);
    if (!command?.extension.enabled) {
      return {
        ok: false,
        commandId,
        error: `Extension command is not available: ${commandId}`,
      };
    }
    if (!command.handler) {
      return {
        ok: false,
        commandId,
        error: `Extension command is not registered by its plugin: ${commandId}`,
      };
    }

    const actions: ExtensionHostAction[] = [];
    command.extension.currentActions = actions;
    try {
      await Promise.resolve(command.handler());
      return {
        ok: true,
        commandId,
        actions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.recordExtensionLog(command.extension, 'error', 'runtime', message);
      return {
        ok: false,
        commandId,
        error: message,
        actions,
      };
    } finally {
      command.extension.currentActions = null;
    }
  }

  private ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    fs.mkdirSync(this.resolveUserExtensionsDir(), { recursive: true });
    fs.mkdirSync(this.options.storageDir, { recursive: true });

    const builtinDirs = [
      this.options.builtinExtensionsDir,
      ...(this.options.additionalBuiltinExtensionsDirs ?? []),
    ].filter((dir, index, dirs) => Boolean(dir) && dirs.indexOf(dir) === index);

    for (const builtinDir of builtinDirs) {
      for (const extensionPath of listExtensionDirs(builtinDir)) {
        this.loadExtension(extensionPath, true);
      }
    }
    for (const extensionPath of listExtensionDirs(this.resolveUserExtensionsDir())) {
      this.loadExtension(extensionPath, false);
    }
  }

  private resolveUserExtensionsDir(): string {
    const configured = this.options.getSettings().extensions?.userExtensionsDir?.trim();
    return configured || this.options.userDataExtensionsDir;
  }

  private loadExtension(extensionPath: string, builtin: boolean): void {
    const manifestPath = path.join(extensionPath, 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      return;
    }
    let manifest: ExtensionManifest | null = null;
    let mainPath = extensionPath;
    let error: string | undefined;
    try {
      manifest = normalizeManifest(readJsonFile(manifestPath));
      if (!manifest) {
        error = 'plugin.json is missing required id, name, version, or main fields.';
        manifest = {
          id: path.basename(extensionPath),
          name: path.basename(extensionPath),
          version: '0.0.0',
          main: 'main.js',
          contributes: { commands: [], menus: {} },
        };
      }
      mainPath = path.resolve(extensionPath, manifest.main);
    } catch (readError) {
      error = readError instanceof Error ? readError.message : String(readError);
      manifest = {
        id: path.basename(extensionPath),
        name: path.basename(extensionPath),
        version: '0.0.0',
        main: 'main.js',
        contributes: { commands: [], menus: {} },
      };
    }

    const disabledExtensionIds = new Set(uniqueStrings(this.options.getSettings().extensions?.disabledExtensionIds));
    const extension: LoadedExtension = {
      manifest,
      extensionPath,
      mainPath,
      builtin,
      source: this.normalizeExtensionSource(manifest, builtin),
      permissions: normalizeExtensionPermissions(manifest.permissions),
      enabled: !disabledExtensionIds.has(manifest.id),
      error,
      logs: [],
      currentActions: null,
    };

    if (error) {
      this.recordExtensionLog(extension, 'error', 'manifest', error);
    }

    this.extensions.set(manifest.id, extension);
    for (const contribution of manifest.contributes?.commands ?? []) {
      this.commands.set(contribution.command, {
        extension,
        descriptor: this.createCommandDescriptor(extension, contribution),
      });
    }

    if (!extension.enabled || extension.error) {
      return;
    }

    try {
      const source = fs.readFileSync(mainPath, 'utf8');
      const script = new vm.Script(source, { filename: mainPath });
      const exportsObject: Record<string, unknown> = {};
      const moduleObject = { exports: exportsObject };
      const context = vm.createContext({
        console,
        exports: exportsObject,
        module: moduleObject,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
      });
      script.runInContext(context, { timeout: 5000 });
      const activatedModule = moduleObject.exports as { activate?: (api: ExtensionRuntimeApi) => unknown };
      if (typeof activatedModule.activate === 'function') {
        activatedModule.activate(this.createRuntimeApi(extension));
      }
    } catch (activationError) {
      const message = activationError instanceof Error ? activationError.message : String(activationError);
      extension.error = message;
      this.recordExtensionLog(extension, 'error', 'activation', message);
    }
  }

  private normalizeExtensionSource(manifest: ExtensionManifest, builtin: boolean): ExtensionSource {
    if (!builtin) {
      return 'user';
    }
    if (manifest.source === 'public' || manifest.id.startsWith('sample.')) {
      return 'public';
    }
    return 'internal';
  }

  private removeCommandsForExtension(extensionId: string): void {
    for (const [commandId, command] of this.commands.entries()) {
      if (command.extension.manifest.id === extensionId) {
        this.commands.delete(commandId);
      }
    }
  }

  private recordExtensionLog(
    extension: LoadedExtension,
    level: ExtensionLogEntry['level'],
    phase: ExtensionLogEntry['phase'],
    message: string,
  ): void {
    extension.logs.push({
      timestamp: Date.now(),
      level,
      phase,
      message,
    });
  }

  private createRuntimeApi(extension: LoadedExtension): ExtensionRuntimeApi {
    const storagePath = path.join(this.options.storageDir, extension.manifest.id);
    fs.mkdirSync(storagePath, { recursive: true });
    return {
      registerCommand: (commandId, handler) => {
        if (!commandId || typeof handler !== 'function') {
          throw new Error('registerCommand requires a command id and handler.');
        }
        const contribution = extension.manifest.contributes?.commands?.find(
          (command) => command.command === commandId,
        ) ?? {
          command: commandId,
          title: commandId,
        };
        this.commands.set(commandId, {
          extension,
          descriptor: this.createCommandDescriptor(extension, contribution),
          handler,
        });
      },
      showInformationMessage: (text) => this.pushAction(extension, { type: 'message', text: String(text) }),
      openTool: (tool, options) => {
        const normalizedTool = String(tool).trim();
        if (!isExtensionTool(normalizedTool)) {
          throw new Error(`Unknown extension tool: ${normalizedTool}`);
        }
        if (!canUseXenisPhase5XamongCodeTool(normalizedTool, this.getPhase5VisibilityOptions())) {
          throw new Error('XamongCode is hidden until XENIS_PHASE_5=true or featureFlags.xenisPhase5 is enabled.');
        }
        const openToolOptions = normalizeOpenPanelOptions(options);
        this.pushAction(extension, { type: 'openTool', tool: normalizedTool, placement: openToolOptions.placement });
      },
      openPanel: (title, html, options) => {
        const openPanelOptions = normalizeOpenPanelOptions(options);
        this.pushAction(extension, {
          type: 'openPanel',
          title: String(title),
          html: String(html),
          placement: openPanelOptions.placement,
        });
      },
      openMarkdown: (title, content) =>
        this.pushAction(extension, { type: 'openMarkdown', title: String(title), content: String(content) }),
      openCode: (title, content, language) =>
        this.pushAction(extension, {
          type: 'openCode',
          title: String(title),
          content: String(content),
          language: typeof language === 'string' ? language : undefined,
        }),
      readTextFile: (filePath) => fs.readFileSync(path.resolve(filePath), 'utf8'),
      writeTextFile: (filePath, content) => {
        fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
        fs.writeFileSync(path.resolve(filePath), content, 'utf8');
      },
      getSettings: () => this.options.getSettings(),
      updateSettings: (settings) => this.options.saveSettings(settings),
      storagePath,
      extensionPath: extension.extensionPath,
    };
  }

  private pushAction(extension: LoadedExtension, action: ExtensionHostAction): void {
    if (!extension.currentActions) {
      return;
    }
    extension.currentActions.push({
      ...action,
      extensionId: extension.manifest.id,
    });
  }

  private createCommandDescriptor(
    extension: LoadedExtension,
    contribution: ExtensionCommandContribution,
  ): ExtensionCommandDescriptor {
    return {
      id: contribution.command,
      title: contribution.title,
      titleKey: contribution.titleKey,
      category: contribution.category,
      categoryKey: contribution.categoryKey,
      icon: contribution.icon,
      extensionId: extension.manifest.id,
      extensionName: extension.manifest.name,
      enabled: extension.enabled,
      menuLocations: this.getMenuLocations(extension.manifest, contribution.command),
    };
  }

  private getMenuLocations(manifest: ExtensionManifest, commandId: string): ExtensionMenuLocation[] {
    const menus = manifest.contributes?.menus ?? {};
    const locations = MENU_LOCATIONS.filter((location) => menus[location]?.includes(commandId));
    return locations.length > 0 ? locations : ['commandPalette'];
  }

  private toExtensionInfos(): ExtensionInfo[] {
    const phase5Options = this.getPhase5VisibilityOptions();
    return Array.from(this.extensions.values()).map((extension) => ({
      id: extension.manifest.id,
      name: extension.manifest.name,
      version: extension.manifest.version,
      publisher: extension.manifest.publisher,
      description: extension.manifest.description,
      path: extension.extensionPath,
      main: extension.manifest.main,
      builtin: extension.builtin,
      source: extension.source,
      permissions: extension.permissions,
      enabled: extension.enabled,
      error: extension.error,
      logs: extension.logs.map((log) => ({ ...log })),
      commands: Array.from(this.commands.values())
        .filter((command) => command.extension.manifest.id === extension.manifest.id)
        .filter((command) => canUseXenisPhase5XamongCodeCommand(command.descriptor.id, phase5Options))
        .map((command) => ({
          ...command.descriptor,
          enabled: extension.enabled && Boolean(command.handler) && !extension.error,
        })),
    }));
  }

  private getPhase5VisibilityOptions(): XenisPhase5VisibilityOptions {
    return {
      xenisPhase5: isXenisPhase5Enabled(this.options.getSettings(), process.env),
    };
  }
}

export type { ExtensionApi };
