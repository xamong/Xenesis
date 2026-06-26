import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(projectRoot, 'src', 'shared', 'deskBridgeCapabilities.ts');
const outputPath = path.join(projectRoot, 'docs', 'capability-registry-list.md');

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
  const sandbox = {
    exports: module.exports,
    module,
    require: createSandboxRequire(modulePath),
    console,
  };
  vm.runInNewContext(compiled, sandbox, { filename: modulePath });
  return module.exports;
}

function loadCapabilityModule() {
  return loadTsModule(sourcePath);
}

function countBy(items, selector) {
  const counts = new Map();
  for (const item of items) {
    const key = selector(item) ?? 'unknown';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([left], [right]) => String(left).localeCompare(String(right)));
}

function escapeTable(value) {
  return String(value ?? '')
    .replace(/\r?\n/g, '<br>')
    .replace(/\|/g, '\\|');
}

function flagsFor(node) {
  const flags = [];
  if (node.readable) flags.push('readable');
  if (node.writable) flags.push('writable');
  if (node.callable) flags.push('callable');
  if (node.subscribable) flags.push('subscribable');
  if (node.schema) flags.push('schema');
  return flags.join(', ');
}

function sectionKey(pathValue) {
  if (pathValue === 'xd') return 'xd';
  const parts = pathValue.split('.');
  return parts.length >= 2 ? parts.slice(0, 2).join('.') : pathValue;
}

function pushCountTable(lines, title, rows, keyLabel, valueLabel = 'Count') {
  lines.push(`## ${title}`);
  lines.push('');
  lines.push(`| ${keyLabel} | ${valueLabel} |`);
  lines.push('| --- | ---: |');
  for (const [key, count] of rows) {
    lines.push(`| ${escapeTable(key)} | ${count} |`);
  }
  lines.push('');
}

function buildCoverageRows(exportsObject) {
  const rows = [];
  for (const [key, value] of Object.entries(exportsObject)) {
    if (!key.startsWith('DESK_BRIDGE_') || !key.endsWith('_COVERAGE') || !value || typeof value !== 'object') continue;
    rows.push({
      name: key,
      entries: Object.keys(value).length,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

function buildDocument(exportsObject) {
  const tree = exportsObject.createDeskBridgeCapabilityTree();
  const nodes = exportsObject.listDeskBridgeCapabilities(tree);
  const topLevel = tree.children ?? [];
  const coverageRows = buildCoverageRows(exportsObject);
  const generatedAt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const lines = [];
  lines.push('# Xenesis Desk Capability Registry 목록');
  lines.push('');
  lines.push(`생성일: ${generatedAt}`);
  lines.push('');
  lines.push('이 문서는 Xenesis Desk Capability Registry의 현재 노드 목록을 정리한 자동 생성 문서입니다.');
  lines.push(
    '레지스트리의 단일 기준은 `src/shared/deskBridgeCapabilities.ts`이며, 이 문서는 `scripts/generateCapabilityRegistryDocs.mjs`로 재생성할 수 있습니다.',
  );
  lines.push(
    '기본 목록은 `XENIS_PHASE_5`가 꺼진 상태의 공개 capability를 기준으로 하며, Phase 5 전용 XamongCode capability는 audit 문서에서 별도로 검증합니다.',
  );
  lines.push('');
  lines.push('## 요약');
  lines.push('');
  lines.push(`- 전체 노드: ${nodes.length}`);
  lines.push(`- 호출 가능 method: ${nodes.filter((node) => node.callable).length}`);
  lines.push(`- 구독 가능 event: ${nodes.filter((node) => node.subscribable).length}`);
  lines.push(`- schema 보유 노드: ${nodes.filter((node) => node.schema).length}`);
  lines.push(`- 최상위 그룹: ${topLevel.length}`);
  lines.push('');

  pushCountTable(
    lines,
    'Kind별 노드 수',
    countBy(nodes, (node) => node.kind),
    'Kind',
  );
  pushCountTable(
    lines,
    'Permission별 노드 수',
    countBy(nodes, (node) => node.permission),
    'Permission',
  );
  pushCountTable(
    lines,
    'Approval별 노드 수',
    countBy(nodes, (node) => node.approval),
    'Approval',
  );

  lines.push('## 최상위 그룹');
  lines.push('');
  lines.push('| Path | Label | Description | Direct children |');
  lines.push('| --- | --- | --- | ---: |');
  for (const node of topLevel) {
    lines.push(
      `| \`${escapeTable(node.path)}\` | ${escapeTable(node.label)} | ${escapeTable(node.description)} | ${(node.children ?? []).length} |`,
    );
  }
  lines.push('');

  lines.push('## Coverage Map');
  lines.push('');
  lines.push(
    'Electron IPC, HTTP bridge, command palette, renderer command, dock content, menu, context action 등 기존 Xenesis Desk 기능 표면이 어떤 Capability path로 연결되는지 확인하기 위한 coverage map입니다.',
  );
  lines.push('');
  lines.push('| Coverage constant | Entries |');
  lines.push('| --- | ---: |');
  for (const row of coverageRows) {
    lines.push(`| \`${row.name}\` | ${row.entries} |`);
  }
  lines.push('');

  lines.push('## 전체 Capability 목록');
  lines.push('');
  lines.push('아래 표는 `listDeskBridgeCapabilities()` 결과를 path namespace별로 나눈 전체 목록입니다.');
  lines.push('');

  const sections = new Map();
  for (const node of nodes) {
    const key = sectionKey(node.path);
    if (!sections.has(key)) sections.set(key, []);
    sections.get(key).push(node);
  }

  for (const [key, sectionNodes] of [...sections.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    lines.push(`### ${key}`);
    lines.push('');
    lines.push('| Path | Kind | Permission | Approval | Flags | Label | Description |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const node of sectionNodes) {
      lines.push(
        `| \`${escapeTable(node.path)}\` | ${escapeTable(node.kind)} | ${escapeTable(node.permission)} | ${escapeTable(node.approval)} | ${escapeTable(flagsFor(node))} | ${escapeTable(node.label)} | ${escapeTable(node.description)} |`,
      );
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

const capabilityModule = loadCapabilityModule();
const markdown = buildDocument(capabilityModule);
fs.writeFileSync(outputPath, markdown, 'utf8');

const nodeCount = capabilityModule.listDeskBridgeCapabilities().length;
console.log(`Wrote ${path.relative(projectRoot, outputPath)} with ${nodeCount} capability nodes.`);
