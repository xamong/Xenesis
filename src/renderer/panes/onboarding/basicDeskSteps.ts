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
    id: 'open-terminal',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepTerminalTitle',
    descriptionKey: 'app.onboardingStepTerminalDesc',
    actions: [
      {
        id: 'open-terminal',
        labelKey: 'app.onboardingOpenTerminal',
        descriptionKey: 'app.onboardingOpenTerminalDesc',
        capabilityPaths: ['xd.terminals.openDefault'],
        primary: true,
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyTerminal',
      capabilityPaths: ['xd.terminals.visible'],
    },
    demo: {
      captionKey: 'app.onboardingDemoTerminalCaption',
      highlightTarget: 'terminal-tabs',
      estimatedSeconds: 10,
      nextCueKey: 'app.onboardingDemoTerminalNext',
    },
    skipAllowed: true,
  },
  {
    id: 'open-file-preview',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepFileTitle',
    descriptionKey: 'app.onboardingStepFileDesc',
    actions: [
      {
        id: 'open-file',
        labelKey: 'app.onboardingOpenFile',
        descriptionKey: 'app.onboardingOpenFileDesc',
        capabilityPaths: ['xd.files.dialog.open'],
        primary: true,
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyFile',
      capabilityPaths: ['xd.files.opened'],
    },
    demo: {
      captionKey: 'app.onboardingDemoFileCaption',
      highlightTarget: 'dock-document',
      estimatedSeconds: 10,
      nextCueKey: 'app.onboardingDemoFileNext',
    },
    skipAllowed: true,
  },
  {
    id: 'arrange-panes',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepArrangeTitle',
    descriptionKey: 'app.onboardingStepArrangeDesc',
    actions: [
      {
        id: 'arrange-panes',
        labelKey: 'app.onboardingArrangePanes',
        descriptionKey: 'app.onboardingArrangePanesDesc',
        capabilityPaths: ['xd.dock.panes.main.arrange'],
        primary: true,
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyArrange',
      capabilityPaths: ['xd.dock.layout.current'],
    },
    demo: {
      captionKey: 'app.onboardingDemoArrangeCaption',
      highlightTarget: 'dock-layout',
      estimatedSeconds: 14,
      nextCueKey: 'app.onboardingDemoArrangeNext',
    },
    skipAllowed: true,
  },
  {
    id: 'use-command-center',
    track: 'basic-desk',
    titleKey: 'app.onboardingStepCommandTitle',
    descriptionKey: 'app.onboardingStepCommandDesc',
    actions: [
      {
        id: 'open-command-center',
        labelKey: 'app.onboardingOpenCommandCenter',
        descriptionKey: 'app.onboardingOpenCommandCenterDesc',
        capabilityPaths: ['xd.panes.command-center.open'],
        primary: true,
      },
    ],
    verification: {
      labelKey: 'app.onboardingVerifyCommand',
      capabilityPaths: ['xd.panes.command-center.visible'],
    },
    demo: {
      captionKey: 'app.onboardingDemoCommandCaption',
      highlightTarget: 'command-center',
      estimatedSeconds: 14,
      nextCueKey: 'app.onboardingDemoCommandNext',
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
