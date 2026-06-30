// Skill eligibility gating ported from OpenClaw src/shared/config-eval.ts.
//
// Honors `always: true` (skip requirement gating), normalizes OS aliases
// (windows->win32, macos->darwin), and — critically on this Windows host —
// probes PATH with PATHEXT candidates so .cmd/.exe/.bat tools are not all
// reported missing. evaluateSkillEligibility returns {eligible, missing} and
// filterEligibleSkills auto-hides skills whose requirements are unmet.

import fs from 'node:fs';
import path from 'node:path';
import type { SkillDefinition, SkillRequiresSpec } from './types.js';

/** Normalizes primitive config values into the truthiness rules used by requirements checks. */
export function isTruthy(value: unknown): boolean {
  if (value === undefined || value === null) {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

function windowsPathExtensions(): string[] {
  const raw = process.env.PATHEXT;
  const list = raw !== undefined ? raw.split(';').map((v) => v.trim()) : ['.EXE', '.CMD', '.BAT', '.COM'];
  return ['', ...list.filter(Boolean)];
}

let cachedHasBinaryPath: string | undefined;
let cachedHasBinaryPathExt: string | undefined;
const hasBinaryCache = new Map<string, boolean>();

/** Checks PATH for an executable binary, including PATHEXT candidates on Windows. */
export function hasBinary(bin: string): boolean {
  const pathEnv = process.env.PATH ?? '';
  const pathExt = process.platform === 'win32' ? (process.env.PATHEXT ?? '') : '';
  if (cachedHasBinaryPath !== pathEnv || cachedHasBinaryPathExt !== pathExt) {
    // PATH/PATHEXT changes invalidate all cached binary probes; keeping stale misses
    // would make newly installed tools invisible until process restart.
    cachedHasBinaryPath = pathEnv;
    cachedHasBinaryPathExt = pathExt;
    hasBinaryCache.clear();
  }
  if (hasBinaryCache.has(bin)) {
    return hasBinaryCache.get(bin)!;
  }

  const parts = pathEnv.split(path.delimiter).filter(Boolean);
  const extensions = process.platform === 'win32' ? windowsPathExtensions() : [''];
  for (const part of parts) {
    for (const ext of extensions) {
      const candidate = path.join(part, bin + ext);
      try {
        fs.accessSync(candidate, fs.constants.X_OK);
        hasBinaryCache.set(bin, true);
        return true;
      } catch {
        // keep scanning
      }
    }
  }
  hasBinaryCache.set(bin, false);
  return false;
}

/** Returns the current Node runtime platform used by eligibility checks. */
export function resolveRuntimePlatform(): string {
  return process.platform;
}

/**
 * Normalizes a declared OS token into a Node `process.platform` value.
 * Accepts friendly aliases (windows->win32, macos/osx/mac->darwin, linux).
 */
export function normalizeOsToken(token: string): string {
  const normalized = token.trim().toLowerCase();
  switch (normalized) {
    case 'windows':
    case 'win':
    case 'win32':
      return 'win32';
    case 'macos':
    case 'osx':
    case 'mac':
    case 'darwin':
      return 'darwin';
    default:
      return normalized;
  }
}

export interface SkillEligibilityContext {
  /** Runtime platform; defaults to process.platform. */
  platform?: string;
  /** Probes whether a binary is available; defaults to hasBinary (PATH + PATHEXT). */
  hasBin?: (bin: string) => boolean;
  /** Probes whether an env var is set + truthy; defaults to process.env lookup. */
  hasEnv?: (envName: string) => boolean;
  /** Probes whether a dotted config path is truthy; defaults to false (no config source). */
  isConfigTruthy?: (pathStr: string) => boolean;
}

export interface SkillEligibilityResult {
  eligible: boolean;
  /** Human-facing reasons the skill was hidden (empty when eligible). */
  missing: string[];
}

function evaluateRequires(
  requires: SkillRequiresSpec | undefined,
  hasBin: (bin: string) => boolean,
  hasEnv: (envName: string) => boolean,
  isConfigTruthy: (pathStr: string) => boolean,
  missing: string[],
): void {
  if (!requires) {
    return;
  }

  for (const bin of requires.bins ?? []) {
    if (!hasBin(bin)) {
      missing.push(`bin:${bin}`);
    }
  }

  const anyBins = requires.anyBins ?? [];
  if (anyBins.length > 0 && !anyBins.some((bin) => hasBin(bin))) {
    missing.push(`anyBins:${anyBins.join('|')}`);
  }

  for (const envName of requires.env ?? []) {
    if (!hasEnv(envName)) {
      missing.push(`env:${envName}`);
    }
  }

  for (const configPath of requires.config ?? []) {
    if (!isConfigTruthy(configPath)) {
      missing.push(`config:${configPath}`);
    }
  }
}

/**
 * Evaluates OS gating + runtime requirements for a single skill.
 * `always: true` skips requirement gating entirely (OS gating still applies —
 * a skill declared for darwin is not surfaced on win32 even if always).
 */
export function evaluateSkillEligibility(
  skill: Pick<SkillDefinition, 'os' | 'requires' | 'always'>,
  context: SkillEligibilityContext = {},
): SkillEligibilityResult {
  const platform = context.platform ?? resolveRuntimePlatform();
  const hasBin = context.hasBin ?? hasBinary;
  const hasEnv = context.hasEnv ?? ((envName: string) => isTruthy(process.env[envName]));
  const isConfigTruthy = context.isConfigTruthy ?? (() => false);

  const missing: string[] = [];

  const osList = (skill.os ?? []).map(normalizeOsToken);
  if (osList.length > 0 && !osList.includes(platform)) {
    missing.push(`os:${osList.join('|')}!=${platform}`);
  }

  if (skill.always === true) {
    // OS gating still applies; requirement gating is skipped for always skills.
    return { eligible: missing.length === 0, missing };
  }

  evaluateRequires(skill.requires, hasBin, hasEnv, isConfigTruthy, missing);

  return { eligible: missing.length === 0, missing };
}

/** Filters a skill list down to those eligible under the given context. */
export function filterEligibleSkills(
  skills: SkillDefinition[],
  context: SkillEligibilityContext = {},
): SkillDefinition[] {
  return skills.filter((skill) => evaluateSkillEligibility(skill, context).eligible);
}
