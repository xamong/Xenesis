import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeskBridgeCapabilityTree, listDeskBridgeCapabilities } from './deskBridgeCapabilities';
import {
  filterXenisPhase5SecretVaultItems,
  isXenisPhase5Enabled,
  isXenisPhase5EnabledFromEnv,
  isXenisPhase5EnabledFromSettings,
  isXenisPhase5XamongCodeCommandId,
  isXenisPhase5XamongCodeSecretItem,
} from './phase5';

test('Xenis Phase 5 is disabled by default', () => {
  assert.equal(isXenisPhase5EnabledFromEnv({}), false);
  assert.equal(isXenisPhase5EnabledFromSettings(null), false);
  assert.equal(isXenisPhase5Enabled(null, {}), false);
});

test('Xenis Phase 5 can be enabled by env or global settings', () => {
  assert.equal(isXenisPhase5EnabledFromEnv({ XENIS_PHASE_5: 'true' }), true);
  assert.equal(isXenisPhase5EnabledFromEnv({ XENIS_PHASE_5: '1' }), true);
  assert.equal(isXenisPhase5EnabledFromSettings({ featureFlags: { xenisPhase5: true } }), true);
  assert.equal(isXenisPhase5Enabled({ featureFlags: { xenisPhase5: false } }, { XENIS_PHASE_5: 'true' }), true);
});

test('XamongCode command ids are recognized as Phase 5 only', () => {
  assert.equal(isXenisPhase5XamongCodeCommandId('xenesis-desk.core-tools.openXamongCode'), true);
  assert.equal(isXenisPhase5XamongCodeCommandId('xenesis-desk.core-tools.openXenesisAgent'), false);
});

test('XamongCode secret vault items are recognized as Phase 5 only', () => {
  assert.equal(
    isXenisPhase5XamongCodeSecretItem({
      secretId: 'xamong-code:openaiApiKey',
      label: 'XamongCode OPENAI_API_KEY',
    }),
    true,
  );
  assert.equal(
    isXenisPhase5XamongCodeSecretItem({
      secretId: 'ai-provider:openai:apiKey',
      label: 'openai API Key',
    }),
    false,
  );
});

test('XamongCode secret vault items are hidden until Xenis Phase 5 is enabled', () => {
  const items = [
    { secretId: 'ai-provider:openai:apiKey', label: 'openai API Key' },
    { secretId: 'xamong-code:openAiApiKey', label: 'XamongCode OPENAI_API_KEY' },
  ];

  assert.deepEqual(
    filterXenisPhase5SecretVaultItems(items).map((item) => item.secretId),
    ['ai-provider:openai:apiKey'],
  );
  assert.deepEqual(
    filterXenisPhase5SecretVaultItems(items, { xenisPhase5: true }).map((item) => item.secretId),
    ['ai-provider:openai:apiKey', 'xamong-code:openAiApiKey'],
  );
});

test('XamongCode capabilities are hidden until Xenis Phase 5 is enabled', () => {
  const hiddenPaths = listDeskBridgeCapabilities().map((node) => node.path);
  assert.equal(hiddenPaths.includes('xd.services.xamongCode'), false);
  assert.equal(hiddenPaths.includes('xd.tools.core.xamongCode.open'), false);

  const visiblePaths = listDeskBridgeCapabilities(createDeskBridgeCapabilityTree({ xenisPhase5: true }), {
    xenisPhase5: true,
  }).map((node) => node.path);
  assert.equal(visiblePaths.includes('xd.services.xamongCode'), true);
  assert.equal(visiblePaths.includes('xd.tools.core.xamongCode.open'), true);
});
