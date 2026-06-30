import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  type AppMenuActionId,
  type AppMenuActionNode,
  type AppMenuCommandNode,
  type ResolvedRendererMenuGroup,
  type ResolvedRendererMenuItem,
  resolveRendererToolsMenu,
} from '../shared/appMenuModel';
import { filterXenisPhase5ExtensionCommands, isXenisPhase5EnabledFromSettings } from '../shared/phase5';
import type {
  AiProviderKind,
  AiProviderSettings,
  AppSettings,
  AutomationApi,
  CapturePaneResult,
  CommandShortcutBinding,
  DetachPayload,
  ExtensionCommandDescriptor,
  ExtensionHostAction,
  ExtensionPanelPlacement,
  LocalTerminalProfile,
  McpBridgeBrowserActionPayload,
  McpBridgeBrowserActionResult,
  McpBridgeCaptureActivePanePayload,
  McpBridgeCaptureActivePaneResult,
  McpBridgeDemoLabPlaybackControlPayload,
  McpBridgeDemoLabPlaybackControlResult,
  McpBridgeDockActionPayload,
  McpBridgeDockActionResult,
  McpBridgeExplorerActionPayload,
  McpBridgeExplorerActionResult,
  McpBridgeFavoritesActionPayload,
  McpBridgeFavoritesActionResult,
  McpBridgeGowooriArtifactVisibilityPayload,
  McpBridgeGowooriArtifactVisibilityResult,
  McpBridgeGowooriOverlayPayload,
  McpBridgeGowooriOverlayResult,
  McpBridgeOnboardingDemoModeRunPayload,
  McpBridgeOnboardingDemoModeRunResult,
  McpBridgeOnboardingRunPreviewPayload,
  McpBridgeOnboardingRunPreviewResult,
  McpBridgeOnboardingScenarioRunPayload,
  McpBridgeOnboardingScenarioRunResult,
  McpBridgeOnboardingStepActionPayload,
  McpBridgeOnboardingStepActionResult,
  McpBridgeOpenBrowserPayload,
  McpBridgeOpenBuiltinPanePayload,
  McpBridgeOpenBuiltinPaneResult,
  McpBridgeOpenTerminalPayload,
  McpBridgeRemoteExplorerActionPayload,
  McpBridgeRemoteExplorerActionResult,
  McpBridgeRendererPerformanceTraceRequest,
  McpBridgeRendererPerformanceTraceResult,
  McpBridgeRendererPerformanceTraceSnapshot,
  McpBridgeRendererStateSnapshot,
  McpBridgeTerminalUiActionPayload,
  McpBridgeTerminalUiActionResult,
  OnboardingSettings,
  OpenFileResult,
  RemoteFileProfile,
  RemoteTerminalProfile,
  RenderOptions,
  ShellDescriptor,
  ShellKind,
  TerminalProfileGroup,
  TerminalRestoreSettings,
  TerminalSessionSnapshot,
  TerminalSpawnConfig,
  ThemeName,
  UpdaterStatus,
  WindowBounds,
  WindowSizerPreset,
  WorkspaceOpenResult,
  WorkspaceProfile,
  WorkspaceRecentItem,
} from '../shared/types';
import { XENESIS_TUI_CAPABILITY_PATH } from '../shared/xenesisTui';
import {
  type AuthUser,
  authApiLoadUser,
  authApiLogin,
  authApiLogout,
  authApiRegister,
  authGetErrorMessage,
} from './auth/authApi';
import DockHost from './dock/DockHost';
import {
  type Bounds,
  type DockContent,
  DockEngine,
  type DropPayload,
  type SavedLayout,
  STORAGE_KEY,
} from './dock/engine';
import { type DetachMode } from './dock/useDragManager';
import { useI18n } from './i18n';
import {
  type CmdShortcut,
  createWorkBlock,
  createWorkBlockExportPayload,
  deleteWorkBlock,
  duplicateWorkBlock,
  loadHistory,
  loadShortcuts,
  loadWorkBlocks,
  MAX_WORK_BLOCKS,
  mergeImportedWorkBlocks,
  parseWorkBlockImportPayload,
  pushHistory,
  saveHistory,
  saveShortcuts,
  saveWorkBlocks,
  type TerminalWorkBlock,
  touchWorkBlockRun,
  updateWorkBlock,
} from './terminal/commandStore';
import { terminalHost } from './terminal/terminalHost';
import {
  buildLocalTerminalProfileFromSession,
  buildTerminalProfileSettingsTarget,
} from './terminal/terminalProfileSnapshot';
import { selectXenesisTuiShell } from './terminal/xenesisTuiTerminal';
import {
  mergeWorkspaceRemoteFileSettings,
  mergeWorkspaceRemoteTerminalSettings,
} from './utils/remoteProfilePersistence';

declare global {
  interface Window {
    automationAPI?: AutomationApi;
    __xenesisSettingsOpenTarget?: {
      category?: unknown;
      mode?: unknown;
      section?: unknown;
      focusConnectionId?: unknown;
      focusConnectionDetail?: unknown;
      ensureVisible?: unknown;
      selectedTerminalProfileId?: unknown;
      pendingLocalTerminalProfile?: unknown;
      expiresAt?: number;
      nonce?: number;
    };
  }
}

import { deskBridge, getDeskBridgeApi } from './deskBridge';
import { openExtensionTool, useRendererExtensionEvents } from './extensions/registry';
import {
  buildFileBotContextMessage,
  buildTerminalBotContextMessageFromSession,
} from './extensions/xenesis-desk.core-tools/xenisBotContext';
import {
  GOWOORI_OVERLAY_HIDE_EVENT,
  GOWOORI_OVERLAY_SHOW_EVENT,
  type GowooriOverlayHideDetail,
  type GowooriOverlayShowDetail,
} from './extensions/xenesis-desk.workflow-runner/gowoori/shared/gowooriEvents';
import {
  GowooriGlobalOverlay,
  type GowooriGlobalOverlayState,
} from './extensions/xenesis-desk.workflow-runner/gowoori/viewer/GowooriGlobalOverlay';
import {
  eventToAccelerator,
  isEditableKeyboardTarget,
  normalizeAccelerator,
  normalizeCommandShortcutBindings,
} from './keyboardShortcuts';
import {
  installRendererProducerObservability,
  uninstallRendererProducerObservability,
} from './observability/rendererProducerObservability';
import { runBrowserPaneAction } from './panes/BrowserPane';
import type {
  CommandCenterPaneProps,
  CommandCenterTargetGroup,
  CommandCenterTerminalTarget,
  CommandSendMode,
  CommandTargetMode,
} from './panes/CommandCenterPane';
import {
  type CommandInputMode,
  type CommandLineEnding,
  commandLineEndingSequence,
  formatCommandCenterTerminalLabel,
  syncCommandCenterSelectedTerminalIds,
} from './panes/commandCenterModel';
import { FavoritesPane } from './panes/FavoritesPane';
import { FileExplorerPane } from './panes/FileExplorerPane';
import { BASIC_DESK_ONBOARDING_STEP_IDS, BASIC_DESK_ONBOARDING_STEPS } from './panes/onboarding/basicDeskSteps';
import {
  getOnboardingSampleFilePath,
  getOnboardingWorkspaceProfilePath,
  ONBOARDING_SAMPLE_WELCOME_FILE_NAME,
  type OnboardingRuntimeSnapshot,
  verifyBasicDeskOnboardingStep,
} from './panes/onboarding/onboardingRuntime';
import type {
  OnboardingStepVerificationResult,
  OnboardingVerificationContext,
} from './panes/onboarding/onboardingTypes';
import { ThemeContext } from './ThemeContext';
import {
  dispatchLocalExplorerAction,
  dispatchRemoteExplorerAction,
  LOCAL_EXPLORER_NAVIGATE_EVENT,
  type LocalExplorerNavigateRequest,
  OPEN_LOCAL_FILE_EVENT,
  OPEN_REMOTE_FILE_EVENT,
  type OpenLocalFileRequest,
  type OpenRemoteFileRequest,
  setRemoteExplorerNavigateHandoff,
} from './utils/explorerNavigationEvents';
import {
  addFavorite,
  type FavoriteItem,
  labelFromPath,
  labelFromUrl,
  loadFavorites,
  loadSplitRatio,
  removeFavorite,
  saveFavorites,
  saveSplitRatio,
} from './utils/favoriteStore';
import {
  clearRendererPerformanceTrace,
  createRendererPerformanceTraceSummary,
  getRendererPerformanceTraceSetting,
  getRendererPerformanceTraceSnapshot,
  setRendererPerformanceTraceSetting,
  subscribeRendererPerformanceTrace,
} from './utils/performanceTrace';
import { sendXenesisContextMessage } from './utils/xenesisContextSend';

type PaletteCommand = {
  id: string;
  commandId?: string;
  label: string;
  category?: string;
  searchText?: string;
  available: boolean;
  action: () => void;
};

type WorkBlockDraft = Pick<TerminalWorkBlock, 'label' | 'command' | 'group' | 'cwd' | 'terminalKind'>;
type WorkBlockSortMode = 'recent' | 'runs' | 'label';

const EMPTY_WORK_BLOCK_DRAFT: WorkBlockDraft = {
  label: '',
  command: '',
  group: '',
  cwd: '',
  terminalKind: '',
};

function buildWorkBlockCommandId(block: TerminalWorkBlock): string {
  return `terminal-work-block:${block.id}`;
}

function compareWorkBlockLabels(a: TerminalWorkBlock, b: TerminalWorkBlock): number {
  return a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
}

function compareWorkBlocksBySortMode(a: TerminalWorkBlock, b: TerminalWorkBlock, mode: WorkBlockSortMode): number {
  if (mode === 'runs') {
    return b.runCount - a.runCount || b.updatedAt - a.updatedAt || compareWorkBlockLabels(a, b);
  }
  if (mode === 'label') {
    return compareWorkBlockLabels(a, b);
  }
  return b.updatedAt - a.updatedAt || compareWorkBlockLabels(a, b);
}

function clampCommandSequentialDelayMs(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(30000, Math.round(value)));
}

function delayCommandDispatch(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function getPaletteSearchText(command: PaletteCommand, shortcut: string): string {
  return [command.label, command.category, command.searchText, shortcut]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();
}

function escapeMcpCaptureSelectorValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const DEFAULT_GOWOORI_VISIBILITY_COMPONENTS = ['chart', 'spanGrid', 'map'];

const GOWOORI_VISIBILITY_SELECTOR_MAP: Record<string, string[]> = {
  chart: [
    '[data-xcon-type="chart"]',
    '[data-component="chart"]',
    '[data-xcon-chart-type]',
    '[data-xcon-chart-data]',
    '.xa-chart-container',
    '.xa-chart-preview',
    '.xa-chart',
    '.xcon-chart',
    'canvas',
    'svg',
  ],
  spangrid: [
    '[data-xcon-type="spanGrid"]',
    '[data-xcon-type="spangrid"]',
    '[data-component="spanGrid"]',
    '[data-component="spangrid"]',
    '[data-xcon-spangrid]',
    '[data-xcon-spangrid-options]',
    '[data-xcon-spangrid-surface]',
    '.xa-spangrid-container',
    '.xa-spangrid-surface',
    '.xa-spangrid-table',
    '.xa-span-grid',
    '.xa-spangrid',
    '.span-grid',
    '.span-grid-html-layer',
    '.span-grid-html-cell',
  ],
  map: [
    '[data-xcon-type="map"]',
    '[data-component="map"]',
    '[data-xcon-leaflet-map]',
    '[data-xcon-map-provider]',
    '.xa-map-container',
    '.xa-map-static',
    '.xa-map-snapshot',
    '.xa-map-marker',
    '.xa-map',
    '.xcon-leaflet-marker',
    '.leaflet-container',
  ],
  networkdiagram: [
    '[data-xcon-type="networkDiagram"]',
    '[data-xcon-type="networkdiagram"]',
    '[data-component="networkDiagram"]',
    '[data-component="networkdiagram"]',
    '.xa-network-diagram',
  ],
  banner: ['[data-xcon-type="banner"]', '[data-component="banner"]', '.xa-banner'],
  qrcode: [
    '[data-xcon-type="qrCode"]',
    '[data-xcon-type="qrcode"]',
    '[data-component="qrCode"]',
    '[data-component="qrcode"]',
    '.xa-qr-code',
    'canvas',
    'svg',
  ],
  button: ['[data-xcon-type="button"]', '[data-component="button"]', '.xa-button', 'button'],
  image: ['[data-xcon-type="image"]', '[data-component="image"]', '.xa-image', 'img'],
};

function normalizeGowooriVisibilityComponent(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/[\s_-]+/g, '')
    .toLowerCase();
}

function displayGowooriVisibilityComponent(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const normalized = normalizeGowooriVisibilityComponent(raw);
  if (normalized === 'spangrid') return 'spanGrid';
  if (normalized === 'networkdiagram') return 'networkDiagram';
  if (normalized === 'qrcode') return 'qrCode';
  return raw;
}

function getGowooriVisibilitySelectors(component: string): string[] {
  return (
    GOWOORI_VISIBILITY_SELECTOR_MAP[normalizeGowooriVisibilityComponent(component)] ?? [
      `[data-xcon-type="${escapeMcpCaptureSelectorValue(component)}"]`,
      `[data-component="${escapeMcpCaptureSelectorValue(component)}"]`,
      `.${escapeMcpCaptureSelectorValue(component)}`,
    ]
  );
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
  });
}

function waitForGowooriVisibilityRetry(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, Math.max(0, ms));
  });
}

function isElementVisiblyPainted(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  const opacity = Number.parseFloat(style.opacity || '1');
  return !Number.isFinite(opacity) || opacity > 0.01;
}

function queryGowooriVisibilityCandidatesDeep(root: HTMLElement | ShadowRoot, selector: string): HTMLElement[] {
  const matches: HTMLElement[] = [];

  if (root instanceof HTMLElement && root.matches(selector)) {
    matches.push(root);
  }

  matches.push(...Array.from(root.querySelectorAll<HTMLElement>(selector)));

  const descendants =
    root instanceof HTMLElement
      ? Array.from(root.querySelectorAll<HTMLElement>('*'))
      : Array.from(root.querySelectorAll<HTMLElement>('*'));
  for (const element of descendants) {
    if (element.shadowRoot) {
      matches.push(...queryGowooriVisibilityCandidatesDeep(element.shadowRoot, selector));
    }
  }

  return matches;
}

