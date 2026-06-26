export interface XenesisVisibleSubagentsDemoOptions {
  runId?: string;
  sleepSeconds?: number;
}

export interface XenesisVisibleSubagentWorker {
  id: string;
  title: string;
  task: string;
  marker: string;
  command: string;
  preferDeclaredSummary?: boolean;
}

export interface XenesisVisibleSubagentTerminalOptions {
  cwd?: string;
  shell?: string;
  parentTermId?: string;
}

export interface XenesisVisibleSubagentTerminalArgs {
  id: string;
  title: string;
  command: string;
  placement: 'tab';
  cwd?: string;
  shell?: string;
  rows: number;
  cols: number;
  metadata: {
    kind: 'xenesis-desk-subagent';
    subagentId: string;
    agent: 'xenesis';
    parentTermId?: string;
    task: string;
    demo: 'visible-subagents';
  };
}

export interface XenesisVisibleSubagentTailSummary {
  id: string;
  title: string;
  markerFound: boolean;
  summary: string;
}

export interface XenesisVisibleSubagentRunOptions {
  keepOpen: boolean;
  closeAfter: boolean;
  showMs: number;
  sleepSeconds: number;
  taskInput: string;
}

const VISIBLE_SUBAGENT_TASKS = [
  {
    suffix: 's1',
    title: 'Subagent 1 - Repository Scanner',
    task: 'Repository Scanner',
    lines: ['Inspect package metadata and project entry points.', 'Check README, package.json, and src layout.'],
  },
  {
    suffix: 's2',
    title: 'Subagent 2 - Typecheck Watcher',
    task: 'Typecheck Watcher',
    lines: ['Prepare focused verification commands.', 'Track typecheck and package-level test status.'],
  },
  {
    suffix: 's3',
    title: 'Subagent 3 - Demo Auditor',
    task: 'Demo Auditor',
    lines: ['Review CR scenario demo layout requirements.', 'Confirm visible terminal orchestration behavior.'],
  },
  {
    suffix: 's4',
    title: 'Subagent 4 - Release Notes',
    task: 'Release Notes',
    lines: ['Summarize user-visible behavior.', 'Prepare handoff notes for the main Xenesis agent.'],
  },
] as const;

const VISIBLE_SUBAGENT_WORK_TASKS = [
  {
    suffix: 'w1',
    title: 'Subagent 1 - Project Scan',
    task: 'Project Scan',
    lines: [
      'Inspect workspace root, package metadata, README, and source layout.',
      'Report project structure signals for the parent Xenesis Agent.',
    ],
    commands: [
      "Write-Host 'Workspace root scanned.'",
      "if (Test-Path package.json) { Write-Host 'package.json detected.'; node -e \"const p=require('./package.json'); console.log('package:', p.name || '-'); console.log('version:', p.version || '-');\" } else { Write-Host 'package.json missing.' }",
      "if (Test-Path README.md) { Write-Host 'README.md detected.' }",
      "Get-ChildItem -Name -Force | Select-Object -First 16 | ForEach-Object { Write-Host ('root item: ' + $_) }",
    ],
  },
  {
    suffix: 'w2',
    title: 'Subagent 2 - Change Audit',
    task: 'Change Audit',
    lines: [
      'Inspect git status and changed-file footprint.',
      'Report whether the workspace has broad pending changes.',
    ],
    commands: [
      "Write-Host 'Git status scan started.'",
      'git status --short --untracked-files=no | Select-Object -First 24',
      "Write-Host 'Git status scan complete.'",
    ],
  },
  {
    suffix: 'w3',
    title: 'Subagent 3 - Verification Runner',
    task: 'Verification Runner',
    lines: [
      'Run the root TypeScript verification command.',
      'Report the verification exit code for the parent Xenesis Agent.',
    ],
    commands: [
      "Write-Host 'Typecheck started.'",
      'npm run typecheck',
      '$verificationExit = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }',
      'Write-Host ("Typecheck exit code: " + $verificationExit)',
      "Write-Host 'Typecheck command complete.'",
    ],
  },
  {
    suffix: 'w4',
    title: 'Subagent 4 - Handoff Summary',
    task: 'Handoff Summary',
    lines: [
      'Inspect public-facing docs and release-readiness notes.',
      'Prepare concise handoff signals for the parent Xenesis Agent.',
    ],
    commands: [
      "Write-Host 'Documentation readiness scan started.'",
      "if (Test-Path README.md) { Write-Host 'README.md detected.' } else { Write-Host 'README.md missing.' }",
      "if (Test-Path README.ko.md) { Write-Host 'README.ko.md detected.' } else { Write-Host 'README.ko.md missing.' }",
      "if (Test-Path docs) { Write-Host 'docs directory detected.' } else { Write-Host 'docs directory missing.' }",
      "Write-Host 'Documentation readiness scan complete.'",
    ],
  },
] as const;

