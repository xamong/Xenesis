#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import {
  buildCapabilityImprovementReport,
  buildCapabilityImprovementTaskBacklog,
  type CapabilityImprovementFinding,
  type CapabilityImprovementRecommendation,
  type CapabilityImprovementRunReportInput,
  type CapabilityScenarioBacklog,
  readCapabilityImprovementTaskResults,
  readCapabilityScenarioBacklog,
  writeCapabilityImprovementReport,
  writeCapabilityImprovementTaskBacklog,
} from '../src/evaluation/index.js';

interface ParsedArgs {
  backlog?: string;
  out?: string;
  results?: string;
  runReports?: string;
  maxRunReports: number;
  tasksOut?: string;
  json: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = { json: false, maxRunReports: 20 };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) throw new Error(`Option ${arg} requires a value.`);
      index += 1;
      return value;
    };

    if (arg === '--backlog') parsed.backlog = next();
    else if (arg === '--out') parsed.out = next();
    else if (arg === '--results') parsed.results = next();
    else if (arg === '--run-reports') parsed.runReports = next();
    else if (arg === '--max-run-reports') parsed.maxRunReports = positiveInteger(next(), '--max-run-reports');
    else if (arg === '--tasks-out') parsed.tasksOut = next();
    else if (arg === '--json') parsed.json = true;
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown option ${arg}. Run "npm run capability:improve -- --help".`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(
    [
      'Usage: npm run capability:improve -- [options]',
      '',
      'Builds a prioritized improvement report from the capability scenario backlog.',
      '',
      'Options:',
      '  --backlog <path>     Backlog path. Default: $XENESIS_HOME/reports/capability-scenario-backlog.json',
      '  --out <path>         Report path. Default: $XENESIS_HOME/reports/capability-improvement-report.json',
      '  --results <path>     Task result log path. Default: $XENESIS_HOME/reports/capability-task-results.json',
      '  --run-reports <dir>  Run report directory for self-review feedback. Default: $XENESIS_HOME/run_reports',
      '  --max-run-reports <n> Maximum recent run reports to read. Default: 20',
      '  --tasks-out <path>   Task candidate path. Default: $XENESIS_HOME/reports/capability-improvement-tasks.json',
      '  --json               Print the full report JSON.',
    ].join('\n'),
  );
}

function positiveInteger(value: string, name: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer.`);
  return parsed;
}

function resolveXenesisHome() {
  return process.env.XENESIS_HOME?.trim() ? resolve(process.env.XENESIS_HOME) : resolve(homedir(), '.xenesis');
}

function defaultBacklogPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-scenario-backlog.json');
}

function defaultReportPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-improvement-report.json');
}

function defaultTasksPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-improvement-tasks.json');
}

function defaultResultsPath() {
  return resolve(resolveXenesisHome(), 'reports', 'capability-task-results.json');
}

function defaultRunReportsPath() {
  return resolve(resolveXenesisHome(), 'run_reports');
}

function emptyCapabilityBacklog(): CapabilityScenarioBacklog {
  return {
    kind: 'capability-scenario-backlog',
    updatedAt: new Date().toISOString(),
    candidates: [],
  };
}

async function readRunReports(dir: string, maxItems: number): Promise<CapabilityImprovementRunReportInput[]> {
  let files;
  try {
    files = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }

  const reports = await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith('.json'))
      .map(async (file) => {
        try {
          return JSON.parse(await readFile(resolve(dir, file.name), 'utf8')) as CapabilityImprovementRunReportInput;
        } catch {
          return undefined;
        }
      }),
  );

  return reports
    .filter((report): report is CapabilityImprovementRunReportInput =>
      Boolean(
        report?.sessionId &&
          report.createdAt &&
          report.selfReview &&
          Array.isArray(report.selfReview.findings) &&
          Array.isArray(report.selfReview.nextActions),
      ),
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, Math.max(1, maxItems));
}

