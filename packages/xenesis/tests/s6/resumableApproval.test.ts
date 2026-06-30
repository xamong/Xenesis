import { describe, expect, it } from 'vitest';
import { buildRunSnapshot, isResumableRunState } from '../../src/core/resume/ResumableRunState.js';

const base = {
  turns: 1,
  usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  projectAnalysisEvidenceRecoveryCount: 0,
  explicitToolCompletionRecoveryCount: 0,
  fileMutationRequiredRecoveryCount: 0,
  maxOutputTokensRecoveryCount: 0,
  toolRecoveryFinalizationRecoveryCount: 0,
  repositoryRecommendationRecoveryUsed: false,
  falseUnavailableToolRecoveryUsed: false,
  successfulToolNames: new Set<string>(),
  attemptedToolNames: new Set<string>(),
  successfulEvidencePaths: new Set<string>(),
  successfulEvidenceToolCount: 0,
  successfulMutationCount: 0,
  mutationSinceLastRead: false,
  verificationRecoveryCounts: new Map<string, number>(),
  autoVerificationRepairSignatures: new Set<string>(),
  verificationRepairExtensionActive: false,
  recentCompactionSavedRatios: [],
  stopHookContinuationCount: 0,
  messageSeq: 0,
};

describe('ResumableRunState S6 fields', () => {
  it('buildRunSnapshot carries pendingApproval + alwaysAllowedTools', () => {
    const snap = buildRunSnapshot({
      ...base,
      alwaysAllowedTools: new Set(['read']),
      pendingApproval: {
        toolCallId: 'tc1',
        toolName: 'shell',
        toolInput: { cmd: 'x' },
        approvalId: 'a1',
        reason: 'risky',
        riskLevel: 'high',
        summary: 'run shell',
      },
    } as any);
    expect(snap.alwaysAllowedTools).toEqual(['read']);
    expect(snap.pendingApproval?.toolCallId).toBe('tc1');
    expect(isResumableRunState(snap)).toBe(true);
  });
  it('pre-S6 snapshot (no S6 fields) is still valid', () => {
    const snap = buildRunSnapshot(base as any);
    expect(isResumableRunState(snap)).toBe(true);
    expect(snap.alwaysAllowedTools ?? []).toEqual([]);
  });
});
