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
  assert.ok(connectorsIndex > externalAppsIndex, 'connectors follows external-apps');
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

test('SettingsPane exposes Xenesis native plugin integration controls', () => {
  const settingsPane = readFileSync(new URL('./SettingsPane.tsx', import.meta.url), 'utf8');
  const english = readFileSync(new URL('../i18n/en.ts', import.meta.url), 'utf8');
  const korean = readFileSync(new URL('../i18n/ko.ts', import.meta.url), 'utf8');

  assert.match(settingsPane, /providerIntegrationStatus\?\.xenesis/);
  assert.match(settingsPane, /installXenesisPlugins/);
  assert.match(settingsPane, /settings\.xenesisNativePluginTitle/);
  assert.match(settingsPane, /settings\.xenesisNativePluginInstall/);
  assert.match(english, /xenesisNativePluginTitle:\s*'Xenesis Agent plugin'/);
  assert.match(korean, /xenesisNativePluginTitle:\s*'Xenesis Agent 플러그인'/);
});

test('SettingsPane updates category chrome before rendering heavy category content', () => {
  const settingsPane = readFileSync(new URL('./SettingsPane.tsx', import.meta.url), 'utf8');

  assert.match(settingsPane, /useDeferredValue/);
  assert.match(settingsPane, /const renderedActiveCategory = useDeferredValue\(activeCategory\)/);
  assert.match(settingsPane, /const settingsContentPending = renderedActiveCategory !== activeCategory/);
  assert.match(settingsPane, /const renderActiveCategory = \(category: SettingsCategoryId = renderedActiveCategory\)/);
  assert.match(settingsPane, /switch \(category as string\)/);
  assert.match(settingsPane, /className=\{cls\('sp-content', settingsContentPending && 'is-switching'\)\}/);
  assert.match(settingsPane, /aria-busy=\{settingsContentPending\}/);
  assert.match(settingsPane, /renderActiveCategory\(renderedActiveCategory\)/);
});
