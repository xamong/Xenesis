import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { normalizeAgentSession } from '../../../../shared/agentSessions';
import {
  applyXconWorkbenchSubagentResults,
  attachXconWorkbenchSubagentWorker,
  buildXconWorkbenchSubagentApprovalEnvelope,
  buildXconWorkbenchSubagentAssignmentEnvelope,
  createXconWorkbenchManagedSubagentSpawnPlan,
  createXconWorkbenchSubagentAssignmentFileTransport,
  createXconWorkbenchSubagentAssignmentPlan,
  createXconWorkbenchSubagentProfileTemplateFiles,
  DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES,
  detachXconWorkbenchSubagentWorker,
  isXconWorkbenchSubagentWorkerMetadata,
  linkXconWorkbenchSubagentSessions,
  loadXconWorkbenchSubagentProfilesFromJsonFiles,
  mergeXconWorkbenchSubagentProfileLayers,
  mergeXconWorkbenchSubagentProfiles,
  normalizeXconWorkbenchSubagentProfile,
  parseXconWorkbenchSubagentResultBlocks,
  recoverXconWorkbenchSubagentWorkerOutput,
  resolveXconWorkbenchSubagentStatePath,
  selectXconWorkbenchSubagentProfileName,
  updateXconWorkbenchSubagentWorkerStatus,
  type XconWorkbenchSubagentWorker,
} from './xconAgentWorkbenchSubagents';

const paneSourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'XconAgentWorkbenchPane.tsx');

test('default subagent profiles cover researcher, implementer, and verifier', () => {
  const names = DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES.map((profile) => profile.name).sort();

  assert.deepEqual(names, ['implementer', 'researcher', 'verifier']);
  assert.equal(
    DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES.find((profile) => profile.name === 'researcher')?.permissionMode,
    'readonly',
  );
  assert.equal(
    DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES.find((profile) => profile.name === 'implementer')?.permissionMode,
    'safe',
  );
});

test('workspace profiles override global profiles by name', () => {
  const merged = mergeXconWorkbenchSubagentProfiles(
    [
      normalizeXconWorkbenchSubagentProfile({
        name: 'researcher',
        description: 'Global researcher',
        systemPrompt: 'Collect facts.',
        permissionMode: 'readonly',
      }),
    ],
    [
      normalizeXconWorkbenchSubagentProfile({
        name: 'researcher',
        description: 'Workspace researcher',
        systemPrompt: 'Collect local evidence.',
        permissionMode: 'readonly',
      }),
      normalizeXconWorkbenchSubagentProfile({
        name: 'ux-reviewer',
        description: 'Workspace UX reviewer',
        systemPrompt: 'Review interaction details.',
        permissionMode: 'readonly',
      }),
    ],
  );

  assert.deepEqual(
    merged.map((profile) => profile.name),
    ['researcher', 'ux-reviewer'],
  );
  assert.equal(merged[0]?.description, 'Workspace researcher');
  assert.equal(merged[0]?.source, 'workspace');
});

test('loads subagent profiles from JSON files and reports malformed files', () => {
  const result = loadXconWorkbenchSubagentProfilesFromJsonFiles([
    {
      filePath: 'profiles/desk-review.json',
      content: JSON.stringify({
        profiles: [
          {
            name: 'desk-reviewer',
            description: 'Desk-focused review worker',
            instructions: 'Review Desk behavior and return evidence.',
            taskKinds: ['review', 'diagnostics'],
            permissionMode: 'readonly',
            preferredCliKinds: ['codex', 'claude', 'unknown'],
          },
        ],
      }),
    },
    { filePath: 'profiles/broken.json', content: '{not json' },
  ]);

  assert.equal(result.profiles.length, 1);
  assert.equal(result.profiles[0]?.name, 'desk-reviewer');
  assert.equal(result.profiles[0]?.systemPrompt, 'Review Desk behavior and return evidence.');
  assert.deepEqual(result.profiles[0]?.preferredCliKinds, ['codex', 'claude']);
  assert.equal(result.diagnostics.length, 1);
  assert.match(result.diagnostics[0]?.message ?? '', /JSON/);
});

