import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runObsidianGraphCheck } from './obsidianGraphCheck.mjs';

const REQUIRED_NOTES = [
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

const HANDOFF_MARKERS = [
  'npm run docs:capabilities:audit',
  'node scripts\\assertCapabilityAuditZero.mjs',
  'npm run check:public-release',
  'npm run lint',
  'node .\\scripts\\xenesisChannelNaturalLanguageLiveSmoke.mjs --json',
  'provider raw CR/MCP channel evidence true',
];

function validHandoffText() {
  return [
    '## Current Slice 05 User Stories And Guide Workflows',
    '- Earlier `npm run lint` mention outside Slice 06 should not count.',
    '',
    '## Current Slice 06 Graph Release Hardening',
    '- Exact verification result:',
    '  - Final `npm run docs:capabilities:audit`: passed and wrote `docs\\capability-registry-audit.md`; audit summary 801 nodes and 689 coverage path references.',
    '  - Final `node scripts\\assertCapabilityAuditZero.mjs`: passed; verified 4 counters in `docs\\capability-registry-audit.md`.',
    '  - Final `npm run check:public-release`: passed.',
    '  - Final `npm run lint`: failed with known repo-wide Biome debt: 1119 errors, 415 warnings, 93 infos.',
    '  - Final `node .\\scripts\\xenesisChannelNaturalLanguageLiveSmoke.mjs --json`: passed 17/17 with `providerNaturalLanguageToolSelectionProof=true`; provider raw CR/MCP channel evidence true; no provider `webSearch`.',
  ].join('\n');
}

function writeNote(rootDir, relativePath, title, links = [], aliases = []) {
  const notePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(notePath), { recursive: true });
  const aliasLines = aliases.length > 0 ? `aliases:\n${aliases.map((alias) => `  - ${alias}`).join('\n')}\n` : '';
  const graphLinks = links.map((link) => `- Links [[${link}]]`).join('\n');
  writeFileSync(
    notePath,
    `---\ntype: note\nrepo: xenesis-desk\n${aliasLines}---\n\n# ${title}\n\n## Graph Links\n\n${graphLinks}\n`,
  );
}

function createValidFixture() {
  const rootDir = mkdtempSync(path.join(os.tmpdir(), 'xd-obsidian-graph-'));
  const entrypointLinks = REQUIRED_NOTES.filter((note) => note !== 'Final Goal Slice Spec Index');

  writeNote(rootDir, 'docs/obsidian/Xenesis-desk.md', 'Xenesis-desk', [
    'Final Goal Slice Spec Index',
    ...entrypointLinks,
  ]);

  for (const requiredNote of REQUIRED_NOTES) {
    const fileName = `${requiredNote.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`;
    const links =
      requiredNote === 'Final Goal Slice Spec Index'
        ? REQUIRED_NOTES.filter((note) => note.startsWith('Slice Spec '))
        : [];
    writeNote(rootDir, `docs/obsidian/Xenesis-desk/fixture/${fileName}`, requiredNote, links, [requiredNote]);
  }

  writeFileSync(path.join(rootDir, 'handoff.md'), validHandoffText());

  return rootDir;
}

test('valid graph fixture passes', () => {
  const rootDir = createValidFixture();
  try {
    const result = runObsidianGraphCheck({ rootDir });

    assert.equal(result.ok, true);
    assert.deepEqual(result.errors, []);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('missing slice index discoverability fails', () => {
  const rootDir = createValidFixture();
  try {
    const entrypoint = path.join(rootDir, 'docs/obsidian/Xenesis-desk.md');
    writeFileSync(entrypoint, '# Xenesis-desk\n\n[[Final Goal]]\n');

    const result = runObsidianGraphCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(
      result.errors.join('\n'),
      /Required note is not reachable from entrypoint: Final Goal Slice Spec Index/,
    );
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('unresolved wikilink fails', () => {
  const rootDir = createValidFixture();
  try {
    writeNote(rootDir, 'docs/obsidian/Xenesis-desk/fixture/Broken.md', 'Broken', ['Missing Note']);

    const result = runObsidianGraphCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /Unresolved wikilink/);
    assert.match(result.errors.join('\n'), /Missing Note/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('missing handoff live evidence marker fails', () => {
  const rootDir = createValidFixture();
  try {
    writeFileSync(
      path.join(rootDir, 'handoff.md'),
      validHandoffText().replace('provider raw CR/MCP channel evidence true; ', ''),
    );

    const result = runObsidianGraphCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /Missing handoff evidence: channel live smoke provider CR\/MCP proof/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('handoff evidence must be final Slice 06 evidence, not baseline marker mentions', () => {
  const rootDir = createValidFixture();
  try {
    writeFileSync(
      path.join(rootDir, 'handoff.md'),
      [
        '## Current Slice 05 User Stories And Guide Workflows',
        HANDOFF_MARKERS.join('\n'),
        '',
        '## Current Slice 06 Graph Release Hardening',
        '- Baseline `npm run check:public-release`: failed on missing `.github/workflows/ci.yml`.',
        '- Baseline `npm run lint`: failed, 1119 errors / 415 warnings / 93 infos.',
      ].join('\n'),
    );

    const result = runObsidianGraphCheck({ rootDir });

    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /Missing handoff evidence: public-release final pass/);
    assert.match(result.errors.join('\n'), /Missing handoff evidence: channel live smoke provider CR\/MCP proof/);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});
