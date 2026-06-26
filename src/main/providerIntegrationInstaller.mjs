import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_SERVER_NAME = 'xenesis';

const HERMES_PLUGIN_ITEMS = [
  {
    id: 'gateway',
    label: 'Xenesis Desk Gateway',
    sourceParts: ['hermes', 'plugins', 'xenesis_desk_gateway'],
    destinationParts: ['plugins', 'xenesis_desk_gateway'],
  },
  {
    id: 'bot-platform',
    label: 'Xenesis Desk Bot Platform',
    sourceParts: ['hermes', 'plugins', 'platforms', 'xenesis_desk_bot'],
    destinationParts: ['plugins', 'platforms', 'xenesis_desk_bot'],
  },
];

function normalizeText(value) {
  return String(value || '').trim();
}

function pathImplFor(value) {
  const text = String(value || '');
  return /^[A-Za-z]:[\\/]/.test(text) || text.includes('\\') ? path.win32 : path.posix;
}

function joinForRoot(root, ...parts) {
  const impl = pathImplFor(root);
  return impl.join(root, ...parts);
}

function tomlString(value) {
  return `"${String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')}"`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mcpServerEntry({ serverPath, xenisHome }) {
  const entry = {
    command: 'node',
    args: [normalizeText(serverPath)],
    env: {},
  };
  const normalizedHome = normalizeText(xenisHome);
  if (normalizedHome) entry.env.XENIS_HOME = normalizedHome;
  return entry;
}

export function mergeCodexMcpConfig(
  existingText = '',
  { serverName = DEFAULT_SERVER_NAME, serverPath, xenisHome } = {},
) {
  const normalizedServerName = normalizeText(serverName) || DEFAULT_SERVER_NAME;
  const headerPattern = new RegExp(`^\\s*\\[mcp_servers\\.${escapeRegExp(normalizedServerName)}(?:\\.|\\])`);
  const anyHeaderPattern = /^\s*\[[^\]]+\]\s*$/;
  const lines = String(existingText || '')
    .replace(/\r\n/g, '\n')
    .split('\n');
  const kept = [];
  let skipping = false;

  for (const line of lines) {
    if (anyHeaderPattern.test(line)) {
      skipping = headerPattern.test(line);
      if (skipping) continue;
    }
    if (!skipping) kept.push(line);
  }

  const trimmed = kept.join('\n').replace(/\s+$/g, '');
  const block = [
    `[mcp_servers.${normalizedServerName}]`,
    'enabled = true',
    'command = "node"',
    `args = [${tomlString(serverPath)}]`,
    '',
    `[mcp_servers.${normalizedServerName}.env]`,
    `XENIS_HOME = ${tomlString(xenisHome)}`,
  ].join('\n');

  return `${trimmed ? `${trimmed}\n\n` : ''}${block}\n`;
}

export function mergeJsonMcpConfig(
  existingText = '',
  { serverName = DEFAULT_SERVER_NAME, serverPath, xenisHome } = {},
) {
  const normalizedServerName = normalizeText(serverName) || DEFAULT_SERVER_NAME;
  let parsed = {};
  const source = normalizeText(existingText);
  if (source) {
    parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      parsed = {};
    }
  }

  const next = {
    ...parsed,
    mcpServers: {
      ...(parsed.mcpServers && typeof parsed.mcpServers === 'object' && !Array.isArray(parsed.mcpServers)
        ? parsed.mcpServers
        : {}),
      [normalizedServerName]: mcpServerEntry({ serverPath, xenisHome }),
    },
  };

  return `${JSON.stringify(next, null, 2)}\n`;
}

export function renderXenesisDeskSkill({ serverName = DEFAULT_SERVER_NAME } = {}) {
  const normalizedServerName = normalizeText(serverName) || DEFAULT_SERVER_NAME;
  return `---
name: xenesis-desk
description: Use when controlling Xenesis Desk, generating XCON/SKETCH artifacts, using Gowoori, Xenesis Agent, Capability Registry, MCP prompt packs, or validating/rendering XCON documents.
---

# Xenesis Desk

Use the \`${normalizedServerName}\` MCP server when available.

## XCON/SKETCH generation

1. Call \`xenesis_desk_get_xcon_prompt\` with the appropriate kind.
2. Generate Markdown with fenced \`xcon-sketch\` blocks.
3. Validate with \`xenesis_desk_validate_xcon_markdown\`.
4. Save/open with \`xenesis_desk_create_xcon_markdown_from_content\`.

## Desk control

1. Call \`xenesis_desk_state\`.
2. Call \`xenesis_desk_capabilities\` to inspect Capability Registry paths.
3. Call \`xenesis_desk_capability\` before invoking a CR path.
4. Call \`xenesis_desk_call_capability\` to control Xenesis Desk.

## Safety

Never store bridge tokens in long-lived prompts or config files. Let the MCP server read the Xenesis Desk bridge state from \`XENIS_HOME\`.
`;
}

