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

test('renderXenesisDeskSkill default XCON flow saves only on explicit request', () => {
  const actual = installer.renderXenesisDeskSkill();

  assert.match(actual, /For inline chat or Workbench responses, prefer `workbench-response`/);
  assert.doesNotMatch(actual, /Save\/open with `xenesis_desk_create_xcon_markdown_from_content`/);
  assert.match(actual, /Skip validation for inline chat and Workbench responses/);
  assert.match(actual, /Return generated Markdown inline/);
  assert.match(actual, /Use renderer partial rendering and visible render errors/);
  assert.match(actual, /Validate only when the user explicitly asks to save, export, open, or validate/);
  assert.match(actual, /Save with `xenesis_desk_create_xcon_markdown_from_content` only when the user explicitly asks/);
});

test('installXenesisNativePlugins installs and enables the XCON/SKETCH plugin', () => {
  assert.equal(typeof installer.installXenesisNativePlugins, 'function');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xenesis-native-plugin-'));

  try {
    const assetRoot = path.join(root, 'provider-assets');
    const pluginAssetRoot = path.join(assetRoot, 'xenesis', 'plugins', 'xcon-sketch');
    const skillRoot = path.join(pluginAssetRoot, 'skills', 'xcon-sketch');
    const xenisHome = path.join(root, '.xenis');
    const xenesisHome = path.join(xenisHome, 'xenesis');
    const serverPath = path.join(root, 'mcp', 'xenesis-desk-mcp-server.mjs');

    fs.mkdirSync(skillRoot, { recursive: true });
    fs.writeFileSync(
      path.join(skillRoot, 'SKILL.md'),
      [
        '---',
        'name: xcon-sketch',
        'description: Installed XCON/SKETCH generation skill',
        '---',
        '',
        'Use the plugin MCP server.',
      ].join('\n'),
      'utf8',
    );
    fs.writeFileSync(
      path.join(pluginAssetRoot, 'xenesis.plugin.json'),
      JSON.stringify(
        {
          name: 'xcon-sketch',
          version: '0.1.0',
          skills: ['skills/xcon-sketch'],
          mcpServers: {
            xcon_sketch: {
              command: 'node',
              args: ['{{XENESIS_DESK_MCP_SERVER}}'],
              env: {
                XENIS_HOME: '{{XENIS_HOME}}',
              },
            },
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    const result = installer.installXenesisNativePlugins({
      assetRoot,
      xenesisHome,
      xenisHome,
      serverPath,
    });

    assert.equal(result.ok, true);
    assert.equal(result.installed?.[0]?.id, 'xcon-sketch');

    const pluginDestination = path.join(xenesisHome, 'plugins', 'xcon-sketch');
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginDestination, 'xenesis.plugin.json'), 'utf8'));
    assert.equal(manifest.mcpServers.xcon_sketch.args[0], serverPath);
    assert.equal(manifest.mcpServers.xcon_sketch.env.XENIS_HOME, xenisHome);
    assert.equal(
      fs
        .readFileSync(path.join(pluginDestination, 'skills', 'xcon-sketch', 'SKILL.md'), 'utf8')
        .includes('Use the plugin MCP server.'),
      true,
    );

    const pluginState = JSON.parse(fs.readFileSync(path.join(xenesisHome, 'plugins.json'), 'utf8'));
    assert.equal(pluginState.plugins[0].path, pluginDestination);
    assert.equal(pluginState.plugins[0].name, 'xcon-sketch');
    assert.equal(pluginState.plugins[0].enabled, true);

    const status = installer.getProviderIntegrationStatus({ assetRoot, xenesisHome });
    assert.equal(status.xenesis.pluginsInstalled, true);
    assert.equal(status.xenesis.items[0].enabled, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
