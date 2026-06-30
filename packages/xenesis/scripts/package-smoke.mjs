#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const requiredFiles = [
  'package.json',
  'README.md',
  'dist/index.js',
  'dist/index.d.ts',
  'dist/cli/main.js',
  'dist/gateway/client.js',
  'dist/gateway/client.d.ts',
  'docs/usage.md',
  'docs/configuration.md',
  'examples/plugins/text-tools/xenesis.plugin.json',
  'examples/skills/project-reviewer/SKILL.md',
  'xenesis.mock.config.example.json',
];

const forbiddenPatterns = [
  /^src\//,
  /^tests\//,
  /^docs\/superpowers\//,
  /^xenesis\.config\.json$/,
  /^tsconfig(\.test)?\.json$/,
  /^vitest\.config\.ts$/,
];

function commandName(command) {
  return Array.isArray(command) ? command.join(' ') : command;
}

function quoteCmdPart(value) {
  const text = String(value);
  if (/^[A-Za-z0-9_.:/\\=-]+$/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function spawnTarget(command, args) {
  if (isWindows && String(command).endsWith('.cmd')) {
    const commandText = String(command);
    const commandPart = /[\\/: ]/.test(commandText) ? quoteCmdPart(commandText) : commandText;
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/c', ['call', commandPart, ...args.map(quoteCmdPart)].join(' ')],
    };
  }

  return { command, args };
}

function run(command, args, options = {}) {
  const target = spawnTarget(command, args);
  const result = spawnSync(target.command, target.args, {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      ...(options.env ?? {}),
    },
    encoding: 'utf8',
  });

  if (result.error) {
    throw new Error(`${commandName(command)} failed to start: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(
      [`${commandName(command)} ${args.join(' ')} failed with exit code ${result.status}.`, output]
        .filter(Boolean)
        .join('\n'),
    );
  }

  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function runNpm(args, options = {}) {
  return run(npmCommand, args, options);
}

function assertIncludes(output, expected, label) {
  if (!output.includes(expected)) {
    throw new Error(`${label} did not include expected text: ${expected}`);
  }
}

function validatePackedFiles(files) {
  const paths = files.map((file) => file.path.replace(/\\/g, '/')).sort();
  const missing = requiredFiles.filter((file) => !paths.includes(file));
  if (missing.length > 0) {
    throw new Error(`Package is missing required files: ${missing.join(', ')}`);
  }

  const forbidden = paths.filter((path) => forbiddenPatterns.some((pattern) => pattern.test(path)));
  if (forbidden.length > 0) {
    throw new Error(`Package contains source-only files: ${forbidden.join(', ')}`);
  }

  return paths;
}

function writeMockConfig(appDir) {
  writeFileSync(
    join(appDir, 'xenesis.mock.config.json'),
    `${JSON.stringify(
      {
        provider: 'mock',
        model: 'mock-model',
        workspace: '.',
        approvalMode: 'safe',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

function writeSdkSmoke(appDir) {
  writeFileSync(
    join(appDir, 'sdk-smoke.mjs'),
    [
      "import { XenesisGatewayClient, gatewayOpenApiSpec } from 'xenesis';",
      '',
      'const calls = [];',
      'const client = new XenesisGatewayClient({',
      "  baseUrl: 'http://127.0.0.1:8787/base/',",
      "  token: 'secret',",
      '  fetch: async (url, init) => {',
      '    calls.push({ url: String(url), init });',
      "    if (String(url).endsWith('/openapi.json')) {",
      '      return new Response(JSON.stringify(gatewayOpenApiSpec), {',
      "        headers: { 'content-type': 'application/json' }",
      '      });',
      '    }',
      '    return new Response(JSON.stringify({',
      "      id: 'gateway-run-1',",
      '      exitCode: 0,',
      '      events: [],',
      "      output: 'sdk ok',",
      "      errors: ''",
      "    }), { headers: { 'content-type': 'application/json' } });",
      '  }',
      '});',
      '',
      'const spec = await client.openApi();',
      "if (spec.info.title !== 'Xenesis Gateway API') {",
      "  throw new Error('unexpected OpenAPI title');",
      '}',
      '',
      "const run = await client.run({ prompt: 'sdk smoke' });",
      "if (run.output !== 'sdk ok') {",
      "  throw new Error('unexpected SDK run output');",
      '}',
      '',
      "if (calls[0].url !== 'http://127.0.0.1:8787/base/openapi.json') {",
      "  throw new Error('unexpected OpenAPI URL');",
      '}',
      "if (calls[1].init.headers.authorization !== 'Bearer secret') {",
      "  throw new Error('missing authorization header');",
      '}',
      '',
      "console.log('sdk import ok');",
      '',
    ].join('\n'),
    'utf8',
  );
}

function installedBin(appDir) {
  return join(appDir, 'node_modules', '.bin', isWindows ? 'xenesis.cmd' : 'xenesis');
}

const tempRoot = mkdtempSync(join(tmpdir(), 'xenesis-package-smoke-'));
const packDir = join(tempRoot, 'pack');
const appDir = join(tempRoot, 'app');
let passed = false;

try {
  mkdirSync(packDir, { recursive: true });
  mkdirSync(appDir, { recursive: true });

  const packResult = runNpm(['pack', '--json', '--pack-destination', packDir]);
  const packInfo = JSON.parse(packResult.stdout)[0];
  const packedPaths = validatePackedFiles(packInfo.files ?? []);
  const tarballPath = join(packDir, packInfo.filename);
  if (!existsSync(tarballPath)) {
    throw new Error(`Package tarball was not created: ${tarballPath}`);
  }

  console.log(`package-smoke: packed ${packInfo.filename}`);
  console.log(`package-smoke: package files ${packedPaths.length}`);

  runNpm(['init', '-y'], { cwd: appDir });
  runNpm(['install', tarballPath, '--no-audit', '--no-fund'], { cwd: appDir });
  writeMockConfig(appDir);
  writeSdkSmoke(appDir);

  const bin = installedBin(appDir);
  if (!existsSync(bin)) {
    throw new Error(`Installed bin was not created: ${bin}`);
  }
  const binEnv = { XENESIS_HOME: join(appDir, '.xenesis') };

  const sdk = run(process.execPath, ['sdk-smoke.mjs'], { cwd: appDir });
  assertIncludes(sdk.stdout, 'sdk import ok', 'xenesis SDK import');
  console.log('package-smoke: sdk import ok');

  const help = run(bin, ['--help'], { cwd: appDir, env: binEnv });
  assertIncludes(help.stdout, 'Usage: xenesis', 'xenesis --help');
  assertIncludes(help.stdout, 'gateway', 'xenesis --help');
  console.log('package-smoke: bin help ok');

  const prompt = run(bin, ['--config', 'xenesis.mock.config.json', '--print', 'hello', 'packaged', 'cli'], {
    cwd: appDir,
    env: binEnv,
  });
  assertIncludes(prompt.stdout, 'mock response: hello packaged cli', 'xenesis prompt');
  console.log('package-smoke: prompt ok');

  const doctor = run(bin, ['--config', 'xenesis.mock.config.json', 'doctor'], { cwd: appDir, env: binEnv });
  assertIncludes(doctor.stdout, 'workspace: ok', 'xenesis doctor');
  console.log('package-smoke: doctor ok');

  const connect = run(bin, ['--config', 'xenesis.mock.config.json', 'connect', 'check', '--probe'], {
    cwd: appDir,
    env: binEnv,
  });
  assertIncludes(connect.stdout, 'connect: passed', 'xenesis connect check');
  console.log('package-smoke: connect ok');

  const smoke = run(bin, ['--config', 'xenesis.mock.config.json', 'smoke'], { cwd: appDir, env: binEnv });
  assertIncludes(smoke.stdout, 'smoke: passed', 'xenesis smoke');
  assertIncludes(smoke.stdout, 'smoke: tool_capabilities passed', 'xenesis smoke');
  console.log('package-smoke: smoke ok');

  passed = true;
  console.log('package-smoke: passed');
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`package-smoke: failed: ${message}`);
  console.error(`package-smoke: workspace retained at ${tempRoot}`);
  process.exitCode = 1;
} finally {
  if (passed && process.env.XENESIS_PACKAGE_SMOKE_KEEP !== '1') {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}
