import { z } from "zod";
import { classifyVerificationFailure, renderVerificationFailureClassification } from "../core/failureClassification.js";
import type { AgentMessageAttachment } from "../core/messages.js";
import {
  PlaywrightBrowserDriver,
  type BrowserDriver,
  type BrowserSnapshot
} from "./browserDriver.js";
import type { Tool } from "./types.js";

const defaultForbiddenText = ["undefined", "NaN", "[object Object]"];
const genericExpectedText = new Set([
  "welcome",
  "dashboard",
  "login",
  "log in",
  "signup",
  "sign up",
  "register",
  "home",
  "settings",
  "profile"
]);

const appE2ECheckInput = z.object({
  url: z.string().min(1),
  expectedText: z.array(z.string().min(1)).default([]),
  forbiddenText: z.array(z.string().min(1)).default(defaultForbiddenText),
  minTextLength: z.number().int().min(0).default(20),
  minInteractiveElements: z.number().int().min(0).default(0)
});

const appE2ECheckOpenAIInput = z.object({
  url: z.string().min(1),
  expectedText: z.array(z.string().min(1)),
  forbiddenText: z.array(z.string().min(1)),
  minTextLength: z.number().int().min(0),
  minInteractiveElements: z.number().int().min(0)
});

type AppE2ECheckInput = z.infer<typeof appE2ECheckInput>;

export interface AppE2ECheckOptions {
  headless: boolean;
  allowedHosts: string[];
  createDriver?: () => BrowserDriver;
}

interface CheckFinding {
  severity: "fail" | "warn";
  id: string;
  detail: string;
}

type VisualVerificationMethod =
  | "direct_canvas_pixels"
  | "screenshot_fallback"
  | "canvas_surface"
  | "dom_signals"
  | "none";

type DirectCanvasPixelStatus = "observed" | "blank" | "unavailable" | "not_applicable";

type ScreenshotFallbackReason =
  | "not_needed"
  | "direct_canvas_pixel_read_unavailable"
  | "direct_canvas_pixels_blank"
  | "no_visible_canvas"
  | "not_captured";

interface AppE2EVisualVerification {
  method: VisualVerificationMethod;
  directCanvasPixelStatus: DirectCanvasPixelStatus;
  screenshotFallbackReason: ScreenshotFallbackReason;
  screenshotVisualContent: "observed" | "blank" | "unknown" | "not_captured";
}

interface AppE2ECheckData {
  status: "pass" | "fail";
  url: string;
  title: string;
  httpStatus?: number;
  textLength: number;
  interactiveElements: number;
  canvasElements: number;
  visibleCanvases: number;
  canvasPixelsObserved: boolean;
  screenshotVisualObserved: boolean;
  canvasAppDetected: boolean;
  visualVerification: AppE2EVisualVerification;
  nextRecommendedTools: string[];
  nextRecommendedAction: string;
  findings: CheckFinding[];
  snapshot: BrowserSnapshot;
}

function isAllowedHost(host: string, allowedHosts: string[]) {
  return allowedHosts.some((candidate) => host === candidate || host.endsWith(`.${candidate}`));
}

