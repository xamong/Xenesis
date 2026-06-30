import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { SETTINGS_CATEGORIES, VISIBLE_SETTINGS_CATEGORIES } from './settingsCatalog.mjs';

test('Connectors is a visible Settings category near external app controls', () => {
  const connectors = SETTINGS_CATEGORIES.find((category) => category.id === 'connectors');
  assert.ok(connectors, 'connectors category exists');
  assert.notEqual(connectors.hiddenInSettingsPane, true);

  const visibleIds = VISIBLE_SETTINGS_CATEGORIES.map((category) => category.id);
  assert.ok(visibleIds.includes('connectors'), 'connectors is visible');

  const externalAppsIndex = visibleIds.indexOf('external-apps');
  const connectorsIndex = visibleIds.indexOf('connectors');
  const extensionsIndex = visibleIds.indexOf('extensions');
  assert.ok(externalAppsIndex >= 0, 'external-apps is visible');
  assert.ok(extensionsIndex >= 0, 'extensions is visible');
  assert.equal(connectorsIndex, externalAppsIndex + 1);
  assert.equal(extensionsIndex, connectorsIndex + 1);
});

test('Settings categories do not expose natural-language aliases for Agent routing', () => {
  const source = readFileSync(new URL('../../shared/xenesisSettingsCatalog.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bnaturalWords\b/);

  for (const category of VISIBLE_SETTINGS_CATEGORIES) {
    assert.equal(Object.hasOwn(category, 'naturalWords'), false, `${category.id} should not have natural words`);
  }

  const runModel = SETTINGS_CATEGORIES.find((category) => category.id === 'run-model');
  const externalApps = SETTINGS_CATEGORIES.find((category) => category.id === 'external-apps');
  assert.equal(Object.hasOwn(runModel ?? {}, 'naturalWords'), false);
  assert.equal(Object.hasOwn(externalApps ?? {}, 'naturalWords'), false);
});