test('loaded profiles can override built-ins while preserving source', () => {
  const loaded = loadXconWorkbenchSubagentProfilesFromJsonFiles([
    {
      filePath: 'researcher.json',
      content: JSON.stringify({
        name: 'researcher',
        description: 'Home researcher',
        systemPrompt: 'Use the local home profile.',
        permissionMode: 'safe',
      }),
    },
    {
      filePath: 'architect.json',
      content: JSON.stringify({
        name: 'architect',
        description: 'Architecture worker',
      }),
    },
  ]);
  const merged = mergeXconWorkbenchSubagentProfileLayers(DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES, loaded.profiles);

  assert.equal(merged.find((profile) => profile.name === 'researcher')?.description, 'Home researcher');
  assert.equal(merged.find((profile) => profile.name === 'researcher')?.source, 'global');
  assert.equal(merged.find((profile) => profile.name === 'architect')?.source, 'global');
});

test('selected profile falls back to the first available profile and templates are installable', () => {
  const profiles = [
    normalizeXconWorkbenchSubagentProfile({ name: 'architect' }),
    normalizeXconWorkbenchSubagentProfile({ name: 'verifier' }),
  ];
  const files = createXconWorkbenchSubagentProfileTemplateFiles();

  assert.equal(selectXconWorkbenchSubagentProfileName('verifier', profiles), 'verifier');
  assert.equal(selectXconWorkbenchSubagentProfileName('missing', profiles), 'architect');
  assert.equal(selectXconWorkbenchSubagentProfileName('', []), '');
  assert.deepEqual(files.map((file) => file.fileName).sort(), [
    'desk-reviewer.json',
    'implementation-planner.json',
    'release-verifier.json',
  ]);
  assert.ok(files.every((file) => JSON.parse(file.content).resultSchema === 'xenesis-subagent-result-v1'));
});

test('creates a managed subagent worker spawn plan for installed local CLI terminals', () => {
  const profile = normalizeXconWorkbenchSubagentProfile({
    name: 'researcher',
    permissionMode: 'readonly',
  });
  const plan = createXconWorkbenchManagedSubagentSpawnPlan({
    cliKind: 'codex',
    profile,
    cwd: 'D:/work/project',
    shell: 'powershell',
    localCliAgents: [
      {
        id: 'codex',
        label: 'Codex CLI',
        subtitle: '',
        provider: 'openai',
        accent: '#00d4ff',
        commands: ['codex'],
        installed: true,
        commandPath: 'C:/Users/tester/AppData/Roaming/npm/codex.cmd',
        version: '1.0.0',
      },
    ],
    now: '2026-06-30T00:00:00.000Z',
  });

  assert.equal(plan.worker.managed, true);
  assert.equal(plan.worker.cliKind, 'codex');
  assert.equal(plan.worker.profileName, 'researcher');
  assert.equal(plan.request.id, plan.worker.terminalId);
  assert.equal(plan.request.kind, 'shell');
  assert.equal(plan.request.shell, 'powershell');
  assert.equal(plan.request.cwd, 'D:/work/project');
  assert.equal(plan.request.profile?.localCliAgentId, 'codex');
  assert.match(plan.request.profile?.initialCommand ?? '', /codex\.cmd/);
  assert.equal(plan.request.metadata?.kind, 'xenesis-workbench-subagent');
  assert.equal(plan.request.metadata?.workerId, plan.worker.workerId);
});

test('recognizes current and spec Workbench worker metadata kinds', () => {
  assert.equal(isXconWorkbenchSubagentWorkerMetadata({ kind: 'xenesis-workbench-subagent' }), true);
  assert.equal(isXconWorkbenchSubagentWorkerMetadata({ kind: 'xenesis-agent-worker' }), true);
  assert.equal(isXconWorkbenchSubagentWorkerMetadata({ kind: 'xenesis-desk-subagent' }), false);
  assert.equal(isXconWorkbenchSubagentWorkerMetadata(undefined), false);
});

test('attaches, reattaches, updates, and detaches terminal workers predictably', () => {
  const first = attachXconWorkbenchSubagentWorker([], {
    terminalId: 'term-1',
    terminalTitle: 'Codex',
    cwd: 'D:/a',
    cliKind: 'codex',
    profileName: 'researcher',
  });
  const second = attachXconWorkbenchSubagentWorker(first, {
    terminalId: 'term-1',
    terminalTitle: 'Claude',
    cwd: 'D:/b',
    cliKind: 'claude',
    profileName: 'verifier',
  });
  const running = updateXconWorkbenchSubagentWorkerStatus(second, second[0]!.workerId, 'running');
  const detached = detachXconWorkbenchSubagentWorker(running, second[0]!.workerId);

  assert.equal(first[0]?.status, 'idle');
  assert.match(first[0]?.workerId ?? '', /^worker-term-1-/);
  assert.equal(second.length, 1);
  assert.equal(second[0]?.workerId, first[0]?.workerId);
  assert.equal(second[0]?.terminalTitle, 'Claude');
  assert.equal(running[0]?.status, 'running');
  assert.equal(detached[0]?.status, 'detached');
});

