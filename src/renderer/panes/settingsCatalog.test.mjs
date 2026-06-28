import assert from 'node:assert/strict';
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

test('visible Settings categories expose natural-language aliases for Agent routing', () => {
  for (const category of VISIBLE_SETTINGS_CATEGORIES) {
    assert.ok(category.naturalWords.length > 0, `${category.id} should have natural words`);
  }

  const runModel = SETTINGS_CATEGORIES.find((category) => category.id === 'run-model');
  const externalApps = SETTINGS_CATEGORIES.find((category) => category.id === 'external-apps');
  assert.ok(runModel?.naturalWords.includes('ai model'));
  assert.ok(externalApps?.naturalWords.includes('외부 앱'));
});