function renderFindingLine(finding: CapabilityImprovementFinding, index: number) {
  const signals = finding.signals.length > 0 ? ` signals=${finding.signals.join(',')}` : '';
  return [
    `${index + 1}.`,
    finding.priority,
    `score=${finding.priorityScore}`,
    `category=${finding.scenarioCategory}/${finding.failureCategory}`,
    `occurrences=${finding.occurrences}`,
    `candidates=${finding.candidateIds.length}`,
    signals,
  ]
    .filter(Boolean)
    .join(' ');
}

function renderRecommendationLine(recommendation: CapabilityImprovementRecommendation, index: number) {
  return [
    `${index + 1}.`,
    recommendation.priority,
    `score=${recommendation.priorityScore}`,
    `area=${recommendation.area}`,
    `status=${recommendation.executionStatus}`,
    `findings=${recommendation.findingIds.length}`,
    `signals=${recommendation.signals.slice(0, 5).join(',') || 'none'}`,
  ].join(' ');
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const backlogPath = resolve(parsed.backlog ?? defaultBacklogPath());
  const reportPath = resolve(parsed.out ?? defaultReportPath());
  const tasksPath = resolve(parsed.tasksOut ?? defaultTasksPath());
  const resultsPath = resolve(parsed.results ?? defaultResultsPath());
  const runReportsPath = resolve(parsed.runReports ?? defaultRunReportsPath());
  const taskResults = await readCapabilityImprovementTaskResults(resultsPath);
  const runReports = await readRunReports(runReportsPath, parsed.maxRunReports);
  const backlog = (await readCapabilityScenarioBacklog(backlogPath)) ?? emptyCapabilityBacklog();

  const report = buildCapabilityImprovementReport({
    backlog,
    taskResults,
    ...(runReports.length > 0 ? { runReports } : {}),
  });
  await writeCapabilityImprovementReport(reportPath, report);
  await writeCapabilityImprovementTaskBacklog(tasksPath, buildCapabilityImprovementTaskBacklog({ report }));

  if (parsed.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log(`capability-improve: report ${reportPath}`);
  console.log(`capability-improve: tasks ${tasksPath}`);
  console.log(`capability-improve: results ${resultsPath}${taskResults ? '' : ' (none)'}`);
  console.log(`capability-improve: run reports ${runReportsPath} (${runReports.length})`);
  console.log(`capability-improve: backlog updated ${report.backlogUpdatedAt}`);
  console.log(
    [
      'capability-improve: summary',
      `candidates=${report.summary.totalCandidates}`,
      `active=${report.summary.activeCandidates}`,
      `ignored=${report.summary.ignoredCandidates}`,
      `occurrences=${report.summary.totalOccurrences}`,
      `critical=${report.summary.critical}`,
      `high=${report.summary.high}`,
      `medium=${report.summary.medium}`,
      `low=${report.summary.low}`,
    ].join(' '),
  );
  console.log(
    [
      'capability-improve: execution',
      `recommendations=${report.execution.totalRecommendations}`,
      `completed=${report.execution.completedRecommendations}`,
      `failed=${report.execution.failedRecommendations}`,
      `running=${report.execution.runningRecommendations}`,
      `open=${report.execution.openRecommendations}`,
      `remaining=${report.execution.remainingRecommendationIds.length}`,
      `latest=${report.execution.latestResultAt ?? 'none'}`,
    ].join(' '),
  );

  const topFindings = report.findings.slice(0, 10);
  const topRecommendations = report.recommendations.slice(0, 5);
  if (topRecommendations.length > 0) {
    console.log('capability-improve: recommended action groups');
    for (const [index, recommendation] of topRecommendations.entries()) {
      console.log(renderRecommendationLine(recommendation, index));
      console.log(`   target: ${recommendation.targetFiles.slice(0, 4).join(', ')}`);
      console.log(`   verify: ${recommendation.verification[0] ?? 'npm run capability:eval'}`);
    }
  }

  if (topFindings.length === 0) {
    console.log('capability-improve: no active improvement findings');
    return;
  }

  console.log('capability-improve: top findings');
  for (const [index, finding] of topFindings.entries()) {
    console.log(renderFindingLine(finding, index));
    console.log(`   action: ${finding.action}`);
  }
}

main().catch((error) => {
  console.error(`capability-improve: error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
