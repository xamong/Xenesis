import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { XenesisStatus } from '../../../../shared/types';
import {
  buildXenesisStatusBarItems,
  normalizeXenesisStatusBarKeys,
  visibleXenesisStatusBarItems,
  XENESIS_STATUS_BAR_DEFAULT_KEYS,
} from './xenesisAgentStatusBar';
import type { XenesisChatMessage } from './xenesisAgentTypes';

const status = {
  ok: true,
  running: false,
  managed: true,
  enabled: true,
  runtimeMode: 'embedded',
  url: '',
  providerRuntime: {
    provider: 'qwen',
    model: 'qwen-plus',
    profile: 'desk',
    baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'DASHSCOPE_API_KEY',
  },
  runtimePath: 'C:\\xenesis\\runtime',
  xenesisHome: 'C:\\Users\\devuser\\.xenis-dev',
  workspace: 'C:\\Users\\devuser\\.xenis-dev\\onboarding\\basic-desk',
  error: '',
  updatedAt: '2026-06-19T00:00:00.000Z',
  gateway: {
    enabled: true,
    running: false,
    host: '127.0.0.1',
    port: 3848,
    url: '',
  },
  profile: {
    active: 'desk',
    policy: {
      workflow: 'xenesis',
      approvalMode: 'safe',
    },
  },
} as unknown as XenesisStatus;

const messages: XenesisChatMessage[] = [
  { id: 'm1', at: '2026-06-19T00:00:00.000Z', role: 'user', content: '안녕' },
  { id: 'm2', at: '2026-06-19T00:00:01.000Z', role: 'assistant', content: '안녕하세요.' },
];

const stylesSource = readFileSync('src/renderer/extensions/xenesis-desk.core-tools/styles.css', 'utf8');

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesSource.match(new RegExp(`^${escaped}\\s*\\{(?<body>[\\s\\S]*?)\\}`, 'm'));
  return match?.groups?.body ?? '';
}

test('normalizeXenesisStatusBarKeys falls back to the compact default set', () => {
  assert.deepEqual(normalizeXenesisStatusBarKeys(undefined), XENESIS_STATUS_BAR_DEFAULT_KEYS);
  assert.deepEqual(normalizeXenesisStatusBarKeys([]), XENESIS_STATUS_BAR_DEFAULT_KEYS);
  assert.deepEqual(normalizeXenesisStatusBarKeys(['unknown']), XENESIS_STATUS_BAR_DEFAULT_KEYS);
});

test('normalizeXenesisStatusBarKeys keeps valid selections and drops unknown keys', () => {
  assert.deepEqual(normalizeXenesisStatusBarKeys(['workspace', 'unknown', 'session']), ['workspace', 'session']);
});

test('visibleXenesisStatusBarItems hides long diagnostic fields unless selected', () => {
  const items = buildXenesisStatusBarItems({
    status,
    mode: 'chat',
    running: false,
    runElapsedText: '0s',
    messages,
    activeSessionId: '019eb267-cf3c-76e1-83b6-c68c3163a8e5',
    policyName: 'xenesis:desk-general',
    artifactProvider: 'codex-cli',
  });

  const defaultVisible = visibleXenesisStatusBarItems(items, normalizeXenesisStatusBarKeys(undefined));
  assert.deepEqual(
    defaultVisible.map((item) => item.key),
    ['state', 'runtime', 'provider', 'model', 'mode'],
  );
  assert.equal(
    defaultVisible.some((item) => item.value.includes('onboarding\\basic-desk')),
    false,
  );

  const customVisible = visibleXenesisStatusBarItems(items, normalizeXenesisStatusBarKeys(['workspace', 'session']));
  assert.deepEqual(
    customVisible.map((item) => item.key),
    ['workspace', 'session'],
  );
  assert.equal(customVisible[0]?.value, status.workspace);
  assert.equal(customVisible[1]?.value, '019eb2...a8e5');
});

test('buildXenesisStatusBarItems renders effective provider and model', () => {
  const items = buildXenesisStatusBarItems({
    status,
    mode: 'chat',
    running: false,
    runElapsedText: '0s',
    messages,
    activeSessionId: '',
    policyName: '',
    artifactProvider: 'codex-cli',
  });

  assert.equal(items.find((item) => item.key === 'provider')?.value, 'qwen');
  assert.equal(items.find((item) => item.key === 'model')?.value, 'qwen-plus');
  assert.deepEqual(normalizeXenesisStatusBarKeys(undefined), [
    'state',
    'runtime',
    'provider',
    'model',
    'mode',
    'working',
  ]);
});

test('buildXenesisStatusBarItems includes the working item only while running', () => {
  const idleItems = buildXenesisStatusBarItems({
    status,
    mode: 'work',
    running: false,
    runElapsedText: '0s',
    messages,
    activeSessionId: '',
    policyName: '',
    artifactProvider: 'codex-cli',
  });
  assert.equal(
    idleItems.some((item) => item.key === 'working'),
    false,
  );

  const runningItems = buildXenesisStatusBarItems({
    status,
    mode: 'work',
    running: true,
    runElapsedText: '12s',
    messages,
    activeSessionId: '',
    policyName: '',
    artifactProvider: 'codex-cli',
  });
  assert.equal(runningItems.find((item) => item.key === 'working')?.value, '12s');
});

test('status bar keeps fixed UI typography outside terminal font scaling', () => {
  const terminalRule = cssRule('.xd-xenesis-terminal');
  const statusbarRule = cssRule('.xd-xenesis-terminal-statusbar');

  assert.match(terminalRule, /--xd-xenesis-terminal-font-size:\s*var\(--xd-terminal-font-size,\s*14px\)/);
  assert.match(terminalRule, /font-size:\s*var\(--xd-xenesis-terminal-font-size\)/);

  assert.match(statusbarRule, /font:\s*600 11px\/1\.2 var\(--xd-ui-font,\s*system-ui,\s*sans-serif\)/);
  assert.doesNotMatch(statusbarRule, /--xd-xenesis-terminal-font-size|--xd-terminal-font-size/);
});

test('status picker controls inherit the fixed status bar font', () => {
  const summaryRule = cssRule('.xd-xenesis-statusbar-picker summary');
  const resetButtonRule = cssRule('.xd-xenesis-statusbar-menu-head button');
  const choiceRule = cssRule('.xd-xenesis-statusbar-choice');

  assert.match(summaryRule, /font:\s*inherit/);
  assert.match(resetButtonRule, /font:\s*inherit/);
  assert.match(choiceRule, /font:\s*inherit/);
});
