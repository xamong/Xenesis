import type { DockContentType } from '../../../shared/types';
import type { DockState } from '../../dock/engine';

export const ONBOARDING_SAMPLE_WELCOME_FILE_NAME = 'welcome.md';
export const ONBOARDING_SAMPLE_WORKSPACE_FILE_NAME = 'basic-desk-onboarding.xcon-desk-workspace.json';

export interface OnboardingRuntimeContent {
  id: string;
  title: string;
  contentType: DockContentType;
  state: DockState;
  filePath?: string;
  fileName?: string;
  termId?: string;
  terminalCwd?: string;
}

export interface OnboardingRuntimePane {
  id: string;
  state: DockState;
  contents: string[];
  activeContentId: string | null;
}

export interface OnboardingRuntimeSettingsTarget {
  category: string;
  mode: string;
  section: string;
  focusConnectionDetail: string;
}

export interface OnboardingRuntimeExternalIntegrationReadiness {
  checked: boolean;
  statusOk: boolean;
  doctorOk: boolean;
  blockingFindings: number;
}

export interface OnboardingRuntimeSnapshot {
  defaultCwd: string;
  sampleWorkspacePath: string;
  workspacePath: string;
  contents: OnboardingRuntimeContent[];
  panes: OnboardingRuntimePane[];
  settingsTarget?: OnboardingRuntimeSettingsTarget | null;
  externalIntegrationReadiness?: OnboardingRuntimeExternalIntegrationReadiness | null;
}

export interface OnboardingRuntimeVerification {
  passed: boolean;
  reasonKey: string;
}

function trimTrailingSeparators(value: string): string {
  return String(value || '').replace(/[\\/]+$/, '');
}

function normalizePath(value: string | undefined): string {
  return trimTrailingSeparators(value || '')
    .replace(/\\/g, '/')
    .toLowerCase();
}

export function getOnboardingSampleFilePath(sampleWorkspacePath: string, fileName: string): string {
  const base = trimTrailingSeparators(sampleWorkspacePath);
  if (!base) return fileName;
  const separator = base.includes('\\') ? '\\' : '/';
  return `${base}${separator}${fileName}`;
}

export function getOnboardingWorkspaceProfilePath(sampleWorkspacePath: string): string {
  return getOnboardingSampleFilePath(sampleWorkspacePath, ONBOARDING_SAMPLE_WORKSPACE_FILE_NAME);
}

function contentIsVisible(content: OnboardingRuntimeContent): boolean {
  return content.state !== 'hidden';
}

function hasVisibleContent(
  snapshot: OnboardingRuntimeSnapshot,
  predicate: (content: OnboardingRuntimeContent) => boolean,
): boolean {
  return snapshot.contents.some((content) => contentIsVisible(content) && predicate(content));
}

function samplePathOf(snapshot: OnboardingRuntimeSnapshot): string {
  return normalizePath(snapshot.sampleWorkspacePath || snapshot.defaultCwd);
}

function contentPathMatches(pathValue: string | undefined, expectedPath: string): boolean {
  const path = normalizePath(pathValue);
  const expected = normalizePath(expectedPath);
  return Boolean(path && expected && path === expected);
}

