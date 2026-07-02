import type { AgentSession, AgentSessionSource } from '../../../../shared/agentSessions';
import type {
  LocalCliAgentStatus,
  McpBridgeTerminalMetadata,
  ShellKind,
  TerminalSpawnRequest,
} from '../../../../shared/types';

export type XconWorkbenchSubagentCliKind = 'codex' | 'claude' | 'gemini' | 'xenesis' | 'custom';
export type XconWorkbenchManagedSubagentCliKind = Extract<XconWorkbenchSubagentCliKind, 'codex' | 'claude' | 'gemini'>;
export type XconWorkbenchSubagentPermissionMode = 'readonly' | 'safe' | 'auto';
export type XconWorkbenchSubagentProfileSource = 'builtin' | 'global' | 'workspace';
export type XconWorkbenchSubagentApprovalDecision = 'approve' | 'reject';
export type XconWorkbenchSubagentApprovalRisk = 'low' | 'medium' | 'high' | 'unknown';
export type XconWorkbenchSubagentApprovalStatus = 'pending' | 'approved' | 'rejected';

const XCON_WORKBENCH_SUBAGENT_CLI_KINDS = new Set<XconWorkbenchSubagentCliKind>([
  'codex',
  'claude',
  'gemini',
  'xenesis',
  'custom',
]);
const XCON_WORKBENCH_SUBAGENT_PERMISSION_MODES = new Set<XconWorkbenchSubagentPermissionMode>([
  'readonly',
  'safe',
  'auto',
]);
const XCON_WORKBENCH_MANAGED_SUBAGENT_CLI_KINDS = new Set<XconWorkbenchManagedSubagentCliKind>([
  'codex',
  'claude',
  'gemini',
]);
export const XCON_WORKBENCH_SUBAGENT_METADATA_KIND = 'xenesis-workbench-subagent';
export const XCON_WORKBENCH_SUBAGENT_SPEC_METADATA_KIND = 'xenesis-agent-worker';

export function isXconWorkbenchSubagentWorkerMetadata(metadata: McpBridgeTerminalMetadata | undefined): boolean {
  return (
    metadata?.kind === XCON_WORKBENCH_SUBAGENT_METADATA_KIND ||
    metadata?.kind === XCON_WORKBENCH_SUBAGENT_SPEC_METADATA_KIND
  );
}

export interface XconWorkbenchSubagentProfile {
  name: string;
  description: string;
  systemPrompt: string;
  allowedTaskKinds: string[];
  permissionMode: XconWorkbenchSubagentPermissionMode;
  preferredCliKinds: XconWorkbenchSubagentCliKind[];
  resultSchema: 'xenesis-subagent-result-v1';
  source: XconWorkbenchSubagentProfileSource;
}

export interface NormalizeXconWorkbenchSubagentProfileInput {
  name: string;
  description?: string;
  systemPrompt?: string;
  allowedTaskKinds?: string[];
  permissionMode?: XconWorkbenchSubagentPermissionMode;
  preferredCliKinds?: XconWorkbenchSubagentCliKind[];
  source?: XconWorkbenchSubagentProfileSource;
}

export interface XconWorkbenchSubagentProfileJsonFile {
  filePath: string;
  content: string;
}

export interface XconWorkbenchSubagentProfileLoadDiagnostic {
  filePath: string;
  message: string;
}

export interface XconWorkbenchSubagentProfileLoadResult {
  profiles: XconWorkbenchSubagentProfile[];
  diagnostics: XconWorkbenchSubagentProfileLoadDiagnostic[];
}

export interface XconWorkbenchSubagentProfileTemplateFile {
  fileName: string;
  content: string;
}

export const DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES: XconWorkbenchSubagentProfile[] = [
  {
    name: 'researcher',
    description: 'Read-only investigation worker',
    systemPrompt: 'Investigate the assigned task and return concise findings with evidence.',
    allowedTaskKinds: ['research', 'review', 'diagnostics'],
    permissionMode: 'readonly',
    preferredCliKinds: ['codex', 'claude', 'gemini'],
    resultSchema: 'xenesis-subagent-result-v1',
    source: 'builtin',
  },
  {
    name: 'implementer',
    description: 'Implementation planning worker with central approval for writes',
    systemPrompt: 'Prepare scoped implementation changes and request approval for any write or command action.',
    allowedTaskKinds: ['implementation', 'repair', 'refactor'],
    permissionMode: 'safe',
    preferredCliKinds: ['codex', 'claude'],
    resultSchema: 'xenesis-subagent-result-v1',
    source: 'builtin',
  },
  {
    name: 'verifier',
    description: 'Independent verification worker',
    systemPrompt: 'Verify behavior, tests, and risks without mutating project files.',
    allowedTaskKinds: ['verification', 'test', 'review'],
    permissionMode: 'readonly',
    preferredCliKinds: ['codex', 'claude', 'gemini'],
    resultSchema: 'xenesis-subagent-result-v1',
    source: 'builtin',
  },
];

