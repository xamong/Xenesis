import assert from 'node:assert/strict';
import test from 'node:test';
import { BASIC_DESK_ONBOARDING_STEPS } from './basicDeskSteps';
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

test('Basic Desk onboarding includes CR-backed initial setup steps', () => {
  const stepIds = BASIC_DESK_ONBOARDING_STEPS.map((step) => step.id);
  assert.deepEqual(stepIds, [
    'choose-workspace-folder',
    'configure-ai-provider',
    'connect-external-tools',
    'configure-mcp',
    'open-settings-diagnostics',
    'save-restore-workspace',
  ]);
  assert.equal(stepIds.includes('open-terminal'), false);
  assert.equal(stepIds.includes('open-file-preview'), false);
  assert.equal(stepIds.includes('arrange-panes'), false);
  assert.equal(stepIds.includes('use-command-center'), false);

  const workspaceIndex = stepIds.indexOf('choose-workspace-folder');
  const providerIndex = stepIds.indexOf('configure-ai-provider');
  const toolsIndex = stepIds.indexOf('connect-external-tools');
  const mcpIndex = stepIds.indexOf('configure-mcp');
  const providerStep = BASIC_DESK_ONBOARDING_STEPS[providerIndex];
  const toolsStep = BASIC_DESK_ONBOARDING_STEPS[toolsIndex];
  const mcpStep = BASIC_DESK_ONBOARDING_STEPS[mcpIndex];

  assert.equal(providerIndex, workspaceIndex + 1);
  assert.equal(toolsIndex, workspaceIndex + 2);
  assert.equal(mcpIndex, workspaceIndex + 3);
  assert.equal(providerStep?.titleKey, 'app.onboardingStepProviderTitle');
  assert.equal(providerStep?.actions[0]?.id, 'open-ai-provider-settings');
  assert.equal(providerStep?.actions[0]?.capabilityPaths.includes('xd.settings.sections.run-model'), true);
  assert.equal(providerStep?.actions[1]?.id, 'open-provider-setup-plan');
  assert.equal(providerStep?.actions[1]?.capabilityPaths.includes('xd.xenesis.providers.setupPlans.open'), true);
  assert.equal(providerStep?.verification.capabilityPaths.includes('xd.xenesis.providers.setup.status'), true);
  assert.equal(providerStep?.verification.capabilityPaths.includes('xd.xenesis.providers.routing.status'), true);
  assert.equal(toolsStep?.titleKey, 'app.onboardingStepExternalToolsTitle');
  assert.equal(toolsStep?.actions[0]?.id, 'open-external-tool-setup');
  assert.equal(toolsStep?.actions[0]?.capabilityPaths.includes('xd.xenesis.tools.setupPlans.open'), true);
  assert.equal(toolsStep?.actions[0]?.capabilityPaths.includes('xd.xenesis.integrations.status'), true);
  assert.equal(toolsStep?.actions[1]?.id, 'open-tool-connectors');
  assert.equal(toolsStep?.actions[1]?.capabilityPaths.includes('xd.xenesis.tools.connectors.open'), true);
  assert.equal(toolsStep?.actions[1]?.capabilityPaths.includes('xd.xenesis.integrations.doctor.status'), true);
  assert.equal(toolsStep?.verification.capabilityPaths.includes('xd.xenesis.tools.setupPlans.status'), true);
  assert.equal(toolsStep?.verification.capabilityPaths.includes('xd.xenesis.tools.runtime.status'), true);
  assert.equal(toolsStep?.verification.capabilityPaths.includes('xd.xenesis.integrations.status'), true);
  assert.equal(toolsStep?.verification.capabilityPaths.includes('xd.xenesis.integrations.doctor.status'), true);
  assert.equal(mcpStep?.titleKey, 'app.onboardingStepMcpTitle');
  assert.equal(mcpStep?.actions[0]?.id, 'open-mcp-setup');
  assert.equal(mcpStep?.actions[0]?.capabilityPaths.includes('xd.xenesis.tools.mcpInstallDrafts.open'), true);
  assert.equal(mcpStep?.actions[1]?.id, 'open-mcp-oauth');
  assert.equal(mcpStep?.actions[1]?.capabilityPaths.includes('xd.xenesis.tools.mcpOAuth.open'), true);
  assert.equal(mcpStep?.verification.capabilityPaths.includes('xd.xenesis.tools.mcpInstallDrafts.status'), true);
  assert.equal(mcpStep?.verification.capabilityPaths.includes('xd.xenesis.tools.mcpOAuth.status'), true);
  assert.equal(mcpStep?.verification.capabilityPaths.includes('xd.mcp.settings.status'), true);
});