function assertAllowedUrl(url: string, allowedHosts: string[]) {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Only HTTP(S) URLs are allowed: ${url}`);
  }
  if (allowedHosts.length > 0 && !isAllowedHost(parsed.hostname, allowedHosts)) {
    throw new Error(`Host not in browser.allowedHosts: ${parsed.hostname}`);
  }
}

function countOccurrences(haystack: string, needle: string) {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function isGenericExpectedText(text: string) {
  return genericExpectedText.has(text.trim().toLowerCase());
}

function expectedTextMatch(snapshot: BrowserSnapshot, text: string): "exact" | "fuzzy" | "missing" {
  const corpus = `${snapshot.title}\n${snapshot.text}`;
  if (corpus.includes(text)) return "exact";
  const normalizedCorpus = corpus.toLowerCase();
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  if (tokens.length >= 2 && tokens.every((token) => normalizedCorpus.includes(token))) {
    return "fuzzy";
  }
  return "missing";
}

function visibleCanvasElements(snapshot: BrowserSnapshot) {
  return (snapshot.canvases ?? []).filter((canvas) => (
    canvas.visible &&
    (
      (canvas.width > 0 && canvas.height > 0) ||
      (canvas.clientWidth > 0 && canvas.clientHeight > 0)
    )
  ));
}

function hasCanvasPixels(snapshot: BrowserSnapshot) {
  return (snapshot.canvases ?? []).some((canvas) => canvas.pixelContent === "observed");
}

function hasScreenshotVisualContent(snapshot: BrowserSnapshot) {
  return snapshot.screenshotVisual?.content === "observed";
}

function directCanvasPixelStatus(snapshot: BrowserSnapshot): DirectCanvasPixelStatus {
  const visibleCanvases = visibleCanvasElements(snapshot);
  if (visibleCanvases.length === 0) return "not_applicable";
  if (visibleCanvases.some((canvas) => canvas.pixelContent === "observed")) return "observed";
  if (visibleCanvases.some((canvas) => canvas.pixelContent === "unknown")) return "unavailable";
  return "blank";
}

function createVisualVerification(snapshot: BrowserSnapshot): AppE2EVisualVerification {
  const visibleCanvases = visibleCanvasElements(snapshot);
  const directStatus = directCanvasPixelStatus(snapshot);
  const screenshotVisualContent = snapshot.screenshotVisual?.content ?? "not_captured";
  const screenshotFallbackReason: ScreenshotFallbackReason = directStatus === "observed"
    ? "not_needed"
    : visibleCanvases.length === 0
      ? "no_visible_canvas"
      : screenshotVisualContent === "not_captured"
        ? "not_captured"
        : directStatus === "blank"
          ? "direct_canvas_pixels_blank"
          : "direct_canvas_pixel_read_unavailable";

  const method: VisualVerificationMethod = directStatus === "observed"
    ? "direct_canvas_pixels"
    : screenshotVisualContent === "observed"
      ? "screenshot_fallback"
      : visibleCanvases.length > 0
        ? "canvas_surface"
        : snapshot.text.trim().length > 0 || snapshot.elements.length > 0
          ? "dom_signals"
          : "none";

  return {
    method,
    directCanvasPixelStatus: directStatus,
    screenshotFallbackReason,
    screenshotVisualContent
  };
}

function isCanvasAppSnapshot(snapshot: BrowserSnapshot) {
  const visibleCanvases = visibleCanvasElements(snapshot);
  if (visibleCanvases.length === 0) return false;
  return (
    snapshot.title.trim().length > 0 ||
    snapshot.elements.length > 0 ||
    hasCanvasPixels(snapshot) ||
    hasScreenshotVisualContent(snapshot)
  );
}

function looksLikeHttpErrorPage(snapshot: BrowserSnapshot) {
  const corpus = `${snapshot.title}\n${snapshot.text}`;
  return /HTTP\s*(?:오류|Error)\s*[45]\d\d|IIS\s+\d+(?:\.\d+)?[^.\n]*[45]\d\d|[45]\d\d(?:\.\d+)?\s*-\s*(?:Not Found|Forbidden|Internal Server Error|Bad Gateway|Service Unavailable)/i.test(corpus);
}

function looksLikeDefaultServerPage(snapshot: BrowserSnapshot) {
  const corpus = `${snapshot.title}\n${snapshot.text}`;
  return /IIS\s+Windows\s+Server|Apache2?\s+(?:Ubuntu\s+)?Default\s+Page|Welcome\s+to\s+nginx|nginx\s+welcome|It\s+works!/i.test(corpus);
}

function collectFindings(input: AppE2ECheckInput, snapshot: BrowserSnapshot) {
  const findings: CheckFinding[] = [];
  const normalizedText = snapshot.text.trim();
  const title = snapshot.title.trim();
  const canvasAppDetected = isCanvasAppSnapshot(snapshot);

  if (title.length === 0) {
    findings.push({
      severity: "warn",
      id: "title_missing",
      detail: "Browser title is empty."
    });
  }

  if (snapshot.httpStatus !== undefined && snapshot.httpStatus >= 400) {
    findings.push({
      severity: "fail",
      id: "http_status_error",
      detail: `HTTP status ${snapshot.httpStatus} while loading the app URL.`
    });
  } else if (looksLikeHttpErrorPage(snapshot)) {
    findings.push({
      severity: "fail",
      id: "http_error_page",
      detail: "Rendered page appears to be an HTTP server error page, not the app."
    });
  } else if (looksLikeDefaultServerPage(snapshot)) {
    findings.push({
      severity: "fail",
      id: "server_default_page",
      detail: "The URL loaded a generic server landing page instead of the workspace app."
    });
  }

  if (normalizedText.length < input.minTextLength) {
    findings.push({
      severity: canvasAppDetected ? "warn" : "fail",
      id: canvasAppDetected ? "canvas_text_unavailable" : "text_below_min",
      detail: canvasAppDetected
        ? `Rendered DOM text length ${normalizedText.length} is below minTextLength ${input.minTextLength}, but a visible canvas app surface was detected.`
        : `Rendered text length ${normalizedText.length} is below minTextLength ${input.minTextLength}.`
    });
  }

  if (snapshot.elements.length < input.minInteractiveElements) {
    findings.push({
      severity: canvasAppDetected ? "warn" : "fail",
      id: canvasAppDetected ? "canvas_interactive_threshold_unreliable" : "interactive_elements_below_min",
      detail: canvasAppDetected
        ? `DOM interactive elements ${snapshot.elements.length} is below minInteractiveElements ${input.minInteractiveElements}, but a visible canvas app surface may own interactions.`
        : `Interactive elements ${snapshot.elements.length} is below minInteractiveElements ${input.minInteractiveElements}.`
    });
  }

  for (const text of input.expectedText) {
    const match = expectedTextMatch(snapshot, text);
    if (match === "fuzzy") {
      findings.push({
        severity: "warn",
        id: "expected_text_fuzzy_match",
        detail: `"${text}"`
      });
    }
    if (match === "missing") {
      const generic = isGenericExpectedText(text);
      const canvasMissing = canvasAppDetected && !generic;
      findings.push({
        severity: generic || canvasMissing ? "warn" : "fail",
        id: generic
          ? "generic_expected_text_missing"
          : canvasMissing
            ? "expected_text_not_in_dom_for_canvas"
            : "missing_expected_text",
        detail: canvasMissing
          ? `"${text}" is not present in DOM text/title; canvas-rendered text may require screenshot or canvas inspection.`
          : `"${text}"`
      });
    }
  }

  for (const text of input.forbiddenText) {
    const occurrences = countOccurrences(snapshot.text, text) + countOccurrences(snapshot.title, text);
    if (occurrences > 0) {
      findings.push({
        severity: "fail",
        id: "forbidden_text",
        detail: `"${text}" found ${occurrences} time(s).`
      });
    }
  }

  for (const pageError of snapshot.pageErrors ?? []) {
    findings.push({
      severity: "fail",
      id: "page_error",
      detail: pageError
    });
  }

  return findings;
}

function nextRecommendedTools(data: Pick<AppE2ECheckData, "status" | "visualVerification">) {
  if (data.status === "fail") return ["read", "diagnostics", "app_readiness", "app_e2e_check"];
  if (data.visualVerification.method === "screenshot_fallback" || data.visualVerification.method === "canvas_surface") {
    return ["browser", "app_e2e_check"];
  }
  if (data.visualVerification.method === "none") return ["read", "diagnostics", "app_readiness", "app_e2e_check"];
  return ["app_e2e_check"];
}

function nextRecommendedAction(
  data: Pick<AppE2ECheckData, "status" | "visualVerification">,
  screenshotAttached = false
) {
  if (data.status === "fail") return "repair_detected_failure_then_rerun_verification";
  if (data.visualVerification.method === "screenshot_fallback") {
    return screenshotAttached
      ? "review_attached_verification_screenshot_for_canvas_text_or_visual_content"
      : "use_browser_screenshot_for_canvas_text_or_visual_review_if_exact_canvas_content_matters";
  }
  if (data.visualVerification.method === "canvas_surface") {
    return screenshotAttached
      ? "review_attached_verification_screenshot_or_add_domain_specific_visual_assertions"
      : "capture_browser_screenshot_or_add_domain_specific_visual_assertions";
  }
  if (data.visualVerification.method === "none") return "inspect_app_launch_and_rendering_before_accepting_result";
  return "continue_or_add_domain_specific_assertions";
}

/**
 * The visual verification is ambiguous (worth surfacing the screenshot PNG to the
 * model) when we could NOT confirm content via direct canvas pixels, or when the
 * direct canvas pixel read came back blank. In those cases a model-visible PNG lets
 * the model judge the rendering itself instead of relying on scalar signals.
 */
function isAmbiguousVisualVerification(visualVerification: AppE2EVisualVerification) {
  return (
    visualVerification.method !== "direct_canvas_pixels" ||
    visualVerification.directCanvasPixelStatus === "blank"
  );
}

/**
 * Build a verification PNG image attachment from the retained screenshot base64
 * (no data-URL prefix) on the snapshot's screenshot visual signal. Returns an
 * empty array when no PNG was retained so callers can spread it unconditionally.
 */
function verificationAttachments(snapshot: BrowserSnapshot): AgentMessageAttachment[] {
  const base64 = snapshot.screenshotVisual?.screenshotBase64;
  if (!base64) return [];
  return [
    {
      kind: "image",
      name: "verification",
      mimeType: "image/png",
      dataUrl: `data:image/png;base64,${base64}`
    }
  ];
}

function renderAppE2ECheck(input: AppE2ECheckInput, data: AppE2ECheckData, screenshotAttached: boolean) {
  const failed = data.findings.filter((finding) => finding.severity === "fail");
  const warnings = data.findings.filter((finding) => finding.severity === "warn");
  const forbiddenFindings = data.findings.filter((finding) => finding.id === "forbidden_text");
  const expectedMissing = data.findings.filter((finding) => finding.id === "missing_expected_text");
  const genericExpectedMissing = data.findings.filter((finding) => finding.id === "generic_expected_text_missing");
  const canvasExpectedMissing = data.findings.filter((finding) => finding.id === "expected_text_not_in_dom_for_canvas");
  const lines = [
    `status: ${data.status}`,
    `completionBlocked: ${failed.length > 0}`,
    `url: ${data.url}`,
    `title: ${data.title || "(empty)"}`,
    `httpStatus: ${data.httpStatus ?? "unknown"}`,
    `textLength: ${data.textLength}`,
    `interactiveElements: ${data.interactiveElements}`,
    `canvasElements: ${data.canvasElements}`,
    `visibleCanvases: ${data.visibleCanvases}`,
    `canvasPixelsObserved: ${data.canvasPixelsObserved}`,
    `screenshotVisualObserved: ${data.screenshotVisualObserved}`,
    `screenshotVisualContent: ${data.snapshot.screenshotVisual?.content ?? "not_captured"}`,
    `verificationScreenshotAttached: ${screenshotAttached}`,
    `canvasAppDetected: ${data.canvasAppDetected}`,
    `visualVerificationMethod: ${data.visualVerification.method}`,
    `directCanvasPixelStatus: ${data.visualVerification.directCanvasPixelStatus}`,
    `screenshotFallbackReason: ${data.visualVerification.screenshotFallbackReason}`,
    `nextRecommendedTools: ${data.nextRecommendedTools.join(", ")}`,
    `nextRecommendedAction: ${data.nextRecommendedAction}`,
    `pageErrors: ${data.snapshot.pageErrors?.length ?? 0}`,
    `failures: ${failed.length}`,
    `warnings: ${warnings.length}`,
    forbiddenFindings.length > 0
      ? `forbiddenFindings: ${forbiddenFindings.map((finding) => finding.detail).join("; ")}`
      : "forbiddenFindings: none",
    expectedMissing.length > 0
      ? `expectedTextMissing: ${expectedMissing.map((finding) => finding.detail).join(", ")}`
      : genericExpectedMissing.length > 0
        ? `genericExpectedTextMissing: ${genericExpectedMissing.map((finding) => finding.detail).join(", ")}`
        : canvasExpectedMissing.length > 0
          ? `canvasExpectedTextNotInDom: ${canvasExpectedMissing.map((finding) => finding.detail).join(", ")}`
      : input.expectedText.length > 0 ? "expectedText: all present" : "expectedText: none configured"
  ];

  if (data.findings.length > 0) {
    lines.push("findings:");
    for (const finding of data.findings) {
      lines.push(`- ${finding.severity} ${finding.id}: ${finding.detail}`);
    }
  } else {
    lines.push("findings: none");
  }

  if (failed.length > 0) {
    lines.push(
      "repairHint: this is a failed verification, not a final state. Inspect the rendered data binding, page-load fetch path, smoke/API fixture payloads, and client/server contract; patch the concrete defect, then rerun diagnostics, app_readiness, and app_e2e_check before final reporting."
    );
    lines.push(
      renderVerificationFailureClassification(classifyVerificationFailure({
        toolName: "app_e2e_check",
        content: lines.join("\n")
      }))
    );
  }

  const preview = data.snapshot.text.trim().slice(0, 1000);
  if (preview) {
    lines.push("snapshotPreview:", preview);
  }

  return lines.join("\n");
}

export function createAppE2ECheckTool(options: AppE2ECheckOptions): Tool<AppE2ECheckInput, AppE2ECheckData> {
  return {
    name: "app_e2e_check",
    description: "Open a rendered app page and check UI quality signals such as expected text, broken undefined values, body text, and interactive controls.",
    inputSchema: appE2ECheckInput,
    openaiInputSchema: appE2ECheckOpenAIInput,
    isReadOnly: () => true,
    async run(input) {
      let driver: BrowserDriver | undefined;
      try {
        assertAllowedUrl(input.url, options.allowedHosts);
        driver = options.createDriver?.() ?? new PlaywrightBrowserDriver({ headless: options.headless });
        const snapshot = await driver.goto(input.url);
        assertAllowedUrl(snapshot.url, options.allowedHosts);
        const findings = collectFindings(input, snapshot);
        const visibleCanvases = visibleCanvasElements(snapshot);
        const visualVerification = createVisualVerification(snapshot);
        const data: AppE2ECheckData = {
          status: findings.some((finding) => finding.severity === "fail") ? "fail" : "pass",
          url: snapshot.url,
          title: snapshot.title,
          httpStatus: snapshot.httpStatus,
          textLength: snapshot.text.trim().length,
          interactiveElements: snapshot.elements.length,
          canvasElements: snapshot.canvases?.length ?? 0,
          visibleCanvases: visibleCanvases.length,
          canvasPixelsObserved: hasCanvasPixels(snapshot),
          screenshotVisualObserved: hasScreenshotVisualContent(snapshot),
          canvasAppDetected: isCanvasAppSnapshot(snapshot),
          visualVerification,
          nextRecommendedTools: [],
          nextRecommendedAction: "",
          findings,
          snapshot
        };
        // On ambiguous visual verifications (no confirmed direct canvas pixels, or
        // a blank direct read), surface the retained verification PNG as a
        // model-visible image attachment (vision-gated downstream). renderAppE2ECheck
        // stays scalar text.
        const attachments = isAmbiguousVisualVerification(visualVerification)
          ? verificationAttachments(snapshot)
          : [];
        const screenshotAttached = attachments.length > 0;
        data.nextRecommendedTools = nextRecommendedTools(data);
        data.nextRecommendedAction = nextRecommendedAction(data, screenshotAttached);
        return {
          ok: data.status === "pass",
          content: renderAppE2ECheck(input, data, screenshotAttached),
          data,
          ...(screenshotAttached ? { attachments } : {})
        };
      } catch (error) {
        const content = `app_e2e_check failed: ${error instanceof Error ? error.message : String(error)}`;
        return {
          ok: false,
          content: [
            content,
            renderVerificationFailureClassification(classifyVerificationFailure({
              toolName: "app_e2e_check",
              content
            }))
          ].join("\n")
        };
      } finally {
        await driver?.close().catch(() => undefined);
      }
    }
  };
}