export function normalizeXconWorkbenchSubagentProfile(
  input: NormalizeXconWorkbenchSubagentProfileInput,
): XconWorkbenchSubagentProfile {
  const name = input.name.trim();
  if (!name) throw new Error('Sub-agent profile name is required.');
  const preferredCliKinds =
    input.preferredCliKinds
      ?.map((item) => normalizeXconWorkbenchSubagentCliKind(item))
      .filter((item): item is XconWorkbenchSubagentCliKind => Boolean(item)) ?? [];
  return {
    name,
    description: input.description?.trim() || `${name} worker`,
    systemPrompt: input.systemPrompt?.trim() || 'Complete the assigned task and return concise evidence.',
    allowedTaskKinds: input.allowedTaskKinds?.filter((item) => item.trim()).map((item) => item.trim()) ?? ['research'],
    permissionMode: normalizeXconWorkbenchSubagentPermissionMode(input.permissionMode),
    preferredCliKinds: preferredCliKinds.length ? preferredCliKinds : ['codex', 'claude', 'gemini'],
    resultSchema: 'xenesis-subagent-result-v1',
    source: input.source ?? 'global',
  };
}

function normalizeXconWorkbenchSubagentPermissionMode(value: unknown): XconWorkbenchSubagentPermissionMode {
  return typeof value === 'string' &&
    XCON_WORKBENCH_SUBAGENT_PERMISSION_MODES.has(value as XconWorkbenchSubagentPermissionMode)
    ? (value as XconWorkbenchSubagentPermissionMode)
    : 'readonly';
}

function normalizeXconWorkbenchSubagentCliKind(value: unknown): XconWorkbenchSubagentCliKind | null {
  return typeof value === 'string' && XCON_WORKBENCH_SUBAGENT_CLI_KINDS.has(value as XconWorkbenchSubagentCliKind)
    ? (value as XconWorkbenchSubagentCliKind)
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : undefined;
}

function getProfileRecords(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isRecord(value)) return [value];
  if (Array.isArray(value.profiles)) return value.profiles;
  if (Array.isArray(value.subagents)) return value.subagents;
  if (Array.isArray(value.workers)) return value.workers;
  return [value];
}

function normalizeXconWorkbenchSubagentProfileFromUnknown(
  value: unknown,
  source: XconWorkbenchSubagentProfileSource,
): XconWorkbenchSubagentProfile {
  if (!isRecord(value)) throw new Error('Sub-agent profile must be a JSON object.');
  const name = optionalString(value.name) ?? optionalString(value.id) ?? optionalString(value.profile);
  if (!name?.trim()) throw new Error('Sub-agent profile name is required.');
  return normalizeXconWorkbenchSubagentProfile({
    name,
    description: optionalString(value.description) ?? optionalString(value.summary) ?? optionalString(value.role),
    systemPrompt:
      optionalString(value.systemPrompt) ?? optionalString(value.prompt) ?? optionalString(value.instructions),
    allowedTaskKinds:
      stringArray(value.allowedTaskKinds) ?? stringArray(value.taskKinds) ?? stringArray(value.tasks) ?? undefined,
    permissionMode: normalizeXconWorkbenchSubagentPermissionMode(value.permissionMode),
    preferredCliKinds:
      stringArray(value.preferredCliKinds)
        ?.map((item) => normalizeXconWorkbenchSubagentCliKind(item))
        .filter((item): item is XconWorkbenchSubagentCliKind => Boolean(item)) ?? undefined,
    source,
  });
}