test('external integration onboarding step requires native integration doctor readiness', () => {
  const step = BASIC_DESK_ONBOARDING_STEPS.find((item) => item.id === 'connect-external-tools');
  assert.ok(step, 'connect-external-tools step exists');
  assert.equal(
    step.verification.capabilityPaths.includes('xd.xenesis.integrations.doctor.status'),
    true,
    'external tool onboarding checks native integration doctor readiness through CR',
  );
});

test('Basic Desk verifier checks initial setup settings targets', () => {
  const settingsContent = { id: 'settings', title: 'Settings', contentType: 'settings', state: 'document' } as const;

  assert.equal(
    verifyBasicDeskOnboardingStep(
      'configure-ai-provider',
      snapshot({
        contents: [settingsContent],
        settingsTarget: { category: 'workspace', section: '', mode: '', focusConnectionDetail: '' },
      }),
    ).passed,
    false,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'configure-ai-provider',
      snapshot({
        contents: [settingsContent],
        settingsTarget: { category: 'run-model', section: 'provider-connection', mode: '', focusConnectionDetail: '' },
      }),
    ).passed,
    true,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'configure-ai-provider',
      snapshot({
        contents: [settingsContent],
        settingsTarget: {
          category: 'xenesis-agent',
          section: 'xenesis-connections',
          mode: 'connections',
          focusConnectionDetail: 'provider-setup-plan',
        },
      }),
    ).passed,
    true,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'connect-external-tools',
      snapshot({
        contents: [settingsContent],
        settingsTarget: {
          category: 'xenesis-agent',
          section: 'xenesis-connections',
          mode: 'connections',
          focusConnectionDetail: 'tool-setup-plan',
        },
      }),
    ).passed,
    true,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'connect-external-tools',
      snapshot({
        contents: [settingsContent],
        settingsTarget: {
          category: 'xenesis-agent',
          section: 'xenesis-connections',
          mode: 'connections',
          focusConnectionDetail: 'tool-runtime',
        },
      }),
    ).passed,
    true,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'configure-mcp',
      snapshot({
        contents: [settingsContent],
        settingsTarget: {
          category: 'xenesis-agent',
          section: 'xenesis-connections',
          mode: 'connections',
          focusConnectionDetail: 'mcp-install-draft',
        },
      }),
    ).passed,
    true,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'configure-mcp',
      snapshot({
        contents: [settingsContent],
        settingsTarget: {
          category: 'xenesis-agent',
          section: 'xenesis-connections',
          mode: 'connections',
          focusConnectionDetail: 'tool-mcp-oauth',
        },
      }),
    ).passed,
    true,
  );
  assert.equal(
    verifyBasicDeskOnboardingStep(
      'connect-external-tools',
      snapshot({
        contents: [settingsContent],
        settingsTarget: {
          category: 'xenesis-agent',
          section: 'xenesis-connections',
          mode: 'connections',
          focusConnectionDetail: 'provider-setup-plan',
        },
      }),
    ).passed,
    false,
  );
});

test('Basic Desk verifier checks settings, diagnostics, and workspace profile', () => {
  const workspaceProfilePath = getOnboardingWorkspaceProfilePath(samplePath);
  const state = snapshot({
    workspacePath: workspaceProfilePath,
    contents: [
      { id: 'settings', title: 'Settings', contentType: 'settings', state: 'document' },
      { id: 'diagnostics', title: 'Diagnostics', contentType: 'diagnostics', state: 'bottom' },
    ],
    panes: [
      { id: 'pane-1', state: 'document', contents: ['settings'], activeContentId: 'settings' },
      { id: 'pane-2', state: 'bottom', contents: ['diagnostics'], activeContentId: 'diagnostics' },
    ],
  });

  for (const stepId of ['open-settings-diagnostics', 'save-restore-workspace']) {
    assert.equal(verifyBasicDeskOnboardingStep(stepId, state).passed, true, `${stepId} should pass`);
  }

  assert.equal(verifyBasicDeskOnboardingStep('open-settings-diagnostics', snapshot()).passed, false);
  assert.equal(verifyBasicDeskOnboardingStep('save-restore-workspace', snapshot()).passed, false);
});
