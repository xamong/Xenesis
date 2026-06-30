#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const entry = resolve(repoRoot, 'dist', 'cli', 'main.js');
const provider = process.env.XENESIS_PROVIDER || 'auto';
const model = process.env.XENESIS_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const reportId = `provider-live-${new Date().toISOString().replace(/[-:]/g, '').replace('.', '')}`;
const xenesisHomeInput = process.env.XENESIS_HOME || resolve(homedir(), '.xenesis');
const xenesisHome = isAbsolute(xenesisHomeInput) ? resolve(xenesisHomeInput) : resolve(repoRoot, xenesisHomeInput);
const reportPath = resolve(xenesisHome, 'reports', `${reportId}.json`);
const gatewayTokenEnv = 'XENESIS_PROVIDER_SMOKE_GATEWAY_TOKEN';
const checks = [];

export function parseSmokeArgs(argv) {
  const parsed = {
    mode: process.env.XENESIS_PROVIDER_SMOKE_MODE || 'provider-identity',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Option ${arg} requires a value.`);
      index += 1;
      return value;
    };
    if (arg === '--mode') parsed.mode = next();
    else if (!arg.startsWith('--') && parsed.mode === 'provider-identity') parsed.mode = arg;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: npm run provider:smoke -- [options]',
          '',
          'Options:',
          '  --mode <name>  provider-identity | cr-read | approval-stop | agent-pane-live | gateway-auth',
        ].join('\n'),
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown option ${arg}. Run "npm run provider:smoke -- --help".`);
    }
  }
  return parsed;
}

export function buildSmokeAcceptanceRecord(input) {
  const capabilityPaths = Array.isArray(input.observedCapabilityPaths) ? input.observedCapabilityPaths : [];
  const readbacks = Array.isArray(input.observedReadbacks) ? input.observedReadbacks : [];
  const approvalRecords = Array.isArray(input.observedApprovalRecords) ? input.observedApprovalRecords : [];
  const errors = [];
  if (input.expectedProvider === 'auto') {
    if (!input.observedProvider) {
      errors.push('missing resolved provider for auto');
    } else if (input.observedProvider === 'auto') {
      errors.push('auto provider did not resolve to a concrete provider');
    }
  } else if (input.expectedProvider && input.observedProvider !== input.expectedProvider) {
    errors.push(`provider mismatch: ${input.observedProvider} !== ${input.expectedProvider}`);
  }
  if (input.expectedProcessModel && input.observedProcessModel !== input.expectedProcessModel) {
    errors.push(`process model mismatch: ${input.observedProcessModel} !== ${input.expectedProcessModel}`);
  }
  if (input.expectedCapabilityPath && !capabilityPaths.includes(input.expectedCapabilityPath)) {
    errors.push(`missing capability path: ${input.expectedCapabilityPath}`);
  }
  if (input.expectedReadback && !readbacks.includes(input.expectedReadback)) {
    errors.push(`missing readback: ${input.expectedReadback}`);
  }
  if (input.requiresApprovalRecord && approvalRecords.length === 0) {
    errors.push('missing approval record');
  }
  return {
    scenarioId: input.scenarioId,
    status: errors.length === 0 ? 'passed' : 'failed',
    provider: {
      expected: input.expectedProvider,
      resolved: input.observedProvider,
      processModel: input.observedProcessModel,
    },
    capabilityPaths,
    readbacks,
    approvalRecords,
    errors,
  };
}

export function buildSmokeSummary(smokeChecks) {
  const total = smokeChecks.length;
  const passed = smokeChecks.filter((check) => check.status === 'passed').length;
  const failed = smokeChecks.filter((check) => check.status === 'failed').length;
  return {
    total,
    passed,
    failed,
    exitCode: failed === 0 ? 0 : 1,
  };
}

function appendCheck(name, passed, details = {}) {
  checks.push({
    name,
    status: passed ? 'passed' : 'failed',
    ...details,
  });
  console.log(`provider-smoke: ${name} ${passed ? 'ok' : 'failed'}`);
}

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [entry, ...args], {
    cwd: options.cwd ?? repoRoot,
    env: {
      ...process.env,
      ...(options.env ?? {}),
    },
    encoding: 'utf8',
    timeout: options.timeoutMs ?? 120000,
  });
}