test('links terminal workers to the latest matching native agent session', () => {
  const [worker] = attachXconWorkbenchSubagentWorker([], {
    terminalId: 'term-1',
    terminalTitle: 'Codex',
    cwd: 'D:\\Work\\Project\\',
    cliKind: 'codex',
    profileName: 'researcher',
    now: '2026-07-02T00:00:00.000Z',
  });

  const linked = linkXconWorkbenchSubagentSessions(
    [worker!],
    [
      normalizeAgentSession({
        source: 'claude',
        sourceSessionId: 'claude-1',
        projectPath: 'D:/Work/Project',
        title: 'Wrong provider',
        summary: '',
        updatedAt: '2026-07-02T00:03:00.000Z',
        resumeCommand: 'claude --resume claude-1',
        sourceDetails: { sourcePaths: ['C:/Users/tester/.claude/history.jsonl'] },
      }),
      normalizeAgentSession({
        source: 'codex',
        sourceSessionId: 'codex-old',
        projectPath: 'D:/Work/Project',
        title: 'Older Codex task',
        summary: '',
        updatedAt: '2026-07-02T00:01:00.000Z',
        resumeCommand: 'codex resume codex-old',
        sourceDetails: { sourcePaths: ['C:/Users/tester/.codex/sessions/old.jsonl'] },
      }),
      normalizeAgentSession({
        source: 'codex',
        sourceSessionId: 'codex-new',
        projectPath: 'D:/Work/Project',
        title: 'Latest Codex task',
        summary: '',
        updatedAt: '2026-07-02T00:04:00.000Z',
        resumeCommand: 'codex resume codex-new',
        sourceDetails: { sourcePaths: ['C:/Users/tester/.codex/sessions/new.jsonl'] },
      }),
    ],
    '2026-07-02T00:05:00.000Z',
  );

  assert.equal(linked[0]?.sessionLink?.sessionId, 'codex:codex-new');
  assert.equal(linked[0]?.sessionLink?.source, 'codex');
  assert.equal(linked[0]?.sessionLink?.sourcePath, 'C:/Users/tester/.codex/sessions/new.jsonl');
  assert.equal(linked[0]?.sessionLink?.resumeCommand, 'codex resume codex-new');
  assert.equal(linked[0]?.updatedAt, '2026-07-02T00:05:00.000Z');
});

