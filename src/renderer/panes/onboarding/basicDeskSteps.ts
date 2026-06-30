import type { OnboardingStepDefinition } from './onboardingTypes';

export const BASIC_DESK_ONBOARDING_STEPS: OnboardingStepDefinition[] = [
  {
    id: 'choose-workspace-folder',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepWorkspaceTitle',
    descriptionKey: 'app.onboardingStepWorkspaceDesc',
    actions: [
      {
        id: 'prepare-sample',
        labelKey: 'app.onboardingPrepareSample',
        descriptionKey: 'app.onboardingPrepareSampleDesc',
        capabilityPaths: ['xd.onboarding.sample.prepare'],
        primary: true,
      },
      {
        id: 'choose-folder',
        labelKey: 'app.onboardingOpenFolder',
        descriptionKey: 'app.onboardingOpenFolderDesc',
        capabilityPaths: ['xd.fs.selectDir'],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyWorkspace',
      capabilityPaths: ['xd.workspace.currentPath'],
    },
    demo: {
      captionKey: 'app.onboardingDemoWorkspaceCaption',
      highlightTarget: 'explorer',
      estimatedSeconds: 12,
      nextCueKey: 'app.onboardingDemoWorkspaceNext',
    },
    skipAllowed: false,
  },
  {
    id: 'configure-ai-provider',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepProviderTitle',
    descriptionKey: 'app.onboardingStepProviderDesc',
    actions: [
      {
        id: 'open-ai-provider-settings',
        labelKey: 'app.onboardingOpenAiProviderSettings',
        descriptionKey: 'app.onboardingOpenAiProviderSettingsDesc',
        capabilityPaths: ['xd.settings.sections.run-model', 'xd.xenesis.providers.routing.status'],
        primary: true,
      },
      {
        id: 'open-provider-setup-plan',
        labelKey: 'app.onboardingOpenProviderSetupPlan',
        descriptionKey: 'app.onboardingOpenProviderSetupPlanDesc',
        capabilityPaths: ['xd.xenesis.providers.setupPlans.open', 'xd.xenesis.providers.setupPlans.status'],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyProvider',
      capabilityPaths: ['xd.xenesis.providers.setup.status', 'xd.xenesis.providers.routing.status'],
    },
    demo: {
      captionKey: 'app.onboardingDemoProviderCaption',
      highlightTarget: 'provider-setup',
      estimatedSeconds: 16,
      nextCueKey: 'app.onboardingDemoProviderNext',
    },
    skipAllowed: true,
  },
  {
    id: 'connect-external-tools',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepExternalToolsTitle',
    descriptionKey: 'app.onboardingStepExternalToolsDesc',
    actions: [
      {
        id: 'open-external-tool-setup',
        labelKey: 'app.onboardingOpenExternalToolSetup',
        descriptionKey: 'app.onboardingOpenExternalToolSetupDesc',
        capabilityPaths: ['xd.xenesis.tools.setupPlans.open', 'xd.xenesis.tools.setupPlans.status'],
        primary: true,
      },
      {
        id: 'open-tool-connectors',
        labelKey: 'app.onboardingOpenToolConnectors',
        descriptionKey: 'app.onboardingOpenToolConnectorsDesc',
        capabilityPaths: ['xd.xenesis.tools.connectors.open', 'xd.xenesis.tools.connectors.status'],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyExternalTools',
      capabilityPaths: [
        'xd.xenesis.tools.setupPlans.status',
        'xd.xenesis.tools.connectors.status',
        'xd.xenesis.tools.runtime.status',
      ],
    },
    demo: {
      captionKey: 'app.onboardingDemoExternalToolsCaption',
      highlightTarget: 'external-tool-setup',
      estimatedSeconds: 18,
      nextCueKey: 'app.onboardingDemoExternalToolsNext',
    },
    skipAllowed: true,
  },
  {
    id: 'configure-mcp',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepMcpTitle',
    descriptionKey: 'app.onboardingStepMcpDesc',
    actions: [
      {
        id: 'open-mcp-setup',
        labelKey: 'app.onboardingOpenMcpSetup',
        descriptionKey: 'app.onboardingOpenMcpSetupDesc',
        capabilityPaths: ['xd.xenesis.tools.mcpInstallDrafts.open', 'xd.xenesis.tools.mcpInstallDrafts.status'],
        primary: true,
      },
      {
        id: 'open-mcp-oauth',
        labelKey: 'app.onboardingOpenMcpOauth',
        descriptionKey: 'app.onboardingOpenMcpOauthDesc',
        capabilityPaths: ['xd.xenesis.tools.mcpOAuth.open', 'xd.xenesis.tools.mcpOAuth.status'],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyMcp',
      capabilityPaths: [
        'xd.xenesis.tools.mcpInstallDrafts.status',
        'xd.xenesis.tools.mcpOAuth.status',
        'xd.mcp.settings.status',
      ],
    },
    demo: {
      captionKey: 'app.onboardingDemoMcpCaption',
      highlightTarget: 'mcp-readiness',
      estimatedSeconds: 18,
      nextCueKey: 'app.onboardingDemoMcpNext',
    },
    skipAllowed: true,
  },
  {
    id: 'open-settings-diagnostics',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepSettingsTitle',
    descriptionKey: 'app.onboardingStepSettingsDesc',
    actions: [
      {
        id: 'open-settings',
        labelKey: 'app.onboardingOpenWorkspace',
        descriptionKey: 'app.onboardingOpenWorkspaceDesc',
        capabilityPaths: ['xd.settings.sections.workspace'],
        primary: true,
      },
      {
        id: 'open-diagnostics',
        labelKey: 'app.onboardingOpenDiagnostics',
        descriptionKey: 'app.onboardingOpenDiagnosticsDesc',
        capabilityPaths: ['xd.panes.diagnostics.open'],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifySettings',
      capabilityPaths: ['xd.settings.visible', 'xd.diagnostics.visible'],
    },
    demo: {
      captionKey: 'app.onboardingDemoSettingsCaption',
      highlightTarget: 'settings-diagnostics',
      estimatedSeconds: 16,
      nextCueKey: 'app.onboardingDemoSettingsNext',
    },
    skipAllowed: true,
  },
  {
    id: 'save-restore-workspace',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepRestoreTitle',
    descriptionKey: 'app.onboardingStepRestoreDesc',
    actions: [
      {
        id: 'save-workspace',
        labelKey: 'app.onboardingSaveWorkspace',
        descriptionKey: 'app.onboardingSaveWorkspaceDesc',
        capabilityPaths: ['xd.workspace.save'],
        primary: true,
      },
      {
        id: 'restore-workspace',
        labelKey: 'app.onboardingRestoreWorkspace',
        descriptionKey: 'app.onboardingRestoreWorkspaceDesc',
        capabilityPaths: ['xd.workspace.open'],
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyRestore',
      capabilityPaths: ['xd.workspace.profiles'],
    },
    demo: {
      captionKey: 'app.onboardingDemoRestoreCaption',
      highlightTarget: 'workspace-controls',
      estimatedSeconds: 12,
      nextCueKey: 'app.onboardingDemoRestoreNext',
    },
    skipAllowed: true,
  },
];

export const BASIC_DESK_ONBOARDING_STEP_IDS = BASIC_DESK_ONBOARDING_STEPS.map((step) => step.id);

export function findBasicDeskOnboardingStep(stepId: string): OnboardingStepDefinition | null {
  return BASIC_DESK_ONBOARDING_STEPS.find((step) => step.id === stepId) ?? null;
}
