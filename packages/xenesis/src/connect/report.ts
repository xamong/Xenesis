import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  displayXenesisStatePath,
  loadConfig,
  type CliConfigOverrides,
  type McpServerConfig,
  type ProviderName,
  type XenesisConfig,
  xenesisStatePath
} from "../config/index.js";
import { createProvider } from "../core/AgentRuntimeFactory.js";
import { createMcpClient, type McpToolClient } from "../extensions/index.js";
import {
  assertRuntimeProviderReady,
  resolveRuntimeProviderSelection,
  type RuntimeProviderResolutionOptions
} from "../providers/index.js";

export type ConnectionCheckStatus = "passed" | "failed";
export type ConnectionCheckKind = "provider" | "mcp";

export interface ConnectionCheckResult {
  name: string;
  kind: ConnectionCheckKind;
  status: ConnectionCheckStatus;
  durationMs: number;
  message: string;
  provider?: ProviderName;
  model?: string;
  apiKeyEnv?: string;
  baseURL?: string;
  probed?: boolean;
  serverName?: string;
  command?: string;
  tools?: number;
  resources?: number;
  prompts?: number;
}

export interface ConnectionReport {
  id: string;
  createdAt: string;
  workspace: string;
  configPath?: string;
  probe: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  exitCode: number;
  checks: ConnectionCheckResult[];
}

export type ConnectionCheckMcpClientFactory = (
  serverName: string,
  config: McpServerConfig,
  cwd: string
) => McpToolClient;

export interface RunConnectionCheckOptions {
  cwd: string;
  configPath?: string;
  env?: NodeJS.ProcessEnv;
  cli?: CliConfigOverrides;
  probe?: boolean;
  now?: () => Date;
  mcpClientFactory?: ConnectionCheckMcpClientFactory;
  providerResolution?: RuntimeProviderResolutionOptions;
}

export interface RunConnectionCheckResult {
  exitCode: number;
  report: ConnectionReport;
  reportPath: string;
  lines: string[];
}

export interface ConnectionReportEntry {
  report: ConnectionReport;
  path: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function reportStamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, "");
}

function connectionReportId(date: Date) {
  return `connect-${reportStamp(date)}`;
}

function reportsDir(xenesisHome: string) {
  return xenesisStatePath(xenesisHome, "reports");
}

function displayPath(xenesisHome: string, path: string) {
  return displayXenesisStatePath(xenesisHome, path);
}

function connectionStatus(report: ConnectionReport) {
  return report.summary.failed === 0 ? "passed" : "failed";
}

function connectionReportPathFromTarget(xenesisHome: string, target: string) {
  if (/[\\/]/.test(target)) return resolve(target);
  const fileName = target.endsWith(".json")
    ? target
    : `${target.startsWith("connect-") ? target : `connect-${target}`}.json`;
  return join(reportsDir(xenesisHome), fileName);
}

function summarize(checks: ConnectionCheckResult[]) {
  const passed = checks.filter((check) => check.status === "passed").length;
  return {
    total: checks.length,
    passed,
    failed: checks.length - passed
  };
}

async function runProviderProbe(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv,
  providerResolution: RuntimeProviderResolutionOptions | undefined
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const provider = createProvider(config, env, providerResolution);
    const response = await provider.complete({
      model: provider.model ?? config.model,
      messages: [{ role: "user", content: "connection probe" }],
      tools: [],
      signal: controller.signal
    });
    return response.message.content || "provider returned an empty response";
  } finally {
    clearTimeout(timeout);
  }
}

function readinessMessage(authMode: string | undefined) {
  return authMode === "test-mock"
    ? "test mock provider configured; probe skipped"
    : "provider ready; probe skipped";
}

async function checkProvider(
  config: XenesisConfig,
  env: NodeJS.ProcessEnv,
  probe: boolean,
  providerResolution: RuntimeProviderResolutionOptions | undefined
): Promise<ConnectionCheckResult> {
  const startedAt = Date.now();
  const selection = resolveRuntimeProviderSelection(config, env, providerResolution);
  const base: Omit<ConnectionCheckResult, "status" | "durationMs" | "message"> = {
    name: `provider:${config.provider}`,
    kind: "provider",
    provider: config.provider,
    model: selection.model ?? config.model,
    apiKeyEnv: selection.apiKeyEnv,
    baseURL: selection.baseURL,
    probed: probe
  };

  try {
    assertRuntimeProviderReady(selection);

    const message = probe
      ? `probe ok: ${await runProviderProbe(config, env, providerResolution)}`
      : readinessMessage(selection.authMode);

    return {
      ...base,
      status: "passed",
      durationMs: Date.now() - startedAt,
      message
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      durationMs: Date.now() - startedAt,
      message: errorMessage(error)
    };
  }
}

async function optionalCount<T>(fn: (() => Promise<T[]>) | undefined) {
  if (!fn) return 0;
  return (await fn()).length;
}

