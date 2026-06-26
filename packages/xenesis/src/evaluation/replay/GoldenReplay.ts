import { stableValuesDiffer } from "../../utils/stableValue.js";

export interface OracleObservation {
  providerEvents?: unknown[];
  ledgerEntries?: unknown[];
  permissionDecisions?: unknown[];
  promptFingerprint?: string;
  finalStatus?: string;
  visibleResult?: string;
}

export interface ReferenceOracleFixture {
  id: string;
  reference: OracleObservation;
}

export interface OracleDiff {
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface OracleComparisonResult {
  ok: boolean;
  fixtureId: string;
  diffs: OracleDiff[];
}

export function compareReferenceOracle(
  fixture: ReferenceOracleFixture,
  actual: OracleObservation,
  approvedDiffPaths: string[] = []
): OracleComparisonResult {
  const approved = new Set(approvedDiffPaths);
  const diffs: OracleDiff[] = [];
  const fields: Array<keyof OracleObservation> = [
    "providerEvents",
    "ledgerEntries",
    "permissionDecisions",
    "promptFingerprint",
    "finalStatus",
    "visibleResult"
  ];

  for (const field of fields) {
    if (approved.has(field)) continue;
    if (stableValuesDiffer(fixture.reference[field], actual[field])) {
      diffs.push({
        path: field,
        expected: fixture.reference[field],
        actual: actual[field]
      });
    }
  }

  return {
    ok: diffs.length === 0,
    fixtureId: fixture.id,
    diffs
  };
}
