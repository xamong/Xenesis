#!/usr/bin/env node
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, '..');
const repoRoot = resolve(packageRoot, '..', '..');
const naturalPrompt = '노션 연결 상태를 확인해줘';

function normalizeCheck(check) {
  return {
    id: String(check.id),
    ok: Boolean(check.ok),
    ...(check.detail ? { detail: String(check.detail) } : {}),
  };
}

function buildReport(checks, extra = {}) {
  const normalizedChecks = checks.map(normalizeCheck);
  const failed = normalizedChecks.filter((check) => !check.ok).length;
  return {
    ok: failed === 0,
    createdAt: new Date().toISOString(),
    summary: {
      total: normalizedChecks.length,
      passed: normalizedChecks.length - failed,
      failed,
    },
    checks: normalizedChecks,
    ...extra,
  };
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

async function main() {
  const { CodexCliProvider } = await import(
    pathToFileURL(resolve(packageRoot, 'dist', 'providers', 'cliProvider.js')).href
  );
  const xenisHome = await mkdtemp(resolve(tmpdir(), 'xenesis-provider-desk-mcp-'));
  const serverPath = resolve(repoRoot, 'mcp', 'xenesis-desk-mcp-server.mjs');
  let capturedRequest;

  try {
    const provider = new CodexCliProvider({
      command: 'codex',
      cwd: packageRoot,
      env: {
        ...process.env,
        XENESIS_CLI_PREFLIGHT: 'false',
        XENIS_HOME: xenisHome,
        XENIS_MCP_SERVER_PATH: serverPath,
        XENIS_MCP_STATE_FILE: resolve(xenisHome, 'mcp', 'bridge.json'),
      },
      run: async (request) => {
        capturedRequest = request;
        return {
          stdout: 'Desk MCP prompt smoke ok',
          stderr: '',
          exitCode: 0,
        };
      },
    });

    const response = await provider.complete({
      model: 'gpt-5-codex',
      messages: [{ role: 'user', content: naturalPrompt }],
      tools: [],
    });

    const stdin = capturedRequest?.stdin ?? '';
    const args = capturedRequest?.args ?? [];
    const argsText = args.join('\n');
    const checks = [
      {
        id: 'stdin-natural-prompt',
        ok: stdin.includes(naturalPrompt),
      },
      {
        id: 'stdin-cr-mcp-tools',
        ok: includesAll(stdin, [
          'xenesis_dev.xenesis_desk_capabilities',
          'xenesis_dev.xenesis_desk_capability',
          'xenesis_dev.xenesis_desk_call_capability',
          'discover paths',
          'generic caller',
        ]),
      },
      {
        id: 'stdin-no-deterministic-natural-catalog',
        ok: !stdin.includes('Capability family intent catalog:') && !stdin.includes('xenesis-desk-action'),
      },
      {
        id: 'stdin-tool-profile-draft-discovery-guidance',
        ok: includesAll(stdin, ['external tool setup/profile draft', 'discover paths', 'generic caller']),
      },
      {
        id: 'stdin-no-hardcoded-tool-profile-draft-cr-paths',
        ok: ![
          'xd.xenesis.tools.profileDrafts.status',
          'xd.xenesis.tools.profileDrafts.open',
          'xd.xenesis.tools.profileDrafts.request',
        ].some((path) => stdin.includes(path)),
      },
      {
        id: 'args-mcp-configured',
        ok: includesAll(argsText, [
          'mcp_servers.xenesis_dev.enabled=true',
          'mcp_servers.xenesis_dev.command=',
          'mcp_servers.xenesis_dev.args=',
          'mcp_servers.xenesis_dev.enabled_tools=',
        ]),
      },
      {
        id: 'metadata-mcp-configured',
        ok: response.message.providerMetadata?.cli?.xenesisDeskMcpConfigured === true,
      },
      {
        id: 'response-provider-metadata',
        ok:
          response.message.providerMetadata?.cli?.provider === 'codex-cli' &&
          response.message.providerMetadata?.cli?.processModel === 'process-per-turn',
      },
    ];
    const report = buildReport(checks, {
      provider: response.message.providerMetadata?.cli?.provider,
      command: capturedRequest?.command,
      mcpServerPath: serverPath,
    });
    console.log(JSON.stringify(report, null, 2));
    if (!report.ok) process.exitCode = 1;
  } finally {
    await rm(xenisHome, { recursive: true, force: true }).catch(() => undefined);
  }
}

main().catch((error) => {
  const report = buildReport([
    {
      id: 'provider-desk-mcp-prompt-smoke',
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    },
  ]);
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = 1;
});
