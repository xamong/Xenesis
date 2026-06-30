import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const installer = await import('./providerIntegrationInstaller.mjs');

const NOTION_CONFIG = {
  type: 'stdio',
  command: 'npx',
  args: ['-y', '@notionhq/notion-mcp-server'],
  env: { NOTION_TOKEN: 'secret-token' },
  toolFilter: { include: ['search', 'fetch'] },
};

test('mergeCodexExternalMcpConfig replaces one external MCP server block without touching other servers', () => {
  const mergeCodexExternalMcpConfig = installer.mergeCodexExternalMcpConfig;
  assert.equal(typeof mergeCodexExternalMcpConfig, 'function');

  const next = mergeCodexExternalMcpConfig(
    [
      '[mcp_servers.fetch]',
      'enabled = true',
      'command = "uvx"',
      '',
      '[mcp_servers.notion]',
      'enabled = true',
      'command = "old"',
      '',
      '[mcp_servers.notion.env]',
      'NOTION_TOKEN = "old"',
      '',
      '[tools]',
      'enabled = true',
      '',
    ].join('\n'),
    { serverName: 'notion', config: NOTION_CONFIG },
  );

  assert.match(next, /\[mcp_servers\.fetch\]/);
  assert.match(next, /\[tools\]/);
  assert.doesNotMatch(next, /command = "old"/);
  assert.match(next, /\[mcp_servers\.notion\]\nenabled = true\ncommand = "npx"/);
  assert.match(next, /args = \["-y", "@notionhq\/notion-mcp-server"\]/);
  assert.match(next, /\[mcp_servers\.notion\.tool_filter\]\ninclude = \["search", "fetch"\]/);
  assert.match(next, /\[mcp_servers\.notion\.env\]\nNOTION_TOKEN = "secret-token"/);
});

test('mergeJsonExternalMcpConfig preserves existing JSON MCP servers and replaces the selected server', () => {
  const mergeJsonExternalMcpConfig = installer.mergeJsonExternalMcpConfig;
  assert.equal(typeof mergeJsonExternalMcpConfig, 'function');

  const next = JSON.parse(
    mergeJsonExternalMcpConfig(
      JSON.stringify({
        mcpServers: {
          fetch: { command: 'uvx', args: ['mcp-server-fetch'] },
          notion: { command: 'old' },
        },
      }),
      { serverName: 'notion', config: NOTION_CONFIG },
    ),
  );

  assert.deepEqual(next.mcpServers.fetch, { command: 'uvx', args: ['mcp-server-fetch'] });
  assert.deepEqual(next.mcpServers.notion, {
    command: 'npx',
    args: ['-y', '@notionhq/notion-mcp-server'],
    env: { NOTION_TOKEN: 'secret-token' },
    toolFilter: { include: ['search', 'fetch'] },
  });
});

test('installExternalMcpServer writes selected local CLI config with a backup and redacted result', () => {
  const installExternalMcpServer = installer.installExternalMcpServer;
  assert.equal(typeof installExternalMcpServer, 'function');

  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xenesis-mcp-apply-home-'));
  const backupRoot = path.join(homeDir, 'backups');
  const codexConfigPath = path.join(homeDir, '.codex', 'config.toml');
  fs.mkdirSync(path.dirname(codexConfigPath), { recursive: true });
  fs.writeFileSync(codexConfigPath, '[mcp_servers.fetch]\nenabled = true\ncommand = "uvx"\n', 'utf8');

  const result = installExternalMcpServer({
    serverName: 'notion',
    config: NOTION_CONFIG,
    targetIds: ['codex'],
    homeDir,
    backupRoot,
  });

  const written = fs.readFileSync(codexConfigPath, 'utf8');
  assert.equal(result.ok, true);
  assert.equal(result.serverName, 'notion');
  assert.equal(result.targets.length, 1);
  assert.equal(result.targets[0].id, 'codex');
  assert.equal(result.targets[0].changed, true);
  assert.ok(result.targets[0].backupPath.startsWith(backupRoot));
  assert.match(written, /\[mcp_servers\.notion\]/);
  assert.match(written, /NOTION_TOKEN = "secret-token"/);
  assert.equal(JSON.stringify(result).includes('secret-token'), false);
});
