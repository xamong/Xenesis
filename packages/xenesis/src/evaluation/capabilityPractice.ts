import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { z } from "zod";
import { loadConfig, type ApprovalMode, type ProviderName } from "../config/index.js";
import { runAgentPipeline } from "../core/AgentRunPipeline.js";
import type { AgentRunMode } from "../core/AgentRuntimeFactory.js";
import { FileRunReportStore } from "../runReports/index.js";

export interface CapabilityPracticeScenario {
  id: string;
  title: string;
  prompt: string;
  mode?: AgentRunMode;
  approvalMode?: ApprovalMode;
  workspace?: string;
  tags?: string[];
  maxTurns?: number;
}

export interface CapabilityPracticeRunnerInput {
  scenario: CapabilityPracticeScenario;
  prompt: string;
  workspace: string;
  cwd: string;
  xenesisHome: string;
  configPath?: string;
  provider?: ProviderName;
  model?: string;
  mode: AgentRunMode;
  approvalMode: ApprovalMode;
  maxTurns?: number;
  env: NodeJS.ProcessEnv;
}

export interface CapabilityPracticeRunnerResult {
  exitCode: number;
  sessionId: string;
  traceId?: string;
  runReport?: CapabilityPracticeRunReportSummary;
}

export type CapabilityPracticeScenarioRunner = (
  input: CapabilityPracticeRunnerInput
) => Promise<CapabilityPracticeRunnerResult>;

export interface CapabilityPracticeRunReportSummary {
  sessionId: string;
  status: string;
  metrics?: {
    success?: boolean;
    qualityScore?: number;
  };
  selfReview?: {
    status: string;
    score?: number;
    findings: unknown[];
    nextActions: string[];
  };
}

export interface CapabilityPracticeRunSummary {
  scenarioId: string;
  title: string;
  tags: string[];
  workspace: string;
  mode: AgentRunMode;
  approvalMode: ApprovalMode;
  exitCode: number;
  sessionId: string;
  traceId?: string;
  reportPath: string;
  status: string;
  qualityScore?: number;
  selfReviewStatus: string;
  selfReviewScore?: number;
  selfReviewFindings: number;
  nextActions: string[];
}

export interface CapabilityPracticeReport {
  kind: "capability-practice";
  createdAt: string;
  workspace: string;
  provider?: ProviderName;
  model?: string;
  summary: {
    total: number;
    passed: number;
    warned: number;
    failed: number;
    averageQualityScore: number;
  };
  runs: CapabilityPracticeRunSummary[];
}

export interface RunCapabilityPracticeSuiteOptions {
  workspace: string;
  cwd?: string;
  xenesisHome: string;
  configPath?: string;
  provider?: ProviderName;
  model?: string;
  approvalMode?: ApprovalMode;
  scenarios?: CapabilityPracticeScenario[];
  maxScenarios?: number;
  reportPath?: string;
  runner?: CapabilityPracticeScenarioRunner;
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
}

const practiceScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  mode: z.enum(["plan", "work"]).optional(),
  approvalMode: z.enum(["safe", "auto", "readonly"]).optional(),
  workspace: z.string().min(1).optional(),
  tags: z.array(z.string().min(1)).optional(),
  maxTurns: z.number().int().positive().optional()
});

export const defaultCapabilityPracticeScenarios: CapabilityPracticeScenario[] = [
  {
    id: "practice-project-map",
    title: "Map the target project",
    prompt: "현재 프로젝트 구조, 주요 진입점, 실행/검증 명령을 근거 파일과 함께 요약해줘.",
    mode: "plan",
    approvalMode: "readonly",
    tags: ["workspace", "analysis"]
  },
  {
    id: "practice-runbook-summary",
    title: "Summarize project runbook",
    prompt: "README, package 설정, scripts를 확인해서 이 프로젝트를 실행하고 검증하는 방법을 정리해줘.",
    mode: "plan",
    approvalMode: "readonly",
    tags: ["workspace", "runbook"]
  },
  {
    id: "practice-safe-next-change",
    title: "Recommend one safe next change",
    prompt: "파일을 수정하지 말고, 현재 프로젝트에서 가장 안전한 다음 개선 작업 1개와 필요한 검증 명령을 제안해줘.",
    mode: "plan",
    approvalMode: "readonly",
    tags: ["workspace", "planning", "safety"]
  }
];

function resolveScenarioWorkspace(baseWorkspace: string, scenario: CapabilityPracticeScenario) {
  if (!scenario.workspace) return resolve(baseWorkspace);
  return isAbsolute(scenario.workspace)
    ? resolve(scenario.workspace)
    : resolve(baseWorkspace, scenario.workspace);
}

function reportPathFor(xenesisHome: string, sessionId: string) {
  return join(xenesisHome, "run_reports", `${sessionId}.json`);
}

function runPassed(run: CapabilityPracticeRunSummary) {
  return run.exitCode === 0 && run.selfReviewStatus === "pass";
}

function runWarned(run: CapabilityPracticeRunSummary) {
  return run.exitCode === 0 && run.selfReviewStatus === "warn";
}

