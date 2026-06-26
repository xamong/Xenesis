import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPublicDocsSafetyFindings } from './checkDocsPublicSafety.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function includesExact(list, value) {
  return Array.isArray(list) && list.includes(value);
}

function entryCoversPath(entry, value) {
  const normalizedEntry = normalizePackageFilePath(entry);
  const normalizedValue = normalizePackageFilePath(value);
  if (normalizedEntry === normalizedValue) {
    return true;
  }
  if (normalizedEntry.endsWith('/**/*')) {
    const prefix = normalizedEntry.slice(0, -'/**/*'.length);
    return normalizedValue === prefix || normalizedValue.startsWith(`${prefix}/`);
  }
  return false;
}

function includesCovered(list, value) {
  for (const item of Array.isArray(list) ? list : []) {
    for (const entry of buildEntryValues(item)) {
      if (entryCoversPath(entry, value)) {
        return true;
      }
    }
  }
  return false;
}

function findFileSet(list, from, to) {
  return (Array.isArray(list) ? list : []).find(
    (item) => item && typeof item === 'object' && item.from === from && item.to === to,
  );
}

function assertFileSetFilters(fileSet, requiredFilters, label) {
  const filters = Array.isArray(fileSet?.filter) ? fileSet.filter : [];
  for (const requiredFilter of requiredFilters) {
    assert(
      filters.includes(requiredFilter),
      `${label} must exclude generated provider asset files with ${requiredFilter}`,
    );
  }
}

function buildEntryValues(entry) {
  if (typeof entry === 'string') return [entry];
  if (!entry || typeof entry !== 'object') return [];
  const values = [];
  if (typeof entry.from === 'string') values.push(entry.from);
  if (typeof entry.to === 'string') values.push(entry.to);
  if (Array.isArray(entry.filter)) {
    values.push(...entry.filter.filter((item) => typeof item === 'string'));
  }
  return values;
}

function assertNoPattern(list, pattern, label, allowedValues = []) {
  const allowed = new Set(allowedValues);
  for (const item of Array.isArray(list) ? list : []) {
    for (const value of buildEntryValues(item)) {
      if (allowed.has(value)) {
        continue;
      }
      if (pattern.test(value)) {
        fail(`${label} must not include ${value}`);
      }
    }
  }
}

const publicNpmDependencyNames = [
  '@pomelo-suite/timeline',
  '@xcon-chain/core',
  '@xcon-viewer/core',
  '@xcon-viewer/viewer',
  '@xcon-workflow/core',
];
const communityRequiredFiles = [
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CHANGELOG.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/workflows/ci.yml',
];
const publicStoryRequiredPhrases = [
  /A desktop where AI agents can see, click, type, run terminals, and render live UI while they work/,
  /What Makes It Different/,
  /What To Try First/,
];
const publicManualFiles = [
  'README.md',
  '01-workbench-docking.md',
  '02-terminal-command-center.md',
  '03-xenesis-agent.md',
  '04-gowoori-artifacts.md',
  '05-cr-mcp-gateway-bots.md',
  '06-files-workspace-settings.md',
  '07-extensions-workflow-ops.md',
  '08-troubleshooting-agent-routing.md',
];
const forbiddenPublicDocCommandPatterns = [
  /npm run check:public-release:visual/,
  /npm run test:mock-scenarios:/,
  /npm run(?:\s+(?:--silent|-s))*\s+smoke:/,
  /\b(?:node|tsx)\s+scripts\/(?:tests|demo)\//,
];

function assertPublicNpmDependencies(packageJson) {
  for (const dependencyName of publicNpmDependencyNames) {
    const dependencyValue = packageJson.dependencies?.[dependencyName];
    assert(typeof dependencyValue === 'string', `package.json must declare ${dependencyName}`);
    assert(
      !/^(file|link|workspace):/.test(dependencyValue),
      `${dependencyName} must use an npm registry version, not ${dependencyValue}`,
    );
  }
}

