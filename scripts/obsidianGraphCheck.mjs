import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const REQUIRED_OBSIDIAN_NOTES = [
  'Final Goal',
  'Final Goal Overall Spec',
  'Final Goal Slice Spec Index',
  'Reference-Driven Final Goal Slices',
  'Reference Adoption Map Proposal',
  'Source of Truth Map',
  'Verification Map',
  'CR Surface Index',
  'Module Index',
  'High Risk Areas',
  'module-capability-registry',
  'module-mcp-bridge',
  'module-xenesis-agent-pane',
  'module-provider-runtime',
  'module-approval-system',
  'Slice Spec 01 Live CR Baseline',
  'Slice Spec 02 Provider Onboarding',
  'Slice Spec 03 External Tools MCP OAuth',
  'Slice Spec 04 Messenger Channels',
  'Slice Spec 05 User Stories Guides',
  'Slice Spec 06 Graph Release Hardening',
];

export const REQUIRED_HANDOFF_EVIDENCE = [
  {
    label: 'CR audit final pass',
    pattern:
      /Final `npm run docs:capabilities:audit`:\s*passed[\s\S]*?801 nodes[\s\S]*?689\s+coverage path references/i,
  },
  {
    label: 'audit-zero final pass',
    pattern: /Final `node scripts\/assertCapabilityAuditZero\.mjs`:\s*passed[\s\S]*?verified 4\s+counters/i,
  },
  {
    label: 'public-release final pass',
    pattern: /Final `npm run check:public-release`:\s*passed\b/i,
  },
  {
    label: 'lint final known failure count',
    pattern: /Final `npm run lint`:\s*failed[\s\S]*?1119 errors[\s\S]*?415 warnings[\s\S]*?93 infos/i,
  },
  {
    label: 'channel live smoke provider CR/MCP proof',
    pattern:
      /(?:Final|Channel natural-language live final:)[\s\S]*?`node \.\/scripts\/xenesisChannelNaturalLanguageLiveSmoke\.mjs --json`[\s\S]*?passed 17\/17[\s\S]*?providerNaturalLanguageToolSelectionProof=true[\s\S]*?provider raw CR\/MCP channel evidence true[\s\S]*?no provider `?webSearch`?/i,
  },
];

function normalizeIdentifier(value) {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\/g, '/')
    .replace(/\.md$/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function normalizePathForDisplay(rootDir, filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function listMarkdownFiles(directory, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      listMarkdownFiles(fullPath, output);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      output.push(fullPath);
    }
  }
  return output;
}

function extractFrontmatter(text) {
  if (!text.startsWith('---')) return '';
  const endIndex = text.indexOf('\n---', 3);
  if (endIndex === -1) return '';
  return text.slice(3, endIndex);
}

