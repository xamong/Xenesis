import { callWorkflowDeskCapability } from '../../deskBridge';
import { terminalHost } from '../../terminal/terminalHost';
import type { WorkflowHostAdapter } from './workflowEngine';
import { compactCommandResponse, createCommandStatusId, terminalLabelFor } from './workflowRunnerRuntimeUtils';
import type { RemoteFileProfile, WorkflowTerminalCommandStatus } from './workflowRunnerTypes';
import { normalizeCommandConcurrency } from './workflowRunnerUtils';

export function createTerminalHostAdapter(
  onCommandLog: (entry: string) => void,
  onCommandStatusChange: (updates: WorkflowTerminalCommandStatus[]) => void,
  commandConcurrency: number,
): WorkflowHostAdapter {
  return {
    async sendCommand(request) {
      const targets = request.targetTermIds.filter((termId) => terminalHost.has(termId));
      if (!targets.length) {
        return {
          ok: false,
          command: request.command,
          sent: 0,
          targetTermIds: [],
          sequential: request.sequential,
          error: 'no live target terminal sessions selected.',
        };
      }

      const statusIds = new Map(
        targets.map((termId, index) => [termId, createCommandStatusId(request.actionId, termId, index)]),
      );
      const sentAt = new Date().toISOString();
      onCommandStatusChange(
        targets.map((termId) => ({
          id: statusIds.get(termId) ?? createCommandStatusId(request.actionId, termId, 0),
          source: 'workflow',
          terminalId: termId,
          terminalLabel: terminalLabelFor(termId),
          command: request.command,
          state: 'sent',
          sentAt,
          updatedAt: sentAt,
          retryable: true,
        })),
      );

      const responseSnapshots = request.reply ? captureTerminalResponseSnapshots(targets) : new Map<string, string>();
      if (request.sequential) {
        for (const termId of targets) {
          terminalHost.sendLine(termId, request.command);
          await wait(250);
        }
      } else {
        await runConcurrentTerminalCommands(targets, commandConcurrency, async (termId) => {
          terminalHost.sendLine(termId, request.command);
        });
      }

      const responseData = request.reply
        ? createCommandResponseData(
            request.command,
            targets,
            await waitForTerminalResponses(targets, responseSnapshots, request.timeoutMs > 0 ? request.timeoutMs : 800),
          )
        : undefined;

      if (responseData) {
        const respondedAt = new Date().toISOString();
        onCommandStatusChange(
          responseData.results.map((item) => ({
            id: statusIds.get(item.terminalId) ?? createCommandStatusId(request.actionId, item.terminalId, 0),
            source: 'workflow',
            terminalId: item.terminalId,
            terminalLabel: terminalLabelFor(item.terminalId),
            command: request.command,
            state: item.text ? 'responded' : 'sent',
            sentAt,
            updatedAt: respondedAt,
            responsePreview: item.text ? compactCommandResponse(item.text) : undefined,
            retryable: true,
          })),
        );
      }

      onCommandLog(
        `${request.sequential ? 'Workflow sequential' : 'Workflow broadcast'}: ${request.command} -> ${targets.length} sessions`,
      );
      return responseData
        ? {
            ok: true,
            command: request.command,
            sent: targets.length,
            targetTermIds: targets,
            sequential: request.sequential,
            responseData,
          }
        : {
            ok: true,
            command: request.command,
            sent: targets.length,
            targetTermIds: targets,
            sequential: request.sequential,
          };
    },

    async runPlaywrightSnapshot(request) {
      try {
        if (!window.workflowPlaywrightAPI?.snapshot) {
          return { ok: false, ...request, error: 'workflowPlaywrightAPI is not available.' };
        }
        const result = await window.workflowPlaywrightAPI.snapshot(request);
        onCommandLog(
          `Workflow Playwright snapshot: ${request.url} -> ${result.filePath || result.error || 'completed'}`,
        );
        return result;
      } catch (error) {
        return { ok: false, ...request, error: error instanceof Error ? error.message : String(error) };
      }
    },

    async runPlaywright(request) {
      try {
        if (!window.workflowPlaywrightAPI?.run) {
          return { ok: false, ...request, error: 'workflowPlaywrightAPI is not available.' };
        }
        const result = await window.workflowPlaywrightAPI.run(request);
        onCommandLog(
          `Workflow Playwright run: ${request.url} -> ${result.filePath || result.traceFilePath || result.error || 'completed'}`,
        );
        return result;
      } catch (error) {
        return { ok: false, ...request, error: error instanceof Error ? error.message : String(error) };
      }
    },

    async transferFile(request) {
      try {
        const settings = await readWorkflowSettingsSnapshot();
        const profiles = settings.remoteFiles?.profiles ?? [];
        const profile = resolveRemoteFileProfile(profiles, request.profileId, request.protocol);
        const fileName =
          request.fileName || inferFileName(request.direction === 'upload' ? request.localPath : request.remotePath);

        if (!profile) {
          return {
            ok: false,
            direction: request.direction,
            profileId: request.profileId,
            localPath: request.localPath,
            remotePath: request.remotePath,
            fileName,
            overwritePolicy: request.overwritePolicy,
            error: 'no matching remote file profile found.',
          };
        }

        const item = await window.transferQueueAPI.enqueue({
          direction: request.direction,
          profile,
          localPath: request.localPath,
          remotePath: request.remotePath,
          ...(request.fileName ? { fileName: request.fileName } : {}),
          overwritePolicy: request.overwritePolicy,
        });

        onCommandLog(`Workflow transfer: ${request.direction} ${item.fileName} -> ${profile.name} (${item.state})`);
        return {
          ok: true,
          direction: item.direction,
          profileId: profile.id,
          localPath: item.localPath,
          remotePath: item.remotePath,
          fileName: item.fileName,
          overwritePolicy: item.overwritePolicy,
          queueItemId: item.id,
          state: item.state,
        };
      } catch (error) {
        return {
          ok: false,
          direction: request.direction,
          profileId: request.profileId,
          localPath: request.localPath,
          remotePath: request.remotePath,
          fileName:
            request.fileName || inferFileName(request.direction === 'upload' ? request.localPath : request.remotePath),
          overwritePolicy: request.overwritePolicy,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  };
}

async function readWorkflowSettingsSnapshot(): Promise<{ remoteFiles?: { profiles?: RemoteFileProfile[] } }> {
  const capabilityResult = await callWorkflowDeskCapability('xd.settings.read').catch(() => null);
  if (capabilityResult?.ok && capabilityResult.result && typeof capabilityResult.result === 'object') {
    return capabilityResult.result as { remoteFiles?: { profiles?: RemoteFileProfile[] } };
  }
  return window.terminalAPI.getSettings();
}

async function runConcurrentTerminalCommands(
  termIds: string[],
  commandConcurrency: number,
  task: (termId: string) => Promise<void> | void,
): Promise<void> {
  const targets = [...new Set(termIds)].filter((termId) => terminalHost.has(termId));
  const limit = normalizeCommandConcurrency(commandConcurrency);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(limit, targets.length) }, async () => {
    while (nextIndex < targets.length) {
      const index = nextIndex;
      nextIndex += 1;
      await task(targets[index]);
    }
  });
  await Promise.all(workers);
}

function captureTerminalResponseSnapshots(termIds: string[]): Map<string, string> {
  const snapshots = new Map<string, string>();
  for (const termId of termIds) {
    snapshots.set(termId, terminalHost.getBufferText(termId));
  }
  return snapshots;
}

async function waitForTerminalResponses(
  termIds: string[],
  snapshots: Map<string, string>,
  timeoutMs: number,
): Promise<Array<{ terminalId: string; text: string }>> {
  const timeout = Math.max(0, timeoutMs);
  const startedAt = Date.now();
  const deadline = startedAt + timeout;
  const quietMs = 160;
  const latest = new Map<string, string>();
  let lastChangeAt = startedAt;

  for (const termId of termIds) {
    latest.set(termId, extractTerminalResponseDelta(snapshots.get(termId) ?? '', terminalHost.getBufferText(termId)));
  }

  while (Date.now() < deadline) {
    await wait(Math.min(80, Math.max(0, deadline - Date.now())));
    let changed = false;
    for (const termId of termIds) {
      const next = extractTerminalResponseDelta(snapshots.get(termId) ?? '', terminalHost.getBufferText(termId));
      if (next !== latest.get(termId)) {
        latest.set(termId, next);
        changed = true;
      }
    }
    if (changed) lastChangeAt = Date.now();
    if ([...latest.values()].some(Boolean) && Date.now() - lastChangeAt >= quietMs) break;
  }

  return termIds.map((termId) => ({
    terminalId: termId,
    text: (latest.get(termId) ?? '').trimEnd(),
  }));
}

function extractTerminalResponseDelta(before: string, after: string): string {
  if (!after) return '';
  if (!before) return after;
  if (after.startsWith(before)) return after.slice(before.length).replace(/^\r?\n/, '');
  const overlap = findTextOverlap(before, after);
  return after.slice(overlap).replace(/^\r?\n/, '');
}

function findTextOverlap(before: string, after: string): number {
  const max = Math.min(before.length, after.length);
  for (let length = max; length > 0; length -= 1) {
    if (before.slice(before.length - length) === after.slice(0, length)) return length;
  }
  return 0;
}

function createCommandResponseData(
  command: string,
  targetTermIds: string[],
  results: Array<{ terminalId: string; text: string }>,
) {
  return {
    ResultMsg: results
      .map((item) => item.text)
      .filter(Boolean)
      .join('\n'),
    command,
    sent: targetTermIds.length,
    targetTermIds,
    results,
  };
}

function resolveRemoteFileProfile(
  profiles: RemoteFileProfile[],
  profileId: string,
  protocol: string,
): RemoteFileProfile | null {
  const requested = profileId.trim().toLowerCase();
  const requestedProtocol = protocol.trim().toLowerCase();
  if (requested) {
    const exact = profiles.find(
      (profile) =>
        profile.id.toLowerCase() === requested ||
        profile.name.toLowerCase() === requested ||
        profile.host.toLowerCase() === requested,
    );
    if (exact) return exact;
  }
  return profiles.find((profile) => profile.protocol.toLowerCase() === requestedProtocol) ?? profiles[0] ?? null;
}

function inferFileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? '';
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
