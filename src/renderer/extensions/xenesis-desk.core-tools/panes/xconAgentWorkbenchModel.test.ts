import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { XenesisApprovalRequest } from '../../../../shared/types';
import {
  buildXconWorkbenchProviderOptions,
  buildXconWorkbenchRunRequest,
  isXconWorkbenchPendingApproval,
  parseXconWorkbenchApprovalResolution,
} from './xconAgentWorkbenchModel';

function runtimeApproval(overrides: Partial<XenesisApprovalRequest> = {}): XenesisApprovalRequest {
  const base: XenesisApprovalRequest = {
    id: 'approval-1',
    title: 'Approve edit',
    kind: 'runtime-tool',
    permission: 'execute',
    risk: 'medium',
    command: 'edit_file',
    description: 'Allow file edit',
    source: 'Xenesis Runtime',
    sourceChannel: '',
    sourceAgent: 'xenesis-agent-workbench',
    sessionId: 'session-1',
    approvalSessionKey: 'tool-call-1',
    requester: 'xenesis-agent-workbench',
    capabilityPath: '',
    status: 'pending',
    callbackUrl: '',
    approveText: 'Approve',
    rejectText: 'Reject',
    createdAt: '2026-06-30T00:00:00.000Z',
    updatedAt: '2026-06-30T00:00:00.000Z',
    expiresAt: '',
    resolvedAt: '',
    lastCallbackAt: '',
    result: '',
    error: '',
    migratedFrom: 'action-inbox',
    legacy: {},
  };
  return { ...base, ...overrides };
}

test('buildXconWorkbenchRunRequest scopes Workbench runs and forwards provider overrides', () => {
  const request = buildXconWorkbenchRunRequest({
    prompt: 'Build an XCON screen',
    workspace: 'D:\\Workspace\\Demo',
    mode: 'work',
    provider: 'deepseek',
    sessionId: 'session-1',
    historyMessages: [{ role: 'assistant', content: 'Previous answer' }],
  });

  assert.equal(request.prompt, 'Build an XCON screen');
  assert.equal(request.workspace, 'D:\\Workspace\\Demo');
  assert.equal(request.mode, 'work');
  assert.equal(request.workflow, 'default');
  assert.equal(request.stream, true);
  assert.equal(request.source, 'xenesis-agent-workbench');
  assert.equal(request.provider, 'deepseek');
  assert.equal(request.sessionId, 'session-1');
  assert.deepEqual(request.historyMessages, [{ role: 'assistant', content: 'Previous answer' }]);
  assert.equal(request.context?.responseSurface, 'xcon-agent-workbench');
  assert.equal(request.context?.persistencePolicy, 'explicit-user-request-only');
});

test('buildXconWorkbenchRunRequest only allows persistence for explicit save/open requests', () => {
  const readOnlyRequest = buildXconWorkbenchRunRequest({
    prompt: 'Design a dashboard in markdown',
    workspace: 'D:\\Workspace\\Demo',
    mode: 'chat',
  });
  const saveRequest = buildXconWorkbenchRunRequest({
    prompt: 'Save this dashboard as dashboard.md',
    workspace: 'D:\\Workspace\\Demo',
    mode: 'work',
  });

  assert.equal(readOnlyRequest.context?.allowPersistence, false);
  assert.equal(saveRequest.context?.allowPersistence, true);
});

test('buildXconWorkbenchProviderOptions lists current runtime and installed CLI providers', () => {
  const options = buildXconWorkbenchProviderOptions({
    providerRuntime: {
      provider: 'codex',
      model: 'gpt-5',
    },
    localCliAgents: [
      {
        id: 'codex',
        label: 'Codex CLI',
        subtitle: 'Installed',
        provider: 'codex-cli',
        accent: 'blue',
        commands: ['codex'],
        installed: true,
        commandPath: 'C:\\tools\\codex.exe',
        version: '1.0.0',
      },
      {
        id: 'claude',
        label: 'Claude CLI',
        subtitle: 'Installed',
        provider: 'claude-cli',
        accent: 'orange',
        commands: ['claude'],
        installed: true,
        commandPath: 'C:\\tools\\claude.exe',
        version: '1.0.0',
      },
    ],
    hermesEnabled: false,
  });

  assert.deepEqual(
    options.map((item) => item.value),
    ['', 'codex-cli', 'claude-cli', 'hermes'],
  );
  assert.equal(options.at(-1)?.disabled, true);
});

test('isXconWorkbenchPendingApproval filters runtime approvals by Workbench session/source', () => {
  assert.equal(
    isXconWorkbenchPendingApproval(runtimeApproval(), {
      activeSessionId: 'session-1',
      workspace: 'D:\\Workspace\\Demo',
      runStartedAt: '2026-06-30T00:00:00.000Z',
    }),
    true,
  );
  assert.equal(
    isXconWorkbenchPendingApproval(runtimeApproval({ status: 'approved' }), {
      activeSessionId: 'session-1',
      workspace: 'D:\\Workspace\\Demo',
      runStartedAt: '2026-06-30T00:00:00.000Z',
    }),
    false,
  );
});

test('parseXconWorkbenchApprovalResolution maps natural approval commands to bridge resolutions', () => {
  assert.equal(parseXconWorkbenchApprovalResolution('/approve'), 'approve');
  assert.equal(parseXconWorkbenchApprovalResolution('승인'), 'approve');
  assert.equal(parseXconWorkbenchApprovalResolution('/deny'), 'reject');
});

test('Workbench renderer and style registrations are present', () => {
  const renderer = readFileSync('src/renderer/extensions/xenesis-desk.core-tools/renderer.tsx', 'utf8');
  const styles = readFileSync('src/renderer/extensions/xenesis-desk.core-tools/styles.css', 'utf8');
  const plugin = readFileSync('extensions/xenesis-desk.core-tools/plugin.json', 'utf8');
  const extensionHost = readFileSync('src/main/extensions/extensionHost.ts', 'utf8');

  assert.match(renderer, /XconAgentWorkbenchPane/);
  assert.match(renderer, /xenesis-desk\.core-tools\.xenesis-agent-workbench/);
  assert.match(renderer, /xd-xenesis-agent-workbench/);
  assert.match(styles, /\.xd-agent-workbench/);
  assert.match(plugin, /openXenesisAgentWorkbench/);
  assert.match(extensionHost, /xenesis-desk\.core-tools\.xenesis-agent-workbench/);
});