function extractAliases(text) {
  const frontmatter = extractFrontmatter(text);
  if (!frontmatter) return [];
  const lines = frontmatter.split(/\r?\n/);
  const aliases = [];
  let inAliases = false;

  for (const line of lines) {
    if (/^[A-Za-z0-9_-]+:\s*/.test(line)) {
      inAliases = /^aliases:\s*$/.test(line);
      continue;
    }
    if (!inAliases) continue;
    const match = line.match(/^\s*-\s*(.+?)\s*$/);
    if (match) aliases.push(match[1].replace(/^["']|["']$/g, ''));
  }

  return aliases;
}

function extractTitle(text) {
  return text.match(/^#\s+(.+?)\s*$/m)?.[1] || '';
}

function addIdentifier(noteIndex, identifier, filePath) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return;
  if (!noteIndex.has(normalized)) noteIndex.set(normalized, filePath);
}

function indexNote({ noteIndex, filePath, rootDir, obsidianRoot, vaultRoot, text }) {
  const relativeToRoot = normalizePathForDisplay(rootDir, filePath).replace(/\.md$/i, '');
  const relativeToObsidian = normalizePathForDisplay(obsidianRoot, filePath).replace(/\.md$/i, '');
  const baseName = path.basename(filePath, '.md');
  addIdentifier(noteIndex, relativeToRoot, filePath);
  addIdentifier(noteIndex, relativeToObsidian, filePath);
  addIdentifier(noteIndex, baseName, filePath);

  if (filePath.startsWith(vaultRoot)) {
    addIdentifier(noteIndex, normalizePathForDisplay(vaultRoot, filePath).replace(/\.md$/i, ''), filePath);
  }

  addIdentifier(noteIndex, extractTitle(text), filePath);
  for (const alias of extractAliases(text)) {
    addIdentifier(noteIndex, alias, filePath);
  }
}

function extractWikilinks(text) {
  const links = [];
  const pattern = /\[\[([^\]]+)\]\]/g;
  for (const match of text.matchAll(pattern)) {
    const rawTarget = match[1];
    const target = rawTarget.split('|')[0].split('#')[0].trim();
    if (!target) continue;
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    links.push({ target, line });
  }
  return links;
}

function resolveNote(noteIndex, target) {
  const normalized = normalizeIdentifier(target);
  if (noteIndex.has(normalized)) return noteIndex.get(normalized);
  const baseName = normalized.split('/').pop();
  return noteIndex.get(baseName) || '';
}

function buildReachableSet(entrypointPath, edges) {
  const reachable = new Set();
  const stack = [entrypointPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || reachable.has(current)) continue;
    reachable.add(current);
    for (const next of edges.get(current) ?? []) {
      if (!reachable.has(next)) stack.push(next);
    }
  }
  return reachable;
}

function checkHandoff({ rootDir, handoffPath, errors }) {
  if (!existsSync(handoffPath)) {
    errors.push(`Missing handoff file: ${normalizePathForDisplay(rootDir, handoffPath)}`);
    return;
  }

  const handoff = readFileSync(handoffPath, 'utf8');
  const sectionMatch = /^## Current Slice 06 Graph Release Hardening\s*$/im.exec(handoff);
  if (!sectionMatch) {
    errors.push('Missing handoff section: Current Slice 06 Graph Release Hardening');
    return;
  }

  const sectionStart = sectionMatch.index;
  const sectionBody = handoff.slice(sectionStart + sectionMatch[0].length);
  const nextSectionMatch = /\n##\s+/.exec(sectionBody);
  const section = `${sectionMatch[0]}\n${nextSectionMatch ? sectionBody.slice(0, nextSectionMatch.index) : sectionBody}`;
  const normalizedSection = section
    .replace(/\\/g, '/')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ');
  for (const evidence of REQUIRED_HANDOFF_EVIDENCE) {
    if (!evidence.pattern.test(normalizedSection)) {
      errors.push(`Missing handoff evidence: ${evidence.label}`);
    }
  }
}

export function runObsidianGraphCheck(options = {}) {
  const rootDir = path.resolve(options.rootDir || scriptRoot);
  const obsidianRoot = path.resolve(rootDir, options.obsidianRoot || path.join('docs', 'obsidian'));
  const vaultRoot = path.resolve(rootDir, options.vaultRoot || path.join('docs', 'obsidian', 'Xenesis-desk'));
  const entrypointPath = path.resolve(
    rootDir,
    options.entrypointPath || path.join('docs', 'obsidian', 'Xenesis-desk.md'),
  );
  const handoffPath = path.resolve(rootDir, options.handoffPath || 'handoff.md');
  const errors = [];

  if (!existsSync(obsidianRoot)) {
    errors.push(`Missing Obsidian root: ${normalizePathForDisplay(rootDir, obsidianRoot)}`);
    return { ok: false, errors, notesChecked: 0, linksChecked: 0 };
  }
  if (!existsSync(entrypointPath)) {
    errors.push(`Missing Obsidian entrypoint: ${normalizePathForDisplay(rootDir, entrypointPath)}`);
    return { ok: false, errors, notesChecked: 0, linksChecked: 0 };
  }

  const noteIndex = new Map();
  const noteTexts = new Map();
  const markdownFiles = listMarkdownFiles(obsidianRoot);

  for (const filePath of markdownFiles) {
    const text = readFileSync(filePath, 'utf8');
    noteTexts.set(filePath, text);
    indexNote({ noteIndex, filePath, rootDir, obsidianRoot, vaultRoot, text });
  }

  const edges = new Map();
  let linksChecked = 0;
  for (const [filePath, text] of noteTexts.entries()) {
    const links = extractWikilinks(text);
    linksChecked += links.length;
    const targets = [];
    for (const link of links) {
      const resolved = resolveNote(noteIndex, link.target);
      if (!resolved) {
        errors.push(
          `Unresolved wikilink: ${normalizePathForDisplay(rootDir, filePath)}:${link.line} -> ${link.target}`,
        );
        continue;
      }
      targets.push(resolved);
    }
    edges.set(filePath, targets);
  }

  const reachable = buildReachableSet(entrypointPath, edges);
  for (const requiredNote of REQUIRED_OBSIDIAN_NOTES) {
    const resolved = resolveNote(noteIndex, requiredNote);
    if (!resolved) {
      errors.push(`Missing required note: ${requiredNote}`);
      continue;
    }
    if (!reachable.has(resolved)) {
      errors.push(`Required note is not reachable from entrypoint: ${requiredNote}`);
    }
  }

  checkHandoff({ rootDir, handoffPath, errors });

  return {
    ok: errors.length === 0,
    errors,
    notesChecked: markdownFiles.length,
    linksChecked,
  };
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--root') options.rootDir = argv[++index];
    else if (arg === '--obsidian-root') options.obsidianRoot = argv[++index];
    else if (arg === '--vault-root') options.vaultRoot = argv[++index];
    else if (arg === '--entrypoint') options.entrypointPath = argv[++index];
    else if (arg === '--handoff') options.handoffPath = argv[++index];
  }
  return options;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runObsidianGraphCheck(parseArgs(process.argv.slice(2)));
  if (!result.ok) {
    console.error('Obsidian graph check failed:');
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }
  console.log(`Obsidian graph check passed. Notes: ${result.notesChecked}. Wikilinks: ${result.linksChecked}.`);
}