function findFirstGowooriVisibilityCandidate(
  root: HTMLElement,
  selectors: string[],
): { element: HTMLElement; selector: string } | null {
  for (const selector of selectors) {
    const candidates = queryGowooriVisibilityCandidatesDeep(root, selector);
    for (const element of candidates) {
      if (!isElementVisiblyPainted(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width >= 1 && rect.height >= 1) {
        return { element, selector };
      }
    }
  }
  return null;
}

function measureGowooriComponentVisibility(
  component: string,
  selector: string,
  element: HTMLElement | null,
  viewport: DOMRect,
): McpBridgeGowooriArtifactVisibilityResult['components'][number] {
  if (!element) {
    return {
      component,
      selector,
      present: false,
      visible: false,
      viewport: {
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      },
      error: `Component was not found: ${component}`,
    };
  }

  const rect = element.getBoundingClientRect();
  const intersectLeft = Math.max(rect.left, viewport.left);
  const intersectTop = Math.max(rect.top, viewport.top);
  const intersectRight = Math.min(rect.right, viewport.right);
  const intersectBottom = Math.min(rect.bottom, viewport.bottom);
  const intersectWidth = Math.max(0, intersectRight - intersectLeft);
  const intersectHeight = Math.max(0, intersectBottom - intersectTop);
  const area = Math.max(1, rect.width * rect.height);
  const visibleArea = intersectWidth * intersectHeight;
  const visibleRatio = visibleArea / area;
  return {
    component,
    selector,
    present: true,
    visible:
      isElementVisiblyPainted(element) &&
      rect.width >= 1 &&
      rect.height >= 1 &&
      intersectWidth >= 8 &&
      intersectHeight >= 8,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    visibleRatio: Math.round(visibleRatio * 1000) / 1000,
    viewport: {
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
    },
  };
}

// ─── 셸 레이블 ──────────────────────────────────────────────────────────────
function joinLocalPath(base?: string | null, child = ''): string {
  const cleanBase = String(base ?? '')
    .trim()
    .replace(/[\\/]+$/, '');
  const cleanChild = child.trim().replace(/^[\\/]+/, '');
  if (!cleanBase) return cleanChild;
  if (!cleanChild) return cleanBase;
  const sep = cleanBase.includes('/') && !cleanBase.includes('\\') ? '/' : '\\';
  return `${cleanBase}${sep}${cleanChild}`;
}

function xenesisWorkspaceFromExplorerSelection(pathValue: string, isDirectory: boolean): string {
  const normalized = String(pathValue || '').trim();
  if (!normalized) return '';
  if (isDirectory) return normalized.replace(/[\\/]+$/, '');
  return normalized.replace(/[\\/][^\\/]+$/, '') || normalized;
}

const SHELL_LABEL: Record<ShellKind, string> = {
  powershell: 'PowerShell',
  cmd: 'CMD',
  pwsh: 'Pwsh',
  wsl: 'WSL',
  zsh: 'Zsh',
  bash: 'Bash',
  sh: 'sh',
};

function createShellCounter(): Record<ShellKind, number> {
  return {
    powershell: 0,
    cmd: 0,
    pwsh: 0,
    wsl: 0,
    zsh: 0,
    bash: 0,
    sh: 0,
  };
}

const FALLBACK_SHELL_DESCRIPTORS: ShellDescriptor[] = [
  { kind: 'powershell', label: 'Windows PowerShell', command: 'powershell.exe', available: true },
  { kind: 'cmd', label: 'Command Prompt', command: 'cmd.exe', available: true },
  { kind: 'pwsh', label: 'PowerShell 7+', command: 'pwsh.exe', available: false },
  { kind: 'wsl', label: 'WSL', command: 'wsl.exe', available: false },
];

// ─── AI 프로바이더 메타데이터 ────────────────────────────────────────────────

interface ProviderMeta {
  label: string;
  defaultModel: string;
  models: string[];
  needsKey: boolean;
  defaultBaseUrl: string;
}

const AI_PROVIDERS: Record<AiProviderKind, ProviderMeta> = {
  auto: {
    label: 'Auto (detect)',
    defaultModel: '',
    models: [],
    needsKey: false,
    defaultBaseUrl: '',
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1', 'o3-mini'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  anthropic: {
    label: 'Anthropic',
    defaultModel: 'claude-opus-4-5',
    models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-3-5-haiku-20241022'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  gemini: {
    label: 'Google Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    models: ['openai/gpt-4o-mini', 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet'],
    needsKey: true,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
  },
  groq: {
    label: 'Groq',
    defaultModel: 'llama-3.1-8b-instant',
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    needsKey: true,
    defaultBaseUrl: 'https://api.deepseek.com',
  },
  qwen: {
    label: 'Qwen',
    defaultModel: 'qwen-plus',
    models: ['qwen-plus', 'qwen-turbo', 'qwen-max'],
    needsKey: true,
    defaultBaseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
  },
  mistral: {
    label: 'Mistral',
    defaultModel: 'mistral-large-latest',
    models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
    needsKey: true,
    defaultBaseUrl: 'https://api.mistral.ai/v1',
  },
  xai: {
    label: 'xAI',
    defaultModel: 'grok-2-latest',
    models: ['grok-2-latest'],
    needsKey: true,
    defaultBaseUrl: 'https://api.x.ai/v1',
  },
  ollama: {
    label: 'Ollama (Local)',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'phi3', 'qwen2.5'],
    needsKey: false,
    defaultBaseUrl: 'http://localhost:11434',
  },
  lmstudio: {
    label: 'LM Studio',
    defaultModel: 'local-model',
    models: ['local-model'],
    needsKey: false,
    defaultBaseUrl: 'http://localhost:1234',
  },
  together: {
    label: 'Together AI',
    defaultModel: 'meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo',
    models: ['meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  fireworks: {
    label: 'Fireworks AI',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-8b-instruct',
    models: ['accounts/fireworks/models/llama-v3p1-8b-instruct'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  azure: {
    label: 'Azure OpenAI',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4-turbo'],
    needsKey: true,
    defaultBaseUrl: '',
  },
  'codex-cli': {
    label: 'Codex CLI (Local)',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5', 'gpt-5-codex'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'codex-app-server': {
    label: 'Codex App Server (Local)',
    defaultModel: 'gpt-5.5',
    models: ['gpt-5.5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'claude-cli': {
    label: 'Claude CLI (Local)',
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-sonnet-4-5', 'claude-opus-4-5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
  'claude-interactive': {
    label: 'Claude Interactive (Local)',
    defaultModel: 'claude-sonnet-4-5',
    models: ['claude-sonnet-4-5'],
    needsKey: false,
    defaultBaseUrl: '',
  },
};

const DEFAULT_AI_PROVIDER: AiProviderSettings = {
  provider: 'auto',
  model: '',
  apiKey: '',
  baseUrl: '',
  xcAgentApiUrl: '',
  xcApiUrl: '',
  labApiUrl: 'http://127.0.0.1:3845',
};

const DEFAULT_UPDATER_STATUS: UpdaterStatus = {
  state: 'idle',
  channel: 'public-stable',
  feedUrl: 'https://update.xamong.com/xenesis-desk/',
  autoCheck: true,
};

const EXT_FILE_DRAG_IDLE_RESET_MS = 450;

const COMMAND_CENTER_CONTENT_ID = 'xenesis-command-center';
const XENESIS_AGENT_CONTENT_ID = 'xenesis-agent-default';
const MCP_RENDERER_PERFORMANCE_TRACE_RECENT_LIMIT = 20;
const MCP_RENDERER_PERFORMANCE_TRACE_SUMMARY_LIMIT = 10;

function createEngine(onUpdate: () => void): DockEngine {
  return new DockEngine(onUpdate);
}

function ensureCommandCenterContent(engine: DockEngine): void {
  if (engine.contents.has(COMMAND_CENTER_CONTENT_ID)) return;
  engine.addContent({
    id: COMMAND_CENTER_CONTENT_ID,
    title: 'Command Center',
    state: 'bottom',
    html: '',
    hideOnClose: true,
    contentType: 'command-center',
  });
}

function ensureXenesisAgentContent(engine: DockEngine): void {
  const DEFAULT_XENESIS_AGENT_RIGHT_WIDTH = 560;
  for (const content of engine.contents.values()) {
    if (content.contentType === 'xenesis-agent') return;
  }
  engine.setSizes({ right: DEFAULT_XENESIS_AGENT_RIGHT_WIDTH });
  engine.addContent({
    id: XENESIS_AGENT_CONTENT_ID,
    title: 'Xenesis Agent',
    state: 'right',
    html: '',
    hideOnClose: true,
    contentType: 'xenesis-agent',
  });
}

function buildMcpRendererPerformanceTraceSnapshot(): McpBridgeRendererPerformanceTraceSnapshot {
  const setting = getRendererPerformanceTraceSetting().trim();
  const items = getRendererPerformanceTraceSnapshot();
  return {
    enabled: Boolean(setting),
    setting,
    itemCount: items.length,
    recent: items.slice(-MCP_RENDERER_PERFORMANCE_TRACE_RECENT_LIMIT),
    summary: createRendererPerformanceTraceSummary(items).slice(0, MCP_RENDERER_PERFORMANCE_TRACE_SUMMARY_LIMIT),
  };
}

interface McpRendererStateContext {
  currentWorkspacePath?: string;
  workspaceProfilePath?: string;
  workspaceAutoRestore?: boolean;
  explorerOpen?: boolean;
  explorerRootDir?: string;
  explorerSelectedPath?: string;
  explorerSelectedIsDir?: boolean;
}

function buildMcpRendererStateSnapshot(
  engine: DockEngine,
  context: McpRendererStateContext = {},
): McpBridgeRendererStateSnapshot {
  const contentPaneIds = new Map<string, string>();
  const panes = [...engine.panes.values()].map((pane) => {
    for (const contentId of pane.contents) contentPaneIds.set(contentId, pane.id);
    return {
      id: pane.id,
      state: pane.state,
      activeContentId: pane.activeContentId,
      contents: [...pane.contents],
      group: pane.group,
      isArtifactTarget: engine.artifactPaneId === pane.id,
    };
  });

  const terminalSessionsById = new Map(terminalHost.listSessions().map((session) => [session.id, session]));
  const contents = [...engine.contents.values()].map((content) => ({
    id: content.id,
    title: content.title,
    contentType: content.contentType,
    paneId: contentPaneIds.get(content.id),
    state: content.state,
    filePath: content.filePath,
    fileName: content.fileName,
    fileExt: content.fileExt,
    fileOrigin: content.fileOrigin,
    remoteFilePath: content.remoteFilePath,
    termId: content.termId,
    terminalMetadata: content.terminalRestore?.metadata,
    terminalImageAddonLoaded: content.termId ? terminalSessionsById.get(content.termId)?.imageAddonLoaded : undefined,
    terminalImageAddonUnavailableReason: content.termId
      ? terminalSessionsById.get(content.termId)?.imageAddonUnavailableReason
      : undefined,
    url: content.url,
    renderOptions: content.renderOptions,
  }));

  return {
    reportedAt: new Date().toISOString(),
    activePaneId: engine.activePaneId,
    artifactPaneId: engine.artifactPaneId,
    panes,
    contents,
    openFiles: contents
      .filter((content) => Boolean(content.filePath))
      .map((content) => ({
        contentId: content.id,
        paneId: content.paneId,
        filePath: content.filePath || '',
        fileName: content.fileName,
        fileExt: content.fileExt,
        fileOrigin: content.fileOrigin,
        remoteFilePath: content.remoteFilePath,
        state: content.state,
        title: content.title,
      })),
    panels: contents
      .filter((content) => content.contentType === 'extension-panel')
      .map((content) => ({
        contentId: content.id,
        paneId: content.paneId,
        title: content.title,
        state: content.state,
      })),
    workspace: {
      currentPath: context.currentWorkspacePath || '',
      ...(context.workspaceProfilePath ? { profilePath: context.workspaceProfilePath } : {}),
      autoRestore: context.workspaceAutoRestore === true,
    },
    explorer: {
      open: context.explorerOpen === true,
      rootDir: context.explorerRootDir || context.currentWorkspacePath || '',
      ...(context.explorerSelectedPath ? { selectedPath: context.explorerSelectedPath } : {}),
      selectedIsDir: context.explorerSelectedIsDir === true,
    },
    performanceTrace: buildMcpRendererPerformanceTraceSnapshot(),
  };
}

function collectTerminalIdsFromEngine(engine: DockEngine): Set<string> {
  const ids = new Set<string>();
  for (const content of engine.contents.values()) {
    if (content.contentType === 'terminal' && content.termId) ids.add(content.termId);
  }
  return ids;
}

function collectTerminalIdsFromSavedLayout(layout: SavedLayout): Set<string> {
  const ids = new Set<string>();
  const contents = Array.isArray(layout.contents) ? layout.contents : [];
  for (const content of contents) {
    if (content.contentType === 'terminal' && content.termId) ids.add(content.termId);
  }
  return ids;
}

function syncFloatBoundsMapFromEngine(engine: DockEngine, boundsMap: Map<string, Bounds>): void {
  boundsMap.clear();
  for (const pane of engine.panes.values()) {
    if (pane.state === 'float') boundsMap.set(pane.id, { ...pane.bounds });
  }
}

const DOCUMENT_PREVIEW_EXTS = new Set([
  'pdf',
  'doc',
  'docx',
  'hwp',
  'hwpx',
  'xls',
  'xlsx',
  'xlsm',
  'xlsb',
  'ppt',
  'pptx',
]);

function isXconExt(ext: string): boolean {
  return (
    ext === 'xcon' ||
    ext === 'xconj' ||
    ext === 'xconx' ||
    ext === 'xcont' ||
    ext === 'xcons' ||
    ext === 'xcon.json' ||
    ext === 'xcon.xml' ||
    ext === 'xcon.tagless' ||
    ext === 'xcon.sketch' ||
    ext === 'sketch'
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return btoa(binary);
}

function workspaceNameFromCwd(defaultCwd: string): string {
  const parts = defaultCwd.split(/[\\/]/).filter(Boolean);
  return parts.at(-1) || 'Workspace';
}

function stripRemoteTerminalSecrets(profile: RemoteTerminalProfile): RemoteTerminalProfile {
  return {
    ...profile,
    password: '',
    passphrase: '',
  };
}

function stripRemoteFileSecrets(profile: RemoteFileProfile): RemoteFileProfile {
  return {
    ...profile,
    password: '',
    passphrase: '',
  };
}

const DEFAULT_TERMINAL_RESTORE_SETTINGS: TerminalRestoreSettings = {
  restoreShell: true,
  restoreSsh: false,
  restoreTelnet: false,
  runInitialCommandOnRestore: true,
  rerunLastCommandOnRestore: false,
};

function normalizeTerminalRestoreSettings(settings?: Partial<TerminalRestoreSettings>): TerminalRestoreSettings {
  return {
    ...DEFAULT_TERMINAL_RESTORE_SETTINGS,
    ...(settings ?? {}),
  };
}

function shouldRestoreTerminalSession(snapshot: TerminalSessionSnapshot, settings: TerminalRestoreSettings): boolean {
  if (snapshot.kind === 'shell') return settings.restoreShell;
  if (snapshot.kind === 'ssh') return settings.restoreSsh;
  if (snapshot.kind === 'telnet') return settings.restoreTelnet;
  return false;
}

function buildRestoredTerminalSpawnConfig(
  snapshot: TerminalSessionSnapshot,
  settings: TerminalRestoreSettings,
  profiles: {
    remoteProfiles: RemoteTerminalProfile[];
    localProfiles: LocalTerminalProfile[];
  } = { remoteProfiles: [], localProfiles: [] },
): TerminalSpawnConfig {
  const spawnConfig = structuredClone(snapshot.spawnConfig) as TerminalSpawnConfig;
  if ('profile' in spawnConfig && spawnConfig.profile) {
    if (spawnConfig.kind === 'ssh' || spawnConfig.kind === 'telnet') {
      const profile = spawnConfig.profile as RemoteTerminalProfile;
      const saved = profiles.remoteProfiles.find((item) => item.id === profile.id);
      spawnConfig.profile = {
        ...profile,
        password: saved?.password ?? profile.password,
        passphrase: saved?.passphrase ?? profile.passphrase,
      };
    } else {
      const profile = spawnConfig.profile as LocalTerminalProfile;
      const saved = profiles.localProfiles.find((item) => item.id === profile.id);
      spawnConfig.profile = saved ? { ...profile, ...saved } : profile;
    }
  }
  if (!settings.runInitialCommandOnRestore && 'profile' in spawnConfig && spawnConfig.profile) {
    spawnConfig.profile = {
      ...spawnConfig.profile,
      initialCommand: '',
    } as typeof spawnConfig.profile;
  }
  return spawnConfig;
}

function createTerminalSessionSnapshot(spawnConfig: TerminalSpawnConfig): TerminalSessionSnapshot {
  const kind = spawnConfig.kind === 'ssh' || spawnConfig.kind === 'telnet' ? spawnConfig.kind : 'shell';
  const sanitizedSpawnConfig = structuredClone(spawnConfig) as TerminalSpawnConfig;
  if ('profile' in sanitizedSpawnConfig && sanitizedSpawnConfig.profile && (kind === 'ssh' || kind === 'telnet')) {
    sanitizedSpawnConfig.profile = stripRemoteTerminalSecrets(sanitizedSpawnConfig.profile as RemoteTerminalProfile);
  }
  return {
    kind,
    spawnConfig: sanitizedSpawnConfig,
    lastCommand: '',
  };
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { t } = useI18n();
  const [dockTick, setTick] = useState(0);
  const [status, setStatus] = useState(() => t('app.shellHint'));
  const [shells, setShells] = useState<ShellDescriptor[]>([]);
  const [theme, setTheme] = useState<ThemeName>('dark');
  const [fontSize, setFontSize] = useState(14);
  const [gowooriOverlay, setGowooriOverlay] = useState<GowooriGlobalOverlayState | null>(null);
  // ref: 비동기 콜백(getDetachPayload 등)에서 최신 테마/폰트 크기에 접근하기 위한 미러
  const themeRef = useRef<ThemeName>('dark');
  const fontSizeRef = useRef(14);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  useEffect(() => {
    fontSizeRef.current = fontSize;
  }, [fontSize]);

  useEffect(() => {
    installRendererProducerObservability(window);
    return () => uninstallRendererProducerObservability(window);
  }, []);

  const showGowooriOverlay = useCallback(
    (detail: Partial<GowooriOverlayShowDetail>): GowooriGlobalOverlayState | null => {
      const source = typeof detail.source === 'string' ? detail.source : '';
      if (!source.trim()) return null;
      const id =
        typeof detail.id === 'string' && detail.id.trim()
          ? detail.id.trim()
          : `gowoori-overlay-${window.crypto?.randomUUID?.() ?? Date.now()}`;
      const title = typeof detail.title === 'string' && detail.title.trim() ? detail.title.trim() : 'Gowoori Overlay';
      const label =
        typeof detail.label === 'string' && detail.label.trim() ? detail.label.trim() : 'Rendered Gowoori artifact';
      const zoomValue = Number(detail.zoom);
      const overlay: GowooriGlobalOverlayState = {
        id,
        title,
        label,
        source,
        contentId: typeof detail.contentId === 'string' ? detail.contentId : undefined,
        zoom: Number.isFinite(zoomValue) ? Math.min(200, Math.max(50, Math.round(zoomValue))) : 100,
      };
      setGowooriOverlay(overlay);
      return overlay;
    },
    [],
  );

  const hideGowooriOverlay = useCallback((detail?: Partial<GowooriOverlayHideDetail>): boolean => {
    let hidden = false;
    setGowooriOverlay((current) => {
      if (!current) return current;
      const requestedId = typeof detail?.id === 'string' ? detail.id.trim() : '';
      if (requestedId && requestedId !== current.id) return current;
      hidden = true;
      return null;
    });
    return hidden;
  }, []);

  useEffect(() => {
    const handleShow = (event: Event) => {
      const detail = (event as CustomEvent<GowooriOverlayShowDetail>).detail;
      showGowooriOverlay(detail);
    };
    const handleHide = (event: Event) => {
      const detail = (event as CustomEvent<GowooriOverlayHideDetail>).detail;
      hideGowooriOverlay(detail);
    };
    window.addEventListener(GOWOORI_OVERLAY_SHOW_EVENT, handleShow);
    window.addEventListener(GOWOORI_OVERLAY_HIDE_EVENT, handleHide);
    return () => {
      window.removeEventListener(GOWOORI_OVERLAY_SHOW_EVENT, handleShow);
      window.removeEventListener(GOWOORI_OVERLAY_HIDE_EVENT, handleHide);
    };
  }, [hideGowooriOverlay, showGowooriOverlay]);
  const [defaultShell, setDefaultShell] = useState<ShellKind>('powershell');
  const [defaultCwd, setDefaultCwd] = useState('');
  const [selectDefaultCwdPending, setSelectDefaultCwdPending] = useState(false);
  const selectDefaultCwdPendingRef = useRef(false);
  const onboardingFolderPendingRef = useRef(false);
  const onboardingSampleWorkspacePathRef = useRef('');
  const onboardingWorkspaceProfilePathRef = useRef('');
  const onboardingSettingsTargetRef = useRef({
    category: '',
    mode: '',
    section: '',
    focusConnectionDetail: '',
  });
  const [terminalGroups, setTerminalGroups] = useState<TerminalProfileGroup[]>([]);
  const [remoteProfiles, setRemoteProfiles] = useState<RemoteTerminalProfile[]>([]);
  const [localProfiles, setLocalProfiles] = useState<LocalTerminalProfile[]>([]);
  const [remoteFileGroups, setRemoteFileGroups] = useState<TerminalProfileGroup[]>([]);
  const [remoteFileProfiles, setRemoteFileProfiles] = useState<RemoteFileProfile[]>([]);
  const [windowSizerPresets, setWindowSizerPresets] = useState<WindowSizerPreset[]>([]);
  const [workspacePath, setWorkspacePath] = useState('');
  const [workspaceRecent, setWorkspaceRecent] = useState<WorkspaceRecentItem[]>([]);
  const [workspaceAutoRestore, setWorkspaceAutoRestore] = useState(false);
  const [terminalRestoreSettings, setTerminalRestoreSettings] = useState<TerminalRestoreSettings>(
    DEFAULT_TERMINAL_RESTORE_SETTINGS,
  );
  const [extensionCommands, setExtensionCommands] = useState<ExtensionCommandDescriptor[]>([]);
  const [xenisPhase5Enabled, setXenisPhase5Enabled] = useState(false);
  const [keyboardShortcutBindings, setKeyboardShortcutBindings] = useState<CommandShortcutBinding[]>([]);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);
  const [aiProvider, setAiProvider] = useState<AiProviderSettings>(DEFAULT_AI_PROVIDER);
  // AI 설정 편집용 임시 state (설정 모달에서 수정 후 저장 시 aiProvider로 반영)
  const [aiEdit, setAiEdit] = useState<AiProviderSettings>(DEFAULT_AI_PROVIDER);
  const [showApiKey, setShowApiKey] = useState(false);
  // 현재 저장된 apiUrl 추적 — AI 모달 이벤트에 포함하여 MetaManagement/QueryAnalyzer
  // 가 apiUrl 없는 이벤트를 수신할 때 DEFAULT_URL 로 덮어쓰지 않도록 한다.
  const settingsApiUrlRef = useRef<string>('');
  const settingsLoadedRef = useRef(false);

  // ── 명령 입력 바 상태 ─────────────────────────────────────────────────────
  const [activeTermId, setActiveTermId] = useState('');
  const [cmdInput, setCmdInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>(() => loadHistory());
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [shortcuts, setShortcuts] = useState<CmdShortcut[]>(() => loadShortcuts());
  const [workBlocks, setWorkBlocks] = useState<TerminalWorkBlock[]>(() => loadWorkBlocks());
  const [commandTargetMode, setCommandTargetMode] = useState<CommandTargetMode>('active');
  const [commandSelectedTermIds, setCommandSelectedTermIds] = useState<string[]>([]);
  const [commandTargetGroupId, setCommandTargetGroupId] = useState('');
  const [commandSendMode, setCommandSendMode] = useState<CommandSendMode>('parallel');
  const [commandLineEnding, setCommandLineEnding] = useState<CommandLineEnding>('cr');
  const [commandInputMode, setCommandInputMode] = useState<CommandInputMode>('event');
  const [commandSequentialDelayMs, setCommandSequentialDelayMs] = useState(400);
  const [commandSequenceRunning, setCommandSequenceRunning] = useState(false);
  const previousCommandActiveTermIdRef = useRef('');
  const commandSequenceRunIdRef = useRef(0);

  // 이력 드롭다운
  const [histDropOpen, setHistDropOpen] = useState(false);
  const [histDropPos, setHistDropPos] = useState({ top: 0, right: 0 });
  const histBtnRef = useRef<HTMLButtonElement>(null);

  // 단축 명령 패널
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [shortcutPos, setShortcutPos] = useState({ top: 0, right: 0 });
  const [workBlocksOpen, setWorkBlocksOpen] = useState(false);
  const [workBlocksPos, setWorkBlocksPos] = useState({ top: 0, right: 0 });
  const [workBlockQuery, setWorkBlockQuery] = useState('');
  const [workBlockSort, setWorkBlockSort] = useState<WorkBlockSortMode>('recent');
  const [editingWorkBlockId, setEditingWorkBlockId] = useState('');
  const [workBlockDraft, setWorkBlockDraft] = useState<WorkBlockDraft>(EMPTY_WORK_BLOCK_DRAFT);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [newScName, setNewScName] = useState('');
  const [newScCmd, setNewScCmd] = useState('');
  const shortcutBtnRef = useRef<HTMLButtonElement>(null);
  const workBlocksBtnRef = useRef<HTMLButtonElement>(null);

  const cmdInputRef = useRef<HTMLTextAreaElement>(null);

  // 오버레이 상태
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIdx, setPaletteIdx] = useState(0);

  // 파일 탐색기 사이드바
  const [explorerOpen, setExplorerOpen] = useState(true);
  const [explorerWidth, setExplorerWidth] = useState(220);
  // 탐색기에서 현재 선택된 경로와 타입
  const [explorerSelectedPath, setExplorerSelectedPath] = useState('');
  const [explorerSelectedIsDir, setExplorerSelectedIsDir] = useState(false);

  // 사이드바 수직 분할 비율 (탐색기 / 즐겨찾기)
  const [sidebarSplitRatio, setSidebarSplitRatio] = useState<number>(() => loadSplitRatio());

  // 즐겨찾기 상태
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => loadFavorites());

  // 외부 탐색기에서 파일 드래그&드롭 오버레이
  const [extDragOver, setExtDragOver] = useState(false);
  const extDragCounterRef = useRef(0);
  const extDragWatchdogRef = useRef<number | null>(null);

  // 자동 업데이트 상태
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus>(DEFAULT_UPDATER_STATUS);

  // ── 사용자 인증 상태 ─────────────────────────────────────────────────────────
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authDropOpen, setAuthDropOpen] = useState(false);
  const [authDropPos, setAuthDropPos] = useState({ top: 0, right: 0 });
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authShowEmailForm, setAuthShowEmailForm] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPasswordError, setAuthPasswordError] = useState('');
  const [authIsLoading, setAuthIsLoading] = useState(false);
  const authBtnRef = useRef<HTMLButtonElement>(null);

  // 셸 종류별 카운터 (탭 이름용)
  const termCounterRef = useRef<Record<ShellKind, number>>(createShellCounter());
  const remoteCounterRef = useRef(0);
  const mcpTerminalSessionsRef = useRef<Set<string>>(new Set());

  // DockEngine은 최초 1회만 생성
  const engineRef = useRef<DockEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = createEngine(() => setTick((t) => t + 1));
  }
  const engine = engineRef.current!;

  const buildRendererStateSnapshot = useCallback(
    () =>
      buildMcpRendererStateSnapshot(engine, {
        currentWorkspacePath: defaultCwd,
        workspaceProfilePath: workspacePath,
        workspaceAutoRestore,
        explorerOpen,
        explorerRootDir: defaultCwd,
        explorerSelectedPath,
        explorerSelectedIsDir,
      }),
    [
      defaultCwd,
      engine,
      explorerOpen,
      explorerSelectedIsDir,
      explorerSelectedPath,
      workspaceAutoRestore,
      workspacePath,
    ],
  );

  useEffect(() => {
    if (!getDeskBridgeApi()?.reportState) return;
    const timer = window.setTimeout(() => {
      void getDeskBridgeApi()?.reportState(buildRendererStateSnapshot());
    }, 80);
    return () => window.clearTimeout(timer);
  }, [buildRendererStateSnapshot, dockTick]);

  useEffect(() => {
    if (!getDeskBridgeApi()?.reportState) return;
    let timer: number | undefined;
    const scheduleTraceStateReport = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = undefined;
        void getDeskBridgeApi()?.reportState(buildRendererStateSnapshot());
      }, 120);
    };
    const unsubscribe = subscribeRendererPerformanceTrace(scheduleTraceStateReport);
    return () => {
      if (timer) window.clearTimeout(timer);
      unsubscribe();
    };
  }, [buildRendererStateSnapshot]);

  const handleMcpRendererPerformanceTrace = useCallback(
    (payload: McpBridgeRendererPerformanceTraceRequest): McpBridgeRendererPerformanceTraceResult => {
      const requestId = String(payload?.requestId || '').trim();
      if (payload?.clear === true) {
        clearRendererPerformanceTrace();
      }
      if (typeof payload?.setting === 'string') {
        setRendererPerformanceTraceSetting(payload.setting);
      } else if (payload?.enabled === true) {
        setRendererPerformanceTraceSetting('xdbot markdown-xcon');
      } else if (payload?.enabled === false) {
        setRendererPerformanceTraceSetting('');
      }

      const snapshot = buildMcpRendererPerformanceTraceSnapshot();
      void getDeskBridgeApi()?.reportState(buildRendererStateSnapshot());
      return {
        requestId,
        ok: Boolean(requestId),
        ...snapshot,
        ...(requestId ? {} : { error: 'requestId is required' }),
      };
    },
    [buildRendererStateSnapshot],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onRendererPerformanceTrace?.((payload) => handleMcpRendererPerformanceTrace(payload));
  }, [handleMcpRendererPerformanceTrace]);

  const handleMcpCaptureActivePane = useCallback(
    async (payload: McpBridgeCaptureActivePanePayload): Promise<McpBridgeCaptureActivePaneResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId) return { requestId: '', ok: false, error: 'requestId is required' };
      if (!window.captureAPI?.capturePane) {
        return { requestId, ok: false, error: 'Pane capture API is not available.' };
      }

      const panes = Array.from(engine.panes.values());
      const requestedPane = payload.paneId ? (engine.panes.get(payload.paneId) ?? null) : null;
      const paneForContent = payload.contentId
        ? (panes.find(
            (pane) => pane.activeContentId === payload.contentId || pane.contents.includes(payload.contentId!),
          ) ?? null)
        : null;
      const artifactPane =
        payload.preferArtifactPane !== false && engine.artifactPaneId
          ? (engine.panes.get(engine.artifactPaneId) ?? null)
          : null;
      const activePane = engine.activePaneId ? (engine.panes.get(engine.activePaneId) ?? null) : null;
      const targetPane =
        requestedPane ??
        paneForContent ??
        (artifactPane?.activeContentId ? artifactPane : null) ??
        (activePane?.activeContentId ? activePane : null) ??
        panes.find((pane) => pane.activeContentId || pane.contents.length > 0) ??
        null;

      if (!targetPane) return { requestId, ok: false, error: 'No renderer pane is available to capture.' };
      const targetContentId = payload.contentId || targetPane.activeContentId || targetPane.contents[0] || '';
      const targetContent = targetContentId ? (engine.contents.get(targetContentId) ?? null) : null;
      if (!targetContent)
        return { requestId, ok: false, error: `No active content is available for pane ${targetPane.id}.` };

      if (
        payload.contentId &&
        targetPane.contents.includes(payload.contentId) &&
        targetPane.activeContentId !== payload.contentId
      ) {
        targetPane.activateContent(payload.contentId);
        engine.activePaneId = targetPane.id;
        engine.notify();
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => resolve());
          }),
        );
      }

      const paneElement = document.querySelector<HTMLElement>(
        `[data-pane-id="${escapeMcpCaptureSelectorValue(targetPane.id)}"]`,
      );
      if (!paneElement) return { requestId, ok: false, error: `Pane element was not found: ${targetPane.id}` };
      const rect = paneElement.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        return {
          requestId,
          ok: false,
          error: `Pane has an invalid capture size: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        };
      }

      const artifact = await window.captureAPI.capturePane({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        paneId: targetPane.id,
        contentId: targetContent.id,
        title: targetContent.title,
        contentType: targetContent.contentType,
      });
      return {
        requestId,
        ok: true,
        target: {
          paneId: targetPane.id,
          contentId: targetContent.id,
          title: targetContent.title,
          contentType: targetContent.contentType,
        },
        artifact,
      };
    },
    [engine],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onCaptureActivePane?.((payload) => handleMcpCaptureActivePane(payload));
  }, [handleMcpCaptureActivePane]);

  const handleMcpGowooriArtifactVisibility = useCallback(
    async (payload: McpBridgeGowooriArtifactVisibilityPayload): Promise<McpBridgeGowooriArtifactVisibilityResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId) return { requestId: '', ok: false, components: [], error: 'requestId is required' };

      const requestedComponents =
        Array.isArray(payload.components) && payload.components.length > 0
          ? payload.components
          : DEFAULT_GOWOORI_VISIBILITY_COMPONENTS;
      const components = Array.from(
        new Set(requestedComponents.map(displayGowooriVisibilityComponent).filter((value) => value.length > 0)),
      );
      if (components.length === 0) {
        return { requestId, ok: false, components: [], error: 'At least one component is required.' };
      }

      const panes = Array.from(engine.panes.values());
      const requestedPane = payload.paneId ? (engine.panes.get(payload.paneId) ?? null) : null;
      const paneForContent = payload.contentId
        ? (panes.find(
            (pane) => pane.activeContentId === payload.contentId || pane.contents.includes(payload.contentId!),
          ) ?? null)
        : null;
      const artifactPane =
        payload.preferArtifactPane !== false && engine.artifactPaneId
          ? (engine.panes.get(engine.artifactPaneId) ?? null)
          : null;
      const activePane = engine.activePaneId ? (engine.panes.get(engine.activePaneId) ?? null) : null;
      const targetPane =
        requestedPane ??
        paneForContent ??
        (artifactPane?.activeContentId ? artifactPane : null) ??
        (activePane?.activeContentId ? activePane : null) ??
        panes.find((pane) => pane.activeContentId || pane.contents.length > 0) ??
        null;
      if (!targetPane) return { requestId, ok: false, components: [], error: 'No renderer pane is available.' };

      const targetContentId = payload.contentId || targetPane.activeContentId || targetPane.contents[0] || '';
      const targetContent = targetContentId ? (engine.contents.get(targetContentId) ?? null) : null;
      if (!targetContent) {
        return {
          requestId,
          ok: false,
          paneId: targetPane.id,
          components: [],
          error: `No content is available for pane ${targetPane.id}.`,
        };
      }

      if (targetPane.contents.includes(targetContent.id) && targetPane.activeContentId !== targetContent.id) {
        targetPane.activateContent(targetContent.id);
        engine.activePaneId = targetPane.id;
        engine.notify();
        await waitForNextPaint();
      }

      const paneElement = document.querySelector<HTMLElement>(
        `.dock-pane[data-pane-id="${escapeMcpCaptureSelectorValue(targetPane.id)}"]`,
      );
      if (!paneElement) {
        return {
          requestId,
          ok: false,
          paneId: targetPane.id,
          contentId: targetContent.id,
          components: [],
          error: `Pane element was not found: ${targetPane.id}`,
        };
      }

      const contentElement =
        paneElement.querySelector<HTMLElement>(
          `.content-view[data-content-id="${escapeMcpCaptureSelectorValue(targetContent.id)}"]`,
        ) ?? paneElement;
      let results: McpBridgeGowooriArtifactVisibilityResult['components'] = [];
      const retryUntil = Date.now() + 3500;

      for (;;) {
        results = [];
        for (const component of components) {
          const selectors = getGowooriVisibilitySelectors(component);
          const candidate = findFirstGowooriVisibilityCandidate(contentElement, selectors);
          if (candidate && payload.reveal !== false) {
            candidate.element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            await waitForNextPaint();
          }
          const viewport = contentElement.getBoundingClientRect();
          results.push(
            measureGowooriComponentVisibility(
              component,
              candidate?.selector ?? selectors.join(', '),
              candidate?.element ?? null,
              viewport,
            ),
          );
        }

        if (results.every((component) => component.present && component.visible) || Date.now() >= retryUntil) {
          break;
        }

        await waitForGowooriVisibilityRetry(120);
        await waitForNextPaint();
      }

      const ok = results.every((component) => component.present && component.visible);
      return {
        requestId,
        ok,
        paneId: targetPane.id,
        contentId: targetContent.id,
        components: results,
        ...(ok ? {} : { error: 'One or more expected Gowoori artifact components are not visible.' }),
      };
    },
    [engine],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onGowooriArtifactVisibility?.((payload) => handleMcpGowooriArtifactVisibility(payload));
  }, [handleMcpGowooriArtifactVisibility]);

  const handleMcpGowooriOverlayShow = useCallback(
    async (payload: McpBridgeGowooriOverlayPayload): Promise<McpBridgeGowooriOverlayResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId) return { requestId: '', ok: false, visible: false, error: 'requestId is required' };
      const overlay = showGowooriOverlay({
        id: payload.id,
        title: payload.title,
        label: payload.label,
        source: payload.source,
        contentId: payload.contentId,
        zoom: payload.zoom,
      });
      if (!overlay) {
        return {
          requestId,
          ok: false,
          visible: false,
          error: 'Gowoori overlay source is required.',
        };
      }
      await waitForNextPaint();
      return {
        requestId,
        ok: true,
        visible: true,
        id: overlay.id,
        title: overlay.title,
        label: overlay.label,
        sourceLength: overlay.source.length,
        contentId: overlay.contentId,
      };
    },
    [showGowooriOverlay],
  );

  const handleMcpGowooriOverlayHide = useCallback(
    async (payload: McpBridgeGowooriOverlayPayload): Promise<McpBridgeGowooriOverlayResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId)
        return { requestId: '', ok: false, visible: Boolean(gowooriOverlay), error: 'requestId is required' };
      const wasVisible = Boolean(gowooriOverlay);
      const hidden = hideGowooriOverlay({ id: payload.id });
      await waitForNextPaint();
      return {
        requestId,
        ok: true,
        visible: wasVisible && !hidden,
        id: payload.id,
      };
    },
    [gowooriOverlay, hideGowooriOverlay],
  );

  const handleMcpGowooriOverlayStatus = useCallback(
    async (payload: McpBridgeGowooriOverlayPayload): Promise<McpBridgeGowooriOverlayResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId)
        return { requestId: '', ok: false, visible: Boolean(gowooriOverlay), error: 'requestId is required' };
      return {
        requestId,
        ok: true,
        visible: Boolean(gowooriOverlay),
        id: gowooriOverlay?.id,
        title: gowooriOverlay?.title,
        label: gowooriOverlay?.label,
        sourceLength: gowooriOverlay?.source.length,
        contentId: gowooriOverlay?.contentId,
      };
    },
    [gowooriOverlay],
  );

  useEffect(
    () => getDeskBridgeApi()?.onGowooriOverlayShow?.((payload) => handleMcpGowooriOverlayShow(payload)),
    [handleMcpGowooriOverlayShow],
  );

  useEffect(
    () => getDeskBridgeApi()?.onGowooriOverlayHide?.((payload) => handleMcpGowooriOverlayHide(payload)),
    [handleMcpGowooriOverlayHide],
  );

  useEffect(
    () => getDeskBridgeApi()?.onGowooriOverlayStatus?.((payload) => handleMcpGowooriOverlayStatus(payload)),
    [handleMcpGowooriOverlayStatus],
  );

  // 플로팅 창 위치 맵 — DockHost와 공유, saveLayout 시 정확한 위치 기록
  const floatBoundsRef = useRef<Map<string, Bounds>>(new Map());
  const workspaceAutoRestoreArmedRef = useRef(false);
  const workspaceAutoRestoreDoneRef = useRef(false);
  const onboardingAutoOpenedRef = useRef(false);

  const handleStatus = useCallback((msg: string) => {
    if (msg) setStatus(msg);
  }, []);

  const syncExtensions = useCallback(async () => {
    const extensions = await window.extensionAPI.list();
    setExtensionCommands(extensions.flatMap((extension) => extension.commands).filter((command) => command.enabled));
  }, []);

  useEffect(() => {
    syncExtensions().catch(() => setExtensionCommands([]));
  }, [syncExtensions]);

  useEffect(() => {
    const handler = () => {
      syncExtensions().catch(() => setExtensionCommands([]));
    };
    window.addEventListener('extensions-changed', handler);
    window.addEventListener('app-settings-changed', handler);
    return () => {
      window.removeEventListener('extensions-changed', handler);
      window.removeEventListener('app-settings-changed', handler);
    };
  }, [syncExtensions]);

  // ── 초기화: 저장된 로그인 상태 복원 ─────────────────────────────────────────
  useEffect(() => {
    const savedUser = authApiLoadUser();
    if (savedUser) setAuthUser(savedUser);
  }, []);

  // ── 설정 패인의 프로필 수동 편집 이벤트 수신 → 툴바 상태 동기화 ──────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<import('./auth/authApi').AuthUser | null>).detail;
      setAuthUser(detail ?? null);
    };
    window.addEventListener('xamong-profile-updated', handler);
    return () => window.removeEventListener('xamong-profile-updated', handler);
  }, []);

  // ── 초기화: 셸 목록 + 저장된 설정 복원 ─────────────────────────────────────
  useEffect(() => {
    window.terminalAPI
      .listShells()
      .then(setShells)
      .catch(() => setShells(FALLBACK_SHELL_DESCRIPTORS));

    window.terminalAPI
      .getSettings()
      .then((settings) => {
        setTheme(settings.theme);
        setFontSize(settings.fontSize);
        if (settings.defaultShell) setDefaultShell(settings.defaultShell);
        if (settings.defaultCwd) setDefaultCwd(settings.defaultCwd);
        setTerminalGroups(Array.isArray(settings.remoteTerminals?.groups) ? settings.remoteTerminals.groups : []);
        setRemoteProfiles(Array.isArray(settings.remoteTerminals?.profiles) ? settings.remoteTerminals.profiles : []);
        setLocalProfiles(
          Array.isArray(settings.remoteTerminals?.localProfiles) ? settings.remoteTerminals.localProfiles : [],
        );
        setRemoteFileGroups(Array.isArray(settings.remoteFiles?.groups) ? settings.remoteFiles.groups : []);
        setRemoteFileProfiles(Array.isArray(settings.remoteFiles?.profiles) ? settings.remoteFiles.profiles : []);
        setWindowSizerPresets(Array.isArray(settings.windowSizer?.presets) ? settings.windowSizer.presets : []);
        const loadedWorkspacePath = settings.workspace?.currentPath ?? '';
        const loadedWorkspaceAutoRestore = settings.workspace?.autoRestore === true;
        workspaceAutoRestoreArmedRef.current = loadedWorkspaceAutoRestore && loadedWorkspacePath.length > 0;
        workspaceAutoRestoreDoneRef.current = !workspaceAutoRestoreArmedRef.current;
        setWorkspacePath(loadedWorkspacePath);
        setWorkspaceRecent(Array.isArray(settings.workspace?.recent) ? settings.workspace.recent : []);
        setWorkspaceAutoRestore(loadedWorkspaceAutoRestore);
        setTerminalRestoreSettings(normalizeTerminalRestoreSettings(settings.terminalRestore));
        setKeyboardShortcutBindings(normalizeCommandShortcutBindings(settings.keyboardShortcuts?.bindings));
        setOnboardingDismissed(settings.onboarding?.dismissed === true);
        setXenisPhase5Enabled(isXenisPhase5EnabledFromSettings(settings));
        // 현재 apiUrl 을 ref 에 캐시 (AI 모달 이벤트 발송 시 사용)
        settingsApiUrlRef.current = settings.apiUrl ?? '';
        if (settings.aiProvider) {
          const raw = settings.aiProvider;
          const merged: AiProviderSettings = {
            ...DEFAULT_AI_PROVIDER,
            ...raw,
            xcAgentApiUrl: raw.xcAgentApiUrl || '',
            xcApiUrl: raw.xcApiUrl || '',
            labApiUrl: raw.labApiUrl || 'http://127.0.0.1:3845',
          };
          setAiProvider(merged);
          setAiEdit(merged);
        }

        // Restore command-related settings from userData/settings.json.
        // (localStorage는 URL origin이 바뀌면 초기화되므로 settings.json을 정본으로 사용)
        if (Array.isArray(settings.cmdHistory) && settings.cmdHistory.length > 0) {
          setCmdHistory(settings.cmdHistory);
          saveHistory(settings.cmdHistory); // 현재 세션 localStorage 캐시 동기화
        }
        if (Array.isArray(settings.cmdShortcuts) && settings.cmdShortcuts.length > 0) {
          setShortcuts(settings.cmdShortcuts);
          saveShortcuts(settings.cmdShortcuts); // 현재 세션 localStorage 캐시 동기화
        }
        if (Array.isArray(settings.terminalWorkBlocks)) {
          setWorkBlocks(settings.terminalWorkBlocks);
          saveWorkBlocks(settings.terminalWorkBlocks);
        }
        settingsLoadedRef.current = true;
      })
      .catch((error) => {
        settingsLoadedRef.current = false;
        handleStatus(`Settings load failed: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, [handleStatus]);

  // ── 자동 업데이터 상태 구독 ─────────────────────────────────────────────────
  useEffect(() => {
    window.updaterAPI
      ?.getStatus()
      .then(setUpdaterStatus)
      .catch(() => {});
    return window.updaterAPI?.onStatusChanged(setUpdaterStatus);
  }, []);

  // ── 분리 창 진입 확인 (탭 tear-off) ─────────────────────────────────────────
  // 최초 렌더 전에 URL 해시로 빠른 판별 (getDetachPayload 응답 오기 전 깜박임 방지)
  const [isDetachedWindow, setIsDetachedWindow] = useState(() => window.location.hash.startsWith('#detached'));
  const [detachLoading, setDetachLoading] = useState(() => window.location.hash.startsWith('#detached'));

  useEffect(() => {
    // getDetachPayload API가 없으면(구버전 preload) 조용히 종료
    if (typeof window.fileAPI?.getDetachPayload !== 'function') return;

    window.fileAPI
      .getDetachPayload()
      .then((payload: DetachPayload | null) => {
        setDetachLoading(false);
        if (!payload) {
          // 해시가 있었지만 payload 없으면 분리 창 아님
          setIsDetachedWindow(false);
          return;
        }
        setIsDetachedWindow(true);
        try {
          engine.addContent({
            id: payload.id,
            title: payload.title,
            html: payload.html ?? '',
            contentType: payload.contentType,
            termId: payload.termId,
            terminalRestore: payload.terminalRestore,
            url: payload.url,
            filePath: payload.filePath,
            fileName: payload.fileName,
            fileContent: payload.fileContent,
            fileExt: payload.fileExt,
            state: 'document',
          });
        } catch (err) {
          handleStatus(t('app.detachContentError', { e: (err as Error).message }));
        }
        // 터미널 탭: 새 xterm 인스턴스를 만들고 PTY 소유권 이전 + 스크롤백 재생
        if (payload.contentType === 'terminal' && payload.termId) {
          terminalHost.adoptTerminal(payload.termId, themeRef.current, fontSizeRef.current);
        }
        handleStatus(t('app.detachWindow', { title: payload.title }));
      })
      .catch((err: unknown) => {
        setDetachLoading(false);
        handleStatus(t('app.detachPayloadError', { e: (err as Error)?.message ?? String(err) }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 분리 창 간 합치기 수신 타깃 오버레이 ──────────────────────────────────────
  const [showMergeTarget, setShowMergeTarget] = useState(false);

  useEffect(() => {
    if (!isDetachedWindow) return;
    if (typeof window.fileAPI?.onMergeShowTarget !== 'function') return;
    const offShow = window.fileAPI.onMergeShowTarget(() => setShowMergeTarget(true));
    const offHide = window.fileAPI.onMergeHideTarget(() => setShowMergeTarget(false));
    const offReceive = window.fileAPI.onMergeReceiveTab((payload: DetachPayload) => {
      setShowMergeTarget(false);
      try {
        engine.addContent({
          id: `merge-${crypto.randomUUID()}`,
          title: payload.title,
          html: payload.html ?? '',
          contentType: payload.contentType,
          termId: payload.termId,
          terminalRestore: payload.terminalRestore,
          url: payload.url,
          filePath: payload.filePath,
          fileName: payload.fileName,
          fileContent: payload.fileContent,
          fileExt: payload.fileExt,
          state: 'document',
        });
      } catch (err) {
        handleStatus(t('app.mergeTabError', { e: (err as Error).message }));
        return;
      }
      // 터미널 탭: PTY 소유권 이전 + 스크롤백 재생
      if (payload.contentType === 'terminal' && payload.termId) {
        terminalHost.adoptTerminal(payload.termId, themeRef.current, fontSizeRef.current);
      }
      handleStatus(t('app.tabMergedHere', { title: payload.title }));
    });
    return () => {
      offShow();
      offHide();
      offReceive();
    };
  }, [isDetachedWindow, engine, handleStatus]);

  // ── 재결합 수신 (메인 창: 분리 창에서 탭이 돌아올 때) ──────────────────────────
  const [showReattachTarget, setShowReattachTarget] = useState(false);

  useEffect(() => {
    if (isDetachedWindow) return;
    if (typeof window.fileAPI?.onReattachShowTarget !== 'function') return;
    const offShow = window.fileAPI.onReattachShowTarget(() => setShowReattachTarget(true));
    const offHide = window.fileAPI.onReattachHideTarget(() => setShowReattachTarget(false));
    const offContent = window.fileAPI.onReattachContent((payload: DetachPayload) => {
      setShowReattachTarget(false);
      try {
        engine.addContent({
          id: `reattach-${crypto.randomUUID()}`,
          title: payload.title,
          html: payload.html ?? '',
          contentType: payload.contentType,
          termId: payload.termId,
          terminalRestore: payload.terminalRestore,
          url: payload.url,
          filePath: payload.filePath,
          fileName: payload.fileName,
          fileContent: payload.fileContent,
          fileExt: payload.fileExt,
          state: 'document',
        });
      } catch (err) {
        handleStatus(t('app.reattachError', { e: (err as Error).message }));
        return;
      }
      // 터미널 탭: PTY 소유권 이전 + 스크롤백 재생
      if (payload.contentType === 'terminal' && payload.termId) {
        terminalHost.adoptTerminal(payload.termId, themeRef.current, fontSizeRef.current);
      }
      handleStatus(t('app.tabReattachedMain', { title: payload.title }));
    });
    return () => {
      offShow();
      offHide();
      offContent();
    };
  }, [isDetachedWindow, engine, handleStatus]);

  useEffect(() => {
    if (isDetachedWindow || detachLoading) return;
    ensureXenesisAgentContent(engine);
    ensureCommandCenterContent(engine);
    engine.prioritizeSideWindow('right');
  }, [detachLoading, engine, isDetachedWindow]);

  // ── 활성 터미널 추적 ─────────────────────────────────────────────────────
  useEffect(() => {
    terminalHost.onActivate = setActiveTermId;
    return () => {
      terminalHost.onActivate = undefined;
    };
  }, []);

  // ── 터미널 링크 클릭 → 내부 브라우저 탭으로 열기 ────────────────────────
  useEffect(() => {
    terminalHost.onOpenUrl = (url: string) => {
      let title = url;
      try {
        title = new URL(url).host || url;
      } catch {
        /* URL 파싱 실패 시 원본 사용 */
      }
      const id = `browser-${crypto.randomUUID()}`;
      engine.addContent({
        id,
        title,
        state: 'document',
        html: '',
        contentType: 'browser',
        url,
      });
    };
    return () => {
      terminalHost.onOpenUrl = undefined;
    };
  }, [engine]);

  // ── 터미널 CWD 변경 → 도킹 탭 제목 갱신 ──────────────────────────────────
  // PowerShell prompt hook이 매 프롬프트마다 OSC 1337;CurrentDir=<path>를 전송하면
  // terminalHost가 파싱하여 이 콜백을 호출한다.
  // 탭 제목을 현재 디렉터리의 마지막 폴더명으로 갱신한다.
  useEffect(() => {
    terminalHost.onCwdChange = (termId: string, cwd: string) => {
      const content = engine.contents.get(termId);
      if (!content || content.contentType !== 'terminal') return;
      const folder = cwd.split(/[\\/]/).filter(Boolean).pop() ?? cwd;
      content.title = folder || cwd;
      engine.notify();
    };
    return () => {
      terminalHost.onCwdChange = undefined;
    };
  }, [engine]);

  // ── app-settings-changed 수신 시 전역 설정 반영 ───────────────────────────
  useEffect(() => {
    const onChanged = (e: Event) => {
      const detail = (
        e as CustomEvent<
          Partial<{
            apiUrl: string;
            theme: ThemeName;
            fontSize: number;
            defaultShell: ShellKind;
            defaultCwd: string;
            aiProvider: AiProviderSettings;
            remoteTerminals: {
              groups: TerminalProfileGroup[];
              profiles: RemoteTerminalProfile[];
              localProfiles: LocalTerminalProfile[];
            };
            remoteFiles: {
              groups: TerminalProfileGroup[];
              profiles: RemoteFileProfile[];
            };
            windowSizer: {
              presets: WindowSizerPreset[];
            };
            terminalRestore: TerminalRestoreSettings;
            keyboardShortcuts: {
              bindings: CommandShortcutBinding[];
            };
            featureFlags: AppSettings['featureFlags'];
            onboarding: OnboardingSettings;
            workspace: {
              currentPath: string;
              recent: WorkspaceRecentItem[];
              autoRestore: boolean;
            };
          }>
        >
      ).detail;
      if (!detail) return;
      if (detail.apiUrl !== undefined) settingsApiUrlRef.current = detail.apiUrl;
      if (detail.theme !== undefined) setTheme(detail.theme);
      if (detail.fontSize !== undefined) setFontSize(detail.fontSize);
      if (detail.defaultShell !== undefined) setDefaultShell(detail.defaultShell);
      if (detail.defaultCwd !== undefined) setDefaultCwd(detail.defaultCwd);
      if (detail.aiProvider !== undefined) setAiProvider(detail.aiProvider);
      if (detail.remoteTerminals !== undefined) {
        setTerminalGroups(Array.isArray(detail.remoteTerminals.groups) ? detail.remoteTerminals.groups : []);
        setRemoteProfiles(Array.isArray(detail.remoteTerminals.profiles) ? detail.remoteTerminals.profiles : []);
        setLocalProfiles(
          Array.isArray(detail.remoteTerminals.localProfiles) ? detail.remoteTerminals.localProfiles : [],
        );
      }
      if (detail.remoteFiles !== undefined) {
        setRemoteFileGroups(Array.isArray(detail.remoteFiles.groups) ? detail.remoteFiles.groups : []);
        setRemoteFileProfiles(Array.isArray(detail.remoteFiles.profiles) ? detail.remoteFiles.profiles : []);
      }
      if (detail.windowSizer !== undefined) {
        setWindowSizerPresets(Array.isArray(detail.windowSizer.presets) ? detail.windowSizer.presets : []);
      }
      if (detail.terminalRestore !== undefined) {
        setTerminalRestoreSettings(normalizeTerminalRestoreSettings(detail.terminalRestore));
      }
      if (detail.keyboardShortcuts !== undefined) {
        setKeyboardShortcutBindings(normalizeCommandShortcutBindings(detail.keyboardShortcuts.bindings));
      }
      if (detail.featureFlags !== undefined) {
        setXenisPhase5Enabled(isXenisPhase5EnabledFromSettings({ featureFlags: detail.featureFlags }));
      }
      if (detail.onboarding !== undefined) {
        setOnboardingDismissed(detail.onboarding.dismissed === true);
      }
      if (detail.workspace !== undefined) {
        setWorkspacePath(detail.workspace.currentPath ?? '');
        setWorkspaceRecent(Array.isArray(detail.workspace.recent) ? detail.workspace.recent : []);
        setWorkspaceAutoRestore(detail.workspace.autoRestore === true);
      }
    };
    window.addEventListener('app-settings-changed', onChanged);
    return () => window.removeEventListener('app-settings-changed', onChanged);
  }, []);

  // ── 설정 변경 시 debounce 저장 + 모든 터미널에 즉시 적용 ───────────────────
  useEffect(() => {
    terminalHost.updateAllSettings(theme, fontSize);
    document.documentElement.style.setProperty('--xd-terminal-font-size', `${fontSize}px`);

    if (!settingsLoadedRef.current) return undefined;

    const timer = setTimeout(() => {
      window.terminalAPI.saveSettings({ theme, fontSize, defaultShell, defaultCwd, aiProvider }).catch((error) => {
        handleStatus(`Settings save failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [theme, fontSize, defaultShell, defaultCwd, aiProvider, handleStatus]);

  // ── Debounce-save command-related settings to userData/settings.json ─
  // localStorage 는 URL origin 종속 → 재시작 시 초기화될 수 있음.
  // settings.json 은 앱 userData 에 저장되므로 origin 무관하게 영속됨.
  useEffect(() => {
    if (!settingsLoadedRef.current) return undefined;

    const timer = setTimeout(() => {
      window.terminalAPI
        .saveSettings({
          cmdHistory,
          cmdShortcuts: shortcuts,
          terminalWorkBlocks: workBlocks,
        })
        .catch((error) => {
          handleStatus(`Command settings save failed: ${error instanceof Error ? error.message : String(error)}`);
        });
    }, 800);
    return () => clearTimeout(timer);
  }, [cmdHistory, shortcuts, workBlocks, handleStatus]);

  // ── 셸 사용 가능 여부 확인 ────────────────────────────────────────────────────
  const shellAvailable = useCallback(
    (kind: ShellKind): boolean => shells.length === 0 || (shells.find((s) => s.kind === kind)?.available ?? true),
    [shells],
  );
  const shellOptions = useMemo(() => (shells.length > 0 ? shells : FALLBACK_SHELL_DESCRIPTORS), [shells]);

  // ── 폰트 크기 조절 ───────────────────────────────────────────────────────────
  const decreaseFontSize = useCallback(() => setFontSize((s) => Math.max(8, s - 1)), []);
  const increaseFontSize = useCallback(() => setFontSize((s) => Math.min(24, s + 1)), []);

  const restoreTerminalSessionsFromEngine = useCallback(
    (settings = terminalRestoreSettings, profileLookup = { remoteProfiles, localProfiles }) => {
      let restored = 0;
      for (const content of engine.contents.values()) {
        if (content.contentType !== 'terminal' || !content.termId || terminalHost.has(content.termId)) continue;
        const snapshot = content.terminalRestore;
        if (!snapshot || !shouldRestoreTerminalSession(snapshot, settings)) continue;
        const spawnConfig = buildRestoredTerminalSpawnConfig(snapshot, settings, profileLookup);
        terminalHost.spawn(content.termId, spawnConfig, themeRef.current, fontSizeRef.current);
        restored += 1;
        if (settings.rerunLastCommandOnRestore && snapshot.lastCommand?.trim()) {
          setTimeout(() => {
            if (content.termId && terminalHost.has(content.termId)) {
              terminalHost.sendLine(content.termId, snapshot.lastCommand!.trim());
            }
          }, 700);
        }
      }
      return restored;
    },
    [engine, localProfiles, remoteProfiles, terminalRestoreSettings],
  );

  // ── 레이아웃 저장 / 복원 / 초기화 (localStorage) ─────────────────────────────
  const handleSaveLayout = useCallback(() => {
    const layout = engine.saveLayout(floatBoundsRef.current);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
    handleStatus(t('app.layoutSaved'));
  }, [engine, handleStatus]);

  const handleRestoreLayout = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        handleStatus(t('app.noSavedLayout'));
        return;
      }
      const parsed = JSON.parse(raw) as SavedLayout;
      const currentTerminalIds = collectTerminalIdsFromEngine(engine);
      engine.restoreLayout(parsed);
      syncFloatBoundsMapFromEngine(engine, floatBoundsRef.current);
      const restoredTerminalIds = collectTerminalIdsFromSavedLayout(parsed);
      for (const termId of currentTerminalIds) {
        if (!restoredTerminalIds.has(termId)) terminalHost.kill(termId);
      }
      const restored = restoreTerminalSessionsFromEngine();
      handleStatus(
        restored > 0 ? t('app.layoutRestoredWithTerminals', { count: String(restored) }) : t('app.layoutRestored'),
      );
    } catch (err) {
      handleStatus((err as Error).message);
    }
  }, [engine, handleStatus, restoreTerminalSessionsFromEngine, t]);

  const handleResetLayout = useCallback(() => {
    for (const content of engine.contents.values()) {
      if (content.contentType === 'terminal' && content.termId) {
        terminalHost.kill(content.termId);
      }
    }
    termCounterRef.current = createShellCounter();
    floatBoundsRef.current.clear();
    setActiveTermId('');
    engine.resetLayout(() => {});
    handleStatus(t('app.layoutReset'));
  }, [engine, handleStatus]);

  const buildWorkspaceProfile = useCallback(async (): Promise<WorkspaceProfile> => {
    const latestSettings = await window.terminalAPI.getSettings();
    return {
      version: 1,
      name: workspaceNameFromCwd(defaultCwd),
      savedAt: new Date().toISOString(),
      settings: {
        defaultCwd,
        defaultShell,
        localCli: latestSettings.localCli,
        terminalRestore: terminalRestoreSettings,
        remoteTerminals: {
          groups: terminalGroups,
          profiles: remoteProfiles.map(stripRemoteTerminalSecrets),
          localProfiles,
        },
        remoteFiles: {
          groups: remoteFileGroups,
          profiles: remoteFileProfiles.map(stripRemoteFileSecrets),
        },
        windowSizer: {
          presets: windowSizerPresets,
        },
      },
      layout: engine.saveLayout(floatBoundsRef.current),
    };
  }, [
    defaultCwd,
    defaultShell,
    engine,
    localProfiles,
    remoteFileGroups,
    remoteFileProfiles,
    remoteProfiles,
    terminalGroups,
    terminalRestoreSettings,
    windowSizerPresets,
  ]);

  const handleSaveWorkspace = useCallback(async () => {
    try {
      const profile = await buildWorkspaceProfile();
      const result = await window.workspaceAPI.saveAs(profile, profile.name);
      if (!result.saved) return;
      const workspace = {
        currentPath: result.path ?? workspacePath,
        recent: result.recent,
        autoRestore: workspaceAutoRestore,
      };
      setWorkspacePath(workspace.currentPath);
      setWorkspaceRecent(workspace.recent);
      await window.terminalAPI.saveSettings({ workspace });
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: { workspace } }));
      handleStatus(t('app.workspaceSaved', { name: result.profile?.name ?? profile.name }));
    } catch (error) {
      handleStatus(t('app.workspaceSaveFailed', { e: error instanceof Error ? error.message : String(error) }));
    }
  }, [buildWorkspaceProfile, handleStatus, t, workspaceAutoRestore, workspacePath]);

  const applyWorkspaceOpenResult = useCallback(
    async (result: WorkspaceOpenResult, options?: { silent?: boolean }) => {
      const currentSettings = await window.terminalAPI.getSettings();
      const workspace = {
        currentPath: result.path,
        recent: result.recent,
        autoRestore: currentSettings.workspace?.autoRestore === true,
      };
      const updated = {
        defaultCwd: result.profile.settings.defaultCwd,
        defaultShell: result.profile.settings.defaultShell,
        localCli: result.profile.settings.localCli,
        terminalRestore: normalizeTerminalRestoreSettings(result.profile.settings.terminalRestore),
        remoteTerminals: mergeWorkspaceRemoteTerminalSettings(
          result.profile.settings.remoteTerminals,
          currentSettings.remoteTerminals,
        ),
        remoteFiles: mergeWorkspaceRemoteFileSettings(result.profile.settings.remoteFiles, currentSettings.remoteFiles),
        windowSizer: result.profile.settings.windowSizer,
        workspace,
      };
      await window.terminalAPI.saveSettings(updated);
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: updated }));

      if (result.profile.layout) {
        const currentTerminalIds = collectTerminalIdsFromEngine(engine);
        engine.restoreLayout(result.profile.layout as SavedLayout);
        syncFloatBoundsMapFromEngine(engine, floatBoundsRef.current);
        const restoredTerminalIds = collectTerminalIdsFromSavedLayout(result.profile.layout as SavedLayout);
        for (const termId of currentTerminalIds) {
          if (!restoredTerminalIds.has(termId)) terminalHost.kill(termId);
        }
        restoreTerminalSessionsFromEngine(updated.terminalRestore, {
          remoteProfiles: updated.remoteTerminals.profiles,
          localProfiles: updated.remoteTerminals.localProfiles,
        });
      }

      if (!options?.silent) {
        handleStatus(t('app.workspaceOpened', { name: result.profile.name }));
      }
    },
    [engine, handleStatus, restoreTerminalSessionsFromEngine, t],
  );

  const handleOpenWorkspace = useCallback(async () => {
    try {
      const result = await window.workspaceAPI.open();
      if (!result) {
        setWorkspaceOpenDropdownOpen(false);
        return;
      }
      await applyWorkspaceOpenResult(result);
      setWorkspaceOpenDropdownOpen(false);
    } catch (error) {
      handleStatus(t('app.workspaceOpenFailed', { e: error instanceof Error ? error.message : String(error) }));
    }
  }, [applyWorkspaceOpenResult, handleStatus, t]);

  const handleOpenRecentWorkspace = useCallback(
    async (item: WorkspaceRecentItem) => {
      try {
        const result = await window.workspaceAPI.read(item.path);
        await applyWorkspaceOpenResult(result);
      } catch (error) {
        handleStatus(t('app.workspaceOpenFailed', { e: error instanceof Error ? error.message : String(error) }));
      } finally {
        setWorkspaceOpenDropdownOpen(false);
      }
    },
    [applyWorkspaceOpenResult, handleStatus, t],
  );

  useEffect(() => {
    if (
      workspaceAutoRestoreDoneRef.current ||
      !workspaceAutoRestoreArmedRef.current ||
      isDetachedWindow ||
      !workspaceAutoRestore ||
      !workspacePath
    ) {
      return;
    }
    workspaceAutoRestoreDoneRef.current = true;
    workspaceAutoRestoreArmedRef.current = false;
    window.workspaceAPI
      .read(workspacePath)
      .then((result) => applyWorkspaceOpenResult(result, { silent: true }))
      .catch((error) => {
        handleStatus(t('app.workspaceOpenFailed', { e: error instanceof Error ? error.message : String(error) }));
      });
  }, [applyWorkspaceOpenResult, handleStatus, isDetachedWindow, t, workspaceAutoRestore, workspacePath]);

  // ── 기본 작업 폴더 선택 ──────────────────────────────────────────────────────
  const handleSelectDefaultCwd = useCallback(async () => {
    if (selectDefaultCwdPendingRef.current) return;
    selectDefaultCwdPendingRef.current = true;
    setSelectDefaultCwdPending(true);
    try {
      const selected = await window.terminalAPI.selectCwd();
      if (selected !== null) setDefaultCwd(selected);
    } finally {
      selectDefaultCwdPendingRef.current = false;
      setSelectDefaultCwdPending(false);
    }
  }, []);

  const browserCounterRef = useRef(0);
  const fileCounterRef = useRef(0);

  // 셸 선택 드롭다운 상태
  const [shellDropOpen, setShellDropOpen] = useState(false);
  const [shellDropPos, setShellDropPos] = useState({ top: 0, left: 0 });
  const shellBtnRef = useRef<HTMLButtonElement>(null);

  // 탭 정렬 드롭다운 상태
  const [arrangeOpen, setArrangeOpen] = useState(false);
  const [arrangePos, setArrangePos] = useState({ top: 0, left: 0 });
  const arrangeRef = useRef<HTMLDivElement>(null);
  const arrangeBtnRef = useRef<HTMLButtonElement>(null);
  const [showPaneIdentityOverlay, setShowPaneIdentityOverlay] = useState(false);

  // 도구 드롭다운 상태
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsPos, setToolsPos] = useState({ top: 0, left: 0 });
  const toolsBtnRef = useRef<HTMLButtonElement>(null);

  // 창 크기/위치 프리셋 드롭다운 상태
  const [windowSizerOpen, setWindowSizerOpen] = useState(false);
  const [windowSizerPos, setWindowSizerPos] = useState({ top: 0, left: 0 });
  const windowSizerBtnRef = useRef<HTMLButtonElement>(null);

  // 워크스페이스 열기 드롭다운 상태
  const [workspaceOpenDropdownOpen, setWorkspaceOpenDropdownOpen] = useState(false);
  const [workspaceOpenDropdownPos, setWorkspaceOpenDropdownPos] = useState({ top: 0, right: 0 });
  const workspaceOpenBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const el = e.target as Element;
      if (shellBtnRef.current?.contains(target) || el.closest?.('.shell-dropdown--portal')) return;
      setShellDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (arrangeBtnRef.current?.contains(target) || (e.target as Element).closest?.('.arrange-dropdown--portal'))
        return;
      setArrangeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolsBtnRef.current?.contains(target) || (e.target as Element).closest?.('.tools-dropdown--portal')) return;
      setToolsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        windowSizerBtnRef.current?.contains(target) ||
        (e.target as Element).closest?.('.window-sizer-dropdown--portal')
      )
        return;
      setWindowSizerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        workspaceOpenBtnRef.current?.contains(target) ||
        (e.target as Element).closest?.('.workspace-dropdown--portal')
      )
        return;
      setWorkspaceOpenDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Command history / shortcut / command bundle panel outside-click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!histBtnRef.current?.contains(target as Node) && !target.closest?.('.cmd-history-dropdown')) {
        setHistDropOpen(false);
      }
      if (!shortcutBtnRef.current?.contains(target as Node) && !target.closest?.('.cmd-shortcut-panel')) {
        setShortcutOpen(false);
      }
      if (!workBlocksBtnRef.current?.contains(target as Node) && !target.closest?.('.cmd-work-block-panel')) {
        setWorkBlocksOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 사용자 드롭다운 outside-click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (authBtnRef.current?.contains(target) || (e.target as Element).closest?.('.auth-dropdown--portal')) return;
      setAuthDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── 탭 정렬 핸들러 ───────────────────────────────────────────────────────────
  const handleArrangeH = useCallback(() => {
    engine.arrangeDocumentTabs('row');
    handleStatus(t('app.alignHorizontal'));
    setArrangeOpen(false);
  }, [engine, handleStatus]);

  const handleArrangeV = useCallback(() => {
    engine.arrangeDocumentTabs('column');
    handleStatus(t('app.alignVertical'));
    setArrangeOpen(false);
  }, [engine, handleStatus]);

  const handleArrangeGrid = useCallback(() => {
    engine.arrangeDocumentTabs('grid');
    handleStatus(t('app.alignGrid'));
    setArrangeOpen(false);
  }, [engine, handleStatus]);

  const handleMergeAll = useCallback(() => {
    engine.mergeAllDocumentTabs();
    handleStatus(t('app.mergeAllTabs'));
    setArrangeOpen(false);
  }, [engine, handleStatus]);

  useRendererExtensionEvents({
    engine,
    t,
    setDefaultCwd,
    setExplorerOpen,
    setExplorerSelectedPath,
    setExplorerSelectedIsDir,
    onStatus: handleStatus,
  });

  // ── 화면 영역 캡처 시작 ────────────────────────────────────────────────────────
  const startCapture = useCallback(() => {
    setToolsOpen(false);
    window.captureAPI?.startCapture();
  }, []);

  const handleExtensionActions = useCallback(
    async (actions: ExtensionHostAction[] = []) => {
      for (const action of actions) {
        if (action.type === 'message') {
          handleStatus(action.text);
        } else if (action.type === 'openTool') {
          await openExtensionTool(action.tool, {
            engine,
            t,
            defaultCwd,
            explorerSelectedPath,
            explorerSelectedIsDir,
            listDir: window.fsAPI.listDir,
            getCurrentXappBundlePath: () => String((window as any).CURRENT_XAPP_BUNDLE_PATH ?? ''),
            onStatus: handleStatus,
            requestedPlacement: action.placement,
            openContent: (options, placement, targetPaneId) =>
              engine.addContentWithPlacement(options, placement ?? action.placement ?? 'tab', targetPaneId),
          });
        } else if (action.type === 'openPanel') {
          engine.addContentWithPlacement(
            {
              id: `extension-panel-${crypto.randomUUID()}`,
              title: action.title || t('app.extensionPanelTitle'),
              state: 'document',
              html: action.html,
              contentType: 'extension-panel',
            },
            action.placement,
            action.targetPaneId,
          );
        } else if (action.type === 'openMarkdown') {
          engine.addContent({
            id: `extension-markdown-${crypto.randomUUID()}`,
            title: action.title || t('app.extensionMarkdownTitle'),
            state: 'document',
            html: '',
            contentType: 'markdown',
            fileName: `${action.title || 'extension'}.md`,
            fileContent: action.content,
            fileExt: 'md',
          });
        } else if (action.type === 'openCode') {
          const language = action.language || 'txt';
          engine.addContent({
            id: `extension-code-${crypto.randomUUID()}`,
            title: action.title || t('app.extensionCodeTitle'),
            state: 'document',
            html: '',
            contentType: 'code',
            fileName: `${action.title || 'extension'}.${language}`,
            fileContent: action.content,
            fileExt: language,
          });
        }
      }
    },
    [defaultCwd, engine, explorerSelectedIsDir, explorerSelectedPath, handleStatus, t],
  );

  const runExtensionCommand = useCallback(
    async (commandId: string) => {
      try {
        const result = await window.extensionAPI.runCommand(commandId);
        await handleExtensionActions(result.actions ?? []);
        if (!result.ok) {
          handleStatus(result.error || t('app.extensionCommandFailed', { e: commandId }));
          return;
        }
        if (result.message) {
          handleStatus(result.message);
        }
      } catch (error) {
        handleStatus(t('app.extensionCommandFailed', { e: error instanceof Error ? error.message : String(error) }));
      }
    },
    [handleExtensionActions, handleStatus, t],
  );

  // ── 캡처 준비/완료 이벤트 처리 ──────────────────────────────────────────────
  useEffect(() => {
    const unsubPreparing = window.captureAPI?.onCapturePreparing(() => {
      handleStatus(t('app.capturePreparing'));
    });
    const unsubReady = window.captureAPI?.onCaptureReady(() => {
      handleStatus('');
    });
    const unsubDone = window.captureAPI?.onCaptureDone(() => {
      handleStatus(t('app.captureDone'));
      window.dispatchEvent(new CustomEvent('capture-done'));
      setTimeout(() => handleStatus(''), 2000);
    });
    return () => {
      unsubPreparing?.();
      unsubReady?.();
      unsubDone?.();
    };
  }, [handleStatus]);

  useEffect(() => {
    const recordRendererError = (payload: { scope: string; message: string; detail?: string }) => {
      void window.diagnosticsAPI
        .record({
          level: 'error',
          source: 'renderer',
          scope: payload.scope,
          message: payload.message,
          detail: payload.detail,
        })
        .catch(() => {});
    };

    const handleError = (event: ErrorEvent) => {
      recordRendererError({
        scope: 'window.error',
        message: event.message || t('common.unknownError'),
        detail: event.error instanceof Error ? event.error.stack : `${event.filename}:${event.lineno}:${event.colno}`,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      recordRendererError({
        scope: 'unhandledrejection',
        message: reason instanceof Error ? reason.message : String(reason),
        detail: reason instanceof Error ? reason.stack : undefined,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [t]);

  const openDiagnosticsPane = useCallback(
    (placement?: ExtensionPanelPlacement, targetPaneId?: string | null) => {
      for (const [id, content] of engine.contents) {
        if (content.contentType === 'diagnostics') {
          for (const pane of engine.panes.values()) {
            if (pane.contents.includes(id)) {
              pane.activateContent(id);
              engine.activePaneId = pane.id;
              engine.notify();
              setToolsOpen(false);
              return;
            }
          }
        }
      }
      engine.addContentWithPlacement(
        {
          id: `diagnostics-${crypto.randomUUID()}`,
          title: t('app.diagnosticsCenter'),
          titleKey: 'app.diagnosticsCenter',
          state: 'document',
          html: '',
          contentType: 'diagnostics',
        },
        placement,
        targetPaneId,
      );
      setToolsOpen(false);
      handleStatus(t('app.diagnosticsOpened'));
    },
    [engine, handleStatus, t],
  );

  const openOnboardingPane = useCallback(
    (options?: { silent?: boolean; placement?: ExtensionPanelPlacement; targetPaneId?: string | null }) => {
      for (const [id, content] of engine.contents) {
        if (content.contentType === 'onboarding') {
          for (const pane of engine.panes.values()) {
            if (pane.contents.includes(id)) {
              pane.activateContent(id);
              engine.notify();
              setToolsOpen(false);
              return id;
            }
          }
        }
      }
      const contentId = `onboarding-${crypto.randomUUID()}`;
      engine.addContentWithPlacement(
        {
          id: contentId,
          title: t('app.onboardingTitle'),
          titleKey: 'app.onboardingTitle',
          state: 'document',
          html: '',
          contentType: 'onboarding',
        },
        options?.placement,
        options?.targetPaneId,
      );
      setToolsOpen(false);
      if (!options?.silent) {
        handleStatus(t('app.onboardingOpened'));
      }
      return contentId;
    },
    [engine, handleStatus, t],
  );

  useEffect(() => {
    const shouldOpenOnboarding =
      !isDetachedWindow && !detachLoading && !onboardingDismissed && !onboardingAutoOpenedRef.current;
    if (!shouldOpenOnboarding) return;
    onboardingAutoOpenedRef.current = true;
    openOnboardingPane({ silent: true });
  }, [detachLoading, isDetachedWindow, onboardingDismissed, openOnboardingPane]);

  // ── 설정 패인 열기 ────────────────────────────────────────────────────────────
  const openSettingsPane = useCallback(
    (placement?: ExtensionPanelPlacement, targetPaneId?: string | null) => {
      // 이미 열려 있으면 포커스 전환 (중복 방지)
      for (const [id, content] of engine.contents) {
        if (content.contentType === 'settings') {
          for (const pane of engine.panes.values()) {
            if (pane.contents.includes(id)) {
              pane.activateContent(id);
              engine.notify();
              setToolsOpen(false);
              return;
            }
          }
        }
      }
      const id = `settings-${crypto.randomUUID()}`;
      engine.addContentWithPlacement(
        {
          id,
          title: t('app.settingsTitle'),
          titleKey: 'app.settingsTitle',
          state: 'document',
          html: '',
          contentType: 'settings',
        },
        placement,
        targetPaneId,
      );
      setToolsOpen(false);
      handleStatus(t('app.settingsOpened'));
    },
    [engine, handleStatus, t],
  );

  const openSettingsCategory = useCallback(
    (category: string) => {
      onboardingSettingsTargetRef.current = {
        category: String(category || '').trim(),
        mode: '',
        section: '',
        focusConnectionDetail: '',
      };
      openSettingsPane();
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('settings-open-category', { detail: category }));
      }, 0);
    },
    [openSettingsPane],
  );

  const openSettingsTarget = useCallback(
    (target: {
      category?: unknown;
      mode?: unknown;
      section?: unknown;
      focusConnectionId?: unknown;
      focusConnectionDetail?: unknown;
      ensureVisible?: unknown;
      selectedTerminalProfileId?: unknown;
      pendingLocalTerminalProfile?: unknown;
      placement?: ExtensionPanelPlacement;
      targetPaneId?: string | null;
    }) => {
      const { placement, targetPaneId, ...targetDetail } = target;
      onboardingSettingsTargetRef.current = {
        category: typeof targetDetail.category === 'string' ? targetDetail.category.trim() : '',
        mode: typeof targetDetail.mode === 'string' ? targetDetail.mode.trim() : '',
        section: typeof targetDetail.section === 'string' ? targetDetail.section.trim() : '',
        focusConnectionDetail:
          typeof targetDetail.focusConnectionDetail === 'string' ? targetDetail.focusConnectionDetail.trim() : '',
      };
      openSettingsPane(placement, targetPaneId);
      const detail = {
        ...targetDetail,
        expiresAt: Date.now() + 30000,
        nonce: Date.now(),
      };
      window.__xenesisSettingsOpenTarget = detail;
      const dispatchTarget = () => {
        window.dispatchEvent(new CustomEvent('settings-open-target', { detail }));
      };
      setTimeout(dispatchTarget, 0);
      setTimeout(dispatchTarget, 100);
      setTimeout(dispatchTarget, 300);
      setTimeout(dispatchTarget, 1000);
    },
    [openSettingsPane],
  );

  const openRemoteTerminalSettings = useCallback(() => {
    openSettingsCategory('remote-terminals');
  }, [openSettingsCategory]);

  const openRemoteFilesSettings = useCallback(() => {
    openSettingsCategory('remote-files');
  }, [openSettingsCategory]);

  // ── 브라우저 패인 생성 ────────────────────────────────────────────────────────
  const createBrowserPane = useCallback(
    (url = 'https://www.google.com', placement?: ExtensionPanelPlacement, targetPaneId?: string | null) => {
      browserCounterRef.current += 1;
      const id = `browser-${crypto.randomUUID()}`;
      const title = t('app.browserTab', { n: String(browserCounterRef.current) });
      engine.addContentWithPlacement(
        {
          id,
          title,
          state: 'document',
          html: '',
          contentType: 'browser',
          url,
        },
        placement,
        targetPaneId,
      );
      handleStatus(t('app.tabOpened', { title }));
    },
    [engine, handleStatus, t],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOpenBrowser?.((payload: McpBridgeOpenBrowserPayload) => {
      createBrowserPane(payload.url || undefined, payload.placement, payload.targetPaneId);
    });
  }, [createBrowserPane]);

  useEffect(() => {
    return getDeskBridgeApi()?.onOpenBuiltinPane?.((payload: McpBridgeOpenBuiltinPanePayload) => {
      const resultBase: Omit<McpBridgeOpenBuiltinPaneResult, 'ok'> = {
        requestId: payload.requestId || '',
        kind: payload.kind,
        placement: payload.placement,
        targetPaneId: payload.targetPaneId,
        category: payload.category,
        mode: payload.mode,
        section: payload.section,
        focusConnectionId: payload.focusConnectionId,
        focusConnectionDetail: payload.focusConnectionDetail,
        ensureVisible: payload.ensureVisible,
      };
      if (payload.kind === 'settings') {
        const hasSettingsTarget = Boolean(
          payload.category ||
            payload.mode ||
            payload.section ||
            payload.focusConnectionId ||
            payload.focusConnectionDetail ||
            typeof payload.ensureVisible === 'boolean',
        );
        if (hasSettingsTarget) {
          openSettingsTarget({
            category: payload.category,
            mode: payload.mode,
            section: payload.section,
            focusConnectionId: payload.focusConnectionId,
            focusConnectionDetail: payload.focusConnectionDetail,
            ensureVisible: payload.ensureVisible,
            placement: payload.placement,
            targetPaneId: payload.targetPaneId,
          });
        } else {
          openSettingsPane(payload.placement, payload.targetPaneId);
        }
        return { ...resultBase, ok: true, message: 'Settings pane open request applied' };
      }
      if (payload.kind === 'diagnostics') {
        openDiagnosticsPane(payload.placement, payload.targetPaneId);
        return { ...resultBase, ok: true, message: 'Diagnostics pane open request applied' };
      }
      openOnboardingPane({ placement: payload.placement, targetPaneId: payload.targetPaneId });
      return { ...resultBase, ok: true, message: 'Onboarding pane open request applied' };
    });
  }, [openDiagnosticsPane, openOnboardingPane, openSettingsPane, openSettingsTarget]);

  // ── 로컬 파일 열기 ────────────────────────────────────────────────────────────
  const openLocalFile = useCallback(async () => {
    try {
      const result = await window.fileAPI.openFile();
      if (!result) return;

      fileCounterRef.current += 1;
      const id = `file-${crypto.randomUUID()}`;

      // SVG / HTML / HTM: 브라우저 패인에서 file:// URL로 열기
      if (result.ext === 'svg' || result.ext === 'html' || result.ext === 'htm') {
        const fileUrl = 'file:///' + result.filePath.replace(/\\/g, '/');
        const label = result.ext === 'svg' ? t('app.svgBrowser') : t('app.webBrowser');
        engine.addContent({
          id,
          title: result.fileName,
          state: 'document',
          html: '',
          contentType: 'browser',
          url: fileUrl,
        });
        handleStatus(t('app.fileOpenedLabel', { fileName: result.fileName, label }));
        return;
      }

      // .xcon / .xconj / .xcon.json / .xcon.xml 파일은 XCON 뷰어로 열기
      const isXconExt2 = isXconExt(result.ext);
      const isMermaidExt2 = result.ext === 'mmd';
      const resolvedType = isXconExt2 ? 'xcon-viewer' : isMermaidExt2 ? 'mermaid' : result.contentType;
      engine.addContent({
        id,
        title: result.fileName,
        state: 'document',
        html: '',
        contentType: resolvedType,
        filePath: result.filePath,
        fileName: result.fileName,
        fileContent: result.content,
        fileExt: result.ext,
        totalBytes: result.totalBytes,
      });
      handleStatus(
        resolvedType === 'hex'
          ? `${result.fileName}${t('app.openedHex')}`
          : t('app.tabOpened', { title: result.fileName }) +
              (resolvedType === 'xcon-viewer'
                ? t('app.openedXcon')
                : resolvedType === 'mermaid'
                  ? t('app.openedMermaid')
                  : ''),
      );
    } catch (err) {
      handleStatus(t('app.fileOpenError', { e: (err as Error).message }));
    }
  }, [engine, handleStatus]);

  // ── 탐색기 파일 경로로 직접 열기 ─────────────────────────────────────────────
  const openFileByPath = useCallback(
    async (
      filePath: string,
      placement?: ExtensionPanelPlacement,
      renderOptions?: RenderOptions,
      targetPaneId?: string | null,
    ) => {
      try {
        const result = await window.fileAPI.readFile(filePath);
        if (!result) {
          handleStatus(t('app.cannotReadFile'));
          return;
        }

        const id = `file-${crypto.randomUUID()}`;
        const ext = result.ext;

        if (renderOptions?.openAs === 'demoLabPlayback') {
          engine.addContentWithPlacement(
            {
              id: `demo-lab-playback-${crypto.randomUUID()}`,
              title: result.fileName || 'Demo Lab Player',
              state: 'document',
              html: '',
              contentType: 'demo-lab-playback',
              filePath: result.filePath,
              fileName: result.fileName,
              fileContent: result.content,
              fileExt: result.ext,
              renderOptions,
            },
            placement,
            targetPaneId,
          );
          handleStatus(t('app.tabOpened', { title: result.fileName || 'Demo Lab Player' }));
          return;
        }

        if (ext === 'svg' || ext === 'html' || ext === 'htm') {
          const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
          engine.addContentWithPlacement(
            {
              id,
              title: result.fileName,
              state: 'document',
              html: '',
              contentType: 'browser',
              url: fileUrl,
              renderOptions,
            },
            placement,
            targetPaneId,
          );
        } else {
          // .xcon / .xconj / .xcon.json / .xcon.xml 파일은 XCON 뷰어로 열기
          const isXconExt2 = isXconExt(result.ext);
          const isMermaidExt = result.ext === 'mmd';
          const resolvedType = isXconExt2 ? 'xcon-viewer' : isMermaidExt ? 'mermaid' : result.contentType;
          engine.addContentWithPlacement(
            {
              id,
              title: result.fileName,
              state: 'document',
              html: '',
              contentType: resolvedType,
              filePath: result.filePath,
              fileName: result.fileName,
              fileContent: result.content,
              fileExt: result.ext,
              totalBytes: result.totalBytes,
              renderOptions,
            },
            placement,
            targetPaneId,
          );
        }
        handleStatus(
          result.contentType === 'hex'
            ? `${result.fileName}${t('app.openedHex')}`
            : t('app.tabOpened', { title: result.fileName }) +
                (isXconExt(result.ext) ? t('app.openedXcon') : result.ext === 'mmd' ? t('app.openedMermaid') : ''),
        );
      } catch (err) {
        handleStatus(t('app.fileOpenError', { e: (err as Error).message }));
      }
    },
    [engine, handleStatus],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOpenFile?.((payload) => {
      if (payload?.filePath) {
        const targetPaneId = payload.targetPaneId ?? engine.artifactPaneId ?? undefined;
        void openFileByPath(payload.filePath, payload.placement, payload.renderOptions, targetPaneId);
      }
    });
  }, [engine, openFileByPath]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenLocalFileRequest>).detail;
      if (detail?.path) void openFileByPath(detail.path);
    };
    window.addEventListener(OPEN_LOCAL_FILE_EVENT, handler);
    return () => window.removeEventListener(OPEN_LOCAL_FILE_EVENT, handler);
  }, [openFileByPath]);

  const sendActiveFileToBot = useCallback(
    (contentId?: string) => {
      const activePane = engine.activePaneId ? engine.panes.get(engine.activePaneId) : null;
      const targetContentId = contentId || activePane?.activeContentId || activePane?.contents[0] || '';
      const content = targetContentId ? engine.contents.get(targetContentId) : null;
      if (!content?.filePath && !content?.remoteFilePath) {
        handleStatus('No active file is available to send to Xenesis Agent.');
        return;
      }

      const text = buildFileBotContextMessage({
        filePath: content.filePath,
        fileName: content.fileName,
        title: content.title,
        contentType: content.contentType,
        fileOrigin: content.fileOrigin,
        remoteFilePath: content.remoteFilePath,
        note:
          content.fileOrigin === 'remote'
            ? 'This is a remote file reference. Ask before writing, and prefer reading through Xenesis Desk remote file APIs.'
            : 'This is a local file reference. Preview writes with xenesis_desk_preview_text_file_write before applying changes.',
      });

      sendXenesisContextMessage(text, { source: 'active-file' });
      handleStatus(`Sent file reference to Xenesis Agent: ${content.title || content.fileName || content.filePath}`);
    },
    [engine, handleStatus],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ contentId?: string }>).detail;
      sendActiveFileToBot(typeof detail?.contentId === 'string' ? detail.contentId : undefined);
    };
    window.addEventListener('xenesis-send-file-to-bot', handler);
    return () => window.removeEventListener('xenesis-send-file-to-bot', handler);
  }, [sendActiveFileToBot]);

  const handleMcpDockAction = useCallback(
    (payload: McpBridgeDockActionPayload): McpBridgeDockActionResult => {
      const action: McpBridgeDockActionPayload['action'] = payload.action;
      const mode: McpBridgeDockActionPayload['mode'] =
        payload.mode === 'column' || payload.mode === 'grid' ? payload.mode : 'row';
      const contentId = String(payload.contentId || '').trim();
      const paneId = String(payload.paneId || '').trim();
      const targetPaneId = String(payload.targetPaneId || '').trim();
      const windowState =
        payload.windowState === 'top' ||
        payload.windowState === 'left' ||
        payload.windowState === 'right' ||
        payload.windowState === 'bottom'
          ? payload.windowState
          : 'document';
      const useActiveTarget = payload.useActive === true;
      const base = {
        requestId: payload.requestId,
        action,
        mode: payload.mode,
        contentId: contentId || undefined,
        paneId: paneId || undefined,
        targetPaneId: targetPaneId || undefined,
        useActive: useActiveTarget || undefined,
      };
      const getActiveDockPane = () => (engine.activePaneId ? (engine.panes.get(engine.activePaneId) ?? null) : null);
      const getFallbackDockPane = () =>
        getActiveDockPane() ??
        [...engine.panes.values()].find((pane) => pane.activeContentId || pane.contents.length > 0) ??
        [...engine.panes.values()][0] ??
        null;
      const findTargetPane = () =>
        contentId
          ? engine.findPaneByContent(contentId)
          : paneId
            ? (engine.panes.get(paneId) ?? null)
            : useActiveTarget
              ? getFallbackDockPane()
              : null;

      if (action === 'readSizes') {
        const sizes = engine.getSizes();
        return {
          ...base,
          ok: true,
          sizes,
          activePaneId: getActiveDockPane()?.id ?? null,
          message: `Dock sizes: left=${sizes.left}, right=${sizes.right}, top=${sizes.top}, bottom=${sizes.bottom}`,
        };
      }

      if (action === 'setSizes') {
        const sizes = engine.setSizes({
          left: payload.left,
          right: payload.right,
          top: payload.top,
          bottom: payload.bottom,
        });
        const message = `Dock sizes updated: left=${sizes.left}, right=${sizes.right}, top=${sizes.top}, bottom=${sizes.bottom}`;
        handleStatus(message);
        return {
          ...base,
          ok: true,
          sizes,
          activePaneId: getActiveDockPane()?.id ?? null,
          message,
        };
      }

      if (action === 'setPaneSize') {
        const pane = findTargetPane();
        if (!pane) return { ...base, ok: false, error: 'Dock pane target not found' };
        const result = engine.setPaneGroupSize(pane.id, {
          widthPercent: payload.widthPercent,
          heightPercent: payload.heightPercent,
        });
        if (!result.ok) return { ...base, ok: false, paneId: result.paneId, error: result.message };
        handleStatus(result.message);
        return {
          ...base,
          ok: true,
          paneId: result.paneId,
          focusedPaneId: result.paneId,
          widthPercent: result.widthPercent,
          heightPercent: result.heightPercent,
          message: result.message,
        };
      }

      if (action === 'readArtifactTarget') {
        const artifactPane = engine.artifactPaneId ? (engine.panes.get(engine.artifactPaneId) ?? null) : null;
        return {
          ...base,
          ok: true,
          paneId: artifactPane?.id,
          artifactPaneId: engine.artifactPaneId,
          activePaneId: getActiveDockPane()?.id ?? null,
          isArtifactTarget: Boolean(artifactPane),
          message: artifactPane ? `Artifact target pane: ${artifactPane.id}` : 'Artifact target pane is not set',
        };
      }

      if (action === 'setArtifactTarget') {
        const shouldClear = payload.clear === true;
        const explicitTargetRequested = Boolean(contentId || paneId);
        const explicitPane = findTargetPane();
        const pane = shouldClear ? null : explicitTargetRequested ? explicitPane : getFallbackDockPane();
        const nextPaneId = shouldClear ? null : (pane?.id ?? null);
        if (!shouldClear && !nextPaneId) {
          return {
            ...base,
            ok: false,
            artifactPaneId: engine.artifactPaneId,
            activePaneId: getActiveDockPane()?.id ?? null,
            isArtifactTarget: false,
            error: 'Dock artifact target pane not found',
          };
        }
        engine.setArtifactPane(nextPaneId);
        const message = nextPaneId ? `Artifact target pane: ${nextPaneId}` : 'Artifact target pane cleared';
        handleStatus(message);
        return {
          ...base,
          ok: true,
          paneId: nextPaneId || undefined,
          artifactPaneId: nextPaneId,
          activePaneId: getActiveDockPane()?.id ?? null,
          isArtifactTarget: Boolean(nextPaneId),
          message,
        };
      }

      if (action === 'move') {
        if (!contentId) return { ...base, ok: false, error: 'Dock content target not found' };
        const content = engine.contents.get(contentId);
        if (!content) return { ...base, ok: false, error: 'Dock content target not found' };
        if (targetPaneId) {
          if (!engine.panes.has(targetPaneId)) return { ...base, ok: false, error: 'Dock target pane not found' };
          const pane = engine.moveContentToPane(contentId, targetPaneId);
          pane.activateContent(contentId);
          engine.activePaneId = pane.id;
          if (content.contentType === 'terminal' && content.termId) {
            terminalHost.focus(content.termId);
            setActiveTermId(content.termId);
          }
          const message = `Moved ${content.title || contentId} to pane ${pane.id}`;
          handleStatus(message);
          return {
            ...base,
            ok: true,
            paneId: pane.id,
            focusedPaneId: pane.id,
            focusedContentId: contentId,
            message,
          };
        }
        const pane = engine.moveContentToState(contentId, windowState);
        pane.activateContent(contentId);
        engine.activePaneId = pane.id;
        const message = `Moved ${content.title || contentId} to ${windowState}`;
        handleStatus(message);
        return {
          ...base,
          ok: true,
          paneId: pane.id,
          focusedPaneId: pane.id,
          focusedContentId: contentId,
          message,
        };
      }

      if (action === 'focus') {
        const pane = findTargetPane();
        if (!pane) return { ...base, ok: false, error: 'Dock target not found' };
        const targetContentId = contentId || pane.activeContentId || pane.contents[0] || '';
        if (targetContentId) pane.activateContent(targetContentId);
        engine.activePaneId = pane.id;
        engine.notify();
        const focusedContent = targetContentId ? engine.contents.get(targetContentId) : null;
        if (focusedContent?.contentType === 'terminal' && focusedContent.termId) {
          terminalHost.focus(focusedContent.termId);
          setActiveTermId(focusedContent.termId);
        }
        handleStatus(`Xenesis Desk focused: ${focusedContent?.title || pane.id}`);
        return {
          ...base,
          ok: true,
          focusedPaneId: pane.id,
          focusedContentId: targetContentId || undefined,
          message: `Focused ${focusedContent?.title || pane.id}`,
        };
      }

      if (action === 'closeOthers' || action === 'closeRight') {
        const pane = findTargetPane();
        const anchorContentId = contentId || pane?.activeContentId || pane?.contents[0] || '';
        if (!pane || !anchorContentId) return { ...base, ok: false, error: 'Dock content target not found' };
        const anchorIndex = pane.contents.indexOf(anchorContentId);
        const closeTargetIds =
          action === 'closeOthers'
            ? pane.contents.filter((id) => id !== anchorContentId)
            : pane.contents.slice(Math.max(0, (anchorIndex >= 0 ? anchorIndex : 0) + 1));
        const closedTerminalIds =
          action === 'closeOthers'
            ? engine.closeOtherContentsInPane(pane.id, anchorContentId)
            : engine.closeContentsToRightInPane(pane.id, anchorContentId);
        for (const termId of closedTerminalIds) terminalHost.kill(termId);
        const message =
          action === 'closeOthers'
            ? `Closed ${closeTargetIds.length} other item(s) in ${pane.id}`
            : `Closed ${closeTargetIds.length} item(s) to the right in ${pane.id}`;
        handleStatus(message);
        return {
          ...base,
          ok: true,
          closedContentIds: closeTargetIds,
          closedTerminalIds,
          message,
        };
      }

      if (action === 'arrangeGroup' || action === 'mergeGroup') {
        const pane = findTargetPane();
        if (!pane) return { ...base, ok: false, error: 'Dock pane target not found' };
        const anchorContentId = contentId || pane.activeContentId || pane.contents[0] || undefined;
        const message =
          action === 'arrangeGroup'
            ? engine.arrangePaneGroup(pane.id, mode, anchorContentId)
            : engine.mergePaneGroup(pane.id, anchorContentId);
        const updatedPane = anchorContentId ? engine.findPaneByContent(anchorContentId) : null;
        handleStatus(message);
        return {
          ...base,
          ok: true,
          paneId: updatedPane?.id || pane.id,
          focusedPaneId: updatedPane?.id || pane.id,
          focusedContentId: anchorContentId,
          mode: action === 'arrangeGroup' ? mode : undefined,
          message,
        };
      }

      if (action === 'arrangeWindow' || action === 'mergeWindow') {
        const message =
          action === 'arrangeWindow'
            ? engine.arrangeWindowTabs(windowState, mode)
            : engine.mergeWindowTabs(windowState);
        handleStatus(message);
        return {
          ...base,
          ok: true,
          mode: action === 'arrangeWindow' ? mode : undefined,
          message,
        };
      }

      if (action === 'mergeAll') {
        engine.mergeAllDocumentTabs();
        const message = t('app.mergeAllTabs');
        handleStatus(message);
        return {
          ...base,
          ok: true,
          message,
        };
      }

      if (action === 'closeAll') {
        const pane = findTargetPane();
        if (!pane) return { ...base, ok: false, error: 'Dock pane target not found' };
        const closedContentIds = [...pane.contents];
        const closedTerminalIds = engine.closeAllContentsInPane(pane.id);
        for (const termId of closedTerminalIds) terminalHost.kill(termId);
        const message = `Closed ${closedContentIds.length} item(s) in ${pane.id}`;
        handleStatus(message);
        return {
          ...base,
          ok: true,
          paneId: pane.id,
          closedContentIds,
          closedTerminalIds,
          message,
        };
      }

      const pane = findTargetPane();
      const targetContentId = contentId || pane?.activeContentId || pane?.contents[0] || '';
      if (targetContentId) {
        const content = engine.contents.get(targetContentId);
        if (!content) return { ...base, ok: false, error: 'Dock content not found' };
        const termId = engine.closeContent(targetContentId);
        if (termId) terminalHost.kill(termId);
        handleStatus(`Xenesis Desk closed: ${content.title || targetContentId}`);
        return {
          ...base,
          ok: true,
          closedContentIds: [targetContentId],
          closedTerminalIds: termId ? [termId] : [],
          message: `Closed ${content.title || targetContentId}`,
        };
      }

      if (!pane) return { ...base, ok: false, error: 'Dock pane not found' };
      const closedContentIds = [...pane.contents];
      const closedTerminalIds = engine.closeAllContentsInPane(pane.id);
      for (const termId of closedTerminalIds) terminalHost.kill(termId);
      handleStatus(`Xenesis Desk closed pane: ${pane.id}`);
      return {
        ...base,
        ok: true,
        closedContentIds,
        closedTerminalIds,
        message: `Closed ${closedContentIds.length} item(s) in ${pane.id}`,
      };
    },
    [engine, handleStatus, setActiveTermId],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onDockAction?.((payload) => handleMcpDockAction(payload));
  }, [handleMcpDockAction]);

  const handleMcpBrowserAction = useCallback(
    async (payload: McpBridgeBrowserActionPayload): Promise<McpBridgeBrowserActionResult> => {
      const explicitContentId = String(payload.contentId || '').trim();
      const paneId = String(payload.paneId || '').trim();
      const resolveBrowserContentId = (): string | undefined => {
        const explicit = explicitContentId ? engine.contents.get(explicitContentId) : undefined;
        if (explicit?.contentType === 'browser') return explicitContentId;

        const pane = paneId ? engine.panes.get(paneId) : undefined;
        if (pane) {
          const active = pane.activeContentId ? engine.contents.get(pane.activeContentId) : undefined;
          if (active?.contentType === 'browser') return pane.activeContentId ?? undefined;
          const firstBrowser = pane.contents.find((id) => engine.contents.get(id)?.contentType === 'browser');
          if (firstBrowser) return firstBrowser;
        }

        const activePane = engine.activePaneId ? engine.panes.get(engine.activePaneId) : undefined;
        const activeContent = activePane?.activeContentId ? engine.contents.get(activePane.activeContentId) : undefined;
        if (activeContent?.contentType === 'browser') return activePane?.activeContentId ?? undefined;

        const firstBrowser = [...engine.contents.values()].find((content) => content.contentType === 'browser');
        return firstBrowser?.id;
      };
      return runBrowserPaneAction(payload, resolveBrowserContentId());
    },
    [engine],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onBrowserAction?.((payload) => handleMcpBrowserAction(payload));
  }, [handleMcpBrowserAction]);

  const handleMcpExplorerAction = useCallback(
    (payload: McpBridgeExplorerActionPayload): McpBridgeExplorerActionResult => {
      const action = payload.action;
      const path = String(payload.path || '').trim();
      const selectPath = String(payload.selectPath || '').trim();
      const base = { requestId: payload.requestId, action };
      if (isDetachedWindow) {
        return { ...base, ok: false, explorerOpen: false, error: 'File Explorer is not available in detached windows' };
      }
      if (action === 'navigate' && !path) {
        return { ...base, ok: false, explorerOpen, rootDir: defaultCwd, error: 'path is required' };
      }

      const nextOpen = action === 'hide' ? false : action === 'toggle' ? !explorerOpen : true;
      setExplorerOpen(nextOpen);

      if (action === 'navigate') {
        setDefaultCwd(path);
        const detail: LocalExplorerNavigateRequest = { path, ...(selectPath ? { selectPath } : {}) };
        window.dispatchEvent(new CustomEvent<LocalExplorerNavigateRequest>(LOCAL_EXPLORER_NAVIGATE_EVENT, { detail }));
        handleStatus(`File Explorer navigated: ${selectPath || path}`);
        return { ...base, ok: true, explorerOpen: true, rootDir: path, selectPath: selectPath || undefined };
      }

      if (action !== 'show' && action !== 'hide' && action !== 'toggle') {
        dispatchLocalExplorerAction({
          action,
          path: path || undefined,
          selectPath: selectPath || undefined,
          query: payload.query,
          shell: payload.shell,
        });
        handleStatus(`File Explorer action dispatched: ${action}`);
        return {
          ...base,
          ok: true,
          explorerOpen: true,
          rootDir: defaultCwd || undefined,
          selectPath: selectPath || path || undefined,
          query: payload.query,
          message: `Dispatched local explorer action: ${action}`,
        };
      }

      handleStatus(`File Explorer ${nextOpen ? 'shown' : 'hidden'}`);
      return { ...base, ok: true, explorerOpen: nextOpen, rootDir: defaultCwd || undefined };
    },
    [defaultCwd, explorerOpen, handleStatus, isDetachedWindow],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onExplorerAction?.((payload) => handleMcpExplorerAction(payload));
  }, [handleMcpExplorerAction]);

  const handleMcpRemoteExplorerAction = useCallback(
    (payload: McpBridgeRemoteExplorerActionPayload): McpBridgeRemoteExplorerActionResult => {
      const action = payload.action;
      const profileId = String(payload.profileId || '').trim();
      const path = String(payload.path || '').trim();
      const selectPath = String(payload.selectPath || '').trim();
      const base = { requestId: payload.requestId, action };
      if (isDetachedWindow) {
        return {
          ...base,
          ok: false,
          remoteExplorerOpen: false,
          error: 'Remote Explorer is not available in detached windows',
        };
      }

      setExplorerOpen(true);

      if (action === 'navigate') {
        if (!profileId) return { ...base, ok: false, remoteExplorerOpen: true, error: 'profileId is required' };
        if (!path) return { ...base, ok: false, remoteExplorerOpen: true, profileId, error: 'path is required' };
        setRemoteExplorerNavigateHandoff({ profileId, path, ...(selectPath ? { selectPath } : {}) });
        handleStatus(`Remote Explorer navigated: ${selectPath || path}`);
        return {
          ...base,
          ok: true,
          remoteExplorerOpen: true,
          profileId,
          path,
          selectPath: selectPath || undefined,
        };
      }

      if (action !== 'show') {
        dispatchRemoteExplorerAction({
          action,
          profileId: profileId || undefined,
          path: path || undefined,
          selectPath: selectPath || undefined,
          query: payload.query,
        });
        handleStatus(`Remote Explorer action dispatched: ${action}`);
        return {
          ...base,
          ok: true,
          remoteExplorerOpen: true,
          profileId: profileId || undefined,
          path: path || undefined,
          selectPath: selectPath || path || undefined,
          query: payload.query,
          message: `Dispatched remote explorer action: ${action}`,
        };
      }

      dispatchRemoteExplorerAction({ action: 'refresh', profileId: profileId || undefined });
      handleStatus('Remote Explorer shown');
      return { ...base, ok: true, remoteExplorerOpen: true, profileId: profileId || undefined };
    },
    [handleStatus, isDetachedWindow],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onRemoteExplorerAction?.((payload) => handleMcpRemoteExplorerAction(payload));
  }, [handleMcpRemoteExplorerAction]);

  const handleMcpTerminalUiAction = useCallback(
    async (payload: McpBridgeTerminalUiActionPayload): Promise<McpBridgeTerminalUiActionResult> => {
      const action = payload.action;
      const termId = String(payload.termId || activeTermId || terminalHost.activeTermId || '').trim();
      const base = { requestId: payload.requestId, action, termId: termId || undefined };
      if (!termId || !terminalHost.has(termId)) {
        return { ...base, ok: false, error: 'Terminal target not found' };
      }

      try {
        switch (action) {
          case 'copy':
            terminalHost.copy(termId);
            break;
          case 'paste':
            terminalHost.paste(termId);
            break;
          case 'selectAll':
            terminalHost.selectAll(termId);
            break;
          case 'clearScreen':
            terminalHost.clearScreen(termId);
            break;
          case 'clearScrollback':
            terminalHost.clearScrollback(termId);
            break;
          case 'scrollTop':
            terminalHost.scrollToTop(termId);
            terminalHost.focus(termId);
            break;
          case 'scrollBottom':
            terminalHost.scrollToBottom(termId);
            terminalHost.focus(termId);
            break;
          case 'setFitLock': {
            if (typeof payload.locked !== 'boolean') {
              return { ...base, ok: false, error: 'locked is required' };
            }
            terminalHost.setFitLock(termId, payload.locked);
            handleStatus(`Terminal fit lock ${payload.locked ? 'enabled' : 'disabled'}: ${termId}`);
            return { ...base, ok: true, locked: payload.locked };
          }
          case 'toggleFitLock': {
            const locked = !terminalHost.isFitLocked(termId);
            terminalHost.setFitLock(termId, locked);
            handleStatus(`Terminal fit lock ${locked ? 'enabled' : 'disabled'}: ${termId}`);
            return { ...base, ok: true, locked };
          }
          case 'findNext':
          case 'findPrev': {
            const query = String(payload.query || '').trim();
            if (!query) return { ...base, ok: false, error: 'query is required' };
            if (action === 'findNext') terminalHost.findNext(termId, query);
            else terminalHost.findPrev(termId, query);
            return { ...base, ok: true, query };
          }
          case 'saveLog': {
            const text = terminalHost.getBufferText(termId);
            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            await window.terminalAPI.saveLog({ defaultName: `terminal-${stamp}.log`, text });
            break;
          }
          case 'sendSelectionToBot':
          case 'sendRecentOutputToBot': {
            const session = terminalHost.listSessions().find((item) => item.id === termId);
            const message =
              action === 'sendSelectionToBot'
                ? buildTerminalBotContextMessageFromSession(session, {
                    mode: 'selection',
                    selectedText: terminalHost.getSelection(termId),
                  })
                : buildTerminalBotContextMessageFromSession(session, {
                    mode: 'recent-output',
                    recentOutput: terminalHost.getBufferText(termId).split(/\r?\n/).slice(-200).join('\n'),
                  });
            sendXenesisContextMessage(message, { source: `terminal-ui:${action}` });
            break;
          }
          default:
            return { ...base, ok: false, error: `Unsupported terminal UI action: ${action}` };
        }
        handleStatus(`Terminal UI action completed: ${action}`);
        return { ...base, ok: true };
      } catch (error) {
        return { ...base, ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    [activeTermId, handleStatus],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onTerminalUiAction?.((payload) => handleMcpTerminalUiAction(payload));
  }, [handleMcpTerminalUiAction]);

  const openMcpTerminalSession = useCallback(
    (payload: McpBridgeOpenTerminalPayload) => {
      const id = String(payload?.id || '').trim();
      if (!id) return;
      const isDeskSubagent = payload.metadata?.kind === 'xenesis-desk-subagent';
      const subagentTask =
        isDeskSubagent && payload.metadata?.task ? String(payload.metadata.task).replace(/\s+/g, ' ').trim() : '';

      if (engine.contents.has(id)) {
        const pane = engine.findPaneByContent(id);
        pane?.activateContent(id);
        if (!terminalHost.has(id)) {
          terminalHost.adoptTerminal(id, themeRef.current, fontSizeRef.current);
        }
        terminalHost.focus(id);
        setActiveTermId(id);
        handleStatus(
          `Xenesis Desk MCP terminal focused: ${payload.title || id}${subagentTask ? ` · ${subagentTask}` : ''}`,
        );
        return;
      }

      const spawnConfig: TerminalSpawnConfig = {
        kind: 'shell',
        shell: payload.shell || defaultShell,
        cwd: payload.cwd || defaultCwd || undefined,
      };
      const terminalRestore = createTerminalSessionSnapshot(spawnConfig);
      if (payload.metadata) terminalRestore.metadata = payload.metadata;

      engine.addContentWithPlacement(
        {
          id,
          title: payload.title || 'MCP Terminal',
          state: 'document',
          html: '',
          contentType: 'terminal',
          termId: id,
          terminalRestore,
        },
        payload.placement ?? 'tab',
        payload.targetPaneId,
      );
      terminalHost.adoptTerminal(id, themeRef.current, fontSizeRef.current);
      mcpTerminalSessionsRef.current.add(id);
      setActiveTermId(id);
      handleStatus(
        `Xenesis Desk MCP terminal opened: ${payload.title || id}${subagentTask ? ` · ${subagentTask}` : ''}`,
      );
    },
    [defaultCwd, defaultShell, engine, handleStatus, setActiveTermId],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOpenTerminal?.((payload) => {
      openMcpTerminalSession(payload);
    });
  }, [openMcpTerminalSession]);

  const openRemoteFile = useCallback(
    (result: OpenFileResult | null, profile: RemoteFileProfile) => {
      if (!result) {
        handleStatus(t('app.cannotReadFile'));
        return;
      }

      const id = `remote-file-${crypto.randomUUID()}`;
      const isXcon = isXconExt(result.ext);
      const isMermaid = result.ext === 'mmd';
      const resolvedType = isXcon ? 'xcon-viewer' : isMermaid ? 'mermaid' : result.contentType;
      engine.addContent({
        id,
        title: result.fileName,
        state: 'document',
        html: '',
        contentType: resolvedType,
        filePath: result.filePath,
        fileName: result.fileName,
        fileContent: result.content,
        fileExt: result.ext,
        totalBytes: result.totalBytes,
        fileOrigin: 'remote',
        remoteFileProfile: profile,
        remoteFilePath: result.filePath,
      });
      handleStatus(
        t('app.remoteFileOpened', {
          name: result.fileName,
          server: profile.name || profile.host || profile.protocol.toUpperCase(),
        }),
      );
    },
    [engine, handleStatus, t],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenRemoteFileRequest>).detail;
      if (!detail?.profile || !detail.path) return;
      void (async () => {
        try {
          const result = await window.remoteFileAPI.readFile(detail.profile, detail.path);
          openRemoteFile(result, detail.profile);
        } catch (error) {
          handleStatus(error instanceof Error ? error.message : String(error));
        }
      })();
    };
    window.addEventListener(OPEN_REMOTE_FILE_EVENT, handler);
    return () => window.removeEventListener(OPEN_REMOTE_FILE_EVENT, handler);
  }, [handleStatus, openRemoteFile]);

  // ── xapp-readme-ready: 생성 완료 후 앱 README.md를 문서 탭으로 열기 ─────────
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<{ readmePath?: string; projectPath?: string }>;
      const readmePath = ev.detail?.readmePath || joinLocalPath(ev.detail?.projectPath, 'README.md');
      if (!readmePath) return;
      void openFileByPath(readmePath);
    };
    window.addEventListener('xapp-readme-ready', handler);
    return () => window.removeEventListener('xapp-readme-ready', handler);
  }, [openFileByPath]);

  // ── 경로 없이 File 객체에서 직접 내용 읽어 열기 (sandbox 환경 fallback) ────────
  const openFileObject = useCallback(
    async (file: File) => {
      const name = file.name;
      // 복합 확장자(*.xcon.json, *.xcon.xml) 우선 감지, 없으면 단순 마지막 확장자
      const compoundMatch = /\.(xcon\.(?:json|xml|tagless))$/i.exec(name);
      const ext = compoundMatch
        ? compoundMatch[1].toLowerCase()
        : name.includes('.')
          ? name.split('.').pop()!.toLowerCase()
          : '';
      const id = `file-${crypto.randomUUID()}`;

      // SVG / HTML / HTM → blob URL로 브라우저 패인
      if (['svg', 'html', 'htm'].includes(ext)) {
        const blob = new Blob([await file.text()], { type: file.type || 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        engine.addContent({ id, title: name, state: 'document', html: '', contentType: 'browser', url: blobUrl });
        handleStatus(t('app.openedBrowser', { name }));
        return;
      }

      // 이미지 → FileReader로 data URL 생성
      const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico'];
      if (imageExts.includes(ext)) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        engine.addContent({
          id,
          title: name,
          state: 'document',
          html: '',
          contentType: 'image',
          fileName: name,
          fileContent: dataUrl,
          fileExt: ext,
        });
        handleStatus(t('app.openedImage', { name }));
        return;
      }

      if (DOCUMENT_PREVIEW_EXTS.has(ext)) {
        const buffer = await file.arrayBuffer();
        engine.addContent({
          id,
          title: name,
          state: 'document',
          html: '',
          contentType: 'document-preview',
          fileName: name,
          fileContent: arrayBufferToBase64(buffer),
          fileExt: ext,
        });
        handleStatus(t('app.tabOpened', { title: name }));
        return;
      }

      // 텍스트 / 코드 / 마크다운 / XCON
      try {
        const content = await file.text();
        const isMarkdown = ext === 'md' || ext === 'mdx';
        const isMermaid = ext === 'mmd';
        const isXcon = isXconExt(ext);
        engine.addContent({
          id,
          title: name,
          state: 'document',
          html: '',
          contentType: isXcon ? 'xcon-viewer' : isMermaid ? 'mermaid' : isMarkdown ? 'markdown' : 'code',
          fileName: name,
          fileContent: content,
          fileExt: ext,
        });
        handleStatus(
          t('app.tabOpened', { title: name }) +
            (isXcon ? t('app.openedXcon') : isMermaid ? t('app.openedMermaid') : ''),
        );
      } catch {
        // 바이너리 → 헥스 뷰어
        try {
          const buffer = await file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          const preview = bytes.slice(0, 5 * 1024 * 1024);
          const lines: string[] = [];
          for (let i = 0; i < preview.length; i += 16) {
            const chunk = preview.slice(i, i + 16);
            const hex = Array.from(chunk)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' ');
            const ascii = Array.from(chunk)
              .map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.'))
              .join('');
            lines.push(`${i.toString(16).padStart(8, '0')}  ${hex.padEnd(47)}  |${ascii}|`);
          }
          engine.addContent({
            id,
            title: name,
            state: 'document',
            html: '',
            contentType: 'hex',
            fileName: name,
            fileContent: lines.join('\n'),
            fileExt: ext,
            totalBytes: file.size,
          });
          handleStatus(t('app.openedHexNamed', { name }));
        } catch {
          handleStatus(t('app.cannotReadFileNamed', { name }));
        }
      }
    },
    [engine, handleStatus],
  );

  // ── 외부 탐색기 드래그&드롭 핸들러 ──────────────────────────────────────────
  const clearExtDragWatchdog = useCallback(() => {
    if (extDragWatchdogRef.current === null) return;
    window.clearTimeout(extDragWatchdogRef.current);
    extDragWatchdogRef.current = null;
  }, []);

  const resetExtFileDragOverlay = useCallback(() => {
    extDragCounterRef.current = 0;
    clearExtDragWatchdog();
    setExtDragOver(false);
  }, [clearExtDragWatchdog]);

  const armExtDragWatchdog = useCallback(() => {
    clearExtDragWatchdog();
    extDragWatchdogRef.current = window.setTimeout(() => {
      extDragCounterRef.current = 0;
      extDragWatchdogRef.current = null;
      setExtDragOver(false);
    }, EXT_FILE_DRAG_IDLE_RESET_MS);
  }, [clearExtDragWatchdog]);

  useEffect(() => {
    const handleWindowDragLeave = (event: DragEvent) => {
      const leftViewport =
        event.clientX <= 0 ||
        event.clientY <= 0 ||
        event.clientX >= window.innerWidth ||
        event.clientY >= window.innerHeight;
      if (leftViewport) resetExtFileDragOverlay();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') resetExtFileDragOverlay();
    };

    window.addEventListener('dragleave', handleWindowDragLeave, true);
    window.addEventListener('dragend', resetExtFileDragOverlay);
    window.addEventListener('drop', resetExtFileDragOverlay);
    window.addEventListener('blur', resetExtFileDragOverlay);
    window.addEventListener('mouseleave', resetExtFileDragOverlay);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('dragleave', handleWindowDragLeave, true);
      window.removeEventListener('dragend', resetExtFileDragOverlay);
      window.removeEventListener('drop', resetExtFileDragOverlay);
      window.removeEventListener('blur', resetExtFileDragOverlay);
      window.removeEventListener('mouseleave', resetExtFileDragOverlay);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearExtDragWatchdog();
    };
  }, [clearExtDragWatchdog, resetExtFileDragOverlay]);

  const handleExtDragEnter = useCallback(
    (e: React.DragEvent) => {
      // 내부 탭 드래그(application/xamong-*)는 무시
      const types = Array.from(e.dataTransfer.types);
      if (types.some((t) => t.startsWith('application/xamong'))) return;
      if (!types.includes('Files')) return;
      e.preventDefault();
      armExtDragWatchdog();
      extDragCounterRef.current += 1;
      // pane-body 위라면 그쪽이 처리하므로 글로벌 오버레이 숨김
      const overPaneBody = !!(e.target as Element)?.closest?.('.pane-body');
      if (!overPaneBody) setExtDragOver(true);
    },
    [armExtDragWatchdog],
  );

  const handleExtDragLeave = useCallback(
    (e: React.DragEvent) => {
      const types = Array.from(e.dataTransfer.types);
      if (types.some((t) => t.startsWith('application/xamong'))) return;
      extDragCounterRef.current -= 1;
      if (extDragCounterRef.current <= 0) {
        resetExtFileDragOverlay();
      } else {
        armExtDragWatchdog();
      }
    },
    [armExtDragWatchdog, resetExtFileDragOverlay],
  );

  const handleExtDragOver = useCallback(
    (e: React.DragEvent) => {
      const types = Array.from(e.dataTransfer.types);
      if (types.some((t) => t.startsWith('application/xamong'))) return;
      if (!types.includes('Files')) return;
      e.preventDefault();
      armExtDragWatchdog();
      // dragover 는 연속 발생하므로 마우스가 pane-body 위인지 실시간 감지해 오버레이 전환
      const overPaneBody = !!(e.target as Element)?.closest?.('.pane-body');
      setExtDragOver(!overPaneBody);
      e.dataTransfer.dropEffect = 'copy';
    },
    [armExtDragWatchdog],
  );

  const handleExtDrop = useCallback(
    async (e: React.DragEvent) => {
      resetExtFileDragOverlay();
      const types = Array.from(e.dataTransfer.types);
      if (types.some((t) => t.startsWith('application/xamong'))) return;
      if (!types.includes('Files')) return;
      e.preventDefault();
      // pane-body 에서 드롭된 경우 stopPropagation 으로 차단됐으므로 여기는 비-패인 영역 처리
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      for (const file of files) {
        // Electron 29+: webUtils.getPathForFile() 로 경로 취득 (preload 경유)
        const filePath = window.fileAPI.getPathForFile(file);
        if (filePath) {
          await openFileByPath(filePath);
        } else {
          await openFileObject(file);
        }
      }
    },
    [openFileByPath, openFileObject, resetExtFileDragOverlay],
  );

  // ── pane-body 위 드롭 → 패인 내부 동작 ─────────────────────────────────────
  const handleExtFileDrop = useCallback(
    async (files: File[], targetPane: import('./dock/engine').DockPane) => {
      const activeContentId = targetPane.activeContentId;
      const activeContent = activeContentId ? engine.contents.get(activeContentId) : null;

      if (activeContent?.contentType === 'terminal' && activeContent.termId) {
        // 터미널: 파일 경로를 터미널 입력창에 삽입
        // Electron 29+: webUtils.getPathForFile() 로 경로 취득 (preload 경유)
        let insertedAny = false;
        for (const file of files) {
          const filePath = window.fileAPI.getPathForFile(file);
          if (filePath) {
            const toInsert = filePath.includes(' ') ? `"${filePath}"` : filePath;
            window.terminalAPI.write(activeContent.termId, toInsert);
            insertedAny = true;
          }
        }
        if (insertedAny) {
          handleStatus(t('app.insertFilePath', { path: files.map((f) => f.name).join(', ') }));
        } else {
          handleStatus(t('app.cannotGetFilePath'));
        }
      } else {
        // 다른 패인: 이 패인 그룹에 파일 열기 (activePaneId를 먼저 설정)
        engine.activePaneId = targetPane.id;
        for (const file of files) {
          const filePath = window.fileAPI.getPathForFile(file);
          if (filePath) {
            await openFileByPath(filePath);
          } else {
            await openFileObject(file);
          }
        }
      }
    },
    [engine, openFileByPath, openFileObject, handleStatus],
  );

  // ── 탭 분리 창 (tear-off) ────────────────────────────────────────────────────
  const handleDetach = useCallback(
    (payload: DropPayload, mode: DetachMode, targetWindowId?: number) => {
      let contentId: string | null = null;

      if (payload.type === 'content') {
        contentId = payload.contentId;
      } else {
        // 패인 드래그 시 active content를 대상으로 함
        const pane = engine.panes.get(payload.paneId);
        contentId = pane?.activeContentId ?? null;
      }

      if (!contentId) return;
      const content = engine.contents.get(contentId);
      if (!content) return;

      // 터미널 탭: 새 PTY 스폰 없이 xterm 인스턴스만 해제하고 PTY를 유지한다.
      // 대상 창에서 adoptTerminal()로 PTY에 재연결된다.
      if (content.contentType === 'terminal') {
        const termId = content.termId;
        if (!termId) {
          handleStatus(t('app.terminalDetachError'));
          return;
        }
        terminalHost.release(termId);
      }

      const detachData: DetachPayload = {
        id: `detach-${crypto.randomUUID()}`,
        title: content.title,
        titleKey: content.titleKey,
        titleVars: content.titleVars,
        html: content.html,
        contentType: content.contentType,
        termId: content.termId, // 터미널 탭의 PTY 세션 ID (non-terminal은 undefined)
        terminalRestore: content.terminalRestore,
        url: content.url,
        filePath: content.filePath,
        fileName: content.fileName,
        fileContent: content.fileContent,
        fileExt: content.fileExt,
      };

      // 탭 이동 후 현재 창에 탭이 없으면 창 닫기 (분리 창 전용)
      const closeCurrentWindowIfEmpty = () => {
        if (isDetachedWindow && engine.contents.size === 0) {
          window.fileAPI.closeSelf?.().catch(() => {});
        }
      };

      if (mode === 'reattach') {
        // 분리 창 → 메인 창으로 재결합
        if (typeof window.fileAPI?.reattachDrop === 'function') {
          window.fileAPI
            .reattachDrop(detachData)
            .catch((err: unknown) =>
              handleStatus(t('app.reattachFailed', { e: (err as Error)?.message ?? String(err) })),
            );
          engine.closeContent(contentId);
          handleStatus(t('app.tabReattachedMainContent', { title: content.title }));
          closeCurrentWindowIfEmpty();
        }
      } else if (mode === 'merge-to-detached' && targetWindowId != null) {
        // 분리 창 → 다른 분리 창으로 탭 합치기
        if (typeof window.fileAPI?.mergeTabToDetached === 'function') {
          window.fileAPI
            .mergeTabToDetached(detachData, targetWindowId)
            .catch((err: unknown) => handleStatus(t('app.mergeFailed', { e: (err as Error)?.message ?? String(err) })));
          engine.closeContent(contentId);
          handleStatus(t('app.tabMergedOther', { title: content.title }));
          closeCurrentWindowIfEmpty();
        }
      } else {
        // 새 분리 창 생성 (메인 창 → 새 창, 또는 분리 창 → 새 창)
        if (typeof window.fileAPI?.detachTab !== 'function') {
          handleStatus(t('app.detachRequiresRestart'));
          return;
        }
        window.fileAPI
          .detachTab(detachData)
          .catch((err: unknown) => handleStatus(t('app.detachFailed', { e: (err as Error)?.message ?? String(err) })));
        engine.closeContent(contentId);
        handleStatus(t('app.tabDetachedNew', { title: content.title }));
        closeCurrentWindowIfEmpty();
      }
    },
    [engine, handleStatus, isDetachedWindow],
  );

  // ── 터미널 세션 생성 ──────────────────────────────────────────────────────────
  const createTerminalSession = useCallback(
    (kind: ShellKind, options?: { cwd?: string }) => {
      const shellInfo = shells.find((s) => s.kind === kind);
      if (shellInfo && !shellInfo.available) {
        handleStatus(t('app.shellNotFound', { cmd: shellInfo.command }));
        return;
      }

      const id = crypto.randomUUID();

      // 탐색기에서 선택한 경로가 있으면 우선 사용:
      //   - 폴더를 선택한 경우 → 해당 폴더
      //   - 파일을 선택한 경우 → 파일의 부모 폴더
      //   - 아무것도 선택 안 한 경우 → defaultCwd 사용
      let spawnCwd = options?.cwd || defaultCwd || undefined;
      if (!options?.cwd && explorerSelectedPath) {
        // 파일/폴더 구분: path 자체로 판단하지 않고 마지막 세그먼트에 확장자 있으면 파일로 간주
        // (정확도를 위해 간단하게 처리 — FsEntry.isDirectory 정보는 콜백에서 따로 저장)
        const selectedIsDir = explorerSelectedIsDir;
        spawnCwd = selectedIsDir
          ? explorerSelectedPath
          : explorerSelectedPath.replace(/[\\/][^\\/]+$/, '') || explorerSelectedPath;
      }

      const spawnConfig: TerminalSpawnConfig = { kind: 'shell', shell: kind, cwd: spawnCwd };
      terminalHost.spawn(id, spawnConfig, theme, fontSize);

      const counter = termCounterRef.current;
      counter[kind] = (counter[kind] ?? 0) + 1;
      const label = SHELL_LABEL[kind];
      const num = counter[kind];

      engine.addContent({
        id,
        title: `${label} ${num}`,
        state: 'document',
        html: '',
        contentType: 'terminal',
        termId: id,
        terminalRestore: createTerminalSessionSnapshot(spawnConfig),
      });

      // 새로 만든 터미널을 즉시 활성 대상으로 설정
      setActiveTermId(id);
      const cwdHint = spawnCwd ? ` (${spawnCwd.split(/[\\/]/).pop() ?? spawnCwd})` : '';
      handleStatus(t('app.terminalOpened', { label, cwd: cwdHint }));
    },
    [
      engine,
      handleStatus,
      setActiveTermId,
      shells,
      theme,
      fontSize,
      defaultCwd,
      explorerSelectedPath,
      explorerSelectedIsDir,
    ],
  );

  const createLocalProfileTerminalSession = useCallback(
    (profile: LocalTerminalProfile) => {
      const shellInfo = shells.find((s) => s.kind === profile.shell);
      if (shellInfo && !shellInfo.available) {
        handleStatus(t('app.shellNotFound', { cmd: shellInfo.command }));
        return;
      }

      const id = crypto.randomUUID();
      const label = profile.name.trim() || SHELL_LABEL[profile.shell];

      const spawnConfig: TerminalSpawnConfig = { kind: 'shell', shell: profile.shell, cwd: profile.cwd, profile };
      terminalHost.spawn(id, spawnConfig, theme, fontSize);

      engine.addContent({
        id,
        title: label,
        state: 'document',
        html: '',
        contentType: 'terminal',
        termId: id,
        terminalRestore: createTerminalSessionSnapshot(spawnConfig),
      });

      setActiveTermId(id);
      const cwdHint = profile.cwd ? ` (${profile.cwd.split(/[\\/]/).pop() ?? profile.cwd})` : '';
      handleStatus(t('app.localTerminalOpened', { label, cwd: cwdHint }));
    },
    [engine, fontSize, handleStatus, setActiveTermId, shells, t, theme],
  );

  const createXenesisTuiTerminalSession = useCallback(() => {
    const cwd = defaultCwd || '.';
    const shell = selectXenesisTuiShell(shells, defaultShell);
    void deskBridge.call(XENESIS_TUI_CAPABILITY_PATH, { cwd, shell, placement: 'tab' }).then(
      (result) => {
        if (!result.ok) {
          handleStatus(result.error || `Xenesis TUI capability failed: ${XENESIS_TUI_CAPABILITY_PATH}`);
        }
      },
      (error) => {
        handleStatus(error instanceof Error ? error.message : String(error));
      },
    );
  }, [defaultCwd, defaultShell, handleStatus, shells]);

  const handleSaveTerminalProfile = useCallback(
    (termId: string) => {
      const session = terminalHost.listSessions().find((item) => item.id === termId);
      const profile = buildLocalTerminalProfileFromSession(session, {
        existingProfiles: localProfiles,
      });

      if (!profile) {
        handleStatus(t('app.terminalProfileSaveUnsupported'));
        return;
      }

      openSettingsTarget(buildTerminalProfileSettingsTarget(profile));
      handleStatus(t('app.terminalProfileDraftReady', { name: profile.name }));
    },
    [handleStatus, localProfiles, openSettingsTarget, t],
  );

  const createRemoteTerminalSession = useCallback(
    (profile: RemoteTerminalProfile) => {
      if (!profile.host.trim()) {
        handleStatus(t('app.remoteProfileMissingHost'));
        return;
      }

      const id = crypto.randomUUID();
      const protocolLabel = profile.protocol.toUpperCase();
      const profileLabel = profile.name.trim() || profile.host.trim();

      const spawnConfig: TerminalSpawnConfig = { kind: profile.protocol, profile };
      terminalHost.spawn(id, spawnConfig, theme, fontSize);

      remoteCounterRef.current += 1;
      const title = `${protocolLabel}: ${profileLabel}`;
      engine.addContent({
        id,
        title,
        state: 'document',
        html: '',
        contentType: 'terminal',
        termId: id,
        terminalRestore: createTerminalSessionSnapshot(spawnConfig),
      });

      setActiveTermId(id);
      handleStatus(t('app.remoteTerminalOpened', { protocol: protocolLabel, label: profileLabel }));
    },
    [engine, fontSize, handleStatus, setActiveTermId, t, theme],
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const profile = (event as CustomEvent<RemoteTerminalProfile>).detail;
      if (profile) createRemoteTerminalSession(profile);
    };
    window.addEventListener('app-open-remote-terminal', handler);
    return () => window.removeEventListener('app-open-remote-terminal', handler);
  }, [createRemoteTerminalSession]);

  useEffect(() => {
    const handler = (event: Event) => {
      const profile = (event as CustomEvent<LocalTerminalProfile>).detail;
      if (profile) createLocalProfileTerminalSession(profile);
    };
    window.addEventListener('app-open-local-terminal', handler);
    return () => window.removeEventListener('app-open-local-terminal', handler);
  }, [createLocalProfileTerminalSession]);

  // ── 자동화 설정 변경 감지 → 실행 중인 컨트롤러에 반영 ──────────────────────────
  useEffect(() => {
    const handler = () => {
      window.automationAPI?.reloadSettings?.();
    };
    window.addEventListener('app-settings-changed', handler);
    return () => window.removeEventListener('app-settings-changed', handler);
  }, []);

  // ── 자동화 감시 창 열기 ───────────────────────────────────────────────────────
  const handleOpenAutomationMonitor = useCallback(
    (termId: string) => {
      // 이미 같은 termId의 감시 창이 열려 있으면 활성화만 함
      for (const [cid, content] of engine.contents.entries()) {
        if (content.contentType === 'automation-monitor' && content.termId === termId) {
          // 해당 탭을 활성화
          for (const pane of engine.panes.values()) {
            if (pane.contents.includes(cid)) {
              pane.activateContent(cid);
              engine.notify();
              handleStatus(t('app.automationMonitor', { title: content.title }));
              return;
            }
          }
        }
      }
      // 없으면 새 탭으로 생성
      const monitorId = `auto-monitor-${termId}`;
      // termId에서 터미널 탭 제목 찾기
      let termTitle = termId;
      for (const content of engine.contents.values()) {
        if (content.contentType === 'terminal' && content.termId === termId) {
          termTitle = content.title;
          break;
        }
      }
      engine.addContent({
        id: monitorId,
        title: `🤖 ${termTitle}`,
        state: 'document',
        html: '',
        contentType: 'automation-monitor',
        termId,
      });
      handleStatus(t('app.automationMonitorOpened', { title: termTitle }));
    },
    [engine, handleStatus],
  );

  const closeOnboardingPane = useCallback(() => {
    for (const [id, content] of engine.contents) {
      if (content.contentType === 'onboarding') {
        engine.closeContent(id);
        return;
      }
    }
  }, [engine]);

  const getOnboardingSampleWorkspacePath = useCallback(
    (fallback?: string): string => String(onboardingSampleWorkspacePathRef.current || fallback || '').trim(),
    [],
  );

  const buildOnboardingRuntimeSnapshot = useCallback(
    (context: OnboardingVerificationContext): OnboardingRuntimeSnapshot => {
      const sampleWorkspacePath = String(
        context.sampleWorkspacePath || onboardingSampleWorkspacePathRef.current || '',
      ).trim();
      if (sampleWorkspacePath) {
        onboardingSampleWorkspacePathRef.current = sampleWorkspacePath;
      }
      return {
        defaultCwd,
        sampleWorkspacePath,
        workspacePath: onboardingWorkspaceProfilePathRef.current || workspacePath,
        contents: Array.from(engine.contents.values()).map((content) => {
          const spawnConfig = content.terminalRestore?.spawnConfig;
          const terminalCwd = spawnConfig && 'cwd' in spawnConfig ? spawnConfig.cwd : undefined;
          return {
            id: content.id,
            title: content.title,
            contentType: content.contentType,
            state: content.state,
            filePath: content.filePath,
            fileName: content.fileName,
            termId: content.termId,
            terminalCwd,
          };
        }),
        panes: Array.from(engine.panes.values()).map((pane) => ({
          id: pane.id,
          state: pane.state,
          contents: [...pane.contents],
          activeContentId: pane.activeContentId,
        })),
        settingsTarget: onboardingSettingsTargetRef.current,
        externalIntegrationReadiness: context.externalIntegrationReadiness ?? null,
      };
    },
    [defaultCwd, engine, workspacePath],
  );

  const readOnboardingExternalIntegrationReadiness = useCallback(async () => {
    try {
      const [statusReadback, doctorReadback] = await Promise.all([
        deskBridge.call('xd.xenesis.integrations.status'),
        deskBridge.call('xd.xenesis.integrations.doctor.status'),
      ]);
      const statusResult =
        statusReadback.result && typeof statusReadback.result === 'object' && !Array.isArray(statusReadback.result)
          ? (statusReadback.result as Record<string, unknown>)
          : {};
      const doctorResult =
        doctorReadback.result && typeof doctorReadback.result === 'object' && !Array.isArray(doctorReadback.result)
          ? (doctorReadback.result as Record<string, unknown>)
          : {};
      const findings = Array.isArray(doctorResult.findings) ? doctorResult.findings : [];
      const blockingFindings = findings.filter(
        (finding) =>
          finding &&
          typeof finding === 'object' &&
          !Array.isArray(finding) &&
          ((finding as Record<string, unknown>).severity === 'error' ||
            (finding as Record<string, unknown>).severity === 'critical'),
      ).length;
      return {
        checked: true,
        statusOk: statusReadback.ok === true && statusResult.ok === true,
        doctorOk: doctorReadback.ok === true && doctorResult.ok === true,
        blockingFindings,
      };
    } catch {
      return {
        checked: true,
        statusOk: false,
        doctorOk: false,
        blockingFindings: 1,
      };
    }
  }, []);

  const handleOnboardingOpenFolder = useCallback(async () => {
    if (onboardingFolderPendingRef.current) return;
    onboardingFolderPendingRef.current = true;
    try {
      const selected = await window.terminalAPI.selectCwd();
      if (selected === null) return;
      onboardingSampleWorkspacePathRef.current = selected;
      onboardingWorkspaceProfilePathRef.current = getOnboardingWorkspaceProfilePath(selected);
      setDefaultCwd(selected);
      setExplorerOpen(true);
      setExplorerSelectedPath(selected);
      setExplorerSelectedIsDir(true);
      await window.terminalAPI.saveSettings({ defaultCwd: selected });
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: { defaultCwd: selected } }));
      handleStatus(t('app.onboardingFolderSelected', { path: selected }));
    } catch (error) {
      handleStatus(
        t('app.onboardingFolderSelectFailed', { e: error instanceof Error ? error.message : String(error) }),
      );
    } finally {
      onboardingFolderPendingRef.current = false;
    }
  }, [handleStatus, t]);

  const handleOnboardingOpenTerminal = useCallback(() => {
    const sampleWorkspacePath = getOnboardingSampleWorkspacePath(defaultCwd);
    createTerminalSession(defaultShell, sampleWorkspacePath ? { cwd: sampleWorkspacePath } : undefined);
  }, [createTerminalSession, defaultCwd, defaultShell, getOnboardingSampleWorkspacePath]);

  const handleOnboardingOpenFile = useCallback(() => {
    const sampleWorkspacePath = getOnboardingSampleWorkspacePath(defaultCwd);
    if (sampleWorkspacePath) {
      void openFileByPath(getOnboardingSampleFilePath(sampleWorkspacePath, ONBOARDING_SAMPLE_WELCOME_FILE_NAME));
      return;
    }
    void openLocalFile();
  }, [defaultCwd, getOnboardingSampleWorkspacePath, openFileByPath, openLocalFile]);

  const handleOnboardingOpenWorkspace = useCallback(() => {
    openSettingsCategory('workspace');
  }, [openSettingsCategory]);

  const handleOnboardingOpenAiProviderSettings = useCallback(() => {
    openSettingsTarget({ category: 'run-model', section: 'provider-connection', ensureVisible: true });
  }, [openSettingsTarget]);

  const handleOnboardingOpenProviderSetupPlan = useCallback(() => {
    openSettingsTarget({
      category: 'xenesis-agent',
      mode: 'connections',
      section: 'xenesis-connections',
      focusConnectionDetail: 'provider-setup-plan',
      ensureVisible: true,
    });
  }, [openSettingsTarget]);

  const handleOnboardingOpenExternalToolSetup = useCallback(() => {
    openSettingsTarget({
      category: 'xenesis-agent',
      mode: 'connections',
      section: 'xenesis-connections',
      focusConnectionDetail: 'tool-setup-plan',
      ensureVisible: true,
    });
  }, [openSettingsTarget]);

  const handleOnboardingOpenToolConnectors = useCallback(() => {
    openSettingsTarget({
      category: 'xenesis-agent',
      mode: 'connections',
      section: 'xenesis-connections',
      focusConnectionDetail: 'tool-connector',
      ensureVisible: true,
    });
  }, [openSettingsTarget]);

  const handleOnboardingOpenMcpSetup = useCallback(() => {
    openSettingsTarget({
      category: 'xenesis-agent',
      mode: 'connections',
      section: 'xenesis-connections',
      focusConnectionDetail: 'mcp-install-draft',
      ensureVisible: true,
    });
  }, [openSettingsTarget]);

  const handleOnboardingOpenMcpOauth = useCallback(() => {
    openSettingsTarget({
      category: 'xenesis-agent',
      mode: 'connections',
      section: 'xenesis-connections',
      focusConnectionDetail: 'tool-mcp-oauth',
      ensureVisible: true,
    });
  }, [openSettingsTarget]);

  const handleOnboardingOpenKeyboardShortcuts = useCallback(() => {
    openSettingsCategory('keyboard-shortcuts');
  }, [openSettingsCategory]);

  const handleOnboardingOpenExtensions = useCallback(() => {
    openSettingsCategory('extensions');
  }, [openSettingsCategory]);

  const handleOnboardingOpenDiagnostics = useCallback(() => {
    openDiagnosticsPane();
  }, [openDiagnosticsPane]);

  const handleOnboardingOpenCommandCenter = useCallback(() => {
    ensureCommandCenterContent(engine);
    const content = engine.contents.get(COMMAND_CENTER_CONTENT_ID);
    if (content?.state === 'hidden') {
      engine.restoreHiddenContent(COMMAND_CENTER_CONTENT_ID);
    } else {
      engine.moveContentToState(COMMAND_CENTER_CONTENT_ID, 'bottom');
    }
    handleStatus(t('app.commandCenterTitle'));
  }, [engine, handleStatus, t]);

  const handleOnboardingArrangePanes = useCallback(() => {
    handleArrangeGrid();
  }, [handleArrangeGrid]);

  const handleOnboardingSaveWorkspace = useCallback(async () => {
    const sampleWorkspacePath = getOnboardingSampleWorkspacePath(defaultCwd);
    if (!sampleWorkspacePath) {
      await handleSaveWorkspace();
      return;
    }
    try {
      const profile = await buildWorkspaceProfile();
      const targetPath = getOnboardingWorkspaceProfilePath(sampleWorkspacePath);
      const result = await window.workspaceAPI.saveTo(profile, targetPath);
      if (!result.saved) return;
      const resolvedPath = result.path ?? targetPath;
      onboardingWorkspaceProfilePathRef.current = resolvedPath;
      const workspace = {
        currentPath: resolvedPath,
        recent: result.recent,
        autoRestore: workspaceAutoRestore,
      };
      setWorkspacePath(workspace.currentPath);
      setWorkspaceRecent(workspace.recent);
      await window.terminalAPI.saveSettings({ workspace });
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: { workspace } }));
      handleStatus(t('app.workspaceSaved', { name: result.profile?.name ?? profile.name }));
    } catch (error) {
      handleStatus(t('app.workspaceSaveFailed', { e: error instanceof Error ? error.message : String(error) }));
    }
  }, [
    buildWorkspaceProfile,
    defaultCwd,
    getOnboardingSampleWorkspacePath,
    handleSaveWorkspace,
    handleStatus,
    t,
    workspaceAutoRestore,
  ]);

  const handleOnboardingRestoreWorkspace = useCallback(async () => {
    const sampleWorkspacePath = getOnboardingSampleWorkspacePath(defaultCwd);
    const targetPath =
      onboardingWorkspaceProfilePathRef.current ||
      (sampleWorkspacePath ? getOnboardingWorkspaceProfilePath(sampleWorkspacePath) : '');
    if (!targetPath) {
      await handleOpenWorkspace();
      return;
    }
    try {
      const result = await window.workspaceAPI.read(targetPath);
      onboardingWorkspaceProfilePathRef.current = result.path;
      await applyWorkspaceOpenResult(result);
    } catch (error) {
      handleStatus(t('app.workspaceOpenFailed', { e: error instanceof Error ? error.message : String(error) }));
    }
  }, [applyWorkspaceOpenResult, defaultCwd, getOnboardingSampleWorkspacePath, handleOpenWorkspace, handleStatus, t]);

  const handleOnboardingUseWorkspacePath = useCallback(
    async (workspacePath: string) => {
      const selected = String(workspacePath || '').trim();
      if (!selected) return;
      onboardingSampleWorkspacePathRef.current = selected;
      onboardingWorkspaceProfilePathRef.current = getOnboardingWorkspaceProfilePath(selected);
      setDefaultCwd(selected);
      setExplorerOpen(true);
      setExplorerSelectedPath(selected);
      setExplorerSelectedIsDir(true);
      await window.terminalAPI.saveSettings({ defaultCwd: selected });
      window.dispatchEvent(new CustomEvent('app-settings-changed', { detail: { defaultCwd: selected } }));
      handleStatus(t('app.onboardingFolderSelected', { path: selected }));
    },
    [handleStatus, t],
  );

  const handleOnboardingVerifyStep = useCallback(
    async (stepId: string, context: OnboardingVerificationContext): Promise<OnboardingStepVerificationResult> => {
      const externalIntegrationReadiness =
        stepId === 'connect-external-tools' ? await readOnboardingExternalIntegrationReadiness() : undefined;
      const result = verifyBasicDeskOnboardingStep(
        stepId,
        buildOnboardingRuntimeSnapshot({ ...context, externalIntegrationReadiness }),
      );
      return {
        passed: result.passed,
        message: t(result.reasonKey),
      };
    },
    [buildOnboardingRuntimeSnapshot, readOnboardingExternalIntegrationReadiness, t],
  );

  const runOnboardingStepAction = useCallback(
    async (
      stepId: string,
      requestedSampleWorkspacePath?: string,
    ): Promise<OnboardingStepVerificationResult & { ran: boolean; sampleWorkspacePath?: string }> => {
      const normalizedStepId = String(stepId || '').trim();
      let sampleWorkspacePath = String(
        requestedSampleWorkspacePath || getOnboardingSampleWorkspacePath(defaultCwd),
      ).trim();
      if (sampleWorkspacePath) {
        onboardingSampleWorkspacePathRef.current = sampleWorkspacePath;
        onboardingWorkspaceProfilePathRef.current = getOnboardingWorkspaceProfilePath(sampleWorkspacePath);
      }

      if (normalizedStepId === 'choose-workspace-folder') {
        if (!window.onboardingAPI?.prepareSampleWorkspace) {
          return { passed: false, ran: false, message: 'Onboarding sample workspace API is not available.' };
        }
        const result = await window.onboardingAPI.prepareSampleWorkspace();
        sampleWorkspacePath = result.path;
        await handleOnboardingUseWorkspacePath(sampleWorkspacePath);
      } else if (normalizedStepId === 'configure-ai-provider') {
        handleOnboardingOpenProviderSetupPlan();
      } else if (normalizedStepId === 'connect-external-tools') {
        handleOnboardingOpenExternalToolSetup();
      } else if (normalizedStepId === 'configure-mcp') {
        handleOnboardingOpenMcpSetup();
      } else if (normalizedStepId === 'open-settings-diagnostics') {
        handleOnboardingOpenWorkspace();
        handleOnboardingOpenDiagnostics();
      } else if (normalizedStepId === 'save-restore-workspace') {
        await handleOnboardingSaveWorkspace();
        await handleOnboardingRestoreWorkspace();
      } else {
        return { passed: false, ran: false, message: `Unknown onboarding step: ${normalizedStepId}` };
      }

      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });
      const verification = await handleOnboardingVerifyStep(normalizedStepId, { sampleWorkspacePath });
      return { ...verification, ran: true, sampleWorkspacePath };
    },
    [
      createTerminalSession,
      defaultCwd,
      defaultShell,
      getOnboardingSampleWorkspacePath,
      handleOnboardingArrangePanes,
      handleOnboardingOpenCommandCenter,
      handleOnboardingOpenDiagnostics,
      handleOnboardingOpenExternalToolSetup,
      handleOnboardingOpenMcpSetup,
      handleOnboardingOpenProviderSetupPlan,
      handleOnboardingOpenWorkspace,
      handleOnboardingRestoreWorkspace,
      handleOnboardingSaveWorkspace,
      handleOnboardingUseWorkspacePath,
      handleOnboardingVerifyStep,
      openFileByPath,
    ],
  );

  const captureOnboardingScenarioFrame = useCallback(
    async (stepId: string, index: number, total: number): Promise<CapturePaneResult | undefined> => {
      if (!window.captureAPI?.capturePane) return undefined;
      await new Promise<void>((resolve) =>
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        }),
      );
      const targetElement =
        document.querySelector<HTMLElement>('.app-shell') ??
        document.querySelector<HTMLElement>('.desktop-shell') ??
        document.body;
      const rect = targetElement.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return undefined;
      return window.captureAPI.capturePane({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        title: `Basic Desk onboarding ${index + 1}/${total}: ${stepId}`,
        contentType: 'onboarding-scenario',
      });
    },
    [],
  );

  const runOnboardingScenario = useCallback(
    async (
      request: Omit<McpBridgeOnboardingScenarioRunPayload, 'requestId'> & { requestId?: string; verifyOnly?: boolean },
    ): Promise<McpBridgeOnboardingScenarioRunResult> => {
      const requestId = request.requestId || `renderer-${crypto.randomUUID()}`;
      let sampleWorkspacePath = String(
        request.sampleWorkspacePath || getOnboardingSampleWorkspacePath(defaultCwd),
      ).trim();
      const stopOnFailure = request.stopOnFailure !== false;
      const delayMs = Math.max(0, Math.min(5_000, Math.round(Number(request.delayMs ?? 250))));
      const steps: McpBridgeOnboardingScenarioRunResult['steps'] = [];
      const startedAt = new Date().toISOString();

      try {
        if (request.resetSample === true && window.onboardingAPI?.resetSampleWorkspace) {
          await window.onboardingAPI.resetSampleWorkspace();
          sampleWorkspacePath = '';
        }
        if (!request.verifyOnly && request.prepareSample !== false && window.onboardingAPI?.prepareSampleWorkspace) {
          const status = await window.onboardingAPI.prepareSampleWorkspace();
          sampleWorkspacePath = status.path;
          await handleOnboardingUseWorkspacePath(status.path);
        } else if (sampleWorkspacePath) {
          await handleOnboardingUseWorkspacePath(sampleWorkspacePath);
        }

        for (const [index, stepId] of BASIC_DESK_ONBOARDING_STEP_IDS.entries()) {
          const definition = BASIC_DESK_ONBOARDING_STEPS.find((step) => step.id === stepId) ?? null;
          let stepResult: OnboardingStepVerificationResult & { ran?: boolean; sampleWorkspacePath?: string };
          if (request.verifyOnly) {
            stepResult = {
              ...(await handleOnboardingVerifyStep(stepId, { sampleWorkspacePath })),
              ran: false,
              sampleWorkspacePath,
            };
          } else {
            stepResult = await runOnboardingStepAction(stepId, sampleWorkspacePath);
            if (stepResult.sampleWorkspacePath) sampleWorkspacePath = stepResult.sampleWorkspacePath;
          }
          const passed = stepResult.passed === true;
          const caption =
            request.caption === true && definition?.demo?.captionKey ? t(definition.demo.captionKey) : undefined;
          const capture =
            request.capture === true
              ? await captureOnboardingScenarioFrame(stepId, index, BASIC_DESK_ONBOARDING_STEP_IDS.length)
              : undefined;
          steps.push({
            stepId,
            index,
            total: BASIC_DESK_ONBOARDING_STEP_IDS.length,
            ok: passed,
            ran: stepResult.ran === true,
            verified: true,
            passed,
            message: stepResult.message,
            caption,
            capture,
          });
          if (!passed && stopOnFailure) break;
          if (!request.verifyOnly && delayMs > 0 && index < BASIC_DESK_ONBOARDING_STEP_IDS.length - 1) {
            await new Promise((resolve) => window.setTimeout(resolve, delayMs));
          }
        }

        const completed = steps.length === BASIC_DESK_ONBOARDING_STEP_IDS.length && steps.every((step) => step.passed);
        const finishedAt = new Date().toISOString();
        const shouldSaveArtifact = request.capture === true || request.caption === true || Boolean(request.artifactDir);
        const artifact =
          shouldSaveArtifact && window.onboardingAPI?.saveRunArtifact
            ? await window.onboardingAPI.saveRunArtifact({
                runId: `basic-desk-${requestId}`,
                title: 'Basic Desk onboarding demo',
                trackId: 'basic-desk',
                startedAt,
                finishedAt,
                sampleWorkspacePath: sampleWorkspacePath || undefined,
                artifactDir: request.artifactDir,
                steps,
              })
            : undefined;
        handleStatus(
          t('app.onboardingScenarioComplete', {
            passed: steps.filter((step) => step.passed).length,
            total: BASIC_DESK_ONBOARDING_STEP_IDS.length,
          }),
        );
        return {
          requestId,
          trackId: 'basic-desk',
          ok: completed,
          completed,
          stoppedAtStepId: completed ? undefined : steps.find((step) => !step.passed)?.stepId,
          sampleWorkspacePath: sampleWorkspacePath || undefined,
          steps,
          artifact,
        };
      } catch (error) {
        return {
          requestId,
          trackId: 'basic-desk',
          ok: false,
          completed: false,
          stoppedAtStepId: steps.find((step) => !step.passed)?.stepId,
          sampleWorkspacePath: sampleWorkspacePath || undefined,
          steps,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [
      defaultCwd,
      captureOnboardingScenarioFrame,
      getOnboardingSampleWorkspacePath,
      handleOnboardingUseWorkspacePath,
      handleOnboardingVerifyStep,
      handleStatus,
      runOnboardingStepAction,
      t,
    ],
  );

  const handleMcpOnboardingStepAction = useCallback(
    async (payload: McpBridgeOnboardingStepActionPayload): Promise<McpBridgeOnboardingStepActionResult> => {
      const requestId = String(payload?.requestId || '').trim();
      const action: McpBridgeOnboardingStepActionPayload['action'] = payload?.action === 'run' ? 'run' : 'verify';
      const stepId = String(payload?.stepId || '').trim();
      const sampleWorkspacePath = String(
        payload?.sampleWorkspacePath || getOnboardingSampleWorkspacePath(defaultCwd),
      ).trim();
      const base = { requestId, action, stepId, sampleWorkspacePath: sampleWorkspacePath || undefined };
      if (!requestId) return { ...base, ok: false, error: 'requestId is required' };
      if (!stepId) return { ...base, ok: false, error: 'stepId is required' };

      try {
        if (action === 'run') {
          const result = await runOnboardingStepAction(stepId, sampleWorkspacePath);
          return {
            ...base,
            ok: result.ran && result.passed,
            ran: result.ran,
            passed: result.passed,
            message: result.message,
            sampleWorkspacePath: result.sampleWorkspacePath || sampleWorkspacePath || undefined,
          };
        }
        const result = await handleOnboardingVerifyStep(stepId, { sampleWorkspacePath });
        return {
          ...base,
          ok: true,
          verified: true,
          passed: result.passed,
          message: result.message,
        };
      } catch (error) {
        return {
          ...base,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [defaultCwd, getOnboardingSampleWorkspacePath, handleOnboardingVerifyStep, runOnboardingStepAction],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOnboardingStepAction?.((payload) => handleMcpOnboardingStepAction(payload));
  }, [handleMcpOnboardingStepAction]);

  const handleMcpOnboardingScenarioRun = useCallback(
    async (payload: McpBridgeOnboardingScenarioRunPayload): Promise<McpBridgeOnboardingScenarioRunResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId) {
        return {
          requestId: '',
          trackId: 'basic-desk',
          ok: false,
          completed: false,
          steps: [],
          error: 'requestId is required',
        };
      }
      return runOnboardingScenario({
        requestId,
        trackId: 'basic-desk',
        sampleWorkspacePath: payload.sampleWorkspacePath,
        prepareSample: payload.prepareSample,
        resetSample: payload.resetSample,
        stopOnFailure: payload.stopOnFailure,
        delayMs: payload.delayMs,
        capture: payload.capture,
        caption: payload.caption,
        artifactDir: payload.artifactDir,
      });
    },
    [runOnboardingScenario],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOnboardingScenarioRun?.((payload) => handleMcpOnboardingScenarioRun(payload));
  }, [handleMcpOnboardingScenarioRun]);

  const handleMcpOnboardingRunPreview = useCallback(
    async (payload: McpBridgeOnboardingRunPreviewPayload): Promise<McpBridgeOnboardingRunPreviewResult> => {
      const requestId = String(payload?.requestId || '').trim();
      const runId = String(payload?.runId || '').trim();
      if (!requestId)
        return { requestId: '', ok: false, runId: runId || undefined, selected: false, error: 'requestId is required' };

      openOnboardingPane({ silent: true, placement: 'tab' });
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });

      const result = await new Promise<McpBridgeOnboardingRunPreviewResult>((resolve) => {
        let settled = false;
        let timeout: number | undefined;
        let listener: (event: Event) => void = () => undefined;
        const finish = (nextResult: McpBridgeOnboardingRunPreviewResult) => {
          if (settled) return;
          settled = true;
          if (typeof timeout === 'number') window.clearTimeout(timeout);
          window.removeEventListener('onboarding-run-preview-result', listener);
          resolve(nextResult);
        };
        listener = (event: Event) => {
          const detail = (event as CustomEvent<Partial<McpBridgeOnboardingRunPreviewResult>>).detail ?? {};
          if (String(detail.requestId || '').trim() !== requestId) return;
          finish({
            requestId,
            ok: detail.ok === true,
            runId: typeof detail.runId === 'string' ? detail.runId : runId || undefined,
            selected: detail.selected === true,
            artifact: detail.artifact,
            error: typeof detail.error === 'string' ? detail.error : undefined,
          });
        };
        timeout = window.setTimeout(() => {
          finish({
            requestId,
            ok: false,
            runId: runId || undefined,
            selected: false,
            error: 'Timed out waiting for onboarding run preview',
          });
        }, 8_000);
        window.addEventListener('onboarding-run-preview-result', listener);
        window.dispatchEvent(
          new CustomEvent('onboarding-run-preview-request', {
            detail: {
              requestId,
              runId: runId || undefined,
              ensureVisible: payload.ensureVisible !== false,
            },
          }),
        );
      });

      if (result.ok && payload.capture === true) {
        const capture = await captureOnboardingScenarioFrame('run-preview', 0, 1);
        return { ...result, capture };
      }
      return result;
    },
    [captureOnboardingScenarioFrame, openOnboardingPane],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOnboardingRunPreview?.((payload) => handleMcpOnboardingRunPreview(payload));
  }, [handleMcpOnboardingRunPreview]);

  const handleMcpOnboardingDemoModeRun = useCallback(
    async (payload: McpBridgeOnboardingDemoModeRunPayload): Promise<McpBridgeOnboardingDemoModeRunResult> => {
      const requestId = String(payload?.requestId || '').trim();
      if (!requestId) {
        return {
          requestId: '',
          ok: false,
          completed: false,
          error: 'requestId is required',
        };
      }

      const openedContentId = openOnboardingPane({ silent: true, placement: 'tab' });
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });
      const targetContentId =
        openedContentId ||
        document.querySelector<HTMLElement>('.content-view.is-active[data-content-type="onboarding"]')?.dataset
          .contentId;

      return new Promise<McpBridgeOnboardingDemoModeRunResult>((resolve) => {
        let settled = false;
        let timeout: number | undefined;
        let listener: (event: Event) => void = () => undefined;
        let ensureVisibleListener: (event: Event) => void = () => undefined;
        const finish = (result: McpBridgeOnboardingDemoModeRunResult) => {
          if (settled) return;
          settled = true;
          if (typeof timeout === 'number') window.clearTimeout(timeout);
          window.removeEventListener('onboarding-demo-mode-run-result', listener);
          window.removeEventListener('onboarding-demo-mode-ensure-visible-request', ensureVisibleListener);
          resolve(result);
        };
        listener = (event: Event) => {
          const detail = (event as CustomEvent<McpBridgeOnboardingDemoModeRunResult>).detail;
          if (!detail || String(detail.requestId || '').trim() !== requestId) return;
          finish(detail);
        };
        ensureVisibleListener = (event: Event) => {
          const detail = (event as CustomEvent<{ requestId?: string }>).detail ?? {};
          if (String(detail.requestId || '').trim() !== requestId) return;
          openOnboardingPane({ silent: true, placement: 'tab' });
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
              window.dispatchEvent(
                new CustomEvent('onboarding-demo-mode-ensure-visible-result', {
                  detail: { requestId },
                }),
              );
            });
          });
        };
        timeout = window.setTimeout(() => {
          finish({
            requestId,
            ok: false,
            completed: false,
            error: 'Timed out waiting for onboarding Demo Mode UI flow',
          });
        }, 75_000);
        window.addEventListener('onboarding-demo-mode-run-result', listener);
        window.addEventListener('onboarding-demo-mode-ensure-visible-request', ensureVisibleListener);
        window.dispatchEvent(
          new CustomEvent('onboarding-demo-mode-run-request', {
            detail: {
              requestId,
              targetContentId,
              ensureVisible: payload.ensureVisible !== false,
              capture: payload.capture !== false,
              openPlayer: payload.openPlayer === true,
            },
          }),
        );
      });
    },
    [openOnboardingPane],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onOnboardingDemoModeRun?.((payload) => handleMcpOnboardingDemoModeRun(payload));
  }, [handleMcpOnboardingDemoModeRun]);

  const handleMcpDemoLabPlaybackControl = useCallback(
    async (payload: McpBridgeDemoLabPlaybackControlPayload): Promise<McpBridgeDemoLabPlaybackControlResult> => {
      const requestId = String(payload?.requestId || '').trim();
      const action = payload?.action || 'status';
      if (!requestId) return { requestId: '', action, ok: false, error: 'requestId is required' };

      return new Promise<McpBridgeDemoLabPlaybackControlResult>((resolve) => {
        let settled = false;
        let timeout: number | undefined;
        let listener: (event: Event) => void = () => undefined;
        const finish = (result: McpBridgeDemoLabPlaybackControlResult) => {
          if (settled) return;
          settled = true;
          if (typeof timeout === 'number') window.clearTimeout(timeout);
          window.removeEventListener('demo-lab-playback-control-result', listener);
          resolve(result);
        };
        listener = (event: Event) => {
          const detail = (event as CustomEvent<McpBridgeDemoLabPlaybackControlResult>).detail;
          if (!detail || String(detail.requestId || '').trim() !== requestId) return;
          finish(detail);
        };
        timeout = window.setTimeout(() => {
          finish({
            requestId,
            action,
            ok: false,
            contentId: payload.contentId,
            error: 'Timed out waiting for Demo Lab playback control',
          });
        }, 4_500);
        window.addEventListener('demo-lab-playback-control-result', listener);
        window.dispatchEvent(
          new CustomEvent('demo-lab-playback-control-request', {
            detail: payload,
          }),
        );
      });
    },
    [],
  );

  useEffect(() => {
    return getDeskBridgeApi()?.onDemoLabPlaybackControl?.((payload) => handleMcpDemoLabPlaybackControl(payload));
  }, [handleMcpDemoLabPlaybackControl]);

  const handleOnboardingRunScenario = useCallback(
    () =>
      runOnboardingScenario({
        trackId: 'basic-desk',
        prepareSample: true,
        resetSample: false,
        stopOnFailure: true,
        delayMs: 500,
        capture: true,
        caption: true,
      }),
    [runOnboardingScenario],
  );

  const handleOnboardingVerifyAll = useCallback(
    () =>
      runOnboardingScenario({
        trackId: 'basic-desk',
        prepareSample: false,
        resetSample: false,
        stopOnFailure: false,
        delayMs: 0,
        verifyOnly: true,
      }),
    [runOnboardingScenario],
  );

  const handleOnboardingDismiss = useCallback(() => {
    setOnboardingDismissed(true);
    closeOnboardingPane();
    handleStatus(t('app.onboardingDismissed'));
  }, [closeOnboardingPane, handleStatus, t]);

  // ── 즐겨찾기 콜백 ────────────────────────────────────────────────────────────

  const handleFavAdd = useCallback((draft: Omit<FavoriteItem, 'id' | 'addedAt'>) => {
    setFavorites((prev) => {
      const next = addFavorite(prev, draft);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleFavRemove = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = removeFavorite(prev, id);
      saveFavorites(next);
      return next;
    });
  }, []);

  /** 파일 탐색기 항목 → 즐겨찾기 추가 */
  const handleAddToFavorites = useCallback(
    (path: string, isDirectory: boolean) => {
      handleFavAdd({
        kind: isDirectory ? 'folder' : 'file',
        path,
        label: labelFromPath(path),
      });
    },
    [handleFavAdd],
  );

  const syncXenesisExplorerWorkspace = useCallback((workspacePath: string) => {
    const normalized = String(workspacePath || '').trim();
    if (!normalized) return;
    window.xenesisAPI?.setWorkspace(normalized).catch(() => {});
  }, []);

  /** 현재 활성 탭 → 즐겨찾기 추가 */
  const handleAddCurrentTab = useCallback(() => {
    // document 창의 활성 탭 찾기
    let activeContent = null;
    for (const pane of engine.panes.values()) {
      if (pane.state === 'document' && pane.activeContentId) {
        activeContent = engine.contents.get(pane.activeContentId) ?? null;
        if (activeContent) break;
      }
    }
    // document 창에 없으면 어떤 창이든 최근 활성 탭 탐색
    if (!activeContent) {
      for (const pane of engine.panes.values()) {
        if (pane.activeContentId) {
          activeContent = engine.contents.get(pane.activeContentId) ?? null;
          if (activeContent) break;
        }
      }
    }

    if (!activeContent) {
      handleStatus(t('app.favoritesAddFailed'));
      return;
    }

    if (activeContent.contentType === 'browser' && activeContent.url) {
      handleFavAdd({ kind: 'url', path: activeContent.url, label: labelFromUrl(activeContent.url) });
      handleStatus(t('app.favoritesAdded', { label: labelFromUrl(activeContent.url) }));
    } else if (activeContent.contentType === 'terminal') {
      const cwd = defaultCwd || '';
      if (!cwd) {
        handleStatus(t('app.noDefaultCwd'));
        return;
      }
      handleFavAdd({ kind: 'terminal-path', path: cwd, label: labelFromPath(cwd) });
      handleStatus(t('app.favoritesAdded', { label: labelFromPath(cwd) }));
    } else if (activeContent.filePath) {
      handleFavAdd({ kind: 'file', path: activeContent.filePath, label: labelFromPath(activeContent.filePath) });
      handleStatus(t('app.favoritesAdded', { label: labelFromPath(activeContent.filePath) }));
    } else {
      handleStatus(t('app.cannotFavoriteTab'));
    }
  }, [engine, defaultCwd, handleFavAdd, handleStatus]);

  /** 즐겨찾기 항목 열기 */
  const handleFavOpen = useCallback(
    (item: FavoriteItem) => {
      switch (item.kind) {
        case 'file':
          openFileByPath(item.path);
          break;
        case 'folder':
          setDefaultCwd(item.path);
          window.dispatchEvent(new CustomEvent('workspace-changed', { detail: { path: item.path } }));
          break;
        case 'url':
          createBrowserPane(item.path);
          break;
        case 'terminal-path': {
          createTerminalSession(defaultShell);
          // 짧은 지연 후 cd 명령 전송
          setTimeout(() => {
            // 가장 최근 생성된 터미널을 찾아 cd 명령 전송
            const latestTermId = activeTermId;
            if (latestTermId && terminalHost.has(latestTermId)) {
              terminalHost.sendLine(latestTermId, `cd "${item.path}"`);
            }
          }, 400);
          break;
        }
      }
    },
    [openFileByPath, createBrowserPane, createTerminalSession, defaultShell, activeTermId],
  );

  /** 즐겨찾기 항목 → 특정 터미널에서 열기 */
  const handleFavOpenInTerminal = useCallback(
    (path: string, kind: ShellKind) => {
      const savedSelection = explorerSelectedPath;
      const savedIsDir = explorerSelectedIsDir;
      // 임시로 선택 경로를 해당 폴더로 설정하여 터미널 시작 cwd 결정에 활용
      setExplorerSelectedPath(path);
      setExplorerSelectedIsDir(true);
      setTimeout(() => {
        createTerminalSession(kind);
        setExplorerSelectedPath(savedSelection);
        setExplorerSelectedIsDir(savedIsDir);
      }, 0);
    },
    [createTerminalSession, explorerSelectedPath, explorerSelectedIsDir],
  );

  const handleMcpFavoritesAction = useCallback(
    async (payload: McpBridgeFavoritesActionPayload): Promise<McpBridgeFavoritesActionResult> => {
      const action = payload.action;
      const items = () => favorites.map((item) => ({ ...item }));
      const base = {
        requestId: payload.requestId,
        action,
      };

      if (action === 'list') {
        return { ...base, ok: true, items: items() };
      }

      if (action === 'add') {
        if (!payload.path || !payload.kind) {
          return { ...base, ok: false, error: 'path and kind are required', items: items() };
        }
        let nextItems: FavoriteItem[] = favorites;
        const label =
          payload.label || (payload.kind === 'url' ? labelFromUrl(payload.path) : labelFromPath(payload.path));
        setFavorites((prev) => {
          nextItems = addFavorite(prev, { kind: payload.kind!, path: payload.path!, label });
          saveFavorites(nextItems);
          return nextItems;
        });
        handleStatus(t('app.favoritesAdded', { label }));
        return { ...base, ok: true, path: payload.path, items: nextItems.map((item) => ({ ...item })) };
      }

      if (action === 'addCurrentTab') {
        handleAddCurrentTab();
        return { ...base, ok: true, items: items(), message: 'Requested active tab favorite add.' };
      }

      if (action === 'remove') {
        if (!payload.id) return { ...base, ok: false, error: 'id is required', items: items() };
        let nextItems: FavoriteItem[] = favorites;
        setFavorites((prev) => {
          nextItems = removeFavorite(prev, payload.id!);
          saveFavorites(nextItems);
          return nextItems;
        });
        return { ...base, ok: true, id: payload.id, items: nextItems.map((item) => ({ ...item })) };
      }

      const item = payload.id ? favorites.find((candidate) => candidate.id === payload.id) : undefined;
      const targetPath = payload.path || item?.path || '';
      if (action === 'open') {
        if (!item) return { ...base, ok: false, id: payload.id, error: 'favorite item was not found', items: items() };
        handleFavOpen(item);
        return { ...base, ok: true, id: item.id, path: item.path, items: items() };
      }

      if (action === 'openInTerminal') {
        if (!targetPath || !payload.shell) {
          return { ...base, ok: false, error: 'path and shell are required', items: items() };
        }
        handleFavOpenInTerminal(targetPath, payload.shell);
        return { ...base, ok: true, path: targetPath, items: items() };
      }

      if (action === 'copyPath') {
        if (!targetPath) return { ...base, ok: false, error: 'path is required', items: items() };
        try {
          await navigator.clipboard.writeText(targetPath);
          return { ...base, ok: true, path: targetPath, items: items() };
        } catch (error) {
          return {
            ...base,
            ok: false,
            path: targetPath,
            error: error instanceof Error ? error.message : String(error),
            items: items(),
          };
        }
      }

      if (action === 'showTab') {
        const tab = payload.tab;
        if (tab !== 'favorites' && tab !== 'captures' && tab !== 'remote-files') {
          return { ...base, ok: false, error: 'tab is required', items: items() };
        }
        window.dispatchEvent(new CustomEvent('xenis:favorites-show-tab', { detail: { tab } }));
        return { ...base, ok: true, tab, items: items() };
      }

      return { ...base, ok: false, error: `Unsupported favorites action: ${action}`, items: items() };
    },
    [favorites, handleAddCurrentTab, handleFavOpen, handleFavOpenInTerminal, handleStatus, t],
  );

  useEffect(
    () => getDeskBridgeApi()?.onFavoritesAction?.((payload) => handleMcpFavoritesAction(payload)),
    [handleMcpFavoritesAction],
  );

  /** 파일 탐색기 항목 → 특정 터미널에서 열기 */
  const handleExplorerOpenInTerminal = useCallback(
    (path: string, isDirectory: boolean, kind: ShellKind) => {
      const savedSelection = explorerSelectedPath;
      const savedIsDir = explorerSelectedIsDir;
      setExplorerSelectedPath(path);
      setExplorerSelectedIsDir(isDirectory);
      setTimeout(() => {
        createTerminalSession(kind);
        setExplorerSelectedPath(savedSelection);
        setExplorerSelectedIsDir(savedIsDir);
      }, 0);
    },
    [createTerminalSession, explorerSelectedPath, explorerSelectedIsDir],
  );

  // ── 명령 바 핸들러 ────────────────────────────────────────────────────────

  const terminalSessionsForCommand = useMemo(() => terminalHost.listSessions(), [activeTermId, dockTick]);

  const commandGroupNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of terminalGroups) map.set(group.id, group.name);
    return map;
  }, [terminalGroups]);

  const commandTerminalTargets = useMemo<CommandCenterTerminalTarget[]>(
    () =>
      terminalSessionsForCommand.map((session) => ({
        id: session.id,
        label: formatCommandCenterTerminalLabel(session),
        detail: session.detail,
        groupId: session.groupId || '',
        groupName: session.groupId
          ? commandGroupNameById.get(session.groupId) || session.groupName || session.groupId
          : t('app.commandTargetUngrouped'),
        active: session.id === activeTermId,
      })),
    [activeTermId, commandGroupNameById, terminalSessionsForCommand, t],
  );

  const commandTargetGroups = useMemo<CommandCenterTargetGroup[]>(() => {
    const groups = new Map<string, CommandCenterTargetGroup>();
    for (const target of commandTerminalTargets) {
      const id = target.groupId;
      const existing = groups.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(id, {
          id,
          name: target.groupName || t('app.commandTargetUngrouped'),
          count: 1,
        });
      }
    }
    return [...groups.values()].sort((a, b) => {
      if (a.id === '' && b.id !== '') return 1;
      if (a.id !== '' && b.id === '') return -1;
      return a.name.localeCompare(b.name);
    });
  }, [commandTerminalTargets, t]);

  useEffect(() => {
    const previousActiveTermId = previousCommandActiveTermIdRef.current;
    const availableTerminalIds = commandTerminalTargets.map((target) => target.id);
    setCommandSelectedTermIds((prev) =>
      syncCommandCenterSelectedTerminalIds({
        targetMode: commandTargetMode,
        selectedTerminalIds: prev,
        activeTermId,
        previousActiveTermId,
        availableTerminalIds,
      }),
    );
    previousCommandActiveTermIdRef.current = activeTermId;
  }, [activeTermId, commandTargetMode, commandTerminalTargets]);

  useEffect(() => {
    if (commandTargetMode !== 'group') return;
    if (commandTargetGroups.some((group) => group.id === commandTargetGroupId)) return;
    setCommandTargetGroupId(commandTargetGroups[0]?.id ?? '');
  }, [commandTargetGroupId, commandTargetGroups, commandTargetMode]);

  useEffect(
    () => () => {
      commandSequenceRunIdRef.current += 1;
    },
    [],
  );

  const resolveCommandTargetTermIds = useCallback((): string[] => {
    const sessions = terminalHost.listSessions();
    if (commandTargetMode === 'all') return sessions.map((session) => session.id);
    if (commandTargetMode === 'selected') {
      const selected = new Set(commandSelectedTermIds);
      return sessions.filter((session) => selected.has(session.id)).map((session) => session.id);
    }
    if (commandTargetMode === 'group') {
      return sessions
        .filter((session) => (session.groupId || '') === commandTargetGroupId)
        .map((session) => session.id);
    }
    return activeTermId && terminalHost.has(activeTermId) ? [activeTermId] : [];
  }, [activeTermId, commandSelectedTermIds, commandTargetGroupId, commandTargetMode]);

  const resolvedCommandTargetCount = useMemo(
    () => resolveCommandTargetTermIds().length,
    [resolveCommandTargetTermIds, activeTermId, dockTick],
  );

  const rememberTerminalLastCommand = useCallback(
    (termId: string, command: string) => {
      const content = engine.contents.get(termId);
      if (!content || content.contentType !== 'terminal' || !content.terminalRestore) return;
      content.terminalRestore = {
        ...content.terminalRestore,
        lastCommand: command.trim(),
      };
    },
    [engine],
  );

  const handleSendCmd = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      if (commandSequenceRunning) {
        handleStatus(t('app.commandSequenceAlreadyRunning'));
        return;
      }
      const targetIds = resolveCommandTargetTermIds();
      if (targetIds.length === 0) {
        handleStatus(commandTargetMode === 'active' ? t('app.noActiveTerminal') : t('app.noCommandTargets'));
        return;
      }
      const newHist = pushHistory(cmdHistory, trimmed);
      setCmdHistory(newHist);
      saveHistory(newHist);
      setHistoryIdx(-1);
      setCmdInput('');
      for (const targetId of targetIds) rememberTerminalLastCommand(targetId, trimmed);
      const lineEnding = commandLineEndingSequence(commandLineEnding);
      if (targetIds.length === 1) {
        terminalHost.sendLine(targetIds[0], trimmed, lineEnding, commandInputMode);
        handleStatus(t('app.commandSent', { cmd: trimmed }));
      } else if (commandSendMode === 'parallel') {
        const sentCount = terminalHost.sendLineMany(targetIds, trimmed, lineEnding, commandInputMode);
        handleStatus(t('app.commandSentMany', { cmd: trimmed, count: sentCount }));
      } else {
        const delayMs = clampCommandSequentialDelayMs(commandSequentialDelayMs);
        const runId = commandSequenceRunIdRef.current + 1;
        commandSequenceRunIdRef.current = runId;
        setCommandSequenceRunning(true);
        handleStatus(t('app.commandSequenceStarted', { count: targetIds.length, delay: delayMs }));
        let sentCount = 0;
        try {
          for (let index = 0; index < targetIds.length; index += 1) {
            if (commandSequenceRunIdRef.current !== runId) break;
            const targetId = targetIds[index];
            if (terminalHost.has(targetId)) {
              terminalHost.sendLine(targetId, trimmed, lineEnding, commandInputMode);
              sentCount += 1;
            }
            if (index < targetIds.length - 1 && delayMs > 0) {
              await delayCommandDispatch(delayMs);
            }
          }
          if (commandSequenceRunIdRef.current === runId) {
            handleStatus(t('app.commandSequenceFinished', { count: sentCount, cmd: trimmed }));
          }
        } finally {
          if (commandSequenceRunIdRef.current === runId) {
            setCommandSequenceRunning(false);
          }
        }
      }
    },
    [
      cmdHistory,
      commandInputMode,
      commandLineEnding,
      commandSendMode,
      commandSequenceRunning,
      commandSequentialDelayMs,
      commandTargetMode,
      handleStatus,
      rememberTerminalLastCommand,
      resolveCommandTargetTermIds,
      t,
    ],
  );

  const handleCmdKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void handleSendCmd(cmdInput);
      } else if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        setHistoryIdx((prev) => {
          const next = Math.min(prev + 1, cmdHistory.length - 1);
          if (next >= 0) setCmdInput(cmdHistory[next]);
          return next;
        });
      } else if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        setHistoryIdx((prev) => {
          const next = Math.max(prev - 1, -1);
          setCmdInput(next < 0 ? '' : cmdHistory[next]);
          return next;
        });
      }
    },
    [cmdInput, cmdHistory, handleSendCmd],
  );

  const hasActiveTerminal = Boolean(activeTermId && terminalHost.has(activeTermId));

  const toggleCommandHistory = useCallback(() => {
    if (!histDropOpen && histBtnRef.current) {
      const rect = histBtnRef.current.getBoundingClientRect();
      setHistDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setHistDropOpen((value) => !value);
  }, [histDropOpen]);

  const toggleCommandShortcuts = useCallback(() => {
    if (!shortcutOpen && shortcutBtnRef.current) {
      const rect = shortcutBtnRef.current.getBoundingClientRect();
      setShortcutPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setShortcutOpen((value) => !value);
  }, [shortcutOpen]);

  const toggleWorkBlocks = useCallback(() => {
    if (!workBlocksOpen && workBlocksBtnRef.current) {
      const rect = workBlocksBtnRef.current.getBoundingClientRect();
      setWorkBlocksPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setWorkBlocksOpen((value) => !value);
  }, [workBlocksOpen]);

  const handleCommandTargetModeChange = useCallback(
    (mode: CommandTargetMode) => {
      setCommandTargetMode(mode);
      if (
        mode === 'selected' &&
        commandSelectedTermIds.length === 0 &&
        activeTermId &&
        terminalHost.has(activeTermId)
      ) {
        setCommandSelectedTermIds([activeTermId]);
      }
      if (mode === 'group' && !commandTargetGroups.some((group) => group.id === commandTargetGroupId)) {
        setCommandTargetGroupId(commandTargetGroups[0]?.id ?? '');
      }
    },
    [activeTermId, commandSelectedTermIds.length, commandTargetGroupId, commandTargetGroups],
  );

  const toggleCommandTerminalSelection = useCallback((terminalId: string) => {
    setCommandSelectedTermIds((prev) =>
      prev.includes(terminalId) ? prev.filter((id) => id !== terminalId) : [...prev, terminalId],
    );
  }, []);

  const handleCommandSequentialDelayMsChange = useCallback((delayMs: number) => {
    setCommandSequentialDelayMs(clampCommandSequentialDelayMs(delayMs));
  }, []);

  const handleShortcutAdd = useCallback(() => {
    if (!newScName.trim() || !newScCmd.trim()) return;
    const sc: CmdShortcut = { id: crypto.randomUUID(), name: newScName.trim(), command: newScCmd.trim() };
    const updated = [...shortcuts, sc];
    setShortcuts(updated);
    saveShortcuts(updated);
    setNewScName('');
    setNewScCmd('');
    setAddFormOpen(false);
  }, [newScName, newScCmd, shortcuts]);

  const handleShortcutDelete = useCallback(
    (id: string) => {
      const updated = shortcuts.filter((s) => s.id !== id);
      setShortcuts(updated);
      saveShortcuts(updated);
    },
    [shortcuts],
  );

  const handleShortcutRun = useCallback(
    (command: string) => {
      void handleSendCmd(command);
      setShortcutOpen(false);
    },
    [handleSendCmd],
  );

  const commitWorkBlocks = useCallback((next: TerminalWorkBlock[]) => {
    const limited = next.slice(0, MAX_WORK_BLOCKS);
    setWorkBlocks(limited);
    saveWorkBlocks(limited);
  }, []);

  const activeTerminalWorkBlockContext = useCallback(() => {
    const session = activeTermId ? terminalHost.listSessions().find((item) => item.id === activeTermId) : undefined;
    return {
      cwd: session?.cwd || defaultCwd || '',
      terminalKind: session?.kind || defaultShell,
    };
  }, [activeTermId, defaultCwd, defaultShell]);

  const filteredWorkBlocks = useMemo(() => {
    const query = workBlockQuery.trim().toLowerCase();
    return workBlocks.filter((block) => {
      if (!query) return true;
      return [block.label, block.command, block.group, block.cwd, block.terminalKind]
        .join('\n')
        .toLowerCase()
        .includes(query);
    });
  }, [workBlocks, workBlockQuery]);

  const sortedWorkBlocks = useMemo(
    () => [...filteredWorkBlocks].sort((a, b) => compareWorkBlocksBySortMode(a, b, workBlockSort)),
    [filteredWorkBlocks, workBlockSort],
  );

  const recentWorkBlocks = useMemo(
    () =>
      [...filteredWorkBlocks]
        .filter((block) => block.runCount > 0)
        .sort((a, b) => b.updatedAt - a.updatedAt || compareWorkBlockLabels(a, b))
        .slice(0, 5),
    [filteredWorkBlocks],
  );

  const groupedWorkBlocks = useMemo(() => {
    const groups = new Map<string, TerminalWorkBlock[]>();
    for (const block of sortedWorkBlocks) {
      const groupName = block.group || block.terminalKind || 'terminal';
      const normalizedGroupName = String(groupName).trim() || 'terminal';
      groups.set(normalizedGroupName, [...(groups.get(normalizedGroupName) || []), block]);
    }
    return [...groups.entries()].map(([group, blocks]) => ({ group, blocks }));
  }, [sortedWorkBlocks]);

  const saveCommandAsWorkBlock = useCallback(
    (
      command: string,
      options: {
        closeWorkBlocks?: boolean;
        closeHistory?: boolean;
        emptyMessage?: string;
      } = {},
    ): boolean => {
      const trimmed = command.trim();
      if (!trimmed) {
        handleStatus(options.emptyMessage || t('app.workBlockSaveEmpty'));
        return false;
      }
      const context = activeTerminalWorkBlockContext();
      const block = createWorkBlock({
        command: trimmed,
        label: trimmed.split(/\r?\n/)[0].slice(0, 80),
        cwd: context.cwd,
        terminalKind: context.terminalKind,
      });
      commitWorkBlocks([block, ...workBlocks]);
      if (options.closeWorkBlocks) setWorkBlocksOpen(false);
      if (options.closeHistory) setHistDropOpen(false);
      handleStatus(t('app.workBlockSaved', { label: block.label }));
      return true;
    },
    [activeTerminalWorkBlockContext, commitWorkBlocks, handleStatus, t, workBlocks],
  );

  const handleWorkBlockAddCurrent = useCallback(() => {
    saveCommandAsWorkBlock(cmdInput, {
      closeWorkBlocks: true,
      emptyMessage: t('app.workBlockSaveEmpty'),
    });
  }, [cmdInput, saveCommandAsWorkBlock, t]);

  const handleWorkBlockAddLastSent = useCallback(() => {
    const command = activeTermId ? terminalHost.getLastSentCommand(activeTermId) : '';
    saveCommandAsWorkBlock(command, {
      closeWorkBlocks: true,
      emptyMessage: t('app.workBlockNoLastSent'),
    });
  }, [activeTermId, saveCommandAsWorkBlock, t]);

  const handleHistorySaveAsWorkBlock = useCallback(
    (command: string) => {
      saveCommandAsWorkBlock(command, {
        closeHistory: true,
        emptyMessage: t('app.workBlockSaveHistoryEmpty'),
      });
    },
    [saveCommandAsWorkBlock, t],
  );

  const handleWorkBlockRun = useCallback(
    (block: TerminalWorkBlock) => {
      if (!activeTermId || !terminalHost.has(activeTermId)) {
        void handleSendCmd(block.command);
        setWorkBlocksOpen(false);
        return;
      }
      commitWorkBlocks(workBlocks.map((item) => (item.id === block.id ? touchWorkBlockRun(item) : item)));
      void handleSendCmd(block.command);
      setWorkBlocksOpen(false);
    },
    [activeTermId, commitWorkBlocks, handleSendCmd, workBlocks],
  );

  const handleWorkBlockLoad = useCallback((block: TerminalWorkBlock) => {
    setCmdInput(block.command);
    setWorkBlocksOpen(false);
    cmdInputRef.current?.focus();
  }, []);

  const handleWorkBlockDuplicate = useCallback(
    (block: TerminalWorkBlock) => {
      commitWorkBlocks([duplicateWorkBlock(block), ...workBlocks]);
    },
    [commitWorkBlocks, workBlocks],
  );

  const handleWorkBlockDelete = useCallback(
    (id: string) => {
      commitWorkBlocks(deleteWorkBlock(workBlocks, id));
      if (editingWorkBlockId === id) {
        setEditingWorkBlockId('');
        setWorkBlockDraft(EMPTY_WORK_BLOCK_DRAFT);
      }
    },
    [commitWorkBlocks, editingWorkBlockId, workBlocks],
  );

  const handleWorkBlockEdit = useCallback((block: TerminalWorkBlock) => {
    setEditingWorkBlockId(block.id);
    setWorkBlockDraft({
      label: block.label,
      command: block.command,
      group: block.group || '',
      cwd: block.cwd || '',
      terminalKind: block.terminalKind || '',
    });
  }, []);

  const handleWorkBlockCancelEdit = useCallback(() => {
    setEditingWorkBlockId('');
    setWorkBlockDraft(EMPTY_WORK_BLOCK_DRAFT);
  }, []);

  const handleWorkBlockSaveEdit = useCallback(() => {
    if (!editingWorkBlockId) return;
    if (!workBlockDraft.command.trim()) {
      handleStatus(t('app.workBlockCommandRequired'));
      return;
    }
    const updated = updateWorkBlock(workBlocks, editingWorkBlockId, {
      label: workBlockDraft.label,
      command: workBlockDraft.command,
      group: workBlockDraft.group,
      cwd: workBlockDraft.cwd,
      terminalKind: workBlockDraft.terminalKind,
    });
    commitWorkBlocks(updated);
    setEditingWorkBlockId('');
    setWorkBlockDraft(EMPTY_WORK_BLOCK_DRAFT);
    handleStatus(t('app.workBlockChangesSaved'));
  }, [commitWorkBlocks, editingWorkBlockId, handleStatus, t, workBlockDraft, workBlocks]);

  const handleWorkBlockExport = useCallback(async () => {
    try {
      const payload = createWorkBlockExportPayload(workBlocks);
      const defaultDate = payload.exportedAt.slice(0, 10) || 'export';
      const result = await window.fileAPI.saveTextAs({
        defaultName: `terminal-work-blocks-${defaultDate}.json`,
        content: `${JSON.stringify(payload, null, 2)}\n`,
        filters: [
          { name: t('app.workBlockJsonFilter'), extensions: ['json'] },
          { name: t('app.allFilesFilter'), extensions: ['*'] },
        ],
      });
      if (!result.saved) {
        handleStatus(t('app.workBlockExportCancelled'));
        return;
      }
      handleStatus(result.path ? t('app.workBlockExportedPath', { path: result.path }) : t('app.workBlockExported'));
    } catch (err) {
      handleStatus(t('app.workBlockExportFailed', { e: (err as Error).message }));
    }
  }, [handleStatus, t, workBlocks]);

  const handleWorkBlockImport = useCallback(async () => {
    try {
      const selected = await window.fileAPI.openFile();
      if (!selected) return;
      const file = selected.filePath ? await window.fileAPI.readFile(selected.filePath) : selected;
      const content = file?.content ?? selected.content;
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        handleStatus(t('app.workBlockImportInvalidJson'));
        return;
      }
      const imported = parseWorkBlockImportPayload(parsed);
      if (imported.length === 0) {
        handleStatus(t('app.workBlockImportNoValid'));
        return;
      }
      const merged = mergeImportedWorkBlocks(workBlocks, imported);
      commitWorkBlocks(merged);
      setEditingWorkBlockId('');
      setWorkBlockDraft(EMPTY_WORK_BLOCK_DRAFT);
      setWorkBlocksOpen(false);
      handleStatus(t('app.workBlockImported', { count: imported.length }));
    } catch (err) {
      handleStatus(t('app.workBlockImportFailed', { e: (err as Error).message }));
    }
  }, [commitWorkBlocks, handleStatus, t, workBlocks]);

  const renderWorkBlockRow = useCallback(
    (block: TerminalWorkBlock) => (
      <div key={block.id} className="cmd-work-block-item">
        {editingWorkBlockId === block.id ? (
          <div className="cmd-work-block-edit-form">
            <input
              className="cmd-work-block-edit-input"
              value={workBlockDraft.label}
              onChange={(e) => setWorkBlockDraft((prev) => ({ ...prev, label: e.target.value }))}
              placeholder={t('app.workBlockNamePlaceholder')}
              spellCheck={false}
            />
            <textarea
              className="cmd-work-block-edit-command"
              value={workBlockDraft.command}
              onChange={(e) => setWorkBlockDraft((prev) => ({ ...prev, command: e.target.value }))}
              placeholder={t('app.workBlockCommandPlaceholder')}
              spellCheck={false}
            />
            <div className="cmd-work-block-edit-grid">
              <input
                className="cmd-work-block-edit-input"
                value={workBlockDraft.group}
                onChange={(e) => setWorkBlockDraft((prev) => ({ ...prev, group: e.target.value }))}
                placeholder={t('app.workBlockGroupPlaceholder')}
                spellCheck={false}
              />
              <input
                className="cmd-work-block-edit-input"
                value={workBlockDraft.terminalKind}
                onChange={(e) => setWorkBlockDraft((prev) => ({ ...prev, terminalKind: e.target.value }))}
                placeholder={t('app.workBlockTerminalKindPlaceholder')}
                spellCheck={false}
              />
              <input
                className="cmd-work-block-edit-input cmd-work-block-edit-input--wide"
                value={workBlockDraft.cwd}
                onChange={(e) => setWorkBlockDraft((prev) => ({ ...prev, cwd: e.target.value }))}
                placeholder={t('app.workBlockCwdPlaceholder')}
                spellCheck={false}
              />
            </div>
            <div className="cmd-work-block-edit-actions">
              <button
                className="cmd-work-block-save"
                onClick={handleWorkBlockSaveEdit}
                disabled={!workBlockDraft.command.trim()}
              >
                {t('app.workBlockSave')}
              </button>
              <button className="cmd-work-block-cancel" onClick={handleWorkBlockCancelEdit}>
                {t('app.workBlockCancel')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="cmd-work-block-info">
              <span className="cmd-work-block-label" title={block.label}>
                {block.label}
              </span>
              <span className="cmd-work-block-command" title={block.command}>
                {block.command}
              </span>
              <span className="cmd-work-block-meta" title={block.cwd || t('app.workBlockNoCwdTitle')}>
                {block.group || block.terminalKind || 'terminal'} - {block.cwd || t('app.workBlockDefaultCwd')} -{' '}
                {t('app.workBlockRunCount', { count: block.runCount })}
              </span>
            </div>
            <div className="cmd-work-block-actions">
              <button className="cmd-work-block-run" onClick={() => handleWorkBlockRun(block)}>
                {t('app.workBlockRun')}
              </button>
              <button className="cmd-work-block-load" onClick={() => handleWorkBlockLoad(block)}>
                {t('app.workBlockLoad')}
              </button>
              <button className="cmd-work-block-edit" onClick={() => handleWorkBlockEdit(block)}>
                {t('app.workBlockEdit')}
              </button>
              <button className="cmd-work-block-copy" onClick={() => handleWorkBlockDuplicate(block)}>
                {t('app.workBlockDuplicate')}
              </button>
              <button className="cmd-work-block-del" onClick={() => handleWorkBlockDelete(block.id)}>
                {t('app.workBlockDelete')}
              </button>
            </div>
          </>
        )}
      </div>
    ),
    [
      editingWorkBlockId,
      handleWorkBlockCancelEdit,
      handleWorkBlockDelete,
      handleWorkBlockDuplicate,
      handleWorkBlockEdit,
      handleWorkBlockLoad,
      handleWorkBlockRun,
      handleWorkBlockSaveEdit,
      t,
      workBlockDraft,
    ],
  );

  const commandCenterProps = useMemo<CommandCenterPaneProps>(
    () => ({
      activeTermId,
      hasActiveTerminal,
      value: cmdInput,
      inputRef: cmdInputRef,
      onChange: (value) => {
        setCmdInput(value);
        setHistoryIdx(-1);
      },
      onKeyDown: handleCmdKeyDown,
      onSend: () => {
        void handleSendCmd(cmdInput);
      },
      historyCount: cmdHistory.length,
      shortcutsCount: shortcuts.length,
      workBlocksCount: workBlocks.length,
      historyOpen: histDropOpen,
      shortcutsOpen: shortcutOpen,
      workBlocksOpen,
      historyButtonRef: histBtnRef,
      shortcutsButtonRef: shortcutBtnRef,
      workBlocksButtonRef: workBlocksBtnRef,
      onToggleHistory: toggleCommandHistory,
      onToggleShortcuts: toggleCommandShortcuts,
      onToggleWorkBlocks: toggleWorkBlocks,
      targetMode: commandTargetMode,
      onTargetModeChange: handleCommandTargetModeChange,
      terminalTargets: commandTerminalTargets,
      selectedTerminalIds: commandSelectedTermIds,
      onToggleTerminalSelection: toggleCommandTerminalSelection,
      targetGroups: commandTargetGroups,
      selectedGroupId: commandTargetGroupId,
      onSelectedGroupChange: setCommandTargetGroupId,
      resolvedTargetCount: resolvedCommandTargetCount,
      sendMode: commandSendMode,
      onSendModeChange: setCommandSendMode,
      lineEnding: commandLineEnding,
      onLineEndingChange: setCommandLineEnding,
      inputMode: commandInputMode,
      onInputModeChange: setCommandInputMode,
      sequentialDelayMs: commandSequentialDelayMs,
      onSequentialDelayMsChange: handleCommandSequentialDelayMsChange,
      sendingSequence: commandSequenceRunning,
    }),
    [
      activeTermId,
      cmdHistory.length,
      cmdInput,
      commandInputMode,
      commandLineEnding,
      commandSendMode,
      commandSelectedTermIds,
      commandSequenceRunning,
      commandSequentialDelayMs,
      commandTargetGroupId,
      commandTargetGroups,
      commandTargetMode,
      commandTerminalTargets,
      handleCmdKeyDown,
      handleCommandSequentialDelayMsChange,
      handleCommandTargetModeChange,
      handleSendCmd,
      hasActiveTerminal,
      histDropOpen,
      resolvedCommandTargetCount,
      shortcutOpen,
      shortcuts.length,
      toggleCommandHistory,
      toggleCommandShortcuts,
      toggleCommandTerminalSelection,
      toggleWorkBlocks,
      workBlocks.length,
      workBlocksOpen,
    ],
  );

  // 윈도우 리사이즈 시 모든 터미널 재fit
  // (Electron 창 크기 조정, 최대화/복원 시 xterm이 새 치수를 반영하도록)
  useEffect(() => {
    const onResize = () => terminalHost.fitAll();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── 창 닫기 전 렌더러 xterm 인스턴스 정리 ─────────────────────────────────
  // main process의 close 이벤트 핸들러가 PTY 종료 후 mainWindow.close()를 재호출하면
  // 렌더러의 beforeunload가 발화된다.
  // 이때 xterm Terminal.dispose(), ResizeObserver.disconnect(), IPC 리스너 해제 등을
  // 수행하여 렌더러 쪽 리소스를 깔끔하게 해제한다.
  // 주의: beforeunload에서 문자열을 반환하면 Electron이 재확인 다이얼로그를 띄우므로
  //       반드시 void를 반환해야 함 (main process 쪽에서 이미 확인 완료).
  useEffect(() => {
    const handleBeforeUnload = () => {
      terminalHost.killAll();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ── 앱 종료 직전 터미널 탭 정리 (도킹 탭 X 버튼과 동일한 로직) ──────────────
  // Main 프로세스에서 사용자가 "모두 종료하고 닫기"를 확인하면 app:closing IPC를 보낸다.
  // 렌더러는 engine에서 터미널 콘텐츠를 수집해 terminalHost.kill() + engine.closeContent()로
  // 각각 정리한 뒤 app:close-confirmed 신호를 돌려보낸다.
  // Main은 이 신호를 받은 후 killAllSessions() → mainWindow.close()를 진행한다.
  useEffect(() => {
    if (typeof window.terminalAPI?.onAppClosing !== 'function') return;

    const off = window.terminalAPI.onAppClosing(() => {
      // Map 순회 중 closeContent가 Map을 수정하므로 스냅샷 사용
      const terminalEntries = [...engine.contents.entries()].filter(
        ([, c]) => c.contentType === 'terminal' && c.termId,
      );

      for (const [contentId, content] of terminalEntries) {
        if (content.termId) {
          terminalHost.kill(content.termId); // xterm dispose + ResizeObserver 해제 + PTY IPC kill
        }
        try {
          engine.closeContent(contentId); // engine 상태 정리
        } catch {
          // 이미 제거된 경우 무시
        }
      }

      // 딜레이: terminal:kill IPC 메시지들이 Main 프로세스의 IPC 큐에서
      // 완전히 처리된 뒤 confirmAppClose()가 도착하도록 보장.
      // (ipcRenderer.send는 비동기 큐잉이므로 즉시 전송 보장 없음)
      setTimeout(() => {
        window.terminalAPI.confirmAppClose();
      }, 150);
    });

    return () => off();
  }, [engine]);

  // ── 커맨드 팔레트 명령 목록 ───────────────────────────────────────────────────
  const xenisPhase5VisibilityOptions = useMemo(() => ({ xenisPhase5: xenisPhase5Enabled }), [xenisPhase5Enabled]);
  const visibleExtensionCommands = useMemo(
    () => filterXenisPhase5ExtensionCommands(extensionCommands, xenisPhase5VisibilityOptions),
    [extensionCommands, xenisPhase5VisibilityOptions],
  );
  const toolsExtensionCommands = visibleExtensionCommands.filter((command) => command.menuLocations.includes('tools'));
  const paletteExtensionCommands = visibleExtensionCommands.filter((command) =>
    command.menuLocations.includes('commandPalette'),
  );
  const getExtensionCommandTitle = (command: ExtensionCommandDescriptor): string =>
    command.titleKey ? t(command.titleKey) : command.title;
  const getExtensionCommandCategory = (command: ExtensionCommandDescriptor): string =>
    command.categoryKey ? t(command.categoryKey) : command.category || '';
  const resolvedToolsMenu = useMemo(
    () => resolveRendererToolsMenu(toolsExtensionCommands, xenisPhase5VisibilityOptions),
    [toolsExtensionCommands, xenisPhase5VisibilityOptions],
  );

  const openPalette = useCallback(() => {
    setPaletteOpen((v) => !v);
    setPaletteQuery('');
    setPaletteIdx(0);
  }, []);

  const coreCommandCategory = t('settings.shortcutCoreCategory');
  const terminalCommandCategory = t('settings.shortcutTerminalCategory');
  const layoutCommandCategory = t('settings.shortcutLayoutCategory');
  const workspaceCommandCategory = t('settings.workspaceTitle');
  const extensionCommandCategory = t('settings.shortcutExtensionCategory');
  const workBlockCommandCategory = t('app.workBlocksTitle');

  const workBlockPaletteCommands: PaletteCommand[] = workBlocks.map((block) => {
    const groupName = block.group || block.terminalKind || 'terminal';
    return {
      id: buildWorkBlockCommandId(block),
      commandId: buildWorkBlockCommandId(block),
      label: t('app.workBlockPaletteLabel', { label: block.label }),
      category: `${workBlockCommandCategory} / ${groupName}`,
      searchText: [block.command, block.cwd, block.group, block.terminalKind].join(' '),
      available: true,
      action: () => handleWorkBlockRun(block),
    };
  });

  const allCommands: PaletteCommand[] = [
    {
      id: 'command-palette',
      commandId: 'command-palette',
      label: t('app.commandPalette'),
      category: coreCommandCategory,
      available: true,
      action: openPalette,
    },
    {
      id: 'new-default-terminal',
      label: t('settings.shortcutDefaultTerminal'),
      category: coreCommandCategory,
      available: shellAvailable(defaultShell),
      action: () => createTerminalSession(defaultShell),
    },
    {
      id: 'new-ps',
      label: t('app.newPowerShell'),
      category: terminalCommandCategory,
      available: shellAvailable('powershell'),
      action: () => createTerminalSession('powershell'),
    },
    {
      id: 'new-cmd',
      label: t('app.newCmd'),
      category: terminalCommandCategory,
      available: shellAvailable('cmd'),
      action: () => createTerminalSession('cmd'),
    },
    {
      id: 'new-pwsh',
      label: t('app.newPwsh'),
      category: terminalCommandCategory,
      available: shellAvailable('pwsh'),
      action: () => createTerminalSession('pwsh'),
    },
    {
      id: 'new-wsl',
      label: t('app.newWsl'),
      category: terminalCommandCategory,
      available: shellAvailable('wsl'),
      action: () => createTerminalSession('wsl'),
    },
    {
      id: 'open-xenesis-tui',
      commandId: 'open-xenesis-tui',
      label: 'Xenesis TUI',
      category: terminalCommandCategory,
      searchText: 'xenesis tui terminal capability registry cr',
      available: true,
      action: createXenesisTuiTerminalSession,
    },
    {
      id: 'new-browser',
      label: t('app.newBrowserTab'),
      category: coreCommandCategory,
      available: true,
      action: () => createBrowserPane(),
    },
    {
      id: 'open-file',
      label: t('app.openLocalFile'),
      category: coreCommandCategory,
      available: true,
      action: openLocalFile,
    },
    {
      id: 'open-command-center',
      label: t('app.commandCenterTitle'),
      category: coreCommandCategory,
      available: true,
      action: handleOnboardingOpenCommandCenter,
    },
    {
      id: 'arrange-h',
      label: t('app.alignHorizontalBtn'),
      category: layoutCommandCategory,
      available: true,
      action: handleArrangeH,
    },
    {
      id: 'arrange-v',
      label: t('app.alignVerticalBtn'),
      category: layoutCommandCategory,
      available: true,
      action: handleArrangeV,
    },
    {
      id: 'arrange-g',
      label: t('app.alignGridBtn'),
      category: layoutCommandCategory,
      available: true,
      action: handleArrangeGrid,
    },
    {
      id: 'merge-all',
      label: t('app.mergeAllBtn'),
      category: layoutCommandCategory,
      available: true,
      action: handleMergeAll,
    },
    {
      id: 'toggle-theme',
      label: theme === 'dark' ? t('app.switchToLight') : t('app.switchToDark'),
      category: coreCommandCategory,
      available: true,
      action: () => setTheme((th) => (th === 'dark' ? 'light' : 'dark')),
    },
    {
      id: 'font-up',
      label: t('common.fontSizeIncrease'),
      category: coreCommandCategory,
      available: true,
      action: increaseFontSize,
    },
    {
      id: 'font-down',
      label: t('common.fontSizeDecrease'),
      category: coreCommandCategory,
      available: true,
      action: decreaseFontSize,
    },
    {
      id: 'save-layout',
      label: t('app.saveLayout'),
      category: layoutCommandCategory,
      available: true,
      action: handleSaveLayout,
    },
    {
      id: 'restore-layout',
      label: t('app.loadLayout'),
      category: layoutCommandCategory,
      available: true,
      action: handleRestoreLayout,
    },
    {
      id: 'reset-layout',
      label: t('app.resetLayout'),
      category: layoutCommandCategory,
      available: true,
      action: handleResetLayout,
    },
    {
      id: 'open-workspace',
      label: t('app.openWorkspaceFile'),
      category: workspaceCommandCategory,
      available: true,
      action: () => {
        void handleOpenWorkspace();
      },
    },
    ...workspaceRecent.map((item) => ({
      id: `workspace-recent:${item.path}`,
      label: `${t('app.openRecentWorkspace')}: ${item.name}`,
      category: workspaceCommandCategory,
      available: true,
      action: () => {
        void handleOpenRecentWorkspace(item);
      },
    })),
    {
      id: 'diagnostics',
      label: t('app.diagnosticsCenter'),
      category: coreCommandCategory,
      available: true,
      action: openDiagnosticsPane,
    },
    {
      id: 'onboarding',
      label: t('app.onboardingTitle'),
      category: coreCommandCategory,
      available: true,
      action: () => openOnboardingPane(),
    },
    {
      id: 'settings',
      label: t('app.openSettings'),
      category: coreCommandCategory,
      available: true,
      action: openSettingsPane,
    },
    ...workBlockPaletteCommands,
    ...paletteExtensionCommands.map((command) => {
      const category = getExtensionCommandCategory(command) || extensionCommandCategory;
      return {
        id: `extension:${command.id}`,
        label: category ? `${category}: ${getExtensionCommandTitle(command)}` : getExtensionCommandTitle(command),
        category,
        available: command.enabled,
        action: () => {
          void runExtensionCommand(command.id);
        },
      };
    }),
  ];

  useEffect(() => {
    return getDeskBridgeApi()?.onExtensionActions?.((payload) => {
      const commandId = typeof payload?.commandId === 'string' ? payload.commandId.trim() : '';
      const command = commandId
        ? allCommands.find((item) => item.id === commandId || item.commandId === commandId)
        : undefined;
      if (commandId && command) {
        if (command.available) {
          command.action();
          setPaletteOpen(false);
        } else {
          handleStatus(`Command is not available: ${commandId}`);
        }
        return;
      }
      void handleExtensionActions(payload?.actions ?? []);
    });
  }, [allCommands, handleExtensionActions, handleStatus]);

  const commandShortcutMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const binding of keyboardShortcutBindings) {
      if (binding.enabled && binding.accelerator) {
        map.set(binding.commandId, normalizeAccelerator(binding.accelerator));
      }
    }
    return map;
  }, [keyboardShortcutBindings]);

  const normalizedPaletteQuery = paletteQuery.trim().toLowerCase();
  const filteredCommands = normalizedPaletteQuery
    ? allCommands.filter((command) =>
        getPaletteSearchText(command, commandShortcutMap.get(command.id) ?? '').includes(normalizedPaletteQuery),
      )
    : allCommands;

  const handlePaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteIdx((i) => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands[paletteIdx];
      if (cmd?.available) {
        cmd.action();
        setPaletteOpen(false);
      }
    }
  };

  // ── 키보드 단축키 ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setSettingsOpen(false);
        return;
      }
      if (isEditableKeyboardTarget(e.target)) {
        return;
      }
      const accelerator = eventToAccelerator(e);
      if (!accelerator) {
        return;
      }
      const commandMap = new Map(allCommands.map((command) => [command.id, command]));
      const matchedShortcut = keyboardShortcutBindings.find(
        (binding) => binding.enabled && normalizeAccelerator(binding.accelerator) === accelerator,
      );
      if (!matchedShortcut) {
        return;
      }
      const command = commandMap.get(matchedShortcut.commandId);
      if (!command?.available) {
        return;
      }
      e.preventDefault();
      command.action();
      setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [allCommands, keyboardShortcutBindings]);

  // ── 사용자 인증 헬퍼 ─────────────────────────────────────────────────────────

  const authResetForm = useCallback(() => {
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setAuthName('');
    setAuthPasswordError('');
    setAuthShowEmailForm(false);
  }, []);

  const authIsFormValid = useCallback((): boolean => {
    if (authMode === 'signup') {
      return !!(
        authName.trim() &&
        authEmail.trim() &&
        authPassword.length >= 8 &&
        authConfirmPassword &&
        authPassword === authConfirmPassword
      );
    }
    return !!(authEmail.trim() && authPassword.trim());
  }, [authMode, authName, authEmail, authPassword, authConfirmPassword]);

  const getAuthPasswordStrength = (pw: string) => {
    if (!pw) return { strength: 0, text: '', color: '' };
    if (pw.length < 6) return { strength: 1, text: t('app.pwStrWeak'), color: '#f87171' };
    if (pw.length < 8) return { strength: 2, text: t('app.pwStrFair'), color: '#fbbf24' };
    let score = 0;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score >= 3 && pw.length >= 8) return { strength: 3, text: t('app.pwStrGood'), color: '#34d399' };
    return { strength: 2, text: t('app.pwStrFair'), color: '#fbbf24' };
  };

  const handleAuthSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthPasswordError('');
      setAuthIsLoading(true);

      try {
        if (authMode === 'signup') {
          if (authPassword !== authConfirmPassword) {
            setAuthPasswordError(t('app.pwMismatch'));
            return;
          }
          if (authPassword.length < 8) {
            setAuthPasswordError(t('app.pwTooShort'));
            return;
          }
          if (!authName.trim()) {
            setAuthPasswordError(t('app.nameRequired'));
            return;
          }
          await authApiRegister(authEmail, authPassword, authName);
          // 회원가입 성공 → 자동 로그인 시도
          const user = await authApiLogin(authEmail, authPassword);
          setAuthUser(user);
          setAuthDropOpen(false);
          authResetForm();
          handleStatus(t('app.signupComplete', { name: user.name }));
        } else {
          const user = await authApiLogin(authEmail, authPassword);
          setAuthUser(user);
          setAuthDropOpen(false);
          authResetForm();
          handleStatus(t('app.loginSuccess', { name: user.name }));
        }
      } catch (error) {
        setAuthPasswordError(authGetErrorMessage(error));
      } finally {
        setAuthIsLoading(false);
      }
    },
    [authMode, authEmail, authPassword, authConfirmPassword, authName, authResetForm, handleStatus],
  );

  const handleAuthLogout = useCallback(() => {
    authApiLogout();
    setAuthUser(null);
    setAuthDropOpen(false);
    handleStatus(t('app.loggedOut'));
  }, [handleStatus]);

  const closeToolsAndRun = useCallback((action: () => void | Promise<void>) => {
    setToolsOpen(false);
    void action();
  }, []);

  const runAppMenuAction = useCallback(
    (actionId: AppMenuActionId) => {
      switch (actionId) {
        case 'new-terminal':
          createTerminalSession(defaultShell);
          break;
        case 'open-xenesis-tui':
          createXenesisTuiTerminalSession();
          break;
        case 'new-browser':
          createBrowserPane();
          break;
        case 'open-file':
          void openLocalFile();
          break;
        case 'open-command-center':
          handleOnboardingOpenCommandCenter();
          break;
        case 'open-window-sizer':
          openSettingsCategory('window-sizer');
          break;
        case 'arrange-horizontal':
          handleArrangeH();
          break;
        case 'arrange-vertical':
          handleArrangeV();
          break;
        case 'arrange-grid':
          handleArrangeGrid();
          break;
        case 'toggle-pane-inspector':
          setShowPaneIdentityOverlay((value) => !value);
          break;
        case 'open-ai-provider-settings':
          openSettingsTarget({ category: 'run-model', section: 'default', ensureVisible: true });
          break;
        case 'open-gateway-control':
          openSettingsTarget({
            category: 'xenesis-agent',
            mode: 'gateway',
            section: 'xenesis-gateway',
            ensureVisible: true,
          });
          break;
        case 'open-bot-channels':
          openSettingsTarget({
            category: 'xenesis-agent',
            mode: 'external-bots',
            section: 'external-bot-channels',
            ensureVisible: true,
          });
          break;
        case 'open-automation-monitor': {
          const activePane = engine.activePaneId ? (engine.panes.get(engine.activePaneId) ?? null) : null;
          const activeContent = activePane?.activeContentId
            ? (engine.contents.get(activePane.activeContentId) ?? null)
            : null;
          const termId =
            activeContent?.contentType === 'terminal' && activeContent.termId
              ? activeContent.termId
              : activeTermId || terminalHost.activeTermId || terminalHost.listSessions()[0]?.id || '';
          if (termId) {
            handleOpenAutomationMonitor(termId);
          } else {
            handleStatus(t('app.noTerminalSelected'));
          }
          break;
        }
        case 'open-automation-settings':
          openSettingsCategory('automation');
          break;
        case 'open-terminal-inspector':
          void runExtensionCommand('xenesis-desk.core-tools.openTerminalInspector');
          break;
        case 'open-extensions-settings':
          openSettingsCategory('extensions');
          break;
        case 'open-developer-settings':
          openSettingsCategory('extensions');
          break;
        case 'open-onboarding':
          openOnboardingPane();
          break;
        case 'open-diagnostics':
          openDiagnosticsPane();
          break;
        case 'open-settings':
          openSettingsPane();
          break;
        default:
          handleStatus(`Unsupported menu action: ${actionId}`);
      }
    },
    [
      activeTermId,
      createBrowserPane,
      createXenesisTuiTerminalSession,
      createTerminalSession,
      defaultShell,
      engine,
      handleArrangeGrid,
      handleArrangeH,
      handleArrangeV,
      handleOnboardingOpenCommandCenter,
      handleOpenAutomationMonitor,
      handleStatus,
      openDiagnosticsPane,
      openLocalFile,
      openOnboardingPane,
      openSettingsCategory,
      openSettingsPane,
      openSettingsTarget,
      runExtensionCommand,
      t,
    ],
  );

  useEffect(() => {
    return window.appMenuAPI?.onCommand((payload) => {
      if (payload.commandId) {
        void runExtensionCommand(payload.commandId);
        return;
      }
      if (payload.actionId) {
        runAppMenuAction(payload.actionId as AppMenuActionId);
      }
    });
  }, [runAppMenuAction, runExtensionCommand]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ commandId?: unknown }>).detail;
      const commandId = typeof detail?.commandId === 'string' ? detail.commandId.trim() : '';
      if (commandId) {
        void runExtensionCommand(commandId);
      }
    };
    window.addEventListener('app-run-extension-command', handler);
    return () => window.removeEventListener('app-run-extension-command', handler);
  }, [runExtensionCommand]);

  const renderToolsCommandButton = (
    command: ExtensionCommandDescriptor,
    spec?: AppMenuCommandNode,
  ): React.ReactElement => {
    const title = spec?.labelKey ? t(spec.labelKey) : spec?.label || getExtensionCommandTitle(command);
    const nativeTitle = getExtensionCommandTitle(command);
    return (
      <button
        key={command.id}
        className="tools-item"
        onClick={() => closeToolsAndRun(() => runExtensionCommand(command.id))}
        title={`${command.extensionName} · ${nativeTitle}`}
        type="button"
      >
        <span className="tools-item-icon">{spec?.icon || command.icon || '▣'}</span>
        <span className="tools-item-label">{title}</span>
      </button>
    );
  };

  const renderToolsActionButton = (spec: AppMenuActionNode): React.ReactElement => {
    const title = spec.labelKey ? t(spec.labelKey) : spec.label;
    return (
      <button
        key={spec.id}
        className="tools-item"
        onClick={() => closeToolsAndRun(() => runAppMenuAction(spec.actionId))}
        title={title}
        type="button"
      >
        <span className="tools-item-icon">{spec.icon || '>'}</span>
        <span className="tools-item-label">{title}</span>
      </button>
    );
  };

  const renderToolsMenuItem = (item: ResolvedRendererMenuItem): React.ReactElement =>
    item.kind === 'command' ? renderToolsCommandButton(item.command, item.spec) : renderToolsActionButton(item.spec);

  const renderToolsSubmenuGroup = (group: ResolvedRendererMenuGroup): React.ReactElement => {
    const groupLabel = group.labelKey ? t(group.labelKey) : group.label;
    const emptyLabel = group.emptyLabelKey ? t(group.emptyLabelKey) : group.emptyLabel || 'Empty';
    return (
      <div className="tools-submenu-group" key={group.id}>
        <button className="tools-item tools-submenu-trigger" type="button" aria-haspopup="menu">
          <span className="tools-item-icon">{group.icon}</span>
          <span className="tools-item-label">{groupLabel}</span>
          <span className="tools-submenu-arrow">›</span>
        </button>
        <div className="tools-submenu" role="menu" aria-label={groupLabel}>
          {group.items.length > 0 ? (
            group.items.map((item) => renderToolsMenuItem(item))
          ) : (
            <div className="tools-item tools-item--disabled" role="menuitem" aria-disabled="true">
              <span className="tools-item-icon">·</span>
              <span className="tools-item-label">{emptyLabel}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleApplyWindowSizerPreset = useCallback(
    async (preset: WindowSizerPreset) => {
      try {
        await window.fileAPI.applyWindowSizerPreset(preset);
        setWindowSizerOpen(false);
        handleStatus(
          t('app.windowSizerApplied', {
            name: preset.name || `${preset.width}x${preset.height}`,
            width: String(preset.width),
            height: String(preset.height),
          }),
        );
      } catch (error) {
        handleStatus(t('app.windowSizerApplyFailed', { e: error instanceof Error ? error.message : String(error) }));
      }
    },
    [handleStatus, t],
  );

  const persistWindowSizerPresets = useCallback(async (presets: WindowSizerPreset[]) => {
    setWindowSizerPresets(presets);
    await window.terminalAPI.saveSettings({ windowSizer: { presets } });
    window.dispatchEvent(
      new CustomEvent('app-settings-changed', {
        detail: { windowSizer: { presets } },
      }),
    );
  }, []);

  const handleAddWindowPresetFromCurrentBounds = useCallback(async () => {
    try {
      const bounds: WindowBounds | null = await window.fileAPI.getCurrentWindowBounds();
      if (!bounds) return;
      const now = Date.now();
      const preset: WindowSizerPreset = {
        id: crypto.randomUUID(),
        name: t('app.windowSizerCurrentName', { width: String(bounds.width), height: String(bounds.height) }),
        group: t('app.windowSizerCustomGroup'),
        width: bounds.width,
        height: bounds.height,
        moveToPosition: true,
        x: bounds.x,
        y: bounds.y,
        coordinateMode: 'absolute',
        allowOutsideDisplay: false,
        builtin: false,
        createdAt: now,
        updatedAt: now,
      };
      const next = [...windowSizerPresets, preset];
      await persistWindowSizerPresets(next);
      setWindowSizerOpen(false);
      openSettingsCategory('window-sizer');
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('window-sizer-select-preset', { detail: preset.id }));
      }, 0);
      handleStatus(t('app.windowSizerCurrentAdded', { name: preset.name }));
    } catch (error) {
      handleStatus(t('app.windowSizerCurrentFailed', { e: error instanceof Error ? error.message : String(error) }));
    }
  }, [handleStatus, openSettingsCategory, persistWindowSizerPresets, t, windowSizerPresets]);

  const openWindowSizerSettings = useCallback(() => {
    setWindowSizerOpen(false);
    openSettingsCategory('window-sizer');
  }, [openSettingsCategory]);

  const hasVisibleXenesisAgent = [...engine.contents.values()].some(
    (content) =>
      content.contentType === 'xenesis-agent' &&
      content.state !== 'hidden' &&
      Boolean(engine.findPaneByContent(content.id)),
  );
  const toolbarHiddenOrder = new Map<string, number>([
    ['xenesis-agent', 0],
    ['command-center', 1],
  ]);
  const hiddenToolbarContents = engine
    .getHiddenContents()
    .filter((content) => {
      if (content.contentType === 'command-center') return true;
      if (content.contentType === 'xenesis-agent') return !hasVisibleXenesisAgent;
      return false;
    })
    .sort(
      (a, b) =>
        (toolbarHiddenOrder.get(a.contentType) ?? 99) - (toolbarHiddenOrder.get(b.contentType) ?? 99) ||
        a.title.localeCompare(b.title),
    );

  function handleToolbarHiddenShow(content: DockContent) {
    const pane = engine.restoreHiddenContent(content.id);
    const state = pane?.state ?? content.previousState;
    handleStatus(`Showed ${content.title} in ${state}`);
  }

  const closeGowooriOverlay = useCallback(() => {
    hideGowooriOverlay();
  }, [hideGowooriOverlay]);

  return (
    <ThemeContext.Provider value={theme}>
      <div
        className={`app theme-${theme}${isDetachedWindow ? ' app--detached' : ''}`}
        onDragEnter={handleExtDragEnter}
        onDragLeave={handleExtDragLeave}
        onDragOver={handleExtDragOver}
        onDrop={handleExtDrop}
      >
        {/* ── 외부 파일 드래그 오버레이 ─────────────────────────────────────── */}
        {extDragOver && (
          <div className="ext-drop-overlay">
            <div className="ext-drop-overlay__inner">
              <span className="ext-drop-overlay__icon">📂</span>
              <span className="ext-drop-overlay__text">{t('app.dropToOpen')}</span>
            </div>
          </div>
        )}
        <GowooriGlobalOverlay overlay={gowooriOverlay} onClose={closeGowooriOverlay} />
        {/* ── 분리 창 모드: 간소화된 툴바 ──────────────────────────────────── */}
        {isDetachedWindow ? (
          <div className="toolbar toolbar--detached">
            {detachLoading ? (
              <span className="toolbar-title detach-loading">{t('app.loadingContent')}</span>
            ) : (
              <span className="toolbar-title">⬡ {engine.contents.values().next().value?.title ?? 'Xenesis Desk'}</span>
            )}
            <span className="toolbar-spacer" />
            <span className="detach-hint">{t('app.dragTabHint')}</span>
            <button onClick={() => setTheme((th) => (th === 'dark' ? 'light' : 'dark'))} title={t('app.toggleTheme')}>
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>
          </div>
        ) : (
          /* ── 일반 툴바 ──────────────────────────────────────────────────────── */
          <div className="toolbar">
            <span className="toolbar-title">⬡ Xenesis Desk</span>
            <div className="toolbar-divider" />

            {/* 파일 탐색기 토글 */}
            <button
              className={`btn-explorer-toggle${explorerOpen ? ' is-active' : ''}`}
              onClick={() => setExplorerOpen((v) => !v)}
              title={explorerOpen ? t('app.collapseFileExplorer') : t('app.expandFileExplorer')}
              aria-label={explorerOpen ? t('app.collapseFileExplorer') : t('app.expandFileExplorer')}
            >
              {explorerOpen ? '◀' : '▶'}
            </button>

            <div className="toolbar-divider" />

            {/* 셸 선택 드롭다운 */}
            <button
              ref={shellBtnRef}
              className={`btn-new-shell${shellDropOpen ? ' active' : ''}`}
              onClick={() => {
                if (!shellDropOpen && shellBtnRef.current) {
                  const rect = shellBtnRef.current.getBoundingClientRect();
                  setShellDropPos({ top: rect.bottom + 4, left: rect.left });
                }
                setShellDropOpen((v) => !v);
              }}
              title={t('app.newTerminalSession')}
            >
              {t('app.terminalLabel')}
            </button>

            <button className="btn-browser" onClick={() => createBrowserPane()} title={t('app.newBrowserTabTitle')}>
              {t('app.browserLabel')}
            </button>

            <button className="btn-open-file" onClick={openLocalFile} title={t('app.openLocalFileTitle')}>
              {t('app.openFileLabel')}
            </button>

            <div className="toolbar-divider" />

            {/* 도구 드롭다운 */}
            <button
              ref={toolsBtnRef}
              className={`btn-tools${toolsOpen ? ' active' : ''}`}
              onClick={() => {
                if (!toolsOpen && toolsBtnRef.current) {
                  const rect = toolsBtnRef.current.getBoundingClientRect();
                  setToolsPos({ top: rect.bottom + 4, left: rect.left });
                }
                setToolsOpen((v) => !v);
              }}
              title={t('app.toolsTitle')}
            >
              {t('app.toolsLabel')}
            </button>

            <div className="toolbar-divider" />

            {/* 창 크기/위치 프리셋 드롭다운 */}
            <button
              ref={windowSizerBtnRef}
              className={`btn-window-sizer${windowSizerOpen ? ' active' : ''}`}
              onClick={() => {
                if (!windowSizerOpen && windowSizerBtnRef.current) {
                  const rect = windowSizerBtnRef.current.getBoundingClientRect();
                  setWindowSizerPos({ top: rect.bottom + 4, left: rect.left });
                }
                setWindowSizerOpen((v) => !v);
              }}
              title={t('app.windowSizerTitle')}
            >
              {t('app.windowSizerLabel')}
            </button>

            <div className="toolbar-divider" />

            {/* 탭 정렬 드롭다운 */}
            <div ref={arrangeRef} className="arrange-dropdown-wrap">
              <button
                ref={arrangeBtnRef}
                className={`btn-arrange${arrangeOpen ? ' active' : ''}`}
                onClick={() => {
                  if (!arrangeOpen && arrangeBtnRef.current) {
                    const rect = arrangeBtnRef.current.getBoundingClientRect();
                    setArrangePos({ top: rect.bottom + 4, left: rect.left });
                  }
                  setArrangeOpen((v) => !v);
                }}
                title={t('app.tabAlignTitle')}
              >
                {t('app.tabAlignLabel')}
              </button>
            </div>

            <button
              className={`btn-pane-inspect${showPaneIdentityOverlay ? ' active' : ''}`}
              onClick={() => setShowPaneIdentityOverlay((v) => !v)}
              aria-pressed={showPaneIdentityOverlay}
              title={showPaneIdentityOverlay ? t('app.paneInspectActive') : t('app.paneInspectTitle')}
            >
              {t('app.paneInspectLabel')}
            </button>

            <span className="toolbar-spacer" />

            <div className="toolbar-center-slot" aria-label="Hidden toolbar content">
              {hiddenToolbarContents.length > 0 && (
                <div className="toolbar-hidden-tray">
                  {hiddenToolbarContents.map((content) => (
                    <button
                      key={content.id}
                      type="button"
                      className="toolbar-hidden-button"
                      title={`Show ${content.title}`}
                      onClick={() => handleToolbarHiddenShow(content)}
                    >
                      {content.title}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 폰트 크기 */}
            <div className="font-size-group">
              <button className="font-size-btn" onClick={decreaseFontSize} title={t('app.shrinkFont')}>
                A−
              </button>
              <span className="font-size-label">{fontSize}px</span>
              <button className="font-size-btn" onClick={increaseFontSize} title={t('app.growFont')}>
                A+
              </button>
            </div>

            {/* 테마 토글 */}
            <button onClick={() => setTheme((th) => (th === 'dark' ? 'light' : 'dark'))} title={t('app.toggleTheme')}>
              {theme === 'dark' ? '☀ Light' : '☾ Dark'}
            </button>

            <div className="toolbar-divider" />

            {/* 레이아웃 */}
            {/* Toolbar layout buttons temporarily hidden. Keep this block for future restore.
        <button className="btn-save-layout"    onClick={handleSaveLayout}    title={t('app.saveLayoutTitle')}>💾</button>
        <button className="btn-restore-layout" onClick={handleRestoreLayout} title={t('app.loadLayoutTitle')}>📂</button>
        <button className="btn-reset-layout"   onClick={handleResetLayout}   title={t('app.resetLayoutTitle')}>↺</button>
        */}
            <button className="btn-save-workspace" onClick={handleSaveWorkspace} title={t('app.saveWorkspaceTitle')}>
              WS+
            </button>
            <button
              ref={workspaceOpenBtnRef}
              className={`btn-open-workspace${workspaceOpenDropdownOpen ? ' active' : ''}`}
              onClick={() => {
                if (!workspaceOpenDropdownOpen && workspaceOpenBtnRef.current) {
                  const rect = workspaceOpenBtnRef.current.getBoundingClientRect();
                  setWorkspaceOpenDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                }
                setWorkspaceOpenDropdownOpen((v) => !v);
              }}
              title={t('app.openWorkspaceTitle')}
            >
              WS ▾
            </button>

            <div className="toolbar-divider" />

            {/* 커맨드 팔레트 */}
            <button className="btn-palette" onClick={openPalette} title={t('app.commandPalette')}>
              ⌘ K
            </button>

            {/* 사용자 인증 버튼 */}
            {/* Toolbar login button temporarily hidden. Keep this block for future restore.
        <button
          ref={authBtnRef}
          className={`btn-user-auth${authDropOpen ? ' active' : ''}${authUser ? ' is-logged-in' : ''}`}
          onClick={() => {
            if (!authDropOpen && authBtnRef.current) {
              const rect = authBtnRef.current.getBoundingClientRect();
              setAuthDropPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
            }
            setAuthDropOpen(v => !v);
          }}
          title={authUser ? `${authUser.name} (${authUser.email})` : t('app.loginTitle')}
        >
          {authUser ? (
            <span className="btn-user-avatar" aria-hidden="true">
              {authUser.name.charAt(0).toUpperCase()}
            </span>
          ) : t('app.loginLabel')}
        </button>
        */}

            {/* 설정 */}
            <button className="btn-settings" onClick={() => openSettingsPane()} title={t('app.settingsTitle')}>
              ⚙
            </button>
          </div>
        )}{' '}
        {/* isDetachedWindow 분기 끝 */}
        {/* ── 워크스페이스 (탐색기 사이드바 + 도킹 영역) ───────────────────── */}
        <div id="dock-host" className="workspace">
          {/* 파일 탐색기 사이드바 — 분리 창에서는 숨김 */}
          {!isDetachedWindow && explorerOpen && (
            <aside
              className="explorer-sidebar"
              style={{ width: explorerWidth }}
              aria-label={t('app.explorerAriaLabel')}
            >
              {/* ── 탐색기 패널 */}
              <div
                className="explorer-panel"
                style={{ flex: `0 0 ${(sidebarSplitRatio * 100).toFixed(1)}%`, minHeight: 60, overflow: 'hidden' }}
              >
                <FileExplorerPane
                  rootDir={defaultCwd}
                  onOpenFile={openFileByPath}
                  onChangeRoot={(dir) => {
                    setDefaultCwd(dir);
                    syncXenesisExplorerWorkspace(dir);
                  }}
                  onSelectPath={(path, isDir) => {
                    setExplorerSelectedPath(path);
                    setExplorerSelectedIsDir(isDir);
                    syncXenesisExplorerWorkspace(xenesisWorkspaceFromExplorerSelection(path, isDir));
                  }}
                  onAddToFavorites={handleAddToFavorites}
                  onOpenInTerminal={handleExplorerOpenInTerminal}
                  shells={shells}
                />
              </div>

              {/* ── 수직 분할 핸들 */}
              <div
                className="sidebar-split-handle"
                title={t('app.explorerDragHint')}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const sidebarEl = e.currentTarget.closest('.explorer-sidebar') as HTMLElement | null;
                  if (!sidebarEl) return;
                  const totalH = sidebarEl.clientHeight;
                  const startRatio = sidebarSplitRatio;
                  const startY = e.clientY;
                  let latestRatio = startRatio;
                  const onMove = (ev: PointerEvent) => {
                    const delta = ev.clientY - startY;
                    latestRatio = Math.max(0.15, Math.min(0.85, startRatio + delta / totalH));
                    setSidebarSplitRatio(latestRatio);
                  };
                  const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    saveSplitRatio(latestRatio);
                  };
                  document.addEventListener('pointermove', onMove);
                  document.addEventListener('pointerup', onUp);
                }}
              />

              {/* ── 즐겨찾기 패널 */}
              <div className="favorites-panel" style={{ flex: `1 1 0`, minHeight: 60, overflow: 'hidden' }}>
                <FavoritesPane
                  items={favorites}
                  onAdd={handleFavAdd}
                  onRemove={handleFavRemove}
                  onOpen={handleFavOpen}
                  onOpenInTerminal={handleFavOpenInTerminal}
                  shells={shells}
                  onAddCurrentTab={handleAddCurrentTab}
                  onOpenImage={openFileByPath}
                  onStartCapture={startCapture}
                  remoteFileProfiles={remoteFileProfiles}
                  remoteFileGroups={remoteFileGroups}
                  onOpenRemoteFile={openRemoteFile}
                  onOpenRemoteFileSettings={openRemoteFilesSettings}
                />
              </div>

              {/* ── 가로 리사이즈 핸들 (사이드바 너비 조절) */}
              <div
                className="explorer-resize-handle"
                title={t('app.sidebarDragHint')}
                onPointerDown={(e) => {
                  const startX = e.clientX;
                  const startW = explorerWidth;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const onMove = (ev: PointerEvent) => {
                    const w = Math.max(140, Math.min(520, startW + ev.clientX - startX));
                    setExplorerWidth(w);
                  };
                  const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                  };
                  document.addEventListener('pointermove', onMove);
                  document.addEventListener('pointerup', onUp);
                }}
              />
            </aside>
          )}

          {/* 도킹 호스트 */}
          <main className="dock-main" aria-label="Docking workspace">
            <DockHost
              engine={engine}
              onStatus={handleStatus}
              onDetach={handleDetach}
              isDetachedWindow={isDetachedWindow}
              onExtFileDrop={handleExtFileDrop}
              onOpenAutomationMonitor={handleOpenAutomationMonitor}
              onSaveTerminalProfile={handleSaveTerminalProfile}
              onOnboardingOpenFolder={handleOnboardingOpenFolder}
              onOnboardingOpenTerminal={handleOnboardingOpenTerminal}
              onOnboardingOpenFile={handleOnboardingOpenFile}
              onOnboardingOpenWorkspace={handleOnboardingOpenWorkspace}
              onOnboardingOpenAiProviderSettings={handleOnboardingOpenAiProviderSettings}
              onOnboardingOpenProviderSetupPlan={handleOnboardingOpenProviderSetupPlan}
              onOnboardingOpenExternalToolSetup={handleOnboardingOpenExternalToolSetup}
              onOnboardingOpenToolConnectors={handleOnboardingOpenToolConnectors}
              onOnboardingOpenMcpSetup={handleOnboardingOpenMcpSetup}
              onOnboardingOpenMcpOauth={handleOnboardingOpenMcpOauth}
              onOnboardingOpenKeyboardShortcuts={handleOnboardingOpenKeyboardShortcuts}
              onOnboardingOpenExtensions={handleOnboardingOpenExtensions}
              onOnboardingOpenDiagnostics={handleOnboardingOpenDiagnostics}
              onOnboardingOpenCommandCenter={handleOnboardingOpenCommandCenter}
              onOnboardingArrangePanes={handleOnboardingArrangePanes}
              onOnboardingSaveWorkspace={handleOnboardingSaveWorkspace}
              onOnboardingRestoreWorkspace={handleOnboardingRestoreWorkspace}
              onOnboardingUseWorkspacePath={handleOnboardingUseWorkspacePath}
              onOnboardingVerifyStep={handleOnboardingVerifyStep}
              onOnboardingRunScenario={handleOnboardingRunScenario}
              onOnboardingVerifyAll={handleOnboardingVerifyAll}
              onOnboardingDismiss={handleOnboardingDismiss}
              onBrowserPopupOpen={createBrowserPane}
              commandCenterProps={commandCenterProps}
              floatBoundsRef={floatBoundsRef}
              showPaneIdentityOverlay={showPaneIdentityOverlay}
            />
          </main>
        </div>
        {/* ── 상태바 ────────────────────────────────────────────────────────── */}
        <div className="statusbar" id="statusbar">
          {status}
        </div>
        {/* ── 재결합 수신 오버레이 (메인 창 전용) ───────────────────────────── */}
        {showReattachTarget && !isDetachedWindow && (
          <div className="reattach-overlay" aria-label={t('app.reattachWaiting')}>
            <div className="reattach-overlay-inner">
              <span className="reattach-overlay-icon">↩</span>
              <span className="reattach-overlay-text">{t('app.reattachDropHint')}</span>
            </div>
          </div>
        )}
        {/* ── 분리 창 합치기 수신 오버레이 (분리 창 전용) ────────────────────── */}
        {showMergeTarget && isDetachedWindow && (
          <div className="merge-target-overlay" aria-label={t('app.mergeWaiting')}>
            <div className="merge-target-overlay-inner">
              <span className="merge-target-overlay-icon">⊞</span>
              <span className="merge-target-overlay-text">{t('app.mergeDropHint')}</span>
            </div>
          </div>
        )}
        {/* ── 커맨드 팔레트 ─────────────────────────────────────────────────── */}
        {paletteOpen && (
          <div
            className="modal-overlay"
            onClick={() => setPaletteOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t('app.commandPaletteAriaLabel')}
          >
            <div className="palette-panel" onClick={(e) => e.stopPropagation()}>
              <input
                className="palette-input"
                autoFocus
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteIdx(0);
                }}
                placeholder={t('app.commandPalettePlaceholder')}
                aria-label={t('app.commandPaletteSearchAriaLabel')}
                onKeyDown={handlePaletteKeyDown}
              />
              <ul className="palette-list" role="listbox">
                {filteredCommands.map((cmd, i) => (
                  <li
                    key={cmd.id}
                    className={`palette-item${i === paletteIdx ? ' is-active' : ''}${!cmd.available ? ' is-disabled' : ''}`}
                    role="option"
                    aria-selected={i === paletteIdx}
                    onClick={() => {
                      if (cmd.available) {
                        cmd.action();
                        setPaletteOpen(false);
                      }
                    }}
                    onMouseEnter={() => setPaletteIdx(i)}
                  >
                    <span className="palette-label">{cmd.label}</span>
                    {commandShortcutMap.get(cmd.id) && (
                      <span className="palette-shortcut">{commandShortcutMap.get(cmd.id)}</span>
                    )}
                    {!cmd.available && <span className="palette-badge">{t('common.unavailable')}</span>}
                  </li>
                ))}
                {filteredCommands.length === 0 && <li className="palette-empty">{t('common.noResult')}</li>}
              </ul>
            </div>
          </div>
        )}
        {/* ── 설정 패널 ─────────────────────────────────────────────────────── */}
        {settingsOpen && (
          <div
            className="modal-overlay"
            onClick={() => setSettingsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t('app.settingsAriaLabel')}
          >
            <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
              <div className="settings-header">
                <span className="settings-title">{t('app.settingsTitle')}</span>
                <button className="settings-close" onClick={() => setSettingsOpen(false)} title={t('common.close')}>
                  ✕
                </button>
              </div>

              <div className="settings-body">
                {/* 테마 */}
                <section className="settings-section">
                  <h3 className="settings-section-title">{t('app.miniSettingsTheme')}</h3>
                  <div className="settings-radio-group">
                    {(['dark', 'light'] as ThemeName[]).map((th) => (
                      <label key={th} className={`radio-option${theme === th ? ' is-active' : ''}`}>
                        <input
                          type="radio"
                          name="theme"
                          value={th}
                          checked={theme === th}
                          onChange={() => setTheme(th)}
                        />
                        {th === 'dark' ? t('app.miniSettingsDark') : t('app.miniSettingsLight')}
                      </label>
                    ))}
                  </div>
                </section>

                {/* 폰트 크기 */}
                <section className="settings-section">
                  <h3 className="settings-section-title">
                    {t('app.miniSettingsFontSize')}
                    <span className="settings-value">{fontSize}px</span>
                  </h3>
                  <input
                    className="settings-range"
                    type="range"
                    min="8"
                    max="24"
                    step="1"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    aria-label={t('app.miniSettingsFontSizeAriaLabel')}
                  />
                  <div className="settings-range-labels">
                    <span>8px</span>
                    <span>24px</span>
                  </div>
                </section>

                {/* 기본 셸 */}
                <section className="settings-section">
                  <h3 className="settings-section-title">{t('app.miniSettingsDefaultShell')}</h3>
                  <select
                    className="settings-select"
                    value={defaultShell}
                    onChange={(e) => setDefaultShell(e.target.value as ShellKind)}
                  >
                    {shellOptions.map((option) => (
                      <option key={option.kind} value={option.kind} disabled={!option.available}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="settings-hint">{t('app.miniSettingsShellHint')}</p>
                </section>

                {/* 기본 작업 폴더 */}
                <section className="settings-section">
                  <h3 className="settings-section-title">{t('app.miniSettingsDefaultCwd')}</h3>
                  <div className="settings-cwd-row">
                    <input
                      className="settings-path-input"
                      type="text"
                      value={defaultCwd}
                      readOnly
                      placeholder={t('app.miniSettingsCwdPlaceholder')}
                      aria-label={t('app.miniSettingsCwdAriaLabel')}
                    />
                    <button
                      className="settings-pick-btn"
                      onClick={handleSelectDefaultCwd}
                      title={t('app.miniSettingsFolderSelectTitle')}
                      disabled={selectDefaultCwdPending}
                      aria-busy={selectDefaultCwdPending}
                    >
                      📁
                    </button>
                    {defaultCwd && (
                      <button
                        className="settings-clear-btn"
                        onClick={() => setDefaultCwd('')}
                        title={t('app.miniSettingsResetTitle')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <p className="settings-hint">{t('app.miniSettingsCwdHint')}</p>
                </section>

                {/* AI 프로바이더 */}
                <section className="settings-section">
                  <h3 className="settings-section-title">{t('app.miniSettingsAiProvider')}</h3>

                  {/* 프로바이더 선택 */}
                  <div className="settings-ai-row">
                    <label className="settings-ai-label">{t('app.miniSettingsProvider')}</label>
                    <select
                      className="settings-select settings-ai-select"
                      value={aiEdit.provider}
                      onChange={(e) => {
                        const p = e.target.value as AiProviderKind;
                        const meta = AI_PROVIDERS[p];
                        setAiEdit((prev) => ({
                          ...prev,
                          provider: p,
                          model: meta.defaultModel,
                          baseUrl: meta.defaultBaseUrl,
                        }));
                      }}
                    >
                      {(Object.keys(AI_PROVIDERS) as AiProviderKind[]).map((p) => (
                        <option key={p} value={p}>
                          {AI_PROVIDERS[p].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 모델 선택 */}
                  <div className="settings-ai-row">
                    <label className="settings-ai-label">{t('app.miniSettingsModel')}</label>
                    <div className="settings-ai-model-row">
                      <select
                        className="settings-select settings-ai-select"
                        value={aiEdit.model}
                        onChange={(e) => setAiEdit((prev) => ({ ...prev, model: e.target.value }))}
                      >
                        {AI_PROVIDERS[aiEdit.provider].models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        className="settings-path-input"
                        type="text"
                        placeholder={t('app.miniSettingsModelCustomPlaceholder')}
                        value={AI_PROVIDERS[aiEdit.provider].models.includes(aiEdit.model) ? '' : aiEdit.model}
                        onChange={(e) => e.target.value && setAiEdit((prev) => ({ ...prev, model: e.target.value }))}
                        style={{ width: '180px', marginLeft: '6px' }}
                        title={t('app.miniSettingsModelCustomTitle')}
                      />
                    </div>
                  </div>

                  {/* API 키 */}
                  {AI_PROVIDERS[aiEdit.provider].needsKey && (
                    <div className="settings-ai-row">
                      <label className="settings-ai-label">{t('app.miniSettingsApiKey')}</label>
                      <div className="settings-cwd-row">
                        <input
                          className="settings-path-input"
                          type={showApiKey ? 'text' : 'password'}
                          value={aiEdit.apiKey}
                          onChange={(e) => setAiEdit((prev) => ({ ...prev, apiKey: e.target.value }))}
                          placeholder={`${AI_PROVIDERS[aiEdit.provider].label} API Key`}
                          spellCheck={false}
                          autoComplete="off"
                          style={{ flex: 1, fontFamily: showApiKey ? 'monospace' : undefined }}
                        />
                        <button
                          className="settings-pick-btn"
                          title={
                            showApiKey ? t('app.miniSettingsApiKeyHideTitle') : t('app.miniSettingsApiKeyShowTitle')
                          }
                          onClick={() => setShowApiKey((v) => !v)}
                          style={{ minWidth: '32px' }}
                        >
                          {showApiKey ? '🙈' : '👁'}
                        </button>
                        {aiEdit.apiKey && (
                          <button
                            className="settings-clear-btn"
                            onClick={() => setAiEdit((prev) => ({ ...prev, apiKey: '' }))}
                            title={t('app.miniSettingsApiKeyResetTitle')}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 커스텀 Base URL */}
                  <div className="settings-ai-row">
                    <label className="settings-ai-label">{t('app.miniSettingsEndpoint')}</label>
                    <div className="settings-cwd-row">
                      <input
                        className="settings-path-input"
                        type="text"
                        value={aiEdit.baseUrl}
                        onChange={(e) => setAiEdit((prev) => ({ ...prev, baseUrl: e.target.value }))}
                        placeholder={
                          AI_PROVIDERS[aiEdit.provider].defaultBaseUrl || t('app.miniSettingsEndpointPlaceholder')
                        }
                        spellCheck={false}
                        style={{ flex: 1 }}
                      />
                      {aiEdit.baseUrl && (
                        <button
                          className="settings-clear-btn"
                          onClick={() =>
                            setAiEdit((prev) => ({ ...prev, baseUrl: AI_PROVIDERS[aiEdit.provider].defaultBaseUrl }))
                          }
                          title={t('app.miniSettingsEndpointResetTitle')}
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="settings-hint">
                    {AI_PROVIDERS[aiEdit.provider].needsKey
                      ? t('app.miniSettingsApiKeyRequired', { provider: AI_PROVIDERS[aiEdit.provider].label })
                      : t('app.miniSettingsLocalNoKey', { provider: AI_PROVIDERS[aiEdit.provider].label })}
                  </p>

                  {xenisPhase5Enabled && (
                    <>
                      {/* 에이전트 모드 API 서버 */}
                      <div style={{ margin: '10px 0 4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <div className="settings-ai-row">
                          <label className="settings-ai-label" style={{ whiteSpace: 'nowrap' }}>
                            {t('app.miniSettingsAgentApi')}
                          </label>
                          <div style={{ flex: 1 }}>
                            <div className="settings-cwd-row">
                              <input
                                className="settings-path-input"
                                type="text"
                                value={aiEdit.xcAgentApiUrl ?? ''}
                                onChange={(e) => setAiEdit((prev) => ({ ...prev, xcAgentApiUrl: e.target.value }))}
                                placeholder={t('app.miniSettingsAgentApiPlaceholder')}
                                spellCheck={false}
                                style={{ flex: 1 }}
                              />
                              {aiEdit.xcAgentApiUrl && (
                                <button
                                  className="settings-clear-btn"
                                  onClick={() => setAiEdit((prev) => ({ ...prev, xcAgentApiUrl: '' }))}
                                  title={t('app.miniSettingsAgentApiResetTitle')}
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                            <p className="settings-hint" style={{ margin: '3px 0 0' }}>
                              {t('app.miniSettingsAgentApiDesc')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 드래프트 모드 API 서버 */}
                      <div style={{ margin: '8px 0 4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                        <div className="settings-ai-row">
                          <label className="settings-ai-label" style={{ whiteSpace: 'nowrap' }}>
                            {t('app.miniSettingsDraftApi')}
                            <br />
                            <span style={{ fontSize: '10px', color: 'var(--fg-muted)', fontWeight: 400 }}>
                              {t('app.miniSettingsDraftApiSelect')}
                            </span>
                          </label>
                          <div style={{ flex: 1 }}>
                            <div className="settings-cwd-row">
                              <input
                                className="settings-path-input"
                                type="text"
                                value={aiEdit.xcApiUrl}
                                onChange={(e) => setAiEdit((prev) => ({ ...prev, xcApiUrl: e.target.value }))}
                                placeholder={t('app.miniSettingsDraftApiPlaceholder')}
                                spellCheck={false}
                                style={{ flex: 1 }}
                              />
                              {aiEdit.xcApiUrl && (
                                <button
                                  className="settings-clear-btn"
                                  onClick={() => setAiEdit((prev) => ({ ...prev, xcApiUrl: '' }))}
                                  title={t('app.miniSettingsDraftApiResetTitle')}
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <p className="settings-hint" style={{ margin: '3px 0 0' }}>
                              {t('app.miniSettingsDraftApiDesc')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Lab 모드 전용 API 서버 */}
                  <div style={{ margin: '8px 0 4px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    <div className="settings-ai-row">
                      <label className="settings-ai-label" style={{ whiteSpace: 'nowrap' }}>
                        Lab API
                        <br />
                        <span style={{ fontSize: '10px', color: 'var(--fg-muted)', fontWeight: 400 }}>
                          {t('app.miniSettingsLabApi')}
                        </span>
                      </label>
                      <div style={{ flex: 1 }}>
                        <div className="settings-cwd-row">
                          <input
                            className="settings-path-input"
                            type="text"
                            value={aiEdit.labApiUrl ?? ''}
                            onChange={(e) => setAiEdit((prev) => ({ ...prev, labApiUrl: e.target.value }))}
                            placeholder={t('app.miniSettingsLabApiPlaceholder')}
                            spellCheck={false}
                            style={{ flex: 1 }}
                          />
                          {aiEdit.labApiUrl && aiEdit.labApiUrl !== 'http://127.0.0.1:3845' && (
                            <button
                              className="settings-clear-btn"
                              onClick={() => setAiEdit((prev) => ({ ...prev, labApiUrl: 'http://127.0.0.1:3845' }))}
                              title={t('app.miniSettingsLabApiResetTitle')}
                            >
                              ↺
                            </button>
                          )}
                        </div>
                        <p className="settings-hint" style={{ margin: '3px 0 0' }}>
                          {t('app.miniSettingsLabApiDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 저장 버튼 */}
                  <button
                    className="settings-pick-btn"
                    style={{ marginTop: '6px', padding: '4px 14px', fontSize: '12px' }}
                    onClick={() => {
                      setAiProvider(aiEdit);
                      // settingsApiUrlRef.current 를 포함해 MetaManagement/QueryAnalyzer 가
                      // apiUrl 없는 이벤트를 수신해도 DEFAULT_API_URL 로 덮어쓰지 않도록 한다.
                      window.dispatchEvent(
                        new CustomEvent('app-settings-changed', {
                          detail: { apiUrl: settingsApiUrlRef.current, aiProvider: aiEdit },
                        }),
                      );
                    }}
                  >
                    {t('app.miniSettingsApplyAi')}
                  </button>
                </section>
              </div>
            </div>
          </div>
        )}
        {/* 셸 선택 드롭다운 — Portal */}
        {shellDropOpen &&
          createPortal(
            <div
              className="shell-dropdown shell-dropdown--portal"
              style={{ position: 'fixed', top: shellDropPos.top, left: shellDropPos.left }}
            >
              {(() => {
                const shellMenuItems =
                  shells.length > 0
                    ? shells.map((shell) => shell.kind)
                    : (['powershell', 'cmd', 'pwsh', 'wsl'] as ShellKind[]);
                const available = shellMenuItems.filter((k) => shellAvailable(k));
                const unavailable = shellMenuItems.filter((k) => !shellAvailable(k));
                const unavailableHint: Partial<Record<ShellKind, string>> = {
                  pwsh: t('app.pwshNotFound'),
                  wsl: t('app.wslNotFound'),
                };
                const renderItem = (kind: ShellKind, disabled: boolean) => (
                  <button
                    key={kind}
                    className={`shell-item${disabled ? ' is-disabled' : ''}`}
                    disabled={disabled}
                    onClick={() => {
                      createTerminalSession(kind);
                      setShellDropOpen(false);
                    }}
                    title={
                      disabled
                        ? (unavailableHint[kind] ?? t('app.shellUnavailable', { shell: SHELL_LABEL[kind] }))
                        : t('app.newShellSession', {
                            shell: shells.find((s) => s.kind === kind)?.label ?? SHELL_LABEL[kind],
                          })
                    }
                  >
                    <span className="shell-item-icon">▶</span>
                    <span className="shell-item-label">
                      {shells.find((s) => s.kind === kind)?.label ?? SHELL_LABEL[kind]}
                    </span>
                    {disabled && <span className="shell-item-badge">{t('common.notInstalled')}</span>}
                  </button>
                );
                const terminalProfilesHaveGroups =
                  terminalGroups.length > 0 ||
                  localProfiles.some((profile) => !!profile.groupId) ||
                  remoteProfiles.some((profile) => !!profile.groupId);
                const groupName = (groupId: string) =>
                  terminalGroups.find((group) => group.id === groupId)?.name?.trim() || t('app.terminalUngrouped');
                const renderLocalProfileButton = (profile: LocalTerminalProfile) => (
                  <button
                    key={`local-${profile.id}`}
                    className="shell-item"
                    onClick={() => {
                      createLocalProfileTerminalSession(profile);
                      setShellDropOpen(false);
                    }}
                    title={`${SHELL_LABEL[profile.shell]}${profile.cwd ? ` · ${profile.cwd}` : ''}`}
                  >
                    <span className="shell-item-icon">{profile.shell.slice(0, 3).toUpperCase()}</span>
                    <span className="shell-item-label">{profile.name || SHELL_LABEL[profile.shell]}</span>
                  </button>
                );
                const renderRemoteProfileButton = (profile: RemoteTerminalProfile) => (
                  <button
                    key={`remote-${profile.id}`}
                    className="shell-item"
                    onClick={() => {
                      createRemoteTerminalSession(profile);
                      setShellDropOpen(false);
                    }}
                    title={`${profile.protocol.toUpperCase()} ${profile.host}:${profile.port}`}
                  >
                    <span className="shell-item-icon">{profile.protocol === 'ssh' ? 'SSH' : 'TEL'}</span>
                    <span className="shell-item-label">{profile.name || profile.host}</span>
                  </button>
                );
                const renderTerminalProfileSubmenus = () => {
                  if (!terminalProfilesHaveGroups) {
                    return (
                      <>
                        {localProfiles.length > 0 && (
                          <>
                            <div className="shell-section-label">{t('app.localShellProfilesSection')}</div>
                            {localProfiles.map((profile) => renderLocalProfileButton(profile))}
                          </>
                        )}
                        <div className="shell-section-label">{t('app.remoteTerminalsSection')}</div>
                        {remoteProfiles.length > 0 ? (
                          remoteProfiles.map((profile) => renderRemoteProfileButton(profile))
                        ) : (
                          <button className="shell-item is-disabled" disabled>
                            <span className="shell-item-icon">⇄</span>
                            <span className="shell-item-label">{t('app.remoteNoProfiles')}</span>
                          </button>
                        )}
                      </>
                    );
                  }

                  const items = [
                    ...localProfiles.map((profile) => ({
                      type: 'local' as const,
                      profile,
                      groupId: profile.groupId || '',
                    })),
                    ...remoteProfiles.map((profile) => ({
                      type: 'remote' as const,
                      profile,
                      groupId: profile.groupId || '',
                    })),
                  ];
                  const renderProfileMenuItem = (item: (typeof items)[number]) =>
                    item.type === 'local'
                      ? renderLocalProfileButton(item.profile)
                      : renderRemoteProfileButton(item.profile);
                  const renderProfileSubmenu = (key: string, label: string, groupItems: typeof items) => (
                    <div className="shell-submenu-group" key={key}>
                      <button className="shell-item shell-submenu-trigger" type="button">
                        <span className="shell-item-icon">▸</span>
                        <span className="shell-item-label">{label}</span>
                        <span className="shell-submenu-arrow">›</span>
                      </button>
                      <div className="shell-submenu">{groupItems.map(renderProfileMenuItem)}</div>
                    </div>
                  );
                  const groupedIds = [
                    ...terminalGroups.map((group) => group.id),
                    ...items.map((item) => item.groupId).filter(Boolean),
                  ].filter((groupId, index, all) => all.indexOf(groupId) === index);
                  const ungrouped = items.filter((item) => !item.groupId);

                  return (
                    <>
                      {groupedIds.map((groupId) => {
                        const groupItems = items.filter((item) => item.groupId === groupId);
                        if (groupItems.length === 0) return null;
                        return renderProfileSubmenu(groupId, groupName(groupId), groupItems);
                      })}
                      {ungrouped.length > 0 && renderProfileSubmenu('ungrouped', t('app.terminalUngrouped'), ungrouped)}
                      {items.length === 0 && (
                        <button className="shell-item is-disabled" disabled>
                          <span className="shell-item-icon">⇄</span>
                          <span className="shell-item-label">{t('app.remoteNoProfiles')}</span>
                        </button>
                      )}
                    </>
                  );
                };
                return (
                  <>
                    {available.map((k) => renderItem(k, false))}
                    {unavailable.length > 0 && available.length > 0 && <div className="shell-sep" />}
                    {unavailable.map((k) => renderItem(k, true))}
                    <div className="shell-sep" />
                    {renderTerminalProfileSubmenus()}
                    <button
                      className="shell-item"
                      onClick={() => {
                        openRemoteTerminalSettings();
                        setShellDropOpen(false);
                      }}
                      title={t('app.remoteManageServers')}
                    >
                      <span className="shell-item-icon">⚙</span>
                      <span className="shell-item-label">{t('app.remoteManageServers')}</span>
                    </button>
                  </>
                );
              })()}
            </div>,
            document.body,
          )}
        {/* 창 크기/위치 프리셋 드롭다운 — Portal */}
        {windowSizerOpen &&
          createPortal(
            <div
              className="window-sizer-dropdown window-sizer-dropdown--portal"
              style={{ position: 'fixed', top: windowSizerPos.top, left: windowSizerPos.left }}
            >
              {(() => {
                const displayPresets = windowSizerPresets.filter((preset) => preset.group === 'Display');
                const groupedPresets = windowSizerPresets.filter((preset) => preset.group !== 'Display');
                const groupNames = groupedPresets
                  .map((preset) => preset.group || t('app.windowSizerCustomGroup'))
                  .filter((group, index, all) => all.indexOf(group) === index);
                const renderPresetButton = (preset: WindowSizerPreset) => (
                  <button
                    key={preset.id}
                    className="window-sizer-item"
                    onClick={() => handleApplyWindowSizerPreset(preset)}
                    title={`${preset.width}x${preset.height}${preset.moveToPosition ? ` · ${preset.x}, ${preset.y}` : ''}`}
                  >
                    <span className="window-sizer-item-icon">▣</span>
                    <span className="window-sizer-item-label">{preset.name || `${preset.width}x${preset.height}`}</span>
                    <span className="window-sizer-item-size">
                      {preset.width}x{preset.height}
                    </span>
                  </button>
                );
                const renderGroupSubmenu = (group: string) => {
                  const groupItems = groupedPresets.filter(
                    (preset) => (preset.group || t('app.windowSizerCustomGroup')) === group,
                  );
                  if (groupItems.length === 0) return null;
                  return (
                    <div className="window-sizer-submenu-group" key={group}>
                      <button className="window-sizer-item window-sizer-submenu-trigger" type="button">
                        <span className="window-sizer-item-icon">▸</span>
                        <span className="window-sizer-item-label">{group}</span>
                        <span className="window-sizer-submenu-arrow">›</span>
                      </button>
                      <div className="window-sizer-submenu">{groupItems.map(renderPresetButton)}</div>
                    </div>
                  );
                };

                return (
                  <>
                    {displayPresets.map(renderPresetButton)}
                    {groupNames.length > 0 && <div className="window-sizer-sep" />}
                    {groupNames.map(renderGroupSubmenu)}
                    <div className="window-sizer-sep" />
                    <button className="window-sizer-item" onClick={handleAddWindowPresetFromCurrentBounds}>
                      <span className="window-sizer-item-icon">＋</span>
                      <span className="window-sizer-item-label">{t('app.windowSizerAddCurrent')}</span>
                    </button>
                    <button className="window-sizer-item" onClick={openWindowSizerSettings}>
                      <span className="window-sizer-item-icon">⚙</span>
                      <span className="window-sizer-item-label">{t('app.windowSizerSettings')}</span>
                    </button>
                  </>
                );
              })()}
            </div>,
            document.body,
          )}
        {/* 워크스페이스 열기 드롭다운 */}
        {workspaceOpenDropdownOpen &&
          createPortal(
            <div
              className="workspace-dropdown workspace-dropdown--portal"
              style={{ position: 'fixed', top: workspaceOpenDropdownPos.top, right: workspaceOpenDropdownPos.right }}
            >
              <button className="workspace-item" onClick={handleOpenWorkspace} title={t('app.openWorkspaceFile')}>
                <span className="workspace-item-icon">＋</span>
                <span className="workspace-item-label">{t('app.openWorkspaceFile')}</span>
              </button>
              <div className="workspace-sep" />
              {workspaceRecent.length === 0 ? (
                <div className="workspace-empty">{t('app.workspaceRecentMenuEmpty')}</div>
              ) : (
                workspaceRecent.map((item) => (
                  <button
                    key={item.path}
                    className={`workspace-item${item.path === workspacePath ? ' is-current' : ''}`}
                    onClick={() => {
                      void handleOpenRecentWorkspace(item);
                    }}
                    title={item.path}
                  >
                    <span className="workspace-item-icon">▣</span>
                    <span className="workspace-item-main">
                      <span className="workspace-item-label">{item.name}</span>
                      <span className="workspace-item-path">{item.path}</span>
                    </span>
                  </button>
                ))
              )}
            </div>,
            document.body,
          )}
        {/* 탭 정렬 드롭다운 — Portal로 document.body에 렌더링 (overflow/stacking context 우회) */}
        {arrangeOpen &&
          createPortal(
            <div
              className="arrange-dropdown arrange-dropdown--portal"
              style={{ position: 'fixed', top: arrangePos.top, left: arrangePos.left }}
            >
              <button className="arrange-item" onClick={handleArrangeH} title={t('app.alignHorizontalBtn')}>
                <span className="arrange-icon arrange-icon--rotate90">⊟</span>{' '}
                {t('app.alignHorizontalBtn').replace(/^[⊟⊠⊞⊡]\s*/, '')}
              </button>
              <button className="arrange-item" onClick={handleArrangeV} title={t('app.alignVerticalBtn')}>
                <span className="arrange-icon">⊟</span> {t('app.alignVerticalBtn').replace(/^[⊟⊠⊞⊡]\s*/, '')}
              </button>
              <button className="arrange-item" onClick={handleArrangeGrid} title={t('app.alignGridBtn')}>
                <span className="arrange-icon">⊞</span> {t('app.alignGridBtn').replace(/^[⊟⊠⊞⊡]\s*/, '')}
              </button>
              <div className="arrange-sep" />
              <button className="arrange-item arrange-merge" onClick={handleMergeAll} title={t('app.mergeAllBtn')}>
                <span className="arrange-icon">⊡</span> {t('app.mergeAllBtn').replace(/^[⊟⊠⊞⊡]\s*/, '')}
              </button>
            </div>,
            document.body,
          )}
        {/* 도구 드롭다운 Portal */}
        {toolsOpen &&
          createPortal(
            <div
              className="tools-dropdown tools-dropdown--portal"
              style={{ position: 'fixed', top: toolsPos.top, left: toolsPos.left }}
            >
              {resolvedToolsMenu.primary.map((item) => renderToolsMenuItem(item))}
              {resolvedToolsMenu.groups.map((group) => (
                <React.Fragment key={group.id}>
                  {group.separatorBefore && <hr className="tools-sep" />}
                  {renderToolsSubmenuGroup(group)}
                </React.Fragment>
              ))}
            </div>,
            document.body,
          )}
        {/* 이력 드롭다운 Portal */}
        {histDropOpen &&
          createPortal(
            <div
              className="cmd-history-dropdown"
              style={{ position: 'fixed', top: histDropPos.top, right: histDropPos.right }}
            >
              {cmdHistory.length === 0 ? (
                <div className="cmd-history-empty">{t('app.noHistorySaved')}</div>
              ) : (
                cmdHistory.map((cmd, i) => (
                  <div key={i} className="cmd-history-item" title={cmd}>
                    <button
                      className="cmd-history-load"
                      onClick={() => {
                        setCmdInput(cmd);
                        setHistoryIdx(i);
                        setHistDropOpen(false);
                        cmdInputRef.current?.focus();
                      }}
                      title={cmd}
                    >
                      <span className="cmd-history-idx">{i + 1}</span>
                      <span className="cmd-history-cmd">{cmd}</span>
                    </button>
                    <button
                      className="cmd-history-save"
                      onClick={() => handleHistorySaveAsWorkBlock(cmd)}
                      title={t('app.workBlockHistorySaveTitle')}
                    >
                      {t('app.workBlockHistorySaveLabel')}
                    </button>
                  </div>
                ))
              )}
            </div>,
            document.body,
          )}
        {/* Command bundle Portal */}
        {workBlocksOpen &&
          createPortal(
            <div
              className="cmd-work-block-panel"
              style={{ position: 'fixed', top: workBlocksPos.top, right: workBlocksPos.right }}
            >
              <div className="cmd-work-block-header">
                <span>{t('app.workBlocksTitle')}</span>
                <div className="cmd-work-block-header-actions">
                  <button className="cmd-work-block-add-btn" onClick={handleWorkBlockImport}>
                    {t('app.workBlockImport')}
                  </button>
                  <button className="cmd-work-block-add-btn" onClick={handleWorkBlockExport}>
                    {t('app.workBlockExport')}
                  </button>
                  <button className="cmd-work-block-add-btn" onClick={handleWorkBlockAddCurrent}>
                    {t('app.workBlockAddCurrent')}
                  </button>
                  <button className="cmd-work-block-add-btn" onClick={handleWorkBlockAddLastSent}>
                    {t('app.workBlockAddLastSent')}
                  </button>
                </div>
              </div>

              <div className="cmd-work-block-tools">
                <input
                  className="cmd-work-block-search"
                  placeholder={t('app.workBlockSearchPlaceholder')}
                  value={workBlockQuery}
                  onChange={(e) => setWorkBlockQuery(e.target.value)}
                  spellCheck={false}
                />
                <select
                  className="cmd-work-block-sort"
                  value={workBlockSort}
                  onChange={(e) => setWorkBlockSort(e.target.value as WorkBlockSortMode)}
                  aria-label={t('app.workBlockSortAriaLabel')}
                >
                  <option value="recent">{t('app.workBlockSortRecent')}</option>
                  <option value="runs">{t('app.workBlockSortRuns')}</option>
                  <option value="label">{t('app.workBlockSortLabel')}</option>
                </select>
              </div>

              <div className="cmd-work-block-list">
                {workBlocks.length === 0 ? (
                  <div className="cmd-work-block-empty">
                    {t('app.workBlockNoSaved')}
                    <br />
                    <small>{t('app.workBlockNoSavedHint')}</small>
                  </div>
                ) : groupedWorkBlocks.length === 0 ? (
                  <div className="cmd-work-block-empty">
                    {t('app.workBlockNoMatches')}
                    <br />
                    <small>{t('app.workBlockNoMatchesHint')}</small>
                  </div>
                ) : (
                  <>
                    {recentWorkBlocks.length > 0 && (
                      <section className="cmd-work-block-recent">
                        <div className="cmd-work-block-group-title">
                          <span>{t('app.workBlockRecentlyRun')}</span>
                          <span>{recentWorkBlocks.length}</span>
                        </div>
                        {recentWorkBlocks.map((block) => renderWorkBlockRow(block))}
                      </section>
                    )}
                    {groupedWorkBlocks.map((section) => (
                      <section key={section.group} className="cmd-work-block-group">
                        <div className="cmd-work-block-group-title">
                          <span>{section.group}</span>
                          <span>{section.blocks.length}</span>
                        </div>
                        {section.blocks.map((block) => renderWorkBlockRow(block))}
                      </section>
                    ))}
                  </>
                )}
              </div>
            </div>,
            document.body,
          )}
        {/* ── 사용자 인증 드롭다운 Portal ─────────────────────────────────── */}
        {authDropOpen &&
          createPortal(
            <div
              className="auth-dropdown auth-dropdown--portal"
              style={{ position: 'fixed', top: authDropPos.top, right: authDropPos.right }}
            >
              {authUser ? (
                /* ── 로그인 상태: 사용자 정보 카드 ── */
                <div className="auth-user-card">
                  <div className="auth-user-avatar-lg">{authUser.name.charAt(0).toUpperCase()}</div>
                  <div className="auth-user-info">
                    <div className="auth-user-name">{authUser.name}</div>
                    <div className="auth-user-email">{authUser.email}</div>
                    {authUser.plan && (
                      <div className="auth-user-plan">
                        {authUser.plan === '1'
                          ? t('common.planBasic')
                          : authUser.plan === '2'
                            ? t('common.planPro')
                            : t('common.planOther', { plan: authUser.plan })}
                      </div>
                    )}
                  </div>
                  <hr className="auth-sep" />
                  <button className="auth-logout-btn" onClick={handleAuthLogout}>
                    <span>⎋</span> {t('common.logout')}
                  </button>
                </div>
              ) : (
                /* ── 비로그인 상태: 로그인/회원가입 폼 ── */
                <div className="auth-form-card">
                  {/* 헤더 탭 */}
                  <div className="auth-tabs">
                    <button
                      className={`auth-tab${authMode === 'signin' ? ' is-active' : ''}`}
                      onClick={() => {
                        setAuthMode('signin');
                        setAuthShowEmailForm(false);
                        setAuthPasswordError('');
                      }}
                    >
                      {t('common.login')}
                    </button>
                    <button
                      className={`auth-tab${authMode === 'signup' ? ' is-active' : ''}`}
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthShowEmailForm(false);
                        setAuthPasswordError('');
                      }}
                    >
                      {t('common.signup')}
                    </button>
                  </div>

                  {!authShowEmailForm ? (
                    <div className="auth-social-btns">
                      {/* 이메일 로그인 버튼 */}
                      <button className="auth-email-btn" onClick={() => setAuthShowEmailForm(true)}>
                        {t('app.loginEmailMode', {
                          mode: authMode === 'signin' ? t('common.login') : t('common.signup'),
                        })}
                      </button>
                      <p className="auth-hint">
                        {authMode === 'signin' ? t('app.loginEmailSigninDesc') : t('app.loginEmailSignupDesc')}
                      </p>
                    </div>
                  ) : (
                    <form className="auth-email-form" onSubmit={handleAuthSubmit}>
                      {authMode === 'signup' && (
                        <div className="auth-field">
                          <label className="auth-label">{t('app.formName')}</label>
                          <input
                            className="auth-input"
                            type="text"
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder={t('app.formNamePlaceholder')}
                            required
                            autoFocus
                          />
                        </div>
                      )}

                      <div className="auth-field">
                        <label className="auth-label">{t('app.formEmail')}</label>
                        <input
                          className="auth-input"
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder={t('app.formEmailPlaceholder')}
                          required
                          autoFocus={authMode === 'signin'}
                        />
                      </div>

                      <div className="auth-field">
                        <label className="auth-label">{t('app.formPassword')}</label>
                        <input
                          className="auth-input"
                          type="password"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          placeholder={t('app.formPasswordPlaceholder')}
                          required
                        />
                        {authMode === 'signup' &&
                          authPassword &&
                          (() => {
                            const s = getAuthPasswordStrength(authPassword);
                            return (
                              <div className="auth-pw-strength">
                                <div className="auth-pw-bar">
                                  <div
                                    className="auth-pw-fill"
                                    style={{
                                      width:
                                        s.strength === 1
                                          ? '33%'
                                          : s.strength === 2
                                            ? '66%'
                                            : s.strength === 3
                                              ? '100%'
                                              : '0%',
                                      background: s.color,
                                    }}
                                  />
                                </div>
                                <span style={{ color: s.color, fontSize: '11px' }}>{s.text}</span>
                              </div>
                            );
                          })()}
                      </div>

                      {authMode === 'signup' && (
                        <div className="auth-field">
                          <label className="auth-label">{t('app.formPasswordConfirm')}</label>
                          <input
                            className="auth-input"
                            type="password"
                            value={authConfirmPassword}
                            onChange={(e) => setAuthConfirmPassword(e.target.value)}
                            placeholder={t('app.formPasswordConfirmPlaceholder')}
                            required
                          />
                        </div>
                      )}

                      {authPasswordError && <div className="auth-error">{authPasswordError}</div>}

                      <div className="auth-form-btns">
                        <button
                          type="button"
                          className="auth-back-btn"
                          onClick={() => {
                            setAuthShowEmailForm(false);
                            setAuthPasswordError('');
                          }}
                        >
                          {t('app.formBack')}
                        </button>
                        <button
                          type="submit"
                          className="auth-submit-btn"
                          disabled={!authIsFormValid() || authIsLoading}
                        >
                          {authIsLoading ? (
                            <span className="auth-spinner" />
                          ) : authMode === 'signin' ? (
                            t('app.formSubmitLogin')
                          ) : (
                            t('app.formSubmitSignup')
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>,
            document.body,
          )}
        {/* ── 업데이트 다운로드 완료 알림 배너 ─────────────────────────────── */}
        {updaterStatus.state === 'downloaded' &&
          createPortal(
            <div className="upd-banner">
              <span className="upd-banner-icon">🔄</span>
              <span className="upd-banner-text">{t('app.updateBanner', { version: updaterStatus.info.version })}</span>
              <button className="upd-banner-btn" onClick={() => window.updaterAPI?.install()}>
                {t('app.updateRestartNow')}
              </button>
              <button
                className="upd-banner-dismiss"
                onClick={() => setUpdaterStatus((prev) => ({ ...prev, state: 'idle' }))}
                title={t('app.updateBannerClose')}
              >
                ✕
              </button>
            </div>,
            document.body,
          )}
        {/* 단축 명령 패널 Portal */}
        {shortcutOpen &&
          createPortal(
            <div
              className="cmd-shortcut-panel"
              style={{ position: 'fixed', top: shortcutPos.top, right: shortcutPos.right }}
            >
              <div className="cmd-shortcut-header">
                <span>{t('app.shortcutsTitle2')}</span>
                <button
                  className="cmd-shortcut-add-btn"
                  onClick={() => {
                    setNewScName('');
                    setNewScCmd(cmdInput);
                    setAddFormOpen(true);
                  }}
                >
                  {t('app.shortcutsAdd')}
                </button>
              </div>

              {addFormOpen && (
                <div className="cmd-shortcut-add-form">
                  <input
                    className="cmd-shortcut-form-input"
                    placeholder={t('app.shortcutsNamePlaceholder')}
                    value={newScName}
                    onChange={(e) => setNewScName(e.target.value)}
                    autoFocus
                  />
                  <input
                    className="cmd-shortcut-form-input"
                    placeholder={t('app.shortcutsCmdPlaceholder')}
                    value={newScCmd}
                    onChange={(e) => setNewScCmd(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleShortcutAdd();
                      if (e.key === 'Escape') setAddFormOpen(false);
                    }}
                  />
                  <div className="cmd-shortcut-form-btns">
                    <button className="cmd-shortcut-confirm" onClick={handleShortcutAdd}>
                      {t('app.shortcutsConfirm')}
                    </button>
                    <button className="cmd-shortcut-cancel" onClick={() => setAddFormOpen(false)}>
                      {t('app.shortcutsCancel')}
                    </button>
                  </div>
                </div>
              )}

              <div className="cmd-shortcut-list">
                {shortcuts.length === 0 ? (
                  <div className="cmd-shortcut-empty">
                    {t('app.shortcutsEmpty')}
                    <br />
                    <small>{t('app.shortcutsAddHint')}</small>
                  </div>
                ) : (
                  shortcuts.map((sc) => (
                    <div key={sc.id} className="cmd-shortcut-item">
                      <div className="cmd-shortcut-info">
                        <span className="cmd-shortcut-name">{sc.name}</span>
                        <span className="cmd-shortcut-cmd">{sc.command}</span>
                      </div>
                      <div className="cmd-shortcut-actions">
                        <button
                          className="cmd-shortcut-run"
                          onClick={() => handleShortcutRun(sc.command)}
                          title={t('app.shortcutsRunTitle')}
                        >
                          ▶
                        </button>
                        <button
                          className="cmd-shortcut-load"
                          onClick={() => {
                            setCmdInput(sc.command);
                            setShortcutOpen(false);
                            cmdInputRef.current?.focus();
                          }}
                          title={t('app.shortcutsLoadTitle')}
                        >
                          ↙
                        </button>
                        <button
                          className="cmd-shortcut-del"
                          onClick={() => handleShortcutDelete(sc.id)}
                          title={t('app.shortcutsDeleteTitle')}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )}
      </div>
    </ThemeContext.Provider>
  );
}