function requiredXenesisRuntimeDependencyNames(xenesisPackageJson) {
  return Object.keys(xenesisPackageJson?.dependencies ?? {}).sort();
}

function requiredXenesisCompanionRuntimeDependencyNames(dependencyNames) {
  const companions = [];
  if (dependencyNames.includes('playwright')) {
    companions.push('playwright-core');
  }
  return companions.sort();
}

function assertWinUnpackedXenesisRuntimeDependencies(dependencyNames) {
  const releaseRoot = path.join(root, 'release', 'win-unpacked');
  if (!existsSync(releaseRoot)) {
    return;
  }

  const unpackedNodeModules = path.join(releaseRoot, 'resources', 'app.asar.unpacked', 'node_modules');
  const xenesisEntrypoint = path.join(unpackedNodeModules, 'xenesis', 'dist', 'cli', 'main.js');
  assert(existsSync(xenesisEntrypoint), 'release/win-unpacked must include unpacked Xenesis CLI entrypoint');

  for (const dependencyName of dependencyNames) {
    assert(
      existsSync(path.join(unpackedNodeModules, ...dependencyName.split('/'), 'package.json')),
      `release/win-unpacked must include unpacked Xenesis dependency ${dependencyName}`,
    );
  }
}

function listRelativeFiles(rootDir, currentDir = rootDir) {
  const entries = [];
  for (const entry of readdirSync(currentDir, { withFileTypes: true })) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listRelativeFiles(rootDir, fullPath));
    } else if (entry.isFile()) {
      entries.push(normalizePackageFilePath(path.relative(rootDir, fullPath)));
    }
  }
  return entries;
}

function listPublicMarkdownFiles() {
  return [
    'README.md',
    'README.ko.md',
    ...listRelativeFiles(path.join(root, 'docs'))
      .filter((file) => file.endsWith('.md'))
      .filter((file) => !file.startsWith('superpowers/'))
      .map((file) => `docs/${file}`),
  ];
}

function findForbiddenProviderAssetFile(files) {
  return files.find(
    (file) => /(^|\/)__pycache__(\/|$)/.test(file) || /\.py[co]$/.test(file) || /\.test\.[^/]+$/.test(file),
  );
}

function assertWinUnpackedProviderAssets() {
  const releaseRoot = path.join(root, 'release', 'win-unpacked');
  if (!existsSync(releaseRoot)) {
    return;
  }

  const resourcesRoot = path.join(releaseRoot, 'resources');
  const providerAssetsRoot = path.join(resourcesRoot, 'provider-assets');
  assert(
    existsSync(path.join(providerAssetsRoot, 'hermes', 'plugins', 'xenesis_desk_gateway', 'plugin.yaml')),
    'release/win-unpacked must include Hermes gateway plugin provider asset',
  );
  assert(
    existsSync(path.join(providerAssetsRoot, 'hermes', 'plugins', 'platforms', 'xenesis_desk_bot', 'plugin.yaml')),
    'release/win-unpacked must include Hermes bot platform provider asset',
  );
  assert(
    existsSync(path.join(providerAssetsRoot, 'skills', 'xd', 'SKILL.md.template')),
    'release/win-unpacked must include shared skill provider asset',
  );
  assert(
    !existsSync(path.join(resourcesRoot, 'app.asar.unpacked', 'providers')),
    'release/win-unpacked must not include the full providers tree',
  );

  if (existsSync(providerAssetsRoot)) {
    const forbiddenProviderAssetFile = findForbiddenProviderAssetFile(listRelativeFiles(providerAssetsRoot));
    assert(
      !forbiddenProviderAssetFile,
      `release/win-unpacked provider-assets must not include generated/cache/test file: ${forbiddenProviderAssetFile}`,
    );
  }
}

