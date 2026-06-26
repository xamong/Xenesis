import { FileArtifactStore } from "../artifacts/index.js";
import { FileWorkspaceChangeStore } from "../changes/index.js";
import type { XenesisConfig } from "../config/index.js";
import { FileRunReportStore, type RunReport, type RunReportRepairRecord } from "../runReports/index.js";
import { readSessionLog, type JsonlSessionWriter } from "../sessions/index.js";
import { runVerificationCommands, type VerificationReport } from "../verification/index.js";

export type AgentRunNoticeHandler = (line: string) => void | Promise<void>;

export interface BuildAndSaveRunReportOptions {
  verification?: VerificationReport;
  repairs?: RunReportRepairRecord[];
}

export interface FinalizeAgentRunOptions {
  config: XenesisConfig;
  sessionWriter: JsonlSessionWriter;
  sessionId: string;
  doneContent?: string;
  env: NodeJS.ProcessEnv;
  onNotice?: AgentRunNoticeHandler;
}

export function createArtifactStore(config: XenesisConfig) {
  return new FileArtifactStore({
    xenesisHome: config.xenesisHome
  });
}

export function createWorkspaceChangeStore(config: XenesisConfig) {
  return new FileWorkspaceChangeStore({
    workspaceRoot: config.workspace,
    xenesisHome: config.xenesisHome
  });
}

export function createRunReportStore(config: XenesisConfig) {
  return new FileRunReportStore({
    xenesisHome: config.xenesisHome
  });
}

export async function saveSessionOutputArtifact(
  config: XenesisConfig,
  sessionWriter: JsonlSessionWriter,
  sessionId: string,
  content: string
) {
  if (!content.trim()) return undefined;
  const artifact = await createArtifactStore(config).save({
    title: "Session result",
    kind: "assistant-output",
    sessionId,
    content
  });
  await sessionWriter.write({
    type: "artifact",
    artifactId: artifact.id,
    title: artifact.title,
    kind: artifact.kind
  });
  return artifact;
}

export async function buildAndSaveRunReport(
  config: XenesisConfig,
  sessionId: string,
  options: BuildAndSaveRunReportOptions = {}
) {
  const changeStore = createWorkspaceChangeStore(config);
  const artifactStore = createArtifactStore(config);
  const reportStore = createRunReportStore(config);
  const existing = await reportStore.read(sessionId);
  const records = await readSessionLog(config.xenesisHome, sessionId);
  const [changes, artifacts, checkpoint] = await Promise.all([
    changeStore.checkpointChanges(sessionId),
    artifactStore.list().then((records) => records.filter((record) => record.sessionId === sessionId)),
    changeStore.getCheckpoint(sessionId)
  ]);
  return await reportStore.save(reportStore.build({
    sessionId,
    records,
    changes,
    artifacts,
    checkpoint,
    verification: options.verification ?? existing?.verification,
    repairs: options.repairs ?? existing?.repairs
  }));
}

export async function acceptCheckpointAfterPassedVerification(
  config: XenesisConfig,
  sessionId: string,
  report: RunReport,
  onNotice?: AgentRunNoticeHandler
) {
  if (report.verification?.status !== "passed") {
    await onNotice?.(`accept: skipped verification=${report.verification?.status ?? "none"}`);
    return report;
  }

  const changeStore = createWorkspaceChangeStore(config);
  const checkpoint = await changeStore.getCheckpoint(sessionId);
  if (!checkpoint || checkpoint.pendingChangeCount === 0) {
    await onNotice?.("accept: skipped 0");
    return await buildAndSaveRunReport(config, sessionId, {
      verification: report.verification,
      repairs: report.repairs
    });
  }

  const accepted = await changeStore.acceptCheckpoint(sessionId);
  await onNotice?.(`accept: checkpoint ${sessionId} accepted ${accepted.length} changes`);
  return await buildAndSaveRunReport(config, sessionId, {
    verification: report.verification,
    repairs: report.repairs
  });
}

export async function finalizeAgentRun(options: FinalizeAgentRunOptions): Promise<RunReport> {
  const {
    config,
    sessionWriter,
    sessionId,
    doneContent,
    env,
    onNotice
  } = options;

  if (doneContent !== undefined) {
    await saveSessionOutputArtifact(config, sessionWriter, sessionId, doneContent);
  }

  let report = await buildAndSaveRunReport(config, sessionId);
  if (!config.verification.autoRun) {
    await sessionWriter.write({
      type: "run_self_review",
      ...report.selfReview
    });
    return report;
  }

  const verification = await runVerificationCommands({
    commands: config.verification.commands,
    cwd: config.workspace,
    env,
    timeoutMs: config.verification.timeoutMs,
    maxOutputChars: config.verification.maxOutputChars
  });
  report = await createRunReportStore(config).save({
    ...report,
    verification
  });
  if (config.verification.acceptOnPass) {
    report = await acceptCheckpointAfterPassedVerification(config, sessionId, report, onNotice);
    await sessionWriter.write({
      type: "run_self_review",
      ...report.selfReview
    });
    return report;
  }
  await sessionWriter.write({
    type: "run_self_review",
    ...report.selfReview
  });
  return report;
}
