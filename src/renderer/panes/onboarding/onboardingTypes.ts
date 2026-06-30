export type OnboardingTrackId = 'basic-desk';

export type OnboardingMode = 'learn' | 'demo';

export type OnboardingActionId =
  | 'choose-folder'
  | 'open-ai-provider-settings'
  | 'open-provider-setup-plan'
  | 'open-external-tool-setup'
  | 'open-tool-connectors'
  | 'open-mcp-setup'
  | 'open-mcp-oauth'
  | 'open-terminal'
  | 'open-file'
  | 'arrange-panes'
  | 'open-command-center'
  | 'open-settings'
  | 'open-diagnostics'
  | 'save-workspace'
  | 'restore-workspace'
  | 'prepare-sample'
  | 'verify'
  | 'skip';

export type OnboardingVerificationState = 'idle' | 'pending' | 'passed' | 'failed' | 'skipped';

export interface OnboardingActionDefinition {
  id: OnboardingActionId;
  labelKey: string;
  descriptionKey: string;
  capabilityPaths: string[];
  primary?: boolean;
}

export interface OnboardingVerificationDefinition {
  labelKey: string;
  capabilityPaths: string[];
}

export interface OnboardingDemoMetadata {
  captionKey: string;
  highlightTarget: string;
  estimatedSeconds: number;
  nextCueKey: string;
}

export interface OnboardingStepDefinition {
  id: string;
  track: OnboardingTrackId;
  titleKey: string;
  descriptionKey: string;
  actions: OnboardingActionDefinition[];
  verification: OnboardingVerificationDefinition;
  demo: OnboardingDemoMetadata;
  skipAllowed: boolean;
}

export interface OnboardingVerificationSnapshot {
  state: OnboardingVerificationState;
  checkedAt: number;
  message: string;
}

export interface OnboardingProgressState {
  currentTrack: OnboardingTrackId;
  currentStepId: string;
  completedStepIds: string[];
  skippedStepIds: string[];
  verificationResults: Record<string, OnboardingVerificationSnapshot>;
  sampleWorkspacePath: string;
}

export interface OnboardingVerificationContext {
  sampleWorkspacePath: string;
}

export interface OnboardingStepVerificationResult {
  passed: boolean;
  message?: string;
}

export type OnboardingStepVerifier = (
  stepId: string,
  context: OnboardingVerificationContext,
) => OnboardingStepVerificationResult | Promise<OnboardingStepVerificationResult>;