export function buildCliIntegrationTargets({
  homeDir = os.homedir(),
  appDataDir = process.env.APPDATA || joinForRoot(homeDir, 'AppData', 'Roaming'),
} = {}) {
  return [
    {
      id: 'codex',
      label: 'Codex CLI',
      configType: 'codex-toml',
      supportsMcp: true,
      supportsSkill: true,
      mcpConfigPath: joinForRoot(homeDir, '.codex', 'config.toml'),
      skillPath: joinForRoot(homeDir, '.codex', 'skills', 'xenesis-desk', 'SKILL.md'),
    },
    {
      id: 'claude',
      label: 'Claude',
      configType: 'json-mcp',
      supportsMcp: true,
      supportsSkill: true,
      mcpConfigPath: joinForRoot(appDataDir, 'Claude', 'claude_desktop_config.json'),
      skillPath: joinForRoot(homeDir, '.claude', 'skills', 'xenesis-desk', 'SKILL.md'),
    },
    {
      id: 'cursor',
      label: 'Cursor',
      configType: 'json-mcp',
      supportsMcp: true,
      supportsSkill: false,
      mcpConfigPath: joinForRoot(homeDir, '.cursor', 'mcp.json'),
      skillPath: '',
    },
  ];
}

export function resolveHermesPluginPlan({ assetRoot, hermesRoot } = {}) {
  const normalizedAssetRoot = normalizeText(assetRoot);
  const normalizedHermesRoot = normalizeText(hermesRoot);
  return {
    assetRoot: normalizedAssetRoot,
    hermesRoot: normalizedHermesRoot,
    items: HERMES_PLUGIN_ITEMS.map((item) => ({
      id: item.id,
      label: item.label,
      sourcePath: normalizedAssetRoot ? joinForRoot(normalizedAssetRoot, ...item.sourceParts) : '',
      destinationPath: normalizedHermesRoot ? joinForRoot(normalizedHermesRoot, ...item.destinationParts) : '',
    })),
  };
}

function safeExists(filePath, fsImpl = fs) {
  try {
    return !!filePath && fsImpl.existsSync(filePath);
  } catch {
    return false;
  }
}

function readTextIfExists(filePath, fsImpl = fs) {
  if (!safeExists(filePath, fsImpl)) return '';
  return fsImpl.readFileSync(filePath, 'utf8');
}

function fileIncludes(filePath, text, fsImpl = fs) {
  const needle = normalizeText(text);
  if (!needle || !safeExists(filePath, fsImpl)) return false;
  try {
    return fsImpl.readFileSync(filePath, 'utf8').includes(needle);
  } catch {
    return false;
  }
}

function targetStatus(target, fsImpl = fs) {
  return {
    ...target,
    mcpInstalled:
      target.supportsMcp && fileIncludes(target.mcpConfigPath, `[mcp_servers.${DEFAULT_SERVER_NAME}]`, fsImpl)
        ? true
        : target.supportsMcp && fileIncludes(target.mcpConfigPath, `"${DEFAULT_SERVER_NAME}"`, fsImpl),
    skillInstalled: target.supportsSkill ? fileIncludes(target.skillPath, 'name: xenesis-desk', fsImpl) : false,
  };
}

export function getProviderIntegrationStatus({
  homeDir = os.homedir(),
  appDataDir = process.env.APPDATA || joinForRoot(homeDir, 'AppData', 'Roaming'),
  assetRoot = '',
  hermesRoot = '',
  fsImpl = fs,
} = {}) {
  const cliTargets = buildCliIntegrationTargets({ homeDir, appDataDir }).map((target) => targetStatus(target, fsImpl));
  const hermesPlan = resolveHermesPluginPlan({ assetRoot, hermesRoot });
  return {
    cliTargets,
    hermes: {
      ...hermesPlan,
      assetAvailable: hermesPlan.items.every((item) => safeExists(item.sourcePath, fsImpl)),
      rootConfigured: !!normalizeText(hermesRoot),
      pluginsInstalled: hermesPlan.items.every((item) => safeExists(item.destinationPath, fsImpl)),
      items: hermesPlan.items.map((item) => ({
        ...item,
        sourceAvailable: safeExists(item.sourcePath, fsImpl),
        installed: safeExists(item.destinationPath, fsImpl),
      })),
    },
  };
}

