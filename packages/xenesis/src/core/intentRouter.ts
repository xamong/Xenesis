import type { ApprovalMode } from "../config/index.js";
import type { AgentIntent } from "./events.js";
import type { AgentRunMode } from "./AgentRuntimeFactory.js";

export interface IntentRoute {
  intent: AgentIntent;
  mode?: AgentRunMode;
  approvalMode?: ApprovalMode;
  reason: string;
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function forbidsWorkspaceMutation(value: string) {
  return /(?:수정|변경|편집|작성|생성|구현|실행|write|update|edit|modify|create|implement)[^.!?\n]{0,30}(?:하지\s*말|하지마|말고|금지|않고|없이)|(?:do\s+not|don't|dont|without|never)[^.!?\n]{0,60}(?:write|update|edit|modify|create|implement|change)/i.test(value);
}

export function classifyPromptIntent(prompt: string, explicitMode?: AgentRunMode): IntentRoute {
  const normalized = prompt.toLowerCase();

  if (explicitMode) {
    return {
      intent: explicitMode,
      mode: explicitMode,
      reason: "explicit mode selected"
    };
  }

  if (forbidsWorkspaceMutation(normalized)) {
    return {
      intent: includesAny(normalized, ["제안", "propose"]) ? "propose" : "plan",
      mode: "plan",
      approvalMode: "readonly",
      reason: "workspace mutation forbidden by prompt"
    };
  }

  if (includesAny(normalized, ["버그", "에러", "오류", "고쳐", "수정", "fix", "debug", "error", "bug"])) {
    return {
      intent: "debug",
      mode: "work",
      reason: "fix/debug prompt"
    };
  }

  if (includesAny(normalized, ["리팩터", "refactor", "정리해줘", "개선해줘", "개선"])) {
    return {
      intent: "refactor",
      mode: "work",
      reason: "refactor/improvement prompt"
    };
  }

  if (includesAny(normalized, ["구현", "진행", "만들어", "작성", "implement", "build", "create"])) {
    return {
      intent: "work",
      mode: "work",
      reason: "implementation prompt"
    };
  }

  if (includesAny(normalized, ["장기", "백그라운드", "예약", "long", "background", "schedule"])) {
    return {
      intent: "long_task",
      mode: "work",
      reason: "long-running task prompt"
    };
  }

  if (includesAny(normalized, [
    "분석",
    "확인",
    "점검",
    "읽어",
    "살펴",
    "요약",
    "설명",
    "analyze",
    "inspect",
    "review",
    "summarize",
    "explain"
  ])) {
    return {
      intent: includesAny(normalized, ["설명", "explain"]) ? "explain" : "analyze",
      mode: "plan",
      approvalMode: "readonly",
      reason: "read-only analysis prompt"
    };
  }

  if (includesAny(normalized, ["계획", "설계", "제안", "plan", "design", "propose"])) {
    return {
      intent: includesAny(normalized, ["제안", "propose"]) ? "propose" : "plan",
      mode: "plan",
      approvalMode: "readonly",
      reason: "planning prompt"
    };
  }

  if (includesAny(normalized, ["조사", "찾아", "research", "lookup"])) {
    return {
      intent: "research",
      mode: "plan",
      approvalMode: "readonly",
      reason: "research prompt"
    };
  }

  return {
    intent: "default",
    reason: "no specific intent rule matched"
  };
}
