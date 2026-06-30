import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const settingsPane = readFileSync(new URL('./SettingsPane.tsx', import.meta.url), 'utf8');

test('remote terminal and file autosave only runs after a user edit marks the section dirty', () => {
  assert.match(settingsPane, /remoteProfileSettingsDirtyRef/);
  assert.match(settingsPane, /const markRemoteProfileSettingsDirty = useCallback/);
  assert.match(settingsPane, /if \(!remoteProfileSettingsDirtyRef\.current\) \{\s*return undefined;\s*\}/);
  assert.match(settingsPane, /remoteProfileSettingsDirtyRef\.current = false;/);
});

test('remote terminal and file edit handlers mark autosave dirty before mutating profile state', () => {
  assert.match(settingsPane, /markRemoteProfileSettingsDirty\(\);\s*setTerminalGroups/);
  assert.match(settingsPane, /markRemoteProfileSettingsDirty\(\);\s*setRemoteProfiles/);
  assert.match(settingsPane, /markRemoteProfileSettingsDirty\(\);\s*setLocalProfiles/);
  assert.match(settingsPane, /markRemoteProfileSettingsDirty\(\);\s*setRemoteFileGroups/);
  assert.match(settingsPane, /markRemoteProfileSettingsDirty\(\);\s*setRemoteFileProfiles/);
});

test('settings save is blocked when the initial settings payload was not loaded', () => {
  assert.match(settingsPane, /if \(!settings\) \{\s*setSettingsSaveError\(t\('settings\.settingsSaveFailed'/);
  assert.match(settingsPane, /return;\s*\}\s*if \(xenisPhase5Enabled && parsePort\(xamongPortStr\) === null\)/);
});

test('initial settings load failures are shown instead of silently ignored', () => {
  assert.doesNotMatch(
    settingsPane,
    /window\.terminalAPI\s*\.getSettings\(\)\s*\.then\(applySettingsToState\)\s*\.catch\(\(\) => \{\}\)/,
  );
  assert.match(
    settingsPane,
    /window\.terminalAPI\s*\.getSettings\(\)\s*\.then\(applySettingsToState\)\s*\.catch\(\(?error\)? => \{\s*setSettingsSaveError\(t\('settings\.settingsSaveFailed'/,
  );
});

test('AI provider settings include extended keyed providers exposed by the Desk runtime schema', () => {
  for (const provider of ['openrouter', 'mistral', 'xai']) {
    assert.match(settingsPane, new RegExp(`${provider}:\\s*\\{`), `${provider} metadata exists`);
    assert.match(settingsPane, new RegExp(`PROVIDER_ORDER[\\s\\S]*'${provider}'`), `${provider} is selectable`);
  }
});
