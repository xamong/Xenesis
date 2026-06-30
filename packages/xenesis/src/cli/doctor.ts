import { access } from 'node:fs/promises';
import { type CliConfigOverrides, loadConfig } from '../config/index.js';
import { formatLatestConnectionReport, readLatestConnectionReport } from '../connect/index.js';
import { resolveProviderSettings } from '../providers/index.js';
import { formatLatestScenarioReport, readLatestScenarioReport } from '../scenario/index.js';
import { formatLatestSmokeReport, readLatestSmokeReport } from '../smoke/index.js';
import { createBuiltInTools } from '../tools/index.js';
import { checkRipgrep } from '../tools/ripgrep.js';

export interface DoctorOptions {
  cwd?: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: CliConfigOverrides;
}

export interface DoctorResult {
  exitCode: number;
  lines: string[];
}

function nodeMajor() {
  return Number(process.versions.node.split('.')[0] ?? '0');
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function checkRg(env: NodeJS.ProcessEnv) {
  const result = await checkRipgrep(env);
  if (!result.available) return 'rg: fallback only';
  const label = result.source === 'bundled' ? 'bundled ok' : 'system ok';
  return result.version ? `rg: ${label} (${result.version})` : `rg: ${label}`;
}

export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const lines: string[] = [];
  let exitCode = 0;

  if (nodeMajor() >= 20) {
    lines.push(`node: ok (${process.version})`);
  } else {
    lines.push(`node: error (${process.version}; need >=20)`);
    exitCode = 1;
  }

  let config;
  try {
    config = await loadConfig({
      cwd,
      configPath: options.configPath,
      env,
      cli: options.cli,
    });
    lines.push('config: ok');
    lines.push(`provider: ${config.provider}`);
    lines.push(`model: ${config.model}`);
    lines.push(`xenesisHome: ${config.xenesisHome}`);
    lines.push(`providerRetries: ${config.providerRetries}`);
    lines.push(
      `providerFallbacks: ${config.providerFallbacks.map((fallback) => fallback.provider).join(', ') || 'none'}`,
    );
    lines.push(
      `context: autoCompact=${config.context.autoCompact}, compactAfter=${config.context.compactAfterMessages}, keep=${config.context.compactKeepMessages}, maxToolResultChars=${config.context.maxToolResultChars}`,
    );
    if (config.browser.enabled) {
      try {
        await import('playwright');
        lines.push('browser: playwright ok');
      } catch {
        lines.push(
          'browser: error (playwright not installed; run `npm install playwright && npx playwright install chromium`)',
        );
        exitCode = 1;
      }
    } else {
      lines.push('browser: disabled');
    }
    const providerSettings = resolveProviderSettings(config, env);
    if (providerSettings.baseURL) lines.push(`baseURL: ${providerSettings.baseURL}`);
    if (config.provider !== 'mock' && providerSettings.apiKeyEnv) {
      lines.push(
        env[providerSettings.apiKeyEnv]
          ? `${providerSettings.apiKeyEnv}: present`
          : `${providerSettings.apiKeyEnv}: missing`,
      );
    }
  } catch (error) {
    lines.push(`config: error: ${errorMessage(error)}`);
    return { exitCode: 1, lines };
  }

  try {
    await access(config.workspace);
    lines.push('workspace: ok');
  } catch (error) {
    lines.push(`workspace: error: ${errorMessage(error)}`);
    exitCode = 1;
  }

  try {
    const latestSmoke = await readLatestSmokeReport(config.xenesisHome);
    lines.push(latestSmoke ? formatLatestSmokeReport(latestSmoke) : 'smoke: no reports');
  } catch (error) {
    lines.push(`smoke: error: ${errorMessage(error)}`);
  }

  try {
    const latestScenario = await readLatestScenarioReport(config.xenesisHome);
    lines.push(latestScenario ? formatLatestScenarioReport(latestScenario) : 'scenario: no reports');
  } catch (error) {
    lines.push(`scenario: error: ${errorMessage(error)}`);
  }

  try {
    const latestConnection = await readLatestConnectionReport(config.xenesisHome);
    lines.push(latestConnection ? formatLatestConnectionReport(latestConnection) : 'connect: no reports');
  } catch (error) {
    lines.push(`connect: error: ${errorMessage(error)}`);
  }

  try {
    const tools = createBuiltInTools();
    lines.push(`tools: ok (${tools.size} loaded)`);
  } catch (error) {
    lines.push(`tools: error: ${errorMessage(error)}`);
    exitCode = 1;
  }

  lines.push(await checkRg(env));

  return { exitCode, lines };
}
