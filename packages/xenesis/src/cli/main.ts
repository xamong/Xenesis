#!/usr/bin/env node
import { access, appendFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';
import { FileArtifactStore } from '../artifacts/index.js';
import { FileWorkspaceChangeStore, type WorkspaceChangeRecord } from '../changes/index.js';
import {
  type ApprovalMode,
  type CliConfigOverrides,
  configJsonSchema,
  defaultConfig,
  getOperatingProfileTemplate,
  listOperatingProfileTemplates,
  loadConfig,
  type ProviderFallbackConfig,
  type ProviderName,
  pickProfileConfig,
  providerNames,
  readProfiles,
  resolveXenesisHome,
  resolveXenesisStatePath,
  writeProfiles,
  type XenesisConfig,
  xenesisStatePath,
} from '../config/index.js';
import {
  readConnectionReportEntry,
  readLatestConnectionReportEntry,
  renderConnectionReportDetails,
  runConnectionCheck,
} from '../connect/index.js';
import { FileWorkspaceContextIndexStore } from '../context/index.js';
import type { ApprovalHandler } from '../core/AgentRunner.js';
import { resumeAgentPipeline, runAgentPipeline } from '../core/AgentRunPipeline.js';
import { type AgentRunMode, createProvider, resolveRuntimeMcpServers } from '../core/AgentRuntimeFactory.js';
import type { AgentRunEvent } from '../core/events.js';
import type { AgentMessage } from '../core/messages.js';
import {
  buildSkillSystemMessage,
  clampApprovalMode,
  createAgentRunnerSubagentExecutor,
  createExtensionCatalog,
  createRuntimeToolRegistry,
  createSubagentTaskTool,
  diagnosePluginRuntime,
  type ExtensionDescriptor,
  loadSkillRegistry,
  type McpAuthStore,
  MemoryLedger,
  type PluginRuntimeDiagnostic,
  type PluginStateRecord,
  type RegisterMcpServerToolsOptions,
  type RunMcpOAuthLoginOptions,
  registerMcpServerTools,
  runMcpOAuthLogin,
  SqliteMcpAuthStore,
  SqliteMemoryLedgerStore,
  SqliteMemoryStore,
  SqlitePluginStateStore,
  SqliteSubagentTaskStore,
  type SubagentTaskExecutor,
  startXenesisMcpServer,
  trustedMemoryWriteContext,
} from '../extensions/index.js';
import { startGateway } from '../gateway/index.js';
import { availableHookNames } from '../hooks/index.js';
import type { IdeContextInput } from '../ide/index.js';
import {
  type AgentTask,
  runAgentTask,
  type ScheduleTrigger,
  SqliteAgentTaskStore,
  SqliteScheduleStore,
  type TaskSchedule,
} from '../orchestration/index.js';
import { filterToolsForApprovalMode } from '../permissions/policy.js';
import { type AgentProvider, capabilitiesFor, resolveProviderSettings } from '../providers/index.js';
import { FileRunReportStore, type RunReport, type RunReportRepairRecord } from '../runReports/index.js';
import {
  readLatestScenarioReportEntry,
  readScenarioReportEntry,
  renderScenarioReportDetails,
  runScenarioSuite,
} from '../scenario/index.js';
import {
  compactSessionEvents,
  eventsToMessages,
  JsonlSessionWriter,
  readSessionLog,
  rewindSessionEvents,
} from '../sessions/index.js';
import {
  readLatestSmokeReportEntry,
  readSmokeReportEntry,
  renderSmokeReportDetails,
  runSmoke,
} from '../smoke/index.js';
import {
  createAppE2ECheckTool,
  createBrowserTool,
  createBuiltInTools,
  createMemoryTool,
  createToolSearchTool,
  stopAllManagedServers,
  type ToolContext,
  type ToolRegistry,
} from '../tools/index.js';
import { assertInsideWorkspace } from '../utils/workspace.js';
import { runVerificationCommands, type VerificationReport } from '../verification/index.js';
import {
  type BriefCommandAction,
  inferCopyArgs,
  renderBriefCommand,
  renderCopyCommand,
  renderCtxVizCommand,
  renderExportCommand,
  renderRenameCommand,
  renderShareCommand,
  renderSummaryCommand,
  renderTagCommand,
} from './contentCommands.js';
import { type DiagnosticCommandName, isDiagnosticCommandName, renderDiagnosticCommand } from './diagnosticCommands.js';
import { runDoctor } from './doctor.js';
import { renderCliHelp } from './help.js';
import {
  isMiscCompatibilityCommandName,
  type MiscCompatibilityCommandName,
  renderMiscCompatibilityCommand,
} from './miscCompatibilityCommands.js';
import {
  isModePromptCommandName,
  type ModePromptCommandName,
  normalizeModePromptCommandAlias,
  renderModePromptCommand,
} from './modePromptCommands.js';
import { isPreferenceCommandName, type PreferenceCommandName, runPreferenceCommand } from './preferenceCommands.js';
import {
  isRemoteBridgeCommandName,
  normalizeRemoteBridgeCommandAlias,
  type RemoteBridgeCommandName,
  renderRemoteBridgeCommand,
} from './remoteBridgeCommands.js';
import { renderEvent } from './renderEvents.js';
import {
  allowedToolsForReviewCommand,
  buildReviewCommandPrompt,
  isReviewCliCommandName,
  isReviewPromptCommandName,
  type LocalReviewCommandName,
  type ReviewPromptCommandName,
  renderAdvisorCommand,
  renderAgentsCommand,
} from './reviewCommands.js';
import {
  isSetupPolicyCommandName,
  renderSetupPolicyCommand,
  type SetupPolicyCommandName,
} from './setupPolicyCommands.js';
import { looksLikeSlashCommandName, parseSlashCommandLine, renderSlashCommandHelp } from './slashCommands.js';
import type { InkTuiController } from './tui/inkRenderer.js';
import { createInitialTuiState, renderTuiFrameLines } from './tui/runTui.js';
import {
  appendTuiNotice,
  clearTuiCommandOutput,
  reduceTuiEvent,
  resolveTuiApproval,
  scrollTuiCommandOutput,
  setTuiCommandOutput,
  setTuiCommandOutputExpanded,
  setTuiCommandOutputOffset,
  setTuiCommandOutputSavedPath,
  setTuiSessionContext,
  setTuiSuggestionContext,
} from './tui/state.js';
import {
  renderCostCommand,
  renderLoginStatusCommand,
  renderLogoutCommand,
  renderRateLimitOptionsCommand,
  renderStatsCommand,
  renderUsageCommand,
} from './usageCommands.js';
import {
  buildCommitPrompt,
  renderAddDirCommand,
  renderBranchCommand,
  renderDiffCommand,
  renderFilesCommand,
} from './workspaceCommands.js';

export interface CliIo {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdin?: NodeJS.ReadableStream;
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
  approvalHandler?: ApprovalHandler;
  mcpOAuthLogin?: (options: RunMcpOAuthLoginOptions) => Promise<'authorized' | 'redirect'>;
  abortSignal?: AbortSignal;
  ideContext?: IdeContextInput;
  traceId?: string;
}

type SessionWriterSetter = (writer: JsonlSessionWriter, sessionId: string) => void;

interface RunPromptOptions {
  sessionId?: string;
  traceId?: string;
  onEvent?: (event: AgentRunEvent) => void;
  onMessages?: (messages: AgentMessage[]) => void;
  onNotice?: (line: string) => void;
  approvalHandler?: ApprovalHandler;
  abortSignal?: AbortSignal;
  ideContext?: IdeContextInput;
  preserveManagedServers?: boolean;
  systemMessages?: Extract<AgentMessage, { role: 'system' }>[];
  allowedTools?: string[];
}

interface ParsedArgs {
  command?:
    | 'doctor'
    | 'version'
    | 'status'
    | 'usage'
    | 'cost'
    | 'stats'
    | 'login'
    | 'logout'
    | 'rate-limit-options'
    | DiagnosticCommandName
    | MiscCompatibilityCommandName
    | PreferenceCommandName
    | 'config'
    | 'model'
    | 'env'
    | 'effort'
    | 'chat'
    | 'tui'
    | 'connect'
    | 'init'
    | SetupPolicyCommandName
    | 'sessions'
    | 'extensions'
    | 'skills'
    | 'mcp'
    | 'memory'
    | 'plan'
    | 'work'
    | ModePromptCommandName
    | 'plugins'
    | 'permissions'
    | 'hooks'
    | 'gateway'
    | 'scenario'
    | 'smoke'
    | 'runs'
    | 'tasks'
    | 'schedules'
    | 'context'
    | 'ctx-viz'
    | 'artifacts'
    | 'brief'
    | 'copy'
    | 'export'
    | 'share'
    | 'summary'
    | 'rename'
    | 'tag'
    | 'changes'
    | 'checkpoints'
    | 'profile'
    | 'files'
    | 'diff'
    | 'branch'
    | 'add-dir'
    | 'commit'
    | RemoteBridgeCommandName
    | ReviewPromptCommandName
    | LocalReviewCommandName;
  prompt?: string;
  sessionCommand?: 'list' | 'show' | 'compact' | 'rewind' | 'resume';
  sessionId?: string;
  rewindEvents?: number;
  initSubcommand?: 'claude';
  setupPolicyArgs?: string[];
  forceInstall?: boolean;
  runCommand?: 'report' | 'verify' | 'repair';
  taskCommand?: 'start' | 'list' | 'show' | 'run' | 'cancel' | 'retry';
  taskId?: string;
  scheduleCommand?: 'list' | 'add' | 'remove';
  scheduleId?: string;
  scheduleTrigger?: ScheduleTrigger;
  profileCommand?: 'list' | 'show' | 'save' | 'use' | 'clear' | 'delete' | 'templates' | 'install';
  profileName?: string;
  profileTemplateName?: string;
  filesCommand?: 'list';
  filesPath?: string;
  addDirPath?: string;
  commitMessage?: string;
  remoteBridgeArgs?: string[];
  loginCommand?: 'status';
  diagnosticArgs?: string[];
  miscCompatibilityArgs?: string[];
  preferenceArgs?: string[];
  configCommand?: 'list' | 'show' | 'get' | 'schema';
  configKey?: string;
  modelCommand?: 'show' | 'list' | 'set';
  modelValue?: string;
  effortCommand?: 'show' | 'set';
  effortLevel?: string;
  connectCommand?: 'check' | 'latest' | 'show';
  connectReportTarget?: string;
  smokeCommand?: 'run' | 'latest' | 'show';
  smokeReportTarget?: string;
  extensionCommand?: 'list' | 'doctor';
  pluginCommand?: 'init' | 'install' | 'list' | 'enable' | 'disable' | 'uninstall' | 'update' | 'reload' | 'doctor';
  pluginPath?: string;
  pluginAll?: boolean;
  mcpCommand?: 'list' | 'serve' | 'login';
  mcpServerName?: string;
  permissionCommand?: 'list' | 'audit';
  hookCommand?: 'list';
  scenarioCommand?: 'run' | 'latest' | 'show';
  scenarioReportTarget?: string;
  skillCommand?: 'list' | 'show';
  skillName?: string;
  memoryCommand?: 'add' | 'list' | 'search';
  memoryId?: string;
  memoryText?: string;
  memoryQuery?: string;
  modePromptArgs?: string[];
  contextCommand?: 'index' | 'show' | 'search';
  contextQuery?: string;
  artifactCommand?: 'save' | 'list' | 'show';
  artifactId?: string;
  artifactTitle?: string;
  artifactContent?: string;
  briefAction?: BriefCommandAction;
  contentSessionId?: string;
  contentMessageNumber?: number;
  exportFilename?: string;
  contentName?: string;
  tagName?: string;
  ctxVizQuery?: string;
  changeCommand?: 'list' | 'show' | 'revert' | 'accept' | 'diff';
  changeId?: string;
  checkpointCommand?: 'list' | 'show' | 'revert' | 'accept' | 'diff';
  checkpointId?: string;
  configPath?: string;
  cwd?: string;
  provider?: ProviderName;
  model?: string;
  xenesisHome?: string;
  profile?: string;
  baseURL?: string;
  apiKeyEnv?: string;
  providerRetries?: number;
  providerFallbacks?: ProviderFallbackConfig[];
  gatewayHost?: string;
  gatewayPort?: number;
  gatewayAuthTokenEnv?: string;
  gatewayAllowedOrigins?: string[];
  gatewayMaxBodyBytes?: number;
  gatewayMaxConcurrentRuns?: number;
  gatewayRequestTimeoutMs?: number;
  gatewayObservabilityMaxEvents?: number;
  gatewayObservabilityMaxAgeDays?: number;
  maxTurns?: number;
  approvalMode?: ApprovalMode;
  json: boolean;
  print: boolean;
  help: boolean;
  helpTopic?: string;
  trustWorkspace: boolean;
  savePlan: boolean;
  fromPlan: boolean;
  probe: boolean;
  acceptVerified: boolean;
  useInstalledProfile: boolean;
}

function emitStdout(io: CliIo, line: string) {
  if (io.stdout) io.stdout(line);
  else process.stdout.write(`${line}\n`);
}

function emitStderr(io: CliIo, line: string) {
  if (io.stderr) io.stderr(line);
  else process.stderr.write(`${line}\n`);
}

function emitPrompt(io: CliIo) {
  if (io.stdout) io.stdout('xenesis> ');
  else process.stdout.write('xenesis> ');
}

function emitContinuationPrompt(io: CliIo) {
  if (io.stdout) io.stdout('... ');
  else process.stdout.write('... ');
}

interface ChatPromptReader {
  setPrompt(prompt: string): void;
  prompt(): void;
}

export function createChatPromptController(io: CliIo, reader: ChatPromptReader) {
  const useReadlinePrompt = io.stdout === undefined;
  return {
    show(continuation: boolean) {
      const prompt = continuation ? '... ' : 'xenesis> ';
      if (useReadlinePrompt) {
        reader.setPrompt(prompt);
        reader.prompt();
        return;
      }
      if (continuation) emitContinuationPrompt(io);
      else emitPrompt(io);
    },
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

function readLine(stdin: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve) => {
    let buffer = '';

    const cleanup = () => {
      stdin.off('data', onData);
      stdin.off('end', onEnd);
      stdin.off('error', onError);
    };
    const finish = (line: string) => {
      cleanup();
      resolve(line);
    };
    const onData = (chunk: Buffer | string) => {
      buffer += String(chunk);
      const lineEnd = buffer.search(/\r?\n/);
      if (lineEnd !== -1) finish(buffer.slice(0, lineEnd));
    };
    const onEnd = () => finish(buffer);
    const onError = () => finish('');

    stdin.on('data', onData);
    stdin.once('end', onEnd);
    stdin.once('error', onError);
    stdin.resume();
  });
}

function normalizeArgv(argv: string[]) {
  const first = basename(argv[0] ?? '').toLowerCase();
  if (first === 'node' || first === 'node.exe') return argv.slice(2);
  const second = String(argv[1] ?? '')
    .replace(/\\/g, '/')
    .toLowerCase();
  if (second.endsWith('/dist/cli/main.js') || second.endsWith('/node_modules/xenesis/dist/cli/main.js')) {
    return argv.slice(2);
  }
  return argv;
}

function readOptionValue(args: string[], index: number, name: string) {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Option "${name}" requires a value.`);
  }
  return value;
}

function parseMaxTurns(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Option "--max-turns" must be a positive integer; got ${value}.`);
  }
  return parsed;
}

function parseProviderName(value: string): ProviderName {
  if ((providerNames as readonly string[]).includes(value)) return value as ProviderName;
  throw new Error(`Option "--provider" must be one of ${providerNames.join(', ')}; got ${value}.`);
}

function parsePositiveInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Option "${name}" must be a positive integer; got ${value}.`);
  }
  return parsed;
}

function parseScheduleTriggerSpec(value: string): ScheduleTrigger {
  if (value.startsWith('daily:')) {
    const at = value.slice('daily:'.length);
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(at)) {
      throw new Error(`Invalid daily schedule trigger: ${value}`);
    }
    return { type: 'daily', at };
  }
  if (/^\d+(ms|s|m|h|d)$/.test(value)) {
    return { type: 'interval', every: value };
  }
  throw new Error(`Invalid schedule trigger: ${value}`);
}

function parseNonNegativeInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Option "${name}" must be a non-negative integer; got ${value}.`);
  }
  return parsed;
}

function parsePort(value: string) {
  const parsed = parseNonNegativeInteger(value, '--port');
  if (parsed > 65535) throw new Error(`Option "--port" must be between 0 and 65535; got ${value}.`);
  return parsed;
}

function isKnownCommand(value: string | undefined): value is NonNullable<ParsedArgs['command']> {
  return (
    value === 'doctor' ||
    value === 'version' ||
    value === 'status' ||
    value === 'usage' ||
    value === 'cost' ||
    value === 'stats' ||
    value === 'login' ||
    value === 'logout' ||
    value === 'rate-limit-options' ||
    isDiagnosticCommandName(value) ||
    isMiscCompatibilityCommandName(value) ||
    isPreferenceCommandName(value) ||
    value === 'config' ||
    value === 'model' ||
    value === 'env' ||
    value === 'effort' ||
    value === 'chat' ||
    value === 'tui' ||
    value === 'connect' ||
    value === 'init' ||
    isSetupPolicyCommandName(value) ||
    value === 'sessions' ||
    value === 'extensions' ||
    value === 'skills' ||
    value === 'mcp' ||
    value === 'memory' ||
    value === 'plan' ||
    value === 'work' ||
    isModePromptCommandName(value) ||
    value === 'plugins' ||
    value === 'permissions' ||
    value === 'hooks' ||
    value === 'gateway' ||
    value === 'scenario' ||
    value === 'smoke' ||
    value === 'runs' ||
    value === 'tasks' ||
    value === 'schedules' ||
    value === 'context' ||
    value === 'ctx-viz' ||
    value === 'artifacts' ||
    value === 'brief' ||
    value === 'copy' ||
    value === 'export' ||
    value === 'share' ||
    value === 'summary' ||
    value === 'rename' ||
    value === 'tag' ||
    value === 'changes' ||
    value === 'checkpoints' ||
    value === 'profile' ||
    value === 'files' ||
    value === 'diff' ||
    value === 'branch' ||
    value === 'add-dir' ||
    value === 'commit' ||
    isRemoteBridgeCommandName(value) ||
    isReviewCliCommandName(value)
  );
}

function normalizeCommandAlias(value: string | undefined) {
  const modePromptCommand = normalizeModePromptCommandAlias(value);
  if (isModePromptCommandName(modePromptCommand)) return modePromptCommand;
  const remoteBridgeCommand = normalizeRemoteBridgeCommandAlias(value);
  if (remoteBridgeCommand) return remoteBridgeCommand;
  if (value === 'quit') return 'exit';
  if (value === 'session') return 'sessions';
  if (value === 'plugin') return 'plugins';
  if (value === 'skill') return 'skills';
  if (value === 'settings') return 'config';
  if (value === 'reload-plugins') return 'plugins';
  if (value === 'allowed-tools') return 'permissions';
  if (value === 'bashes') return 'tasks';
  if (value === 'sandbox-toggle') return 'sandbox';
  if (value === 'ctx_viz' || value === 'ctxviz' || value === 'context-viz') return 'ctx-viz';
  if (value === 'plugin-moved') return 'moved-to-plugin';
  return value;
}