function requireOutput(result, name, expected) {
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0) {
    throw new Error(`${name} exited with ${result.status}:\n${output.trim()}`);
  }
  if (!output.includes(expected)) {
    throw new Error(`${name} did not include expected text "${expected}":\n${output.trim()}`);
  }
  return output;
}

export function parseProviderStatusOutput(output) {
  const text = String(output || '').trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && typeof parsed.provider === 'string') {
      return {
        provider: parsed.provider,
        ...(typeof parsed.model === 'string' ? { model: parsed.model } : {}),
        ...(typeof parsed.source === 'string' ? { source: parsed.source } : {}),
        ...(typeof parsed.processModel === 'string' ? { processModel: parsed.processModel } : {}),
      };
    }
  } catch {
    // Fall through to text parsing for older status output.
  }
  const providerMatch = text.match(/\bprovider=([A-Za-z0-9_.:-]+)/);
  if (!providerMatch?.[1]) return {};
  return {
    provider: providerMatch[1],
    ...(text.match(/\bprocessModel=([A-Za-z0-9_.:-]+)/)?.[1]
      ? { processModel: text.match(/\bprocessModel=([A-Za-z0-9_.:-]+)/)?.[1] }
      : {}),
  };
}

function parsedJsonRecords(output) {
  return String(output || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        const parsed = JSON.parse(line);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    })
    .filter(Boolean);
}

function processModelFromCliMetadata(cli) {
  if (typeof cli?.processModel === 'string') return cli.processModel;
  if (cli?.persistentSession === true) return 'persistent-process';
  if (cli?.persistentSession === false) return 'process-per-turn';
  return undefined;
}

export function parseProviderExecutionEvidence(output) {
  const evidence = {};
  for (const record of parsedJsonRecords(output)) {
    if (record.type !== 'assistant_message') continue;
    const message = record.message;
    const providerMetadata = message?.providerMetadata;
    const cli = providerMetadata?.cli;
    if (cli && typeof cli === 'object') {
      if (typeof cli.provider === 'string') evidence.provider = cli.provider;
      const processModel = processModelFromCliMetadata(cli);
      if (processModel) evidence.processModel = processModel;
      continue;
    }
    if (providerMetadata?.openai && typeof providerMetadata.openai === 'object') {
      evidence.provider = 'openai';
      continue;
    }
    if (providerMetadata?.anthropic && typeof providerMetadata.anthropic === 'object') {
      evidence.provider = 'anthropic';
    }
  }
  return evidence;
}

export function resolveRuntimeSmokeEvidence({ executionEvidence } = {}) {
  return {
    ...(executionEvidence?.provider ? { provider: executionEvidence.provider } : {}),
    ...(executionEvidence?.processModel ? { processModel: executionEvidence.processModel } : {}),
  };
}

function runProviderStatusProbe(providerName, modelName) {
  const result = runCli(['--provider', providerName, '--model', modelName, 'status', '--json']);
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0) {
    throw new Error(`status probe exited with ${result.status}:\n${output.trim()}`);
  }
  return parseProviderStatusOutput(result.stdout);
}

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function inferredProcessModel(providerName) {
  if (providerName === 'codex-app-server') return 'persistent-process';
  if (providerName === 'codex-cli' || providerName === 'claude-cli') return 'process-per-turn';
  return undefined;
}

function appendAcceptanceCheck(name, record) {
  appendCheck(name, record.status === 'passed', { acceptance: record });
}

export function resolveSmokeGatewayToken(env = process.env, fallbackId = reportId) {
  const configured = String(env[gatewayTokenEnv] || env.XENESIS_GATEWAY_TOKEN || '').trim();
  return configured || `provider-smoke-${fallbackId}`;
}

export function smokeGatewayHeaders(token, headers = {}) {
  return {
    ...headers,
    authorization: `Bearer ${token}`,
  };
}

function smokeBridgeUrl(env = process.env) {
  return String(env.XENIS_MCP_BRIDGE_URL || env.XENESIS_DESK_BRIDGE_URL || '').replace(/\/+$/, '');
}

function smokeBridgeToken(env = process.env) {
  return String(env.XENIS_MCP_BRIDGE_TOKEN || env.XENESIS_DESK_BRIDGE_TOKEN || '');
}

