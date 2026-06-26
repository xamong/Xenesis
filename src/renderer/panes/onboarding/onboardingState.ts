import { BASIC_DESK_ONBOARDING_STEPS } from './basicDeskSteps';
import type { OnboardingProgressState, OnboardingTrackId, OnboardingVerificationSnapshot } from './onboardingTypes';

export const ONBOARDING_VERSION = 'public-v2';

export const DEFAULT_ONBOARDING_TRACK: OnboardingTrackId = 'basic-desk';

export const DEFAULT_ONBOARDING_STEP_ID = BASIC_DESK_ONBOARDING_STEPS[0]?.id ?? '';

export function createDefaultOnboardingProgress(): OnboardingProgressState {
  return {
    currentTrack: DEFAULT_ONBOARDING_TRACK,
    currentStepId: DEFAULT_ONBOARDING_STEP_ID,
    completedStepIds: [],
    skippedStepIds: [],
    verificationResults: {},
    sampleWorkspacePath: '',
  };
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function nextStepId(currentStepId: string): string {
  const index = BASIC_DESK_ONBOARDING_STEPS.findIndex((step) => step.id === currentStepId);
  if (index < 0) return DEFAULT_ONBOARDING_STEP_ID;
  return BASIC_DESK_ONBOARDING_STEPS[index + 1]?.id ?? currentStepId;
}

export function completeOnboardingStep(
  progress: OnboardingProgressState,
  stepId: string,
  verification: OnboardingVerificationSnapshot,
): OnboardingProgressState {
  return {
    ...progress,
    currentStepId: nextStepId(stepId),
    completedStepIds: uniqueStrings([...progress.completedStepIds, stepId]),
    skippedStepIds: uniqueStrings(progress.skippedStepIds.filter((id) => id !== stepId)),
    verificationResults: {
      ...progress.verificationResults,
      [stepId]: verification,
    },
  };
}

export function skipOnboardingStep(
  progress: OnboardingProgressState,
  stepId: string,
  verification: OnboardingVerificationSnapshot,
): OnboardingProgressState {
  return {
    ...progress,
    currentStepId: nextStepId(stepId),
    completedStepIds: uniqueStrings(progress.completedStepIds.filter((id) => id !== stepId)),
    skippedStepIds: uniqueStrings([...progress.skippedStepIds, stepId]),
    verificationResults: {
      ...progress.verificationResults,
      [stepId]: verification,
    },
  };
}
