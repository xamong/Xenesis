#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

export const DEFAULT_CAPABILITY_AUDIT_PATH = path.join(repoRoot, 'docs', 'capability-registry-audit.md');

export const REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS = Object.freeze([
  'Missing registered paths',
  'Missing dispatched coverage paths',
  'Undispatched static callable methods',
  'Dispatcher paths missing from tree',
]);

export function parseCapabilityAuditCounters(markdown) {
  const counters = new Map();
  let inSummary = false;

  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (/^##\s+Summary\s*$/.test(line)) {
      inSummary = true;
      continue;
    }
    if (inSummary && /^##\s+/.test(line)) break;
    if (!inSummary) continue;

    const bullet = line.match(/^\s*-\s+([^:]+):\s+([0-9]+)\s*$/);
    if (bullet) {
      counters.set(bullet[1].trim(), Number(bullet[2]));
      continue;
    }

    const tableRow = line.match(/^\|\s*([^|]+?)\s*\|\s*([0-9]+)\s*\|/);
    if (tableRow) {
      counters.set(tableRow[1].trim(), Number(tableRow[2]));
    }
  }

  return counters;
}

export function assertCapabilityAuditZero(markdown, options = {}) {
  const requiredCounters = options.requiredCounters || REQUIRED_CAPABILITY_AUDIT_ZERO_COUNTERS;
  const counters = parseCapabilityAuditCounters(markdown);
  const verifiedCounters = {};

  for (const label of requiredCounters) {
    if (!counters.has(label)) {
      throw new Error(`Missing required capability audit counter: ${label}`);
    }

    const value = counters.get(label);
    if (value !== 0) {
      throw new Error(`${label} must be 0, got ${value}`);
    }

    verifiedCounters[label] = value;
  }

  return {
    ok: true,
    counters: verifiedCounters,
  };
}

async function main(argv = process.argv.slice(2)) {
  const auditPath = path.resolve(argv[0] || DEFAULT_CAPABILITY_AUDIT_PATH);
  const markdown = await readFile(auditPath, 'utf8');
  const result = assertCapabilityAuditZero(markdown);
  const relativeAuditPath = path.relative(repoRoot, auditPath) || auditPath;

  console.log(
    `capability-audit-zero: verified ${Object.keys(result.counters).length} counters in ${relativeAuditPath}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(`capability-audit-zero: failed - ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  });
}
