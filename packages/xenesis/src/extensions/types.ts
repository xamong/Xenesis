import type { ExtensionsConfig } from '../config/index.js';
import type { ProviderCapabilities } from '../providers/registry.js';
import type { ToolRegistry } from '../tools/index.js';
import type { MemoryKind, MemoryRunbook } from './memoryTypes.js';

export type ExtensionKind = 'mcp' | 'subagent' | 'memory' | 'plugin' | 'skill';
export type ExtensionCapabilitySourceKind = 'memory' | 'subagent' | 'mcp' | 'plugin' | 'skill';
export type ExtensionCapabilityIntent =
  | 'read'
  | 'search'
  | 'create'
  | 'edit'
  | 'delete'
  | 'open'
  | 'arrange'
  | 'run'
  | 'schedule'
  | 'export'
  | 'verify'
  | 'approve'
  | 'context'
  | 'tool'
  | 'workflow';
export type ExtensionRuntimeSurface =
  | 'system_context'
  | 'tool_registry'
  | 'mcp_client'
  | 'plugin_loader'
  | 'subagent_runner'
  | 'memory_store';
export type ExtensionApprovalPolicy = 'not_applicable' | 'tool_policy' | 'capability_policy' | 'configuration';

export interface ExtensionCapabilityDescriptor {
  sourceKind: ExtensionCapabilitySourceKind;
  intentKinds: ExtensionCapabilityIntent[];
  runtimeSurface: ExtensionRuntimeSurface;
  configuredBy: string;
  approvalPolicy: ExtensionApprovalPolicy;
  verificationHint?: string;
}

export interface ExtensionDescriptor {
  kind: ExtensionKind;
  name: string;
  enabled: boolean;
  summary: string;
  role?: string;
  purpose?: string;
  whenToUse?: string;
  capabilities?: ExtensionCapabilityDescriptor[];
}

export interface ExtensionCatalog {
  config: ExtensionsConfig;
  descriptors: ExtensionDescriptor[];
}

export type ExtensionActivationRequirementKind =
  | 'extension_capability'
  | 'required_capability'
  | 'required_mcp_server'
  | 'target_surface'
  | 'verification_command'
  | 'setup_prerequisite'
  | 'execution_mode';

export type ExtensionActivationRequirementStatus = 'configured' | 'declared' | 'disabled' | 'missing';

export interface ExtensionActivationRequirement {
  id: string;
  sourceKind: ExtensionCapabilitySourceKind;
  sourceName: string;
  requirementKind: ExtensionActivationRequirementKind;
  value: string;
  status: ExtensionActivationRequirementStatus;
  configuredBy?: string;
  verificationHint?: string;
}

export interface ExtensionActivationPlan {
  requirements: ExtensionActivationRequirement[];
  missing: ExtensionActivationRequirement[];
}

export type MemoryStatus = 'active' | 'stale' | 'archived';

export interface MemoryRecord {
  id: string;
  text: string;
  tags: string[];
  /** Memory semantic kind. Procedure memories carry a structured runbook payload. */
  kind?: MemoryKind;
  runbook?: MemoryRunbook;
  source?: string;
  priority?: number;
  updatedAt: string;
  /** Lifecycle state managed by curator Tier-A (pure GC). Absent ⇒ treated as "active". */
  status?: MemoryStatus;
  /** Pin-protect: pinned records are NEVER auto-transitioned or pruned. */
  pinned?: boolean;
  /** Last time this record was read/used; the primary curation anchor when present. */
  lastAccessedAt?: string;
  /** Creation timestamp; curation anchor fallback when lastAccessedAt is absent. */
  createdAt?: string;
  /** Semantic embedding vector (Float32, L2-normalized). Persisted as BLOB in DB; absent = keyword fallback. */
  embedding?: Float32Array;
  /** Governance classification attached by the Evidence-Governed Memory ledger. */
  sensitivity?: 'low' | 'medium' | 'high' | 'restricted';
  /** Proposal or memory IDs this record conflicts with; conflicts must not silently overwrite state. */
  conflictsWith?: string[];
  /** First instant when this memory should be treated as valid. Absent means valid from creation. */
  validFrom?: string;
  /** First instant when this memory should no longer be treated as current. Exclusive. */
  validTo?: string;
  /** Memory IDs this record supersedes. */
  supersedes?: string[];
  /** Memory ID that fully superseded this record. */
  supersededBy?: string;
  /** Memory IDs that partially supersede this record as scoped exceptions. */
  partialSupersededBy?: string[];
  /** Whether this record supersedes another record fully or as a scoped exception. */
  supersedeMode?: 'full' | 'partial';
  /** Durable evidence IDs that support this memory. */
  evidenceIds?: string[];
  /** Explicit reason used when accepted memory has no durable evidence snapshot. */
  noEvidenceReason?: string;
  /** When a record was archived by governed delete. */
  archivedAt?: string;
}

