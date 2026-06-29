import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyPromptIntent } from "./intentRouter.js";

describe("classifyPromptIntent", () => {
  it("does not infer run mode, approval mode, or intent from prompt keywords", () => {
    for (const prompt of [
      "버그 고쳐줘",
      "전체 코드 수정하지 말고 분석만 해",
      "새 기능 구현해줘",
      "장기 백그라운드 작업으로 예약해",
      "please research and summarize this",
      "refactor all files",
    ]) {
      expect(classifyPromptIntent(prompt)).toEqual({
        intent: "default",
        reason: "no explicit mode selected",
      });
    }
  });

  it("honors explicit mode selection only", () => {
    expect(classifyPromptIntent("버그 고쳐줘", "plan")).toEqual({
      intent: "plan",
      mode: "plan",
      reason: "explicit mode selected",
    });
    expect(classifyPromptIntent("분석만 해", "work")).toEqual({
      intent: "work",
      mode: "work",
      reason: "explicit mode selected",
    });
  });

  it("keeps keyword and regex routing helpers out of the source", () => {
    const source = readFileSync(new URL("./intentRouter.ts", import.meta.url), "utf8");

    expect(source).not.toMatch(/includesAny/);
    expect(source).not.toMatch(/forbidsWorkspaceMutation/);
    expect(source).not.toMatch(/fix\/debug prompt/);
    expect(source).not.toMatch(/workspace mutation forbidden by prompt/);
    expect(source).not.toMatch(/implementation prompt/);
    expect(source).not.toMatch(/read-only analysis prompt/);
  });
});
