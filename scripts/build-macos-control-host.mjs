import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(root, 'tools', 'macos-control-host');
const binaryName = 'xenesis-macos-control-host';
const releaseBinary = join(packagePath, '.build', 'release', binaryName);
const publishDir = join(packagePath, 'publish');
const publishBinary = join(publishDir, binaryName);

if (process.platform !== 'darwin') {
  console.error('macOS control host can only be built on macOS.');
  process.exit(1);
}

if (!existsSync(join(packagePath, 'Package.swift'))) {
  console.error(`Swift package not found: ${packagePath}`);
  process.exit(1);
}

const swiftBuild = spawnSync('swift', ['build', '-c', 'release', '--package-path', packagePath], {
  cwd: root,
  stdio: 'inherit',
});

if (swiftBuild.status !== 0) {
  process.exit(swiftBuild.status ?? 1);
}

if (!existsSync(releaseBinary)) {
  console.error(`Swift build did not produce expected helper: ${releaseBinary}`);
  process.exit(1);
}

rmSync(publishDir, { force: true, recursive: true });
mkdirSync(publishDir, { recursive: true });
copyFileSync(releaseBinary, publishBinary);
chmodSync(publishBinary, 0o755);

console.log(`macOS control host published: ${publishBinary}`);