function helpTopicAlias(value: string | undefined) {
  const modePromptCommand = normalizeModePromptCommandAlias(value);
  if (isModePromptCommandName(modePromptCommand)) return modePromptCommand;
  const remoteBridgeCommand = normalizeRemoteBridgeCommandAlias(value);
  if (remoteBridgeCommand) return remoteBridgeCommand;
  if (value === 'quit') return 'exit';
  if (value === 'session' || value === 'resume' || value === 'compact' || value === 'rewind') return 'sessions';
  if (value === 'plugin') return 'plugins';
  if (value === 'skill') return 'skills';
  if (value === 'settings') return 'config';
  if (value === 'allowed-tools') return 'permissions';
  if (value === 'bashes') return 'tasks';
  if (value === 'sandbox-toggle') return 'sandbox';
  if (value === 'ctx_viz' || value === 'ctxviz' || value === 'context-viz') return 'ctx-viz';
  if (value === 'plugin-moved') return 'moved-to-plugin';
  return value;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = normalizeArgv(argv);
  const positionals: string[] = [];
  const parsed: ParsedArgs = {
    json: false,
    print: false,
    help: false,
    trustWorkspace: false,
    savePlan: false,
    fromPlan: false,
    probe: false,
    acceptVerified: false,
    useInstalledProfile: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--provider') {
      parsed.provider = parseProviderName(readOptionValue(args, index, '--provider'));
      index += 1;
    } else if (arg === '--home') {
      parsed.xenesisHome = readOptionValue(args, index, '--home');
      index += 1;
    } else if (arg === '--profile') {
      parsed.profile = readOptionValue(args, index, '--profile');
      index += 1;
    } else if (arg === '--model') {
      parsed.model = readOptionValue(args, index, '--model');
      index += 1;
    } else if (arg === '--base-url') {
      parsed.baseURL = readOptionValue(args, index, '--base-url');
      index += 1;
    } else if (arg === '--api-key-env') {
      parsed.apiKeyEnv = readOptionValue(args, index, '--api-key-env');
      index += 1;
    } else if (arg === '--provider-retries') {
      parsed.providerRetries = parseNonNegativeInteger(
        readOptionValue(args, index, '--provider-retries'),
        '--provider-retries',
      );
      index += 1;
    } else if (arg === '--fallback-provider') {
      const provider = parseProviderName(readOptionValue(args, index, '--fallback-provider'));
      parsed.providerFallbacks = [...(parsed.providerFallbacks ?? []), { provider }];
      index += 1;
    } else if (arg === '--host') {
      parsed.gatewayHost = readOptionValue(args, index, '--host');
      index += 1;
    } else if (arg === '--port') {
      parsed.gatewayPort = parsePort(readOptionValue(args, index, '--port'));
      index += 1;
    } else if (arg === '--auth-token-env') {
      parsed.gatewayAuthTokenEnv = readOptionValue(args, index, '--auth-token-env');
      index += 1;
    } else if (arg === '--allow-origin') {
      parsed.gatewayAllowedOrigins = [
        ...(parsed.gatewayAllowedOrigins ?? []),
        readOptionValue(args, index, '--allow-origin'),
      ];
      index += 1;
    } else if (arg === '--max-body-bytes') {
      parsed.gatewayMaxBodyBytes = parsePositiveInteger(
        readOptionValue(args, index, '--max-body-bytes'),
        '--max-body-bytes',
      );
      index += 1;
    } else if (arg === '--max-runs') {
      parsed.gatewayMaxConcurrentRuns = parsePositiveInteger(readOptionValue(args, index, '--max-runs'), '--max-runs');
      index += 1;
    } else if (arg === '--request-timeout-ms') {
      parsed.gatewayRequestTimeoutMs = parsePositiveInteger(
        readOptionValue(args, index, '--request-timeout-ms'),
        '--request-timeout-ms',
      );
      index += 1;
    } else if (arg === '--observability-max-events') {
      parsed.gatewayObservabilityMaxEvents = parsePositiveInteger(
        readOptionValue(args, index, '--observability-max-events'),
        '--observability-max-events',
      );
      index += 1;
    } else if (arg === '--observability-max-age-days') {
      parsed.gatewayObservabilityMaxAgeDays = parsePositiveInteger(
        readOptionValue(args, index, '--observability-max-age-days'),
        '--observability-max-age-days',
      );
      index += 1;
    } else if (arg === '--config') {
      parsed.configPath = readOptionValue(args, index, '--config');
      index += 1;
    } else if (arg === '--cwd') {
      parsed.cwd = readOptionValue(args, index, '--cwd');
      index += 1;
    } else if (arg === '--max-turns') {
      parsed.maxTurns = parseMaxTurns(readOptionValue(args, index, '--max-turns'));
      index += 1;
    } else if (arg === '--events') {
      parsed.rewindEvents = parsePositiveInteger(readOptionValue(args, index, '--events'), '--events');
      index += 1;
    } else if (arg === '--auto') {
      parsed.approvalMode = 'auto';
    } else if (arg === '--trust-workspace') {
      parsed.trustWorkspace = true;
    } else if (arg === '--readonly') {
      parsed.approvalMode = 'readonly';
    } else if (arg === '--json') {
      parsed.json = true;
    } else if (arg === '--print') {
      parsed.print = true;
    } else if (arg === '--save-plan') {
      parsed.savePlan = true;
    } else if (arg === '--from-plan') {
      parsed.fromPlan = true;
    } else if (arg === '--probe') {
      parsed.probe = true;
    } else if (arg === '--accept') {
      parsed.acceptVerified = true;
    } else if (arg === '--use') {
      parsed.useInstalledProfile = true;
    } else if (arg === '--all') {
      parsed.pluginAll = true;
    } else if (arg === '--force') {
      parsed.forceInstall = true;
    } else if (arg === '--version') {
      parsed.command = 'version';
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option "${arg}". Run "xenesis --help" for usage.`);
    } else {
      positionals.push(arg);
    }
  }

  if (positionals[0] === 'help') {
    parsed.help = true;
    parsed.helpTopic = helpTopicAlias(positionals[1]);
    return parsed;
  }

  const commandName = normalizeCommandAlias(positionals[0]);

  if (parsed.help) {
    const helpTopic = helpTopicAlias(positionals[0]);
    const normalizedHelpCommand = normalizeCommandAlias(helpTopic);
    if (isKnownCommand(normalizedHelpCommand)) {
      parsed.command = normalizedHelpCommand;
    }
    parsed.helpTopic = helpTopic;
    return parsed;
  }

  if (positionals[0] === 'reload-plugins') {
    parsed.command = 'plugins';
    parsed.pluginCommand = 'reload';
  } else if (commandName === 'version') {
    parsed.command = 'version';
    if (positionals.length > 1) {
      throw new Error('Command "version" does not accept positional arguments.');
    }
  } else if (commandName === 'status') {
    parsed.command = 'status';
    if (positionals.length > 1) {
      throw new Error('Command "status" does not accept positional arguments.');
    }
  } else if (commandName === 'files') {
    parsed.command = 'files';
    const filesCommand = positionals[1];
    if (filesCommand === undefined) {
      parsed.filesCommand = 'list';
      parsed.filesPath = '.';
    } else if (filesCommand === 'list') {
      parsed.filesCommand = 'list';
      parsed.filesPath = positionals.slice(2).join(' ').trim() || '.';
    } else {
      parsed.filesCommand = 'list';
      parsed.filesPath = positionals.slice(1).join(' ').trim();
    }
  } else if (commandName === 'diff') {
    parsed.command = 'diff';
    if (positionals.length > 1) {
      throw new Error('Command "diff" does not accept positional arguments.');
    }
  } else if (commandName === 'branch') {
    parsed.command = 'branch';
    if (positionals.length > 1) {
      throw new Error('Command "branch" does not accept positional arguments.');
    }
  } else if (commandName === 'add-dir') {
    parsed.command = 'add-dir';
    const addDirPath = positionals.slice(1).join(' ').trim();
    if (!addDirPath) throw new Error('Command "add-dir" requires a path.');
    parsed.addDirPath = addDirPath;
  } else if (commandName === 'commit') {
    parsed.command = 'commit';
    parsed.commitMessage = positionals.slice(1).join(' ').trim();
  } else if (isRemoteBridgeCommandName(commandName)) {
    parsed.command = commandName;
    parsed.remoteBridgeArgs = positionals.slice(1);
  } else if (isReviewCliCommandName(commandName)) {
    parsed.command = commandName;
    parsed.prompt = positionals.slice(1).join(' ').trim();
  } else if (
    commandName === 'usage' ||
    commandName === 'cost' ||
    commandName === 'stats' ||
    commandName === 'logout' ||
    commandName === 'rate-limit-options'
  ) {
    parsed.command = commandName;
    if (positionals.length > 1) {
      throw new Error(`Command "${commandName}" does not accept positional arguments.`);
    }
  } else if (isMiscCompatibilityCommandName(commandName)) {
    parsed.command = commandName;
    parsed.miscCompatibilityArgs = positionals.slice(1);
  } else if (isDiagnosticCommandName(commandName)) {
    parsed.command = commandName;
    parsed.diagnosticArgs = positionals.slice(1);
  } else if (isPreferenceCommandName(commandName)) {
    parsed.command = commandName;
    parsed.preferenceArgs = positionals.slice(1);
  } else if (commandName === 'login') {
    parsed.command = 'login';
    const loginCommand = positionals[1];
    if (loginCommand !== undefined && loginCommand !== 'status') {
      throw new Error('Command "login" supports only the optional "status" subcommand.');
    }
    parsed.loginCommand = 'status';
  } else if (commandName === 'config') {
    parsed.command = 'config';
    const configCommand = positionals[1] ?? 'show';
    if (configCommand !== 'list' && configCommand !== 'show' && configCommand !== 'get' && configCommand !== 'schema') {
      throw new Error('Command "config" requires a subcommand: list, show, get, or schema.');
    }
    parsed.configCommand = configCommand;
    if (configCommand === 'schema') {
      if (positionals.length > 2) throw new Error('Command "config schema" does not accept positional arguments.');
    } else if (configCommand === 'get') {
      const configKey = positionals[2];
      if (!configKey) throw new Error('Command "config get" requires a config key.');
      parsed.configKey = configKey;
      if (positionals.length > 3) throw new Error('Command "config get" accepts exactly one config key.');
    } else if (positionals.length > 2) {
      throw new Error(`Command "config ${configCommand}" does not accept positional arguments.`);
    }
  } else if (commandName === 'model') {
    parsed.command = 'model';
    const modelCommand = positionals[1] ?? 'current';
    if (modelCommand === 'show' || modelCommand === 'current' || modelCommand === 'status' || modelCommand === 'info') {
      parsed.modelCommand = 'show';
      if (positionals.length > 2) {
        throw new Error(`Command "model ${modelCommand}" does not accept positional arguments.`);
      }
    } else if (modelCommand === 'list') {
      parsed.modelCommand = 'list';
      if (positionals.length > 2) {
        throw new Error('Command "model list" does not accept positional arguments.');
      }
    } else {
      parsed.modelCommand = 'set';
      parsed.modelValue = modelCommand;
      if (positionals.length > 2) {
        throw new Error('Command "model <modelName>" accepts exactly one model name.');
      }
    }
  } else if (commandName === 'env') {
    parsed.command = 'env';
    if (positionals.length > 1) {
      throw new Error('Command "env" does not accept positional arguments.');
    }
  } else if (commandName === 'effort') {
    parsed.command = 'effort';
    const effortCommand = positionals[1] ?? 'current';
    if (effortCommand === 'status' || effortCommand === 'current' || effortCommand === 'show') {
      parsed.effortCommand = 'show';
      if (positionals.length > 2)
        throw new Error(`Command "effort ${effortCommand}" does not accept positional arguments.`);
    } else if (effortCommand === 'set') {
      parsed.effortCommand = 'set';
      const effortLevel = positionals[2];
      if (!effortLevel) throw new Error('Command "effort set" requires an effort level.');
      parsed.effortLevel = effortLevel;
      if (positionals.length > 3) throw new Error('Command "effort set" accepts exactly one effort level.');
    } else if (isAcceptedEffortInput(effortCommand)) {
      parsed.effortCommand = 'set';
      parsed.effortLevel = effortCommand;
      if (positionals.length > 2) throw new Error('Command "effort <level>" accepts exactly one effort level.');
    } else {
      throw new Error('Command "effort" requires current, status, show, a level, or set <level>.');
    }
  } else if (commandName === 'doctor' || commandName === 'chat' || commandName === 'tui') {
    parsed.command = commandName;
    if (positionals.length > 1) parsed.prompt = positionals.slice(1).join(' ');
  } else if (commandName === 'init') {
    const initSubcommand = positionals[1];
    if (initSubcommand === 'claude' || initSubcommand === 'claude-md' || initSubcommand === 'instructions') {
      parsed.command = 'init';
      parsed.initSubcommand = 'claude';
      parsed.setupPolicyArgs = positionals.slice(2);
    } else if (initSubcommand === 'verifiers' || initSubcommand === 'verifier-skills') {
      parsed.command = 'init-verifiers';
      parsed.setupPolicyArgs = positionals.slice(2);
    } else {
      parsed.command = 'init';
      if (positionals.length > 1) parsed.prompt = positionals.slice(1).join(' ');
    }
  } else if (isSetupPolicyCommandName(commandName)) {
    parsed.command = commandName;
    parsed.setupPolicyArgs = positionals.slice(1);
  } else if (commandName === 'connect') {
    parsed.command = 'connect';
    const connectCommand = positionals[1];
    if (connectCommand !== 'check' && connectCommand !== 'latest' && connectCommand !== 'show') {
      throw new Error('Command "connect" requires a subcommand: check, latest, or show.');
    }
    parsed.connectCommand = connectCommand;
    if (connectCommand === 'show') {
      const target = positionals[2];
      if (!target) throw new Error('Command "connect show" requires a report id or path.');
      parsed.connectReportTarget = target;
    }
  } else if (commandName === 'profile') {
    parsed.command = 'profile';
    const profileCommand = positionals[1];
    if (
      profileCommand !== 'list' &&
      profileCommand !== 'show' &&
      profileCommand !== 'save' &&
      profileCommand !== 'use' &&
      profileCommand !== 'clear' &&
      profileCommand !== 'delete' &&
      profileCommand !== 'templates' &&
      profileCommand !== 'install'
    ) {
      throw new Error(
        'Command "profile" requires a subcommand: list, show, save, use, clear, delete, templates, or install.',
      );
    }
    parsed.profileCommand = profileCommand;
    if (
      profileCommand === 'show' ||
      profileCommand === 'save' ||
      profileCommand === 'use' ||
      profileCommand === 'delete'
    ) {
      const profileName = positionals[2];
      if (!profileName) throw new Error(`Command "profile ${profileCommand}" requires a profile name.`);
      parsed.profileName = profileName;
    }
    if (profileCommand === 'install') {
      const templateName = positionals[2];
      if (!templateName) throw new Error('Command "profile install" requires a template name.');
      parsed.profileTemplateName = templateName;
      parsed.profileName = positionals[3] ?? templateName;
    }
  } else if (commandName === 'plan' || commandName === 'work') {
    parsed.command = commandName;
    if (positionals.length > 1) parsed.prompt = positionals.slice(1).join(' ');
  } else if (isModePromptCommandName(commandName)) {
    parsed.command = commandName;
    parsed.modePromptArgs = positionals.slice(1);
  } else if (commandName === 'sessions') {
    parsed.command = 'sessions';
    const sessionCommand = positionals[1];
    if (
      sessionCommand !== 'list' &&
      sessionCommand !== 'show' &&
      sessionCommand !== 'compact' &&
      sessionCommand !== 'rewind' &&
      sessionCommand !== 'resume'
    ) {
      throw new Error(`Command "${positionals[0]}" requires a subcommand: list, show, compact, rewind, or resume.`);
    }
    parsed.sessionCommand = sessionCommand;
    if (
      sessionCommand === 'show' ||
      sessionCommand === 'compact' ||
      sessionCommand === 'rewind' ||
      sessionCommand === 'resume'
    ) {
      const sessionId = positionals[2];
      if (!sessionId) throw new Error(`Command "${positionals[0]} ${sessionCommand}" requires a session id.`);
      parsed.sessionId = sessionId;
    }
    if (sessionCommand === 'resume') {
      const prompt = positionals.slice(3).join(' ').trim();
      if (!prompt) throw new Error(`Command "${positionals[0]} resume" requires a prompt.`);
      parsed.prompt = prompt;
    }
  } else if (positionals[0] === 'resume') {
    parsed.command = 'sessions';
    parsed.sessionCommand = 'resume';
    const sessionId = positionals[1];
    if (!sessionId) throw new Error('Command "resume" requires a session id.');
    parsed.sessionId = sessionId;
    const prompt = positionals.slice(2).join(' ').trim();
    if (!prompt) throw new Error('Command "resume" requires a prompt.');
    parsed.prompt = prompt;
  } else if (positionals[0] === 'compact') {
    parsed.command = 'sessions';
    parsed.sessionCommand = 'compact';
    const sessionId = positionals[1];
    if (!sessionId) throw new Error('Command "compact" requires a session id.');
    parsed.sessionId = sessionId;
  } else if (positionals[0] === 'rewind') {
    parsed.command = 'sessions';
    parsed.sessionCommand = 'rewind';
    const sessionId = positionals[1];
    if (!sessionId) throw new Error('Command "rewind" requires a session id.');
    if (parsed.rewindEvents === undefined) throw new Error('Command "rewind" requires --events <count>.');
    parsed.sessionId = sessionId;
  } else if (commandName === 'extensions') {
    parsed.command = 'extensions';
    const extensionCommand = positionals[1];
    if (extensionCommand !== 'list' && extensionCommand !== 'doctor') {
      throw new Error('Command "extensions" requires a subcommand: list or doctor.');
    }
    parsed.extensionCommand = extensionCommand;
  } else if (commandName === 'skills') {
    parsed.command = 'skills';
    const skillCommand = positionals[1];
    if (skillCommand !== 'list' && skillCommand !== 'show') {
      throw new Error('Command "skills" requires a subcommand: list or show.');
    }
    parsed.skillCommand = skillCommand;
    if (skillCommand === 'show') {
      const skillName = positionals[2];
      if (!skillName) throw new Error('Command "skills show" requires a skill name.');
      parsed.skillName = skillName;
    }
  } else if (commandName === 'mcp') {
    parsed.command = 'mcp';
    const mcpCommand = positionals[1];
    if (mcpCommand !== 'list' && mcpCommand !== 'serve' && mcpCommand !== 'login') {
      throw new Error('Command "mcp" requires a subcommand: list, serve, or login.');
    }
    parsed.mcpCommand = mcpCommand;
    if (mcpCommand === 'login') {
      const mcpServerName = positionals[2];
      if (!mcpServerName) throw new Error('Command "mcp login" requires a server name.');
      parsed.mcpServerName = mcpServerName;
    }
  } else if (commandName === 'memory') {
    parsed.command = 'memory';
    const memoryCommand = positionals[1];
    if (memoryCommand !== 'add' && memoryCommand !== 'list' && memoryCommand !== 'search') {
      throw new Error('Command "memory" requires a subcommand: add, list, or search.');
    }
    parsed.memoryCommand = memoryCommand;
    if (memoryCommand === 'add') {
      const memoryId = positionals[2];
      if (!memoryId) throw new Error('Command "memory add" requires an id.');
      const memoryText = positionals.slice(3).join(' ').trim();
      if (!memoryText) throw new Error('Command "memory add" requires text.');
      parsed.memoryId = memoryId;
      parsed.memoryText = memoryText;
    }
    if (memoryCommand === 'search') {
      const memoryQuery = positionals.slice(2).join(' ').trim();
      if (!memoryQuery) throw new Error('Command "memory search" requires a query.');
      parsed.memoryQuery = memoryQuery;
    }
  } else if (commandName === 'context') {
    parsed.command = 'context';
    const contextCommand = positionals[1] ?? 'show';
    if (contextCommand !== 'index' && contextCommand !== 'show' && contextCommand !== 'search') {
      throw new Error('Command "context" requires a subcommand: index, show, or search.');
    }
    parsed.contextCommand = contextCommand;
    if (contextCommand === 'search') {
      const contextQuery = positionals.slice(2).join(' ').trim();
      if (!contextQuery) throw new Error('Command "context search" requires a query.');
      parsed.contextQuery = contextQuery;
    }
  } else if (commandName === 'artifacts') {
    parsed.command = 'artifacts';
    const artifactCommand = positionals[1];
    if (artifactCommand !== 'save' && artifactCommand !== 'list' && artifactCommand !== 'show') {
      throw new Error('Command "artifacts" requires a subcommand: save, list, or show.');
    }
    parsed.artifactCommand = artifactCommand;
    if (artifactCommand === 'show') {
      const artifactId = positionals[2];
      if (!artifactId) throw new Error('Command "artifacts show" requires an artifact id.');
      parsed.artifactId = artifactId;
    }
    if (artifactCommand === 'save') {
      const artifactTitle = positionals[2];
      if (!artifactTitle) throw new Error('Command "artifacts save" requires a title.');
      const artifactContent = positionals.slice(3).join(' ').trim();
      if (!artifactContent) throw new Error('Command "artifacts save" requires content.');
      parsed.artifactTitle = artifactTitle;
      parsed.artifactContent = artifactContent;
    }
  } else if (commandName === 'ctx-viz') {
    parsed.command = 'ctx-viz';
    parsed.ctxVizQuery = positionals.slice(1).join(' ').trim();
  } else if (commandName === 'brief') {
    parsed.command = 'brief';
    const action = positionals[1] ?? 'status';
    const normalizedAction = action === 'show' || action === 'current' ? 'status' : action;
    if (
      normalizedAction !== 'status' &&
      normalizedAction !== 'on' &&
      normalizedAction !== 'off' &&
      normalizedAction !== 'toggle'
    ) {
      throw new Error('Command "brief" requires status, on, off, or toggle.');
    }
    if (positionals.length > 2) throw new Error(`Command "brief ${action}" does not accept positional arguments.`);
    parsed.briefAction = normalizedAction;
  } else if (commandName === 'copy') {
    parsed.command = 'copy';
    const copyArgs = inferCopyArgs(positionals.slice(1));
    parsed.contentSessionId = copyArgs.sessionId;
    parsed.contentMessageNumber = copyArgs.messageNumber;
  } else if (commandName === 'export') {
    parsed.command = 'export';
    if (positionals.length > 3) throw new Error('Command "export" accepts at most a session id and filename.');
    parsed.contentSessionId = positionals[1];
    parsed.exportFilename = positionals[2];
  } else if (commandName === 'share') {
    parsed.command = 'share';
    if (positionals.length > 2) throw new Error('Command "share" accepts at most a session id.');
    parsed.contentSessionId = positionals[1];
  } else if (commandName === 'summary') {
    parsed.command = 'summary';
    if (positionals.length > 2) throw new Error('Command "summary" accepts at most a session id.');
    parsed.contentSessionId = positionals[1];
  } else if (commandName === 'rename') {
    parsed.command = 'rename';
    const sessionId = positionals[1];
    if (!sessionId) throw new Error('Command "rename" requires a session id.');
    parsed.contentSessionId = sessionId;
    parsed.contentName = positionals.slice(2).join(' ').trim();
  } else if (commandName === 'tag') {
    parsed.command = 'tag';
    const sessionId = positionals[1];
    if (!sessionId) throw new Error('Command "tag" requires a session id.');
    const tagName = positionals.slice(2).join(' ').trim();
    if (!tagName) throw new Error('Command "tag" requires a tag name.');
    parsed.contentSessionId = sessionId;
    parsed.tagName = tagName;
  } else if (commandName === 'changes') {
    parsed.command = 'changes';
    const changeCommand = positionals[1];
    if (
      changeCommand !== 'list' &&
      changeCommand !== 'show' &&
      changeCommand !== 'revert' &&
      changeCommand !== 'accept' &&
      changeCommand !== 'diff'
    ) {
      throw new Error('Command "changes" requires a subcommand: list, show, revert, accept, or diff.');
    }
    parsed.changeCommand = changeCommand;
    if (
      changeCommand === 'show' ||
      changeCommand === 'revert' ||
      changeCommand === 'accept' ||
      changeCommand === 'diff'
    ) {
      const changeId = positionals[2];
      if (!changeId) throw new Error(`Command "changes ${changeCommand}" requires a change id.`);
      parsed.changeId = changeId;
    }
  } else if (commandName === 'checkpoints') {
    parsed.command = 'checkpoints';
    const checkpointCommand = positionals[1];
    if (
      checkpointCommand !== 'list' &&
      checkpointCommand !== 'show' &&
      checkpointCommand !== 'revert' &&
      checkpointCommand !== 'accept' &&
      checkpointCommand !== 'diff'
    ) {
      throw new Error('Command "checkpoints" requires a subcommand: list, show, revert, accept, or diff.');
    }
    parsed.checkpointCommand = checkpointCommand;
    if (
      checkpointCommand === 'show' ||
      checkpointCommand === 'revert' ||
      checkpointCommand === 'accept' ||
      checkpointCommand === 'diff'
    ) {
      const checkpointId = positionals[2];
      if (!checkpointId) throw new Error(`Command "checkpoints ${checkpointCommand}" requires a checkpoint id.`);
      parsed.checkpointId = checkpointId;
    }
  } else if (commandName === 'plugins') {
    parsed.command = 'plugins';
    const rawPluginCommand = positionals[1];
    const pluginCommand = rawPluginCommand === 'remove' || rawPluginCommand === 'rm' ? 'uninstall' : rawPluginCommand;
    if (
      pluginCommand !== 'init' &&
      pluginCommand !== 'install' &&
      pluginCommand !== 'list' &&
      pluginCommand !== 'enable' &&
      pluginCommand !== 'disable' &&
      pluginCommand !== 'uninstall' &&
      pluginCommand !== 'update' &&
      pluginCommand !== 'reload' &&
      pluginCommand !== 'doctor'
    ) {
      throw new Error(
        'Command "plugins" requires a subcommand: init, install, list, enable, disable, uninstall, remove, rm, update, reload, or doctor.',
      );
    }
    parsed.pluginCommand = pluginCommand;
    if (
      pluginCommand === 'init' ||
      pluginCommand === 'install' ||
      pluginCommand === 'enable' ||
      (pluginCommand === 'disable' && !parsed.pluginAll) ||
      pluginCommand === 'uninstall' ||
      pluginCommand === 'update'
    ) {
      const pluginPath = positionals[2];
      if (!pluginPath) throw new Error(`Command "plugins ${pluginCommand}" requires a path.`);
      parsed.pluginPath = pluginPath;
    }
    if (pluginCommand === 'disable' && parsed.pluginAll && positionals[2]) {
      throw new Error('Command "plugins disable" accepts either a path or --all, not both.');
    }
  } else if (commandName === 'permissions') {
    parsed.command = 'permissions';
    const permissionCommand = positionals[0] === 'allowed-tools' ? (positionals[1] ?? 'list') : positionals[1];
    if (permissionCommand !== 'list' && permissionCommand !== 'audit') {
      throw new Error('Command "permissions" requires a subcommand: list or audit.');
    }
    parsed.permissionCommand = permissionCommand;
    if (permissionCommand === 'audit') {
      const sessionId = positionals[2];
      if (!sessionId) throw new Error('Command "permissions audit" requires a session id.');
      parsed.sessionId = sessionId;
    }
  } else if (commandName === 'hooks') {
    parsed.command = 'hooks';
    const hookCommand = positionals[1];
    if (hookCommand !== 'list') {
      throw new Error('Command "hooks" requires a subcommand: list.');
    }
    parsed.hookCommand = hookCommand;
  } else if (commandName === 'gateway') {
    parsed.command = 'gateway';
  } else if (commandName === 'scenario') {
    parsed.command = 'scenario';
    const scenarioCommand = positionals[1] ?? 'run';
    if (scenarioCommand !== 'run' && scenarioCommand !== 'latest' && scenarioCommand !== 'show') {
      throw new Error('Command "scenario" requires a subcommand: run, latest, or show.');
    }
    parsed.scenarioCommand = scenarioCommand;
    if (scenarioCommand === 'show') {
      const target = positionals[2];
      if (!target) throw new Error('Command "scenario show" requires a report id or path.');
      parsed.scenarioReportTarget = target;
    }
  } else if (commandName === 'smoke') {
    parsed.command = 'smoke';
    const smokeCommand = positionals[1] ?? 'run';
    if (smokeCommand !== 'run' && smokeCommand !== 'latest' && smokeCommand !== 'show') {
      throw new Error('Command "smoke" requires a subcommand: run, latest, or show.');
    }
    parsed.smokeCommand = smokeCommand;
    if (smokeCommand === 'show') {
      const target = positionals[2];
      if (!target) throw new Error('Command "smoke show" requires a report id or path.');
      parsed.smokeReportTarget = target;
    }
  } else if (commandName === 'runs') {
    parsed.command = 'runs';
    const runCommand = positionals[1];
    if (runCommand !== 'report' && runCommand !== 'verify' && runCommand !== 'repair') {
      throw new Error('Command "runs" requires a subcommand: report, verify, or repair.');
    }
    parsed.runCommand = runCommand;
    const sessionId = positionals[2];
    if (!sessionId) throw new Error(`Command "runs ${runCommand}" requires a session id.`);
    parsed.sessionId = sessionId;
  } else if (commandName === 'tasks') {
    parsed.command = 'tasks';
    const taskCommand = positionals[0] === 'bashes' ? (positionals[1] ?? 'list') : positionals[1];
    if (
      taskCommand !== 'start' &&
      taskCommand !== 'list' &&
      taskCommand !== 'show' &&
      taskCommand !== 'run' &&
      taskCommand !== 'cancel' &&
      taskCommand !== 'retry'
    ) {
      throw new Error('Command "tasks" requires a subcommand: start, list, show, run, cancel, or retry.');
    }
    parsed.taskCommand = taskCommand;
    if (taskCommand === 'start') {
      const prompt = positionals.slice(2).join(' ').trim();
      if (!prompt) throw new Error('Command "tasks start" requires a prompt.');
      parsed.prompt = prompt;
    }
    if (taskCommand === 'show' || taskCommand === 'run' || taskCommand === 'cancel' || taskCommand === 'retry') {
      const taskId = positionals[2];
      if (!taskId) throw new Error(`Command "tasks ${taskCommand}" requires a task id.`);
      parsed.taskId = taskId;
    }
  } else if (commandName === 'schedules') {
    parsed.command = 'schedules';
    const scheduleCommand = positionals[1];
    if (scheduleCommand !== 'list' && scheduleCommand !== 'add' && scheduleCommand !== 'remove') {
      throw new Error('Command "schedules" requires a subcommand: list, add, or remove.');
    }
    parsed.scheduleCommand = scheduleCommand;
    if (scheduleCommand === 'add') {
      const triggerSpec = positionals[2];
      if (!triggerSpec) throw new Error('Command "schedules add" requires a trigger.');
      parsed.scheduleTrigger = parseScheduleTriggerSpec(triggerSpec);
      const prompt = positionals.slice(3).join(' ').trim();
      if (!prompt) throw new Error('Command "schedules add" requires a prompt.');
      parsed.prompt = prompt;
    }
    if (scheduleCommand === 'remove') {
      const scheduleId = positionals[2];
      if (!scheduleId) throw new Error('Command "schedules remove" requires a schedule id.');
      parsed.scheduleId = scheduleId;
    }
  } else if (positionals.length > 0) {
    parsed.prompt = positionals.join(' ');
  }

  if (parsed.pluginAll && !(parsed.command === 'plugins' && parsed.pluginCommand === 'disable')) {
    throw new Error('Option "--all" is only supported with "plugins disable".');
  }
  if (parsed.forceInstall && parsed.command !== 'install') {
    throw new Error('Option "--force" is only supported with "install".');
  }

  return parsed;
}

function cliOverrides(parsed: ParsedArgs): CliConfigOverrides {
  const overrides: CliConfigOverrides = {};
  if (parsed.provider !== undefined) overrides.provider = parsed.provider;
  if (parsed.model !== undefined) overrides.model = parsed.model;
  if (parsed.xenesisHome !== undefined) overrides.xenesisHome = parsed.xenesisHome;
  if (parsed.profile !== undefined) overrides.profile = parsed.profile;
  if (parsed.trustWorkspace) overrides.trustWorkspace = true;
  if (parsed.baseURL !== undefined) overrides.baseURL = parsed.baseURL;
  if (parsed.apiKeyEnv !== undefined) overrides.apiKeyEnv = parsed.apiKeyEnv;
  if (parsed.providerRetries !== undefined) overrides.providerRetries = parsed.providerRetries;
  if (parsed.providerFallbacks !== undefined) overrides.providerFallbacks = parsed.providerFallbacks;
  if (parsed.maxTurns !== undefined) overrides.maxTurns = parsed.maxTurns;
  if (parsed.approvalMode !== undefined) overrides.approvalMode = parsed.approvalMode;
  else if (parsed.command === 'plan') overrides.approvalMode = 'readonly';
  return overrides;
}

interface PackageMetadata {
  name: string;
  version: string;
}

async function readPackageMetadata(): Promise<PackageMetadata> {
  const raw = await readFile(new URL('../../package.json', import.meta.url), 'utf8');
  const parsed = JSON.parse(raw) as Partial<PackageMetadata>;
  return {
    name: parsed.name ?? 'xenesis',
    version: parsed.version ?? '0.0.0',
  };
}

async function runVersionCommand(io: CliIo) {
  const metadata = await readPackageMetadata();
  emitStdout(io, `${metadata.name} ${metadata.version}`);
  return 0;
}

interface CliStatus {
  provider: ProviderName;
  model: string;
  approvalMode: ApprovalMode;
  workspace: string;
  xenesisHome: string;
  processModel?: 'persistent-process' | 'process-per-turn' | 'embedded';
}

function providerProcessModel(provider: string): CliStatus['processModel'] {
  const capabilities = capabilitiesFor(provider);
  if (capabilities?.transport === 'mcp-agent') return 'embedded';
  if (capabilities?.persistentSession === true) return 'persistent-process';
  if (
    capabilities?.persistentSession === false &&
    (capabilities.transport === 'cli-oneshot' || capabilities.transport === 'cli-interactive')
  ) {
    return 'process-per-turn';
  }
  if (provider === 'codex-app-server') return 'persistent-process';
  if (provider === 'codex-cli' || provider === 'claude-cli') return 'process-per-turn';
  return undefined;
}

async function readCliStatus(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv): Promise<CliStatus> {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  return {
    provider: config.provider,
    model: config.model,
    approvalMode: config.approvalMode,
    workspace: config.workspace,
    xenesisHome: config.xenesisHome,
    ...(providerProcessModel(config.provider) ? { processModel: providerProcessModel(config.provider) } : {}),
  };
}

async function runStatusCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const status = await readCliStatus(parsed, cwd, env);

  if (parsed.json) {
    emitStdout(io, JSON.stringify(status));
    return 0;
  }

  emitStdout(io, `status: provider=${status.provider}`);
  if (status.processModel) emitStdout(io, `status: processModel=${status.processModel}`);
  emitStdout(io, `status: model=${status.model}`);
  emitStdout(io, `status: approvalMode=${status.approvalMode}`);
  emitStdout(io, `status: workspace=${status.workspace}`);
  emitStdout(io, `status: xenesisHome=${status.xenesisHome}`);
  return 0;
}

type JsonLike = string | number | boolean | null | JsonLike[] | { [key: string]: JsonLike };

interface FlatConfigEntry {
  key: string;
  value: JsonLike;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSensitiveName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveName(name: string) {
  const normalized = normalizeSensitiveName(name);
  if (normalized.endsWith('env')) return false;
  return (
    normalized.includes('apikey') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('credential') ||
    normalized.includes('authorization') ||
    normalized.includes('bearer') ||
    normalized === 'token' ||
    normalized.endsWith('token')
  );
}

function shouldRedactConfigPath(path: string[]) {
  const last = path.at(-1);
  if (!last) return false;
  return isSensitiveName(last);
}

function redactConfigValue(value: unknown, path: string[] = []): JsonLike {
  if (shouldRedactConfigPath(path) && value !== undefined && value !== null) {
    return '<redacted>';
  }
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => redactConfigValue(entry, [...path, String(index)]));
  }
  if (isRecord(value)) {
    const output: Record<string, JsonLike> = {};
    for (const [key, child] of Object.entries(value)) {
      output[key] = redactConfigValue(child, [...path, key]);
    }
    return output;
  }
  return String(value);
}

function flattenConfig(value: JsonLike, prefix: string[] = []): FlatConfigEntry[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [{ key: prefix.join('.'), value }];
    }
    return value.flatMap((entry, index) => flattenConfig(entry, [...prefix, String(index)]));
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    if (entries.length === 0) {
      return [{ key: prefix.join('.'), value }];
    }
    return entries.flatMap(([key, child]) => flattenConfig(child as JsonLike, [...prefix, key]));
  }
  return [{ key: prefix.join('.'), value }];
}

function formatConfigValue(value: JsonLike) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
  return JSON.stringify(value);
}

function getConfigValue(config: JsonLike, key: string): JsonLike | undefined {
  const parts = key.split('.').filter((part) => part.length > 0);
  let current: JsonLike | undefined = config;
  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
      current = current[index];
    } else if (isRecord(current) && Object.hasOwn(current, part)) {
      current = current[part] as JsonLike;
    } else {
      return undefined;
    }
  }
  return current;
}

async function loadEffectiveConfig(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv): Promise<XenesisConfig> {
  return await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
}

const readEffectiveConfig = loadEffectiveConfig;

function emitLines(io: CliIo, lines: string[]) {
  for (const line of lines) emitStdout(io, line);
}

async function runWorkspaceGitCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadEffectiveConfig(parsed, cwd, env);

  let lines: string[];
  if (parsed.command === 'files') {
    lines = await renderFilesCommand(config.workspace, parsed.filesPath ?? '.');
  } else if (parsed.command === 'diff') {
    lines = await renderDiffCommand(config.workspace);
  } else if (parsed.command === 'branch') {
    lines = await renderBranchCommand(config.workspace);
  } else if (parsed.command === 'add-dir') {
    lines = await renderAddDirCommand(config.workspace, parsed.addDirPath ?? '');
  } else {
    throw new Error('Unsupported workspace/git command.');
  }

  for (const line of lines) emitStdout(io, line);
  return 0;
}

async function runCommitCommand(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const prompt = await buildCommitPrompt(config.workspace, parsed.commitMessage);
  if (!prompt) {
    emitStdout(io, 'commit: no git repository');
    return 0;
  }

  if (parsed.print) {
    emitStdout(io, prompt);
    return 0;
  }

  return await runPrompt(parsed, cwd, env, io, prompt, setSessionWriter, [], {
    allowedTools: ['shell'],
  });
}

function runRemoteBridgeCliCommand(parsed: ParsedArgs, cwd: string, io: CliIo) {
  if (!isRemoteBridgeCommandName(parsed.command)) {
    throw new Error('Unsupported remote/bridge/device command.');
  }
  const result = renderRemoteBridgeCommand({
    command: parsed.command,
    args: parsed.remoteBridgeArgs ?? [],
    json: parsed.json,
    cwd,
  });
  emitLines(io, result.stdout);
  for (const line of result.stderr) emitStderr(io, line);
  return result.exitCode;
}

async function runModePromptCliCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  if (!isModePromptCommandName(parsed.command)) {
    throw new Error('Unsupported mode/prompt command.');
  }
  const config = await loadEffectiveConfig(parsed, cwd, env);
  const result = renderModePromptCommand({
    command: parsed.command,
    args: parsed.modePromptArgs ?? [],
    config,
    env,
    json: parsed.json,
  });
  emitLines(io, result.stdout);
  for (const line of result.stderr) emitStderr(io, line);
  return result.exitCode;
}

async function runReviewCliCommand(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const config = await loadEffectiveConfig(parsed, cwd, env);
  const command = parsed.command;

  if (command === 'advisor') {
    emitLines(io, await renderAdvisorCommand(config, parsed.prompt));
    return 0;
  }

  if (command === 'agents') {
    emitLines(io, renderAgentsCommand(config, parsed.prompt));
    return 0;
  }

  if (!isReviewPromptCommandName(command)) {
    throw new Error('Unsupported review workflow command.');
  }

  const prompt = await buildReviewCommandPrompt(command, config.workspace, parsed.prompt);
  if (parsed.print) {
    emitStdout(io, prompt);
    return 0;
  }

  return await runPrompt(parsed, cwd, env, io, prompt, setSessionWriter, [], {
    allowedTools: allowedToolsForReviewCommand(command),
  });
}

async function runUsageCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  emitLines(io, await renderUsageCommand(await loadEffectiveConfig(parsed, cwd, env)));
  return 0;
}

async function runCostCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  emitLines(io, await renderCostCommand(await loadEffectiveConfig(parsed, cwd, env)));
  return 0;
}

async function runStatsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  emitLines(io, await renderStatsCommand(await loadEffectiveConfig(parsed, cwd, env)));
  return 0;
}

async function runLoginCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  emitLines(io, await renderLoginStatusCommand(await loadEffectiveConfig(parsed, cwd, env), env));
  return 0;
}

async function runLogoutCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  emitLines(io, await renderLogoutCommand(await loadEffectiveConfig(parsed, cwd, env)));
  return 0;
}

async function runRateLimitOptionsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  emitLines(io, renderRateLimitOptionsCommand(await loadEffectiveConfig(parsed, cwd, env)));
  return 0;
}

async function runDiagnosticCliCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  if (!isDiagnosticCommandName(parsed.command)) {
    throw new Error('Unsupported diagnostic command.');
  }
  emitLines(
    io,
    await renderDiagnosticCommand(
      await loadEffectiveConfig(parsed, cwd, env),
      parsed.command,
      parsed.diagnosticArgs ?? [],
      env,
    ),
  );
  return 0;
}

async function runMiscCompatibilityCliCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  if (!isMiscCompatibilityCommandName(parsed.command)) {
    throw new Error('Unsupported compatibility command.');
  }
  emitLines(
    io,
    await renderMiscCompatibilityCommand(
      await loadEffectiveConfig(parsed, cwd, env),
      parsed.command,
      parsed.miscCompatibilityArgs ?? [],
    ),
  );
  return 0;
}

async function runPreferenceCliCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  if (!isPreferenceCommandName(parsed.command)) {
    throw new Error('Unsupported preference command.');
  }
  const result = await runPreferenceCommand(await loadEffectiveConfig(parsed, cwd, env), {
    command: parsed.command,
    args: parsed.preferenceArgs ?? [],
    json: parsed.json,
  });
  emitLines(io, result.stdout);
  for (const line of result.stderr) emitStderr(io, line);
  return result.exitCode;
}

interface CliRuntimeState {
  model?: string | null;
  effort?: EffectiveEffortLevel | null;
  briefOnly?: boolean;
  updatedAt?: string;
}

function cliRuntimeStatePath(config: XenesisConfig) {
  return statePath(config, 'cli_state.json');
}

function normalizeCliRuntimeState(raw: unknown): CliRuntimeState {
  if (!isRecord(raw)) return {};
  const state: CliRuntimeState = {};
  if (typeof raw.model === 'string' && raw.model.trim().length > 0) {
    state.model = raw.model.trim();
  } else if (raw.model === null) {
    state.model = null;
  }
  if (typeof raw.effort === 'string') {
    const effort = raw.effort.trim().toLowerCase();
    if (effort === 'auto' || isEffortLevel(effort)) {
      state.effort = effort;
    }
  } else if (raw.effort === null) {
    state.effort = null;
  }
  if (typeof raw.briefOnly === 'boolean') {
    state.briefOnly = raw.briefOnly;
  }
  if (typeof raw.updatedAt === 'string') {
    state.updatedAt = raw.updatedAt;
  }
  return state;
}

async function readCliRuntimeState(config: XenesisConfig): Promise<CliRuntimeState> {
  try {
    return normalizeCliRuntimeState(JSON.parse(await readFile(cliRuntimeStatePath(config), 'utf8')));
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return {};
    throw error;
  }
}

async function writeCliRuntimeState(config: XenesisConfig, state: CliRuntimeState) {
  const path = cliRuntimeStatePath(config);
  const nextState: CliRuntimeState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
  return nextState;
}

async function runConfigCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const command = parsed.configCommand ?? 'show';

  // Short-circuit: schema does not require a valid local config.
  if (command === 'schema') {
    emitStdout(io, JSON.stringify(configJsonSchema(), null, 2));
    return 0;
  }

  const config = await readEffectiveConfig(parsed, cwd, env);
  const sanitized = redactConfigValue(config);

  if (command === 'get') {
    const key = parsed.configKey ?? '';
    const value = getConfigValue(sanitized, key);
    if (value === undefined) {
      emitStderr(io, `error: config key not found: ${key}`);
      return 1;
    }
    if (parsed.json) {
      emitStdout(io, JSON.stringify({ key, value }));
      return 0;
    }
    emitStdout(io, `config: ${key}=${formatConfigValue(value)}`);
    return 0;
  }

  if (parsed.json) {
    if (command === 'list') {
      const entries = flattenConfig(sanitized)
        .filter((entry) => entry.key.length > 0)
        .sort((left, right) => left.key.localeCompare(right.key));
      emitStdout(io, JSON.stringify({ entries }));
      return 0;
    }
    emitStdout(io, JSON.stringify(sanitized));
    return 0;
  }

  const entries = flattenConfig(sanitized)
    .filter((entry) => entry.key.length > 0)
    .sort((left, right) => left.key.localeCompare(right.key));
  for (const entry of entries) {
    emitStdout(io, `config: ${entry.key}=${formatConfigValue(entry.value)}`);
  }
  return 0;
}

interface LocalModelChoice {
  provider: ProviderName;
  model: string;
  source: 'state' | 'configured' | 'fallback';
}

interface ModelStatusPayload {
  current: {
    provider: ProviderName;
    model: string;
    source: 'state' | 'config';
  };
  base: {
    provider: ProviderName;
    model: string;
  };
  configured: LocalModelChoice[];
  remoteListing: false;
  remoteValidation: false;
  statePath: string;
}

function modelStatusPayload(config: XenesisConfig, state: CliRuntimeState): ModelStatusPayload {
  const stateModel = typeof state.model === 'string' && state.model.trim().length > 0 ? state.model.trim() : undefined;
  const current = {
    provider: config.provider,
    model: stateModel ?? config.model,
    source: stateModel ? ('state' as const) : ('config' as const),
  };
  const configured: LocalModelChoice[] = [];
  if (stateModel) {
    configured.push({
      provider: config.provider,
      model: stateModel,
      source: 'state',
    });
  }
  configured.push({
    provider: config.provider,
    model: config.model,
    source: 'configured',
  });
  configured.push(
    ...config.providerFallbacks.map((fallback) => ({
      provider: fallback.provider,
      model: fallback.model ?? config.model,
      source: 'fallback' as const,
    })),
  );
  return {
    current,
    base: {
      provider: config.provider,
      model: config.model,
    },
    configured,
    remoteListing: false,
    remoteValidation: false,
    statePath: cliRuntimeStatePath(config),
  };
}

async function runModelCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await readEffectiveConfig(parsed, cwd, env);
  let state = await readCliRuntimeState(config);

  if (parsed.modelCommand === 'set') {
    const requested = (parsed.modelValue ?? '').trim();
    if (!requested) {
      emitStderr(io, 'error: model name cannot be empty.');
      return 1;
    }
    state = await writeCliRuntimeState(config, {
      ...state,
      model: requested === 'default' ? null : requested,
    });
    const payload = modelStatusPayload(config, state);
    if (parsed.json) {
      emitStdout(
        io,
        JSON.stringify({
          action: 'set',
          requested,
          ...payload,
        }),
      );
      return 0;
    }
    emitStdout(io, `model: set=${requested}`);
    emitStdout(
      io,
      `model: current=${payload.current.model} provider=${payload.current.provider} source=${payload.current.source}`,
    );
    emitStdout(io, 'model: remoteValidation=false');
    return 0;
  }

  const payload = modelStatusPayload(config, state);

  if (parsed.json) {
    emitStdout(io, JSON.stringify(payload));
    return 0;
  }

  const rows = parsed.modelCommand === 'list' ? payload.configured : [payload.current];
  for (const choice of rows) {
    if ('source' in choice) {
      emitStdout(io, `model: provider=${choice.provider} model=${choice.model} source=${choice.source}`);
    }
  }
  if (parsed.modelCommand === 'list') {
    emitStdout(io, 'model: remoteListing=false');
    emitStdout(io, 'model: remoteValidation=false');
  } else {
    emitStdout(io, `model: base=${payload.base.model}`);
    emitStdout(io, 'model: remoteValidation=false');
  }
  return 0;
}

function isSensitiveEnvName(name: string) {
  const normalized = normalizeSensitiveName(name);
  if (normalized.endsWith('env')) return false;
  return isSensitiveName(name);
}

function renderEnvValue(name: string, value: string | undefined) {
  if (value === undefined || value.length === 0) return 'unset';
  return isSensitiveEnvName(name) ? '<redacted>' : value;
}

function envSummaryKeys(config: XenesisConfig, providerSettings: ReturnType<typeof resolveProviderSettings>) {
  const keys = new Set([
    'XENESIS_HOME',
    'XENESIS_PROFILE',
    'XENESIS_PROVIDER',
    'XENESIS_MODEL',
    'OPENAI_MODEL',
    'XENESIS_BASE_URL',
    'XENESIS_API_KEY_ENV',
    'XENESIS_PROVIDER_RETRIES',
    'XENESIS_FALLBACK_PROVIDERS',
    'XENESIS_APPROVAL_MODE',
    'XENESIS_MAX_TURNS',
    'XENESIS_EFFORT',
    'CLAUDE_CODE_EFFORT_LEVEL',
  ]);
  if (providerSettings.apiKeyEnv) keys.add(providerSettings.apiKeyEnv);
  for (const fallback of config.providerFallbacks) {
    if (fallback.apiKeyEnv) keys.add(fallback.apiKeyEnv);
  }
  return Array.from(keys).sort();
}

async function runEnvCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await readEffectiveConfig(parsed, cwd, env);
  const providerSettings = resolveProviderSettings(config, env);
  const environment = Object.fromEntries(
    envSummaryKeys(config, providerSettings).map((key) => [key, renderEnvValue(key, env[key])]),
  );
  const payload = {
    localOnly: true,
    node: process.version,
    platform: process.platform,
    cwd,
    configPath: parsed.configPath ? resolve(cwd, parsed.configPath) : resolve(cwd, 'xenesis.config.json'),
    workspace: config.workspace,
    xenesisHome: config.xenesisHome,
    provider: {
      name: config.provider,
      model: config.model,
      baseURL: providerSettings.baseURL,
      apiKeyEnv: providerSettings.apiKeyEnv,
      apiKeyPresent: providerSettings.apiKey !== undefined && providerSettings.apiKey.length > 0,
    },
    environment,
  };

  if (parsed.json) {
    emitStdout(io, JSON.stringify(payload));
    return 0;
  }

  emitStdout(io, `env: localOnly=${payload.localOnly}`);
  emitStdout(io, `env: node=${payload.node}`);
  emitStdout(io, `env: platform=${payload.platform}`);
  emitStdout(io, `env: cwd=${payload.cwd}`);
  emitStdout(io, `env: workspace=${payload.workspace}`);
  emitStdout(io, `env: xenesisHome=${payload.xenesisHome}`);
  emitStdout(io, `env: configPath=${payload.configPath}`);
  emitStdout(io, `env: provider=${payload.provider.name}`);
  emitStdout(io, `env: model=${payload.provider.model}`);
  emitStdout(io, `env: apiKeyEnv=${payload.provider.apiKeyEnv ?? 'none'}`);
  emitStdout(io, `env: apiKeyPresent=${payload.provider.apiKeyPresent}`);
  for (const [key, value] of Object.entries(environment)) {
    emitStdout(io, `env: ${key}=${value}`);
  }
  return 0;
}

const effortLevels = ['low', 'medium', 'high', 'max'] as const;
type EffortLevel = (typeof effortLevels)[number];
type EffectiveEffortLevel = EffortLevel | 'auto';

interface EffortStatus {
  effective: EffectiveEffortLevel;
  source: string;
  configured: EffectiveEffortLevel;
  configuredSource: 'state' | 'default';
  envOverride: boolean;
  setSupported: true;
  persistence: 'state';
  statePath: string;
  warning?: string;
}

function isEffortLevel(value: string): value is EffortLevel {
  return (effortLevels as readonly string[]).includes(value);
}

function isAcceptedEffortInput(value: string) {
  return value === 'auto' || isEffortLevel(value);
}

function readEffortEnvOverride(env: NodeJS.ProcessEnv): Pick<EffortStatus, 'effective' | 'source'> | undefined {
  const candidates = [
    ['XENESIS_EFFORT', env.XENESIS_EFFORT],
    ['CLAUDE_CODE_EFFORT_LEVEL', env.CLAUDE_CODE_EFFORT_LEVEL],
  ] as const;

  for (const [name, raw] of candidates) {
    if (raw === undefined) continue;
    const normalized = raw.trim().toLowerCase();
    if (normalized === 'auto' || normalized.length === 0) {
      return {
        effective: 'auto',
        source: `env:${name}`,
      };
    }
    if (isEffortLevel(normalized)) {
      return {
        effective: normalized,
        source: `env:${name}`,
      };
    }
    return {
      effective: 'auto',
      source: `invalid-env:${name}`,
    };
  }

  return undefined;
}

async function readEffortStatus(config: XenesisConfig, env: NodeJS.ProcessEnv): Promise<EffortStatus> {
  const state = await readCliRuntimeState(config);
  const configured =
    state.effort === 'auto' || isEffortLevel(String(state.effort)) ? (state.effort as EffectiveEffortLevel) : 'auto';
  const configuredSource =
    state.effort === 'auto' || isEffortLevel(String(state.effort)) ? ('state' as const) : ('default' as const);
  const envOverride = readEffortEnvOverride(env);
  const effective = envOverride?.effective ?? configured;
  const source = envOverride?.source ?? configuredSource;
  const warning =
    envOverride && configuredSource === 'state' && envOverride.effective !== configured
      ? `Environment override ${envOverride.source} is active; persisted effort ${configured} is not effective.`
      : undefined;

  return {
    effective,
    source,
    configured,
    configuredSource,
    envOverride: envOverride !== undefined,
    setSupported: true,
    persistence: 'state',
    statePath: cliRuntimeStatePath(config),
    ...(warning ? { warning } : {}),
  };
}

function emitEffortStatus(io: CliIo, status: EffortStatus) {
  emitStdout(io, `effort: effective=${status.effective}`);
  emitStdout(io, `effort: source=${status.source}`);
  emitStdout(io, `effort: configured=${status.configured}`);
  emitStdout(io, `effort: configuredSource=${status.configuredSource}`);
  emitStdout(io, `effort: envOverride=${status.envOverride}`);
  emitStdout(io, `effort: setSupported=${status.setSupported}`);
  emitStdout(io, `effort: persistence=${status.persistence}`);
  if (status.warning) emitStdout(io, `effort: warning=${status.warning}`);
}

async function runEffortCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await readEffectiveConfig(parsed, cwd, env);
  const command = parsed.effortCommand ?? 'show';
  if (command === 'set') {
    const requested = (parsed.effortLevel ?? '').trim().toLowerCase();
    if (!isAcceptedEffortInput(requested)) {
      emitStderr(
        io,
        `error: invalid effort level: ${parsed.effortLevel ?? ''}. Valid options are: low, medium, high, max, auto.`,
      );
      return 1;
    }
    const state = await readCliRuntimeState(config);
    await writeCliRuntimeState(config, {
      ...state,
      effort: requested as EffectiveEffortLevel,
    });
    const status = await readEffortStatus(config, env);
    if (parsed.json) {
      emitStdout(
        io,
        JSON.stringify({
          action: 'set',
          requested,
          ...status,
        }),
      );
      return 0;
    }
    emitStdout(io, `effort: set=${requested}`);
    emitEffortStatus(io, status);
    return 0;
  }

  const status = await readEffortStatus(config, env);
  if (parsed.json) {
    emitStdout(io, JSON.stringify(status));
    return 0;
  }
  emitEffortStatus(io, status);
  return 0;
}

function createFallbackProviders(config: XenesisConfig, env: NodeJS.ProcessEnv): AgentProvider[] {
  return config.providerFallbacks.map((fallback) =>
    createProvider(
      {
        ...config,
        provider: fallback.provider,
        model: fallback.model ?? config.model,
        baseURL: fallback.baseURL,
        apiKeyEnv: fallback.apiKeyEnv,
      },
      env,
    ),
  );
}

function selectTools(config: XenesisConfig, allTools: ToolRegistry): ToolRegistry {
  if (config.approvalMode !== 'readonly') {
    return allTools;
  }

  const visibleNames = filterToolsForApprovalMode(Array.from(allTools.keys()), config.approvalMode);
  return new Map(visibleNames.map((name) => [name, allTools.get(name)!]));
}

function statePath(config: XenesisConfig, ...parts: string[]) {
  return xenesisStatePath(config.xenesisHome, ...parts);
}

function configuredStatePath(config: XenesisConfig, path: string) {
  return resolveXenesisStatePath(config.xenesisHome, path);
}

function createPluginStateStore(config: XenesisConfig) {
  return new SqlitePluginStateStore({
    xenesisHome: config.xenesisHome,
    workspaceRoot: config.workspace,
  });
}

function uniquePaths(paths: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const path of paths) {
    const key = path.replace(/\\/g, '/');
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(path);
  }
  return result;
}

async function runtimePluginPaths(config: XenesisConfig) {
  return uniquePaths([...config.extensions.plugins.paths, ...(await createPluginStateStore(config).enabledPaths())]);
}

interface RuntimeToolsOptions {
  approvalHandler?: ApprovalHandler;
  mcpClientFactory?: RegisterMcpServerToolsOptions['clientFactory'];
}

export async function createCliRuntimeTools(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv,
  runtime: RuntimeToolsOptions = {},
) {
  const registry = await createRuntimeToolRegistry({
    baseTools: createBuiltInTools({ env, webConfig: config.web, shellConfig: config.shell }),
    workspaceRoot: config.workspace,
    pluginPaths: await runtimePluginPaths(config),
    pluginLoadPolicy: 'tolerant',
  });

  if (config.extensions.memory.enabled) {
    const memoryTool = createMemoryTool(createMemoryLedger(config), {
      writeContext: () => trustedMemoryWriteContext('cli-runtime', 'manual_note'),
    });
    if (registry.has(memoryTool.name)) throw new Error(`Tool "${memoryTool.name}" is already registered.`);
    registry.set(memoryTool.name, memoryTool);
  }

  if (config.browser.enabled) {
    const browserTool = createBrowserTool({
      headless: config.browser.headless,
      allowedHosts: config.browser.allowedHosts,
      idleTimeoutMs: config.browser.idleTimeoutMs,
    });
    if (registry.has(browserTool.name)) throw new Error(`Tool "${browserTool.name}" is already registered.`);
    registry.set(browserTool.name, browserTool);

    const appE2ECheckTool = createAppE2ECheckTool({
      headless: config.browser.headless,
      allowedHosts: config.browser.allowedHosts,
    });
    if (registry.has(appE2ECheckTool.name)) throw new Error(`Tool "${appE2ECheckTool.name}" is already registered.`);
    registry.set(appE2ECheckTool.name, appE2ECheckTool);
  }
  registry.set('tool_search', createToolSearchTool(registry));

  if (config.extensions.subagents.enabled) {
    const executors: Record<string, SubagentTaskExecutor> = {};
    for (const [name, definition] of Object.entries(config.extensions.subagents.definitions)) {
      const effectiveMode = clampApprovalMode(config.approvalMode, definition.approvalMode ?? 'readonly');
      const definitionTools = definition.tools
        ? Array.from(registry.values()).filter((tool) => definition.tools!.includes(tool.name))
        : Array.from(registry.values());
      const subagentTools = selectTools(
        { ...config, approvalMode: effectiveMode },
        new Map(definitionTools.map((tool) => [tool.name, tool])),
      );
      executors[name] = createAgentRunnerSubagentExecutor({
        provider: () => createProvider(config, env),
        model: config.model,
        workspaceRoot: config.workspace,
        cwd: config.workspace,
        approvalMode: effectiveMode,
        maxTurns: Math.max(1, Math.min(definition.maxTurns ?? 8, 24)),
        tools: subagentTools,
        blockedTools: config.permissions.blockedTools,
        approvalHandler: runtime.approvalHandler,
      });
    }
    const researcherMode = clampApprovalMode(
      config.approvalMode,
      config.extensions.subagents.definitions.researcher?.approvalMode ?? 'readonly',
    );
    const tool = createSubagentTaskTool(new SqliteSubagentTaskStore({ xenesisHome: config.xenesisHome }), executors, {
      maxConcurrent: config.extensions.subagents.maxConcurrent,
      backgroundDefaults: { approvalMode: researcherMode },
    });
    if (registry.has(tool.name)) throw new Error(`Tool "${tool.name}" is already registered.`);
    registry.set(tool.name, tool);
  }

  await registerMcpServerTools(registry, resolveRuntimeMcpServers(config, env), config.workspace, {
    authStore: new SqliteMcpAuthStore({ xenesisHome: config.xenesisHome }),
    clientFactory: runtime.mcpClientFactory,
  });

  registry.set('tool_search', createToolSearchTool(registry));
  return registry;
}

function createMemoryStore(config: XenesisConfig) {
  return new SqliteMemoryStore({
    xenesisHome: config.xenesisHome,
    memoryPath: configuredStatePath(config, config.extensions.memory.path),
  });
}

function createMemoryLedger(config: XenesisConfig) {
  return new MemoryLedger({
    memoryStore: createMemoryStore(config),
    ledgerStore: new SqliteMemoryLedgerStore({ xenesisHome: config.xenesisHome }),
    evidenceVault: { xenesisHome: config.xenesisHome },
  });
}

function createWorkspaceContextStore(config: XenesisConfig) {
  return new FileWorkspaceContextIndexStore({
    workspaceRoot: config.workspace,
    xenesisHome: config.xenesisHome,
  });
}

function createArtifactStore(config: XenesisConfig) {
  return new FileArtifactStore({
    xenesisHome: config.xenesisHome,
  });
}

function createWorkspaceChangeStore(config: XenesisConfig) {
  return new FileWorkspaceChangeStore({
    workspaceRoot: config.workspace,
    xenesisHome: config.xenesisHome,
  });
}

function createRunReportStore(config: XenesisConfig) {
  return new FileRunReportStore({
    xenesisHome: config.xenesisHome,
  });
}

function createApprovalHandler(parsed: ParsedArgs, config: XenesisConfig, io: CliIo): ApprovalHandler | undefined {
  if (io.approvalHandler) return io.approvalHandler;
  if (parsed.print || config.approvalMode !== 'safe') return undefined;

  return async (request) => {
    if (request.preview) {
      emitStdout(io, `Preview ${request.name}:`);
      for (const line of request.preview.split(/\r?\n/)) {
        emitStdout(io, `  ${line}`);
      }
    }
    emitStdout(
      io,
      `Approve ${request.name}: ${request.reason} risk=${request.riskLevel}; target=${request.summary} [y/N]`,
    );
    const answer = (await readLine(io.stdin ?? process.stdin)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  };
}

function emitRunEvent(parsed: ParsedArgs, io: CliIo, event: AgentRunEvent) {
  if (parsed.json) {
    emitStdout(io, JSON.stringify(event));
    return;
  }

  const rendered = renderEvent(event);
  if (rendered) emitStdout(io, rendered);
}

async function initConfig(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const configPath = resolve(cwd, parsed.configPath ?? 'xenesis.config.json');
  const xenesisHome = resolveXenesisHome(cwd, parsed.xenesisHome ?? env.XENESIS_HOME);
  try {
    await access(configPath);
    emitStderr(io, `error: Config file already exists: ${configPath}`);
    return 1;
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
  }

  const provider = env.XENESIS_PROVIDER ? parseProviderName(env.XENESIS_PROVIDER) : defaultConfig.provider;
  const config = {
    provider,
    model: env.XENESIS_MODEL ?? env.OPENAI_MODEL ?? defaultConfig.model,
    ...(env.XENESIS_BASE_URL ? { baseURL: env.XENESIS_BASE_URL } : {}),
    ...(env.XENESIS_API_KEY_ENV ? { apiKeyEnv: env.XENESIS_API_KEY_ENV } : {}),
    providerRetries: defaultConfig.providerRetries,
    providerFallbacks: defaultConfig.providerFallbacks,
    context: defaultConfig.context,
    verification: defaultConfig.verification,
    guard: defaultConfig.guard,
    workflow: defaultConfig.workflow,
    workflows: defaultConfig.workflows,
    worker: defaultConfig.worker,
    channels: defaultConfig.channels,
    browser: defaultConfig.browser,
    maxTurns: defaultConfig.maxTurns,
    workspace: '.',
    approvalMode: 'safe',
    extensions: defaultConfig.extensions,
    permissions: defaultConfig.permissions,
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  emitStdout(io, `created ${basename(configPath)}`);
  emitStdout(io, `provider: ${config.provider}`);
  emitStdout(io, `model: ${config.model}`);
  emitStdout(io, `workspace: ${config.workspace}`);
  emitStdout(io, `xenesisHome: ${xenesisHome}`);
  emitStdout(io, `workflow: ${config.workflow}`);
  emitStdout(io, `approvalMode: ${config.approvalMode}`);
  emitStdout(io, 'guard: enabled, default policy');
  emitStdout(io, 'extensions: memory disabled, subagents disabled, mcp 0, plugins 0, skills 0');
  return 0;
}

function renderExtensionDescriptor(descriptor: ExtensionDescriptor) {
  const status = descriptor.enabled ? 'enabled' : 'disabled';
  const role = descriptor.role ? ` [${descriptor.role}]` : '';
  const purpose = descriptor.purpose ? `; ${descriptor.purpose}` : '';
  return `${descriptor.kind}: ${descriptor.name} ${status}${role} - ${descriptor.summary}${purpose}`;
}

async function runExtensionsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  if (parsed.extensionCommand === 'doctor') {
    const diagnostics = await diagnosePluginRuntime({
      workspaceRoot: config.workspace,
      paths: await runtimePluginPaths(config),
    });

    if (diagnostics.length === 0) {
      emitStdout(io, 'plugins: none');
      return 0;
    }

    let exitCode = 0;
    for (const diagnostic of diagnostics) {
      emitStdout(io, renderPluginDiagnostic(diagnostic));
      if (!diagnostic.ok) exitCode = 1;
    }
    return exitCode;
  }

  const catalog = createExtensionCatalog(config);

  for (const descriptor of catalog.descriptors) {
    emitStdout(io, renderExtensionDescriptor(descriptor));
  }
  return 0;
}

function renderPluginDiagnostic(diagnostic: PluginRuntimeDiagnostic) {
  if (diagnostic.ok) {
    return `plugin: ${diagnostic.pluginName ?? diagnostic.path} ok (${diagnostic.toolCount ?? 0} tools)`;
  }
  return `plugin: ${diagnostic.path} error: ${diagnostic.message ?? 'unknown error'}`;
}

function renderPluginStateRecord(record: PluginStateRecord) {
  const status = record.enabled ? 'enabled' : 'disabled';
  return `${status} ${record.path}${record.name ? ` - ${record.name}` : ''}`;
}

async function runSkillsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const registry = await loadSkillRegistry(config.workspace, config.extensions.skills.paths);

  if (parsed.skillCommand === 'list') {
    const skills = registry.list();
    if (skills.length === 0) {
      emitStdout(io, 'no skills');
      return 0;
    }
    for (const skill of skills) {
      emitStdout(io, `${skill.name} - ${skill.description}`);
    }
    return 0;
  }

  const skill = registry.get(parsed.skillName ?? '');
  if (!skill) {
    emitStderr(io, `error: skill not found: ${parsed.skillName ?? ''}`);
    return 1;
  }

  emitStdout(io, `name: ${skill.name}`);
  emitStdout(io, `description: ${skill.description}`);
  emitStdout(io, `path: ${skill.path}`);
  if (skill.body) emitStdout(io, skill.body);
  return 0;
}

function renderMemoryRecord(record: { id: string; text: string }) {
  return `${record.id} - ${record.text}`;
}

async function runPluginsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  if (parsed.pluginCommand === 'init') {
    const pluginPath = parsed.pluginPath ?? '';
    const pluginDir = assertInsideWorkspace(config.workspace, pluginPath);
    const manifestPath = resolve(pluginDir, 'xenesis.plugin.json');
    try {
      await access(manifestPath);
      emitStderr(io, `error: plugin manifest already exists: ${manifestPath}`);
      return 1;
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
    }

    await mkdir(pluginDir, { recursive: true });
    await writeFile(
      manifestPath,
      `${JSON.stringify(
        {
          name: basename(pluginDir),
          version: '0.1.0',
          tools: [],
          workflows: [],
          mcpServers: {},
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    emitStdout(io, `plugin: created ${pluginPath.replace(/\\/g, '/')}/xenesis.plugin.json`);
    return 0;
  }

  const stateStore = createPluginStateStore(config);

  if (parsed.pluginCommand === 'install') {
    const record = await stateStore.install(parsed.pluginPath ?? '');
    emitStdout(io, `plugin: installed ${record.path}${record.name ? ` (${record.name})` : ''}`);
    return 0;
  }

  if (parsed.pluginCommand === 'enable') {
    const record = await stateStore.enable(parsed.pluginPath ?? '');
    emitStdout(io, `plugin: enabled ${record.path}`);
    return 0;
  }

  if (parsed.pluginCommand === 'disable') {
    if (parsed.pluginAll) {
      const enabledRecords = (await stateStore.list()).filter((record) => record.enabled);
      for (const record of enabledRecords) {
        await stateStore.disable(record.path);
      }
      emitStdout(io, `plugins: disabled ${enabledRecords.length}`);
      return 0;
    }
    const record = await stateStore.disable(parsed.pluginPath ?? '');
    emitStdout(io, `plugin: disabled ${record.path}`);
    return 0;
  }

  if (parsed.pluginCommand === 'uninstall') {
    const record = await stateStore.uninstall(parsed.pluginPath ?? '');
    emitStdout(io, `plugin: uninstalled ${record.path}`);
    return 0;
  }

  if (parsed.pluginCommand === 'update') {
    const record = await stateStore.update(parsed.pluginPath ?? '');
    emitStdout(io, `plugin: updated ${record.path}${record.name ? ` (${record.name})` : ''}`);
    return 0;
  }

  if (parsed.pluginCommand === 'doctor' || parsed.pluginCommand === 'reload') {
    const diagnostics = await diagnosePluginRuntime({
      workspaceRoot: config.workspace,
      paths: await runtimePluginPaths(config),
    });
    if (diagnostics.length === 0) {
      emitStdout(io, parsed.pluginCommand === 'reload' ? 'plugins: reloaded 0 enabled' : 'plugins: none');
      return 0;
    }
    let exitCode = 0;
    for (const diagnostic of diagnostics) {
      if (!diagnostic.ok) exitCode = 1;
    }
    if (parsed.pluginCommand === 'reload') {
      const okCount = diagnostics.filter((diagnostic) => diagnostic.ok).length;
      const errorCount = diagnostics.length - okCount;
      emitStdout(io, `plugins: reloaded ${okCount} enabled${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`);
      for (const diagnostic of diagnostics) {
        if (!diagnostic.ok) emitStdout(io, renderPluginDiagnostic(diagnostic));
      }
      return exitCode;
    }
    for (const diagnostic of diagnostics) emitStdout(io, renderPluginDiagnostic(diagnostic));
    return exitCode;
  }

  const stateRecords = await stateStore.list();
  if (stateRecords.length > 0) {
    const statePaths = new Set(stateRecords.map((record) => record.path));
    const configuredOnly: PluginStateRecord[] = config.extensions.plugins.paths
      .filter((path) => !statePaths.has(path.replace(/\\/g, '/')))
      .map((path) => ({
        path,
        enabled: true,
        installedAt: 'config',
        updatedAt: 'config',
      }));
    for (const record of [...stateRecords, ...configuredOnly].sort((left, right) =>
      left.path.localeCompare(right.path),
    )) {
      emitStdout(io, renderPluginStateRecord(record));
    }
    return 0;
  }

  if (config.extensions.plugins.paths.length === 0) {
    emitStdout(io, 'plugins: none');
    return 0;
  }
  for (const path of config.extensions.plugins.paths) emitStdout(io, path);
  return 0;
}

function renderMcpServerConfigLine(name: string, server: XenesisConfig['extensions']['mcpServers'][string]) {
  if (server.enabled === false) {
    if ('url' in server && (server.type === 'http' || server.type === 'sse')) {
      const transport = server.transport ?? server.type;
      return `mcp: ${name} [disabled] transport=${transport} url=${server.url}`;
    }
    if ('command' in server) {
      return `mcp: ${name} [disabled] command=${server.command}`;
    }
    return `mcp: ${name} [disabled] transport=unknown`;
  }
  if ('url' in server && (server.type === 'http' || server.type === 'sse')) {
    const transport = server.transport ?? server.type;
    const auth = server.auth ?? (server.oauth ? 'oauth' : 'none');
    return `mcp: ${name} transport=${transport} url=${server.url} auth=${auth}`;
  }
  if ('command' in server) {
    const args = server.args.length > 0 ? server.args.join(' ') : 'none';
    const envCount = Object.keys(server.env).length;
    return `mcp: ${name} command=${server.command} args=${args} env=${envCount}`;
  }
  return `mcp: ${name} transport=unknown`;
}

export async function runMcpLogin(options: {
  serverName: string;
  serverConfig: XenesisConfig['extensions']['mcpServers'][string];
  store: McpAuthStore;
  env: NodeJS.ProcessEnv;
  login: (options: RunMcpOAuthLoginOptions) => Promise<'authorized' | 'redirect'>;
  emit: (line: string) => void;
}): Promise<number> {
  if (
    !('url' in options.serverConfig) ||
    (options.serverConfig.type !== 'http' && options.serverConfig.type !== 'sse')
  ) {
    options.emit(`error: MCP server "${options.serverName}" has no URL configured.`);
    return 1;
  }
  const status = await options.login({
    serverName: options.serverName,
    serverConfig: options.serverConfig,
    store: options.store,
    env: options.env,
    onAuthorizationUrl: (url) => options.emit(`Open: ${url}`),
  });
  options.emit(`mcp login: ${options.serverName} ${status}`);
  return status === 'authorized' ? 0 : 1;
}

async function runMcpCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  if (parsed.mcpCommand === 'list') {
    const entries = Object.entries(resolveRuntimeMcpServers(config, env)).sort(([left], [right]) =>
      left.localeCompare(right),
    );
    if (entries.length === 0) {
      emitStdout(io, 'mcp: none');
      return 0;
    }
    for (const [name, server] of entries) {
      emitStdout(io, renderMcpServerConfigLine(name, server));
    }
    return 0;
  }

  if (parsed.mcpCommand === 'serve') {
    // Expose Xenesis' own tool registry as an stdio MCP server. stdout is reserved
    // for the MCP protocol, so the tool context emits/logs nowhere (no stdout writes).
    const tools = await createCliRuntimeTools(config, env);
    const baseContext: ToolContext = {
      workspaceRoot: config.workspace,
      xenesisHome: config.xenesisHome,
      cwd,
      env,
      sessionId: `mcp-serve-${Date.now()}`,
      todos: [],
      emit: () => undefined,
      logger: {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    };
    await startXenesisMcpServer({ tools, context: baseContext });
    // server.connect resolves once the transport is wired; keep the process alive
    // until stdin closes (the MCP client disconnects).
    await new Promise<void>((resolve) => {
      process.stdin.on('close', resolve);
      process.stdin.on('end', resolve);
    });
    return 0;
  }

  if (parsed.mcpCommand === 'login') {
    const serverName = parsed.mcpServerName!;
    const serverConfig = resolveRuntimeMcpServers(config, env)[serverName];
    if (!serverConfig) {
      emitStderr(io, `error: MCP server "${serverName}" not found in config.`);
      return 1;
    }
    return await runMcpLogin({
      serverName,
      serverConfig,
      store: new SqliteMcpAuthStore({ xenesisHome: config.xenesisHome }),
      env,
      login: io.mcpOAuthLogin ?? runMcpOAuthLogin,
      emit: (line) => emitStderr(io, line),
    });
  }

  emitStderr(io, 'error: Command "mcp" requires a subcommand: list, serve, or login.');
  return 1;
}

function compactInline(value: string | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function renderPermissionAuditLine(record: {
  toolCallId: string;
  name: string;
  status: string;
  riskLevel: string;
  hardDeny: boolean;
  summary: string;
  preview?: string;
}) {
  return [
    `${record.toolCallId} ${record.name} ${record.status} ${record.riskLevel} hardDeny=${record.hardDeny}`,
    `summary=${record.summary}`,
    `preview=${compactInline(record.preview)}`,
  ];
}

async function runPermissionsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  if (parsed.permissionCommand === 'audit') {
    const sessionId = validateSessionId(parsed.sessionId ?? '');
    const records = (await readSessionLog(config.xenesisHome, sessionId)).filter(
      (
        record,
      ): record is typeof record & {
        type: 'permission_audit';
        toolCallId: string;
        name: string;
        status: string;
        riskLevel: string;
        hardDeny: boolean;
        summary: string;
        preview?: string;
      } => record.type === 'permission_audit',
    );

    if (records.length === 0) {
      emitStdout(io, 'permissionAudit: none');
      return 0;
    }

    for (const record of records) {
      for (const line of renderPermissionAuditLine(record)) emitStdout(io, line);
    }
    return 0;
  }

  emitStdout(io, `approvalMode: ${config.approvalMode}`);
  emitStdout(io, `blockedTools: ${config.permissions.blockedTools.join(', ') || 'none'}`);
  const policyEntries = Object.entries(config.permissions.toolPolicies);
  emitStdout(
    io,
    `toolPolicies: ${
      policyEntries.length > 0
        ? policyEntries
            .map(([name, policy]) => `${name}=${policy.action}${policy.reason ? ` (${policy.reason})` : ''}`)
            .join(', ')
        : 'none'
    }`,
  );
  emitStdout(
    io,
    `pathRules: ${
      config.permissions.pathRules.length > 0
        ? config.permissions.pathRules
            .map((rule) => `${rule.action} ${rule.path}${rule.reason ? ` (${rule.reason})` : ''}`)
            .join(', ')
        : 'none'
    }`,
  );
  return 0;
}

function profileHomeFromInputs(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv) {
  return resolveXenesisHome(cwd, parsed.xenesisHome ?? env.XENESIS_HOME);
}

function renderProfileValue(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

async function runProfileCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const home = profileHomeFromInputs(parsed, cwd, env);
  const profiles = await readProfiles(home);

  if (parsed.profileCommand === 'templates') {
    for (const template of listOperatingProfileTemplates()) {
      emitStdout(io, `template: ${template.name} - ${template.summary}`);
    }
    return 0;
  }

  if (parsed.profileCommand === 'list') {
    const names = Object.keys(profiles.profiles).sort();
    if (names.length === 0) {
      emitStdout(io, 'profiles: none');
      return 0;
    }
    if (profiles.active) emitStdout(io, `active: ${profiles.active}`);
    for (const name of names) {
      emitStdout(io, `${profiles.active === name ? '*' : ' '} ${name}`.trimStart());
    }
    return 0;
  }

  if (parsed.profileCommand === 'show') {
    const name = parsed.profileName ?? '';
    const profile = profiles.profiles[name];
    if (!profile) {
      emitStderr(io, `error: profile not found: ${name}`);
      return 1;
    }
    emitStdout(io, `name: ${name}`);
    for (const key of [
      'provider',
      'model',
      'baseURL',
      'apiKeyEnv',
      'providerRetries',
      'providerFallbacks',
      'workflow',
      'workflows',
      'worker',
      'channels',
      'browser',
      'maxTurns',
      'approvalMode',
      'context',
      'verification',
      'extensions',
      'permissions',
    ] as const) {
      const rendered = renderProfileValue(profile[key]);
      if (rendered !== undefined) emitStdout(io, `${key}: ${rendered}`);
    }
    return 0;
  }

  if (parsed.profileCommand === 'install') {
    const templateName = parsed.profileTemplateName ?? '';
    const template = getOperatingProfileTemplate(templateName);
    if (!template) {
      emitStderr(io, `error: profile template not found: ${templateName}`);
      return 1;
    }
    const name = parsed.profileName ?? template.name;
    profiles.profiles[name] = template.profile;
    if (parsed.useInstalledProfile) profiles.active = name;
    await writeProfiles(home, profiles);
    emitStdout(io, `profile: installed ${name} from template ${template.name}`);
    if (parsed.useInstalledProfile) emitStdout(io, `profile: active ${name}`);
    return 0;
  }

  if (parsed.profileCommand === 'save') {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    const name = parsed.profileName ?? '';
    profiles.profiles[name] = pickProfileConfig(config);
    await writeProfiles(config.xenesisHome, profiles);
    emitStdout(io, `profile: saved ${name}`);
    return 0;
  }

  if (parsed.profileCommand === 'use') {
    const name = parsed.profileName ?? '';
    if (!profiles.profiles[name]) {
      emitStderr(io, `error: profile not found: ${name}`);
      return 1;
    }
    profiles.active = name;
    await writeProfiles(home, profiles);
    emitStdout(io, `profile: active ${name}`);
    return 0;
  }

  if (parsed.profileCommand === 'clear') {
    delete profiles.active;
    await writeProfiles(home, profiles);
    emitStdout(io, 'profile: active cleared');
    return 0;
  }

  if (parsed.profileCommand === 'delete') {
    const name = parsed.profileName ?? '';
    if (!profiles.profiles[name]) {
      emitStderr(io, `error: profile not found: ${name}`);
      return 1;
    }
    delete profiles.profiles[name];
    if (profiles.active === name) delete profiles.active;
    await writeProfiles(home, profiles);
    emitStdout(io, `profile: deleted ${name}`);
    return 0;
  }

  emitStderr(
    io,
    'error: Command "profile" requires a subcommand: list, show, save, use, clear, delete, templates, or install.',
  );
  return 1;
}

function runHooksCommand(parsed: ParsedArgs, io: CliIo) {
  if (parsed.hookCommand !== 'list') {
    emitStderr(io, 'error: Command "hooks" requires a subcommand: list.');
    return 1;
  }
  for (const name of availableHookNames) emitStdout(io, name);
  return 0;
}

function gatewayCliArgs(parsed: ParsedArgs) {
  const args: string[] = [];
  if (parsed.xenesisHome !== undefined) args.push('--home', parsed.xenesisHome);
  if (parsed.profile !== undefined) args.push('--profile', parsed.profile);
  if (parsed.provider !== undefined) args.push('--provider', parsed.provider);
  if (parsed.model !== undefined) args.push('--model', parsed.model);
  if (parsed.baseURL !== undefined) args.push('--base-url', parsed.baseURL);
  if (parsed.apiKeyEnv !== undefined) args.push('--api-key-env', parsed.apiKeyEnv);
  if (parsed.providerRetries !== undefined) args.push('--provider-retries', String(parsed.providerRetries));
  for (const fallback of parsed.providerFallbacks ?? []) {
    args.push('--fallback-provider', fallback.provider);
  }
  if (parsed.maxTurns !== undefined) args.push('--max-turns', String(parsed.maxTurns));
  if (parsed.approvalMode === 'auto') args.push('--auto');
  if (parsed.approvalMode === 'readonly') args.push('--readonly');
  return args;
}

export function resolveGatewayAuthToken(authTokenEnv: string | undefined, env: NodeJS.ProcessEnv): string | undefined {
  if (authTokenEnv) return env[authTokenEnv] || undefined;
  return env.XENESIS_GATEWAY_TOKEN || undefined;
}

async function runGatewayCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const gatewayEnv = {
    ...env,
    ...(parsed.xenesisHome !== undefined ? { XENESIS_HOME: parsed.xenesisHome } : {}),
    ...(parsed.profile !== undefined ? { XENESIS_PROFILE: parsed.profile } : {}),
  };
  const gateway = await startGateway({
    cwd,
    env: gatewayEnv,
    configPath: parsed.configPath,
    cli: cliOverrides(parsed),
    cliArgs: gatewayCliArgs(parsed),
    host: parsed.gatewayHost,
    port: parsed.gatewayPort,
    authToken: resolveGatewayAuthToken(parsed.gatewayAuthTokenEnv, env),
    allowedOrigins: parsed.gatewayAllowedOrigins,
    maxBodyBytes: parsed.gatewayMaxBodyBytes,
    maxConcurrentRuns: parsed.gatewayMaxConcurrentRuns,
    requestTimeoutMs: parsed.gatewayRequestTimeoutMs,
    observabilityMaxEvents: parsed.gatewayObservabilityMaxEvents,
    observabilityMaxAgeDays: parsed.gatewayObservabilityMaxAgeDays,
    runCli,
  });

  emitStdout(io, `gateway: listening ${gateway.url}`);
  emitStdout(io, `dashboard: ${gateway.url}/dashboard`);
  return await new Promise<number>((resolveGateway) => {
    gateway.server.once('close', () => resolveGateway(0));
  });
}

async function runConnectionCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  if (parsed.connectCommand === 'latest' || parsed.connectCommand === 'show') {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    const entry =
      parsed.connectCommand === 'latest'
        ? await readLatestConnectionReportEntry(config.xenesisHome)
        : await readConnectionReportEntry(config.xenesisHome, parsed.connectReportTarget ?? '');
    if (!entry) {
      emitStderr(
        io,
        parsed.connectCommand === 'latest'
          ? 'error: no connect reports found'
          : `error: connect report not found: ${parsed.connectReportTarget ?? ''}`,
      );
      return 1;
    }
    if (parsed.json) emitStdout(io, JSON.stringify({ reportPath: entry.path, report: entry.report }));
    else
      for (const line of renderConnectionReportDetails(
        entry,
        config.xenesisHome,
        parsed.connectCommand === 'latest' ? 'latest' : 'summary',
      ))
        emitStdout(io, line);
    return 0;
  }

  const result = await runConnectionCheck({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
    probe: parsed.probe,
  });
  if (parsed.json)
    emitStdout(
      io,
      JSON.stringify({
        reportPath: result.reportPath,
        report: result.report,
      }),
    );
  else for (const line of result.lines) emitStdout(io, line);
  return result.exitCode;
}

async function runSmokeCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  if (parsed.smokeCommand === 'latest' || parsed.smokeCommand === 'show') {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    const entry =
      parsed.smokeCommand === 'latest'
        ? await readLatestSmokeReportEntry(config.xenesisHome)
        : await readSmokeReportEntry(config.xenesisHome, parsed.smokeReportTarget ?? '');
    if (!entry) {
      emitStderr(
        io,
        parsed.smokeCommand === 'latest'
          ? 'error: no smoke reports found'
          : `error: smoke report not found: ${parsed.smokeReportTarget ?? ''}`,
      );
      return 1;
    }
    if (parsed.json) emitStdout(io, JSON.stringify({ reportPath: entry.path, report: entry.report }));
    else
      for (const line of renderSmokeReportDetails(
        entry,
        config.xenesisHome,
        parsed.smokeCommand === 'latest' ? 'latest' : 'summary',
      ))
        emitStdout(io, line);
    return 0;
  }

  const result = await runSmoke({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
    runCli,
  });
  if (parsed.json)
    emitStdout(
      io,
      JSON.stringify({
        reportPath: result.reportPath,
        report: result.report,
      }),
    );
  else for (const line of result.lines) emitStdout(io, line);
  return result.exitCode;
}