function summarizePracticeRuns(runs: CapabilityPracticeRunSummary[]) {
  const scores = runs
    .map((run) => run.qualityScore)
    .filter((score): score is number => typeof score === "number" && Number.isFinite(score));
  return {
    total: runs.length,
    passed: runs.filter(runPassed).length,
    warned: runs.filter(runWarned).length,
    failed: runs.filter((run) => !runPassed(run) && !runWarned(run)).length,
    averageQualityScore: scores.length === 0
      ? 0
      : Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  };
}

async function defaultPracticeRunner(
  input: CapabilityPracticeRunnerInput
): Promise<CapabilityPracticeRunnerResult> {
  const result = await runAgentPipeline({
    cwd: input.cwd,
    configPath: input.configPath,
    env: input.env,
    prompt: input.prompt,
    mode: input.mode,
    cli: {
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.model ? { model: input.model } : {}),
      xenesisHome: input.xenesisHome,
      workspace: input.workspace,
      approvalMode: input.approvalMode,
      ...(input.maxTurns ? { maxTurns: input.maxTurns } : {})
    },
    stream: false,
    disposeRunner: true
  });
  const config = await loadConfig({
    cwd: input.cwd,
    configPath: input.configPath,
    env: input.env,
    cli: {
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.model ? { model: input.model } : {}),
      xenesisHome: input.xenesisHome,
      workspace: input.workspace,
      approvalMode: input.approvalMode,
      ...(input.maxTurns ? { maxTurns: input.maxTurns } : {})
    }
  });
  const runReport = await new FileRunReportStore({ xenesisHome: config.xenesisHome }).read(result.sessionId);
  return {
    exitCode: result.exitCode,
    sessionId: result.sessionId,
    ...(result.traceId ? { traceId: result.traceId } : {}),
    ...(runReport ? { runReport } : {})
  };
}

function toRunSummary(input: {
  scenario: CapabilityPracticeScenario;
  workspace: string;
  mode: AgentRunMode;
  approvalMode: ApprovalMode;
  xenesisHome: string;
  result: CapabilityPracticeRunnerResult;
}): CapabilityPracticeRunSummary {
  const report = input.result.runReport;
  const selfReview = report?.selfReview;
  return {
    scenarioId: input.scenario.id,
    title: input.scenario.title,
    tags: input.scenario.tags ?? [],
    workspace: input.workspace,
    mode: input.mode,
    approvalMode: input.approvalMode,
    exitCode: input.result.exitCode,
    sessionId: input.result.sessionId,
    ...(input.result.traceId ? { traceId: input.result.traceId } : {}),
    reportPath: reportPathFor(input.xenesisHome, input.result.sessionId),
    status: report?.status ?? (input.result.exitCode === 0 ? "completed" : "failed"),
    ...(typeof report?.metrics?.qualityScore === "number" ? { qualityScore: report.metrics.qualityScore } : {}),
    selfReviewStatus: selfReview?.status ?? (input.result.exitCode === 0 ? "unknown" : "fail"),
    ...(typeof selfReview?.score === "number" ? { selfReviewScore: selfReview.score } : {}),
    selfReviewFindings: selfReview?.findings.length ?? 0,
    nextActions: selfReview?.nextActions ?? []
  };
}

export async function runCapabilityPracticeSuite(
  options: RunCapabilityPracticeSuiteOptions
): Promise<CapabilityPracticeReport> {
  const scenarios = (options.scenarios ?? defaultCapabilityPracticeScenarios)
    .slice(0, options.maxScenarios ?? Number.MAX_SAFE_INTEGER);
  const env = options.env ?? process.env;
  const runner = options.runner ?? defaultPracticeRunner;
  const workspace = resolve(options.workspace);
  const cwd = resolve(options.cwd ?? workspace);
  const xenesisHome = resolve(options.xenesisHome);
  const runs: CapabilityPracticeRunSummary[] = [];

  for (const scenario of scenarios) {
    const scenarioWorkspace = resolveScenarioWorkspace(workspace, scenario);
    const mode = scenario.mode ?? "plan";
    const approvalMode = scenario.approvalMode ?? options.approvalMode ?? "readonly";
    const result = await runner({
      scenario,
      prompt: scenario.prompt,
      workspace: scenarioWorkspace,
      cwd,
      xenesisHome,
      ...(options.configPath ? { configPath: options.configPath } : {}),
      ...(options.provider ? { provider: options.provider } : {}),
      ...(options.model ? { model: options.model } : {}),
      mode,
      approvalMode,
      ...(scenario.maxTurns ? { maxTurns: scenario.maxTurns } : {}),
      env
    });
    runs.push(toRunSummary({
      scenario,
      workspace: scenarioWorkspace,
      mode,
      approvalMode,
      xenesisHome,
      result
    }));
  }

  const report: CapabilityPracticeReport = {
    kind: "capability-practice",
    createdAt: (options.now ?? (() => new Date()))().toISOString(),
    workspace,
    ...(options.provider ? { provider: options.provider } : {}),
    ...(options.model ? { model: options.model } : {}),
    summary: summarizePracticeRuns(runs),
    runs
  };

  if (options.reportPath) {
    await mkdir(dirname(options.reportPath), { recursive: true });
    await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

export async function readCapabilityPracticeScenarioFile(path: string) {
  const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`Practice scenario file must contain a JSON array: ${path}`);
  return parsed.map((item, index) => {
    try {
      return practiceScenarioSchema.parse(item);
    } catch (error) {
      throw new Error(`Invalid practice scenario ${index} in ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
