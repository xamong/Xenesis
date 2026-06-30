import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { XenesisConfig } from '../config/index.js';
import { supportsVision } from '../providers/modelCapabilities.js';

export type RuntimeFeatureState = 'disabled' | 'enabled';
export type RuntimeCompletionGateState = 'disabled' | 'warn' | 'block';
export type RuntimeKernelMode = 'disabled' | 'shadow' | 'enabled';
export type RuntimeCommitmentsState = 'disabled' | 'enabled';
export type RuntimeParityStatus = 'generated' | 'not generated' | 'invalid';

export interface AgentRuntimeParitySummary {
  matched: number;
  adapted: number;
  partial: number;
  deferred: number;
  notApplicable: number;
  missing: number;
}

export interface AgentRuntimeParityState {
  status: RuntimeParityStatus;
  path: string;
  generatedAt?: string;
  score?: number;
  summary?: AgentRuntimeParitySummary;
  replay?: {
    total: number;
    passed: number;
    failed: number;
  };
  error?: string;
}

export interface AgentRuntimeSessionState {
  latestSessionId?: string;
  latestUpdatedAt?: string;
  resumeSource: 'session-store' | 'none';
}

export interface AgentRuntimeState {
  provider: string;
  model: string;
  approvalMode: string;
  bridgeStatus: string;
  contextPipeline: RuntimeFeatureState;
  promptPipeline: RuntimeFeatureState;
  completionGate: RuntimeCompletionGateState;
  kernelMode: RuntimeKernelMode;
  storageBackend: 'file';
  storageWarnings: string[];
  commitments: RuntimeCommitmentsState;
  parityScore?: number;
  parity: AgentRuntimeParityState;
  session: AgentRuntimeSessionState;
  providerCapabilities: {
    tools: RuntimeFeatureState;
    vision: RuntimeFeatureState;
    streaming: RuntimeFeatureState;
  };
  failedCapabilityChecks: string[];
  pendingApprovals: number;
}

export interface ResolveAgentRuntimeStateOptions {
  config: XenesisConfig;
  env?: NodeJS.ProcessEnv;
  parityReportPath?: string;
}

interface RawParityReport {
  kind?: unknown;
  generatedAt?: unknown;
  matrix?: {
    summary?: Partial<Record<keyof AgentRuntimeParitySummary, unknown>>;
  };
  replay?: {
    total?: unknown;
    passed?: unknown;
    failed?: unknown;
  };
}

function enabled(value: boolean | undefined): RuntimeFeatureState {
  return value === false ? 'disabled' : 'enabled';
}