async function runScenarioCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  if (parsed.scenarioCommand === 'latest') {
    const entry = await readLatestScenarioReportEntry(config.xenesisHome);
    if (!entry) {
      emitStderr(io, 'error: no scenario reports found');
      return 1;
    }
    if (parsed.json) emitStdout(io, JSON.stringify({ reportPath: entry.path, report: entry.report }));
    else for (const line of renderScenarioReportDetails(entry, config.xenesisHome, 'latest')) emitStdout(io, line);
    return 0;
  }

  if (parsed.scenarioCommand === 'show') {
    const target = parsed.scenarioReportTarget ?? '';
    const entry = await readScenarioReportEntry(config.xenesisHome, target);
    if (!entry) {
      emitStderr(io, `error: scenario report not found: ${target}`);
      return 1;
    }
    if (parsed.json) emitStdout(io, JSON.stringify({ reportPath: entry.path, report: entry.report }));
    else for (const line of renderScenarioReportDetails(entry, config.xenesisHome, 'summary')) emitStdout(io, line);
    return 0;
  }

  const result = await runScenarioSuite({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
    runCli,
  });
  if (parsed.json)
    emitStdout(
      io,
      JSON.stringify({
        reportPath: result.reportPath,
        report: result.report,
      }),
    );
  else for (const line of result.lines) emitStdout(io, line);
  return result.exitCode;
}