const XENESIS_CONTROL_DEMO_WORK_TASK = [
  'Xenesis Desk control demo:',
  'use Capability Registry to open four visible work subagents, inspect project status, typecheck, docs, and summarize.',
  'No Gowoori primary control.',
].join(' ');

function normalizeSleepSeconds(value: number | undefined): number {
  if (!Number.isFinite(value)) return 45;
  return Math.max(1, Math.min(300, Math.trunc(value || 45)));
}

function quotePowerShellString(value: string): string {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildWorkerCommand(
  worker: Omit<XenesisVisibleSubagentWorker, 'command'>,
  lines: readonly string[],
  sleepSeconds: number,
): string {
  const commands = [
    "$ErrorActionPreference = 'Stop'",
    `Write-Host ${quotePowerShellString(`${worker.title} started`)}`,
    `Write-Host ${quotePowerShellString(`Task: ${worker.task}`)}`,
    'Get-Location',
    ...lines.map((line) => `Write-Host ${quotePowerShellString(line)}`),
    `Write-Host ${quotePowerShellString(worker.marker)}`,
    `Start-Sleep -Seconds ${sleepSeconds}`,
    `Write-Host ${quotePowerShellString(`${worker.marker} complete`)}`,
  ];
  return commands.join('; ');
}

function buildWorkCommand(
  worker: Omit<XenesisVisibleSubagentWorker, 'command'>,
  userTask: string,
  lines: readonly string[],
  commands: readonly string[],
  sleepSeconds: number,
): string {
  const compactTask = compactUserTaskForTerminal(userTask);
  return [
    "$ErrorActionPreference = 'Continue'",
    `Write-Host ${quotePowerShellString(`${worker.title} started`)}`,
    `Write-Host ${quotePowerShellString(`User task: ${compactTask}`)}`,
    `Write-Host ${quotePowerShellString(`Role: ${worker.task}`)}`,
    ...lines.map((line) => `Write-Host ${quotePowerShellString(line)}`),
    ...commands,
    `Write-Host ${quotePowerShellString(worker.marker)}`,
    `Start-Sleep -Seconds ${sleepSeconds}`,
  ].join('; ');
}

function compactUserTaskForTerminal(value: string): string {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length <= 180) return normalized;
  return `${normalized.slice(0, 177).trimEnd()}...`;
}

export function createXenesisVisibleSubagentsDemoRunId(): string {
  return `xv-${Date.now().toString(36)}`;
}

export function buildXenesisVisibleSubagentsDemoWorkers(
  options: XenesisVisibleSubagentsDemoOptions = {},
): XenesisVisibleSubagentWorker[] {
  const runId = (options.runId || createXenesisVisibleSubagentsDemoRunId()).trim();
  const sleepSeconds = normalizeSleepSeconds(options.sleepSeconds);

  return VISIBLE_SUBAGENT_TASKS.map((definition) => {
    const id = `${runId}-${definition.suffix}`;
    const marker = `XENESIS_SUBAGENT_READY ${id}`;
    const workerWithoutCommand = {
      id,
      title: definition.title,
      task: definition.task,
      marker,
    };
    return {
      ...workerWithoutCommand,
      command: buildWorkerCommand(workerWithoutCommand, definition.lines, sleepSeconds),
      preferDeclaredSummary: true,
    };
  });
}

export function createXenesisVisibleSubagentWorkRunId(): string {
  return `xw-${Date.now().toString(36)}`;
}

export function buildXenesisVisibleSubagentWorkWorkers(
  userTask: string,
  options: XenesisVisibleSubagentsDemoOptions = {},
): XenesisVisibleSubagentWorker[] {
  const runId = (options.runId || createXenesisVisibleSubagentWorkRunId()).trim();
  const sleepSeconds = normalizeSleepSeconds(options.sleepSeconds);
  const trimmedTask = userTask.trim() || 'Inspect the current Xenesis Desk workspace and report status.';

  return VISIBLE_SUBAGENT_WORK_TASKS.map((definition) => {
    const id = `${runId}-${definition.suffix}`;
    const marker = `XENESIS_WORK_SUBAGENT_DONE ${id}`;
    const workerWithoutCommand = {
      id,
      title: definition.title,
      task: definition.task,
      marker,
    };
    return {
      ...workerWithoutCommand,
      command: buildWorkCommand(workerWithoutCommand, trimmedTask, definition.lines, definition.commands, sleepSeconds),
      preferDeclaredSummary: false,
    };
  });
}

