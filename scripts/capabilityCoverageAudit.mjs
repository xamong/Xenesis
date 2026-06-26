import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(projectRoot, 'src', 'shared', 'deskBridgeCapabilities.ts');
const outputPath = path.join(projectRoot, 'docs', 'capability-registry-audit.md');

const tsModuleCache = new Map();

function createSandboxRequire(parentPath) {
  const fallbackRequire = createRequire(parentPath);
  return function sandboxRequire(specifier) {
    if (specifier.startsWith('.')) {
      const basePath = path.resolve(path.dirname(parentPath), specifier);
      const candidates = [
        basePath,
        `${basePath}.ts`,
        `${basePath}.js`,
        path.join(basePath, 'index.ts'),
        path.join(basePath, 'index.js'),
      ];
      const tsPath = candidates.find((candidate) => candidate.endsWith('.ts') && fs.existsSync(candidate));
      if (tsPath) {
        return loadTsModule(tsPath);
      }
    }
    return fallbackRequire(specifier);
  };
}

function loadTsModule(modulePath) {
  const cached = tsModuleCache.get(modulePath);
  if (cached) return cached.exports;

  const source = fs.readFileSync(modulePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: modulePath,
  }).outputText;
  const module = { exports: {} };
  tsModuleCache.set(modulePath, module);
  vm.runInNewContext(
    compiled,
    {
      exports: module.exports,
      module,
      require: createSandboxRequire(modulePath),
      console,
    },
    { filename: modulePath },
  );
  return module.exports;
}

function loadCapabilityModule() {
  return loadTsModule(sourcePath);
}

function escapeTable(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|');
}

function collectCoveragePaths(value, coverageName, entryKey, rows, trail = []) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCoveragePaths(item, coverageName, entryKey, rows, [...trail, String(index)]));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const nextTrail = [...trail, key];
    if (typeof child === 'string' && isCoveragePathField(key)) {
      rows.push({
        coverageName,
        entryKey,
        field: nextTrail.join('.'),
        path: child,
        kind: isEventPathField(key) ? 'event' : 'method',
      });
      continue;
    }
    if (child && typeof child === 'object') {
      collectCoveragePaths(child, coverageName, entryKey, rows, nextTrail);
    }
  }
}

function isCoveragePathField(key) {
  return key === 'capabilityPath' || key === 'eventPath' || key.endsWith('CapabilityPath') || key.endsWith('EventPath');
}

function isEventPathField(key) {
  return key === 'eventPath' || key.endsWith('EventPath');
}

function buildCoverageRows(exportsObject) {
  const rows = [];
  for (const [coverageName, coverage] of Object.entries(exportsObject)) {
    if (!coverageName.startsWith('DESK_BRIDGE_') || !coverageName.endsWith('_COVERAGE')) continue;
    if (!coverage || typeof coverage !== 'object') continue;
    for (const [entryKey, entry] of Object.entries(coverage)) {
      if (entry && typeof entry === 'object' && entry.internal === true) continue;
      collectCoveragePaths(entry, coverageName, entryKey, rows);
    }
  }
  return rows.sort(
    (left, right) =>
      left.coverageName.localeCompare(right.coverageName) ||
      left.entryKey.localeCompare(right.entryKey) ||
      left.field.localeCompare(right.field),
  );
}