async function runMemoryCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const ledger = createMemoryLedger(config);

  if (parsed.memoryCommand === 'add') {
    const result = await ledger.write(
      {
        id: parsed.memoryId ?? '',
        text: parsed.memoryText ?? '',
      },
      trustedMemoryWriteContext('cli-command', 'manual_note'),
    );
    emitStdout(
      io,
      result.status === 'accepted' && result.record
        ? `memory: saved ${result.record.id}`
        : `memory: proposed ${result.proposal?.id ?? '(unknown)'}`,
    );
    return 0;
  }

  const records =
    parsed.memoryCommand === 'search'
      ? await ledger.searchRecords({ query: parsed.memoryQuery ?? '', limit: 20 })
      : await ledger.listRecords();

  if (records.length === 0) {
    emitStdout(io, 'no memory');
    return 0;
  }

  for (const record of records) {
    emitStdout(io, renderMemoryRecord(record));
  }
  return 0;
}

async function runContextCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const store = createWorkspaceContextStore(config);

  if (parsed.contextCommand === 'index') {
    const index = await store.rebuild();
    emitStdout(io, `context: indexed ${index.fileCount} files`);
    return 0;
  }

  if (parsed.contextCommand === 'show') {
    const index = await store.read();
    if (!index) {
      emitStdout(io, 'context: no index');
      return 0;
    }
    emitStdout(io, `workspace: ${index.workspaceRoot}`);
    emitStdout(io, `indexedAt: ${index.indexedAt}`);
    emitStdout(io, `files: ${index.fileCount}`);
    emitStdout(io, `totalSize: ${index.totalSize}`);
    return 0;
  }

  const matches = await store.search(parsed.contextQuery ?? '');
  if (matches.length === 0) {
    emitStdout(io, 'no context matches');
    return 0;
  }
  for (const match of matches) {
    emitStdout(io, `${match.path} - ${match.size} bytes`);
  }
  return 0;
}