function failedSmokeRecord(input, message) {
  const record = buildSmokeAcceptanceRecord(input);
  record.errors.push(message);
  record.status = 'failed';
  return record;
}

async function callSmokeBridgeCapability({ path, args = {}, approved = false, env = process.env, fetchImpl = fetch }) {
  const bridgeUrl = smokeBridgeUrl(env);
  if (!bridgeUrl) throw new Error('missing XENIS_MCP_BRIDGE_URL');
  const token = smokeBridgeToken(env);
  const response = await fetchImpl(`${bridgeUrl}/capabilities/call`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      path,
      args,
      approved,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`bridge HTTP ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

function approvalRecordIds(payload) {
  const ids = [];
  const actionInboxItem = payload?.actionInboxItem;
  if (actionInboxItem && typeof actionInboxItem === 'object' && typeof actionInboxItem.id === 'string') {
    ids.push(actionInboxItem.id);
  }
  const approvalRecord = payload?.approvalRecord;
  if (approvalRecord && typeof approvalRecord === 'object' && typeof approvalRecord.id === 'string') {
    ids.push(approvalRecord.id);
  }
  if (typeof payload?.approvalId === 'string') ids.push(payload.approvalId);
  return Array.from(new Set(ids));
}

function hasBridgeResultPayload(payload) {
  return Object.hasOwn(payload ?? {}, 'result') && payload.result !== undefined && payload.result !== null;
}

export async function buildCrReadSmokeAcceptanceRecord({
  providerName,
  expectedProcessModel,
  processModel,
  observedProvider,
  observedProcessModel,
  env = process.env,
  fetchImpl = fetch,
  path = 'xd.app.status',
} = {}) {
  const base = {
    scenarioId: 'cr-read',
    expectedProvider: providerName,
    expectedProcessModel: expectedProcessModel ?? processModel,
    expectedCapabilityPath: path,
    expectedReadback: path,
    observedProvider: observedProvider ?? '',
    observedProcessModel,
  };
  try {
    const payload = await callSmokeBridgeCapability({ path, args: {}, approved: false, env, fetchImpl });
    const responsePath =
      typeof payload?.path === 'string'
        ? payload.path
        : typeof payload?.capabilityPath === 'string'
          ? payload.capabilityPath
          : undefined;
    const accepted =
      payload?.ok === true &&
      payload?.approvalRequired !== true &&
      responsePath === path &&
      hasBridgeResultPayload(payload);
    return buildSmokeAcceptanceRecord({
      ...base,
      observedCapabilityPaths: accepted ? [path] : [],
      observedReadbacks: accepted ? [path] : [],
    });
  } catch (error) {
    return failedSmokeRecord(base, `bridge readback failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function payloadItems(payload) {
  const candidates = [payload?.result, payload?.items, payload?.actionInbox, payload?.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      if (Array.isArray(candidate.items)) return candidate.items;
      if (Array.isArray(candidate.actionInbox)) return candidate.actionInbox;
    }
  }
  return [];
}

function approvalRecordIsInspectable(payload, ids) {
  const wanted = new Set(ids);
  return payloadItems(payload).some((item) => {
    if (!item || typeof item !== 'object') return false;
    const id = typeof item.id === 'string' ? item.id : undefined;
    return id !== undefined && wanted.has(id);
  });
}

export async function buildApprovalStopSmokeAcceptanceRecord({
  providerName,
  expectedProcessModel,
  processModel,
  observedProvider,
  observedProcessModel,
  env = process.env,
  fetchImpl = fetch,
  path = 'xd.files.open',
  args = { path: resolve(repoRoot, '..', '__xenesis_provider_smoke_approval__') },
  approvalReadbackPath = 'xd.mcp.actionInbox.list',
} = {}) {
  const base = {
    scenarioId: 'approval-stop',
    expectedProvider: providerName,
    expectedProcessModel: expectedProcessModel ?? processModel,
    requiresApprovalRecord: true,
    observedProvider: observedProvider ?? '',
    observedProcessModel,
  };
  try {
    const payload = await callSmokeBridgeCapability({ path, args, approved: false, env, fetchImpl });
    const records = payload?.approvalRequired === true ? approvalRecordIds(payload) : [];
    const readbackPayload =
      records.length > 0
        ? await callSmokeBridgeCapability({
            path: approvalReadbackPath,
            args: {},
            approved: false,
            env,
            fetchImpl,
          })
        : undefined;
    const inspectable =
      readbackPayload !== undefined &&
      readbackPayload?.ok === true &&
      approvalRecordIsInspectable(readbackPayload, records);
    return buildSmokeAcceptanceRecord({
      ...base,
      observedCapabilityPaths: [path],
      observedReadbacks: inspectable ? [approvalReadbackPath] : [],
      observedApprovalRecords: inspectable ? records : [],
    });
  } catch (error) {
    return failedSmokeRecord(base, `approval stop failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function buildAgentPaneLiveSmokeAcceptanceRecord({ providerName, processModel } = {}) {
  return failedSmokeRecord(
    {
      scenarioId: 'agent-pane-live',
      expectedProvider: providerName,
      expectedProcessModel: processModel,
      observedProvider: providerName,
      observedProcessModel: processModel,
    },
    'agent-pane-live requires structured Electron Agent-pane evidence and is not implemented in provider-smoke yet',
  );
}

async function waitForGateway(child, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  let stdout = '';
  let stderr = '';
  let exited = false;
  let exitCode = null;

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  child.on('exit', (code) => {
    exited = true;
    exitCode = code;
  });

  while (Date.now() < deadline) {
    const url = stdout.match(/gateway: listening (http:\/\/[^\s]+)/)?.[1];
    if (url) return { url, stdout, stderr };
    if (exited) {
      throw new Error(`gateway exited with ${exitCode}:\n${stdout}\n${stderr}`.trim());
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }

  throw new Error(`gateway did not become ready:\n${stdout}\n${stderr}`.trim());
}

async function runGatewayChecks() {
  const gatewayToken = resolveSmokeGatewayToken(process.env, reportId);
  const gatewayEnv = {
    ...process.env,
    [gatewayTokenEnv]: gatewayToken,
  };
  const child = spawn(
    process.execPath,
    [
      entry,
      '--provider',
      provider,
      '--model',
      model,
      'gateway',
      '--host',
      '127.0.0.1',
      '--port',
      '0',
      '--auth-token-env',
      gatewayTokenEnv,
    ],
    {
      cwd: repoRoot,
      env: gatewayEnv,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  try {
    const { url } = await waitForGateway(child);
    const run = await fetch(`${url}/run`, {
      method: 'POST',
      headers: smokeGatewayHeaders(gatewayToken, { 'content-type': 'application/json' }),
      body: JSON.stringify({ prompt: 'Reply exactly: xenesis-provider-gateway-ok' }),
    });
    const runBody = await run.json();
    if (!run.ok || runBody.exitCode !== 0 || !String(runBody.output ?? '').includes('xenesis-provider-gateway-ok')) {
      throw new Error(`gateway /run failed: ${JSON.stringify(runBody)}`);
    }
    appendCheck('gateway-run', true, { url });

    const stream = await fetch(`${url}/run/stream`, {
      method: 'POST',
      headers: smokeGatewayHeaders(gatewayToken, { 'content-type': 'application/json' }),
      body: JSON.stringify({ prompt: 'Reply exactly: xenesis-provider-gateway-stream-ok' }),
    });
    const streamText = await stream.text();
    if (
      !stream.ok ||
      !streamText.includes('event: gateway_done') ||
      !streamText.includes('xenesis-provider-gateway-stream-ok')
    ) {
      throw new Error(`gateway /run/stream failed: ${streamText}`);
    }
    appendCheck('gateway-stream', true, { url });
  } finally {
    if (!child.killed) child.kill('SIGTERM');
  }
}

async function main() {
  const parsed = parseSmokeArgs(process.argv.slice(2));
  const smokeMode = parsed.mode;
  if (!['provider-identity', 'cr-read', 'approval-stop', 'agent-pane-live', 'gateway-auth'].includes(smokeMode)) {
    throw new Error(`Unsupported provider smoke mode: ${smokeMode}`);
  }
  if (provider === 'openai' && !hasOpenAiKey()) {
    throw new Error('OPENAI_API_KEY is required for provider:smoke when provider=openai.');
  }

  console.log(`provider-smoke: mode=${smokeMode}`);
  console.log(`provider-smoke: provider=${provider}`);
  console.log(`provider-smoke: model=${model}`);

  try {
    const connectArgs = ['--provider', provider, '--model', model, 'connect', 'check'];
    requireOutput(runCli(connectArgs), 'connect check', 'connect: passed');
    appendCheck('connect-probe', true, { provider, model });

    const promptOutput = requireOutput(
      runCli([
        '--provider',
        provider,
        '--model',
        model,
        '--json',
        '--print',
        'Reply exactly: xenesis-provider-live-ok',
      ]),
      'prompt',
      'xenesis-provider-live-ok',
    );
    appendCheck('prompt', true);

    requireOutput(
      runCli(['--provider', provider, '--model', model, 'Reply exactly: xenesis-provider-stream-ok']),
      'stream',
      'xenesis-provider-stream-ok',
    );
    appendCheck('stream', true);

    if (provider === 'openai') {
      const fallbackOutput = requireOutput(
        runCli([
          '--provider',
          'openai-compatible',
          '--base-url',
          'http://127.0.0.1:9/v1',
          '--api-key-env',
          'OPENAI_API_KEY',
          '--provider-retries',
          '0',
          '--fallback-provider',
          'openai',
          '--json',
          '--print',
          'Reply exactly: xenesis-provider-fallback-ok',
        ]),
        'fallback',
        'xenesis-provider-fallback-ok',
      );
      if (!fallbackOutput.includes('"type":"provider_fallback"')) {
        throw new Error(`fallback output did not include provider_fallback event:\n${fallbackOutput}`);
      }
      appendCheck('fallback', true);
    } else {
      appendCheck('fallback', true, { skipped: true, reason: 'fallback smoke is currently openai-only' });
    }

    await runGatewayChecks();
    const observedStatus = runProviderStatusProbe(provider, model);
    const observedExecution = parseProviderExecutionEvidence(promptOutput);
    const observedRuntime = resolveRuntimeSmokeEvidence({
      executionEvidence: observedExecution,
      statusEvidence: observedStatus,
    });
    const observedProvider = observedRuntime.provider;
    const observedProcessModel = observedRuntime.processModel;
    const expectedProcessModel = inferredProcessModel(provider);

    if (smokeMode === 'provider-identity') {
      appendAcceptanceCheck(
        'acceptance-provider-identity',
        buildSmokeAcceptanceRecord({
          scenarioId: smokeMode,
          expectedProvider: provider,
          observedProvider,
          expectedProcessModel,
          observedProcessModel,
        }),
      );
    } else if (smokeMode === 'cr-read') {
      appendAcceptanceCheck(
        'acceptance-cr-read',
        await buildCrReadSmokeAcceptanceRecord({
          providerName: provider,
          expectedProcessModel,
          observedProvider,
          observedProcessModel,
        }),
      );
    } else if (smokeMode === 'approval-stop') {
      appendAcceptanceCheck(
        'acceptance-approval-stop',
        await buildApprovalStopSmokeAcceptanceRecord({
          providerName: provider,
          expectedProcessModel,
          observedProvider,
          observedProcessModel,
        }),
      );
    } else if (smokeMode === 'agent-pane-live') {
      appendAcceptanceCheck(
        'acceptance-agent-pane-live',
        buildAgentPaneLiveSmokeAcceptanceRecord({
          providerName: provider,
          processModel: inferredProcessModel(provider),
        }),
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendCheck('error', false, { message });
    process.exitCode = 1;
  } finally {
    const summary = buildSmokeSummary(checks);
    if (summary.failed > 0) process.exitCode = 1;
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(
      reportPath,
      `${JSON.stringify(
        {
          id: reportId,
          createdAt: new Date().toISOString(),
          provider,
          model,
          workspace: repoRoot,
          summary,
          exitCode: summary.failed === 0 ? 0 : 1,
          checks,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    console.log(`provider-smoke: report ${reportPath}`);
    console.log(`provider-smoke: ${summary.failed === 0 ? 'passed' : 'failed'} ${summary.passed}/${summary.total}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
