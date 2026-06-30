import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResolvedRendererMenuItem } from './appMenuModel';
import {
  APP_MENU_MODEL,
  collectAppMenuCommandIds,
  collectNativeAppMenuItems,
  resolveRendererToolsMenu,
} from './appMenuModel';
import type { ExtensionCommandDescriptor } from './types';
import { XENESIS_TUI_CAPABILITY_PATH } from './xenesisTui';

function command(id: string, extensionId = 'xenesis-desk.core-tools'): ExtensionCommandDescriptor {
  return {
    id,
    title: id.split('.').pop() ?? id,
    extensionId,
    extensionName: extensionId,
    enabled: true,
    menuLocations: ['tools'],
  };
}

function commandIds(items: ResolvedRendererMenuItem[] | undefined): string[] {
  return (items ?? []).filter((item) => item.kind === 'command').map((item) => item.command.id);
}

test('app menu model exposes the Xenesis Desk feature taxonomy in order', () => {
  assert.deepEqual(
    APP_MENU_MODEL.map((item) => item.id),
    ['primary', 'desk', 'xenesis', 'automation', 'gowoori', 'tools', 'developer', 'extensions', 'help'],
  );
  assert.equal(
    APP_MENU_MODEL.some((item) => item.id === 'hermes'),
    false,
  );
});

test('renderer tools menu resolves primary, grouped, and public extension commands', () => {
  const menu = resolveRendererToolsMenu([
    command('xenesis-desk.core-tools.openXenesisAgent'),
    command('xenesis-desk.core-tools.openCapabilityExplorer'),
    command('xenesis-desk.core-tools.openAiWorkbench'),
    command('xenesis-desk.workflow-runner.openGowoori', 'xenesis-desk.workflow-runner'),
    command('sample.hello-world.openPanel', 'sample.hello-world'),
  ]);

  assert.deepEqual(commandIds(menu.primary), [
    'xenesis-desk.core-tools.openXenesisAgent',
    'xenesis-desk.core-tools.openCapabilityExplorer',
  ]);
  assert.equal(
    commandIds(menu.groups.find((group) => group.id === 'tools')?.items)[0],
    'xenesis-desk.core-tools.openAiWorkbench',
  );
  assert.equal(
    commandIds(menu.groups.find((group) => group.id === 'gowoori')?.items)[0],
    'xenesis-desk.workflow-runner.openGowoori',
  );
  assert.deepEqual(commandIds(menu.groups.find((group) => group.id === 'extensions')?.items), [
    'sample.hello-world.openPanel',
  ]);
});

test('native menu items include built-in actions and extension commands but skip dynamic extensions', () => {
  const nativeItems = collectNativeAppMenuItems(APP_MENU_MODEL);
  const commandIds = collectAppMenuCommandIds(APP_MENU_MODEL);

  assert.ok(nativeItems.some((item) => item.actionId === 'open-command-center'));
  assert.ok(nativeItems.some((item) => item.actionId === 'open-xenesis-tui'));
  assert.ok(nativeItems.some((item) => item.commandId === 'xenesis-desk.core-tools.openXenesisAgent'));
  assert.ok(commandIds.includes('xenesis-desk.workflow-runner.openDemoLabPlayer'));
  assert.equal(
    nativeItems.some((item) => item.groupId === 'extensions'),
    false,
  );
});

test('Xenesis menu exposes a direct Xenesis TUI launcher', () => {
  const xenesisGroup = APP_MENU_MODEL.find((item) => item.id === 'xenesis');
  assert.ok(xenesisGroup);
  assert.equal(xenesisGroup.kind, 'group');

  const tuiAction = xenesisGroup.children.find(
    (item) => item.kind === 'action' && item.actionId === 'open-xenesis-tui',
  );
  assert.ok(tuiAction);
  assert.equal(tuiAction.kind, 'action');
  assert.equal(tuiAction.label, 'Xenesis TUI');
  assert.equal(tuiAction.capabilityPath, XENESIS_TUI_CAPABILITY_PATH);
});

test('XamongCode menu entries are hidden until Xenis Phase 5 is enabled', () => {
  const xamongCommand = command('xenesis-desk.core-tools.openXamongCode');
  const hiddenMenu = resolveRendererToolsMenu([xamongCommand]);

  assert.equal(
    commandIds(hiddenMenu.groups.find((group) => group.id === 'xenesis')?.items).includes(xamongCommand.id),
    false,
  );
  assert.equal(collectAppMenuCommandIds(APP_MENU_MODEL).includes(xamongCommand.id), false);
  assert.equal(
    collectNativeAppMenuItems(APP_MENU_MODEL).some((item) => item.commandId === xamongCommand.id),
    false,
  );

  const visibleMenu = resolveRendererToolsMenu([xamongCommand], { xenisPhase5: true });

  assert.equal(
    commandIds(visibleMenu.groups.find((group) => group.id === 'xenesis')?.items).includes(xamongCommand.id),
    true,
  );
  assert.equal(collectAppMenuCommandIds(APP_MENU_MODEL, { xenisPhase5: true }).includes(xamongCommand.id), true);
  assert.equal(
    collectNativeAppMenuItems(APP_MENU_MODEL, { xenisPhase5: true }).some(
      (item) => item.commandId === xamongCommand.id,
    ),
    true,
  );
});

test('tools menu exposes command-palette-only operator panels by feature group', () => {
  const menu = resolveRendererToolsMenu([
    command('xenesis-desk.core-tools.openActivityTimeline'),
    command('xenesis-desk.core-tools.openNetworkMonitor'),
    command('xenesis-desk.core-tools.openAuditLog'),
    command('xenesis-desk.core-tools.openAgentPerformance'),
    command('xenesis-desk.core-tools.openMemoryDashboard'),
    command('xenesis-desk.workflow-runner.openAlertRules', 'xenesis-desk.workflow-runner'),
    command('xenesis-desk.workflow-runner.openTemplateCatalog', 'xenesis-desk.workflow-runner'),
    command('xenesis-desk.workflow-runner.openArtifactVersions', 'xenesis-desk.workflow-runner'),
  ]);

  assert.deepEqual(commandIds(menu.groups.find((group) => group.id === 'tools')?.items), [
    'xenesis-desk.core-tools.openActivityTimeline',
    'xenesis-desk.core-tools.openNetworkMonitor',
    'xenesis-desk.core-tools.openAuditLog',
    'xenesis-desk.core-tools.openAgentPerformance',
    'xenesis-desk.core-tools.openMemoryDashboard',
  ]);
  assert.deepEqual(commandIds(menu.groups.find((group) => group.id === 'gowoori')?.items), [
    'xenesis-desk.workflow-runner.openAlertRules',
    'xenesis-desk.workflow-runner.openTemplateCatalog',
    'xenesis-desk.workflow-runner.openArtifactVersions',
  ]);

  const nativeItems = collectNativeAppMenuItems(APP_MENU_MODEL);
  for (const commandId of [
    'xenesis-desk.core-tools.openActivityTimeline',
    'xenesis-desk.core-tools.openNetworkMonitor',
    'xenesis-desk.core-tools.openAuditLog',
    'xenesis-desk.core-tools.openAgentPerformance',
    'xenesis-desk.core-tools.openMemoryDashboard',
    'xenesis-desk.workflow-runner.openAlertRules',
    'xenesis-desk.workflow-runner.openTemplateCatalog',
    'xenesis-desk.workflow-runner.openArtifactVersions',
  ]) {
    assert.ok(
      nativeItems.some((item) => item.commandId === commandId),
      commandId,
    );
  }
});
