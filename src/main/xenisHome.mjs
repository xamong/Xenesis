import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const XENIS_HOME_ENV = 'XENIS_HOME';
export const XENIS_HOME_DIR_NAME = '.xenis';
export const LEGACY_XAMONG_CODE_CONFIG_DIR_ENV = 'XAMONG_CODE_LEGACY_CONFIG_DIRS';

export const MIGRATABLE_USER_DATA_ITEMS = [
  'settings.json',
  'settings-backups',
  'diagnostics',
  'workflow-runs',
  'workflow-templates',
  'mcp',
  'extension-storage',
  'extensions',
  'bin',
];

function trimPath(value) {
  return String(value || '')
    .trim()
    .replace(/[\\/]+$/, '');
}

function uniqueResolvedPaths(paths) {
  const seen = new Set();
  const result = [];
  for (const item of paths) {
    const normalized = trimPath(item);
    if (!normalized) continue;
    const resolved = path.resolve(normalized);
    const key = resolved.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(resolved);
  }
  return result;
}

export function resolveXenisHomeDir({ env = process.env, homedir = os.homedir() } = {}) {
  const configured = trimPath(env?.[XENIS_HOME_ENV]);
  if (configured) return path.resolve(configured);
  return path.join(homedir || os.homedir(), XENIS_HOME_DIR_NAME);
}

export function getXenisHomePath(segments = [], options = {}) {
  return path.join(resolveXenisHomeDir(options), ...segments);
}

export function getDefaultCaptureDir(options = {}) {
  return getXenisHomePath(['captures'], options);
}

export function getDefaultWorkspaceProfilesDir(options = {}) {
  return getXenisHomePath(['workspaces'], options);
}

export function getDefaultExportsDir(options = {}) {
  return getXenisHomePath(['exports'], options);
}

export function getDefaultWorkflowRunsDir(options = {}) {
  return getXenisHomePath(['workflow-runs'], options);
}

export function getDefaultWorkflowTemplatesDir(options = {}) {
  return getXenisHomePath(['workflow-templates'], options);
}

export function getDefaultDiagnosticsDir(options = {}) {
  return getXenisHomePath(['diagnostics'], options);
}

export function getDefaultUserExtensionsDir(options = {}) {
  return getXenisHomePath(['extensions'], options);
}

export function getDefaultXamongCodeConfigDir(options = {}) {
  return getXenisHomePath(['agent'], options);
}

export function getMcpDir(options = {}) {
  return getXenisHomePath(['mcp'], options);
}

export function normalizeUserPath(value) {
  return trimPath(value);
}

export function pathsEqual(left, right) {
  const leftPath = trimPath(left);
  const rightPath = trimPath(right);
  if (!leftPath || !rightPath) return false;
  return path.resolve(leftPath).toLowerCase() === path.resolve(rightPath).toLowerCase();
}

function legacyXamongCodeConfigDirs({ env = process.env } = {}) {
  return String(env?.[LEGACY_XAMONG_CODE_CONFIG_DIR_ENV] || '')
    .split(';')
    .map(trimPath)
    .filter(Boolean);
}

export function resolveDefaultedXamongCodeConfigDir(value, options = {}) {
  const normalized = normalizeUserPath(value);
  if (!normalized || legacyXamongCodeConfigDirs(options).some((candidate) => pathsEqual(normalized, candidate))) {
    return getDefaultXamongCodeConfigDir(options);
  }
  return normalized;
}

export function resolveDefaultedDir(value, fallbackDir) {
  const normalized = normalizeUserPath(value);
  return normalized || fallbackDir;
}

export function legacyUserDataMigrationCandidates({ defaultUserDataDir, appIsPackaged = true } = {}) {
  const candidates = [];
  if (!appIsPackaged && defaultUserDataDir) {
    candidates.push(`${defaultUserDataDir}-dev`);
  }
  if (defaultUserDataDir) {
    candidates.push(defaultUserDataDir);
  }
  return uniqueResolvedPaths(candidates);
}

function hasMigratableData(targetDir) {
  return MIGRATABLE_USER_DATA_ITEMS.some((item) => fs.existsSync(path.join(targetDir, item)));
}

export function migrateLegacyUserData({ legacyDirs = [], targetDir } = {}) {
  const normalizedTargetDir = trimPath(targetDir);
  if (!normalizedTargetDir) {
    return { migrated: false, sourceDir: '', copiedItems: [] };
  }
  const resolvedTargetDir = path.resolve(normalizedTargetDir);
  if (hasMigratableData(resolvedTargetDir)) {
    return { migrated: false, sourceDir: '', copiedItems: [] };
  }

  for (const legacyDir of uniqueResolvedPaths(legacyDirs)) {
    if (!legacyDir || pathsEqual(legacyDir, resolvedTargetDir) || !fs.existsSync(legacyDir)) {
      continue;
    }

    const copiedItems = [];
    fs.mkdirSync(resolvedTargetDir, { recursive: true });
    for (const item of MIGRATABLE_USER_DATA_ITEMS) {
      const source = path.join(legacyDir, item);
      const target = path.join(resolvedTargetDir, item);
      if (!fs.existsSync(source) || fs.existsSync(target)) continue;
      fs.cpSync(source, target, { recursive: true, force: false, errorOnExist: false });
      copiedItems.push(item);
    }

    if (copiedItems.length > 0) {
      return { migrated: true, sourceDir: legacyDir, copiedItems };
    }
  }

  return { migrated: false, sourceDir: '', copiedItems: [] };
}
