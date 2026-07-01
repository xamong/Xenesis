import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, ...relativePath.split('/')), 'utf8');
}

function exists(relativePath: string): boolean {
  return existsSync(path.join(root, ...relativePath.split('/')));
}

function trackedFilesUnder(relativePath: string): string[] {
  const output = execFileSync('git', ['ls-files', '--', relativePath], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readPackageJson(): {
  scripts?: Record<string, string>;
  build?: {
    win?: { extraResources?: unknown };
    mac?: { extraResources?: unknown };
  };
} {
  return JSON.parse(read('package.json'));
}

const helperSourceFiles = [
  'tools/windows-control-host/Xenesis.WindowsControlHost.csproj',
  'tools/windows-control-host/Program.cs',
  'tools/windows-control-host/Contracts/HostContracts.cs',
  'tools/windows-control-host/Providers/CaptureProvider.cs',
  'tools/windows-control-host/Providers/ElementRefResolver.cs',
  'tools/windows-control-host/Providers/HighlightProvider.cs',
  'tools/windows-control-host/Providers/MsaaProvider.cs',
  'tools/windows-control-host/Providers/TargetResolver.cs',
  'tools/windows-control-host/Providers/UiaProvider.cs',
  'tools/windows-control-host/Providers/Win32Provider.cs',
  'tools/office-control-host/Xenesis.OfficeControlHost.csproj',
  'tools/office-control-host/Program.cs',
  'tools/macos-control-host/Package.swift',
  'tools/macos-control-host/Sources/XenesisMacosControlHost/main.swift',
];

const generatedOutputDirs = [
  'tools/windows-control-host/bin',
  'tools/windows-control-host/obj',
  'tools/windows-control-host/publish',
  'tools/office-control-host/bin',
  'tools/office-control-host/obj',
  'tools/office-control-host/publish',
  'tools/macos-control-host/.build',
  'tools/macos-control-host/publish',
];

test('native tools source tree is checked in without tracked generated outputs', () => {
  for (const file of helperSourceFiles) {
    assert.equal(exists(file), true, `missing native helper source file: ${file}`);
  }

  for (const directory of generatedOutputDirs) {
    assert.deepEqual(
      trackedFilesUnder(directory),
      [],
      `generated native helper output must not be tracked: ${directory}`,
    );
  }

  const gitignore = read('.gitignore');
  for (const ignoredPath of [
    '/tools/windows-control-host/bin/',
    '/tools/windows-control-host/obj/',
    '/tools/windows-control-host/publish/',
    '/tools/office-control-host/bin/',
    '/tools/office-control-host/obj/',
    '/tools/office-control-host/publish/',
    '/tools/macos-control-host/.build/',
    '/tools/macos-control-host/publish/',
  ]) {
    assert.match(gitignore, new RegExp(ignoredPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('macOS control host build script is checked in and platform-gated', () => {
  assert.equal(exists('scripts/build-macos-control-host.mjs'), true);
  const source = read('scripts/build-macos-control-host.mjs');

  assert.match(source, /process\.platform !== 'darwin'/);
  assert.match(source, /swift', \['build', '-c', 'release'/);
  assert.match(source, /tools', 'macos-control-host'/);
  assert.match(source, /publish/);
  assert.match(source, /chmodSync\(publishBinary, 0o755\)/);
});

test('package scripts build native helpers before platform packaging', () => {
  const scripts = readPackageJson().scripts ?? {};

  assert.equal(
    scripts['build:windows-control-host'],
    'dotnet publish tools/windows-control-host/Xenesis.WindowsControlHost.csproj -c Release -r win-x64 --self-contained false -o tools/windows-control-host/publish',
  );
  assert.equal(
    scripts['build:windows-control-host:arm64'],
    'dotnet publish tools/windows-control-host/Xenesis.WindowsControlHost.csproj -c Release -r win-arm64 --self-contained false -o tools/windows-control-host/publish',
  );
  assert.equal(
    scripts['build:office-control-host'],
    'dotnet publish tools/office-control-host/Xenesis.OfficeControlHost.csproj -c Release -r win-x64 --self-contained false -o tools/office-control-host/publish',
  );
  assert.equal(
    scripts['build:office-control-host:arm64'],
    'dotnet publish tools/office-control-host/Xenesis.OfficeControlHost.csproj -c Release -r win-arm64 --self-contained false -o tools/office-control-host/publish',
  );
  assert.equal(scripts['build:macos-control-host'], 'node scripts/build-macos-control-host.mjs');
  assert.equal(scripts['build:helpers:win'], 'npm run build:helpers:win:x64');
  assert.equal(
    scripts['build:helpers:win:x64'],
    'npm run build:windows-control-host && npm run build:office-control-host',
  );
  assert.equal(
    scripts['build:helpers:win:arm64'],
    'npm run build:windows-control-host:arm64 && npm run build:office-control-host:arm64',
  );
  assert.equal(scripts['build:helpers:mac'], 'npm run build:macos-control-host');
  assert.equal(
    scripts['build:helpers:linux'],
    'node -e "console.log(\\"No native Linux helper build is required for core support.\\")"',
  );

  assert.equal(
    scripts['pack:win'],
    'npm run build:helpers:win:x64 && npm run build && electron-builder --win --x64 --dir',
  );
  assert.equal(scripts['dist:win'], 'npm run build:helpers:win:x64 && npm run build && electron-builder --win --x64');
  assert.equal(
    scripts['dist:win:arm64'],
    'npm run build:helpers:win:arm64 && npm run build && electron-builder --win --arm64',
  );
  assert.equal(scripts['pack:mac'], 'npm run build:helpers:mac && npm run build && electron-builder --mac --dir');
  assert.equal(scripts['dist:mac'], 'npm run build:helpers:mac && npm run build && electron-builder --mac');
  assert.equal(
    scripts['dist:mac:universal'],
    'npm run build:helpers:mac && npm run build && electron-builder --mac --universal',
  );
  assert.equal(
    scripts['dist:mac:arm64'],
    'npm run build:helpers:mac && npm run build && electron-builder --mac --arm64',
  );
  assert.equal(scripts['dist:mac:x64'], 'npm run build:helpers:mac && npm run build && electron-builder --mac --x64');
});

test('electron-builder packages native helper publish directories as platform resources', () => {
  const build = readPackageJson().build ?? {};

  assert.deepEqual(build.win?.extraResources, [
    {
      from: 'tools/windows-control-host/publish',
      to: 'windows-control-host',
      filter: ['**/*'],
    },
    {
      from: 'tools/office-control-host/publish',
      to: 'office-control-host',
      filter: ['**/*'],
    },
  ]);
  assert.deepEqual(build.mac?.extraResources, [
    {
      from: 'tools/macos-control-host/publish',
      to: 'macos-control-host',
      filter: ['**/*'],
    },
  ]);
});

test('app-control runtime keeps PowerShell baseline and wires platform control hosts', () => {
  const windowsAppControl = read('src/main/appControl/windowsAppControl.ts');
  const appControlService = read('src/main/appControl/appControlService.ts');
  const platformFactory = read('src/main/appControl/createPlatformAppControlAdapter.ts');

  assert.match(windowsAppControl, /runPowerShell/);
  assert.match(windowsAppControl, /powershell\.exe/);
  assert.match(windowsAppControl, /createWindowsControlHostClient/);
  assert.match(appControlService, /createPlatformAppControlAdapter/);
  assert.match(platformFactory, /createWindowsAppControlAdapter/);
  assert.match(platformFactory, /createMacosAppControlAdapter/);
  assert.doesNotMatch(appControlService, /officeControl/);
  assert.equal(exists('src/main/officeControl'), false);
});
