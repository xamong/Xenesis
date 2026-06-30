import { resolve } from 'node:path';
import { createDeskCapabilityRegistryClient, type DeskCapabilityRegistryClient } from './capabilityRegistry';
import {
  createDeskEmbeddedPromptOptions,
  type DeskApprovalMode,
  type DeskEmbeddedProfilePolicyState,
  type DeskEmbeddedPromptOptions,
  type DeskEmbeddedPromptResult,
  type DeskEmbeddedRunRequest,
  type DeskProviderRuntimeOptions,
  runDeskEmbeddedPrompt,
} from './embeddedRuntime';

export interface DeskEmbeddedAgentRunEvent {
  event: string;
  data: unknown;
}

export interface DeskEmbeddedGatewayStatus {
  enabled: boolean;
  running: boolean;
  managed: boolean;
  url: string;
  pid?: number;
  host: string;
  port: number;
  workspace: string;
  error: string;
  updatedAt: string;
}

export interface DeskEmbeddedAgentRuntimeOptions {
  enabled: boolean;
  xenesisHome: string;
  runtimePath: string;
  workspace: string;
  env: NodeJS.ProcessEnv;
  providerRuntime: DeskProviderRuntimeOptions;
  approvalMode: DeskApprovalMode;
  maxTurns: number;
  profileName?: string;
  profilePolicy?: DeskEmbeddedProfilePolicyState;
  bridgeUrl?: string;
  bridgeToken?: string;
  turnLedger?: DeskEmbeddedPromptOptions['turnLedger'];
  onEvent?: (event: DeskEmbeddedAgentRunEvent) => void;
}

export interface DeskProviderRuntimeStatus {
  provider: string;
  model: string;
  profile: string;
  baseURL: string;
  apiKeyEnv: string;
  requestedProvider?: string;
  source?: string;
  authMode?: string;
  credentialState?: string;
  credentialSource?: string;
  processModel?: string;
  fallbackProvider?: string;
  safeForReasoning?: boolean;
  diagnostics?: string[];
  localCliBoundary?: string;
}

export interface DeskEmbeddedAgentStatus {
  ok: boolean;
  running: boolean;
  managed: boolean;
  enabled: boolean;
  runtimeMode: 'embedded';
  url: string;
  runtimePath: string;
  xenesisHome: string;
  workspace: string;
  providerRuntime: DeskProviderRuntimeStatus;
  error: string;
  updatedAt: string;
  gateway: DeskEmbeddedGatewayStatus;
}

export type DeskEmbeddedAgentRunRequest = DeskEmbeddedRunRequest;

export interface DeskEmbeddedAgentArtifact {
  title?: string;
  kind?: string;
  filePath?: string;
  openCommand?: string;
  focusCommand?: string;
}

export interface DeskEmbeddedAgentRunResult {
  ok: boolean;
  exitCode?: number;
  traceId?: string;
  sessionId?: string;
  output?: string;
  doneContent?: string;
  errors?: string;
  error?: string;
  events?: unknown[];
  artifacts?: DeskEmbeddedAgentArtifact[];
  profile?: string;
  profilePolicy?: DeskEmbeddedProfilePolicyState;
}

function normalizePath(value: unknown): string {
  return String(value || '')
    .trim()
    .replace(/[\\/]+$/, '');
}

export function mapDeskEmbeddedPromptResult(result: DeskEmbeddedPromptResult): DeskEmbeddedAgentRunResult {
  const artifacts = (result as { artifacts?: DeskEmbeddedAgentArtifact[] }).artifacts;
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    traceId: result.traceId,
    sessionId: result.sessionId,
    output: result.output,
    ...(result.doneContent !== undefined ? { doneContent: result.doneContent } : {}),
    errors: result.errors,
    events: result.events,
    ...(Array.isArray(artifacts) ? { artifacts } : {}),
    ...(result.error ? { error: result.error } : {}),
  };
}

export class DeskEmbeddedAgentRuntime {
  private options: DeskEmbeddedAgentRuntimeOptions;
  private workspace: string;
  private started = false;
  private activeController: AbortController | null = null;
  private activeTraceId = '';
  private activeSessionId = '';
  private historyMessages: NonNullable<DeskEmbeddedRunRequest['historyMessages']> = [];
  private lastError = '';
  private updatedAt = new Date().toISOString();
  private capabilityRegistryClient: DeskCapabilityRegistryClient;

  constructor(options: DeskEmbeddedAgentRuntimeOptions) {
    this.options = options;
    this.workspace = options.workspace;
    this.capabilityRegistryClient = this.createCapabilityRegistryClient();
  }

  updateOptions(options: DeskEmbeddedAgentRuntimeOptions): void {
    this.options = options;
    this.workspace = normalizePath(options.workspace) || this.workspace;
    this.capabilityRegistryClient = this.createCapabilityRegistryClient();
    this.touch();
  }

  setWorkspace(workspacePath: string): DeskEmbeddedAgentStatus {
    const normalized = normalizePath(workspacePath);
    if (normalized) this.workspace = normalized;
    this.touch();
    return this.status();
  }

  start(): DeskEmbeddedAgentStatus {
    this.started = this.options.enabled;
    if (!this.options.enabled) this.lastError = 'Xenesis is disabled in settings.';
    else this.lastError = '';
    this.touch();
    return this.status();
  }

  stop(): DeskEmbeddedAgentStatus {
    this.activeController?.abort();
    this.activeController = null;
    this.started = false;
    this.touch();
    return this.status();
  }

