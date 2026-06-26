import { getFailureRepairRecipe, type FailureRepairRecipe } from "./repairRecipes.js";

export type VerificationToolName = "diagnostics" | "app_e2e_check" | "app_readiness";

export type VerificationFailureCauseId =
  | "server_not_running"
  | "local_file_requires_server"
  | "client_runtime_error"
  | "client_server_contract_mismatch"
  | "root_client_route_missing"
  | "rendered_broken_value"
  | "verification_timeout"
  | "rendered_content_mismatch"
  | "smoke_test_structure"
  | "process_cleanup"
  | "verification_failure";

export interface VerificationFailureCause {
  id: VerificationFailureCauseId;
  confidence: "high" | "medium" | "low";
  evidence: string;
}

export interface VerificationFailureClassification {
  primaryCause?: VerificationFailureCause;
  causes: VerificationFailureCause[];
  nextTools: string[];
  repairPlan: string;
  repairRecipe?: FailureRepairRecipe;
}

export interface VerificationFailureInput {
  toolName: VerificationToolName;
  content: string;
}

const fallbackClassification: VerificationFailureClassification = {
  causes: [],
  nextTools: ["read", "diagnostics"],
  repairPlan: "Inspect the failed verification output, make the smallest concrete fix, then rerun the failed verification.",
  repairRecipe: getFailureRepairRecipe("verification_failure")
};

function compactEvidence(content: string, pattern: RegExp) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const matching = lines.filter((line) => pattern.test(line));
  return (matching.length > 0 ? matching : lines).slice(0, 3).join(" | ").slice(0, 360);
}

function createClassification(
  cause: VerificationFailureCause,
  nextTools: string[],
  repairPlan: string,
  secondaryCauses: VerificationFailureCause[] = []
): VerificationFailureClassification {
  return {
    primaryCause: cause,
    causes: [cause, ...secondaryCauses],
    nextTools,
    repairPlan,
    repairRecipe: getFailureRepairRecipe(cause.id)
  };
}

function includesAny(content: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(content));
}

function hasForbiddenRenderedValue(content: string) {
  return includesAny(content, [
    /forbidden_text/i,
    /\bundefined\b/i,
    /\bNaN\b/i,
    /\[object Object\]/i
  ]);
}

