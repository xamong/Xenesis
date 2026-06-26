import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const publicRootFiles = [
  'README.md',
  'README.ko.md',
  'CHANGELOG.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
];

const scannedDirectories = ['docs', '.github'];

const scannedExtensions = new Set(['.md', '.yml', '.yaml']);

const forbiddenPatterns = [
  {
    label: 'Windows absolute local path',
    pattern: /\b[A-Za-z]:\\/,
  },
  {
    label: 'Windows user profile path',
    pattern: /\\Users\\[^\\\s"'`<>]+\\/i,
  },
  {
    label: 'WSL mounted user profile path',
    pattern: /\/mnt\/[a-z]\/Users\/[^/\s"'`<>]+\//i,
  },
  {
    label: 'Unix home path with concrete username',
    pattern: /\/home\/[^/\s"'`<>]+\//,
  },
  {
    label: 'known local checkout marker',
    pattern: /CodeTruck|dmkim|xenis-release-smoke-script/i,
  },
  {
    label: 'GitHub personal access token',
    pattern: /(?:ghp|github_pat)_[A-Za-z0-9_]+/,
  },
  {
    label: 'OpenAI-style API key',
    pattern: /sk-[A-Za-z0-9_-]{20,}/,
  },
  {
    label: 'Slack token',
    pattern: /xox[baprs]-[A-Za-z0-9-]+/,
  },
  {
    label: 'private or public key material',
    pattern: /-----BEGIN|ssh-rsa|ssh-ed25519/,
  },
];

function listFiles(directory, output = []) {
  if (!existsSync(directory)) return output;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (path.relative(root, fullPath).replace(/\\/g, '/').startsWith('docs/superpowers')) continue;
      listFiles(fullPath, output);
      continue;
    }
    if (entry.isFile() && scannedExtensions.has(path.extname(entry.name))) {
      output.push(fullPath);
    }
  }
  return output;
}

export function listPublicDocsSafetyFiles() {
  return [
    ...publicRootFiles.map((file) => path.join(root, file)).filter(existsSync),
    ...scannedDirectories.flatMap((directory) => listFiles(path.join(root, directory))),
  ];
}

export function findPublicDocsSafetyFindings() {
  const findings = [];
  for (const filePath of listPublicDocsSafetyFiles()) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
    const text = readFileSync(filePath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const { label, pattern } of forbiddenPatterns) {
        if (pattern.test(line)) {
          findings.push({
            file: relativePath,
            line: index + 1,
            label,
            text: line.trim(),
          });
        }
      }
    }
    findings.push(...findMissingMarkdownReferenceFindings(filePath, text));
  }
  return findings;
}

function resolveMarkdownReference(filePath, target) {
  const cleanTarget = String(target || '')
    .trim()
    .replace(/^<|>$/g, '')
    .split('#')[0];
  if (!cleanTarget || /^(?:https?:|mailto:|#)/i.test(cleanTarget)) return '';
  const normalizedTarget = cleanTarget.replace(/\\/g, '/');
  if (normalizedTarget.startsWith('docs/')) return path.join(root, normalizedTarget);
  if (normalizedTarget.startsWith('mcp/')) return path.join(root, normalizedTarget);
  return path.resolve(path.dirname(filePath), cleanTarget);
}

function findMissingMarkdownReferenceFindings(filePath, text) {
  const findings = [];
  const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
  const patterns = [/\[[^\]]+\]\(([^)\s]+\.md(?:#[^)]+)?)\)/g, /`((?:docs|mcp)\/[^`]+\.md)`/g];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const target = match[1];
      const resolved = resolveMarkdownReference(filePath, target);
      if (!resolved || existsSync(resolved)) continue;
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      findings.push({
        file: relativePath,
        line,
        label: 'missing local Markdown reference',
        text: target,
      });
    }
  }

  return findings;
}

export function runDocsPublicSafetyCheck() {
  const findings = findPublicDocsSafetyFindings();
  if (findings.length > 0) {
    console.error('Public documentation safety check failed:');
    for (const finding of findings) {
      console.error(`- ${finding.file}:${finding.line} ${finding.label}: ${finding.text}`);
    }
    return false;
  }
  console.log('Public documentation safety check passed.');
  return true;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(runDocsPublicSafetyCheck() ? 0 : 1);
}
