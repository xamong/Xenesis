import fs from 'node:fs';
import path from 'node:path';
import type { OnboardingSampleWorkspaceResult, OnboardingSampleWorkspaceStatus } from '../shared/types';
import { getXenisHomePath } from './xenisHome.mjs';

export const ONBOARDING_SAMPLE_WORKSPACE_DISPLAY_PATH = 'XENIS_HOME/onboarding/basic-desk';

const EXPECTED_FILES = ['welcome.md', 'notes/today.md', 'scripts/hello.ps1', 'data/sample.json'];

const SAMPLE_FILES: Record<string, string> = {
  'welcome.md': [
    '# Xenesis Desk Basic Desk Sample',
    '',
    'This workspace is generated for the interactive onboarding flow.',
    '',
    'Try these actions:',
    '',
    '1. Open this Markdown file in a preview tab.',
    '2. Start a terminal from this folder.',
    '3. Run scripts/hello.ps1 in PowerShell.',
    '4. Save and restore a workspace layout.',
    '',
  ].join('\n'),
  'notes/today.md': [
    '# Today',
    '',
    '- Pick a workspace folder.',
    '- Open a terminal.',
    '- Preview a file.',
    '- Arrange panes and save the workspace.',
    '',
  ].join('\n'),
  'scripts/hello.ps1': [
    'Write-Host "Hello from the Xenesis Desk onboarding sample."',
    'Write-Host "Current folder: $(Get-Location)"',
    '',
  ].join('\n'),
  'data/sample.json': `${JSON.stringify(
    {
      workspace: 'basic-desk',
      purpose: 'interactive-onboarding',
      createdBy: 'xenesis-desk',
    },
    null,
    2,
  )}\n`,
};

function getOnboardingRoot(): string {
  return getXenisHomePath(['onboarding']);
}

export function getOnboardingSampleWorkspacePath(): string {
  return path.join(getOnboardingRoot(), 'basic-desk');
}

export function assertInsideOnboardingRoot(targetPath: string): void {
  const root = path.resolve(getOnboardingRoot());
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (relative && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error(`Refusing to modify path outside ${ONBOARDING_SAMPLE_WORKSPACE_DISPLAY_PATH}`);
  }
}

function toNativePath(relativePath: string): string {
  return path.join(...relativePath.split('/'));
}

export function getOnboardingSampleWorkspaceStatus(): OnboardingSampleWorkspaceStatus {
  const samplePath = getOnboardingSampleWorkspacePath();
  assertInsideOnboardingRoot(samplePath);
  const missingFiles = EXPECTED_FILES.filter((relativePath) => {
    return !fs.existsSync(path.join(samplePath, toNativePath(relativePath)));
  });
  return {
    exists: fs.existsSync(samplePath) && missingFiles.length === 0,
    path: samplePath,
    expectedFiles: [...EXPECTED_FILES],
    missingFiles,
  };
}

export async function prepareOnboardingSampleWorkspace(): Promise<OnboardingSampleWorkspaceResult> {
  const samplePath = getOnboardingSampleWorkspacePath();
  assertInsideOnboardingRoot(samplePath);
  await fs.promises.mkdir(samplePath, { recursive: true });
  for (const [relativePath, content] of Object.entries(SAMPLE_FILES)) {
    const targetPath = path.join(samplePath, toNativePath(relativePath));
    assertInsideOnboardingRoot(targetPath);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, content, 'utf8');
  }
  return {
    ...getOnboardingSampleWorkspaceStatus(),
    prepared: true,
    reset: false,
    message: `Prepared ${ONBOARDING_SAMPLE_WORKSPACE_DISPLAY_PATH}`,
  };
}

export async function resetOnboardingSampleWorkspace(): Promise<OnboardingSampleWorkspaceResult> {
  const samplePath = getOnboardingSampleWorkspacePath();
  assertInsideOnboardingRoot(samplePath);
  if (fs.existsSync(samplePath)) {
    await fs.promises.rm(samplePath, { recursive: true, force: true });
  }
  return {
    ...getOnboardingSampleWorkspaceStatus(),
    prepared: false,
    reset: true,
    message: `Reset ${ONBOARDING_SAMPLE_WORKSPACE_DISPLAY_PATH}`,
  };
}