export type MemoryTemporalField =
  | 'validFrom'
  | 'validTo'
  | 'supersedes'
  | 'supersededBy'
  | 'partialSupersededBy'
  | 'supersedeMode';

export interface MemoryInput {
  id: string;
  text: string;
  tags?: string[];
  kind?: MemoryKind;
  runbook?: MemoryRunbook;
  source?: string;
  priority?: number;
  status?: MemoryStatus;
  pinned?: boolean;
  lastAccessedAt?: string;
  createdAt?: string;
  sensitivity?: MemoryRecord['sensitivity'];
  conflictsWith?: string[];
  validFrom?: string;
  validTo?: string;
  supersedes?: string[];
  supersededBy?: string;
  partialSupersededBy?: string[];
  supersedeMode?: MemoryRecord['supersedeMode'];
  evidenceIds?: string[];
  noEvidenceReason?: string;
  archivedAt?: string;
}

export interface MemoryStore {
  upsert(input: MemoryInput): Promise<MemoryRecord>;
  get(id: string): Promise<MemoryRecord | undefined>;
  remove(id: string): Promise<void>;
  list(): Promise<MemoryRecord[]>;
  search(query: string): Promise<MemoryRecord[]>;
}

export interface SubagentDefinition {
  name: string;
  description: string;
  model?: string;
  tools: string[];
}

export interface PluginToolDescriptor {
  name: string;
  entry: string;
  exportName: string;
  description?: string;
}

export type PluginWorkflowStepInput = 'original' | 'previous';

export interface PluginWorkflowStepDescriptor {
  name: string;
  description?: string;
  mode?: 'plan' | 'work';
  input?: PluginWorkflowStepInput;
  prompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  metadata?: Record<string, unknown>;
}

export interface PluginWorkflowDescriptor extends PluginWorkflowStepDescriptor {
  steps?: PluginWorkflowStepDescriptor[];
}

export interface PluginProviderDescriptor {
  name: string;
  entry: string;
  exportName: string;
  capabilities: ProviderCapabilities;
}

export interface PluginManifest {
  name: string;
  version?: string;
  tools: PluginToolDescriptor[];
  workflows: PluginWorkflowDescriptor[];
  mcpServers: ExtensionsConfig['mcpServers'];
  providers: PluginProviderDescriptor[];
}

export type SkillPromptBlock = { type: 'text'; text: string };

export interface SkillPromptContext {
  workspaceRoot?: string;
  skillRoot?: string;
  isGit?: () => boolean | Promise<boolean>;
}

export interface BundledSkillDefinition {
  name: string;
  description: string;
  aliases?: string[];
  whenToUse?: string;
  argumentHint?: string;
  allowedTools?: string[];
  model?: string;
  effort?: string;
  disableModelInvocation?: boolean;
  userInvocable?: boolean;
  context?: 'inline' | 'fork';
  agent?: string;
  skillRoot?: string;
  files?: Record<string, string>;
  hooks?: Record<string, unknown>;
  isEnabled?: () => boolean;
  getPromptForCommand: (args: string, context: SkillPromptContext) => Promise<SkillPromptBlock[]>;
}

