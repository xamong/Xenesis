import assert from 'node:assert/strict';
import test from 'node:test';

import type { RemoteFileSettings, RemoteTerminalSettings } from '../../shared/types';
import { mergeWorkspaceRemoteFileSettings, mergeWorkspaceRemoteTerminalSettings } from './remoteProfilePersistence';

const existingRemoteTerminals: RemoteTerminalSettings = {
  groups: [{ id: 'ops', name: 'Ops', createdAt: 1, updatedAt: 1 }],
  profiles: [
    {
      id: 'ssh-prod',
      name: 'Production SSH',
      groupId: 'ops',
      protocol: 'ssh',
      host: 'prod.example.com',
      port: 22,
      username: 'deploy',
      password: 'saved-password',
      privateKeyPath: '',
      passphrase: 'saved-passphrase',
      connectTimeoutMs: 30000,
      initialCommand: '',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  localProfiles: [
    {
      id: 'local-pwsh',
      name: 'Local pwsh',
      groupId: '',
      shell: 'pwsh',
      cwd: '',
      localCliAgentId: 'default',
      environmentText: '',
      initialCommand: '',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

const existingRemoteFiles: RemoteFileSettings = {
  groups: [{ id: 'files', name: 'Files', createdAt: 1, updatedAt: 1 }],
  profiles: [
    {
      id: 'ftp-prod',
      name: 'Production FTP',
      groupId: 'files',
      protocol: 'ftp',
      host: 'files.example.com',
      port: 21,
      username: 'deploy',
      password: 'saved-file-password',
      privateKeyPath: '',
      passphrase: 'saved-file-passphrase',
      connectTimeoutMs: 30000,
      rootPath: '/',
      encoding: 'utf8',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
};

test('workspace remote merge keeps saved profiles when workspace has no remote profiles', () => {
  const mergedTerminals = mergeWorkspaceRemoteTerminalSettings(
    { groups: [], profiles: [], localProfiles: [] },
    existingRemoteTerminals,
  );
  const mergedFiles = mergeWorkspaceRemoteFileSettings({ groups: [], profiles: [] }, existingRemoteFiles);

  assert.deepEqual(
    mergedTerminals.profiles.map((profile) => profile.id),
    ['ssh-prod'],
  );
  assert.deepEqual(
    mergedTerminals.localProfiles.map((profile) => profile.id),
    ['local-pwsh'],
  );
  assert.deepEqual(
    mergedFiles.profiles.map((profile) => profile.id),
    ['ftp-prod'],
  );
});

test('workspace remote merge updates matching profiles without clearing saved secrets', () => {
  const mergedTerminals = mergeWorkspaceRemoteTerminalSettings(
    {
      groups: [{ id: 'ops', name: 'Operations', createdAt: 2, updatedAt: 2 }],
      profiles: [
        {
          ...existingRemoteTerminals.profiles[0],
          name: 'Renamed SSH',
          password: '',
          passphrase: '',
          updatedAt: 2,
        },
      ],
      localProfiles: [],
    },
    existingRemoteTerminals,
  );
  const mergedFiles = mergeWorkspaceRemoteFileSettings(
    {
      groups: [{ id: 'files', name: 'Remote Files', createdAt: 2, updatedAt: 2 }],
      profiles: [
        {
          ...existingRemoteFiles.profiles[0],
          name: 'Renamed FTP',
          password: '',
          passphrase: '',
          updatedAt: 2,
        },
      ],
    },
    existingRemoteFiles,
  );

  assert.equal(mergedTerminals.groups[0]?.name, 'Operations');
  assert.equal(mergedTerminals.profiles[0]?.name, 'Renamed SSH');
  assert.equal(mergedTerminals.profiles[0]?.password, 'saved-password');
  assert.equal(mergedTerminals.profiles[0]?.passphrase, 'saved-passphrase');
  assert.equal(mergedFiles.groups[0]?.name, 'Remote Files');
  assert.equal(mergedFiles.profiles[0]?.name, 'Renamed FTP');
  assert.equal(mergedFiles.profiles[0]?.password, 'saved-file-password');
  assert.equal(mergedFiles.profiles[0]?.passphrase, 'saved-file-passphrase');
});
