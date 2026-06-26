import { readFile } from "node:fs/promises";
import { z } from "zod";
import { classifyVerificationFailure, renderVerificationFailureClassification } from "../core/failureClassification.js";
import { assertInsideWorkspace } from "../utils/workspace.js";
import type { Tool } from "./types.js";

const defaultClientPaths = ["index.html", "client.html", "app.html"];

function pathInput(defaultPath: string) {
  return z.preprocess((value) => value === null ? undefined : value, z.string().default(defaultPath));
}

const appReadinessInput = z.object({
  packagePath: pathInput("package.json"),
  serverPath: pathInput("server.js"),
  smokePath: pathInput("test/smokeTest.js"),
  clientPaths: z.preprocess(
    (value) => value === null ? undefined : value,
    z.array(z.string()).default(defaultClientPaths)
  )
});

const appReadinessOpenAIInput = z.object({
  packagePath: z.string(),
  serverPath: z.string(),
  smokePath: z.string(),
  clientPaths: z.array(z.string())
});

type AppReadinessInput = z.infer<typeof appReadinessInput>;

interface ReadinessIssue {
  id: string;
  severity: "fail" | "warn";
  detail: string;
}

async function readOptionalText(workspaceRoot: string, path: string) {
  try {
    return await readFile(assertInsideWorkspace(workspaceRoot, path), "utf8");
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "";
    if (code === "ENOENT" || code === "EISDIR") return undefined;
    throw error;
  }
}

async function readOptionalTextWithFallback(
  workspaceRoot: string,
  label: string,
  requestedPath: string,
  defaultPath: string
) {
  const requestedText = await readOptionalText(workspaceRoot, requestedPath);
  if (requestedText !== undefined) {
    return { path: requestedPath, text: requestedText };
  }

  if (requestedPath !== defaultPath) {
    const defaultText = await readOptionalText(workspaceRoot, defaultPath);
    if (defaultText !== undefined) {
      return {
        path: defaultPath,
        text: defaultText,
        fallback: `${label}: ${requestedPath} -> ${defaultPath}`
      };
    }
  }

  return { path: requestedPath, text: undefined };
}

function pathOrDefault(path: string | undefined, defaultPath: string) {
  const trimmed = path?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : defaultPath;
}

function clientPathsOrDefault(paths: string[] | undefined) {
  const normalized = (paths ?? [])
    .map((path) => path.trim())
    .filter((path) => path.length > 0);
  const candidates = normalized.length > 0 ? normalized : defaultClientPaths;
  return Array.from(new Set([...candidates, ...defaultClientPaths]));
}

function hasPackageScript(packageText: string | undefined, script: string) {
  if (!packageText) return false;
  try {
    const parsed = JSON.parse(packageText) as { scripts?: Record<string, string> };
    return typeof parsed.scripts?.[script] === "string" && parsed.scripts[script].trim().length > 0;
  } catch {
    return false;
  }
}

function hasStaticClient(clientFiles: Record<string, string | undefined>) {
  return Object.values(clientFiles).some((content) => content !== undefined);
}

function clientFileNames(clientFiles: Record<string, string | undefined>) {
  return Object.entries(clientFiles)
    .filter(([, content]) => content !== undefined)
    .map(([path]) => path);
}