test('builds assignment envelopes with central approval constraints', () => {
  const envelope = buildXconWorkbenchSubagentAssignmentEnvelope({
    worker: {
      workerId: 'worker-1',
      terminalId: 'term-1',
      terminalTitle: 'Codex',
      cwd: 'D:/work/project',
      cliKind: 'codex',
      profileName: 'researcher',
      status: 'idle',
      attachedAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
    },
    profile: normalizeXconWorkbenchSubagentProfile({
      name: 'researcher',
      systemPrompt: 'Collect evidence.',
      permissionMode: 'readonly',
    }),
    taskId: 'subtask-1',
    objective: 'Inspect terminal APIs.',
    context: 'Workspace: D:/work/project',
  });

  assert.match(envelope, /\[XENESIS SUBAGENT ASSIGNMENT\]/);
  assert.match(envelope, /worker: researcher/);
  assert.match(envelope, /task_id: subtask-1/);
  assert.match(envelope, /permission: readonly/);
  assert.match(envelope, /Do not modify files directly/);
  assert.match(envelope, /```xenesis-subagent-result/);
});

test('builds assignment envelopes with linked native session context', () => {
  const envelope = buildXconWorkbenchSubagentAssignmentEnvelope({
    worker: {
      workerId: 'worker-1',
      terminalId: 'term-1',
      terminalTitle: 'Codex',
      cwd: 'D:/work/project',
      cliKind: 'codex',
      profileName: 'researcher',
      status: 'idle',
      sessionLink: {
        sessionId: 'codex:codex-new',
        source: 'codex',
        sourceSessionId: 'codex-new',
        sourcePath: 'C:/Users/tester/.codex/sessions/new.jsonl',
        resumeCommand: 'codex resume codex-new',
        title: 'Latest Codex task',
        updatedAt: '2026-07-02T00:04:00.000Z',
      },
      attachedAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
    },
    profile: normalizeXconWorkbenchSubagentProfile({
      name: 'researcher',
      systemPrompt: 'Collect evidence.',
      permissionMode: 'readonly',
    }),
    taskId: 'subtask-1',
    objective: 'Inspect terminal APIs.',
    context: 'Workspace: D:/work/project',
  });

  assert.match(envelope, /Native session:/);
  assert.match(envelope, /codex:codex-new/);
  assert.match(envelope, /C:\/Users\/tester\/\.codex\/sessions\/new\.jsonl/);
});

test('creates file-backed assignment transport with short terminal input', () => {
  const [assignment] = createXconWorkbenchSubagentAssignmentPlan({
    prompt: 'Review the Workbench bridge path and return concise evidence.',
    workers: [
      {
        workerId: 'worker-1',
        terminalId: 'term-1',
        terminalTitle: 'Claude Code',
        cwd: 'D:/work/project',
        cliKind: 'claude',
        profileName: 'researcher',
        status: 'idle',
        attachedAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      },
    ],
    profiles: DEFAULT_XCON_WORKBENCH_SUBAGENT_PROFILES,
    now: '2026-07-01T00:00:00.000Z',
  });

  assert.ok(assignment);
  const transport = createXconWorkbenchSubagentAssignmentFileTransport({
    assignment,
    taskRootDir: 'C:\\Users\\tester\\.xenis-dev\\xenesis\\subagents\\tasks',
  });

  assert.equal(transport.filePath, 'C:\\Users\\tester\\.xenis-dev\\xenesis\\subagents\\tasks\\subtask-mr1b6yo0-1.md');
  assert.equal(transport.fileContent, assignment.envelope);
  assert.match(transport.terminalInput, /Read the Xenesis Agent Workbench assignment file/);
  assert.match(transport.terminalInput, /subtask-mr1b6yo0-1\.md/);
  assert.match(transport.terminalInput, /xenesis-subagent-result/);
  assert.doesNotMatch(transport.terminalInput, /\r|\n/);
  assert.ok(transport.terminalInput.length < assignment.envelope.length / 2);
});

test('parses result blocks, ignores contract examples, and repairs terminal-wrapped JSON', () => {
  const contract = parseXconWorkbenchSubagentResultBlocks(
    [
      'Result contract:',
      '```xenesis-subagent-result',
      '{',
      '  "taskId": "subtask-1",',
      '  "status": "completed|blocked|failed",',
      '  "summary": "Concise result summary.",',
      '  "findings": [],',
      '  "recommendedActions": [],',
      '  "requiresApproval": []',
      '}',
      '```',
    ].join('\n'),
  );
  const repaired = parseXconWorkbenchSubagentResultBlocks(
    [
      '```xenesis-subagent-result',
      '{',
      '  "taskId": "subtask-1",',
      '  "status": "completed",',
      '  "summary": "Assignment file read."',
      '",',
      '  "findings": [],',
      '  "recommendedActions": [],',
      '  "requiresApproval": []',
      '}',
      '```',
    ].join('\n'),
  );
  const malformed = parseXconWorkbenchSubagentResultBlocks('```xenesis-subagent-result\n{bad json}\n```');

  assert.deepEqual(contract, []);
  assert.equal(repaired[0]?.status, 'completed');
  assert.equal(repaired[0]?.summary, 'Assignment file read.');
  assert.equal(malformed[0]?.status, 'failed');
  assert.match(malformed[0]?.summary ?? '', /Invalid subagent result JSON/);
});

test('applies result and approval requests to matching workers', () => {
  const workers: XconWorkbenchSubagentWorker[] = [
    {
      workerId: 'worker-1',
      terminalId: 'term-1',
      terminalTitle: 'Codex',
      cwd: 'D:/work',
      cliKind: 'codex',
      profileName: 'implementer',
      status: 'running',
      currentTaskId: 'subtask-1',
      attachedAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z',
    },
  ];

  const updated = applyXconWorkbenchSubagentResults(workers, [
    {
      taskId: 'subtask-1',
      status: 'blocked',
      summary: 'Needs permission to run tests.',
      findings: [],
      recommendedActions: [],
      requiresApproval: [
        {
          approvalId: 'run-tests',
          title: 'Run test suite',
          description: 'Execute npm test before reporting completion.',
          command: 'npm test',
          risk: 'medium',
          status: 'pending',
        },
      ],
    },
  ]);

  assert.equal(updated[0]?.status, 'awaiting-result');
  assert.equal(updated[0]?.pendingApprovals?.[0]?.approvalId, 'run-tests');

  const envelope = buildXconWorkbenchSubagentApprovalEnvelope({
    worker: updated[0]!,
    approval: updated[0]!.pendingApprovals![0]!,
    decision: 'approve',
    note: 'Run the focused tests only.',
  });

  assert.match(envelope, /\[XENESIS SUBAGENT APPROVAL\]/);
  assert.match(envelope, /decision: approved/);
  assert.match(envelope, /approval_id: run-tests/);
  assert.match(envelope, /Run the focused tests only/);
});