function normalizePackageFilePath(value) {
  return String(value || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
}

export function findForbiddenXenesisPackageFiles(files) {
  const runtimeStatePatterns = [
    /(^|\/)\.xenesis(\/|$)/,
    /(^|\/)\.xenis(\/|$)/,
    /(^|\/)\.xvdesk(\/|$)/,
    /^(sessions|reports|logs|traces|runs|state|cache|tmp|temp)(\/|$)/,
  ];

  return [
    ...new Set(
      (Array.isArray(files) ? files : [])
        .map(normalizePackageFilePath)
        .filter((file) => runtimeStatePatterns.some((pattern) => pattern.test(file))),
    ),
  ];
}

export function extractNpmPackFileList(packOutput) {
  const text = String(packOutput || '').trim();
  if (!text) {
    throw new Error('npm pack did not return package file metadata');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`npm pack returned invalid JSON: ${error?.message || String(error)}`);
  }

  const packageMetadata = Array.isArray(parsed) ? parsed[0] : parsed;
  const files = packageMetadata?.files;
  if (!Array.isArray(files)) {
    throw new Error('npm pack JSON did not include a files list');
  }

  return files
    .map((file) => (typeof file === 'string' ? file : file?.path))
    .filter((file) => typeof file === 'string')
    .map(normalizePackageFilePath);
}

export function resolveXenesisPackageRoot(packageJson, baseRoot = root) {
  const dependency = packageJson?.dependencies?.xenesis;
  if (typeof dependency === 'string' && dependency.startsWith('file:')) {
    return path.resolve(baseRoot, dependency.slice('file:'.length));
  }

  const installedPath = path.join(baseRoot, 'node_modules', 'xenesis');
  return existsSync(installedPath) ? realpathSync(installedPath) : installedPath;
}

function resolveNpmCliPath() {
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || '';
}