function parityReportPath(config: XenesisConfig) {
  return join(config.xenesisHome, 'reports', 'agent-parity.json');
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function paritySummary(raw: RawParityReport): AgentRuntimeParitySummary {
  const summary = raw.matrix?.summary ?? {};
  return {
    matched: numberValue(summary.matched),
    adapted: numberValue(summary.adapted),
    partial: numberValue(summary.partial),
    deferred: numberValue(summary.deferred),
    notApplicable: numberValue(summary.notApplicable),
    missing: numberValue(summary.missing),
  };
}

function parityScore(summary: AgentRuntimeParitySummary): number | undefined {
  const scored = summary.matched + summary.adapted;
  const total = scored + summary.partial + summary.deferred + summary.missing;
  if (total <= 0) return undefined;
  return Math.round((scored / total) * 100);
}

async function readParityState(path: string): Promise<AgentRuntimeParityState> {
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as RawParityReport;
    if (raw.kind !== 'xenesis-agent-parity-report') {
      return { status: 'invalid', path, error: 'Unexpected parity report kind.' };
    }
    const summary = paritySummary(raw);
    const score = parityScore(summary);
    return {
      status: 'generated',
      path,
      ...(typeof raw.generatedAt === 'string' ? { generatedAt: raw.generatedAt } : {}),
      ...(score === undefined ? {} : { score }),
      summary,
      replay: {
        total: numberValue(raw.replay?.total),
        passed: numberValue(raw.replay?.passed),
        failed: numberValue(raw.replay?.failed),
      },
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return { status: 'not generated', path };
    }
    return {
      status: 'invalid',
      path,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function bridgeStatus(env: NodeJS.ProcessEnv): Promise<string> {
  if (String(env.XENIS_MCP_BRIDGE_URL ?? '').trim()) return 'configured';
  const explicitStatePath = String(env.XENIS_MCP_STATE_FILE ?? '').trim();
  const statePath =
    explicitStatePath || (String(env.XENIS_HOME ?? '').trim() ? join(String(env.XENIS_HOME), 'mcp', 'bridge.json') : '');
  if (!statePath) return 'not configured';
  try {
    const raw = JSON.parse(await readFile(statePath, 'utf8')) as { bridgeUrl?: unknown };
    return String(raw.bridgeUrl ?? '').trim() ? 'configured' : 'not configured';
  } catch {
    return 'not configured';
  }
}

async function latestSessionState(config: XenesisConfig): Promise<AgentRuntimeSessionState> {
  const sessionsDir = join(config.xenesisHome, 'sessions');
  try {
    const entries = await readdir(sessionsDir);
    const candidates = await Promise.all(
      entries
        .filter((entry) => entry.endsWith('.jsonl'))
        .map(async (entry) => {
          const path = join(sessionsDir, entry);
          const info = await stat(path);
          return {
            id: entry.slice(0, -'.jsonl'.length),
            updatedAt: info.mtime.toISOString(),
            updatedMs: info.mtimeMs,
          };
        }),
    );
    const latest = candidates.sort((left, right) => right.updatedMs - left.updatedMs)[0];
    return latest
      ? { latestSessionId: latest.id, latestUpdatedAt: latest.updatedAt, resumeSource: 'session-store' }
      : { resumeSource: 'none' };
  } catch {
    return { resumeSource: 'none' };
  }
}

export async function resolveAgentRuntimeState(options: ResolveAgentRuntimeStateOptions): Promise<AgentRuntimeState> {
  const env = options.env ?? process.env;
  const vision = supportsVision(options.config.model, options.config.provider);
  const [parity, session, bridge] = await Promise.all([
    readParityState(options.parityReportPath ?? parityReportPath(options.config)),
    latestSessionState(options.config),
    bridgeStatus(env),
  ]);

  return {
    provider: options.config.provider,
    model: options.config.model,
    approvalMode: options.config.approvalMode,
    bridgeStatus: bridge,
    contextPipeline: enabled(options.config.context.autoCompact),
    promptPipeline: 'enabled',
    completionGate: options.config.verification.acceptOnPass ? 'block' : 'warn',
    kernelMode: 'disabled',
    storageBackend: 'file',
    storageWarnings: [],
    commitments: options.config.commitments?.enabled ? 'enabled' : 'disabled',
    ...(parity.score === undefined ? {} : { parityScore: parity.score }),
    parity,
    session,
    providerCapabilities: {
      tools: 'enabled',
      vision: enabled(vision),
      streaming: 'enabled',
    },
    failedCapabilityChecks: [],
    pendingApprovals: 0,
  };
}

export function formatAgentRuntimeStatus(state: AgentRuntimeState): string {
  const parity = state.parity.status === 'generated' ? `${state.parityScore ?? 'unknown'}%` : state.parity.status;
  return [
    `provider=${state.provider}`,
    `model=${state.model}`,
    `approval=${state.approvalMode}`,
    `bridge=${state.bridgeStatus}`,
    `contextPipeline=${state.contextPipeline}`,
    `promptPipeline=${state.promptPipeline}`,
    `completionGate=${state.completionGate}`,
    `kernel=${state.kernelMode}`,
    `tools=${state.providerCapabilities.tools}`,
    `vision=${state.providerCapabilities.vision}`,
    `streaming=${state.providerCapabilities.streaming}`,
    `storage=${state.storageBackend}`,
    `commitments=${state.commitments}`,
    `parity=${parity}`,
    `latest=${state.session.latestSessionId ?? 'none'}`,
    `resumeSource=${state.session.resumeSource}`,
  ].join(' ');
}

export function formatAgentRuntimeParity(state: AgentRuntimeState): string {
  const parity = state.parity;
  if (parity.status !== 'generated') {
    return `parity: ${parity.status}${parity.error ? ` (${parity.error})` : ''}`;
  }
  return [
    `parity: ${state.parityScore ?? 'unknown'}%`,
    `generated=${parity.generatedAt ?? 'unknown'}`,
    `replay=${parity.replay?.passed ?? 0}/${parity.replay?.total ?? 0}`,
    `failed=${parity.replay?.failed ?? 0}`,
    parity.summary
      ? `matched=${parity.summary.matched} adapted=${parity.summary.adapted} partial=${parity.summary.partial} missing=${parity.summary.missing}`
      : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join(' ');
}

export function formatAgentRuntimeSessions(state: AgentRuntimeState): string {
  return [
    `sessions: storage=${state.storageBackend}`,
    `latest=${state.session.latestSessionId ?? 'none'}`,
    `resumeSource=${state.session.resumeSource}`,
  ].join(' ');
}

export function formatAgentRuntimeCommitments(state: AgentRuntimeState): string {
  if (state.commitments === 'disabled') {
    return 'commitments: disabled - enable config.commitments.enabled to list, inspect, complete, or dismiss commitments.';
  }
  return 'commitments: enabled - list, inspect, complete, and dismiss use the configured commitment store.';
}