  cancel(): DeskEmbeddedAgentStatus {
    this.activeController?.abort();
    this.activeController = null;
    this.touch();
    return this.status();
  }

  resetSession(): DeskEmbeddedAgentStatus {
    this.activeSessionId = '';
    this.activeTraceId = '';
    this.historyMessages = [];
    this.lastError = '';
    this.touch();
    return this.status();
  }

  status(gateway = this.defaultGatewayStatus()): DeskEmbeddedAgentStatus {
    return {
      ok: this.options.enabled && this.started && !this.lastError,
      running: this.started,
      managed: true,
      enabled: this.options.enabled,
      runtimeMode: 'embedded',
      url: '',
      runtimePath: this.options.runtimePath || 'embedded',
      xenesisHome: this.options.xenesisHome,
      workspace: this.workspace,
      providerRuntime: this.statusProviderRuntime(),
      error: this.lastError,
      updatedAt: this.updatedAt,
      gateway,
    };
  }

  async run(request: DeskEmbeddedAgentRunRequest): Promise<DeskEmbeddedAgentRunResult> {
    if (!this.options.enabled) {
      this.lastError = 'Xenesis is disabled in settings.';
      return { ok: false, exitCode: 1, output: '', errors: this.lastError, error: this.lastError };
    }
    if (this.activeController) {
      return {
        ok: false,
        exitCode: 1,
        output: '',
        errors: 'Xenesis is already running.',
        error: 'Xenesis is already running.',
      };
    }

    this.started = true;
    this.lastError = '';
    const controller = new AbortController();
    this.activeController = controller;
    this.touch();

    try {
      const requestWithSession: DeskEmbeddedAgentRunRequest = {
        ...request,
        sessionId: request.sessionId || this.activeSessionId || undefined,
        historyMessages: request.historyMessages ?? this.historyMessages,
      };
      const result = await runDeskEmbeddedPrompt(
        createDeskEmbeddedPromptOptions({
          workspace: this.workspace,
          xenesisHome: this.options.xenesisHome,
          baseEnv: this.options.env,
          providerRuntime: this.options.providerRuntime,
          approvalMode: this.options.approvalMode,
          maxTurns: this.options.maxTurns,
          profileName: this.options.profileName,
          profilePolicy: this.options.profilePolicy,
          bridgeUrl: this.options.bridgeUrl,
          bridgeToken: this.options.bridgeToken,
          request: requestWithSession,
          abortSignal: controller.signal,
          turnLedger: this.options.turnLedger,
          onSession: (sessionId) => {
            this.activeSessionId = sessionId;
          },
          onMessages: (messages: NonNullable<DeskEmbeddedRunRequest['historyMessages']>) => {
            this.historyMessages = messages;
          },
          onEvent: (event) => {
            this.options.onEvent?.({ event: event.type, data: event });
          },
        }),
      );
      this.activeTraceId = result.traceId ?? this.activeTraceId;
      const mapped = {
        ...mapDeskEmbeddedPromptResult(result),
        profile: this.options.profileName,
        profilePolicy: this.options.profilePolicy,
      };
      if (!mapped.ok) {
        this.lastError = mapped.error || mapped.errors || 'Xenesis run failed.';
      }
      return mapped;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastError = message;
      return { ok: false, exitCode: 1, output: '', errors: `error: ${message}`, error: message };
    } finally {
      this.activeController = null;
      this.touch();
    }
  }

  capabilityRegistry(): DeskCapabilityRegistryClient {
    return this.capabilityRegistryClient;
  }

  private createCapabilityRegistryClient(): DeskCapabilityRegistryClient {
    return createDeskCapabilityRegistryClient({
      bridgeUrl: this.options.bridgeUrl,
      bridgeToken: this.options.bridgeToken,
      source: 'xenesis',
    });
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }

  private statusProviderRuntime(): DeskProviderRuntimeStatus {
    const runtime = this.options.providerRuntime;
    return {
      provider: runtime.provider,
      model: runtime.model,
      profile: runtime.profile,
      baseURL: runtime.baseURL,
      apiKeyEnv: runtime.apiKeyEnv,
      ...(runtime.requestedProvider !== undefined ? { requestedProvider: runtime.requestedProvider } : {}),
      ...(runtime.source !== undefined ? { source: runtime.source } : {}),
      ...(runtime.authMode !== undefined ? { authMode: runtime.authMode } : {}),
      ...(runtime.credentialState !== undefined ? { credentialState: runtime.credentialState } : {}),
      ...(runtime.credentialSource !== undefined ? { credentialSource: runtime.credentialSource } : {}),
      ...(runtime.processModel !== undefined ? { processModel: runtime.processModel } : {}),
      ...(runtime.fallbackProvider !== undefined ? { fallbackProvider: runtime.fallbackProvider } : {}),
      ...(runtime.safeForReasoning !== undefined ? { safeForReasoning: runtime.safeForReasoning } : {}),
      ...(Array.isArray(runtime.diagnostics) ? { diagnostics: [...runtime.diagnostics] } : {}),
      ...(runtime.localCliBoundary !== undefined ? { localCliBoundary: runtime.localCliBoundary } : {}),
    };
  }

  private defaultGatewayStatus(): DeskEmbeddedGatewayStatus {
    return {
      enabled: false,
      running: false,
      managed: true,
      url: '',
      host: '',
      port: 0,
      workspace: this.workspace,
      error: '',
      updatedAt: this.updatedAt,
    };
  }
}

export function resolveDeskEmbeddedWorkspace(workspacePath: string): string {
  return resolve(normalizePath(workspacePath) || '.');
}