async function runArtifactsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const store = createArtifactStore(config);

  if (parsed.artifactCommand === 'save') {
    const record = await store.save({
      title: parsed.artifactTitle ?? '',
      content: parsed.artifactContent ?? '',
    });
    emitStdout(io, `artifact: saved ${record.id}`);
    return 0;
  }

  if (parsed.artifactCommand === 'show') {
    const artifact = await store.read(parsed.artifactId ?? '');
    if (!artifact) {
      emitStderr(io, `error: artifact not found: ${parsed.artifactId ?? ''}`);
      return 1;
    }
    emitStdout(io, `id: ${artifact.id}`);
    emitStdout(io, `title: ${artifact.title}`);
    emitStdout(io, `kind: ${artifact.kind}`);
    emitStdout(io, `createdAt: ${artifact.createdAt}`);
    emitStdout(io, artifact.content);
    return 0;
  }

  const records = await store.list();
  if (records.length === 0) {
    emitStdout(io, 'artifacts: none');
    return 0;
  }
  for (const record of records) {
    emitStdout(io, `${record.id} - ${record.title} (${record.kind}, ${record.bytes} bytes)`);
  }
  return 0;
}

async function runContentCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadEffectiveConfig(parsed, cwd, env);
  let lines: string[];

  if (parsed.command === 'brief') {
    lines = await renderBriefCommand(config, parsed.briefAction ?? 'status');
  } else if (parsed.command === 'copy') {
    lines = await renderCopyCommand(config, parsed.contentSessionId, parsed.contentMessageNumber ?? 1);
  } else if (parsed.command === 'export') {
    lines = await renderExportCommand(config, parsed.contentSessionId, parsed.exportFilename);
  } else if (parsed.command === 'share') {
    lines = await renderShareCommand(config, parsed.contentSessionId);
  } else if (parsed.command === 'summary') {
    lines = await renderSummaryCommand(config, parsed.contentSessionId);
  } else if (parsed.command === 'rename') {
    lines = await renderRenameCommand(config, parsed.contentSessionId ?? '', parsed.contentName);
  } else if (parsed.command === 'tag') {
    lines = await renderTagCommand(config, parsed.contentSessionId ?? '', parsed.tagName ?? '');
  } else if (parsed.command === 'ctx-viz') {
    lines = await renderCtxVizCommand(config, parsed.ctxVizQuery);
  } else {
    throw new Error('Unsupported content command.');
  }

  emitLines(io, lines);
  return 0;
}