test('recovers latest real subagent result from terminal scrollback', () => {
  const workers: XconWorkbenchSubagentWorker[] = [
    {
      workerId: 'worker-1',
      terminalId: 'term-1',
      terminalTitle: 'Codex',
      cwd: 'D:/work',
      cliKind: 'codex',
      profileName: 'researcher',
      status: 'running',
      currentTaskId: 'subtask-1',
      attachedAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    },
  ];
  const scrollback = [
    'Result contract:',
    '```xenesis-subagent-result',
    '{"taskId":"subtask-1","status":"completed|blocked|failed","summary":"Concise result summary.","findings":[],"recommendedActions":[],"requiresApproval":[]}',
    '```',
    'codex',
    '```xenesis-subagent-result',
    '{"taskId":"subtask-1","status":"completed","summary":"Verified file-backed dispatch.","findings":["Assignment file path was read."],"recommendedActions":[],"requiresApproval":[]}',
    '```',
  ].join('\n');

  const recovered = recoverXconWorkbenchSubagentWorkerOutput(workers, {
    terminalId: 'term-1',
    scrollback,
    now: '2026-07-01T00:01:00.000Z',
  });

  assert.equal(recovered[0]?.status, 'completed');
  assert.equal(recovered[0]?.lastResultSummary, 'Verified file-backed dispatch.');
  assert.equal(recovered[0]?.lastOutput, scrollback);
});

test('resolves subagent state paths without duplicating the xenesis directory', () => {
  assert.equal(
    resolveXconWorkbenchSubagentStatePath('C:\\Users\\tester\\.xenis-dev', 'tasks'),
    'C:\\Users\\tester\\.xenis-dev\\xenesis\\subagents\\tasks',
  );
  assert.equal(
    resolveXconWorkbenchSubagentStatePath('C:\\Users\\tester\\.xenis-dev\\xenesis', 'tasks'),
    'C:\\Users\\tester\\.xenis-dev\\xenesis\\subagents\\tasks',
  );
  assert.equal(
    resolveXconWorkbenchSubagentStatePath('/home/tester/.xenis-dev/xenesis/', '/profiles/'),
    '/home/tester/.xenis-dev/xenesis/subagents/profiles',
  );
});

test('Workbench pane exposes subagent profile, worker, transport, and bridge controls', () => {
  const source = readFileSync(paneSourcePath, 'utf8');

  assert.match(source, /loadXconWorkbenchSubagentProfilesFromJsonFiles/);
  assert.match(source, /mergeXconWorkbenchSubagentProfileLayers/);
  assert.match(source, /createXconWorkbenchManagedSubagentSpawnPlan/);
  assert.match(source, /createXconWorkbenchSubagentAssignmentFileTransport/);
  assert.match(source, /buildXconWorkbenchSubagentApprovalEnvelope/);
  assert.match(source, /linkXconWorkbenchSubagentSessions/);
  assert.match(source, /recoverXconWorkbenchSubagentWorkerOutput/);
  assert.match(source, /window\.agentSessionsAPI\?\.list/);
  assert.match(source, /window\.mcpBridgeAPI\.onWorkbenchSubagentAction/);
  assert.match(source, /statusWorkbenchSubagentFromPayload/);
  assert.match(source, /terminalAPI\.spawn/);
  assert.match(source, /terminalAPI\.kill/);
  assert.match(source, /terminalAPI\??\.adopt/);
  assert.match(source, /writeFileBase64/);
  assert.match(source, /revealPath/);
  assert.match(source, /selectedSubagentProfileName/);
  assert.match(source, /selectedManagedSubagentCli/);
  assert.match(source, /pendingSubagentAssignments/);
});