function extractRegexValues(source, regex) {
  const values = [];
  let match;
  while ((match = regex.exec(source))) values.push(match[1]);
  return values;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function buildAudit() {
  const capabilityModule = loadCapabilityModule();
  const phase5Options = { xenisPhase5: true };
  const nodes = capabilityModule.listDeskBridgeCapabilities(
    capabilityModule.createDeskBridgeCapabilityTree(phase5Options),
    phase5Options,
  );
  const coverageRows = buildCoverageRows(capabilityModule);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const nodeByPath = new Map(nodes.map((node) => [node.path, node]));
  const methodPaths = new Set(nodes.filter((node) => node.callable).map((node) => node.path));
  const eventPaths = new Set(nodes.filter((node) => node.subscribable).map((node) => node.path));
  const dispatchedPaths = new Set(extractRegexValues(source, /path === '([^']+)'/g));

  const missingRegistered = [];
  const missingDispatched = [];
  for (const row of coverageRows) {
    const registeredNode = nodeByPath.get(row.path);
    if (!registeredNode) {
      missingRegistered.push(row);
      continue;
    }
    if (registeredNode.callable && !dispatchedPaths.has(row.path)) missingDispatched.push(row);
  }

  const callableStaticPaths = nodes
    .filter((node) => node.callable && !node.path.includes('{'))
    .map((node) => node.path);
  const undispatchedCallable = callableStaticPaths.filter((pathValue) => !dispatchedPaths.has(pathValue));
  const dispatchMissingTree = uniqueSorted([...dispatchedPaths].filter((pathValue) => !methodPaths.has(pathValue)));

  return {
    nodes,
    coverageRows,
    methodPaths,
    eventPaths,
    dispatchedPaths,
    missingRegistered,
    missingDispatched,
    undispatchedCallable,
    dispatchMissingTree,
  };
}

function buildDocument(audit) {
  const generatedAt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  const lines = [];
  lines.push('# Xenesis Desk Capability Registry Audit');
  lines.push('');
  lines.push(`Generated: ${generatedAt} KST`);
  lines.push('');
  lines.push(
    'This audit checks that coverage metadata points to registered capability nodes and that callable method paths are wired in `callDeskBridgeCapability()`. It runs with Phase 5 capability visibility enabled so staged XamongCode wiring is audited without exposing it in the default registry list.',
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Registered nodes: ${audit.nodes.length}`);
  lines.push(`- Callable methods: ${audit.methodPaths.size}`);
  lines.push(`- Subscribable events: ${audit.eventPaths.size}`);
  lines.push(`- Coverage path references: ${audit.coverageRows.length}`);
  lines.push(`- Dispatcher paths: ${audit.dispatchedPaths.size}`);
  lines.push(`- Missing registered paths: ${audit.missingRegistered.length}`);
  lines.push(`- Missing dispatched coverage paths: ${audit.missingDispatched.length}`);
  lines.push(`- Undispatched static callable methods: ${audit.undispatchedCallable.length}`);
  lines.push(`- Dispatcher paths missing from tree: ${audit.dispatchMissingTree.length}`);
  lines.push('');

  pushCoverageSection(lines, 'Missing Registered Paths', audit.missingRegistered);
  pushCoverageSection(lines, 'Missing Dispatched Coverage Paths', audit.missingDispatched);

  lines.push('## Undispatched Static Callable Methods');
  lines.push('');
  if (audit.undispatchedCallable.length === 0) {
    lines.push('None.');
  } else {
    for (const pathValue of audit.undispatchedCallable) lines.push(`- \`${pathValue}\``);
  }
  lines.push('');

  lines.push('## Dispatcher Paths Missing From Tree');
  lines.push('');
  if (audit.dispatchMissingTree.length === 0) {
    lines.push('None.');
  } else {
    for (const pathValue of audit.dispatchMissingTree) lines.push(`- \`${pathValue}\``);
  }
  lines.push('');

  lines.push('## Coverage Path References');
  lines.push('');
  lines.push('| Coverage | Entry | Field | Kind | Path |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of audit.coverageRows) {
    lines.push(
      `| \`${escapeTable(row.coverageName)}\` | \`${escapeTable(row.entryKey)}\` | \`${escapeTable(row.field)}\` | ${row.kind} | \`${escapeTable(row.path)}\` |`,
    );
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function pushCoverageSection(lines, title, rows) {
  lines.push(`## ${title}`);
  lines.push('');
  if (rows.length === 0) {
    lines.push('None.');
    lines.push('');
    return;
  }
  lines.push('| Coverage | Entry | Field | Kind | Path |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of rows) {
    lines.push(
      `| \`${escapeTable(row.coverageName)}\` | \`${escapeTable(row.entryKey)}\` | \`${escapeTable(row.field)}\` | ${row.kind} | \`${escapeTable(row.path)}\` |`,
    );
  }
  lines.push('');
}

const audit = buildAudit();
const markdown = buildDocument(audit);
fs.writeFileSync(outputPath, markdown, 'utf8');

const hasFailures = audit.missingRegistered.length > 0 || audit.dispatchMissingTree.length > 0;

console.log(`Wrote ${path.relative(projectRoot, outputPath)}.`);
console.log(`Capability audit: ${audit.nodes.length} nodes, ${audit.coverageRows.length} coverage path references.`);
if (hasFailures) {
  console.error(
    [
      `Missing registered paths: ${audit.missingRegistered.length}`,
      `Missing dispatched coverage paths: ${audit.missingDispatched.length}`,
      `Undispatched static callable methods: ${audit.undispatchedCallable.length}`,
      `Dispatcher paths missing from tree: ${audit.dispatchMissingTree.length}`,
    ].join('\n'),
  );
  process.exitCode = 1;
}