export function listXenesisPackageFiles({ packageRoot, spawnSyncImpl = spawnSync } = {}) {
  const npmCliPath = resolveNpmCliPath();
  if (!npmCliPath) {
    throw new Error('Unable to locate npm CLI for Xenesis package inspection');
  }

  const result = spawnSyncImpl(process.execPath, [npmCliPath, 'pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: packageRoot,
    encoding: 'utf8',
    windowsHide: true,
    env: {
      ...process.env,
      npm_config_ignore_scripts: 'true',
    },
  });

  if (result.error) {
    throw new Error(`Unable to inspect Xenesis package files at ${packageRoot}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const detail = String(result.stderr || result.stdout || `exit code ${result.status}`).trim();
    throw new Error(`npm pack --dry-run failed for Xenesis at ${packageRoot}: ${detail}`);
  }

  return extractNpmPackFileList(result.stdout);
}

export function runPublicReleaseCheck() {
  failures.length = 0;

  const packageJson = JSON.parse(read('package.json'));
  const buildFiles = packageJson.build?.files ?? [];
  const asarUnpack = packageJson.build?.asarUnpack ?? [];
  const extraResources = packageJson.build?.extraResources ?? [];
  const gitignore = existsSync(path.join(root, '.gitignore')) ? read('.gitignore') : '';
  const mainSource = read('src/main/index.ts');
  const readme = read('README.md');
  const koreanReadme = read('README.ko.md');
  const hasPublicMcpServer = existsSync(path.join(root, 'mcp', 'xenesis-desk-mcp-server.mjs'));
  const releaseXenesisBotManifest = JSON.parse(read('packaging/extensions/xenesis-desk-bot/plugin.json'));
  const releaseXenesisBotMain = read('packaging/extensions/xenesis-desk-bot/main.js');
  const releaseXenesisBotAllowedCommands = [
    'xenesis-desk.core-tools.openXenisBot',
    'xenesis-desk.core-tools.openAiWorkbench',
    'xenesis-desk.core-tools.openArtifactLibrary',
    'xenesis-desk.core-tools.openTerminalInspector',
    'xenesis-desk.core-tools.openProcessViewer',
    'xenesis-desk.core-tools.openRemoteSyncPlanner',
    'xenesis-desk.core-tools.openRunTaskPanel',
    'xenesis-desk.core-tools.openSafeFileEditCenter',
    'xenesis-desk.core-tools.openXenesisAgent',
    'xenesis-desk.core-tools.openHermesStatus',
    'xenesis-desk.core-tools.openHermesActionInbox',
    'xenesis-desk.core-tools.openCapabilityExplorer',
    'xenesis-desk.core-tools.openHermesTimeline',
    'xenesis-desk.core-tools.openHermesStashOps',
    'xenesis-desk.workflow-runner.open',
    'xenesis-desk.workflow-runner.openDemoLabPlayer',
    'xenesis-desk.workflow-runner.openDemoLabMaker',
    'xenesis-desk.workflow-runner.openGowoori',
    'xenesis-desk.workflow-runner.openGowooriChat',
  ];
  let xenesisPackageJson = null;

  assert(packageJson.name === 'xenesis-desk', 'package name must stay xenesis-desk');
  assert(packageJson.build?.productName === 'Xenesis Desk', 'productName must be Xenesis Desk');
  assert(
    packageJson.build?.appId === 'com.xamong.xenesis.desk',
    'appId must remain the configured desktop app namespace',
  );
  assert(packageJson.private === true, 'package.json must stay private for the desktop app repository');
  assert(
    packageJson.repository?.type === 'git' &&
      packageJson.repository?.url === 'git+https://github.com/xamong/xenesis-desk.git',
    'package.json must point to the public GitHub repository',
  );
  assert(
    packageJson.bugs?.url === 'https://github.com/xamong/xenesis-desk/issues',
    'package.json must point bugs to GitHub Issues',
  );
  assert(
    packageJson.homepage === 'https://github.com/xamong/xenesis-desk#readme',
    'package.json must point homepage to the GitHub README',
  );
  for (const keyword of ['ai-agent', 'electron', 'mcp']) {
    assert(
      Array.isArray(packageJson.keywords) && packageJson.keywords.includes(keyword),
      `package.json keywords must include ${keyword}`,
    );
  }
  assert(
    packageJson.scripts?.['check:public-release'] === 'node ./scripts/publicReleaseCheck.mjs',
    'package.json must expose npm run check:public-release',
  );
  assert(
    packageJson.scripts?.['check:docs-public'] === 'node ./scripts/checkDocsPublicSafety.mjs',
    'package.json must expose npm run check:docs-public',
  );
  assert(
    packageJson.scripts?.['check:public-release:ci'] === 'npm run check:public-release',
    'package.json must expose npm run check:public-release:ci',
  );
  for (const file of communityRequiredFiles) {
    assert(existsSync(path.join(root, ...file.split('/'))), `GitHub community file must exist: ${file}`);
  }
  assertPublicNpmDependencies(packageJson);
  assert(
    packageJson.dependencies?.xenesis === 'file:packages/xenesis',
    'package.json must include the internal Xenesis runtime dependency',
  );

  const xenesisPackageRoot = resolveXenesisPackageRoot(packageJson);
  if (!existsSync(path.join(xenesisPackageRoot, 'package.json'))) {
    fail(`Xenesis package root must exist and contain package.json: ${xenesisPackageRoot}`);
  } else {
    xenesisPackageJson = JSON.parse(readFileSync(path.join(xenesisPackageRoot, 'package.json'), 'utf8'));
    const xenesisReadme = readFileSync(path.join(xenesisPackageRoot, 'README.md'), 'utf8');
    assert(xenesisPackageJson.private === true, 'Xenesis runtime package must remain private');
    assert(
      /internal sidecar runtime for Xenesis Desk/.test(xenesisPackageJson.description || ''),
      'Xenesis runtime package description must identify it as the internal sidecar runtime',
    );
    assert(
      /internal sidecar runtime for Xenesis Desk/.test(xenesisReadme) &&
        /not a separately versioned public npm package/.test(xenesisReadme) &&
        /file:packages\/xenesis/.test(xenesisReadme),
      'Xenesis README must document the internal sidecar runtime release boundary',
    );
    for (const dependencyName of requiredXenesisRuntimeDependencyNames(xenesisPackageJson)) {
      assert(
        Boolean(packageJson.dependencies?.[dependencyName]),
        `package.json must include Xenesis runtime dependency ${dependencyName}`,
      );
    }

    try {
      const forbiddenXenesisFiles = findForbiddenXenesisPackageFiles(
        listXenesisPackageFiles({ packageRoot: xenesisPackageRoot }),
      );
      for (const file of forbiddenXenesisFiles) {
        fail(`Xenesis package must not include runtime state file ${file}`);
      }
    } catch (error) {
      fail(error?.message || String(error));
    }
  }

  assert(packageJson.build?.publish?.provider === 'github', 'public release publish provider must be GitHub Releases');
  assert(
    packageJson.build?.publish?.owner === 'xamong' &&
      packageJson.build?.publish?.repo === 'xenesis-desk' &&
      packageJson.build?.publish?.releaseType === 'draft',
    'public release publish target must be xamong/xenesis-desk draft GitHub Releases',
  );
  assert(/channel:\s*'public-stable'/.test(mainSource), 'default updater channel must be public-stable');
  assert(
    /displayUrl:\s*'https:\/\/github\.com\/xamong\/xenesis-desk\/releases\/latest'/.test(mainSource) &&
      /feed:\s*\{\s*provider:\s*'github',\s*owner:\s*'xamong',\s*repo:\s*'xenesis-desk'\s*\}/.test(mainSource),
    'main updater feed map must keep public-stable on GitHub Releases',
  );

  assert(includesExact(buildFiles, 'extensions/sample.*/*'), 'public package must include public sample extensions');
  assert(
    includesCovered(buildFiles, 'node_modules/xenesis/**/*'),
    'public package must explicitly include the Xenesis runtime',
  );
  assert(
    includesCovered(asarUnpack, 'node_modules/xenesis/**/*'),
    'public package must unpack the Xenesis runtime for external node processes',
  );
  if (xenesisPackageJson) {
    const xenesisRuntimeDependencyNames = requiredXenesisRuntimeDependencyNames(xenesisPackageJson);
    const xenesisCompanionRuntimeDependencyNames =
      requiredXenesisCompanionRuntimeDependencyNames(xenesisRuntimeDependencyNames);
    for (const dependencyName of xenesisRuntimeDependencyNames) {
      assert(
        includesCovered(asarUnpack, `node_modules/${dependencyName.split('/').join('/')}/**/*`),
        `public package must unpack Xenesis runtime dependency ${dependencyName}`,
      );
    }
    for (const dependencyName of xenesisCompanionRuntimeDependencyNames) {
      assert(
        includesCovered(asarUnpack, `node_modules/${dependencyName.split('/').join('/')}/**/*`),
        `public package must unpack Xenesis companion runtime dependency ${dependencyName}`,
      );
    }
    assertWinUnpackedXenesisRuntimeDependencies([
      ...xenesisRuntimeDependencyNames,
      ...xenesisCompanionRuntimeDependencyNames,
    ]);
  }
  const releaseXenesisBotFileSet = findFileSet(
    buildFiles,
    'packaging/extensions/xenesis-desk-bot',
    'extensions/xenesis-desk.release-xenesis-bot',
  );
  assert(Boolean(releaseXenesisBotFileSet), 'public package must include the release-only Xenesis Bot extension shim');
  assert(
    Array.isArray(releaseXenesisBotFileSet?.filter) && releaseXenesisBotFileSet.filter.includes('**/*'),
    'Xenesis Bot release extension shim must include all files under packaging/extensions/xenesis-desk-bot',
  );
  const releaseXenesisBotCommands =
    releaseXenesisBotManifest.contributes?.commands?.map((command) => command.command) ?? [];
  assert(
    releaseXenesisBotManifest.id === 'xenesis-desk.release-xenesis-bot',
    'Xenesis Bot release extension shim must use the release-only extension id',
  );
  assert(
    releaseXenesisBotCommands.length === releaseXenesisBotAllowedCommands.length &&
      releaseXenesisBotAllowedCommands.every((command, index) => releaseXenesisBotCommands[index] === command),
    'Xenesis Bot release extension shim must contribute only release-safe extension commands',
  );
  assert(
    releaseXenesisBotManifest.contributes?.menus?.tools?.length === releaseXenesisBotAllowedCommands.length &&
      releaseXenesisBotAllowedCommands.every(
        (command, index) => releaseXenesisBotManifest.contributes.menus.tools[index] === command,
      ),
    'Xenesis Bot release extension shim must expose only release-safe extension commands in Tools',
  );
  assert(
    releaseXenesisBotManifest.contributes?.menus?.commandPalette?.length === releaseXenesisBotAllowedCommands.length &&
      releaseXenesisBotAllowedCommands.every(
        (command, index) => releaseXenesisBotManifest.contributes.menus.commandPalette[index] === command,
      ),
    'Xenesis Bot release extension shim must expose only release-safe extension commands in the command palette',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openXenisBot'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.xenesis-bot'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Xenesis Bot tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openAiWorkbench'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.ai-workbench'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the AI Workbench tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openArtifactLibrary'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.artifact-library'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Artifact Library tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openTerminalInspector'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.terminal-inspector'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Terminal Inspector tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openProcessViewer'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.process-viewer'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Process Viewer tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openRemoteSyncPlanner'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.remote-sync-planner'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Remote Sync Planner tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openRunTaskPanel'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.run-task-panel'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Run Task Panel tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openSafeFileEditCenter'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.safe-file-edit-center'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Safe File Edit Center tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openXenesisAgent'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.xenesis-agent'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Xenesis Agent tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openHermesStatus'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.hermes-status'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Hermes Status tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openHermesActionInbox'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.hermes-action-inbox'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Action Inbox tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openCapabilityExplorer'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.capability-explorer'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Capability Explorer tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openHermesTimeline'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.hermes-timeline'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Hermes Timeline tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.core-tools\.openHermesStashOps'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.core-tools\.hermes-stash-ops'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Hermes Stash Operations tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.workflow-runner\.open'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.workflow-runner\.runner'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Workflow Runner tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.workflow-runner\.openDemoLabPlayer'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.workflow-runner\.demo-lab-playback'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Demo Lab Player tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.workflow-runner\.openDemoLabMaker'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.workflow-runner\.demo-lab-player'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Demo Lab Maker tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.workflow-runner\.openGowoori'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.workflow-runner\.gowoori'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the Gowoori tool',
  );
  assert(
    /registerCommand\('xenesis-desk\.workflow-runner\.openGowooriChat'/.test(releaseXenesisBotMain) &&
      /openTool\('xenesis-desk\.workflow-runner\.gowoori-chat'\)/.test(releaseXenesisBotMain),
    'Xenesis Bot release extension shim must open the GowooriChat tool',
  );
  assert(
    !/openXamongCode|openPreview|openMetaManagement|openQueryAnalyzer|openQueryAnalyzerOD|openSqliteServerSettings|xamong-code-chat|xapp-preview|meta-management|query-analyzer|sqlite-server-settings/.test(
      releaseXenesisBotMain,
    ),
    'Xenesis Bot release extension shim must not register unreleased core or data tool commands',
  );
  if (hasPublicMcpServer) {
    assert(
      includesExact(buildFiles, 'mcp/**/*'),
      'public package must include the Xenesis Desk MCP server when mcp/ exists',
    );
  }
  const hermesGatewayProviderAssetSet = findFileSet(
    extraResources,
    'providers/hermes/plugins/xenesis_desk_gateway',
    'provider-assets/hermes/plugins/xenesis_desk_gateway',
  );
  const hermesBotProviderAssetSet = findFileSet(
    extraResources,
    'providers/hermes/plugins/platforms/xenesis_desk_bot',
    'provider-assets/hermes/plugins/platforms/xenesis_desk_bot',
  );
  const skillProviderAssetSet = findFileSet(extraResources, 'providers/shared/skills/xd', 'provider-assets/skills/xd');
  const providerAssetRequiredExcludes = ['!**/__pycache__/**', '!**/*.pyc', '!**/*.pyo', '!**/*.test.*'];
  assert(
    Boolean(hermesGatewayProviderAssetSet),
    'public package must include the Hermes gateway plugin as provider-assets',
  );
  assert(
    Boolean(hermesBotProviderAssetSet),
    'public package must include the Hermes bot platform plugin as provider-assets',
  );
  assert(Boolean(skillProviderAssetSet), 'public package must include shared provider skills as provider-assets');
  if (hermesGatewayProviderAssetSet) {
    assertFileSetFilters(
      hermesGatewayProviderAssetSet,
      providerAssetRequiredExcludes,
      'Hermes gateway provider asset set',
    );
  }
  if (hermesBotProviderAssetSet) {
    assertFileSetFilters(hermesBotProviderAssetSet, providerAssetRequiredExcludes, 'Hermes bot provider asset set');
  }
  if (skillProviderAssetSet) {
    assertFileSetFilters(skillProviderAssetSet, providerAssetRequiredExcludes, 'shared skill provider asset set');
  }
  assert(
    !includesExact(extraResources, 'providers/**/*'),
    'public package must not include the full providers tree as an extra resource',
  );
  assert(!includesExact(buildFiles, 'providers/**/*'), 'public package must not include the full providers tree');
  assertWinUnpackedProviderAssets();
  assert(!includesExact(buildFiles, 'extensions/**/*'), 'public package must not include every extension folder');
  assertNoPattern(buildFiles, /extensions\/xenesis-desk\./, 'build.files', [
    'extensions/xenesis-desk.release-xenesis-bot',
  ]);
  assertNoPattern(buildFiles, /src\/renderer\/extensions\/xenesis-desk\./, 'build.files');
  assertNoPattern(buildFiles, /extensions-private/, 'build.files');
  assertNoPattern(buildFiles, /vendor\/xamongcode/, 'build.files');
  assertNoPattern(buildFiles, /(^|\/)\.xenesis(\/|$)/, 'build.files');
  assertNoPattern(buildFiles, /(^|\/)\.xenis(\/|$)/, 'build.files');
  assertNoPattern(asarUnpack, /extensions\/xenesis-desk\./, 'build.asarUnpack');
  assertNoPattern(asarUnpack, /src\/renderer\/extensions\/xenesis-desk\./, 'build.asarUnpack');
  assertNoPattern(asarUnpack, /extensions-private/, 'build.asarUnpack');
  assertNoPattern(asarUnpack, /vendor\/xamongcode/, 'build.asarUnpack');
  assertNoPattern(asarUnpack, /(^|\/)\.xenesis(\/|$)/, 'build.asarUnpack');
  assertNoPattern(asarUnpack, /(^|\/)\.xenis(\/|$)/, 'build.asarUnpack');
  if (hasPublicMcpServer) {
    assert(
      includesExact(asarUnpack, 'mcp/**/*'),
      'public package must unpack the Xenesis Desk MCP server for external node processes when mcp/ exists',
    );
  }

  for (const ignoredPath of ['extensions-private/']) {
    assert(gitignore.includes(ignoredPath), `.gitignore must exclude ${ignoredPath}`);
  }

  assert(/npm run check:public-release/.test(readme), 'README must document npm run check:public-release');
  assert(/npm run check:public-release:ci/.test(readme), 'README must document npm run check:public-release:ci');
  assert(
    /https:\/\/github\.com\/xamong\/xenesis-desk/.test(readme),
    'README must link to the public GitHub repository',
  );
  assert(/Community/.test(readme), 'README must include a Community section');
  assert(/Early alpha/.test(readme), 'README must identify the current release maturity as Early alpha');
  assert(/Pull requests are welcome/.test(readme), 'README must invite pull requests');
  assert(/active community participation/.test(readme), 'README must invite active community participation');
  assert(/GitHub/.test(koreanReadme), 'Korean README must include GitHub guidance');
  for (const phrase of publicStoryRequiredPhrases) {
    assert(phrase.test(readme), `README must include public story phrase: ${phrase}`);
  }
  assert(
    /AI 에이전트가 보고, 클릭하고, 입력하고, 터미널을 실행하고, 작업 중에 실시간 UI를 렌더링하는 데스크톱/.test(
      koreanReadme,
    ),
    'Korean README must include the public story tagline',
  );
  assert(/얼리 알파/.test(koreanReadme), 'Korean README must identify the current release maturity as Early alpha');
  assert(/적극적인 커뮤니티 참여/.test(koreanReadme), 'Korean README must invite active community participation');
  assert(/PR을 환영합니다/.test(koreanReadme), 'Korean README must invite pull requests');
  assert(/무엇이 다른가/.test(koreanReadme), 'Korean README must include the differentiation section');
  assert(/먼저 해볼 것/.test(koreanReadme), 'Korean README must include the first-try section');
  for (const file of publicManualFiles) {
    const content = read(`docs/manual/${file}`);
    assert(!/[\u3131-\u318E\uAC00-\uD7A3]/.test(content), `docs/manual/${file} must be English`);
  }
  const manualIndex = read('docs/manual/README.md');
  for (const phrase of [
    /# Xenesis Desk Manual/,
    /Early alpha/,
    /Workbench and docking/,
    /Terminal Command Center/,
    /Troubleshooting/,
  ]) {
    assert(phrase.test(manualIndex), `manual index must include ${phrase}`);
  }
  assert(!/draft[\\/]/.test(readme), 'README must not link to ignored draft files');
  assert(!/draft[\\/]/.test(koreanReadme), 'Korean README must not link to ignored draft files');
  assert(gitignore.includes('draft/'), '.gitignore must exclude draft/');
  for (const file of listPublicMarkdownFiles()) {
    assert(!/draft[\\/]/.test(read(file)), `public documentation must not reference ignored draft files: ${file}`);
    for (const pattern of forbiddenPublicDocCommandPatterns) {
      assert(
        !pattern.test(read(file)),
        `public documentation must not reference non-public script command ${pattern}: ${file}`,
      );
    }
  }
  for (const finding of findPublicDocsSafetyFindings()) {
    fail(`public documentation must not expose ${finding.label}: ${finding.file}:${finding.line}`);
  }
  assert(/npm run typecheck/.test(read('CONTRIBUTING.md')), 'CONTRIBUTING must document typecheck');
  assert(
    /npm run check:docs-public/.test(read('CONTRIBUTING.md')),
    'CONTRIBUTING must document the public docs safety check',
  );
  assert(
    /npm run check:public-release:ci/.test(read('CONTRIBUTING.md')),
    'CONTRIBUTING must document the CI release guard',
  );
  assert(
    /GitHub Security Advisory/.test(read('SECURITY.md')),
    'SECURITY must route sensitive reports to GitHub Security Advisory',
  );
  assert(/Discussions|Issues/.test(read('SUPPORT.md')), 'SUPPORT must route help to GitHub Discussions or Issues');
  assert(/0\.1\.0/.test(read('CHANGELOG.md')), 'CHANGELOG must document the initial public version');
  const workflow = read('.github/workflows/ci.yml');
  assert(/npm ci/.test(workflow), 'CI workflow must install with npm ci');
  assert(/npm run typecheck/.test(workflow), 'CI workflow must run typecheck');
  assert(/npm run check:docs-public/.test(workflow), 'CI workflow must run the public docs safety check');
  assert(/npm run check:public-release/.test(workflow), 'CI workflow must run the public release guard');
  for (const ignoredPath of ['.claude/', '.tmp*', '.xenis-*']) {
    assert(gitignore.includes(ignoredPath), `.gitignore must exclude ${ignoredPath}`);
  }

  if (failures.length > 0) {
    console.error('Public release check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('Public release check passed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runPublicReleaseCheck();
}