export interface SkillCommand {
  type: 'prompt';
  name: string;
  description: string;
  aliases?: string[];
  hasUserSpecifiedDescription: true;
  allowedTools: string[];
  argumentHint?: string;
  whenToUse?: string;
  model?: string;
  effort?: string;
  disableModelInvocation: boolean;
  userInvocable: boolean;
  contentLength: number;
  source: 'bundled';
  loadedFrom: 'bundled';
  context?: 'inline' | 'fork';
  agent?: string;
  skillRoot?: string;
  hooks?: Record<string, unknown>;
  isEnabled?: () => boolean;
  isHidden: boolean;
  progressMessage: 'running';
  getPromptForCommand: (args: string, context: SkillPromptContext) => Promise<SkillPromptBlock[]>;
}

export interface BuiltinPluginDefinition {
  name: string;
  description: string;
  version?: string;
  defaultEnabled?: boolean;
  isAvailable?: () => boolean;
  skills?: BundledSkillDefinition[];
  hooks?: Record<string, unknown>;
  mcpServers?: ExtensionsConfig['mcpServers'];
}

export interface BuiltinPluginSettings {
  enabledPlugins?: Record<string, boolean>;
}

export interface LoadedBuiltinPlugin {
  name: string;
  manifest: {
    name: string;
    description: string;
    version?: string;
  };
  path: 'builtin';
  source: string;
  repository: string;
  enabled: boolean;
  isBuiltin: true;
  hooksConfig?: Record<string, unknown>;
  mcpServers?: ExtensionsConfig['mcpServers'];
}

export interface PluginStateRecord {
  path: string;
  name?: string;
  enabled: boolean;
  installedAt: string;
  updatedAt: string;
}

export interface LoadPluginToolsOptions {
  workspaceRoot: string;
  paths: string[];
  pluginLoadPolicy?: 'strict' | 'tolerant';
}

export interface CreateRuntimeToolRegistryOptions {
  baseTools: ToolRegistry;
  workspaceRoot: string;
  pluginPaths: string[];
  pluginLoadPolicy?: 'strict' | 'tolerant';
}

export interface PluginRuntimeDiagnostic {
  path: string;
  ok: boolean;
  pluginName?: string;
  toolCount?: number;
  version?: string;
  toolNames?: string[];
  workflowCount?: number;
  workflowNames?: string[];
  mcpServerCount?: number;
  message?: string;
}

export interface SkillRequiresSpec {
  bins?: string[];
  anyBins?: string[];
  env?: string[];
  config?: string[];
}

export interface SkillInstallSpec {
  id?: string;
  kind: 'brew' | 'node' | 'go' | 'uv' | 'download';
  label?: string;
  bins?: string[];
  os?: string[];
  formula?: string;
  package?: string;
  module?: string;
  url?: string;
  archive?: string;
  extract?: boolean;
  stripComponents?: number;
  targetDir?: string;
}

export interface SkillDefinition {
  name: string;
  description: string;
  path: string;
  body: string;
  type?: 'prompt' | 'command';
  context?: 'inline' | 'fork';
  disableModelInvocation?: boolean;
  model?: string;
  effort?: string;
  allowedTools?: string[];
  operationalMetadata?: SkillOperationalMetadata;
  unsafeMetadataKeys?: string[];
  requires?: SkillRequiresSpec;
  os?: string[];
  install?: SkillInstallSpec[];
  always?: boolean;
}

export type SkillExecutionMode = 'prompt_only' | 'tool_assisted' | 'executable';

export interface SkillOperationalMetadata {
  requiredCapabilities?: string[];
  requiredMcpServers?: string[];
  targetSurfaces?: string[];
  verificationCommands?: string[];
  setupPrerequisites?: string[];
  executionMode?: SkillExecutionMode;
}

export interface SkillSummary {
  name: string;
  description: string;
  path: string;
  operationalMetadata?: SkillOperationalMetadata;
}
