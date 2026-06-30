import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { type ApprovalMode, type ProviderName, type XenesisConfig } from '../../config/index.js';
import type { ApprovalHandler } from '../../core/AgentRunner.js';
import type { AgentMessage } from '../../core/messages.js';
import type { ToolRegistry } from '../../tools/index.js';
import { createTuiAgentCommandRouter } from './agentCommandRouter.js';
import { createTuiImageCommandRunner } from './imageCommands.js';
import type { InkTuiController } from './inkRenderer.js';
import { createTuiOutputCommandHandler } from './outputCommands.js';
import { createInitialTuiState } from './runTui.js';
import { createTuiRuntimeCommandRouter } from './runtimeCommandRouter.js';
import type {
  RunTuiPromptOptions,
  TuiRuntimeIo,
  TuiRuntimeParsedArgs,
  TuiSessionWriterSetter,
  TuiTerminalImageRequest,
} from './runtimeTypes.js';
import { createTuiSlashCommandDispatcher } from './slashCommandDispatcher.js';
import {
  appendTuiNotice,
  reduceTuiEvent,
  resolveTuiApproval,
  setTuiCommandOutput,
  setTuiSessionContext,
  setTuiSuggestionContext,
  type TuiState,
} from './state.js';

export interface CreateTuiRuntimeControllerOptions<Parsed extends TuiRuntimeParsedArgs = TuiRuntimeParsedArgs> {
  parsed: Parsed;
  cwd: string;
  env: NodeJS.ProcessEnv;
  io: TuiRuntimeIo;
  config: XenesisConfig;
  setSessionWriter: TuiSessionWriterSetter;
  loadRuntimeConfig(): Promise<XenesisConfig>;
  createRuntimeTools(config: XenesisConfig, env: NodeJS.ProcessEnv): Promise<ToolRegistry>;
  selectTools(config: XenesisConfig, tools: ToolRegistry): ToolRegistry;
  runPrompt(
    parsed: Parsed,
    cwd: string,
    env: NodeJS.ProcessEnv,
    io: TuiRuntimeIo,
    prompt: string,
    setSessionWriter: TuiSessionWriterSetter,
    historyMessages: AgentMessage[],
    options: RunTuiPromptOptions,
  ): Promise<number>;
  runCapturedSlashCommand(
    input: string,
    io: TuiRuntimeIo,
    setSessionWriter: TuiSessionWriterSetter,
    getLastSessionId: () => string | undefined,
    resetVisibleState: () => void,
  ): Promise<void>;
  loadInputHistory(): Promise<string[]>;
  appendInputHistory(line: string): Promise<void>;
  statePath(...parts: string[]): string;
  sessionDir(): string;
  resolveDeskBridgeStatus(): 'configured' | 'missing';
  createTerminalImageRequest(
    commandName: 'image' | 'xcon-image',
    rest: string,
    cwd: string,
  ): Promise<TuiTerminalImageRequest>;
  friendlyImageError(error: unknown): string;
  bridgeCallFailed(value: unknown): string | undefined;
  isProviderName(value: string): value is ProviderName;
  isApprovalMode(value: string): value is ApprovalMode;
  isSupportedImageFileName(value: string): boolean;
  quoteCommandArg(value: string): string;
}