async function checkMcpServer(
  workspaceRoot: string,
  serverName: string,
  server: McpServerConfig,
  factory?: ConnectionCheckMcpClientFactory
): Promise<ConnectionCheckResult> {
  const startedAt = Date.now();
  const client = factory
    ? factory(serverName, server, workspaceRoot)
    : createMcpClient(serverName, server, workspaceRoot);
  const base: Omit<ConnectionCheckResult, "status" | "durationMs" | "message"> = {
    name: `mcp:${serverName}`,
    kind: "mcp",
    serverName,
    command: "url" in server && (server.type === "http" || server.type === "sse")
      ? server.url
      : "command" in server
        ? [server.command, ...server.args].join(" ")
        : serverName
  };

  try {
    const tools = await client.listTools();
    const resources = await optionalCount(client.listResources?.bind(client));
    const prompts = await optionalCount(client.listPrompts?.bind(client));
    return {
      ...base,
      status: "passed",
      durationMs: Date.now() - startedAt,
      message: `${tools.length} tools, ${resources} resources, ${prompts} prompts`,
      tools: tools.length,
      resources,
      prompts
    };
  } catch (error) {
    return {
      ...base,
      status: "failed",
      durationMs: Date.now() - startedAt,
      message: errorMessage(error)
    };
  } finally {
    await client.close().catch(() => undefined);
  }
}

function renderConnectionLines(report: ConnectionReport, xenesisHome: string, reportPath: string) {
  const status = connectionStatus(report);
  return [
    `connect: report ${displayPath(xenesisHome, reportPath)}`,
    `connect: ${status} ${report.summary.passed}/${report.summary.total}`,
    ...report.checks.map((check) => check.status === "passed"
      ? `connect: ${check.name} passed`
      : `connect: ${check.name} failed - ${check.message}`)
  ];
}

export function renderConnectionReportDetails(
  entry: ConnectionReportEntry,
  xenesisHome: string,
  summaryLabel: "latest" | "summary"
) {
  const report = entry.report;
  const status = connectionStatus(report);
  return [
    `connect: report ${displayPath(xenesisHome, entry.path)}`,
    `connect: ${summaryLabel} ${status} ${report.summary.passed}/${report.summary.total} (${report.createdAt})`,
    ...report.checks.map((check) => check.status === "passed"
      ? `connect: ${check.name} passed`
      : `connect: ${check.name} failed - ${check.message}`)
  ];
}

export async function runConnectionCheck(options: RunConnectionCheckOptions): Promise<RunConnectionCheckResult> {
  const createdAt = options.now?.() ?? new Date();
  const config = await loadConfig({
    cwd: options.cwd,
    configPath: options.configPath,
    env: options.env,
    cli: options.cli
  });
  const workspaceRoot = config.workspace;
  const env = options.env ?? process.env;
  const probe = options.probe === true;

  const checks = [
    await checkProvider(config, env, probe, options.providerResolution),
    ...await Promise.all(Object.entries(config.extensions.mcpServers).map(([serverName, server]) => (
      checkMcpServer(workspaceRoot, serverName, server, options.mcpClientFactory)
    )))
  ];
  const summary = summarize(checks);
  const exitCode = summary.failed === 0 ? 0 : 1;
  const report: ConnectionReport = {
    id: connectionReportId(createdAt),
    createdAt: createdAt.toISOString(),
    workspace: workspaceRoot,
    configPath: options.configPath,
    probe,
    summary,
    exitCode,
    checks
  };
  const dir = reportsDir(config.xenesisHome);
  const reportPath = join(dir, `${report.id}.json`);
  await mkdir(dir, { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  return {
    exitCode,
    report,
    reportPath,
    lines: renderConnectionLines(report, config.xenesisHome, reportPath)
  };
}

export async function readLatestConnectionReportEntry(xenesisHome: string): Promise<ConnectionReportEntry | undefined> {
  let files;
  try {
    files = await readdir(reportsDir(xenesisHome), { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }

  const latest = files
    .filter((file) => file.isFile() && /^connect-\d{8}T\d{9}Z\.json$/.test(file.name))
    .map((file) => file.name)
    .sort()
    .at(-1);

  if (!latest) return undefined;
  const path = join(reportsDir(xenesisHome), latest);
  return {
    path,
    report: JSON.parse(await readFile(path, "utf8")) as ConnectionReport
  };
}

export async function readConnectionReportEntry(
  xenesisHome: string,
  target: string
): Promise<ConnectionReportEntry | undefined> {
  const path = connectionReportPathFromTarget(xenesisHome, target);
  try {
    return {
      path,
      report: JSON.parse(await readFile(path, "utf8")) as ConnectionReport
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function readLatestConnectionReport(xenesisHome: string): Promise<ConnectionReport | undefined> {
  return (await readLatestConnectionReportEntry(xenesisHome))?.report;
}

export function formatLatestConnectionReport(report: ConnectionReport) {
  const status = connectionStatus(report);
  return `connect: latest ${status} ${report.summary.passed}/${report.summary.total} (${report.createdAt})`;
}
