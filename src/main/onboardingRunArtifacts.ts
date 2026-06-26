import fs from 'node:fs';
import path from 'node:path';
import type {
  OnboardingRunArtifact,
  OnboardingRunArtifactClearResult,
  OnboardingRunArtifactSaveRequest,
  OnboardingRunArtifactStep,
} from '../shared/types';
import { getXenisHomePath } from './xenisHome.mjs';

export const ONBOARDING_RUNS_DISPLAY_PATH = 'XENIS_HOME/onboarding-runs';

function getOnboardingRunsRoot(): string {
  return getXenisHomePath(['onboarding-runs']);
}

function resolveOnboardingRunsRoot(artifactDir?: string): string {
  const root = getOnboardingRunsRoot();
  const requested = String(artifactDir || '').trim();
  if (!requested) return root;
  return path.isAbsolute(requested) ? requested : path.join(root, requested);
}

function assertInsideOnboardingRunsRoot(targetPath: string): void {
  const root = path.resolve(getOnboardingRunsRoot());
  const target = path.resolve(targetPath);
  const relative = path.relative(root, target);
  if (relative && (relative.startsWith('..') || path.isAbsolute(relative))) {
    throw new Error(`Refusing to modify path outside ${ONBOARDING_RUNS_DISPLAY_PATH}`);
  }
}

function toRunId(value: string | undefined, createdAt: string): string {
  const fallback = `basic-desk-${createdAt.replace(/[:.]/g, '-').replace(/[^\dA-Za-z_-]/g, '')}`;
  const raw = String(value || fallback).trim();
  const sanitized = raw
    .replace(/[^\dA-Za-z_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return sanitized || fallback;
}

function toSafeFileName(index: number, stepId: string, extension: string): string {
  const normalizedExtension = extension && /^[.\w-]+$/.test(extension) ? extension : '.png';
  const safeStepId = String(stepId || `step-${index + 1}`)
    .replace(/[^\dA-Za-z_-]/g, '-')
    .replace(/-+/g, '-');
  return `step-${String(index + 1).padStart(2, '0')}-${safeStepId}${normalizedExtension}`;
}

async function copyStepCapture(runDir: string, step: OnboardingRunArtifactStep): Promise<OnboardingRunArtifactStep> {
  const sourcePath = step.capture?.filePath;
  if (!sourcePath) return step;
  const sourceStat = await fs.promises.stat(sourcePath).catch(() => null);
  if (!sourceStat?.isFile()) return step;
  const extension = path.extname(sourcePath) || '.png';
  const screenshotFileName = toSafeFileName(step.index, step.stepId, extension);
  const targetPath = path.join(runDir, screenshotFileName);
  assertInsideOnboardingRunsRoot(targetPath);
  await fs.promises.copyFile(sourcePath, targetPath);
  return {
    ...step,
    screenshotFileName,
    screenshotPath: targetPath,
  };
}

async function readRunArtifact(manifestPath: string): Promise<OnboardingRunArtifact | null> {
  try {
    const text = await fs.promises.readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(text) as OnboardingRunArtifact;
    if (!parsed || typeof parsed !== 'object' || !parsed.runId || !parsed.path) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveOnboardingRunArtifact(
  request: OnboardingRunArtifactSaveRequest,
): Promise<OnboardingRunArtifact> {
  const root = resolveOnboardingRunsRoot(request.artifactDir);
  assertInsideOnboardingRunsRoot(root);
  await fs.promises.mkdir(root, { recursive: true });

  const createdAt = new Date().toISOString();
  const runId = toRunId(request.runId, createdAt);
  const runDir = path.join(root, runId);
  assertInsideOnboardingRunsRoot(runDir);
  await fs.promises.mkdir(runDir, { recursive: true });

  const copiedSteps: OnboardingRunArtifactStep[] = [];
  for (const step of request.steps || []) {
    copiedSteps.push(await copyStepCapture(runDir, step));
  }

  const artifact: OnboardingRunArtifact = {
    runId,
    title: request.title || 'Basic Desk onboarding demo',
    trackId: request.trackId,
    path: runDir,
    manifestPath: path.join(runDir, 'run.json'),
    createdAt,
    startedAt: request.startedAt,
    finishedAt: request.finishedAt,
    sampleWorkspacePath: request.sampleWorkspacePath,
    stepCount: copiedSteps.length,
    passedCount: copiedSteps.filter((step) => step.passed).length,
    screenshots: copiedSteps.map((step) => step.screenshotPath).filter((value): value is string => Boolean(value)),
    steps: copiedSteps,
  };

  assertInsideOnboardingRunsRoot(artifact.manifestPath);
  await fs.promises.writeFile(artifact.manifestPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  return artifact;
}

export async function listOnboardingRunArtifacts(): Promise<OnboardingRunArtifact[]> {
  const root = getOnboardingRunsRoot();
  assertInsideOnboardingRunsRoot(root);
  const entries = await fs.promises.readdir(root, { withFileTypes: true }).catch(() => []);
  const artifacts: OnboardingRunArtifact[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(root, entry.name, 'run.json');
    assertInsideOnboardingRunsRoot(manifestPath);
    const artifact = await readRunArtifact(manifestPath);
    if (artifact) artifacts.push(artifact);
  }
  return artifacts.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getOnboardingRunArtifactPath(runId?: string): Promise<string> {
  const root = getOnboardingRunsRoot();
  assertInsideOnboardingRunsRoot(root);
  if (runId) {
    const runPath = path.join(root, toRunId(runId, new Date().toISOString()));
    assertInsideOnboardingRunsRoot(runPath);
    return runPath;
  }
  const [latest] = await listOnboardingRunArtifacts();
  return latest?.path || root;
}

export async function clearOnboardingRunArtifacts(): Promise<OnboardingRunArtifactClearResult> {
  const root = getOnboardingRunsRoot();
  assertInsideOnboardingRunsRoot(root);
  const existing = await listOnboardingRunArtifacts();
  await fs.promises.rm(root, { recursive: true, force: true });
  await fs.promises.mkdir(root, { recursive: true });
  return {
    ok: true,
    path: root,
    cleared: existing.length,
  };
}