export function classifyVerificationFailure(input: VerificationFailureInput): VerificationFailureClassification {
  const content = input.content;

  if (input.toolName === "app_e2e_check" && includesAny(content, [/Only\s+HTTP\(S\)\s+URLs\s+are\s+allowed/i, /file:\/\//i, /Invalid URL/i])) {
    return createClassification(
      {
        id: "local_file_requires_server",
        confidence: "high",
        evidence: compactEvidence(content, /Only\s+HTTP\(S\)\s+URLs\s+are\s+allowed|file:\/\/|Invalid URL/i)
      },
      ["app_launch_plan", "server", "app_e2e_check"],
      "Select a concrete app launch plan, serve the local static file over HTTP with the managed server tool, rerun app_e2e_check against the http:// URL, then stop the server if this run started it."
    );
  }

  if (input.toolName === "app_e2e_check" && includesAny(content, [/net::ERR_CONNECTION_REFUSED/i, /ECONNREFUSED/i])) {
    return createClassification(
      {
        id: "server_not_running",
        confidence: "high",
        evidence: compactEvidence(content, /ERR_CONNECTION_REFUSED|ECONNREFUSED|page\.goto|app_e2e_check failed/i)
      },
      ["app_launch_plan", "server", "app_e2e_check"],
      "Select a concrete app launch plan, start or restart the workspace app server, wait for readiness, rerun app_e2e_check, then stop the server if this run started it."
    );
  }

  if (input.toolName === "app_e2e_check" && includesAny(content, [/http_status_error/i, /http_error_page/i, /server_default_page/i, /httpStatus:\s*[45]\d\d/i, /HTTP\s*(?:오류|Error)\s*[45]\d\d/i, /IIS\s+Windows\s+Server/i])) {
    return createClassification(
      {
        id: "server_not_running",
        confidence: "high",
        evidence: compactEvidence(content, /http_status_error|http_error_page|server_default_page|httpStatus:\s*[45]\d\d|HTTP\s*(?:오류|Error)\s*[45]\d\d|IIS\s+Windows\s+Server/i)
      },
      ["app_launch_plan", "server", "app_e2e_check"],
      "Select a concrete app launch plan, start or restart the workspace app server for the correct workspace route, wait for readiness, rerun app_e2e_check, then stop the server if this run started it."
    );
  }

  if (includesAny(content, [/page_error/i, /client_script_syntax_error/i, /Uncaught SyntaxError/i, /Unexpected token/i])) {
    return createClassification(
      {
        id: "client_runtime_error",
        confidence: "high",
        evidence: compactEvidence(content, /page_error|client_script_syntax_error|Uncaught|SyntaxError|Unexpected token/i)
      },
      ["read", "patch", "app_readiness", "app_e2e_check"],
      "Fix the reported client script/runtime error in the implicated client file, rerun app_readiness, then rerun app_e2e_check."
    );
  }

  if (includesAny(content, [/smoke_client_contract_mismatch/i, /do not overlap with client renders/i])) {
    return createClassification(
      {
        id: "client_server_contract_mismatch",
        confidence: "high",
        evidence: compactEvidence(content, /smoke_client_contract_mismatch|do not overlap|POST fields|client renders/i)
      },
      ["read", "json", "patch", "app_readiness", "diagnostics", "app_e2e_check"],
      "Align smoke/API fixture payloads with the fields the client actually renders, then rerun app_readiness, diagnostics, and app_e2e_check."
    );
  }

  if (includesAny(content, [/timedOut:\s*true/i, /timeoutHint:/i, /readiness.*timed out/i])) {
    return createClassification(
      {
        id: "verification_timeout",
        confidence: "high",
        evidence: compactEvidence(content, /timedOut|timeoutHint|readiness.*timed out|open handles|child server cleanup/i)
      },
      ["read", "patch", "diagnostics"],
      "Bound the readiness wait, consume HTTP responses, close child processes/open handles, then rerun diagnostics."
    );
  }

  if (
    input.toolName === "app_e2e_check" &&
    hasForbiddenRenderedValue(content)
  ) {
    return createClassification(
      {
        id: "rendered_broken_value",
        confidence: "high",
        evidence: compactEvidence(content, /forbidden_text|forbiddenFindings|undefined|NaN|\[object Object\]/i)
      },
      ["read", "search", "patch", "app_readiness", "app_e2e_check"],
      "Fix the data binding or serialization path that renders undefined, NaN, or [object Object], then rerun app_readiness and app_e2e_check."
    );
  }

  if (includesAny(content, [/missing_expected_text/i, /expectedTextMissing:/i, /text_below_min/i, /interactive_elements_below_min/i, /title_missing/i])) {
    return createClassification(
      {
        id: "rendered_content_mismatch",
        confidence: "medium",
        evidence: compactEvidence(content, /missing_expected_text|expectedTextMissing|text_below_min|interactive_elements_below_min|title_missing/i)
      },
      ["read", "patch", "app_readiness", "app_e2e_check"],
      "Inspect the rendered snapshot and page source. Add or fix concrete visible content, title, and required interactive element(s), then rerun app_readiness and app_e2e_check."
    );
  }

  if (includesAny(content, [/unbounded_readiness_polling/i, /http_response_not_consumed/i, /failure_exit_missing/i, /startup_failure_can_hang/i])) {
    return createClassification(
      {
        id: "smoke_test_structure",
        confidence: "high",
        evidence: compactEvidence(content, /unbounded_readiness_polling|http_response_not_consumed|failure_exit_missing|startup_failure_can_hang/i)
      },
      ["read", "patch", "diagnostics", "app_readiness"],
      "Rewrite the smoke test as one bounded script with failure exit, response consumption, startup failure handling, and cleanup waits."
    );
  }

  if (includesAny(content, [/missing_root_client_route/i, /does not clearly serve it from \//i])) {
    return createClassification(
      {
        id: "root_client_route_missing",
        confidence: "high",
        evidence: compactEvidence(content, /missing_root_client_route|serve it from \//i)
      },
      ["read", "patch", "app_readiness", "diagnostics", "app_e2e_check"],
      "Serve the detected static client from / using the app server's existing routing/static middleware pattern, then rerun app_readiness, diagnostics, and app_e2e_check."
    );
  }

  if (includesAny(content, [/child_cleanup_not_awaited/i, /open handles/i, /child server cleanup/i])) {
    return createClassification(
      {
        id: "process_cleanup",
        confidence: "medium",
        evidence: compactEvidence(content, /child_cleanup_not_awaited|open handles|child server cleanup/i)
      },
      ["read", "patch", "diagnostics"],
      "Ensure child processes are killed and close/exit is awaited with a bounded timeout before reporting verification success."
    );
  }

  return {
    ...fallbackClassification,
    primaryCause: {
      id: "verification_failure",
      confidence: "low",
      evidence: compactEvidence(content, /fail|error|exception|verificationOk|completionBlocked/i)
    },
    causes: [{
      id: "verification_failure",
      confidence: "low",
      evidence: compactEvidence(content, /fail|error|exception|verificationOk|completionBlocked/i)
    }]
  };
}

export function renderVerificationFailureClassification(classification: VerificationFailureClassification) {
  const lines: string[] = [];
  if (classification.primaryCause) {
    lines.push(`failureCause: ${classification.primaryCause.id}`);
    lines.push(`failureConfidence: ${classification.primaryCause.confidence}`);
    if (classification.primaryCause.evidence) lines.push(`failureCauseEvidence: ${classification.primaryCause.evidence}`);
  }
  if (classification.nextTools.length > 0) {
    lines.push(`nextTools: ${classification.nextTools.join(" -> ")}`);
  }
  lines.push(`repairPlan: ${classification.repairPlan}`);
  if (classification.repairRecipe) {
    lines.push(`repairRecipe: ${classification.repairRecipe.id}`);
    lines.push(`repairMode: ${classification.repairRecipe.mode}`);
    lines.push(`repairTitle: ${classification.repairRecipe.title}`);
    lines.push("repairSteps:");
    for (const step of classification.repairRecipe.steps) {
      lines.push(`- ${step}`);
    }
    lines.push("successCriteria:");
    for (const criterion of classification.repairRecipe.successCriteria) {
      lines.push(`- ${criterion}`);
    }
    lines.push("stopCriteria:");
    for (const criterion of classification.repairRecipe.stopCriteria) {
      lines.push(`- ${criterion}`);
    }
  }
  return lines.join("\n");
}