function serverServesRootClient(serverText: string | undefined, clientFiles: Record<string, string | undefined>) {
  if (!serverText) return false;
  if (/app\.(get|use)\s*\(\s*["']\/["']/m.test(serverText) && /sendFile|send\s*\(|render\s*\(/m.test(serverText)) {
    return true;
  }
  if (/express\.static\s*\(/m.test(serverText) && clientFiles["index.html"] !== undefined) {
    return true;
  }
  return false;
}

function hasBoundedReadiness(smokeText: string | undefined) {
  if (!smokeText) return false;
  const hasRetryBound = /maxAttempts|attempts\s*[<>]=?|deadline|Date\.now\s*\(|setTimeout\s*\([^,]+,\s*\d{3,}/m.test(smokeText);
  const hasTimeoutFailure = /reject\s*\(\s*new Error|throw\s+new Error|process\.exitCode\s*=\s*1|process\.exit\s*\(\s*1/m.test(smokeText);
  return hasRetryBound && hasTimeoutFailure;
}

function consumesHttpResponses(smokeText: string | undefined) {
  if (!smokeText) return false;
  if (!/http\.(get|request)\s*\(/m.test(smokeText)) return true;
  return /res\.resume\s*\(|res\.on\s*\(\s*["']data["']|response\.text\s*\(|response\.json\s*\(/m.test(smokeText);
}

function hasFailureExit(smokeText: string | undefined) {
  if (!smokeText) return false;
  return /catch\s*\([^)]*\)\s*{[^}]*process\.exitCode\s*=\s*1/ms.test(smokeText) ||
    /catch\s*\([^)]*\)\s*{[^}]*process\.exit\s*\(\s*1\s*\)/ms.test(smokeText) ||
    /catch\s*\([^)]*\)\s*{[^}]*throw\b/ms.test(smokeText);
}

function hasChildCleanupWait(smokeText: string | undefined) {
  if (!smokeText) return false;
  if (!/spawn\s*\(/m.test(smokeText)) return true;
  return /\.kill\s*\(/m.test(smokeText) && /(\.once|\.on)\s*\(\s*["'](?:close|exit)["']|Promise\.race|await\s+new Promise/ms.test(smokeText);
}

function hasStartupFailureHandling(smokeText: string | undefined) {
  if (!smokeText) return false;
  if (!/spawn\s*\(/m.test(smokeText)) return true;
  const startupBounded = /setTimeout\s*\([^,]+,\s*\d{3,}/m.test(smokeText);
  const rejectsOnError = /\.on\s*\(\s*["']error["']\s*,\s*(?:reject|\([^)]*\)\s*=>\s*reject)/m.test(smokeText);
  const rejectsOnClose = /\.on\s*\(\s*["'](?:close|exit)["'][\s\S]{0,180}reject\s*\(/m.test(smokeText);
  return startupBounded && rejectsOnError && rejectsOnClose;
}

function extractObjectLiteralFields(literal: string) {
  return Array.from(literal.matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:/g))
    .map((match) => match[1])
    .filter((field): field is string => Boolean(field));
}

function extractSmokePostFields(smokeText: string | undefined) {
  if (!smokeText) return [];
  const fields = new Set<string>();
  const stringifyPattern = /JSON\.stringify\s*\(\s*{([\s\S]*?)}\s*\)/g;
  for (const match of smokeText.matchAll(stringifyPattern)) {
    for (const field of extractObjectLiteralFields(match[1] ?? "")) fields.add(field);
  }
  return Array.from(fields).sort();
}

function extractClientRenderedFields(clientFiles: Record<string, string | undefined>) {
  const fields = new Set<string>();
  for (const content of Object.values(clientFiles)) {
    if (!content) continue;
    for (const match of content.matchAll(/\bidea\.([A-Za-z_$][\w$]*)\b/g)) {
      if (match[1]) fields.add(match[1]);
    }
  }
  return Array.from(fields).sort();
}

function smokeClientContractIssue(input: {
  smokeText?: string;
  clientFiles: Record<string, string | undefined>;
}): ReadinessIssue | undefined {
  const smokeFields = extractSmokePostFields(input.smokeText);
  const clientFields = extractClientRenderedFields(input.clientFiles);
  if (smokeFields.length === 0 || clientFields.length === 0) return undefined;
  const overlap = smokeFields.filter((field) => clientFields.includes(field));
  if (overlap.length > 0) return undefined;
  return {
    id: "smoke_client_contract_mismatch",
    severity: "fail",
    detail: `Smoke POST fields ${smokeFields.join(", ")} do not overlap with client renders ${clientFields.join(", ")}. Align smoke/API fixture payloads with rendered client data before browser checks.`
  };
}

function collectClientScriptSyntaxIssues(clientFiles: Record<string, string | undefined>) {
  const issues: ReadinessIssue[] = [];
  for (const [path, content] of Object.entries(clientFiles)) {
    if (!content) continue;
    let index = 0;
    for (const match of content.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
      index += 1;
      const script = match[1] ?? "";
      try {
        // Validate generated inline scripts before browser checks so syntax errors are actionable.
        new Function(script);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          id: "client_script_syntax_error",
          severity: "fail",
          detail: `${path} script ${index}: ${message}`
        });
      }
    }
  }
  return issues;
}

function collectIssues(input: {
  packageText?: string;
  serverText?: string;
  smokeText?: string;
  clientFiles: Record<string, string | undefined>;
}) {
  const issues: ReadinessIssue[] = [];

  if (!input.packageText) {
    issues.push({ id: "package_missing", severity: "fail", detail: "package.json was not found." });
  } else {
    if (!hasPackageScript(input.packageText, "test")) {
      issues.push({ id: "test_script_missing", severity: "fail", detail: "package.json has no runnable test script." });
    }
    if (!hasPackageScript(input.packageText, "start")) {
      issues.push({ id: "start_script_missing", severity: "warn", detail: "package.json has no start script." });
    }
  }

  if (!input.serverText) {
    issues.push({ id: "server_missing", severity: "fail", detail: "Server entry file was not found." });
  }
  if (!input.smokeText) {
    issues.push({ id: "smoke_missing", severity: "fail", detail: "Smoke test file was not found." });
  }

  if (hasStaticClient(input.clientFiles) && !serverServesRootClient(input.serverText, input.clientFiles)) {
    issues.push({
      id: "missing_root_client_route",
      severity: "fail",
      detail: `Static client exists (${clientFileNames(input.clientFiles).join(", ")}) but server does not clearly serve it from /.`
    });
  }

  if (!hasBoundedReadiness(input.smokeText)) {
    issues.push({
      id: "unbounded_readiness_polling",
      severity: "fail",
      detail: "Smoke readiness polling lacks a bounded retry/deadline with rejection."
    });
  }
  if (!consumesHttpResponses(input.smokeText)) {
    issues.push({
      id: "http_response_not_consumed",
      severity: "fail",
      detail: "Smoke HTTP checks do not clearly consume/resume response bodies."
    });
  }
  if (!hasFailureExit(input.smokeText)) {
    issues.push({
      id: "failure_exit_missing",
      severity: "fail",
      detail: "Smoke catch path does not clearly set a non-zero exit or rethrow."
    });
  }
  if (!hasChildCleanupWait(input.smokeText)) {
    issues.push({
      id: "child_cleanup_not_awaited",
      severity: "warn",
      detail: "Spawned server cleanup does not clearly wait for close/exit or a bounded kill timeout."
    });
  }
  if (!hasStartupFailureHandling(input.smokeText)) {
    issues.push({
      id: "startup_failure_can_hang",
      severity: "fail",
      detail: "Server startup helper does not clearly reject on startup timeout, child error, and early close/exit."
    });
  }
  const contractIssue = smokeClientContractIssue({
    smokeText: input.smokeText,
    clientFiles: input.clientFiles
  });
  if (contractIssue) issues.push(contractIssue);
  issues.push(...collectClientScriptSyntaxIssues(input.clientFiles));

  return issues;
}

function renderAppReadinessReport(issues: ReadinessIssue[], pathFallbacks: string[] = []) {
  const failCount = issues.filter((issue) => issue.severity === "fail").length;
  const warnCount = issues.filter((issue) => issue.severity === "warn").length;
  const status = failCount > 0 ? "fail" : warnCount > 0 ? "warn" : "pass";
  const smokeStructuralIssueIds = new Set([
    "unbounded_readiness_polling",
    "http_response_not_consumed",
    "failure_exit_missing",
    "child_cleanup_not_awaited",
    "startup_failure_can_hang"
  ]);
  const smokeStructuralIssues = issues.filter((issue) => smokeStructuralIssueIds.has(issue.id)).length;
  const rewriteSmoke = smokeStructuralIssues >= 3;
  const lines = [
    `status: ${status}`,
    `failures: ${failCount}`,
    `warnings: ${warnCount}`,
    `rewrite_smoke_test_recommended: ${rewriteSmoke}`,
    "browserCheck: recommended after diagnostics pass",
    "nextTools: read, json, patch, diagnostics, browser_if_enabled",
    "browserFallback: use browser only when available/enabled; do not substitute Desk Playwright tools for CLI workspace app verification."
  ];

  if (pathFallbacks.length > 0) {
    lines.push("pathFallbacks:");
    for (const fallback of pathFallbacks) lines.push(`- ${fallback}`);
  }

  if (issues.length > 0) {
    lines.push("issues:");
    for (const issue of issues) {
      lines.push(`- ${issue.severity} ${issue.id}: ${issue.detail}`);
    }
  } else {
    lines.push("issues: none");
  }

  if (rewriteSmoke) {
    lines.push("recommendation: replace the smoke test with one complete bounded script instead of stacking partial patches.");
  }

  if (failCount > 0) {
    lines.push(
      renderVerificationFailureClassification(classifyVerificationFailure({
        toolName: "app_readiness",
        content: lines.join("\n")
      }))
    );
  }

  return lines.join("\n");
}

export const appReadinessTool: Tool<AppReadinessInput> = {
  name: "app_readiness",
  description: "Inspect a generated client-server app for runnable scripts, root client serving, robust smoke tests, and browser-check readiness.",
  inputSchema: appReadinessInput,
  openaiInputSchema: appReadinessOpenAIInput,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  async run(input, context) {
    const packagePath = pathOrDefault(input.packagePath, "package.json");
    const serverPath = pathOrDefault(input.serverPath, "server.js");
    const smokePath = pathOrDefault(input.smokePath, "test/smokeTest.js");
    const clientPaths = clientPathsOrDefault(input.clientPaths);

    const [packageRead, serverRead, smokeRead] = await Promise.all([
      readOptionalTextWithFallback(context.workspaceRoot, "packagePath", packagePath, "package.json"),
      readOptionalTextWithFallback(context.workspaceRoot, "serverPath", serverPath, "server.js"),
      readOptionalTextWithFallback(context.workspaceRoot, "smokePath", smokePath, "test/smokeTest.js")
    ]);
    const pathFallbacks = [packageRead.fallback, serverRead.fallback, smokeRead.fallback]
      .filter((fallback): fallback is string => Boolean(fallback));
    const clientFiles: Record<string, string | undefined> = {};
    for (const clientPath of clientPaths) {
      clientFiles[clientPath] = await readOptionalText(context.workspaceRoot, clientPath);
    }

    const issues = collectIssues({
      packageText: packageRead.text,
      serverText: serverRead.text,
      smokeText: smokeRead.text,
      clientFiles
    });
    return {
      ok: !issues.some((issue) => issue.severity === "fail"),
      content: renderAppReadinessReport(issues, pathFallbacks)
    };
  }
};