function renderWorkspaceChangeLine(record: WorkspaceChangeRecord) {
  const state = record.revertedAt ? ' reverted' : record.acceptedAt ? ' accepted' : '';
  return `${record.id} ${record.action} ${record.path} ${record.toolName}${state}`;
}

function renderCheckpointLine(checkpoint: {
  id: string;
  changeCount: number;
  pendingChangeCount: number;
  acceptedChangeCount: number;
  lastChangeAt: string;
}) {
  return `${checkpoint.id} ${checkpoint.changeCount} changes pending=${checkpoint.pendingChangeCount} accepted=${checkpoint.acceptedChangeCount} ${checkpoint.lastChangeAt}`;
}

function emitWorkspaceChangeDetails(io: CliIo, record: WorkspaceChangeRecord) {
  emitStdout(io, `id: ${record.id}`);
  emitStdout(io, `action: ${record.action}`);
  emitStdout(io, `path: ${record.path}`);
  emitStdout(io, `toolName: ${record.toolName}`);
  emitStdout(io, `toolCallId: ${record.toolCallId}`);
  emitStdout(io, `sessionId: ${record.sessionId}`);
  emitStdout(io, `createdAt: ${record.createdAt}`);
  emitStdout(io, `beforeExists: ${record.beforeExists}`);
  emitStdout(io, `afterExists: ${record.afterExists}`);
  emitStdout(io, `beforeBytes: ${record.beforeBytes}`);
  emitStdout(io, `afterBytes: ${record.afterBytes}`);
  if (record.revertedAt) emitStdout(io, `revertedAt: ${record.revertedAt}`);
  if (record.acceptedAt) emitStdout(io, `acceptedAt: ${record.acceptedAt}`);
}

async function runChangesCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const store = createWorkspaceChangeStore(config);

  if (parsed.changeCommand === 'list') {
    const records = await store.list();
    if (records.length === 0) {
      emitStdout(io, 'changes: none');
      return 0;
    }
    for (const record of records) emitStdout(io, renderWorkspaceChangeLine(record));
    return 0;
  }

  const changeId = parsed.changeId ?? '';
  if (parsed.changeCommand === 'show') {
    const record = await store.get(changeId);
    if (!record) {
      emitStderr(io, `error: change not found: ${changeId}`);
      return 1;
    }
    emitWorkspaceChangeDetails(io, record);
    return 0;
  }

  if (parsed.changeCommand === 'revert') {
    const reverted = await store.revert(changeId);
    emitStdout(io, `change: reverted ${reverted.id}`);
    return 0;
  }

  if (parsed.changeCommand === 'accept') {
    const accepted = await store.accept(changeId);
    emitStdout(io, `change: accepted ${accepted.id}`);
    return 0;
  }

  if (parsed.changeCommand === 'diff') {
    emitStdout(io, await store.diff(changeId));
    return 0;
  }

  emitStderr(io, 'error: Command "changes" requires a subcommand: list, show, revert, accept, or diff.');
  return 1;
}

async function runCheckpointsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const store = createWorkspaceChangeStore(config);

  if (parsed.checkpointCommand === 'list') {
    const checkpoints = await store.listCheckpoints();
    if (checkpoints.length === 0) {
      emitStdout(io, 'checkpoints: none');
      return 0;
    }
    for (const checkpoint of checkpoints) emitStdout(io, renderCheckpointLine(checkpoint));
    return 0;
  }

  const checkpointId = parsed.checkpointId ?? '';
  if (parsed.checkpointCommand === 'show') {
    const checkpoint = await store.getCheckpoint(checkpointId);
    if (!checkpoint) {
      emitStderr(io, `error: checkpoint not found: ${checkpointId}`);
      return 1;
    }
    const changes = await store.checkpointChanges(checkpointId);
    emitStdout(io, `id: ${checkpoint.id}`);
    emitStdout(io, `changes: ${checkpoint.changeCount}`);
    emitStdout(io, `pendingChanges: ${checkpoint.pendingChangeCount}`);
    emitStdout(io, `acceptedChanges: ${checkpoint.acceptedChangeCount}`);
    emitStdout(io, `firstChangeAt: ${checkpoint.firstChangeAt}`);
    emitStdout(io, `lastChangeAt: ${checkpoint.lastChangeAt}`);
    emitStdout(io, `paths: ${checkpoint.paths.join(', ') || 'none'}`);
    for (const change of changes) emitStdout(io, `change: ${renderWorkspaceChangeLine(change)}`);
    return 0;
  }

  if (parsed.checkpointCommand === 'revert') {
    const reverted = await store.revertCheckpoint(checkpointId);
    emitStdout(io, `checkpoint: reverted ${checkpointId} (${reverted.length} changes)`);
    return 0;
  }

  if (parsed.checkpointCommand === 'accept') {
    const accepted = await store.acceptCheckpoint(checkpointId);
    emitStdout(io, `checkpoint: accepted ${checkpointId} (${accepted.length} changes)`);
    return 0;
  }

  if (parsed.checkpointCommand === 'diff') {
    emitStdout(io, await store.diffCheckpoint(checkpointId));
    return 0;
  }

  emitStderr(io, 'error: Command "checkpoints" requires a subcommand: list, show, revert, accept, or diff.');
  return 1;
}

interface BuildAndSaveRunReportOptions {
  verification?: VerificationReport;
  repairs?: RunReportRepairRecord[];
}

async function buildAndSaveRunReport(
  config: XenesisConfig,
  sessionId: string,
  options: BuildAndSaveRunReportOptions = {},
) {
  const changeStore = createWorkspaceChangeStore(config);
  const artifactStore = createArtifactStore(config);
  const reportStore = createRunReportStore(config);
  const existing = await reportStore.read(sessionId);
  const records = await readSessionLog(config.xenesisHome, sessionId);
  const [changes, artifacts, checkpoint] = await Promise.all([
    changeStore.checkpointChanges(sessionId),
    artifactStore.list().then((records) => records.filter((record) => record.sessionId === sessionId)),
    changeStore.getCheckpoint(sessionId),
  ]);
  return await reportStore.save(
    reportStore.build({
      sessionId,
      records,
      changes,
      artifacts,
      checkpoint,
      verification: options.verification ?? existing?.verification,
      repairs: options.repairs ?? existing?.repairs,
    }),
  );
}

function renderVerificationReport(verification: VerificationReport | undefined) {
  if (!verification) return ['verification: none'];
  const lines = [`verification: ${verification.status} ${verification.passed}/${verification.commandCount}`];
  for (const result of verification.results) {
    lines.push(`verify: ${result.command} exit=${result.exitCode ?? 'null'} ok=${result.ok}`);
    const stdout = result.stdout.trim();
    if (stdout) lines.push(...stdout.split(/\r?\n/).map((line) => `stdout: ${line}`));
    const stderr = result.stderr.trim();
    if (stderr) lines.push(...stderr.split(/\r?\n/).map((line) => `stderr: ${line}`));
  }
  return lines;
}

function renderRunReport(report: RunReport) {
  return [
    `session: ${report.sessionId}`,
    report.traceId ? `trace: ${report.traceId}` : undefined,
    `status: ${report.status}`,
    `turns: ${report.turns}`,
    `events: ${report.eventCount}`,
    `messages: ${report.messageCount}`,
    `toolCalls: ${report.toolCallCount}`,
    `tools: ${
      report.tools.length > 0
        ? report.tools.map((tool) => `${tool.name} x${tool.calls} failures=${tool.failures}`).join(', ')
        : 'none'
    }`,
    report.toolChoice
      ? `toolChoice: followed=${report.toolChoice.followedCount}/${report.toolChoice.total} missed=${report.toolChoice.missedCount} followRate=${report.toolChoice.followRate.toFixed(2)}`
      : undefined,
    `changes: ${report.changes.length}`,
    ...report.changes.map((change) => `change: ${change.action} ${change.path} ${change.toolName}`),
    `artifacts: ${report.artifacts.length}`,
    ...report.artifacts.map((artifact) => `artifact: ${artifact.title} (${artifact.kind})`),
    report.checkpoint
      ? `checkpoint: ${report.checkpoint.id} pending=${report.checkpoint.pendingChangeCount} accepted=${report.checkpoint.acceptedChangeCount}`
      : 'checkpoint: none',
    ...renderVerificationReport(report.verification),
    `selfReview: ${report.selfReview.status} score=${report.selfReview.score} findings=${report.selfReview.findings.length}`,
    ...report.selfReview.findings.map(
      (finding) =>
        `selfReviewFinding: ${finding.severity} ${finding.area} - ${finding.message} next=${finding.nextAction}`,
    ),
    report.selfReview.nextActions.length > 0
      ? `selfReviewNext: ${report.selfReview.nextActions.join(', ')}`
      : undefined,
    `repairs: ${report.repairs?.length ?? 0}`,
    ...(report.repairs ?? []).map((repair) =>
      [
        `repair: ${repair.sessionId}`,
        `status=${repair.status}`,
        repair.attempt !== undefined ? `attempt=${repair.attempt}` : undefined,
        repair.verificationStatus ? `verification=${repair.verificationStatus}` : undefined,
        repair.rollback ? `rollback=${repair.rollback.status}:${repair.rollback.changeCount}` : undefined,
        repair.acceptance ? `acceptance=${repair.acceptance.status}:${repair.acceptance.changeCount}` : undefined,
        `failedCommands=${repair.failedCommands.length}`,
      ]
        .filter(Boolean)
        .join(' '),
    ),
  ].filter((line): line is string => line !== undefined);
}

async function runVerificationForReport(config: XenesisConfig, sessionId: string, env: NodeJS.ProcessEnv) {
  const baseReport = await buildAndSaveRunReport(config, sessionId);
  const verification = await runVerificationCommands({
    commands: config.verification.commands,
    cwd: config.workspace,
    env,
    timeoutMs: config.verification.timeoutMs,
    maxOutputChars: config.verification.maxOutputChars,
  });
  return await createRunReportStore(config).save({
    ...baseReport,
    verification,
  });
}

async function acceptCheckpointAfterPassedVerification(
  config: XenesisConfig,
  sessionId: string,
  report: RunReport,
  io: CliIo,
) {
  if (report.verification?.status !== 'passed') {
    emitStdout(io, `accept: skipped verification=${report.verification?.status ?? 'none'}`);
    return report;
  }

  const changeStore = createWorkspaceChangeStore(config);
  const checkpoint = await changeStore.getCheckpoint(sessionId);
  if (!checkpoint || checkpoint.pendingChangeCount === 0) {
    emitStdout(io, 'accept: skipped 0');
    return await buildAndSaveRunReport(config, sessionId, {
      verification: report.verification,
      repairs: report.repairs,
    });
  }

  const accepted = await changeStore.acceptCheckpoint(sessionId);
  emitStdout(io, `accept: checkpoint ${sessionId} accepted ${accepted.length} changes`);
  return await buildAndSaveRunReport(config, sessionId, {
    verification: report.verification,
    repairs: report.repairs,
  });
}

function failedVerificationResults(report: RunReport) {
  return report.verification?.results.filter((result) => !result.ok) ?? [];
}