export function createTuiRuntimeController<Parsed extends TuiRuntimeParsedArgs>(
  options: CreateTuiRuntimeControllerOptions<Parsed>,
) {
  const {
    parsed,
    cwd,
    env,
    io,
    config,
    setSessionWriter,
    loadRuntimeConfig,
    createRuntimeTools,
    selectTools,
    runPrompt,
    runCapturedSlashCommand,
    loadInputHistory,
    appendInputHistory,
    statePath,
    sessionDir,
    resolveDeskBridgeStatus,
    createTerminalImageRequest,
    friendlyImageError,
    bridgeCallFailed,
    isProviderName,
    isApprovalMode,
    isSupportedImageFileName,
    quoteCommandArg,
  } = options;

  const createTuiRuntimeSummary = () => ({
    provider: parsed.provider ?? config.provider,
    model: parsed.model ?? config.model,
    approvalMode: parsed.approvalMode ?? config.approvalMode,
    workspace: config.workspace,
    deskBridgeStatus: resolveDeskBridgeStatus(),
  });

  let state = createInitialTuiState(createTuiRuntimeSummary());
  let chatHistoryMessages: AgentMessage[] = [];
  let lastSessionId: string | undefined;
  const chatSessionId = `session-${Date.now()}`;
  state = setTuiSessionContext(state, {
    activeSessionId: chatSessionId,
    historyMessageCount: chatHistoryMessages.length,
  });

  let activeRunController: AbortController | undefined;
  let pendingApprovalResolver: ((approved: boolean) => void) | undefined;
  const resolvedApprovalToolCallIds = new Set<string>();
  const listeners = new Set<(next: TuiState) => void>();

  const setState = (next: TuiState) => {
    state = next;
  };
  const publish = () => {
    for (const listener of listeners) listener(state);
  };
  const notify = (message: string, kind: 'info' | 'warning' | 'error' = 'info') => {
    state = appendTuiNotice(state, { kind, message });
    publish();
  };
  const setTuiSessionWriter: TuiSessionWriterSetter = (writer, sessionId) => {
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
  const tuiImageCommandRunner = createTuiImageCommandRunner({
    cwd,
    env,
    xenesisHome: config.xenesisHome,
    getState: () => state,
    setState,
    publish,
    notify,
    setCapturedCommandOutput,
    statePath,
    createTerminalImageRequest,
    friendlyImageError,
    bridgeCallFailed,
    isSupportedImageFileName,
    quoteCommandArg,
  });
  const handleOutputCommand = createTuiOutputCommandHandler({
    getState: () => state,
    setState,
    publish,
    notify,
    statePath,
  });
  const refreshTuiSuggestionContext = async () => {
    let sessionIds: string[] = [];
    try {
      const files = await readdir(sessionDir(), { withFileTypes: true });
      const sessions = await Promise.all(
        files
          .filter((file) => file.isFile() && file.name.endsWith('.jsonl'))
          .map(async (file) => {
            const path = resolve(sessionDir(), file.name);
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
    const currentSuggestionContext = state.suggestionContext;
    state = createInitialTuiState(createTuiRuntimeSummary());
    state = setTuiSessionContext(state, {
      activeSessionId: currentSessionContext.activeSessionId ?? chatSessionId,
      lastSessionId: currentSessionContext.lastSessionId,
      resumedFromSessionId: undefined,
      historyMessageCount: chatHistoryMessages.length,
    });
    state = setTuiSuggestionContext(state, currentSuggestionContext);
    publish();
  };
  const setRuntimeState = () => {
    state = {
      ...state,
      runtime: createTuiRuntimeSummary(),
    };
    publish();
  };
  const applyPermissionRequest = (request: Parameters<ApprovalHandler>[0]) => {
    const existingApproval = state.pendingApproval;
    const replacesRestoredApproval = existingApproval?.toolCallId === request.toolCallId && existingApproval.restored;
    if (existingApproval?.toolCallId === request.toolCallId && !existingApproval.restored) return;
    if (resolvedApprovalToolCallIds.has(request.toolCallId) && !replacesRestoredApproval) return;
    state = reduceTuiEvent(state, { type: 'permission_request', request });
    publish();
  };
  const resolvePendingApproval = (approved: boolean) => {
    const resolver = pendingApprovalResolver;
    if (!resolver) {
      if (state.pendingApproval?.restored) {
        notify(
          'Restored approval is not attached to a live run. Use /resume <sessionId> <prompt> to continue.',
          'warning',
        );
        return;
      }
      notify('No approval request is pending.', 'warning');
      return;
    }
    pendingApprovalResolver = undefined;
    const resolvedToolCallId = state.pendingApproval?.toolCallId;
    if (resolvedToolCallId) resolvedApprovalToolCallIds.add(resolvedToolCallId);
    state = resolveTuiApproval(state, approved);
    publish();
    resolver(approved);
  };
  const tuiApprovalHandler: ApprovalHandler = (request) =>
    new Promise((resolve) => {
      pendingApprovalResolver = resolve;
      applyPermissionRequest(request);
    });
  const runTuiAgentPrompt = async (
    runParsed: Parsed,
    visibleInput: string,
    prompt: string,
    historyMessages: AgentMessage[],
  ) => {
    await appendInputHistory(visibleInput);
    resolvedApprovalToolCallIds.clear();
    const controller = new AbortController();
    activeRunController = controller;
    state = reduceTuiInput(state, prompt);
    publish();
    try {
      const exitCode = await runPrompt(runParsed, cwd, env, io, prompt, setTuiSessionWriter, historyMessages, {
        sessionId: chatSessionId,
        onEvent: (event) => {
          if (event.type === 'permission_request') {
            applyPermissionRequest(event.request);
            return;
          }
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
  const tuiAgentCommandRouter = createTuiAgentCommandRouter({
    parsed,
    io,
    getState: () => state,
    setState,
    publish,
    notify,
    getLastSessionId: () => lastSessionId,
    getChatHistoryMessages: () => chatHistoryMessages,
    setChatHistoryMessages: (messages) => {
      chatHistoryMessages = messages;
    },
    resetVisibleState,
    setTuiSessionWriter,
    appendInputHistory,
    setCapturedCommandOutput,
    loadRuntimeConfig,
    runCapturedSlashCommand,
    runTuiAgentPrompt,
  });
  const tuiRuntimeCommandRouter = createTuiRuntimeCommandRouter({
    parsed,
    env,
    chatSessionId,
    getState: () => state,
    setRuntimeState,
    notify,
    setChatHistoryMessages: (messages) => {
      chatHistoryMessages = messages;
    },
    resetVisibleState,
    loadRuntimeConfig,
    createRuntimeTools,
    selectTools,
    isProviderName,
    isApprovalMode,
  });
  const tuiSlashCommandDispatcher = createTuiSlashCommandDispatcher({
    runtimeCommandRouter: tuiRuntimeCommandRouter,
    outputCommandHandler: handleOutputCommand,
    imageCommandRunner: tuiImageCommandRunner,
    agentCommandRouter: tuiAgentCommandRouter,
    appendInputHistory,
    notify,
  });
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
      if (input.trimStart().startsWith('/') && (await tuiSlashCommandDispatcher.dispatch(input))) {
        return;
      }

      await runTuiAgentPrompt(parsed, input, input, chatHistoryMessages);
    },
  };

  return {
    controller,
    getState: () => state,
    async initialize() {
      await refreshTuiSuggestionContext();
      await tuiImageCommandRunner.refreshSuggestions();
    },
    loadInputHistory,
  };
}

function reduceTuiInput(state: TuiState, content: string) {
  return reduceTuiEvent(state, {
    type: 'user_message',
    message: { role: 'user', content },
  });
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}
