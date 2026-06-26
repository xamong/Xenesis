import { existsSync } from 'node:fs';
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DESK_ROOT = resolve(SCRIPT_DIR, '..');

export const HERMES_PLUGIN_SYNC_PAIRS = [
  {
    name: 'xenesis_desk_gateway',
    source: join('plugins', 'xenesis_desk_gateway'),
    destination: join('plugins', 'xenesis_desk_gateway'),
  },
  {
    name: 'xenesis_desk_bot',
    source: join('plugins', 'platforms', 'xenesis_desk_bot'),
    destination: join('plugins', 'platforms', 'xenesis_desk_bot'),
  },
];

const IGNORED_SEGMENTS = new Set(['__pycache__', '.pytest_cache', '.mypy_cache']);

function defaultSourceRoot() {
  return join(DESK_ROOT, 'providers', 'hermes');
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !resolve(rel).startsWith(sep));
}

function shouldCopy(sourcePath) {
  const parts = sourcePath.split(/[\\/]+/);
  if (parts.some((part) => IGNORED_SEGMENTS.has(part))) return false;
  return !sourcePath.endsWith('.pyc') && !sourcePath.endsWith('.pyo');
}

async function assertDirectory(path, label) {
  let info;
  try {
    info = await stat(path);
  } catch {
    throw new Error(`${label} does not exist: ${path}`);
  }
  if (!info.isDirectory()) {
    throw new Error(`${label} is not a directory: ${path}`);
  }
}

async function copyPluginDirectory(source, destination, dryRun) {
  await assertDirectory(source, 'Plugin source');
  if (dryRun) return;
  await mkdir(dirname(destination), { recursive: true });
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, {
    recursive: true,
    dereference: true,
    filter: (sourcePath) => shouldCopy(sourcePath),
  });
}

export async function runHermesPluginSync(options = {}) {
  const sourceRoot = resolve(options.sourceRoot || defaultSourceRoot());
  const targetRoot = resolve(options.targetRoot || '');
  const dryRun = options.dryRun !== false;

  if (!options.targetRoot) {
    throw new Error('targetRoot is required. Pass --target <Hermes repo root>.');
  }
  await assertDirectory(sourceRoot, 'Hermes source root');
  if (!dryRun && !existsSync(targetRoot)) {
    await mkdir(targetRoot, { recursive: true });
  } else if (existsSync(targetRoot)) {
    await assertDirectory(targetRoot, 'Hermes target root');
  }

  const copied = [];
  for (const pair of HERMES_PLUGIN_SYNC_PAIRS) {
    const source = resolve(sourceRoot, pair.source);
    const destination = resolve(targetRoot, pair.destination);
    if (!isInside(targetRoot, destination)) {
      throw new Error(`Refusing to copy outside target root: ${destination}`);
    }
    await copyPluginDirectory(source, destination, dryRun);
    copied.push({ name: pair.name, source, destination });
  }

  return { dryRun, sourceRoot, targetRoot, copied };
}

function parseArgs(argv) {
  const options = { dryRun: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--target' || arg === '--hermes-root') {
      options.targetRoot = argv[++index];
    } else if (arg === '--source') {
      options.sourceRoot = argv[++index];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function usage() {
  return [
    'Usage: node scripts/syncHermesPlugins.mjs --target <Hermes repo root> [--source <draft root>] [--dry-run] [--json]',
    '',
    'Copies:',
    '  providers/hermes/plugins/xenesis_desk_gateway -> <target>/plugins/xenesis_desk_gateway',
    '  providers/hermes/plugins/platforms/xenesis_desk_bot -> <target>/plugins/platforms/xenesis_desk_bot',
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  const result = await runHermesPluginSync(options);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  for (const item of result.copied) {
    console.log(`${result.dryRun ? 'would copy' : 'copied'} ${item.name}`);
    console.log(`  from: ${item.source}`);
    console.log(`  to:   ${item.destination}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
