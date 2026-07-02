import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const CORE_TOOLS_PLUGIN_PATH = join(process.cwd(), 'extensions/xenesis-desk.core-tools/plugin.json');
const CORE_TOOLS_MAIN_PATH = join(process.cwd(), 'extensions/xenesis-desk.core-tools/main.js');

interface CoreToolsManifest {
  contributes?: {
    commands?: Array<{ command?: string; title?: string; icon?: string }>;
    menus?: Partial<Record<'tools' | 'commandPalette', string[]>>;
  };
}

function readManifest(): CoreToolsManifest {
  return JSON.parse(readFileSync(CORE_TOOLS_PLUGIN_PATH, 'utf8')) as CoreToolsManifest;
}

test('core tools manifest exposes toolbar parity command names', () => {
  const manifest = readManifest();
  const commands = new Map((manifest.contributes?.commands ?? []).map((entry) => [entry.command, entry]));

  assert.equal(commands.get('xenesis-desk.core-tools.openAgentApprovals')?.title, 'Agent Approvals');
  assert.equal(commands.get('xenesis-desk.core-tools.openStashOperations')?.title, 'Stash Operations');
  assert.equal(commands.has('xenesis-desk.core-tools.openHermesActionInbox'), false);
  assert.equal(commands.has('xenesis-desk.core-tools.openHermesStashOps'), false);

  for (const location of ['tools', 'commandPalette'] as const) {
    const menu = manifest.contributes?.menus?.[location] ?? [];
    assert.equal(menu.includes('xenesis-desk.core-tools.openAgentApprovals'), true, location);
    assert.equal(menu.includes('xenesis-desk.core-tools.openStashOperations'), true, location);
    assert.equal(menu.includes('xenesis-desk.core-tools.openMemoryDashboard'), false, location);
  }
});

test('core tools runtime maps legacy toolbar commands to renamed tools', () => {
  const main = readFileSync(CORE_TOOLS_MAIN_PATH, 'utf8');

  assert.match(main, /openAgentApprovals'[\s\S]*?openTool\('xenesis-desk\.core-tools\.agent-approvals'\)/);
  assert.match(main, /openHermesActionInbox'[\s\S]*?openTool\('xenesis-desk\.core-tools\.agent-approvals'\)/);
  assert.match(main, /openStashOperations'[\s\S]*?openTool\('xenesis-desk\.core-tools\.stash-operations'\)/);
  assert.match(main, /openHermesStashOps'[\s\S]*?openTool\('xenesis-desk\.core-tools\.stash-operations'\)/);
});
