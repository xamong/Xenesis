import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BUILTIN_EXTERNAL_APP_PROFILES,
  createExternalAppProfileFromTemplate,
  EXTERNAL_APP_PROFILE_TEMPLATES,
  externalAppActionDecision,
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

  assert.deepEqual(normalizeExternalAppAction({ action: 'focus', titleContains: 'Untitled' }), {
    action: 'focus',
    titleContains: 'Untitled',
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

test('KakaoTalk template is disabled by default and blocks send-style behavior', () => {
  const kakao = createExternalAppProfileFromTemplate('kakaotalk');

  assert.equal(kakao?.id, 'kakaotalk');
  assert.equal(kakao?.enabled, false);
  assert.equal(kakao?.allowedActions.includes('typeText'), false);

  const decision = externalAppActionDecision({ action: 'typeText', appId: 'kakaotalk', text: 'hello' }, kakao || undefined);

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, 'External app profile is disabled: kakaotalk');
});

test('terminal typing is always high risk', () => {
  const settings = normalizeExternalAppSettings(undefined);
  const powershell = createExternalAppProfileFromTemplate(
    'powershell',
    settings.profiles.map((profile) => profile.id),
  );
  const decision = externalAppActionDecision(
    { action: 'typeText', appId: powershell?.id, text: 'Remove-Item C:\\data' },
    powershell || undefined,
  );

  assert.equal(decision.allowed, true);
  assert.equal(decision.approvalLevel, 'high');
  assert.equal(decision.approval, 'always');
});

test('terminal-like Windows shell typing remains high risk for common shell hosts', () => {
  const settings = normalizeExternalAppSettings({
    profiles: [
      {
        id: 'pwsh',
        label: 'PowerShell 7',
        platform: 'windows',
        executable: 'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
        allowedActions: ['launch', 'typeText', 'hotkey', 'status', 'find'],
        approvalLevel: 'medium',
        enabled: true,
      },
      {
        id: 'windows-terminal',
        label: 'Windows Terminal',
        platform: 'windows',
        executable: 'wt.exe',
        allowedActions: ['launch', 'typeText', 'hotkey', 'status', 'find'],
        approvalLevel: 'medium',
        enabled: true,
      },
    ],
  });

  const pwshProfile = settings.profiles.find((profile) => profile.id === 'pwsh');
  const terminalProfile = settings.profiles.find((profile) => profile.id === 'windows-terminal');
  const pwshDecision = externalAppActionDecision({ action: 'typeText', appId: 'pwsh', text: 'dir' }, pwshProfile);
  const terminalDecision = externalAppActionDecision(
    { action: 'hotkey', appId: 'windows-terminal', keys: ['Control', 'C'] },
    terminalProfile,
  );

  assert.equal(pwshDecision.approvalLevel, 'high');
  assert.equal(pwshDecision.approval, 'always');
  assert.equal(terminalDecision.approvalLevel, 'high');
  assert.equal(terminalDecision.approval, 'always');
});

test('action decision rejects mismatched profile bindings', () => {
  const kakao = createExternalAppProfileFromTemplate('kakaotalk');
  const decision = externalAppActionDecision({ action: 'focus', appId: 'notepad' }, kakao || undefined);

  assert.equal(decision.allowed, false);
  assert.equal(decision.approvalLevel, 'high');
  assert.equal(decision.approval, 'always');
  assert.equal(decision.reason, 'External app profile mismatch: notepad resolved to kakaotalk');
});

test('action decision preserves action risk for denied actions', () => {
  const settings = normalizeExternalAppSettings({
    profiles: [
      {
        id: 'notes',
        label: 'Notes',
        platform: 'windows',
        executable: 'notes.exe',
        allowedActions: ['launch', 'status', 'find'],
        approvalLevel: 'low',
        enabled: true,
      },
    ],
  });
  const lowRiskProfile = settings.profiles.find((profile) => profile.id === 'notes');
  const decision = externalAppActionDecision(
    { action: 'typeText', appId: 'notes', text: 'x'.repeat(5001) },
    lowRiskProfile,
  );

  assert.equal(decision.allowed, false);
  assert.equal(decision.approvalLevel, 'high');
  assert.equal(decision.approval, 'always');
  assert.equal(decision.reason, 'External app action is not allowed for notes: typeText');
});