export function buildXenesisVisibleSubagentTerminalArgs(
  worker: XenesisVisibleSubagentWorker,
  options: XenesisVisibleSubagentTerminalOptions = {},
): XenesisVisibleSubagentTerminalArgs {
  return {
    id: worker.id,
    title: worker.title,
    command: worker.command,
    placement: 'tab',
    ...(options.cwd ? { cwd: options.cwd } : {}),
    ...(options.shell ? { shell: options.shell } : {}),
    rows: 24,
    cols: 120,
    metadata: {
      kind: 'xenesis-desk-subagent',
      subagentId: worker.id,
      agent: 'xenesis',
      ...(options.parentTermId ? { parentTermId: options.parentTermId } : {}),
      task: worker.task,
      demo: 'visible-subagents',
    },
  };
}

function normalizeVisibleSubagentInput(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hasAnyTerm(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function extractSeconds(value: string): number | null {
  const normalized = normalizeVisibleSubagentInput(value);
  const koreanSeconds = normalized.match(/(\d+)\s*초/);
  const englishSeconds = normalized.match(/(\d+)\s*(?:sec|secs|second|seconds)\b/);
  const match = koreanSeconds || englishSeconds;
  if (!match?.[1]) return null;
  const seconds = Number.parseInt(match[1], 10);
  if (!Number.isFinite(seconds)) return null;
  return Math.max(1, Math.min(60, seconds));
}

function hasKeepOpenIntent(normalized: string): boolean {
  return (
    hasAnyTerm(normalized, ['계속', '유지', '열어둬', '열어 두', 'keep open', 'leave open']) ||
    /\bkeep\b.{0,64}\bopen\b/.test(normalized)
  );
}

function hasControlDemoExecutionIntent(normalized: string): boolean {
  return hasAnyTerm(normalized, ['데모', 'demo', '보여', 'show', 'run', '실행', '진행']);
}

function hasControlDemoExplanationIntent(normalized: string): boolean {
  return hasAnyTerm(normalized, ['설명', '무슨 기능', '어떤 기능', '뭔지', 'what is', 'explain', 'how does']);
}

export function parseXenesisVisibleSubagentRunOptions(
  input: string,
  options: { defaultTask?: string } = {},
): XenesisVisibleSubagentRunOptions {
  const normalizedInput = input.trim();
  const keepOpen = /(?:^|\s)(?:--keep-open|keep-open)(?:\s|$)/i.test(normalizedInput);
  const closeAfter = !keepOpen && /(?:^|\s)(?:--close-after|close-after)(?:\s|$)/i.test(normalizedInput);
  const showMsMatch = normalizedInput.match(/(?:--show-ms|show-ms)\s*=?\s*(\d+)/i);
  const sleepMatch = normalizedInput.match(/(?:--sleep-sec|--sleep|sleep)\s*=?\s*(\d+)/i);
  const showMs = showMsMatch?.[1] ? Math.max(0, Math.min(60000, Number.parseInt(showMsMatch[1], 10))) : 6000;
  const sleepSeconds = sleepMatch?.[1] ? Number.parseInt(sleepMatch[1], 10) : 45;
  const taskInput =
    normalizedInput
      .replace(/(?:^|\s)(?:--keep-open|keep-open)(?=\s|$)/gi, ' ')
      .replace(/(?:^|\s)(?:--close-after|close-after)(?=\s|$)/gi, ' ')
      .replace(/(?:^|\s)(?:--show-ms|show-ms)\s*=?\s*\d+/gi, ' ')
      .replace(/(?:^|\s)(?:--sleep-sec|--sleep|sleep)\s*=?\s*\d+/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    options.defaultTask?.trim() ||
    '';

  return {
    keepOpen,
    closeAfter,
    showMs,
    sleepSeconds,
    taskInput,
  };
}

export function shouldRouteXenesisInputToVisibleSubagentsDemo(input: string): boolean {
  const normalized = normalizeVisibleSubagentInput(input);
  if (!normalized || normalized.startsWith('/')) return false;

  const hasSubagent = hasAnyTerm(normalized, ['subagent', 'sub agent', '서브에이전트', '서브 에이전트']);
  if (!hasSubagent) return false;

  const hasVisibleTerminalIntent = hasAnyTerm(normalized, [
    '터미널',
    'terminal',
    'visible',
    '보여',
    '띄워',
    '열어',
    '실행',
    '바둑판',
    'grid',
    'tile',
  ]);
  if (!hasVisibleTerminalIntent) return false;

  const isOnlyExplanation =
    hasAnyTerm(normalized, ['설명', '무슨 기능', '어떤 기능', '문서', 'explain', 'what is', 'how does']) &&
    !hasAnyTerm(normalized, ['실행', '띄워', '열어', 'run', 'start', 'show']);

  return !isOnlyExplanation;
}

export function buildXenesisVisibleSubagentsDemoArgsFromInput(input: string): string {
  const normalized = normalizeVisibleSubagentInput(input);
  const seconds = extractSeconds(input);
  const showMs = seconds ? seconds * 1000 : 6000;
  const keepOpen = hasKeepOpenIntent(normalized);
  const closeAfter = !keepOpen && hasAnyTerm(normalized, ['닫아', '닫기', '정리', 'close after', 'cleanup']);

  return [`--show-ms ${showMs}`, keepOpen ? '--keep-open' : '', closeAfter ? '--close-after' : '']
    .filter(Boolean)
    .join(' ');
}

export function shouldRouteXenesisInputToVisibleSubagentWork(input: string): boolean {
  const normalized = normalizeVisibleSubagentInput(input);
  if (!normalized || normalized.startsWith('/')) return false;

  const hasSubagent = hasAnyTerm(normalized, ['subagent', 'sub agent', '서브에이전트', '서브 에이전트']);
  if (!hasSubagent) return false;

  const hasWorkIntent = hasAnyTerm(normalized, [
    '분석',
    '검증',
    '점검',
    '확인',
    '요약',
    '상태',
    '릴리즈',
    '준비',
    'check',
    'analyze',
    'analyse',
    'audit',
    'verify',
    'inspect',
    'report',
    'summarize',
    'summarise',
    'readiness',
    'release',
  ]);
  if (!hasWorkIntent) return false;

  const isExplicitDemoOnly =
    hasAnyTerm(normalized, ['데모', 'demo']) &&
    !hasAnyTerm(normalized, [
      '분석',
      '검증',
      '점검',
      '확인',
      '상태',
      'check',
      'analyze',
      'audit',
      'verify',
      'inspect',
      'readiness',
      'release',
    ]);

  return !isExplicitDemoOnly;
}

export function shouldRouteXenesisInputToControlDemoSuite(input: string): boolean {
  const normalized = normalizeVisibleSubagentInput(input);
  if (!normalized || normalized.startsWith('/')) return false;
  if (hasControlDemoExplanationIntent(normalized) && !hasControlDemoExecutionIntent(normalized)) return false;

  const hasXenesis = hasAnyTerm(normalized, ['xenesis', '제니스', '제네시스']);
  const hasDesk = hasAnyTerm(normalized, ['desk', '데스크']);
  const hasControl = hasAnyTerm(normalized, ['제어', '통제', '컨트롤', 'control', 'orchestrate', 'orchestration']);

  return hasXenesis && hasDesk && hasControl && hasControlDemoExecutionIntent(normalized);
}

export function buildXenesisControlDemoWorkArgsFromInput(input: string): string {
  const normalized = normalizeVisibleSubagentInput(input);
  const parsedOptions = parseXenesisVisibleSubagentRunOptions(input);
  const seconds = extractSeconds(input);
  const showMs = parsedOptions.showMs !== 6000 ? parsedOptions.showMs : seconds ? seconds * 1000 : 6000;
  const keepOpen = parsedOptions.keepOpen || hasKeepOpenIntent(normalized);
  const closeAfter = !keepOpen;

  return [
    XENESIS_CONTROL_DEMO_WORK_TASK,
    `--show-ms ${showMs}`,
    keepOpen ? '--keep-open' : '',
    closeAfter ? '--close-after' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function stripKoreanVisibleSubagentPrefix(input: string): string {
  return input
    .replace(/^\s*서브\s*에이전트\s*\d*\s*개\s*(?:로|가|를|을|에게|와|과)?\s*/i, '')
    .replace(/^\s*서브에이전트\s*\d*\s*개\s*(?:로|가|를|을|에게|와|과)?\s*/i, '')
    .trim();
}

export function buildXenesisVisibleSubagentWorkArgsFromInput(input: string): string {
  const normalized = normalizeVisibleSubagentInput(input);
  const seconds = extractSeconds(input);
  const showMs = seconds ? seconds * 1000 : 6000;
  const keepOpen = hasKeepOpenIntent(normalized);
  const closeAfter = !keepOpen && hasAnyTerm(normalized, ['닫아', '닫기', '정리', 'close after', 'cleanup']);
  const task =
    stripKoreanVisibleSubagentPrefix(input) || 'Inspect the current Xenesis Desk workspace and report status.';

  return [task, `--show-ms ${showMs}`, keepOpen ? '--keep-open' : '', closeAfter ? '--close-after' : '']
    .filter(Boolean)
    .join(' ');
}

export function selectXenesisVisibleSubagentSessionIds(sessions: unknown): string[] {
  if (!Array.isArray(sessions)) return [];
  return sessions.flatMap((session) => {
    if (!isPlainRecord(session)) return [];
    const id = typeof session.id === 'string' ? session.id.trim() : '';
    if (!id) return [];
    const metadata = isPlainRecord(session.metadata) ? session.metadata : null;
    const isVisibleSubagent =
      id.startsWith('xv-') || id.startsWith('xw-') || metadata?.kind === 'xenesis-desk-subagent';
    return isVisibleSubagent ? [id] : [];
  });
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function unwrapDeskResult(value: unknown): unknown {
  let current = value;
  for (let index = 0; index < 4; index += 1) {
    if (!isPlainRecord(current) || !('result' in current)) return current;
    current = current.result;
  }
  return current;
}

function cleanPathValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePathForChecks(value: string): string {
  return value.replace(/\\/g, '/').replace(/\/+$/, '');
}

function isOnboardingRuntimeWorkspace(value: string): boolean {
  const normalized = normalizePathForChecks(value).toLowerCase();
  return normalized.includes('/.xenis-dev/onboarding/');
}

function inferRepoRootFromBridgeServerPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const normalized = normalizePathForChecks(trimmed);
  const marker = '/mcp/';
  const markerIndex = normalized.toLowerCase().lastIndexOf(marker);
  if (markerIndex < 0) return '';
  const normalizedRoot = normalized.slice(0, markerIndex);
  const originalRoot = trimmed.slice(0, normalizedRoot.length);
  return originalRoot.replace(/[\\/]+$/, '');
}

function readRendererWorkspacePath(value: unknown): string {
  const current = unwrapDeskResult(value);
  const rendererState = isPlainRecord(current) && isPlainRecord(current.rendererState) ? current.rendererState : null;
  const workspace = rendererState && isPlainRecord(rendererState.workspace) ? rendererState.workspace : null;
  const explorer = rendererState && isPlainRecord(rendererState.explorer) ? rendererState.explorer : null;
  return cleanPathValue(workspace?.currentPath) || cleanPathValue(explorer?.rootDir);
}

export function resolveXenesisVisibleSubagentWorkCwd(
  runtimeWorkspace: string | undefined,
  appStatusPayload: unknown,
): string | undefined {
  const runtime = cleanPathValue(runtimeWorkspace);
  if (runtime && !isOnboardingRuntimeWorkspace(runtime)) return runtime;

  const rendererWorkspacePath = readRendererWorkspacePath(appStatusPayload);
  if (rendererWorkspacePath) return rendererWorkspacePath;

  const current = unwrapDeskResult(appStatusPayload);
  const bridge = isPlainRecord(current) && isPlainRecord(current.bridge) ? current.bridge : null;
  const bridgeRepoRoot = inferRepoRootFromBridgeServerPath(cleanPathValue(bridge?.serverPath));
  if (bridgeRepoRoot) return bridgeRepoRoot;
  return runtime || undefined;
}

function readNestedTail(value: unknown, depth = 0): string {
  if (depth > 4) return '';
  if (typeof value === 'string') return value;
  if (!isPlainRecord(value)) return '';
  for (const key of ['tail', 'output', 'text', 'streamText']) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  if ('result' in value) return readNestedTail(value.result, depth + 1);
  return '';
}

function stripAnsi(value: string): string {
  return value
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, '')
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
}

function isUsefulSubagentOutputLine(line: string, worker: XenesisVisibleSubagentWorker): boolean {
  if (!line) return false;
  if (line.includes(worker.marker)) return false;
  if (/^\$ErrorActionPreference\b/.test(line)) return false;
  if (/^PS\s+[A-Z]:\\/i.test(line)) return false;
  if (/^Path\s*$/i.test(line) || /^-+\s*$/.test(line)) return false;
  if (/^[A-Z]:\\/.test(line)) return false;
  if (/^Write-Host\b/i.test(line) || /^Start-Sleep\b/i.test(line)) return false;
  return true;
}

function isCompletedSubagentMarkerLine(line: string, worker: XenesisVisibleSubagentWorker): boolean {
  const normalized = line.replace(/\s+/g, ' ').trim();
  if (!normalized.includes(worker.marker)) return false;
  if (/Write-Host|\$ErrorActionPreference|;/.test(normalized)) return false;
  return (
    normalized === worker.marker ||
    normalized === `${worker.marker} complete` ||
    normalized.endsWith(worker.marker) ||
    normalized.endsWith(`${worker.marker} complete`)
  );
}

function isWorkSummaryBoilerplateLine(line: string): boolean {
  if (/^User task:/i.test(line) || /^Role:/i.test(line)) return true;
  return VISIBLE_SUBAGENT_WORK_TASKS.some((definition) => (definition.lines as readonly string[]).includes(line));
}

function isHighValueWorkSummaryLine(line: string): boolean {
  return /(?:exit code|detected|missing|package:|version:|scan complete|command complete|workspace root scanned)/i.test(
    line,
  );
}

function selectVisibleSubagentSummaryLines(
  worker: XenesisVisibleSubagentWorker,
  markerFound: boolean,
  lines: string[],
  declaredLines: string[],
): string[] {
  if (markerFound && worker.preferDeclaredSummary === true && declaredLines.length > 0) {
    return declaredLines;
  }
  if (worker.preferDeclaredSummary === false) {
    const startedLine = lines.find((line) => line === `${worker.title} started`);
    const evidenceLines = lines.filter((line) => line !== startedLine && !isWorkSummaryBoilerplateLine(line));
    const highValueEvidenceLines = evidenceLines.filter(isHighValueWorkSummaryLine);
    const ordinaryEvidenceLines = evidenceLines.filter((line) => !isHighValueWorkSummaryLine(line));
    const prioritizedLines = [
      ...(startedLine ? [startedLine] : []),
      ...highValueEvidenceLines,
      ...ordinaryEvidenceLines,
    ];
    if (prioritizedLines.length > 0) return prioritizedLines;
    if (markerFound && declaredLines.length > 0) {
      const declaredStartedLine = declaredLines.find((line) => line === `${worker.title} started`);
      const declaredEvidenceLines = declaredLines.filter(
        (line) => line !== declaredStartedLine && !isWorkSummaryBoilerplateLine(line),
      );
      return [...(declaredStartedLine ? [declaredStartedLine] : []), ...declaredEvidenceLines];
    }
  }
  return lines;
}

function readDeclaredWorkerOutputLines(worker: XenesisVisibleSubagentWorker): string[] {
  return [...worker.command.matchAll(/Write-Host\s+'((?:''|[^'])*)'/g)]
    .map((match) =>
      String(match[1] || '')
        .replace(/''/g, "'")
        .trim(),
    )
    .filter((line) => line && !line.includes(worker.marker));
}

export function summarizeXenesisVisibleSubagentTail(
  worker: XenesisVisibleSubagentWorker,
  payload: unknown,
): XenesisVisibleSubagentTailSummary {
  const tail = readNestedTail(payload);
  const plain = stripAnsi(tail);
  const rawLines = plain.split(/\r?\n/);
  const markerFound = rawLines.some((line) => isCompletedSubagentMarkerLine(line, worker));
  const lines = rawLines
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => isUsefulSubagentOutputLine(line, worker));
  const declaredLines = readDeclaredWorkerOutputLines(worker);
  const selectedLines = selectVisibleSubagentSummaryLines(worker, markerFound, lines, declaredLines);
  const uniqueLines = [...new Set(selectedLines)].slice(0, 4);
  return {
    id: worker.id,
    title: worker.title,
    markerFound,
    summary: uniqueLines.join('; ') || 'No readable worker output yet.',
  };
}
