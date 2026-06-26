#!/usr/bin/env node
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultCapabilityPracticeScenarios,
  readCapabilityPracticeScenarioFile,
  runCapabilityPracticeSuite,
  type CapabilityPracticeScenario
} from "../src/evaluation/index.js";
import type { ApprovalMode, ProviderName } from "../src/config/index.js";

interface ParsedArgs {
  workspace?: string;
  config?: string;
  provider?: ProviderName;
  model?: string;
  approvalMode: ApprovalMode;
  scenarioFiles: string[];
  scenarios: string[];
  maxScenarios?: number;
  report?: string;
  json: boolean;
}

function packageRoot() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

function resolveXenesisHome() {
  return process.env.XENESIS_HOME?.trim()
    ? resolve(process.env.XENESIS_HOME)
    : resolve(homedir(), ".xenesis");
}

function stamp(date: Date) {
  return date.toISOString().replace(/[-:.]/g, "");
}

function defaultReportPath() {
  return resolve(resolveXenesisHome(), "reports", `capability-practice-${stamp(new Date())}.json`);
}

function parseProvider(value: string): ProviderName {
  if (
    value === "openai" ||
    value === "mock" ||
    value === "anthropic" ||
    value === "claude" ||
    value === "codex-cli" ||
    value === "claude-cli"
  ) {
    return value;
  }
  throw new Error(`--provider must be openai, mock, anthropic, claude, codex-cli, or claude-cli; got ${value}.`);
}

function positiveInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function parseApprovalMode(value: string): ApprovalMode {
  if (value === "safe" || value === "auto" || value === "readonly") return value;
  throw new Error("--approval must be safe, auto, or readonly.");
}

function printHelp() {
  console.log([
    "Usage: npm run capability:practice -- [options]",
    "",
    "Runs real-project practice prompts through the Xenesis agent pipeline and writes run reports.",
    "",
    "Options:",
    "  --workspace <path>      Target project workspace. Defaults to the package root.",
    "  --config <path>         Config path passed to the pipeline.",
    "  --provider <name>       Provider override.",
    "  --model <name>          Model override.",
    "  --approval <mode>       Default approval mode: safe, auto, or readonly. Default: readonly.",
    "  --scenario <id>         Run one practice scenario id. May be repeated.",
    "  --scenario-file <path>  Add practice scenarios from a JSON file.",
    "  --max-scenarios <n>     Run only the first n selected scenarios.",
    "  --report <path>         Practice report output path.",
    "  --json                  Print the full report JSON."
  ].join("\n"));
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    approvalMode: "readonly",
    scenarioFiles: [],
    scenarios: [],
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Option ${arg} requires a value.`);
      index += 1;
      return value;
    };

    if (arg === "--workspace") parsed.workspace = next();
    else if (arg === "--config") parsed.config = next();
    else if (arg === "--provider") parsed.provider = parseProvider(next());
    else if (arg === "--model") parsed.model = next();
    else if (arg === "--approval") parsed.approvalMode = parseApprovalMode(next());
    else if (arg === "--scenario") parsed.scenarios.push(next());
    else if (arg === "--scenario-file") parsed.scenarioFiles.push(next());
    else if (arg === "--max-scenarios") parsed.maxScenarios = positiveInteger(next(), "--max-scenarios");
    else if (arg === "--report") parsed.report = next();
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option ${arg}. Run "npm run capability:practice -- --help".`);
    }
  }

  return parsed;
}

async function loadPracticeScenarios(parsed: ParsedArgs) {
  const extras: CapabilityPracticeScenario[] = [];
  for (const path of parsed.scenarioFiles) {
    extras.push(...await readCapabilityPracticeScenarioFile(resolve(path)));
  }

  let scenarios = extras.length > 0 ? extras : defaultCapabilityPracticeScenarios;
  if (parsed.scenarios.length > 0) {
    const requested = new Set(parsed.scenarios);
    const missing = parsed.scenarios.filter((id) => !scenarios.some((scenario) => scenario.id === id));
    if (missing.length > 0) throw new Error(`Unknown practice scenario id(s): ${missing.join(", ")}.`);
    scenarios = scenarios.filter((scenario) => requested.has(scenario.id));
  }
  return parsed.maxScenarios ? scenarios.slice(0, parsed.maxScenarios) : scenarios;
}

function printTextSummary(report: Awaited<ReturnType<typeof runCapabilityPracticeSuite>>) {
  console.log([
    "capability-practice:",
    `total=${report.summary.total}`,
    `passed=${report.summary.passed}`,
    `warned=${report.summary.warned}`,
    `failed=${report.summary.failed}`,
    `averageQualityScore=${report.summary.averageQualityScore}`
  ].join(" "));
  for (const run of report.runs) {
    console.log([
      "capability-practice: run",
      `scenario=${run.scenarioId}`,
      `session=${run.sessionId}`,
      `status=${run.status}`,
      `selfReview=${run.selfReviewStatus}`,
      `score=${run.qualityScore ?? "unknown"}`,
      `report=${JSON.stringify(run.reportPath)}`
    ].join(" "));
  }
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const report = await runCapabilityPracticeSuite({
    workspace: resolve(parsed.workspace ?? packageRoot()),
    cwd: packageRoot(),
    xenesisHome: resolveXenesisHome(),
    ...(parsed.config ? { configPath: parsed.config } : {}),
    ...(parsed.provider ? { provider: parsed.provider } : {}),
    ...(parsed.model ? { model: parsed.model } : {}),
    approvalMode: parsed.approvalMode,
    scenarios: await loadPracticeScenarios(parsed),
    ...(parsed.maxScenarios ? { maxScenarios: parsed.maxScenarios } : {}),
    reportPath: resolve(parsed.report ?? defaultReportPath())
  });

  if (parsed.json) console.log(JSON.stringify(report, null, 2));
  else printTextSummary(report);
}

main().catch((error) => {
  console.error(`capability-practice: error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