export function loadXconWorkbenchSubagentProfilesFromJsonFiles(
  files: readonly XconWorkbenchSubagentProfileJsonFile[],
): XconWorkbenchSubagentProfileLoadResult {
  const profiles: XconWorkbenchSubagentProfile[] = [];
  const diagnostics: XconWorkbenchSubagentProfileLoadDiagnostic[] = [];

  for (const file of files) {
    try {
      const parsed = JSON.parse(file.content) as unknown;
      for (const record of getProfileRecords(parsed)) {
        profiles.push(normalizeXconWorkbenchSubagentProfileFromUnknown(record, 'global'));
      }
    } catch (error) {
      diagnostics.push({
        filePath: file.filePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    profiles: mergeXconWorkbenchSubagentProfileLayers(profiles),
    diagnostics,
  };
}

export function mergeXconWorkbenchSubagentProfileLayers(
  ...layers: readonly XconWorkbenchSubagentProfile[][]
): XconWorkbenchSubagentProfile[] {
  const byName = new Map<string, XconWorkbenchSubagentProfile>();
  for (const layer of layers) {
    for (const profile of layer) byName.set(profile.name, { ...profile });
  }
  return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function mergeXconWorkbenchSubagentProfiles(
  globalProfiles: readonly XconWorkbenchSubagentProfile[],
  workspaceProfiles: readonly XconWorkbenchSubagentProfile[],
): XconWorkbenchSubagentProfile[] {
  const byName = new Map<string, XconWorkbenchSubagentProfile>();
  for (const profile of globalProfiles) byName.set(profile.name, { ...profile, source: profile.source ?? 'global' });
  for (const profile of workspaceProfiles) byName.set(profile.name, { ...profile, source: 'workspace' });
  return Array.from(byName.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function selectXconWorkbenchSubagentProfileName(
  requestedName: string,
  profiles: readonly XconWorkbenchSubagentProfile[],
): string {
  if (requestedName && profiles.some((profile) => profile.name === requestedName)) return requestedName;
  return profiles[0]?.name ?? '';
}

export function createXconWorkbenchSubagentProfileTemplateFiles(): XconWorkbenchSubagentProfileTemplateFile[] {
  const profiles: Array<{ fileName: string; profile: XconWorkbenchSubagentProfile }> = [
    {
      fileName: 'desk-reviewer.json',
      profile: normalizeXconWorkbenchSubagentProfile({
        name: 'desk-reviewer',
        description: 'Desk behavior and integration review worker',
        systemPrompt:
          'Review Xenesis Desk behavior, bridge state, UI evidence, and integration risks. Return concise evidence.',
        allowedTaskKinds: ['review', 'diagnostics', 'desk'],
        permissionMode: 'readonly',
        preferredCliKinds: ['codex', 'claude', 'gemini'],
        source: 'global',
      }),
    },
    {
      fileName: 'implementation-planner.json',
      profile: normalizeXconWorkbenchSubagentProfile({
        name: 'implementation-planner',
        description: 'Scoped implementation planning worker',
        systemPrompt:
          'Design a small implementation plan, identify files to inspect, and request approval before write actions.',
        allowedTaskKinds: ['implementation', 'planning', 'refactor'],
        permissionMode: 'safe',
        preferredCliKinds: ['codex', 'claude'],
        source: 'global',
      }),
    },
    {
      fileName: 'release-verifier.json',
      profile: normalizeXconWorkbenchSubagentProfile({
        name: 'release-verifier',
        description: 'Release verification and regression worker',
        systemPrompt:
          'Verify tests, type checks, smoke results, and release risks. Do not mutate files while verifying.',
        allowedTaskKinds: ['verification', 'release', 'test'],
        permissionMode: 'readonly',
        preferredCliKinds: ['codex', 'claude', 'gemini'],
        source: 'global',
      }),
    },
  ];

  return profiles.map(({ fileName, profile }) => ({
    fileName,
    content: JSON.stringify(
      {
        name: profile.name,
        description: profile.description,
        systemPrompt: profile.systemPrompt,
        allowedTaskKinds: profile.allowedTaskKinds,
        permissionMode: profile.permissionMode,
        preferredCliKinds: profile.preferredCliKinds,
        resultSchema: profile.resultSchema,
      },
      null,
      2,
    ),
  }));
}

export type XconWorkbenchSubagentWorkerStatus =
  | 'idle'
  | 'assigned'
  | 'running'
  | 'awaiting-result'
  | 'completed'
  | 'failed'
  | 'detached';

export interface XconWorkbenchSubagentWorker {
  workerId: string;
  terminalId: string;
  terminalTitle: string;
  cwd: string;
  cliKind: XconWorkbenchSubagentCliKind;
  profileName: string;
  managed?: boolean;
  status: XconWorkbenchSubagentWorkerStatus;
  currentTaskId?: string;
  currentTaskSummary?: string;
  lastOutput?: string;
  lastResultSummary?: string;
  sessionLink?: XconWorkbenchSubagentSessionLink;
  pendingApprovals?: XconWorkbenchSubagentApprovalRequest[];
  attachedAt: string;
  updatedAt: string;
}

export interface XconWorkbenchSubagentSessionLink {
  sessionId: string;
  source: AgentSessionSource;
  sourceSessionId: string;
  sourcePath?: string;
  resumeCommand?: string;
  title?: string;
  updatedAt?: string;
}

export interface XconWorkbenchSubagentApprovalRequest {
  approvalId: string;
  title: string;
  description: string;
  command: string;
  risk: XconWorkbenchSubagentApprovalRisk;
  status: XconWorkbenchSubagentApprovalStatus;
}

export interface CreateXconWorkbenchManagedSubagentSpawnPlanInput {
  cliKind: XconWorkbenchManagedSubagentCliKind;
  profile: XconWorkbenchSubagentProfile;
  cwd: string;
  shell?: ShellKind;
  localCliAgents?: readonly LocalCliAgentStatus[];
  terminalId?: string;
  now?: string;
}

export interface XconWorkbenchManagedSubagentSpawnPlan {
  worker: XconWorkbenchSubagentWorker;
  request: TerminalSpawnRequest;
}

export interface AttachXconWorkbenchSubagentWorkerInput {
  terminalId: string;
  terminalTitle: string;
  cwd: string;
  cliKind: XconWorkbenchSubagentCliKind;
  profileName: string;
  sessionLink?: XconWorkbenchSubagentSessionLink;
  now?: string;
}

function compactWorkerIdPart(value: string) {
  return (
    value
      .replace(/[^A-Za-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'terminal'
  );
}

export function createXconWorkbenchSubagentWorkerId(terminalId: string, now = new Date().toISOString()): string {
  const stamp = Date.parse(now);
  const suffix = Number.isFinite(stamp) ? stamp.toString(36) : 'now';
  return `worker-${compactWorkerIdPart(terminalId)}-${suffix}`;
}

function createManagedTerminalId(cliKind: XconWorkbenchManagedSubagentCliKind, now: string): string {
  const stamp = Date.parse(now);
  const suffix = Number.isFinite(stamp) ? stamp.toString(36) : Date.now().toString(36);
  return `xaw-${cliKind}-${suffix}`;
}

function quotePowerShellCommandPath(commandPath: string): string {
  return `& '${commandPath.replace(/'/g, "''")}'`;
}

function quoteCmdCommandPath(commandPath: string): string {
  return `"${commandPath.replace(/"/g, '""')}"`;
}

function quotePosixCommandPath(commandPath: string): string {
  return `'${commandPath.replace(/'/g, "'\\''")}'`;
}

function buildManagedSubagentInitialCommand(
  cliKind: XconWorkbenchManagedSubagentCliKind,
  commandPath: string,
  shell: ShellKind,
): string {
  const command = commandPath.trim() || cliKind;
  const requiresQuoting = /[\\/\s]/.test(command);
  if (!requiresQuoting) return command;
  if (shell === 'cmd') return quoteCmdCommandPath(command);
  if (shell === 'bash' || shell === 'sh' || shell === 'zsh' || shell === 'wsl') return quotePosixCommandPath(command);
  return quotePowerShellCommandPath(command);
}

export function createXconWorkbenchManagedSubagentSpawnPlan(
  input: CreateXconWorkbenchManagedSubagentSpawnPlanInput,
): XconWorkbenchManagedSubagentSpawnPlan {
  if (!XCON_WORKBENCH_MANAGED_SUBAGENT_CLI_KINDS.has(input.cliKind)) {
    throw new Error(`Unsupported managed sub-agent CLI: ${input.cliKind}`);
  }

  const now = input.now ?? new Date().toISOString();
  const terminalId = input.terminalId ?? createManagedTerminalId(input.cliKind, now);
  const workerId = createXconWorkbenchSubagentWorkerId(terminalId, now);
  const cwd = input.cwd.trim();
  const shell = input.shell ?? 'powershell';
  const agent = input.localCliAgents?.find((item) => item.id === input.cliKind && item.installed);
  const initialCommand = buildManagedSubagentInitialCommand(input.cliKind, agent?.commandPath || input.cliKind, shell);
  const createdAt = Date.parse(now);
  const timestamp = Number.isFinite(createdAt) ? createdAt : Date.now();

  const worker: XconWorkbenchSubagentWorker = {
    workerId,
    terminalId,
    terminalTitle: `${input.cliKind} · ${input.profile.name}`,
    cwd,
    cliKind: input.cliKind,
    profileName: input.profile.name,
    managed: true,
    status: 'idle',
    attachedAt: now,
    updatedAt: now,
  };

  return {
    worker,
    request: {
      id: terminalId,
      kind: 'shell',
      shell,
      cols: 120,
      rows: 36,
      cwd: cwd || undefined,
      profile: {
        id: `xaw-profile-${terminalId}`,
        name: `Xenesis ${input.profile.name} (${input.cliKind})`,
        groupId: 'xenesis-workbench',
        shell,
        cwd,
        localCliAgentId: input.cliKind,
        environmentText: '',
        initialCommand,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      metadata: {
        kind: XCON_WORKBENCH_SUBAGENT_METADATA_KIND,
        subagentId: workerId,
        workerId,
        workerProfile: input.profile.name,
        workerContractVersion: '1',
        agent: input.cliKind,
        provider: input.cliKind,
        task: 'managed-subagent',
        projectPath: cwd,
      },
    },
  };
}

export function attachXconWorkbenchSubagentWorker(
  workers: readonly XconWorkbenchSubagentWorker[],
  input: AttachXconWorkbenchSubagentWorkerInput,
): XconWorkbenchSubagentWorker[] {
  const now = input.now ?? new Date().toISOString();
  const existing = workers.find((worker) => worker.terminalId === input.terminalId);
  const next: XconWorkbenchSubagentWorker = {
    workerId: existing?.workerId ?? createXconWorkbenchSubagentWorkerId(input.terminalId, now),
    terminalId: input.terminalId,
    terminalTitle: input.terminalTitle.trim() || input.terminalId,
    cwd: input.cwd.trim(),
    cliKind: input.cliKind,
    profileName: input.profileName,
    managed: existing?.managed,
    status: existing?.status === 'detached' ? 'idle' : (existing?.status ?? 'idle'),
    currentTaskId: existing?.currentTaskId,
    currentTaskSummary: existing?.currentTaskSummary,
    lastOutput: existing?.lastOutput,
    lastResultSummary: existing?.lastResultSummary,
    sessionLink: input.sessionLink ?? existing?.sessionLink,
    attachedAt: existing?.attachedAt ?? now,
    updatedAt: now,
  };
  const remaining = workers.filter((worker) => worker.terminalId !== input.terminalId);
  return [...remaining, next].sort((left, right) => left.attachedAt.localeCompare(right.attachedAt));
}

function normalizeSubagentSessionPath(value: string | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+$/g, '')
    .toLowerCase();
}

function sourceMatchesWorkerCli(source: AgentSessionSource, cliKind: XconWorkbenchSubagentCliKind): boolean {
  return cliKind !== 'custom' && source === cliKind;
}

function compareAgentSessionUpdatedAt(left: AgentSession, right: AgentSession): number {
  const leftTime = Date.parse(left.updatedAt);
  const rightTime = Date.parse(right.updatedAt);
  return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
}

function createXconWorkbenchSubagentSessionLink(session: AgentSession): XconWorkbenchSubagentSessionLink {
  return {
    sessionId: session.id,
    source: session.source,
    sourceSessionId: session.sourceSessionId,
    sourcePath: session.sourceDetails.sourcePaths[0],
    resumeCommand: session.resumeCommand,
    title: session.title,
    updatedAt: session.updatedAt,
  };
}

export function linkXconWorkbenchSubagentSessions(
  workers: readonly XconWorkbenchSubagentWorker[],
  sessions: readonly AgentSession[],
  now = new Date().toISOString(),
): XconWorkbenchSubagentWorker[] {
  return workers.map((worker) => {
    const workerPath = normalizeSubagentSessionPath(worker.cwd);
    if (!workerPath) return worker;
    const session = sessions
      .filter(
        (candidate) =>
          sourceMatchesWorkerCli(candidate.source, worker.cliKind) &&
          normalizeSubagentSessionPath(candidate.projectPath) === workerPath,
      )
      .sort(compareAgentSessionUpdatedAt)[0];
    if (!session) return worker;
    return {
      ...worker,
      sessionLink: createXconWorkbenchSubagentSessionLink(session),
      updatedAt: now,
    };
  });
}

export function updateXconWorkbenchSubagentWorkerStatus(
  workers: readonly XconWorkbenchSubagentWorker[],
  workerId: string,
  status: XconWorkbenchSubagentWorkerStatus,
  now = new Date().toISOString(),
): XconWorkbenchSubagentWorker[] {
  return workers.map((worker) => (worker.workerId === workerId ? { ...worker, status, updatedAt: now } : worker));
}

export function detachXconWorkbenchSubagentWorker(
  workers: readonly XconWorkbenchSubagentWorker[],
  workerId: string,
  now = new Date().toISOString(),
): XconWorkbenchSubagentWorker[] {
  return updateXconWorkbenchSubagentWorkerStatus(workers, workerId, 'detached', now);
}

export type XconWorkbenchSubagentResultStatus = 'completed' | 'blocked' | 'failed';

export interface XconWorkbenchSubagentResult {
  taskId: string;
  status: XconWorkbenchSubagentResultStatus;
  summary: string;
  findings: unknown[];
  recommendedActions: string[];
  requiresApproval: XconWorkbenchSubagentApprovalRequest[];
}

export interface BuildXconWorkbenchSubagentApprovalEnvelopeInput {
  worker: XconWorkbenchSubagentWorker;
  approval: XconWorkbenchSubagentApprovalRequest;
  decision: XconWorkbenchSubagentApprovalDecision;
  note?: string;
}

export interface RecoverXconWorkbenchSubagentWorkerOutputInput {
  terminalId: string;
  scrollback: string;
  now?: string;
}

export interface BuildXconWorkbenchSubagentAssignmentEnvelopeInput {
  worker: XconWorkbenchSubagentWorker;
  profile: XconWorkbenchSubagentProfile;
  taskId: string;
  objective: string;
  context: string;
}

export function buildXconWorkbenchSubagentAssignmentEnvelope(
  input: BuildXconWorkbenchSubagentAssignmentEnvelopeInput,
): string {
  const resultExample = JSON.stringify(
    {
      taskId: input.taskId,
      status: 'completed|blocked|failed',
      summary: 'Concise result summary.',
      findings: [],
      recommendedActions: [],
      requiresApproval: [],
    },
    null,
    2,
  );

  const context = formatXconWorkbenchSubagentAssignmentContext(input.context, input.worker.sessionLink);

  return [
    '[XENESIS SUBAGENT ASSIGNMENT]',
    `worker: ${input.profile.name}`,
    `worker_id: ${input.worker.workerId}`,
    `terminal_id: ${input.worker.terminalId}`,
    `task_id: ${input.taskId}`,
    `permission: ${input.profile.permissionMode}`,
    '',
    'System prompt:',
    input.profile.systemPrompt,
    '',
    'Objective:',
    input.objective,
    '',
    'Context:',
    context,
    '',
    'Constraints:',
    '- Work as a delegated analysis worker for Xenesis Agent Workbench.',
    '- Do not modify files directly, run destructive commands, or make irreversible changes.',
    '- If a write, external call, or risky action is needed, describe it in requiresApproval instead.',
    '- Return exactly one fenced result block using the schema below.',
    '',
    'Result contract:',
    '```xenesis-subagent-result',
    resultExample,
    '```',
  ].join('\n');
}

function formatXconWorkbenchSubagentAssignmentContext(
  context: string,
  sessionLink: XconWorkbenchSubagentSessionLink | undefined,
): string {
  if (!sessionLink) return context;
  return [
    context,
    '',
    `Native session: ${sessionLink.sessionId}`,
    `source: ${sessionLink.source}`,
    `source_session_id: ${sessionLink.sourceSessionId}`,
    sessionLink.sourcePath ? `source_path: ${sessionLink.sourcePath}` : '',
    sessionLink.resumeCommand ? `resume_command: ${sessionLink.resumeCommand}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

function normalizeResultStatus(value: unknown): XconWorkbenchSubagentResultStatus {
  return value === 'completed' || value === 'blocked' || value === 'failed' ? value : 'failed';
}

function normalizeApprovalRisk(value: unknown): XconWorkbenchSubagentApprovalRisk {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'unknown';
}

function normalizeSubagentApprovalRequest(value: unknown, index: number): XconWorkbenchSubagentApprovalRequest {
  if (!isRecord(value)) {
    const text = String(value ?? '').trim();
    return {
      approvalId: `approval-${index + 1}`,
      title: text || `Approval ${index + 1}`,
      description: '',
      command: '',
      risk: 'unknown',
      status: 'pending',
    };
  }
  const approvalId =
    optionalString(value.id)?.trim() ||
    optionalString(value.approvalId)?.trim() ||
    optionalString(value.requestId)?.trim() ||
    `approval-${index + 1}`;
  const command =
    optionalString(value.command)?.trim() ||
    optionalString(value.action)?.trim() ||
    optionalString(value.tool)?.trim() ||
    optionalString(value.capability)?.trim() ||
    '';
  return {
    approvalId,
    title:
      optionalString(value.title)?.trim() ||
      optionalString(value.summary)?.trim() ||
      optionalString(value.reason)?.trim() ||
      command ||
      approvalId,
    description:
      optionalString(value.description)?.trim() ||
      optionalString(value.detail)?.trim() ||
      optionalString(value.reason)?.trim() ||
      '',
    command,
    risk: normalizeApprovalRisk(value.risk),
    status: 'pending',
  };
}

function normalizeSubagentApprovalRequests(value: unknown): XconWorkbenchSubagentApprovalRequest[] {
  return Array.isArray(value) ? value.map(normalizeSubagentApprovalRequest) : [];
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isAssignmentResultContractExample(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    value.status === 'completed|blocked|failed' &&
    value.summary === 'Concise result summary.' &&
    Array.isArray(value.findings) &&
    value.findings.length === 0 &&
    Array.isArray(value.recommendedActions) &&
    value.recommendedActions.length === 0 &&
    Array.isArray(value.requiresApproval) &&
    value.requiresApproval.length === 0
  );
}

function repairTerminalWrappedSubagentResultJson(rawJson: string): string {
  return rawJson.replace(/"\s*\r?\n\s*",/g, '",').replace(/\r?\n/g, '');
}

function parseSubagentResultJson(rawJson: string): unknown {
  try {
    return JSON.parse(rawJson);
  } catch (parseError) {
    try {
      return JSON.parse(repairTerminalWrappedSubagentResultJson(rawJson));
    } catch {
      throw parseError;
    }
  }
}

function normalizeSubagentResult(value: unknown): XconWorkbenchSubagentResult {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    taskId: typeof record.taskId === 'string' ? record.taskId : '',
    status: normalizeResultStatus(record.status),
    summary: typeof record.summary === 'string' ? record.summary : 'Sub-agent returned no summary.',
    findings: Array.isArray(record.findings) ? record.findings : [],
    recommendedActions: normalizeStringArray(record.recommendedActions),
    requiresApproval: normalizeSubagentApprovalRequests(record.requiresApproval),
  };
}

export function buildXconWorkbenchSubagentApprovalEnvelope(
  input: BuildXconWorkbenchSubagentApprovalEnvelopeInput,
): string {
  return [
    '[XENESIS SUBAGENT APPROVAL]',
    `worker_id: ${input.worker.workerId}`,
    `terminal_id: ${input.worker.terminalId}`,
    `approval_id: ${input.approval.approvalId}`,
    `decision: ${input.decision === 'approve' ? 'approved' : 'rejected'}`,
    `title: ${input.approval.title}`,
    input.note?.trim() ? `note: ${input.note.trim()}` : '',
    '',
    'Continue from the pending sub-agent task and return an updated xenesis-subagent-result block.',
  ]
    .filter((line, index, lines) => line || index < lines.length - 1)
    .join('\n');
}

export function parseXconWorkbenchSubagentResultBlocks(output: string): XconWorkbenchSubagentResult[] {
  const results: XconWorkbenchSubagentResult[] = [];
  const blockPattern = /```xenesis-subagent-result\s*([\s\S]*?)```/g;
  for (const match of output.matchAll(blockPattern)) {
    const rawJson = match[1]?.trim() ?? '';
    try {
      const parsed = parseSubagentResultJson(rawJson);
      if (!isAssignmentResultContractExample(parsed)) {
        results.push(normalizeSubagentResult(parsed));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        taskId: '',
        status: 'failed',
        summary: `Invalid subagent result JSON: ${message}`,
        findings: [],
        recommendedActions: [],
        requiresApproval: [],
      });
    }
  }
  return results;
}

export interface XconWorkbenchSubagentAssignment {
  taskId: string;
  workerId: string;
  terminalId: string;
  profileName: string;
  objective: string;
  envelope: string;
}

export interface CreateXconWorkbenchSubagentAssignmentFileTransportInput {
  assignment: XconWorkbenchSubagentAssignment;
  taskRootDir: string;
}

export interface XconWorkbenchSubagentAssignmentFileTransport {
  filePath: string;
  fileContent: string;
  terminalInput: string;
}

export function resolveXconWorkbenchSubagentStatePath(root: string, ...segments: string[]): string {
  const trimmedRoot = root.trim().replace(/[\\/]+$/, '');
  if (!trimmedRoot) throw new Error('Xenesis home is required.');
  const separator = trimmedRoot.includes('\\') ? '\\' : '/';
  const normalizedSegments = segments.map((segment) => segment.replace(/^[\\/]+|[\\/]+$/g, '')).filter(Boolean);
  const rootName = trimmedRoot
    .split(/[\\/]+/)
    .filter(Boolean)
    .pop()
    ?.toLowerCase();
  const stateRoot = rootName === 'xenesis' ? trimmedRoot : `${trimmedRoot}${separator}xenesis`;
  return [stateRoot, 'subagents', ...normalizedSegments].join(separator);
}

function joinXconWorkbenchSubagentTaskPath(root: string, fileName: string): string {
  const trimmedRoot = root.trim().replace(/[\\/]+$/, '');
  if (!trimmedRoot) throw new Error('Sub-agent assignment task root is required.');
  const separator = trimmedRoot.includes('\\') ? '\\' : '/';
  return `${trimmedRoot}${separator}${fileName.replace(/^[\\/]+/g, '')}`;
}

export function createXconWorkbenchSubagentAssignmentFileTransport(
  input: CreateXconWorkbenchSubagentAssignmentFileTransportInput,
): XconWorkbenchSubagentAssignmentFileTransport {
  const assignment = input.assignment;
  const fileName = `${compactWorkerIdPart(assignment.taskId || assignment.workerId || 'assignment')}.md`;
  const filePath = joinXconWorkbenchSubagentTaskPath(input.taskRootDir, fileName);
  const terminalInput = [
    `Read the Xenesis Agent Workbench assignment file at ${filePath}.`,
    `Follow it exactly and return exactly one fenced xenesis-subagent-result block for task ${assignment.taskId}.`,
  ].join(' ');
  return {
    filePath,
    fileContent: assignment.envelope,
    terminalInput,
  };
}

export interface CreateXconWorkbenchSubagentAssignmentPlanInput {
  prompt: string;
  workers: readonly XconWorkbenchSubagentWorker[];
  profiles: readonly XconWorkbenchSubagentProfile[];
  now?: string;
}

export function createXconWorkbenchSubagentAssignmentPlan(
  input: CreateXconWorkbenchSubagentAssignmentPlanInput,
): XconWorkbenchSubagentAssignment[] {
  const prompt = input.prompt.trim();
  if (!prompt) return [];
  const now = input.now ?? new Date().toISOString();
  const parsedNow = Date.parse(now);
  const taskStamp = Number.isFinite(parsedNow) ? parsedNow.toString(36) : 'now';
  const profilesByName = new Map(input.profiles.map((profile) => [profile.name, profile]));
  return input.workers
    .filter((worker) => worker.status === 'idle' || worker.status === 'completed' || worker.status === 'failed')
    .slice(0, 4)
    .map((worker, index) => {
      const profile = profilesByName.get(worker.profileName) ?? DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES[0]!;
      const taskId = `subtask-${taskStamp}-${index + 1}`;
      const objective = `${prompt}\n\nFocus as ${profile.name}: ${profile.description}`;
      return {
        taskId,
        workerId: worker.workerId,
        terminalId: worker.terminalId,
        profileName: profile.name,
        objective,
        envelope: buildXconWorkbenchSubagentAssignmentEnvelope({
          worker,
          profile,
          taskId,
          objective,
          context: `Workspace cwd: ${worker.cwd || 'unknown'}\nTerminal: ${worker.terminalTitle}`,
        }),
      };
    });
}

export function applyXconWorkbenchSubagentResults(
  workers: readonly XconWorkbenchSubagentWorker[],
  results: readonly XconWorkbenchSubagentResult[],
  now = new Date().toISOString(),
): XconWorkbenchSubagentWorker[] {
  return workers.map((worker) => {
    let result: XconWorkbenchSubagentResult | undefined;
    for (let index = results.length - 1; index >= 0; index -= 1) {
      const candidate = results[index];
      if (candidate?.taskId && candidate.taskId === worker.currentTaskId) {
        result = candidate;
        break;
      }
    }
    if (!result) return worker;
    const pendingApprovals = normalizeSubagentApprovalRequests(result.requiresApproval);
    return {
      ...worker,
      status:
        pendingApprovals.length > 0 || result.status === 'blocked'
          ? 'awaiting-result'
          : result.status === 'completed'
            ? 'completed'
            : 'failed',
      lastResultSummary: result.summary,
      pendingApprovals,
      updatedAt: now,
    };
  });
}

export function recoverXconWorkbenchSubagentWorkerOutput(
  workers: readonly XconWorkbenchSubagentWorker[],
  input: RecoverXconWorkbenchSubagentWorkerOutputInput,
): XconWorkbenchSubagentWorker[] {
  const scrollback = input.scrollback || '';
  if (!scrollback) return [...workers];
  const now = input.now ?? new Date().toISOString();
  const withOutput = workers.map((worker) =>
    worker.terminalId === input.terminalId
      ? {
          ...worker,
          lastOutput: scrollback.slice(-6000),
          updatedAt: now,
        }
      : worker,
  );
  const results = parseXconWorkbenchSubagentResultBlocks(scrollback);
  return results.length ? applyXconWorkbenchSubagentResults(withOutput, results, now) : withOutput;
}
