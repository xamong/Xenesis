import { describe, expect, it } from "vitest";
import { resolveXenisTaskPolicy } from "../../src/workflows/xenisPolicy.js";

describe("xenis memory task policy", () => {
  it("routes explicit remember requests to the durable memory policy", () => {
    const policy = resolveXenisTaskPolicy("내가 답변은 짧고 실행 중심으로 받는 걸 선호한다고 기억해");

    expect(policy.id).toBe("context-memory");
    expect(policy.priorityTools[0]).toBe("memory");
    expect(policy.systemMessage.content).toContain("Use the `memory` tool before answering");
  });

  it("routes memory search requests to the durable memory policy", () => {
    const policy = resolveXenisTaskPolicy("방금 기억한 내용을 검색해줘");

    expect(policy.id).toBe("context-memory");
    expect(policy.priorityTools).toContain("memory");
    expect(policy.systemMessage.content).toContain("search/recall/list/history");
  });
});