function backupExisting(filePath, backupRoot, fsImpl = fs) {
  if (!safeExists(filePath, fsImpl)) return '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupRoot, `${path.basename(filePath)}.${timestamp}.bak`);
  fsImpl.mkdirSync(path.dirname(backupPath), { recursive: true });
  fsImpl.copyFileSync(filePath, backupPath);
  return backupPath;
}

function writeTextWithBackup(filePath, content, { backupRoot, fsImpl = fs } = {}) {
  const resolvedBackupRoot = backupRoot || path.join(path.dirname(filePath), '.xenesis-desk-backups');
  const backupPath = backupExisting(filePath, resolvedBackupRoot, fsImpl);
  fsImpl.mkdirSync(path.dirname(filePath), { recursive: true });
  fsImpl.writeFileSync(filePath, content, 'utf8');
  return backupPath;
}

function findCliTarget(targetId, options = {}) {
  const target = buildCliIntegrationTargets(options).find((item) => item.id === normalizeText(targetId));
  if (!target) throw new Error(`Unsupported CLI integration target: ${targetId}`);
  return target;
}

export function installCliIntegration({
  targetId,
  installMcp = true,
  installSkill = true,
  serverName = DEFAULT_SERVER_NAME,
  serverPath,
  xenisHome,
  homeDir = os.homedir(),
  appDataDir = process.env.APPDATA || joinForRoot(homeDir, 'AppData', 'Roaming'),
  backupRoot,
  fsImpl = fs,
} = {}) {
  const target = findCliTarget(targetId, { homeDir, appDataDir });
  const changes = [];

  if (installMcp && target.supportsMcp) {
    const existing = readTextIfExists(target.mcpConfigPath, fsImpl);
    const next =
      target.configType === 'codex-toml'
        ? mergeCodexMcpConfig(existing, { serverName, serverPath, xenisHome })
        : mergeJsonMcpConfig(existing, { serverName, serverPath, xenisHome });
    const backupPath = next === existing ? '' : writeTextWithBackup(target.mcpConfigPath, next, { backupRoot, fsImpl });
    changes.push({ kind: 'mcp', path: target.mcpConfigPath, changed: next !== existing, backupPath });
  }

  if (installSkill && target.supportsSkill && target.skillPath) {
    const existing = readTextIfExists(target.skillPath, fsImpl);
    const next = renderXenesisDeskSkill({ serverName });
    const backupPath = next === existing ? '' : writeTextWithBackup(target.skillPath, next, { backupRoot, fsImpl });
    changes.push({ kind: 'skill', path: target.skillPath, changed: next !== existing, backupPath });
  }

  return {
    ok: true,
    target: targetStatus(target, fsImpl),
    changes,
  };
}

function assertPathInside(parentPath, childPath) {
  const impl = pathImplFor(parentPath || childPath);
  const parent = impl.resolve(parentPath);
  const child = impl.resolve(childPath);
  const relative = impl.relative(parent, child);
  if (relative.startsWith('..') || impl.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside target root: ${childPath}`);
  }
}

function copyDirectory(sourcePath, destinationPath, fsImpl = fs) {
  fsImpl.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fsImpl.cpSync(sourcePath, destinationPath, {
    recursive: true,
    force: true,
    errorOnExist: false,
  });
}

export function installHermesPlugins({ assetRoot, hermesRoot, fsImpl = fs } = {}) {
  const plan = resolveHermesPluginPlan({ assetRoot, hermesRoot });
  if (!plan.hermesRoot) throw new Error('Hermes root is required.');

  const installed = [];
  for (const item of plan.items) {
    if (!safeExists(item.sourcePath, fsImpl)) {
      throw new Error(`Missing provider asset: ${item.sourcePath}`);
    }
    assertPathInside(plan.hermesRoot, item.destinationPath);
    copyDirectory(item.sourcePath, item.destinationPath, fsImpl);
    installed.push(item);
  }

  return {
    ok: true,
    hermesRoot: plan.hermesRoot,
    installed,
  };
}