function truncateRepairContext(value: string, maxChars = 4000) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n[repair context truncated]`;
}

function buildRepairPrompt(report: RunReport) {
  const failedResults = failedVerificationResults(report);
  const commandBlocks = failedResults.map((result, index) =>
    [
      `Command ${index + 1}: ${result.command}`,
      `Exit code: ${result.exitCode ?? 'null'}`,
      result.stdout.trim() ? `Stdout:\n${truncateRepairContext(result.stdout.trim())}` : 'Stdout: <empty>',
      result.stderr.trim() ? `Stderr:\n${truncateRepairContext(result.stderr.trim())}` : 'Stderr: <empty>',
    ].join('\n'),
  );

  return [
    'Xenesis verification repair request',
    '',
    `Source session: ${report.sessionId}`,
    `Source status: ${report.status}`,
    `Verification createdAt: ${report.verification?.createdAt ?? 'unknown'}`,
    '',
    'Goal:',
    'Fix the workspace so the failed verification commands pass.',
    '',
    'Constraints:',
    '- Keep changes focused on the verification failure.',
    '- Prefer the smallest workspace change that addresses the failure.',
    '- Use available tools and the configured approval policy.',
    '',
    'Failed verification commands:',
    commandBlocks.join('\n\n'),
  ].join('\n');
}

function createRepairRecord(
  report: RunReport,
  repairSessionId: string,
  exitCode: number,
  attempt: number,
  verificationStatus: VerificationReport['status'] | undefined,
  rollback?: RunReportRepairRecord['rollback'],
  acceptance?: RunReportRepairRecord['acceptance'],
): RunReportRepairRecord {
  return {
    sessionId: repairSessionId,
    createdAt: new Date().toISOString(),
    status: exitCode === 0 ? 'completed' : 'failed',
    sourceVerificationCreatedAt: report.verification?.createdAt,
    failedCommands: failedVerificationResults(report).map((result) => result.command),
    attempt,
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(rollback ? { rollback } : {}),
    ...(acceptance ? { acceptance } : {}),
  };
}

async function acceptSuccessfulRepairAttempt(
  config: XenesisConfig,
  repairSessionId: string,
  io: CliIo,
): Promise<RunReportRepairRecord['acceptance']> {
  if (!repairSessionId || repairSessionId === 'unknown') {
    emitStdout(io, 'repair: accept skipped no-session');
    return { status: 'skipped', changeCount: 0, message: 'no repair session' };
  }

  const changeStore = createWorkspaceChangeStore(config);
  const checkpoint = await changeStore.getCheckpoint(repairSessionId);
  if (!checkpoint || checkpoint.pendingChangeCount === 0) {
    emitStdout(io, 'repair: accept skipped 0');
    return { status: 'skipped', changeCount: 0, message: 'no pending repair changes' };
  }

  try {
    const accepted = await changeStore.acceptCheckpoint(repairSessionId);
    await buildAndSaveRunReport(config, repairSessionId);
    emitStdout(io, `repair: accept accepted ${accepted.length}`);
    return { status: 'accepted', changeCount: accepted.length };
  } catch (error) {
    const message = errorMessage(error);
    emitStdout(io, `repair: accept failed ${message}`);
    return { status: 'failed', changeCount: 0, message };
  }
}

async function rollbackFailedRepairAttempt(
  config: XenesisConfig,
  repairSessionId: string,
  io: CliIo,
): Promise<RunReportRepairRecord['rollback']> {
  if (!config.verification.rollbackFailedRepairs) {
    emitStdout(io, 'repair: rollback skipped disabled');
    return { status: 'skipped', changeCount: 0, message: 'disabled' };
  }

  if (!repairSessionId || repairSessionId === 'unknown') {
    emitStdout(io, 'repair: rollback skipped no-session');
    return { status: 'skipped', changeCount: 0, message: 'no repair session' };
  }

  const changeStore = createWorkspaceChangeStore(config);
  const checkpoint = await changeStore.getCheckpoint(repairSessionId);
  if (!checkpoint || checkpoint.pendingChangeCount === 0) {
    emitStdout(io, 'repair: rollback skipped 0');
    return { status: 'skipped', changeCount: 0, message: 'no pending repair changes' };
  }

  try {
    const reverted = await changeStore.revertCheckpoint(repairSessionId);
    emitStdout(io, `repair: rollback reverted ${reverted.length}`);
    return { status: 'reverted', changeCount: reverted.length };
  } catch (error) {
    const message = errorMessage(error);
    emitStdout(io, `repair: rollback failed ${message}`);
    return { status: 'failed', changeCount: 0, message };
  }
}

async function runRunsCommand(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });

  if (parsed.runCommand === 'report') {
    const sessionId = validateSessionId(parsed.sessionId ?? '');
    const report =
      (await createRunReportStore(config).read(sessionId)) ?? (await buildAndSaveRunReport(config, sessionId));
    for (const line of renderRunReport(report)) emitStdout(io, line);
    return 0;
  }

  if (parsed.runCommand === 'verify') {
    const sessionId = validateSessionId(parsed.sessionId ?? '');
    let report = await runVerificationForReport(config, sessionId, env);
    for (const line of renderVerificationReport(report.verification)) emitStdout(io, line);
    if (parsed.acceptVerified || config.verification.acceptOnPass) {
      report = await acceptCheckpointAfterPassedVerification(config, sessionId, report, io);
    }
    return report.verification?.status === 'failed' ? 1 : 0;
  }

  if (parsed.runCommand === 'repair') {
    const sessionId = validateSessionId(parsed.sessionId ?? '');
    const reportStore = createRunReportStore(config);
    let report = (await reportStore.read(sessionId)) ?? (await buildAndSaveRunReport(config, sessionId));
    if (!report.verification || report.verification.status === 'skipped') {
      report = await runVerificationForReport(config, sessionId, env);
    }

    if (report.verification?.status !== 'failed') {
      emitStdout(io, `repair: skipped verification=${report.verification?.status ?? 'none'}`);
      return 0;
    }

    emitStdout(io, `repair: started ${sessionId}`);
    let currentReport = report;
    for (let attempt = 1; attempt <= config.verification.maxRepairAttempts; attempt += 1) {
      emitStdout(io, `repair: attempt ${attempt}/${config.verification.maxRepairAttempts}`);
      const prompt = buildRepairPrompt(currentReport);
      let repairSessionId = '';
      const exitCode = await runPrompt(
        {
          ...parsed,
          command: 'work',
          prompt,
          runCommand: undefined,
        },
        cwd,
        env,
        io,
        prompt,
        (writer, nextSessionId) => {
          repairSessionId = nextSessionId;
          setSessionWriter(writer, nextSessionId);
        },
        [],
        { abortSignal: io.abortSignal },
      );
      if (repairSessionId) emitStdout(io, `repair: session ${repairSessionId}`);

      const verifiedReport = await runVerificationForReport(config, sessionId, env);
      const verification = verifiedReport.verification;
      emitStdout(
        io,
        `repair: reverify ${verification?.status ?? 'none'} ${verification?.passed ?? 0}/${verification?.commandCount ?? 0}`,
      );
      const rollback =
        verification?.status === 'failed'
          ? await rollbackFailedRepairAttempt(config, repairSessionId || 'unknown', io)
          : undefined;
      const acceptance =
        verification?.status === 'passed' && exitCode === 0
          ? await acceptSuccessfulRepairAttempt(config, repairSessionId || 'unknown', io)
          : undefined;

      const latest = (await reportStore.read(sessionId)) ?? verifiedReport;
      currentReport = await reportStore.save({
        ...latest,
        repairs: [
          ...(latest.repairs ?? []),
          createRepairRecord(
            currentReport,
            repairSessionId || 'unknown',
            exitCode,
            attempt,
            verification?.status,
            rollback,
            acceptance,
          ),
        ],
      });

      if (exitCode !== 0) return exitCode;
      if (verification?.status === 'passed') return 0;
      if (verification?.status !== 'failed') return verification?.status === 'skipped' ? 0 : 1;
    }

    return 1;
  }

  emitStderr(io, 'error: Command "runs" requires a subcommand: report, verify, or repair.');
  return 1;
}

function sessionDir(config: XenesisConfig) {
  return statePath(config, 'sessions');
}

function agentTaskStore(config: XenesisConfig) {
  return new SqliteAgentTaskStore({ xenesisHome: config.xenesisHome });
}

function scheduleStore(config: XenesisConfig) {
  return new SqliteScheduleStore({ xenesisHome: config.xenesisHome });
}

function renderAgentTaskLine(task: AgentTask) {
  return `${task.id} ${task.status} ${task.prompt}`;
}

function renderScheduleLine(schedule: TaskSchedule) {
  const status = schedule.enabled ? 'on' : 'off';
  const trigger =
    schedule.trigger.type === 'interval'
      ? `interval ${schedule.trigger.every}`
      : schedule.trigger.type === 'daily'
        ? `daily ${schedule.trigger.at}`
        : `cron ${schedule.trigger.cron}${schedule.trigger.recurring === false ? ' one-shot' : ' recurring'}`;
  return `${schedule.id} ${status} ${trigger} ${schedule.prompt}`;
}

function emitAgentTaskDetails(io: CliIo, task: AgentTask) {
  emitStdout(io, `id: ${task.id}`);
  emitStdout(io, `status: ${task.status}`);
  emitStdout(io, `prompt: ${task.prompt}`);
  emitStdout(io, `sessionId: ${task.sessionId}`);
  if (task.artifactId) emitStdout(io, `artifactId: ${task.artifactId}`);
  emitStdout(io, `attempts: ${task.attempts ?? 0}`);
  emitStdout(io, `createdAt: ${task.createdAt}`);
  emitStdout(io, `updatedAt: ${task.updatedAt}`);
  if (task.startedAt) emitStdout(io, `startedAt: ${task.startedAt}`);
  if (task.finishedAt) emitStdout(io, `finishedAt: ${task.finishedAt}`);
  if (task.output) emitStdout(io, `output: ${task.output}`);
  if (task.error) emitStdout(io, `error: ${task.error}`);
}

function validateSessionId(sessionId: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(sessionId)) {
    throw new Error(`Invalid session id: ${sessionId}`);
  }
  return sessionId;
}

async function runSessionsCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const dir = sessionDir(config);

  if (parsed.sessionCommand === 'list') {
    let files;
    try {
      files = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        emitStdout(io, 'no sessions');
        return 0;
      }
      throw error;
    }

    const sessions = await Promise.all(
      files
        .filter((file) => file.isFile() && file.name.endsWith('.jsonl'))
        .map(async (file) => {
          const path = resolve(dir, file.name);
          return {
            id: file.name.slice(0, -'.jsonl'.length),
            mtimeMs: (await stat(path)).mtimeMs,
          };
        }),
    );

    if (sessions.length === 0) {
      emitStdout(io, 'no sessions');
      return 0;
    }

    for (const session of sessions.sort((left, right) => right.mtimeMs - left.mtimeMs)) {
      emitStdout(io, session.id);
    }
    return 0;
  }

  const sessionId = validateSessionId(parsed.sessionId ?? '');
  if (parsed.sessionCommand === 'compact') {
    emitStdout(io, compactSessionEvents(await readSessionLog(config.xenesisHome, sessionId)));
    return 0;
  }

  if (parsed.sessionCommand === 'rewind') {
    const records = rewindSessionEvents(
      await readSessionLog(config.xenesisHome, sessionId),
      parsed.rewindEvents ?? Number.MAX_SAFE_INTEGER,
    );
    for (const record of records) emitStdout(io, JSON.stringify(record));
    return 0;
  }

  const raw = await readFile(resolve(dir, `${sessionId}.jsonl`), 'utf8');
  for (const line of raw.trimEnd().split(/\r?\n/).filter(Boolean)) {
    emitStdout(io, line);
  }
  return 0;
}

async function runSessionResume(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const sessionId = validateSessionId(parsed.sessionId ?? '');
  // S7 — event-sourced resume: rehydrate the conversation + per-run state from
  // the existing JSONL session log and continue at the last turn boundary
  // (turns, recovery counters, usage, ...), rather than restarting from turn 0
  // with message-only history.
  return await resumePrompt(parsed, cwd, env, io, sessionId, setSessionWriter);
}

async function readChatPrompts(stdin: NodeJS.ReadableStream) {
  const prompts: string[] = [];
  const reader = createInterface({ input: stdin });
  const inputState = new ChatInputState();
  for await (const line of reader) {
    const result = inputState.accept(line);
    if (result.type === 'prompt') prompts.push(result.prompt);
  }
  return prompts;
}

function isTtyInput(stdin: NodeJS.ReadableStream) {
  return Boolean((stdin as NodeJS.ReadableStream & { isTTY?: boolean }).isTTY);
}

type ChatInputResult = { type: 'none' } | { type: 'prompt'; prompt: string } | { type: 'notice'; message: string };

class ChatInputState {
  private pasteLines: string[] | undefined;
  private continuationLines: string[] = [];

  hasPending() {
    return this.pasteLines !== undefined || this.continuationLines.length > 0;
  }

  cancel() {
    this.pasteLines = undefined;
    this.continuationLines = [];
  }

  accept(line: string): ChatInputResult {
    const trimmed = line.trim();

    if (this.pasteLines) {
      if (trimmed === '/send') {
        const prompt = this.pasteLines.join('\n').trim();
        this.pasteLines = undefined;
        return prompt ? { type: 'prompt', prompt } : { type: 'none' };
      }
      if (trimmed === '/cancel') {
        this.pasteLines = undefined;
        return { type: 'notice', message: 'chat: multiline canceled' };
      }
      this.pasteLines.push(line);
      return { type: 'none' };
    }

    if (trimmed === '/paste') {
      this.pasteLines = [];
      return { type: 'notice', message: 'chat: paste mode; end with /send or /cancel' };
    }

    const continued = /\\\s*$/.test(line);
    const text = continued ? line.replace(/\\\s*$/, '') : line;
    if (continued || this.continuationLines.length > 0) {
      this.continuationLines.push(text);
      if (continued) return { type: 'none' };
      const prompt = this.continuationLines.join('\n').trim();
      this.continuationLines = [];
      return prompt ? { type: 'prompt', prompt } : { type: 'none' };
    }

    const prompt = line.trim();
    return prompt ? { type: 'prompt', prompt } : { type: 'none' };
  }
}

function chatHistoryPath(config: XenesisConfig) {
  return statePath(config, 'chat_history');
}

async function loadChatHistory(config: XenesisConfig) {
  try {
    const raw = await readFile(chatHistoryPath(config), 'utf8');
    return raw.trimEnd().split(/\r?\n/).filter(Boolean).slice(-100);
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

async function appendChatHistory(config: XenesisConfig, line: string) {
  if (!line.trim()) return;
  const path = chatHistoryPath(config);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, `${line}\n`, 'utf8');
}

async function runPrompt(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  prompt: string,
  setSessionWriter: SessionWriterSetter,
  historyMessages: AgentMessage[] = [],
  options: RunPromptOptions = {},
) {
  const mode: AgentRunMode | undefined =
    parsed.command === 'plan' || parsed.command === 'work' ? parsed.command : undefined;
  try {
    const result = await runAgentPipeline({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
      prompt,
      mode,
      savePlan: parsed.command === 'plan' && parsed.savePlan,
      fromPlan: parsed.command === 'work' && parsed.fromPlan,
      historyMessages,
      sessionId: options.sessionId,
      traceId: options.traceId ?? io.traceId,
      ideContext: options.ideContext ?? io.ideContext,
      abortSignal: options.abortSignal ?? io.abortSignal,
      stream: !parsed.print && !parsed.json,
      disposeRunner: true,
      systemMessages: options.systemMessages,
      allowedTools: options.allowedTools,
      approvalHandlerFactory: (config) => options.approvalHandler ?? createApprovalHandler(parsed, config, io),
      onEvent: options.onEvent ?? ((event) => emitRunEvent(parsed, io, event)),
      onMessages: options.onMessages,
      onSessionWriter: setSessionWriter,
      onNotice: options.onNotice ?? ((line) => emitStdout(io, line)),
    });

    return result.exitCode;
  } finally {
    if (!options.preserveManagedServers) {
      await stopAllManagedServers();
    }
  }
}

/**
 * S7 — event-sourced resume entry for the CLI/TUI. Parallel to {@link runPrompt}
 * but delegates to {@link resumeAgentPipeline}, which rehydrates the conversation
 * + per-run state from the existing JSONL session log (turns, recovery counters,
 * usage, previousCompactSummary, ...) and continues at the last turn boundary —
 * instead of restarting from turn 0 over message-only history. The triggering
 * prompt is recovered from the log, so callers do not pass it here.
 */
async function resumePrompt(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  sessionId: string,
  setSessionWriter: SessionWriterSetter,
  options: RunPromptOptions = {},
) {
  try {
    const result = await resumeAgentPipeline({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
      sessionId,
      traceId: options.traceId ?? io.traceId,
      ideContext: options.ideContext ?? io.ideContext,
      abortSignal: options.abortSignal ?? io.abortSignal,
      stream: !parsed.print && !parsed.json,
      disposeRunner: true,
      systemMessages: options.systemMessages,
      allowedTools: options.allowedTools,
      approvalHandlerFactory: (config) => options.approvalHandler ?? createApprovalHandler(parsed, config, io),
      onEvent: options.onEvent ?? ((event) => emitRunEvent(parsed, io, event)),
      onMessages: options.onMessages,
      onSessionWriter: setSessionWriter,
      onNotice: options.onNotice ?? ((line) => emitStdout(io, line)),
    });

    return result.exitCode;
  } finally {
    if (!options.preserveManagedServers) {
      await stopAllManagedServers();
    }
  }
}

async function runTasksCommand(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const store = agentTaskStore(config);

  if (parsed.taskCommand === 'start') {
    const task = await store.create({ prompt: parsed.prompt ?? '' });
    emitStdout(io, `task: queued ${task.id}`);
    return 0;
  }

  if (parsed.taskCommand === 'list') {
    const tasks = await store.list();
    if (tasks.length === 0) {
      emitStdout(io, 'tasks: none');
      return 0;
    }
    for (const task of tasks.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))) {
      emitStdout(io, renderAgentTaskLine(task));
    }
    return 0;
  }

  const taskId = parsed.taskId ?? '';
  const task = await store.get(taskId);
  if (!task) {
    emitStderr(io, `error: task not found: ${taskId}`);
    return 1;
  }

  if (parsed.taskCommand === 'show') {
    emitAgentTaskDetails(io, task);
    return 0;
  }

  if (parsed.taskCommand === 'cancel') {
    const cancelled = await store.cancel(task.id);
    emitStdout(io, `task: cancelled ${cancelled.id}`);
    return 0;
  }

  if (parsed.taskCommand === 'retry') {
    const retried = await store.retry(task.id);
    emitStdout(io, `task: retried ${retried.id}`);
    return 0;
  }

  if (parsed.taskCommand === 'run') {
    emitStdout(io, `task: running ${task.id}`);
    try {
      const completed = await runAgentTask(store, task.id, async (runningTask) => {
        let output = '';
        const exitCode = await runPrompt(
          { ...parsed, prompt: runningTask.prompt },
          cwd,
          env,
          io,
          runningTask.prompt,
          setSessionWriter,
          [],
          {
            sessionId: runningTask.sessionId,
            onMessages: (messages) => {
              output =
                messages
                  .filter(
                    (message): message is Extract<AgentMessage, { role: 'assistant' }> => message.role === 'assistant',
                  )
                  .at(-1)?.content ?? '';
            },
          },
        );
        if (exitCode !== 0) throw new Error(`task prompt exited with code ${exitCode}`);
        const artifact = output.trim()
          ? await createArtifactStore(config).save({
              title: `Task ${runningTask.id} result`,
              kind: 'task-output',
              sessionId: runningTask.sessionId,
              content: output,
            })
          : undefined;
        return {
          output,
          sessionId: runningTask.sessionId,
          artifactId: artifact?.id,
        };
      });
      emitStdout(io, `task: completed ${completed.id}`);
      return 0;
    } catch (error) {
      emitStderr(io, `error: ${errorMessage(error)}`);
      return 1;
    }
  }

  emitStderr(io, 'error: Command "tasks" requires a subcommand: start, list, show, run, cancel, or retry.');
  return 1;
}

async function runSchedulesCommand(parsed: ParsedArgs, cwd: string, env: NodeJS.ProcessEnv, io: CliIo) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const store = scheduleStore(config);

  if (parsed.scheduleCommand === 'add') {
    const schedule = await store.create({
      prompt: parsed.prompt ?? '',
      trigger: parsed.scheduleTrigger!,
    });
    emitStdout(io, `schedule: added ${schedule.id}`);
    return 0;
  }

  if (parsed.scheduleCommand === 'list') {
    const schedules = await store.list();
    if (schedules.length === 0) {
      emitStdout(io, 'schedules: none');
      return 0;
    }
    for (const schedule of schedules.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))) {
      emitStdout(io, renderScheduleLine(schedule));
    }
    return 0;
  }

  if (parsed.scheduleCommand === 'remove') {
    await store.remove(parsed.scheduleId ?? '');
    emitStdout(io, `schedule: removed ${parsed.scheduleId ?? ''}`);
    return 0;
  }

  emitStderr(io, 'error: Command "schedules" requires a subcommand: list, add, or remove.');
  return 1;
}

function isApprovalMode(value: string): value is ApprovalMode {
  return value === 'safe' || value === 'auto' || value === 'readonly';
}

function slashError(io: CliIo, message: string) {
  emitStderr(io, `error: ${message}`);
  return 'continue' as const;
}

function skillSlashMetadataMessage(
  commandName: string,
  skill: { model?: string; effort?: string; allowedTools?: string[] },
) {
  const lines = ['Xenesis slash skill invocation:', `command: /${commandName}`];
  if (skill.model) lines.push(`model: ${skill.model}`);
  if (skill.effort) lines.push(`effort: ${skill.effort}`);
  if (skill.allowedTools && skill.allowedTools.length > 0) {
    lines.push(`allowedTools: ${skill.allowedTools.join(', ')}`);
  }
  return {
    role: 'system',
    content: lines.join('\n'),
  } satisfies Extract<AgentMessage, { role: 'system' }>;
}

async function runChatSlashCommand(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  line: string,
  setSessionWriter: SessionWriterSetter,
  getLastSessionId: () => string | undefined,
  clearChatContext: () => void = () => undefined,
) {
  const command = parseSlashCommandLine(line);
  if (!command) return 'not_slash' as const;

  if (command.name === 'help') {
    for (const helpLine of renderSlashCommandHelp()) emitStdout(io, helpLine);
    return 'continue' as const;
  }

  if (command.name === 'exit' || command.name === 'quit') {
    emitStdout(io, 'chat: exit');
    return 'exit' as const;
  }

  if (command.name === 'clear') {
    clearChatContext();
    emitStdout(io, 'chat: cleared');
    return 'continue' as const;
  }

  if (isPreferenceCommandName(command.name)) {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    const result = await runPreferenceCommand(config, {
      command: command.name,
      args: command.args,
      json: false,
    });
    emitLines(io, result.stdout);
    for (const line of result.stderr) emitStderr(io, line);
    return 'continue' as const;
  }

  if (command.name === 'status') {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    emitStdout(io, `status: provider=${config.provider}`);
    emitStdout(io, `status: model=${config.model}`);
    emitStdout(io, `status: approvalMode=${config.approvalMode}`);
    emitStdout(io, `status: workspace=${config.workspace}`);
    emitStdout(io, `status: session=${getLastSessionId() ?? 'none'}`);
    return 'continue' as const;
  }

  if (isMiscCompatibilityCommandName(command.name)) {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    emitLines(io, await renderMiscCompatibilityCommand(config, command.name, command.args));
    return 'continue' as const;
  }

  if (command.name === 'model') {
    const model = command.args[0];
    if (!model) return slashError(io, 'Command "/model" requires a model name.');
    parsed.model = model;
    emitStdout(io, `chat: model set to ${model}`);
    return 'continue' as const;
  }

  if (command.name === 'approval') {
    const approvalMode = command.args[0];
    if (!approvalMode || !isApprovalMode(approvalMode)) {
      return slashError(io, 'Command "/approval" requires safe, auto, or readonly.');
    }
    parsed.approvalMode = approvalMode;
    emitStdout(io, `chat: approvalMode set to ${approvalMode}`);
    return 'continue' as const;
  }

  if (command.name === 'tools') {
    const config = await loadConfig({
      cwd,
      configPath: parsed.configPath,
      env,
      cli: cliOverrides(parsed),
    });
    const tools = Array.from(selectTools(config, await createCliRuntimeTools(config, env)).keys()).sort();
    if (tools.length === 0) emitStdout(io, 'tools: none');
    else for (const tool of tools) emitStdout(io, `tool: ${tool}`);
    return 'continue' as const;
  }

  if (command.name === 'memory') {
    const [memoryCommand, ...rest] = command.args;
    if (memoryCommand !== 'add' && memoryCommand !== 'list' && memoryCommand !== 'search') {
      return slashError(io, 'Command "/memory" requires add, list, or search.');
    }

    const memoryParsed: ParsedArgs = {
      ...parsed,
      command: 'memory',
      memoryCommand,
    };
    if (memoryCommand === 'add') {
      const [memoryId, ...textParts] = rest;
      const memoryText = textParts.join(' ').trim();
      if (!memoryId || !memoryText) return slashError(io, 'Command "/memory add" requires an id and text.');
      memoryParsed.memoryId = memoryId;
      memoryParsed.memoryText = memoryText;
    }
    if (memoryCommand === 'search') {
      const memoryQuery = rest.join(' ').trim();
      if (!memoryQuery) return slashError(io, 'Command "/memory search" requires a query.');
      memoryParsed.memoryQuery = memoryQuery;
    }
    await runMemoryCommand(memoryParsed, cwd, env, io);
    return 'continue' as const;
  }

  if (command.name === 'skills') {
    const [skillCommand, skillName] = command.args;
    if (skillCommand !== 'list' && skillCommand !== 'show') {
      return slashError(io, 'Command "/skills" requires list or show.');
    }
    if (skillCommand === 'show' && !skillName) return slashError(io, 'Command "/skills show" requires a skill name.');
    await runSkillsCommand(
      {
        ...parsed,
        command: 'skills',
        skillCommand,
        skillName,
      },
      cwd,
      env,
      io,
    );
    return 'continue' as const;
  }

  if (command.name === 'plugins') {
    const [pluginCommand] = command.args;
    if (pluginCommand !== 'list') return slashError(io, 'Command "/plugins" currently supports list.');
    await runPluginsCommand(
      {
        ...parsed,
        command: 'plugins',
        pluginCommand,
      },
      cwd,
      env,
      io,
    );
    return 'continue' as const;
  }

  if (command.name === 'sessions') {
    const [sessionCommand] = command.args;
    if (sessionCommand !== 'list') return slashError(io, 'Command "/sessions" currently supports list.');
    await runSessionsCommand(
      {
        ...parsed,
        command: 'sessions',
        sessionCommand,
      },
      cwd,
      env,
      io,
    );
    return 'continue' as const;
  }

  if (command.name === 'compact') {
    const sessionId = command.args[0] ?? getLastSessionId();
    if (!sessionId) return slashError(io, 'Command "/compact" requires a prior or explicit session id.');
    await runSessionsCommand(
      {
        ...parsed,
        command: 'sessions',
        sessionCommand: 'compact',
        sessionId,
      },
      cwd,
      env,
      io,
    );
    return 'continue' as const;
  }

  if (command.name === 'plan' || command.name === 'work') {
    const prompt = command.rest.trim();
    if (!prompt) return slashError(io, `Command "/${command.name}" requires a prompt.`);
    await runPrompt(
      {
        ...parsed,
        command: command.name,
        prompt,
      },
      cwd,
      env,
      io,
      prompt,
      setSessionWriter,
    );
    return 'continue' as const;
  }

  if (command.name === 'resume') {
    const [sessionId, ...promptParts] = command.args;
    const prompt = promptParts.join(' ').trim();
    if (!sessionId || !prompt) return slashError(io, 'Command "/resume" requires a session id and prompt.');
    await runSessionResume(
      {
        ...parsed,
        command: 'sessions',
        sessionCommand: 'resume',
        sessionId,
        prompt,
      },
      cwd,
      env,
      io,
      setSessionWriter,
    );
    return 'continue' as const;
  }

  if (!looksLikeSlashCommandName(command.name)) return 'not_slash' as const;

  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  const skillRegistry = await loadSkillRegistry(config.workspace, config.extensions.skills.paths);
  const skill = skillRegistry.get(command.name);
  if (skill) {
    const prompt = command.rawArgs.trim();
    if (!prompt) return slashError(io, `Command "/${command.name}" requires a prompt.`);
    const skillSystemMessage = buildSkillSystemMessage([skill]);
    await runPrompt(
      {
        ...parsed,
        prompt,
        ...(skill.model ? { model: skill.model } : {}),
      },
      cwd,
      env,
      io,
      prompt,
      setSessionWriter,
      [],
      {
        systemMessages: [
          ...(skillSystemMessage ? [skillSystemMessage] : []),
          skillSlashMetadataMessage(command.name, skill),
        ],
        allowedTools: skill.allowedTools,
      },
    );
    emitStdout(io, `chat: skill ${command.name}`);
    return 'continue' as const;
  }

  const result = slashError(io, `Unknown slash command "/${command.name}". Run "/help" in chat.`);
  if (command.rawArgs.trim()) {
    emitStderr(io, `warning: Args from unknown skill: ${command.rawArgs.trim()}`);
  }
  return result;
}

function emitTuiFrame(io: CliIo, state: ReturnType<typeof createInitialTuiState>, interactive: boolean) {
  const lines = renderTuiFrameLines(state, { interactive });
  if (io.stdout) {
    for (const line of lines) emitStdout(io, line);
    return;
  }
  process.stdout.write(`${interactive ? '\x1b[2J\x1b[H' : ''}${lines.join('\n')}\n`);
}

async function runTuiCommand(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const config = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  let state = createInitialTuiState({
    provider: parsed.provider ?? config.provider,
    model: parsed.model ?? config.model,
    approvalMode: parsed.approvalMode ?? config.approvalMode,
    workspace: config.workspace,
  });
  let chatHistoryMessages: AgentMessage[] = [];
  let lastSessionId: string | undefined;
  const chatSessionId = `session-${Date.now()}`;
  state = setTuiSessionContext(state, {
    activeSessionId: chatSessionId,
    historyMessageCount: chatHistoryMessages.length,
  });
  const tuiCommandHelp =
    '/help /commands /status /provider <name> /workspace /tools /session /clear /reset /model <name> /approval <safe|auto|readonly> /memory <add|list|search> /skills <list|show> /plugins list /sessions list /compact [session-id] /output <up|down|top|bottom|expand|compact|clear|save> /plan <prompt> /work <prompt> /resume <session-id> <prompt> /exit /quit';

  if (parsed.print || !isTtyInput(io.stdin ?? process.stdin)) {
    emitTuiFrame(io, state, false);
    return 0;
  }

  const stdin = io.stdin ?? process.stdin;
  let activeRunController: AbortController | undefined;
  let pendingApprovalResolver: ((approved: boolean) => void) | undefined;
  const listeners = new Set<(next: typeof state) => void>();
  const publish = () => {
    for (const listener of listeners) listener(state);
  };
  const notify = (message: string, kind: 'info' | 'warning' | 'error' = 'info') => {
    state = appendTuiNotice(state, { kind, message });
    publish();
  };
  const setTuiSessionWriter: SessionWriterSetter = (writer, sessionId) => {
    lastSessionId = sessionId;
    setSessionWriter(writer, sessionId);
    state = setTuiSessionContext(
      setTuiSuggestionContext(state, {
        sessionIds: [sessionId, ...state.suggestionContext.sessionIds.filter((existing) => existing !== sessionId)],
      }),
      {
        lastSessionId: sessionId,
      },
    );
    publish();
  };
  const setCapturedCommandOutput = (command: string, stdout: string[], stderr: string[]) => {
    const lines = [...stdout, ...stderr];
    state = setTuiCommandOutput(state, {
      command,
      kind: stderr.length > 0 ? 'error' : 'info',
      lines: lines.length > 0 ? lines : ['(no output)'],
    });
    publish();
    if (stderr.length > 0) notify(`Command failed: ${command}`, 'error');
  };
  const refreshTuiSuggestionContext = async () => {
    let sessionIds: string[] = [];
    try {
      const files = await readdir(sessionDir(config), { withFileTypes: true });
      const sessions = await Promise.all(
        files
          .filter((file) => file.isFile() && file.name.endsWith('.jsonl'))
          .map(async (file) => {
            const path = resolve(sessionDir(config), file.name);
            return {
              id: file.name.slice(0, -'.jsonl'.length),
              mtimeMs: (await stat(path)).mtimeMs,
            };
          }),
      );
      sessionIds = sessions.sort((left, right) => right.mtimeMs - left.mtimeMs).map((session) => session.id);
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
    }
    if (lastSessionId) {
      sessionIds = [lastSessionId, ...sessionIds.filter((sessionId) => sessionId !== lastSessionId)];
    }
    state = setTuiSuggestionContext(state, { sessionIds });
    publish();
  };
  const resetVisibleState = () => {
    const currentSessionContext = state.sessionContext;
    state = createInitialTuiState({
      provider: parsed.provider ?? config.provider,
      model: parsed.model ?? config.model,
      approvalMode: parsed.approvalMode ?? config.approvalMode,
      workspace: config.workspace,
    });
    state = setTuiSessionContext(state, {
      activeSessionId: currentSessionContext.activeSessionId ?? chatSessionId,
      lastSessionId: currentSessionContext.lastSessionId,
      resumedFromSessionId: undefined,
      historyMessageCount: chatHistoryMessages.length,
    });
    publish();
  };
  const setRuntimeState = () => {
    state = {
      ...state,
      runtime: {
        provider: parsed.provider ?? config.provider,
        model: parsed.model ?? config.model,
        approvalMode: parsed.approvalMode ?? config.approvalMode,
        workspace: config.workspace,
      },
    };
    publish();
  };
  const resolvePendingApproval = (approved: boolean) => {
    const resolver = pendingApprovalResolver;
    if (!resolver) {
      notify('No approval request is pending.', 'warning');
      return;
    }
    pendingApprovalResolver = undefined;
    state = resolveTuiApproval(state, approved);
    publish();
    resolver(approved);
  };
  const tuiApprovalHandler: ApprovalHandler = (request) =>
    new Promise((resolve) => {
      pendingApprovalResolver = resolve;
      if (state.pendingApproval?.toolCallId !== request.toolCallId) {
        state = reduceTuiEvent(state, { type: 'permission_request', request });
        publish();
      }
    });
  const runTuiAgentPrompt = async (
    runParsed: ParsedArgs,
    visibleInput: string,
    prompt: string,
    historyMessages: AgentMessage[],
  ) => {
    await appendChatHistory(config, visibleInput);
    const controller = new AbortController();
    activeRunController = controller;
    state = reduceTuiInput(state, prompt);
    publish();
    try {
      const exitCode = await runPrompt(runParsed, cwd, env, io, prompt, setTuiSessionWriter, historyMessages, {
        sessionId: chatSessionId,
        onEvent: (event) => {
          state = reduceTuiEvent(state, event);
          publish();
        },
        onMessages: (messages) => {
          chatHistoryMessages = messages;
          state = setTuiSessionContext(state, {
            historyMessageCount: chatHistoryMessages.length,
          });
          publish();
        },
        onNotice: (notice) => notify(notice),
        approvalHandler: tuiApprovalHandler,
        abortSignal: controller.signal,
        preserveManagedServers: true,
      });
      if (exitCode !== 0) {
        notify(`Run exited with code ${exitCode}.`, 'error');
      }
    } finally {
      if (activeRunController === controller) activeRunController = undefined;
    }
  };
  // S7 — event-sourced resume for the TUI `/resume` path. Delegates to
  // `resumePrompt` -> `resumeAgentPipeline`, rehydrating the conversation +
  // per-run state from the existing session log and appending to the SAME log
  // (the resumed `sessionId`), instead of replaying message-only history into a
  // fresh turn-0 run.
  const runTuiAgentResume = async (runParsed: ParsedArgs, visibleInput: string, resumeSessionId: string) => {
    await appendChatHistory(config, visibleInput);
    const controller = new AbortController();
    activeRunController = controller;
    publish();
    try {
      const exitCode = await resumePrompt(runParsed, cwd, env, io, resumeSessionId, setTuiSessionWriter, {
        onEvent: (event) => {
          state = reduceTuiEvent(state, event);
          publish();
        },
        onMessages: (messages) => {
          chatHistoryMessages = messages;
          state = setTuiSessionContext(state, {
            historyMessageCount: chatHistoryMessages.length,
          });
          publish();
        },
        onNotice: (notice) => notify(notice),
        approvalHandler: tuiApprovalHandler,
        abortSignal: controller.signal,
        preserveManagedServers: true,
      });
      if (exitCode !== 0) {
        notify(`Run exited with code ${exitCode}.`, 'error');
      }
    } finally {
      if (activeRunController === controller) activeRunController = undefined;
    }
  };
  const capturedTuiSlashCommandNames = new Set(['memory', 'skills', 'plugins', 'sessions', 'compact']);
  const runCapturedTuiSlashCommand = async (input: string) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const capturedIo: CliIo = {
      ...io,
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line),
    };
    try {
      await runChatSlashCommand(
        parsed,
        cwd,
        env,
        capturedIo,
        input,
        setTuiSessionWriter,
        () => lastSessionId,
        () => {
          chatHistoryMessages = [];
          resetVisibleState();
        },
      );
    } catch (error) {
      stderr.push(`error: ${errorMessage(error)}`);
    }
    setCapturedCommandOutput(input, stdout, stderr);
  };
  const outputScrollStep = 4;
  const bottomOutputOffset = () => {
    if (!state.commandOutput) return 0;
    const visibleLimit = state.commandOutput.expanded ? 20 : 6;
    return Math.max(0, state.commandOutput.lines.length - visibleLimit);
  };
  const saveCommandOutput = async () => {
    if (!state.commandOutput) {
      notify('No command output to save.', 'warning');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = statePath(config, 'outputs', `xenesis-output-${timestamp}.txt`);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      [
        `command: ${state.commandOutput.command}`,
        `kind: ${state.commandOutput.kind}`,
        '',
        ...state.commandOutput.lines,
      ].join('\n'),
      'utf8',
    );
    state = setTuiCommandOutputSavedPath(state, outputPath);
    publish();
    notify(`Output saved: ${outputPath}`);
  };
  const handleOutputCommand = async (input: string) => {
    const command = parseSlashCommandLine(input);
    if (!command || command.name !== 'output') return false;
    const action = command.args[0];
    if (!state.commandOutput && action !== 'clear') {
      notify('No command output to control.', 'warning');
      return true;
    }
    if (!action) {
      notify('Use /output up, down, top, bottom, expand, compact, clear, or save.');
      return true;
    }
    if (action === 'up') {
      state = scrollTuiCommandOutput(state, -outputScrollStep);
      publish();
      return true;
    }
    if (action === 'down') {
      state = scrollTuiCommandOutput(state, outputScrollStep);
      publish();
      return true;
    }
    if (action === 'top') {
      state = setTuiCommandOutputOffset(state, 0);
      publish();
      return true;
    }
    if (action === 'bottom') {
      state = setTuiCommandOutputOffset(state, bottomOutputOffset());
      publish();
      return true;
    }
    if (action === 'expand') {
      state = setTuiCommandOutputExpanded(state, true);
      publish();
      return true;
    }
    if (action === 'compact') {
      state = setTuiCommandOutputExpanded(state, false);
      publish();
      return true;
    }
    if (action === 'clear') {
      state = clearTuiCommandOutput(state);
      publish();
      notify('Output cleared.');
      return true;
    }
    if (action === 'save') {
      await saveCommandOutput();
      return true;
    }
    notify('Command "/output" requires up, down, top, bottom, expand, compact, clear, or save.', 'error');
    return true;
  };
  const controller: InkTuiController = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    cancel() {
      if (pendingApprovalResolver) {
        resolvePendingApproval(false);
        return;
      }
      activeRunController?.abort();
      notify('Run cancellation requested.', 'warning');
    },
    resolveApproval(approved) {
      resolvePendingApproval(approved);
    },
    async submit(input: string) {
      if (input === '/help' || input === '/commands') {
        notify(tuiCommandHelp);
        return;
      }
      if (input === '/exit' || input === '/quit') {
        notify('Exit requested. The interactive renderer closes these commands immediately.');
        return;
      }
      if (input === '/status') {
        setRuntimeState();
        notify(
          `provider=${state.runtime.provider} model=${state.runtime.model} approval=${state.runtime.approvalMode} session=${state.sessionContext.activeSessionId ?? 'none'} latest=${state.sessionContext.lastSessionId ?? 'none'} resumedFrom=${state.sessionContext.resumedFromSessionId ?? 'none'} context=${state.sessionContext.historyMessageCount}`,
        );
        return;
      }
      if (input === '/provider') {
        setRuntimeState();
        notify(`provider=${state.runtime.provider}`);
        return;
      }
      if (input.startsWith('/provider ')) {
        const provider = input.slice('/provider '.length).trim();
        if (!(providerNames as readonly string[]).includes(provider)) {
          notify(`Command "/provider" requires one of ${providerNames.join(', ')}.`, 'error');
          return;
        }
        parsed.provider = provider as ProviderName;
        setRuntimeState();
        notify(`Provider set to ${provider}.`);
        return;
      }
      if (input === '/workspace') {
        setRuntimeState();
        notify(`workspace=${state.runtime.workspace}`);
        return;
      }
      if (input === '/tools') {
        const runtimeConfig = await loadConfig({
          cwd,
          configPath: parsed.configPath,
          env,
          cli: cliOverrides(parsed),
        });
        const tools = Array.from(
          selectTools(runtimeConfig, await createCliRuntimeTools(runtimeConfig, env)).keys(),
        ).sort();
        notify(tools.length === 0 ? 'tools: none' : `tools: ${tools.join(', ')}`);
        return;
      }
      if (input === '/session') {
        notify(
          `session=${state.sessionContext.activeSessionId ?? chatSessionId} latest=${state.sessionContext.lastSessionId ?? 'none'} resumedFrom=${state.sessionContext.resumedFromSessionId ?? 'none'} status=${state.status} turns=${state.turns} context=${state.sessionContext.historyMessageCount}`,
        );
        return;
      }
      if (input === '/clear' || input === '/reset') {
        chatHistoryMessages = [];
        resetVisibleState();
        notify('Visible transcript and conversation context cleared.');
        return;
      }
      if (input.startsWith('/model ')) {
        parsed.model = input.slice('/model '.length).trim();
        setRuntimeState();
        notify(`Model set to ${parsed.model}.`);
        return;
      }
      if (input.startsWith('/approval ')) {
        const approvalMode = input.slice('/approval '.length).trim();
        if (!isApprovalMode(approvalMode)) {
          notify('Command "/approval" requires safe, auto, or readonly.', 'error');
          return;
        }
        parsed.approvalMode = approvalMode;
        setRuntimeState();
        notify(`Approval mode set to ${approvalMode}.`);
        return;
      }

      const command = parseSlashCommandLine(input);
      if (command && command.name === 'output' && (await handleOutputCommand(input))) {
        return;
      }
      if (command && capturedTuiSlashCommandNames.has(command.name)) {
        await appendChatHistory(config, input);
        await runCapturedTuiSlashCommand(input);
        return;
      }
      if (command?.name === 'plan' || command?.name === 'work') {
        const prompt = command.rest.trim();
        if (!prompt) {
          notify(`Command "/${command.name}" requires a prompt.`, 'error');
          return;
        }
        const mode = command.name === 'plan' ? 'plan' : 'work';
        await runTuiAgentPrompt(
          {
            ...parsed,
            command: mode,
            prompt,
          },
          input,
          prompt,
          chatHistoryMessages,
        );
        return;
      }
      if (command?.name === 'resume') {
        const [sessionId] = command.args;
        if (!sessionId) {
          notify('Command "/resume" requires a session id.', 'error');
          return;
        }
        try {
          // S7 — event-sourced resume: rehydrate state from the existing session
          // log and continue at the last turn boundary. The triggering prompt is
          // recovered from the log, so `/resume <sessionId>` is sufficient.
          const validatedSessionId = validateSessionId(sessionId);
          const resumeConfig = await loadConfig({
            cwd,
            configPath: parsed.configPath,
            env,
            cli: cliOverrides(parsed),
          });
          const historyMessages = eventsToMessages(await readSessionLog(resumeConfig.xenesisHome, validatedSessionId));
          state = setTuiSessionContext(state, {
            resumedFromSessionId: sessionId,
            historyMessageCount: historyMessages.length,
          });
          publish();
          await runTuiAgentResume(
            {
              ...parsed,
              command: 'sessions',
              sessionCommand: 'resume',
              sessionId: validatedSessionId,
            },
            input,
            validatedSessionId,
          );
        } catch (error) {
          notify(`Command "/resume" failed: ${errorMessage(error)}`, 'error');
        }
        return;
      }
      if (command) {
        notify(`Unknown or unsupported TUI slash command "/${command.name}". Type /help.`, 'error');
        return;
      }

      await runTuiAgentPrompt(parsed, input, input, chatHistoryMessages);
    },
  };

  await refreshTuiSuggestionContext();

  try {
    const { runInkTui } = await import('./tui/inkRenderer.js');
    await runInkTui(
      { controller },
      {
        stdin: stdin as NodeJS.ReadStream,
        stdout: process.stdout,
        stderr: process.stderr,
      },
    );
  } finally {
    await stopAllManagedServers();
  }

  return 0;
}

function reduceTuiInput(state: ReturnType<typeof createInitialTuiState>, content: string) {
  return reduceTuiEvent(state, {
    type: 'user_message',
    message: { role: 'user', content },
  });
}

async function runChat(
  parsed: ParsedArgs,
  cwd: string,
  env: NodeJS.ProcessEnv,
  io: CliIo,
  setSessionWriter: SessionWriterSetter,
) {
  const chatConfig = await loadConfig({
    cwd,
    configPath: parsed.configPath,
    env,
    cli: cliOverrides(parsed),
  });
  let lastSessionId: string | undefined;
  let chatHistoryMessages: AgentMessage[] = [];
  let activeRunController: AbortController | undefined;
  const chatSessionId = `session-${Date.now()}`;
  const setChatSessionWriter: SessionWriterSetter = (writer, sessionId) => {
    lastSessionId = sessionId;
    setSessionWriter(writer, sessionId);
  };
  const updateChatHistoryMessages = (messages: AgentMessage[]) => {
    chatHistoryMessages = messages;
  };

  const runChatLine = async (prompt: string, preserveManagedServers = false) => {
    const slashResult = await runChatSlashCommand(
      parsed,
      cwd,
      env,
      io,
      prompt,
      setChatSessionWriter,
      () => lastSessionId,
      () => {
        chatHistoryMessages = [];
      },
    );
    if (slashResult === 'exit') return 'exit' as const;
    if (slashResult === 'continue') return 'continue' as const;

    const controller = new AbortController();
    activeRunController = controller;
    let exitCode: number;
    try {
      exitCode = await runPrompt(parsed, cwd, env, io, prompt, setChatSessionWriter, chatHistoryMessages, {
        sessionId: chatSessionId,
        onMessages: updateChatHistoryMessages,
        abortSignal: controller.signal,
        preserveManagedServers,
      });
    } finally {
      if (activeRunController === controller) activeRunController = undefined;
    }
    return exitCode === 0 ? ('continue' as const) : exitCode;
  };

  if (parsed.prompt) {
    const result = await runChatLine(parsed.prompt);
    return typeof result === 'number' ? result : 0;
  }

  const stdin = io.stdin ?? process.stdin;
  if (isTtyInput(stdin)) {
    const reader = createInterface({
      input: stdin,
      output: io.stdout ? undefined : process.stdout,
      history: await loadChatHistory(chatConfig),
      terminal: true,
    });
    const promptController = createChatPromptController(io, reader);
    const inputState = new ChatInputState();
    let interrupted = false;
    const handleSigint = () => {
      if (activeRunController) {
        activeRunController.abort();
        emitStdout(io, 'chat: run cancelled');
        return;
      }
      if (inputState.hasPending()) {
        inputState.cancel();
        emitStdout(io, 'chat: multiline canceled');
        promptController.show(false);
        return;
      }
      if (interrupted) return;
      interrupted = true;
      emitStdout(io, 'chat: interrupted');
      reader.close();
    };
    reader.on('SIGINT', handleSigint);
    process.on('SIGINT', handleSigint);
    try {
      promptController.show(false);
      for await (const line of reader) {
        if (interrupted) break;
        await appendChatHistory(chatConfig, line);
        const inputResult = inputState.accept(line);
        if (inputResult.type === 'notice') emitStdout(io, inputResult.message);
        if (inputResult.type === 'prompt') {
          const result = await runChatLine(inputResult.prompt, true);
          if (result === 'exit') break;
          if (typeof result === 'number') return result;
        }
        if (interrupted) break;
        promptController.show(inputState.hasPending());
      }
    } finally {
      process.off('SIGINT', handleSigint);
      await stopAllManagedServers();
    }
    return 0;
  }

  const prompts = await readChatPrompts(stdin);
  if (prompts.length === 0) {
    emitStderr(io, 'error: Command "chat" requires a prompt from arguments or stdin.');
    return 1;
  }

  for (const prompt of prompts) {
    const result = await runChatLine(prompt);
    if (result === 'exit') break;
    if (typeof result === 'number') return result;
  }
  return 0;
}

export async function runCli(argv: string[], io: CliIo = {}): Promise<number> {
  let sessionWriter: JsonlSessionWriter | undefined;
  try {
    const parsed = parseArgs(argv);
    const cwd = resolve(parsed.cwd ?? io.cwd ?? process.cwd());
    const env = io.env ?? process.env;

    if (parsed.help) {
      for (const line of renderCliHelp(parsed.helpTopic)) emitStdout(io, line);
      return 0;
    }

    if (parsed.command === 'version') {
      return await runVersionCommand(io);
    }

    if (parsed.command === 'status') {
      return await runStatusCommand(parsed, cwd, env, io);
    }

    if (
      parsed.command === 'files' ||
      parsed.command === 'diff' ||
      parsed.command === 'branch' ||
      parsed.command === 'add-dir'
    ) {
      return await runWorkspaceGitCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'commit') {
      return await runCommitCommand(parsed, cwd, env, io, (writer) => {
        sessionWriter = writer;
      });
    }

    if (isRemoteBridgeCommandName(parsed.command)) {
      return runRemoteBridgeCliCommand(parsed, cwd, io);
    }

    if (parsed.command && isReviewCliCommandName(parsed.command)) {
      return await runReviewCliCommand(parsed, cwd, env, io, (writer) => {
        sessionWriter = writer;
      });
    }

    if (parsed.command === 'usage') {
      return await runUsageCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'cost') {
      return await runCostCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'stats') {
      return await runStatsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'login') {
      return await runLoginCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'logout') {
      return await runLogoutCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'rate-limit-options') {
      return await runRateLimitOptionsCommand(parsed, cwd, env, io);
    }

    if (isDiagnosticCommandName(parsed.command)) {
      return await runDiagnosticCliCommand(parsed, cwd, env, io);
    }

    if (isMiscCompatibilityCommandName(parsed.command)) {
      return await runMiscCompatibilityCliCommand(parsed, cwd, env, io);
    }

    if (isPreferenceCommandName(parsed.command)) {
      return await runPreferenceCliCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'config') {
      return await runConfigCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'model') {
      return await runModelCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'env') {
      return await runEnvCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'effort') {
      return await runEffortCommand(parsed, cwd, env, io);
    }

    if (isModePromptCommandName(parsed.command)) {
      return await runModePromptCliCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'doctor') {
      const result = await runDoctor({
        cwd,
        configPath: parsed.configPath,
        env,
        cli: cliOverrides(parsed),
      });
      for (const line of result.lines) emitStdout(io, line);
      return result.exitCode;
    }

    if (parsed.command === 'init' && parsed.initSubcommand === 'claude') {
      const result = renderSetupPolicyCommand({
        command: 'init',
        args: parsed.setupPolicyArgs,
        cwd,
        json: parsed.json,
        initSubcommand: 'claude',
      });
      for (const line of result.stdout) emitStdout(io, line);
      for (const line of result.stderr) emitStderr(io, line);
      return result.exitCode;
    }

    if (parsed.command && isSetupPolicyCommandName(parsed.command)) {
      const result = renderSetupPolicyCommand({
        command: parsed.command,
        args: parsed.setupPolicyArgs,
        cwd,
        json: parsed.json,
        forceInstall: parsed.forceInstall,
      });
      for (const line of result.stdout) emitStdout(io, line);
      for (const line of result.stderr) emitStderr(io, line);
      return result.exitCode;
    }

    if (parsed.command === 'connect') {
      return await runConnectionCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'init') {
      return await initConfig(parsed, cwd, env, io);
    }

    if (parsed.command === 'sessions') {
      if (parsed.sessionCommand === 'resume') {
        return await runSessionResume(parsed, cwd, env, io, (writer) => {
          sessionWriter = writer;
        });
      }
      return await runSessionsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'extensions') {
      return await runExtensionsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'skills') {
      return await runSkillsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'mcp') {
      return await runMcpCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'memory') {
      return await runMemoryCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'context') {
      return await runContextCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'artifacts') {
      return await runArtifactsCommand(parsed, cwd, env, io);
    }

    if (
      parsed.command === 'brief' ||
      parsed.command === 'copy' ||
      parsed.command === 'export' ||
      parsed.command === 'share' ||
      parsed.command === 'summary' ||
      parsed.command === 'rename' ||
      parsed.command === 'tag' ||
      parsed.command === 'ctx-viz'
    ) {
      return await runContentCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'changes') {
      return await runChangesCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'checkpoints') {
      return await runCheckpointsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'plugins') {
      return await runPluginsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'permissions') {
      return await runPermissionsCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'profile') {
      return await runProfileCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'hooks') {
      return runHooksCommand(parsed, io);
    }

    if (parsed.command === 'gateway') {
      return await runGatewayCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'smoke') {
      return await runSmokeCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'scenario') {
      return await runScenarioCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'runs') {
      return await runRunsCommand(parsed, cwd, env, io, (writer) => {
        sessionWriter = writer;
      });
    }

    if (parsed.command === 'tasks') {
      return await runTasksCommand(parsed, cwd, env, io, (writer) => {
        sessionWriter = writer;
      });
    }

    if (parsed.command === 'schedules') {
      return await runSchedulesCommand(parsed, cwd, env, io);
    }

    if (parsed.command === 'chat') {
      return await runChat(parsed, cwd, env, io, (writer) => {
        sessionWriter = writer;
      });
    }

    if (parsed.command === 'tui') {
      return await runTuiCommand(parsed, cwd, env, io, (writer) => {
        sessionWriter = writer;
      });
    }

    if (parsed.command === 'plan' || parsed.command === 'work') {
      if (!parsed.prompt) {
        emitStderr(
          io,
          `error: Command "${parsed.command}" requires a prompt. Run "xenesis ${parsed.command} --help" for usage.`,
        );
        return 1;
      }
      return await runPrompt(
        parsed,
        cwd,
        env,
        io,
        parsed.prompt,
        (writer) => {
          sessionWriter = writer;
        },
        [],
        { abortSignal: io.abortSignal },
      );
    }

    if (!parsed.prompt) {
      emitStderr(io, 'error: Prompt required. Run "xenesis --help" for usage.');
      return 1;
    }

    return await runPrompt(
      parsed,
      cwd,
      env,
      io,
      parsed.prompt,
      (writer) => {
        sessionWriter = writer;
      },
      [],
      { abortSignal: io.abortSignal },
    );
  } catch (error) {
    const message = errorMessage(error);
    if (sessionWriter) {
      try {
        await sessionWriter.write({ type: 'error', message });
      } catch {
        // Keep the original runtime error visible even if writing the transcript fails.
      }
    }
    emitStderr(io, `error: ${message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const exitCode = await runCli(process.argv);
  process.exitCode = exitCode;
}
