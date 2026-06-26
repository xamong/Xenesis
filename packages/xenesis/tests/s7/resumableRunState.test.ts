import { describe, it, expect } from "vitest";
import { isResumableRunState } from "../../src/core/resume/ResumableRunState.js";
import type { ResumableRunState } from "../../src/core/resume/ResumableRunState.js";

const valid: ResumableRunState = {
  turns: 3,
  usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
  recovery: {
    projectAnalysisEvidenceRecoveryCount: 0,
    explicitToolCompletionRecoveryCount: 1,
    fileMutationRequiredRecoveryCount: 0,
    maxOutputTokensRecoveryCount: 0,
    toolRecoveryFinalizationRecoveryCount: 0,
    repositoryRecommendationRecoveryUsed: false,
    falseUnavailableToolRecoveryUsed: false
  },
  successfulToolNames: ["read"],
  attemptedToolNames: ["read", "shell"],
  successfulEvidencePaths: ["a.ts"],
  successfulEvidenceToolCount: 1,
  successfulMutationCount: 0,
  mutationSinceLastRead: false,
  verificationRecoveryCounts: [["verify", 1]],
  autoVerificationRepairSignatures: [],
  verificationRepairExtensionActive: false,
  recentCompactionSavedRatios: [0.3],
  previousCompactSummary: "S",
  stopHookContinuationCount: 0,
  messageSeq: 7
};

describe("isResumableRunState", () => {
  it("accepts a well-formed snapshot", () => {
    expect(isResumableRunState(valid)).toBe(true);
  });
  it("accepts a snapshot without the optional previousCompactSummary", () => {
    const { previousCompactSummary: _omit, ...rest } = valid;
    expect(isResumableRunState(rest)).toBe(true);
  });
  it("rejects malformed input", () => {
    expect(isResumableRunState(null)).toBe(false);
    expect(isResumableRunState({ turns: "x" })).toBe(false);
    expect(isResumableRunState({ ...valid, recovery: undefined })).toBe(false);
  });
});
