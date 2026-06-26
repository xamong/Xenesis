// Skill frontmatter sanitizers ported VERBATIM from OpenClaw
// (src/skills/loading/frontmatter.ts normalizeSafe* helpers + the
// validateRegistryNpmSpec dependency from src/infra/npm-registry-spec.ts).
//
// These guard install-spec strings (brew formula, npm/uv package, go module,
// download url) against shell/path-traversal injection before they could ever
// reach an installer command. The patterns and rejection rules MUST stay
// byte-identical to upstream — do NOT loosen them.
//
// MINE has no validateRegistryNpmSpec, so the registry-only npm spec validation
// it depends on is ported here (the rejection rules from
// parseRegistryNpmSpecInternal — URLs/git/file/protocol/range specs rejected).

import type { SkillInstallSpec } from "./types.js";

const EXACT_SEMVER_VERSION_RE =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
const DIST_TAG_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Validates a registry-only npm spec and returns a user-facing error when
 * rejected (null when valid). Ported from OpenClaw npm-registry-spec.ts:
 * registry-only — no URLs, git, file, or alias protocols; selectors limited to
 * exact versions and dist-tags. Kept strict: this guards installer execution.
 */
export function validateRegistryNpmSpec(rawSpec: string): string | null {
  const spec = rawSpec.trim();
  if (!spec) {
    return "missing npm spec";
  }
  if (/\s/.test(spec)) {
    return "unsupported npm spec: whitespace is not allowed";
  }
  // Registry-only: no URLs, git, file, or alias protocols.
  if (spec.includes("://")) {
    return "unsupported npm spec: URLs are not allowed";
  }
  if (spec.includes("#")) {
    return "unsupported npm spec: git refs are not allowed";
  }
  if (spec.includes(":")) {
    return "unsupported npm spec: protocol specs are not allowed";
  }

  const at = spec.lastIndexOf("@");
  const hasSelector = at > 0;
  const name = hasSelector ? spec.slice(0, at) : spec;
  const selector = hasSelector ? spec.slice(at + 1) : "";

  // Accept only registry package names; file paths, aliases, and URL/git specs
  // are intentionally rejected because installs run on the host.
  const unscopedName = /^[a-z0-9][a-z0-9-._~]*$/;
  const scopedName = /^@[a-z0-9][a-z0-9-._~]*\/[a-z0-9][a-z0-9-._~]*$/;
  const isValidName = name.startsWith("@") ? scopedName.test(name) : unscopedName.test(name);
  if (!isValidName) {
    return "unsupported npm spec: expected <name> or <name>@<version> from the npm registry";
  }
  if (!hasSelector) {
    return null;
  }
  if (!selector) {
    return "unsupported npm spec: missing version/tag after @";
  }
  if (/[\\/]/.test(selector)) {
    return "unsupported npm spec: invalid version/tag";
  }
  if (EXACT_SEMVER_VERSION_RE.test(selector)) {
    return null;
  }
  if (!DIST_TAG_RE.test(selector)) {
    return "unsupported npm spec: use an exact version or dist-tag (ranges are not allowed)";
  }
  return null;
}

const BREW_FORMULA_PATTERN = /^[A-Za-z0-9][A-Za-z0-9@+._/-]*$/;
const GO_MODULE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~+\-/]*(?:@[A-Za-z0-9][A-Za-z0-9._~+\-/]*)?$/;
const UV_PACKAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._\-[\]=<>!~+,]*$/;

export function normalizeSafeBrewFormula(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const formula = raw.trim();
  if (!formula || formula.startsWith("-") || formula.includes("\\") || formula.includes("..")) {
    return undefined;
  }
  if (!BREW_FORMULA_PATTERN.test(formula)) {
    return undefined;
  }
  return formula;
}

export function normalizeSafeNpmSpec(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const spec = raw.trim();
  if (!spec || spec.startsWith("-")) {
    return undefined;
  }
  if (validateRegistryNpmSpec(spec) !== null) {
    return undefined;
  }
  return spec;
}

export function normalizeSafeGoModule(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const moduleSpec = raw.trim();
  if (
    !moduleSpec ||
    moduleSpec.startsWith("-") ||
    moduleSpec.includes("\\") ||
    moduleSpec.includes("://")
  ) {
    return undefined;
  }
  if (!GO_MODULE_PATTERN.test(moduleSpec)) {
    return undefined;
  }
  return moduleSpec;
}

export function normalizeSafeUvPackage(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const pkg = raw.trim();
  if (!pkg || pkg.startsWith("-") || pkg.includes("\\") || pkg.includes("://")) {
    return undefined;
  }
  if (!UV_PACKAGE_PATTERN.test(pkg)) {
    return undefined;
  }
  return pkg;
}

export function normalizeSafeDownloadUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") {
    return undefined;
  }
  const value = raw.trim();
  if (!value || /\s/.test(value)) {
    return undefined;
  }
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return undefined;
    }
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Sanitizes a parsed install spec in place: drops install fields whose strings
 * fail the verbatim sanitizers, then drops the whole spec when the kind's
 * required field is missing/unsafe (returns undefined). Ported from OpenClaw
 * parseInstallSpec's field-sanitization + completeness checks.
 */
export function sanitizeSkillInstallSpec(spec: SkillInstallSpec): SkillInstallSpec | undefined {
  const sanitized: SkillInstallSpec = { kind: spec.kind };
  if (spec.id !== undefined) sanitized.id = spec.id;
  if (spec.label !== undefined) sanitized.label = spec.label;
  if (spec.bins !== undefined) sanitized.bins = spec.bins;
  if (spec.os !== undefined) sanitized.os = spec.os;

  const formula = normalizeSafeBrewFormula(spec.formula);
  if (formula) {
    sanitized.formula = formula;
  }
  const cask = normalizeSafeBrewFormula((spec as { cask?: unknown }).cask);
  if (!sanitized.formula && cask) {
    sanitized.formula = cask;
  }
  if (sanitized.kind === "node") {
    const pkg = normalizeSafeNpmSpec(spec.package);
    if (pkg) {
      sanitized.package = pkg;
    }
  } else if (sanitized.kind === "uv") {
    const pkg = normalizeSafeUvPackage(spec.package);
    if (pkg) {
      sanitized.package = pkg;
    }
  }
  const moduleSpec = normalizeSafeGoModule(spec.module);
  if (moduleSpec) {
    sanitized.module = moduleSpec;
  }
  const downloadUrl = normalizeSafeDownloadUrl(spec.url);
  if (downloadUrl) {
    sanitized.url = downloadUrl;
  }
  if (typeof spec.archive === "string") {
    sanitized.archive = spec.archive;
  }
  if (typeof spec.extract === "boolean") {
    sanitized.extract = spec.extract;
  }
  if (typeof spec.stripComponents === "number") {
    sanitized.stripComponents = spec.stripComponents;
  }
  if (typeof spec.targetDir === "string") {
    sanitized.targetDir = spec.targetDir;
  }

  if (sanitized.kind === "brew" && !sanitized.formula) {
    return undefined;
  }
  if (sanitized.kind === "node" && !sanitized.package) {
    return undefined;
  }
  if (sanitized.kind === "go" && !sanitized.module) {
    return undefined;
  }
  if (sanitized.kind === "uv" && !sanitized.package) {
    return undefined;
  }
  if (sanitized.kind === "download" && !sanitized.url) {
    return undefined;
  }

  return sanitized;
}
