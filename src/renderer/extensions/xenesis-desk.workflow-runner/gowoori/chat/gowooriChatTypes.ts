import type { AiProviderProfile, AiProviderSettings } from '../../../../../shared/types';
import type { GowooriArtifactActionState } from '../agent/gowooriArtifactPipeline';
import type { GowooriArtifactRepairDiagnostic } from '../agent/gowooriArtifactRepair';
import type { GowooriTargetMode } from '../agent/gowooriChatRunController';
import type { GowooriProvider, GowooriRequestMode } from '../agent/gowooriProviders';
import type { GowooriChatTranscriptMessage } from './panes/GowooriChatTranscriptPanel';

export type GowooriChatInspectorTab = 'chat' | 'stream' | 'repair' | 'quality';
export type GowooriChatUiMode = 'user' | 'simple' | 'advanced';

export type GowooriUserTargetPreference =
  | { mode: 'always-new' }
  | { mode: 'sticky'; targetId: GowooriTargetMode; targetLabel: string };

export type GowooriSimpleProgressStepId = 'prompt' | 'streaming' | 'preflight' | 'apply';
export type GowooriSimpleProgressStepState = 'pending' | 'active' | 'done' | 'blocked';
export type GowooriSimpleSetupStepState = 'ready' | 'warning' | 'safe';
export type GowooriSimpleResultSummaryTone = 'idle' | 'generating' | 'ready' | 'applied' | 'blocked' | 'waiting';

export interface GowooriChatMessage extends GowooriChatTranscriptMessage {}

export interface GowooriSimpleProgressStep {
  id: GowooriSimpleProgressStepId;
  label: string;
  state: GowooriSimpleProgressStepState;
}

export interface GowooriSimpleSetupStep {
  id: 'provider' | 'target' | 'safety';
  label: string;
  detail: string;
  state: GowooriSimpleSetupStepState;
}

export interface GowooriSimpleProgressInput {
  hasPrompt: boolean;
  isGenerating: boolean;
  rawStream: string;
  latestSourceState: GowooriArtifactActionState | null;
}

export interface GowooriSimpleSetupChecklistInput {
  providerLabel: string;
  providerReady: boolean;
  providerDetail: string;
  targetLabel: string;
  targetReady: boolean;
  autoApply: boolean;
  livePreview: boolean;
}

export interface GowooriSimpleResultSummary {
  tone: GowooriSimpleResultSummaryTone;
  title: string;
  description: string;
  nextActionLabel: string;
  statusText: string;
}

export interface GowooriSimpleArtifactSummary {
  title: string;
  description: string;
  sourceSizeLabel: string;
  stateLabel: string;
  canPreview: boolean;
}

export interface GowooriSimpleResultSummaryInput extends GowooriSimpleProgressInput {
  status: string;
}

export interface GowooriChatRepairDiagnostic {
  id: string;
  context: string;
  changed: boolean;
  renderable: boolean;
  diagnostics: GowooriArtifactRepairDiagnostic[];
}

export interface ActiveAiProviderProfileState {
  activeAiProviderProfileId: string;
  activeAiProviderProfileName: string;
  profiles: AiProviderProfile[];
  settings: AiProviderSettings | null;
}

export interface GowooriSimplePromptPreset {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

export interface GowooriSimpleRefinementPromptPreset {
  id: string;
  label: string;
  description: string;
  requestMode: GowooriRequestMode;
  prompt: string;
}

export interface GowooriProviderOption {
  id: GowooriProvider;
  label: string;
}