function normalizeTargetToken(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function hasConnectionCenterDetailTarget(snapshot: OnboardingRuntimeSnapshot, detailIds: Set<string>): boolean {
  const target = snapshot.settingsTarget ?? null;
  const category = normalizeTargetToken(target?.category);
  const mode = normalizeTargetToken(target?.mode);
  const section = normalizeTargetToken(target?.section);
  const focusConnectionDetail = normalizeTargetToken(target?.focusConnectionDetail);
  return (
    category === 'xenesis-agent' &&
    (mode === 'connections' || section === 'xenesis-connections') &&
    detailIds.has(focusConnectionDetail)
  );
}

function hasProviderSettingsTarget(snapshot: OnboardingRuntimeSnapshot): boolean {
  const target = snapshot.settingsTarget ?? null;
  const category = normalizeTargetToken(target?.category);
  const section = normalizeTargetToken(target?.section);
  const runModelSections = new Set([
    '',
    'default',
    'provider-connection',
    'xamong-runtime',
    'local-cli',
    'byok-provider',
  ]);
  const providerConnectionDetails = new Set([
    'provider-setup',
    'provider-setup-plan',
    'provider-routing',
    'provider-view',
    'provider-profile-draft',
  ]);

  if (category === 'run-model' || category === 'ai-provider') {
    return runModelSections.has(section);
  }
  return hasConnectionCenterDetailTarget(snapshot, providerConnectionDetails);
}

function hasExternalToolSettingsTarget(snapshot: OnboardingRuntimeSnapshot): boolean {
  return hasConnectionCenterDetailTarget(
    snapshot,
    new Set([
      'tool-setup',
      'tool-setup-plan',
      'tool-install-plan',
      'tool-connector',
      'tool-runtime',
      'tool-profile-draft',
      'tool-action-catalog',
      'tool-view',
      'tool-user-story',
    ]),
  );
}

function hasNativeExternalIntegrationReadiness(snapshot: OnboardingRuntimeSnapshot): boolean {
  const readiness = snapshot.externalIntegrationReadiness ?? null;
  return (
    readiness?.checked === true &&
    readiness.statusOk === true &&
    readiness.doctorOk === true &&
    readiness.blockingFindings === 0
  );
}

function hasMcpSettingsTarget(snapshot: OnboardingRuntimeSnapshot): boolean {
  return hasConnectionCenterDetailTarget(
    snapshot,
    new Set([
      'mcp-install-draft',
      'mcp-template',
      'tool-mcp-oauth',
      'tool-oauth-draft',
      'tool-oauth-setup-packet',
      'tool-oauth-runtime',
    ]),
  );
}

export function verifyBasicDeskOnboardingStep(
  stepId: string,
  snapshot: OnboardingRuntimeSnapshot,
): OnboardingRuntimeVerification {
  const samplePath = samplePathOf(snapshot);

  if (stepId === 'choose-workspace-folder') {
    const preparedSamplePath = normalizePath(snapshot.sampleWorkspacePath);
    return {
      passed: Boolean(preparedSamplePath),
      reasonKey: preparedSamplePath ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyWorkspaceMissing',
    };
  }

  if (stepId === 'configure-ai-provider') {
    const hasSettings = hasVisibleContent(snapshot, (content) => content.contentType === 'settings');
    const passed = hasSettings && hasProviderSettingsTarget(snapshot);
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyProviderMissing' };
  }

  if (stepId === 'connect-external-tools') {
    const hasSettings = hasVisibleContent(snapshot, (content) => content.contentType === 'settings');
    const passed =
      hasSettings && hasExternalToolSettingsTarget(snapshot) && hasNativeExternalIntegrationReadiness(snapshot);
    return {
      passed,
      reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyExternalToolsMissing',
    };
  }

  if (stepId === 'configure-mcp') {
    const hasSettings = hasVisibleContent(snapshot, (content) => content.contentType === 'settings');
    const passed = hasSettings && hasMcpSettingsTarget(snapshot);
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyMcpMissing' };
  }

  if (stepId === 'open-terminal') {
    const passed = hasVisibleContent(
      snapshot,
      (content) =>
        content.contentType === 'terminal' &&
        Boolean(content.termId) &&
        (!samplePath || normalizePath(content.terminalCwd || snapshot.defaultCwd) === samplePath),
    );
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyTerminalMissing' };
  }

  if (stepId === 'open-file-preview') {
    const expectedWelcomePath = getOnboardingSampleFilePath(
      snapshot.sampleWorkspacePath || snapshot.defaultCwd,
      ONBOARDING_SAMPLE_WELCOME_FILE_NAME,
    );
    const passed = hasVisibleContent(
      snapshot,
      (content) =>
        content.fileName === ONBOARDING_SAMPLE_WELCOME_FILE_NAME ||
        contentPathMatches(content.filePath, expectedWelcomePath),
    );
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyFileMissing' };
  }

  if (stepId === 'arrange-panes') {
    const documentPanes = snapshot.panes.filter((pane) => pane.state === 'document' && pane.contents.length > 0);
    const passed = documentPanes.length >= 2;
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyArrangeMissing' };
  }

  if (stepId === 'use-command-center') {
    const passed = hasVisibleContent(snapshot, (content) => content.contentType === 'command-center');
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyCommandMissing' };
  }

  if (stepId === 'open-settings-diagnostics') {
    const hasSettings = hasVisibleContent(snapshot, (content) => content.contentType === 'settings');
    const hasDiagnostics = hasVisibleContent(snapshot, (content) => content.contentType === 'diagnostics');
    const passed = hasSettings && hasDiagnostics;
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifySettingsMissing' };
  }

  if (stepId === 'save-restore-workspace') {
    const expectedWorkspacePath = getOnboardingWorkspaceProfilePath(
      snapshot.sampleWorkspacePath || snapshot.defaultCwd,
    );
    const passed = contentPathMatches(snapshot.workspacePath, expectedWorkspacePath);
    return { passed, reasonKey: passed ? 'app.onboardingVerifyPassed' : 'app.onboardingVerifyRestoreMissing' };
  }

  return { passed: false, reasonKey: 'app.onboardingVerifyUnknownStep' };
}
