import assert from 'node:assert/strict';
import test from 'node:test';
import type { LocalTerminalProfile } from '../../shared/types';
import {
  buildLocalTerminalProfileFromSession,
  buildTerminalProfileSettingsTarget,
  getTerminalProfileSnapshotMenuLabel,
  mergePendingLocalTerminalProfile,
} from './terminalProfileSnapshot';

const existingProfile: LocalTerminalProfile = {
  id: 'existing',
  name: 'xenesis-desk - npm test',
  groupId: 'dev',
  shell: 'pwsh',
  cwd: 'C:\\Projects\\xenesis-desk',
  localCliAgentId: 'codex',
  environmentText: '$env:NODE_ENV="development"',
  initialCommand: 'npm test',
  createdAt: 1000,
  updatedAt: 1000,
};

function createLocalProfile(patch: Partial<LocalTerminalProfile> = {}): LocalTerminalProfile {
  return {
    ...existingProfile,
    id: 'pending',
    name: 'Pending',
    ...patch,
  };
}

test('buildLocalTerminalProfileFromSession snapshots a local shell session for Terminal Management', () => {
  const profile = buildLocalTerminalProfileFromSession(
    {
      id: 'term-1',
      kind: 'shell',
      label: 'pwsh',
      shell: 'pwsh',
      cwd: 'C:\\Projects\\xenesis-desk',
      lastSentCommand: 'npm run typecheck',
      localCliAgentId: 'codex',
      environmentText: '$env:NODE_ENV="development"',
      groupId: 'dev',
    },
    {
      id: 'saved-id',
      now: 2000,
      existingProfiles: [existingProfile],
    },
  );

  assert.equal(profile?.id, 'saved-id');
  assert.equal(profile?.shell, 'pwsh');
  assert.equal(profile?.cwd, 'C:\\Projects\\xenesis-desk');
  assert.equal(profile?.initialCommand, 'npm run typecheck');
  assert.equal(profile?.environmentText, '$env:NODE_ENV="development"');
  assert.equal(profile?.localCliAgentId, 'codex');
  assert.equal(profile?.groupId, 'dev');
  assert.equal(profile?.createdAt, 2000);
  assert.equal(profile?.updatedAt, 2000);
  assert.match(profile?.name ?? '', /^xenesis-desk - npm run typecheck/);
});

test('buildLocalTerminalProfileFromSession ignores remote terminal sessions', () => {
  const profile = buildLocalTerminalProfileFromSession(
    {
      id: 'term-remote',
      kind: 'ssh',
      label: 'prod',
      cwd: '/srv/app',
      lastSentCommand: 'npm start',
    },
    { id: 'saved-id', now: 2000 },
  );

  assert.equal(profile, null);
});

test('getTerminalProfileSnapshotMenuLabel describes the context menu action', () => {
  assert.equal(getTerminalProfileSnapshotMenuLabel('ko'), '터미널 프로필로 저장');
  assert.equal(getTerminalProfileSnapshotMenuLabel('en'), 'Save as Terminal Profile');
});

test('buildTerminalProfileSettingsTarget opens Terminal Management with a pending local profile selected', () => {
  const profile = createLocalProfile();
  const target = buildTerminalProfileSettingsTarget(profile);

  assert.equal(target.category, 'remote-terminals');
  assert.equal(target.section, 'remote-terminals');
  assert.equal(target.selectedTerminalProfileId, `local:${profile.id}`);
  assert.equal(target.pendingLocalTerminalProfile, profile);
});

test('mergePendingLocalTerminalProfile adds a pending profile once', () => {
  const existing = createLocalProfile({ id: 'existing', name: 'Existing' });
  const pending = createLocalProfile({ id: 'pending', name: 'Pending' });
  const editedPending = createLocalProfile({ id: 'pending', name: 'Edited Pending' });

  const first = mergePendingLocalTerminalProfile([existing], pending);
  const second = mergePendingLocalTerminalProfile(first, editedPending);

  assert.deepEqual(
    first.map((profile) => profile.id),
    ['existing', 'pending'],
  );
  assert.deepEqual(
    second.map((profile) => profile.id),
    ['existing', 'pending'],
  );
  assert.equal(second[1].name, 'Pending');
});
