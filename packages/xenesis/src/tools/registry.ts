import type { ShellConfig, WebToolsConfig } from '../config/types.js';
import { defaultConfig } from '../config/types.js';
import { agentTaskTool } from './agentTaskTool.js';
import { agentTool } from './agentTool.js';
import { appLaunchPlanTool } from './appLaunchPlanTool.js';
import { appReadinessTool } from './appReadinessTool.js';
import { askTool } from './askTool.js';
import { briefTool } from './briefTool.js';
import { codeSymbolsTool } from './codeTools.js';
import { codexTaskTool } from './codexTaskTool.js';
import { configTool } from './configTool.js';
import {
  artifactListTool,
  artifactReadTool,
  artifactSaveTool,
  contextIndexTool,
  contextSearchTool,
} from './contextArtifactTools.js';
import {
  marketQuoteTool,
  newsLatestTool,
  sportsScoresTool,
  weatherCurrentTool,
  weatherForecastTool,
} from './currentInfoTools.js';
import {
  deskActiveContextTool,
  deskBrowserListTool,
  deskCallCapabilityTool,
  deskCapabilitiesTool,
  deskCommandPaletteTool,
  deskContextActionsTool,
  deskCreateXconMarkdownTool,
  deskExplorerStateTool,
  deskExportXconPdfTool,
  deskOpenFileTool,
  deskPlaywrightRunTool,
  deskPlaywrightSnapshotTool,
  deskRecentDiagnosticsTool,
  deskRunCommandPaletteTool,
  deskSafeFileApplyTool,
  deskSafeFilePreviewTool,
  deskStateTool,
  deskSubagentListTool,
  deskSubagentStartTool,
  deskSubagentStopTool,
  deskSubagentTailTool,
  deskTerminalRunAndWaitTool,
  deskTerminalRunTool,
  deskTerminalStopTool,
  deskTerminalTailTool,
  deskXvCommandTool,
} from './deskBridgeTools.js';
import { createDeskOperationTool } from './deskOperationTool.js';
import { editTool, listTool, readTool, writeTool } from './fileTools.js';
import { lspTool } from './lspTool.js';
import { notebookEditTool } from './notebookEditTool.js';
import { enterPlanModeTool, exitPlanModeTool } from './planModeTools.js';
import { processTool } from './processTool.js';
import { createRemoteTriggerTool, type RemoteTriggerDependencies } from './remoteTriggerTool.js';
import { diagnosticsTool, jsonTool, serverTool } from './runtimeTools.js';
import { cronCreateTool, cronDeleteTool, cronListTool } from './scheduleCronTool.js';
import { searchTool } from './searchTool.js';
import { sendMessageTool } from './sendMessageTool.js';
import { createShellTool } from './shellTool.js';
import { skillTool } from './skillTool.js';
import { sleepTool } from './sleepTool.js';
import { taskHandoffTool } from './taskHandoffTool.js';
import { teamCreateTool, teamDeleteTool } from './teamTools.js';
import { todoTool } from './todoTool.js';
import { createToolSearchTool } from './toolSearchTool.js';
import type { Tool, ToolRegistry } from './types.js';
import { createWebFetchTool, createWebSearchTool } from './webTools.js';
import { diffTool, fileInfoTool, globTool, patchTool, treeTool } from './workspaceTools.js';
import { enterWorktreeTool, exitWorktreeTool } from './worktreeTools.js';

export interface BuiltInToolsOptions {
  env?: NodeJS.ProcessEnv;
  enableRemoteTrigger?: boolean;
  remoteTriggerDependencies?: RemoteTriggerDependencies;
  webConfig?: WebToolsConfig;
  /**
   * Persistent-shell configuration ({@link ShellConfig}). Threaded from `config.shell`
   * so the `shell` tool is built via `createShellTool(...)` with the right persistence
   * + idle-timeout. Defaults to {@link defaultConfig.shell} (persistent on, 5-minute idle)
   * for call sites that don't supply config (eval/replay/smoke/doctor).
   */
  shellConfig?: ShellConfig;
}

function remoteTriggerEnabled(options: BuiltInToolsOptions) {
  const env = options.env ?? process.env;
  return options.enableRemoteTrigger === true || /^(1|true|yes)$/iu.test(env.XENESIS_REMOTE_TRIGGER ?? '');
}

export function createBuiltInTools(options: BuiltInToolsOptions = {}): ToolRegistry {
  // The `shell` tool is a per-config factory instance (S10): it closes over a
  // Map<sessionId, ShellSession> of long-lived shells. Its `cleanupSession` is
  // fanned out by AgentRunner.cleanupToolSessions (like browserTool). Threaded from
  // config.shell; defaults to the persistent-on, 5-minute-idle baseline.
  const shellTool = createShellTool(options.shellConfig ?? defaultConfig.shell);
  const tools: Tool[] = [
    readTool,
    writeTool,
    editTool,
    listTool,
    searchTool,
    shellTool,
    processTool,
    sleepTool,
    briefTool,
    skillTool,
    todoTool,
    askTool,
    enterPlanModeTool,
    exitPlanModeTool,
    enterWorktreeTool,
    exitWorktreeTool,
    agentTool,
    sendMessageTool,
    teamCreateTool,
    teamDeleteTool,
    configTool,
    agentTaskTool,
    codexTaskTool,
    taskHandoffTool,
    createWebFetchTool(options.webConfig),
    createWebSearchTool(options.webConfig),
    weatherCurrentTool,
    weatherForecastTool,
    newsLatestTool,
    marketQuoteTool,
    sportsScoresTool,
    codeSymbolsTool,
    lspTool,
    notebookEditTool,
    cronCreateTool,
    cronListTool,
    cronDeleteTool,
    globTool,
    treeTool,
    fileInfoTool,
    diffTool,
    patchTool,
    diagnosticsTool,
    appReadinessTool,
    appLaunchPlanTool,
    jsonTool,
    serverTool,
    contextIndexTool,
    contextSearchTool,
    artifactSaveTool,
    artifactListTool,
    artifactReadTool,
    deskStateTool,
    deskActiveContextTool,
    deskBrowserListTool,
    deskExplorerStateTool,
    deskCapabilitiesTool,
    deskCallCapabilityTool,
    deskXvCommandTool,
    deskOpenFileTool,
    deskTerminalRunTool,
    deskTerminalRunAndWaitTool,
    deskSubagentStartTool,
    deskSubagentListTool,
    deskSubagentTailTool,
    deskSubagentStopTool,
    deskCommandPaletteTool,
    deskRunCommandPaletteTool,
    deskCreateXconMarkdownTool,
    deskExportXconPdfTool,
    deskTerminalTailTool,
    deskTerminalStopTool,
    deskContextActionsTool,
    deskRecentDiagnosticsTool,
    deskPlaywrightSnapshotTool,
    deskPlaywrightRunTool,
    deskSafeFilePreviewTool,
    deskSafeFileApplyTool,
    // CR Operation-DSL: verifiable, approval-gated app control (Office/PDF/media/SaaS).
    // NOT gated default-off — it degrades cleanly when the Desk runner is absent and is
    // the product path; shouldDefer keeps the footprint low (behind tool_search).
    createDeskOperationTool(),
  ];
  if (remoteTriggerEnabled(options)) {
    tools.push(createRemoteTriggerTool(options.remoteTriggerDependencies));
  }
  const registry: ToolRegistry = new Map(tools.map((tool) => [tool.name, tool]));
  for (const tool of tools) {
    for (const alias of tool.aliases ?? []) {
      registry.set(alias, tool);
    }
  }
  registry.set('tool_search', createToolSearchTool(registry));
  return registry;
}
