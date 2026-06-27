import { describe, expect, it } from "vitest";
import type { MemoryInput, MemoryRecord } from "../../src/extensions/index.js";
import {
  buildPartialSupersede,
  findTemporalConflicts,
  isMemoryValidAt,
  sortCurrentBeforeHistorical
} from "../../src/extensions/memoryTemporal.js";

const basePreference: MemoryRecord = {
  id: "pref-morning-avoid",
  text: "대표님은 오전 미팅을 피한다",
  tags: ["preference", "meeting"],
  updatedAt: "2026-03-01T00:00:00.000Z",
  createdAt: "2026-03-01T00:00:00.000Z",
  validFrom: "2026-03-01T00:00:00.000Z"
};

describe("memoryTemporal helpers", () => {
  it("treats validFrom as inclusive and validTo as exclusive", () => {
    const record: MemoryRecord = {
      ...basePreference,
      validFrom: "2026-03-01T00:00:00.000Z",
      validTo: "2026-05-01T00:00:00.000Z"
    };

    expect(isMemoryValidAt(record, "2026-02-28T23:59:59.000Z")).toBe(false);
    expect(isMemoryValidAt(record, "2026-03-01T00:00:00.000Z")).toBe(true);
    expect(isMemoryValidAt(record, "2026-04-30T23:59:59.000Z")).toBe(true);
    expect(isMemoryValidAt(record, "2026-05-01T00:00:00.000Z")).toBe(false);
    expect(isMemoryValidAt({ ...basePreference, validFrom: undefined }, "2026-06-01T00:00:00.000Z")).toBe(true);
  });

  it("sorts currently valid records before historical records and newer current facts first", () => {
    const records: MemoryRecord[] = [
      {
        ...basePreference,
        id: "historical",
        updatedAt: "2026-06-01T00:00:00.000Z",
        validTo: "2026-05-01T00:00:00.000Z"
      },
      {
        ...basePreference,
        id: "current",
        updatedAt: "2026-04-01T00:00:00.000Z"
      },
      {
        ...basePreference,
        id: "current-newer",
        updatedAt: "2026-05-01T00:00:00.000Z",
        validFrom: "2026-05-01T00:00:00.000Z"
      }
    ];

    expect(sortCurrentBeforeHistorical(records, "2026-06-01T00:00:00.000Z").map((record) => record.id)).toEqual([
      "current-newer",
      "current",
      "historical"
    ]);
  });

  it("detects same-period opposite preference conflicts but ignores non-overlapping history", () => {
    const candidate: MemoryInput = {
      id: "pref-morning-like",
      text: "대표님은 오전 미팅을 선호한다",
      tags: ["preference", "meeting"],
      validFrom: "2026-04-01T00:00:00.000Z"
    };

    const conflicts = findTemporalConflicts(candidate, [basePreference], "2026-04-01T00:00:00.000Z");
    const historicalOnly = findTemporalConflicts(candidate, [
      {
        ...basePreference,
        validTo: "2026-03-15T00:00:00.000Z"
      }
    ], "2026-04-01T00:00:00.000Z");

    expect(conflicts).toMatchObject([
      {
        candidateId: "pref-morning-like",
        existingId: "pref-morning-avoid",
        severity: "inferred"
      }
    ]);
    expect(historicalOnly).toEqual([]);
  });

  it("builds a partial supersede patch for exception rules without expiring the base record", () => {
    const exception: MemoryInput = {
      id: "pref-overseas-morning-exception",
      text: "화/목 오전 09:00-11:00 해외 파트너 미팅은 허용한다",
      tags: ["preference", "meeting", "exception"],
      validFrom: "2026-05-01T00:00:00.000Z"
    };

    const patch = buildPartialSupersede(basePreference, exception);

    expect(patch.mode).toBe("partial");
    expect(patch.basePatch).toMatchObject({
      id: "pref-morning-avoid",
      partialSupersededBy: ["pref-overseas-morning-exception"]
    });
    expect(patch.basePatch).not.toHaveProperty("validTo");
    expect(patch.nextInput).toMatchObject({
      id: "pref-overseas-morning-exception",
      supersedes: ["pref-morning-avoid"],
      supersedeMode: "partial"
    });
  });
});
