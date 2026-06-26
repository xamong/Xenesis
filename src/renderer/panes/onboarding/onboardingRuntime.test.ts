import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getOnboardingSampleFilePath,
  getOnboardingWorkspaceProfilePath,
  ONBOARDING_SAMPLE_WELCOME_FILE_NAME,
  ONBOARDING_SAMPLE_WORKSPACE_FILE_NAME,
  type OnboardingRuntimeSnapshot,
  verifyBasicDeskOnboardingStep,
} from './onboardingRuntime';

const samplePath = 'C:\\Users\\tester\\.xenis-dev\\onboarding\\basic-desk';

function snapshot(overrides: Partial<OnboardingRuntimeSnapshot> = {}): OnboardingRuntimeSnapshot {
  return {
    defaultCwd: samplePath,
    sampleWorkspacePath: samplePath,
    workspacePath: '',
    contents: [],
    panes: [],
    ...overrides,
  };
}

test('onboarding runtime builds deterministic sample file paths', () => {
  assert.equal(
    getOnboardingSampleFilePath(samplePath, ONBOARDING_SAMPLE_WELCOME_FILE_NAME),
    'C:\\Users\\tester\\.xenis-dev\\onboarding\\basic-desk\\welcome.md',
  );
  assert.equal(
    getOnboardingWorkspaceProfilePath(samplePath),
    `C:\\Users\\tester\\.xenis-dev\\onboarding\\basic-desk\\${ONBOARDING_SAMPLE_WORKSPACE_FILE_NAME}`,
  );
});

test('Basic Desk verifier requires the prepared sample workspace for the workspace step', () => {
  assert.equal(verifyBasicDeskOnboardingStep('choose-workspace-folder', snapshot()).passed, true);
  assert.equal(
    verifyBasicDeskOnboardingStep('choose-workspace-folder', snapshot({ sampleWorkspacePath: '' })).passed,
    false,
  );
});

test('Basic Desk verifier checks terminal, file, panes, Command Center, settings, diagnostics, and workspace profile', () => {
  const welcomePath = getOnboardingSampleFilePath(samplePath, ONBOARDING_SAMPLE_WELCOME_FILE_NAME);
  const workspaceProfilePath = getOnboardingWorkspaceProfilePath(samplePath);
  const state = snapshot({
    workspacePath: workspaceProfilePath,
    contents: [
      {
        id: 'terminal-1',
        title: 'PowerShell 1',
        contentType: 'terminal',
        state: 'document',
        termId: 'terminal-1',
        terminalCwd: samplePath,
      },
      {
        id: 'welcome',
        title: 'welcome.md',
        contentType: 'markdown',
        state: 'document',
        filePath: welcomePath,
        fileName: ONBOARDING_SAMPLE_WELCOME_FILE_NAME,
      },
      { id: 'command', title: 'Command Center', contentType: 'command-center', state: 'bottom' },
      { id: 'settings', title: 'Settings', contentType: 'settings', state: 'document' },
      { id: 'diagnostics', title: 'Diagnostics', contentType: 'diagnostics', state: 'bottom' },
    ],
    panes: [
      { id: 'pane-1', state: 'document', contents: ['terminal-1'], activeContentId: 'terminal-1' },
      { id: 'pane-2', state: 'document', contents: ['welcome'], activeContentId: 'welcome' },
      { id: 'pane-3', state: 'bottom', contents: ['command', 'diagnostics'], activeContentId: 'diagnostics' },
    ],
  });

  for (const stepId of [
    'open-terminal',
    'open-file-preview',
    'arrange-panes',
    'use-command-center',
    'open-settings-diagnostics',
    'save-restore-workspace',
  ]) {
    assert.equal(verifyBasicDeskOnboardingStep(stepId, state).passed, true, `${stepId} should pass`);
  }

  assert.equal(verifyBasicDeskOnboardingStep('open-file-preview', snapshot()).passed, false);
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'arrange-panes',
      snapshot({ panes: [{ id: 'pane-1', state: 'document', contents: ['only'], activeContentId: 'only' }] }),
    ).passed,
    false,
  );
});
