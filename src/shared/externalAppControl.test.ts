import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUILTIN_EXTERNAL_APP_PROFILES,
  createExternalAppProfileFromTemplate,
  EXTERNAL_APP_PROFILE_TEMPLATES,
  classifyExternalAppApproval,
  normalizeExternalAppAction,
  normalizeExternalAppSettings,
} from './externalAppControl';

test('external app settings include the built-in Notepad profile', () => {
  const settings = normalizeExternalAppSettings(undefined);

  assert.equal(settings.enabled, true);
  assert.equal(settings.profiles.length, 1);
  assert.equal(settings.profiles[0]?.id, 'notepad');
  assert.equal(settings.profiles[0]?.executable, 'notepad.exe');
  assert.deepEqual(settings.profiles[0]?.allowedActions, [
    'launch',
    'focus',
    'resize',
    'typeText',
    'hotkey',
    'close',
    'status',
    'find',
  ]);
});

test('external app settings normalize user profiles without removing built-ins', () => {
  const settings = normalizeExternalAppSettings({
    enabled: true,
    profiles: [
      {
        id: 'custom-editor',
        label: 'Custom Editor',
        platform: 'windows',
        executable: 'C:\\Tools\\editor.exe',
        allowedActions: ['launch', 'focus'],
        approvalLevel: 'high',
      },
      {
        id: 'notepad',
        label: 'Renamed Notepad',
        platform: 'windows',
        executable: 'notepad.exe',
        allowedActions: ['launch'],
        approvalLevel: 'medium',
      },
    ],
  });

  assert.equal(settings.profiles.length, 2);
  assert.equal(settings.profiles[0]?.id, 'notepad');
  assert.equal(settings.profiles[0]?.label, BUILTIN_EXTERNAL_APP_PROFILES[0]?.label);
  assert.equal(settings.profiles[1]?.id, 'custom-editor');
});

test('external app profile templates create editable profiles without changing defaults', () => {
  const settings = normalizeExternalAppSettings(undefined);
  const templateIds = EXTERNAL_APP_PROFILE_TEMPLATES.map((profile) => profile.id);

  assert.deepEqual(settings.profiles.map((profile) => profile.id), ['notepad']);
  assert.ok(templateIds.includes('paint'));
  assert.ok(templateIds.includes('powershell'));

  const paint = createExternalAppProfileFromTemplate('paint');
  assert.equal(paint?.id, 'paint');
  assert.equal(paint?.executable, 'mspaint.exe');
  assert.equal(paint?.approvalLevel, 'medium');

  const duplicate = createExternalAppProfileFromTemplate('paint', ['paint']);
  assert.equal(duplicate?.id, 'paint-2');
});

test('external app actions normalize aliases and reject missing targets', () => {
  assert.deepEqual(normalizeExternalAppAction({ action: 'launch', appId: 'notepad' }), {
    action: 'launch',
    appId: 'notepad',
  });

  assert.throws(() => normalizeExternalAppAction({ action: 'launch' }), /appId or path is required for launch/i);

  assert.throws(
    () => normalizeExternalAppAction({ action: 'typeText', appId: 'notepad', text: '' }),
    /text is required/i,
  );
});

test('external app approval classification separates registered and arbitrary path control', () => {
  assert.equal(classifyExternalAppApproval({ action: 'status', appId: 'notepad' }, true), 'low');
  assert.equal(classifyExternalAppApproval({ action: 'launch', appId: 'notepad' }, true), 'medium');
  assert.equal(classifyExternalAppApproval({ action: 'launch', path: 'C:\\Tools\\tool.exe' }, false), 'high');
  assert.equal(
    classifyExternalAppApproval({ action: 'typeText', appId: 'notepad', text: 'x'.repeat(5001) }, true),
    'high',
  );
});
