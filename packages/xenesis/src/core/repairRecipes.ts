import type { VerificationFailureCauseId } from './failureClassification.js';

export type FailureRepairMode = 'tool_guided' | 'patch_guided' | 'inspect_guided';

export interface FailureRepairRecipe {
  id: string;
  mode: FailureRepairMode;
  title: string;
  steps: string[];
  successCriteria: string[];
  stopCriteria: string[];
}

const recipes: Record<VerificationFailureCauseId, FailureRepairRecipe> = {
  local_file_requires_server: {
    id: 'serve_local_file_over_http',
    mode: 'tool_guided',
    title: 'Serve a local static file over HTTP and rerun browser verification',
    steps: [
      'Call app_launch_plan to choose a concrete managed static-file command and readiness URL.',
      'Call server start with the launch plan command and readinessUrl.',
      'Rerun app_e2e_check with the original assertions against the launch plan readiness URL.',
      'Call server stop if this run started the server.',
    ],
    successCriteria: [
      'The local file loads through http://127.0.0.1.',
      'app_e2e_check returns status: pass or only non-blocking warnings.',
    ],
    stopCriteria: [
      'The local file is outside the workspace.',
      'The static server cannot start after one managed server attempt.',
      'The same local-file URL failure repeats after conversion to HTTP.',
    ],
  },
  server_not_running: {
    id: 'start_server_then_e2e',
    mode: 'tool_guided',
    title: 'Start the app server and rerun browser verification',
    steps: [
      'Call app_launch_plan to choose a concrete workspace launch command and readiness URL.',
      'Call server start with the launch plan command and readinessUrl.',
      'Rerun app_e2e_check with the same assertions against the launch plan readiness URL.',
      'Call server stop if this run started the server.',
    ],
    successCriteria: [
      'The app URL loads without connection refusal.',
      'app_e2e_check returns status: pass or only non-blocking warnings.',
    ],
    stopCriteria: [
      'The server cannot start after one corrected attempt.',
      'The same connection-refused signature repeats after the server start attempt.',
    ],
  },
  client_runtime_error: {
    id: 'fix_client_runtime_error',
    mode: 'patch_guided',
    title: 'Fix the reported client runtime error',
    steps: [
      'Read the implicated client entry, route, or component file.',
      'Patch the syntax/runtime defect directly connected to the page error.',
      'Run app_readiness to catch static and smoke-level regressions.',
      'Rerun app_e2e_check against the same URL.',
    ],
    successCriteria: ['pageErrors is 0.', 'The previous client error text no longer appears in verification output.'],
    stopCriteria: [
      'The same page error repeats after two targeted patches.',
      'The implicated source file cannot be identified from the evidence.',
    ],
  },
  client_server_contract_mismatch: {
    id: 'align_client_server_contract',
    mode: 'patch_guided',
    title: 'Align client-rendered fields with server or smoke payloads',
    steps: [
      'Read the client render path and the smoke/API fixture payload.',
      'Identify field names the client actually renders.',
      'Patch the smoke fixture, API response, or client mapping so they agree.',
      'Rerun app_readiness, diagnostics, and app_e2e_check.',
    ],
    successCriteria: [
      'app_readiness no longer reports smoke_client_contract_mismatch.',
      'diagnostics and app_e2e_check both pass or report only non-blocking warnings.',
    ],
    stopCriteria: [
      'Client and server schemas are ambiguous after focused inspection.',
      'The same contract mismatch repeats after one direct schema alignment patch.',
    ],
  },
  root_client_route_missing: {
    id: 'serve_static_client_root',
    mode: 'patch_guided',
    title: 'Serve the static client from the root route',
    steps: [
      'Read the server entry and the detected static client file.',
      'Use the existing framework pattern to serve the client at / or add static middleware rooted at the client output directory.',
      'Preserve existing API routes while adding the root client route.',
      'Rerun app_readiness, diagnostics, and app_e2e_check.',
    ],
    successCriteria: [
      'app_readiness no longer reports missing_root_client_route.',
      'The app root URL returns the client HTML instead of 404, JSON, or an empty response.',
      'diagnostics and app_e2e_check pass or report only non-blocking warnings.',
    ],
    stopCriteria: [
      'No client file or client output directory exists after focused inspection.',
      'The server framework cannot be identified from the workspace code.',
      'The same root route failure repeats after one direct routing/static middleware patch.',
    ],
  },
  rendered_broken_value: {
    id: 'fix_rendered_broken_value',
    mode: 'patch_guided',
    title: 'Fix broken rendered values from data binding or serialization',
    steps: [
      'Read the component or render path that emits the forbidden value.',
      'Search for the displayed field name or nearby label to find the data mapping.',
      'Patch the client/server contract, fixture, or serializer so rendered values are concrete user-facing strings or numbers.',
      'Rerun app_readiness and app_e2e_check.',
    ],
    successCriteria: [
      'The rendered page no longer contains undefined, NaN, or [object Object].',
      'Expected user-facing data still appears after the fix.',
      'app_e2e_check returns status: pass.',
    ],
    stopCriteria: [
      'The source data contract cannot be inferred from code or fixtures.',
      'The same broken rendered value repeats after one direct data mapping patch.',
      'A product decision is required to choose fallback copy for missing data.',
    ],
  },
  verification_timeout: {
    id: 'bound_verification_timeout',
    mode: 'patch_guided',
    title: 'Bound the verification wait and cleanup path',
    steps: [
      'Read the timed-out verification or smoke script.',
      'Add bounded readiness waits and explicit failure exits.',
      'Consume HTTP responses and await child process cleanup.',
      'Rerun diagnostics with the same command.',
    ],
    successCriteria: [
      'diagnostics reports timedOut: false.',
      'The command exits with a deterministic pass/fail status.',
    ],
    stopCriteria: [
      'The timeout repeats after cleanup and bounded wait changes.',
      'The server process cannot be made observable by the current test harness.',
    ],
  },
  rendered_content_mismatch: {
    id: 'resolve_rendered_content_mismatch',
    mode: 'patch_guided',
    title: 'Fix rendered content quality gates',
    steps: [
      'Read the page or component that produced the snapshotPreview.',
      'Patch concrete visible copy so rendered text length and expected text requirements are satisfied.',
      'Add a real title and at least one appropriate interactive element when the verifier reports they are missing.',
      'Rerun app_readiness and app_e2e_check.',
    ],
    successCriteria: [
      'The rendered page has enough meaningful user-facing text.',
      'Required interactive elements are present.',
      'app_e2e_check returns status: pass.',
    ],
    stopCriteria: [
      'The desired product copy cannot be inferred from code or user prompt.',
      'The same rendered quality gate repeats after one direct page/component patch.',
    ],
  },
  smoke_test_structure: {
    id: 'rewrite_smoke_test_structure',
    mode: 'patch_guided',
    title: 'Rewrite fragile smoke verification into a bounded test',
    steps: [
      'Read the smoke test from start to cleanup.',
      'Add bounded startup/readiness handling.',
      'Ensure request/response bodies are consumed and failures exit non-zero.',
      'Ensure child process cleanup is awaited before process exit.',
    ],
    successCriteria: [
      'app_readiness no longer flags smoke test structure failures.',
      'diagnostics completes without timeout.',
    ],
    stopCriteria: [
      'The smoke script depends on external services that are unavailable.',
      'The same structural issue remains after a direct rewrite.',
    ],
  },
  process_cleanup: {
    id: 'fix_process_cleanup',
    mode: 'patch_guided',
    title: 'Close spawned processes and open handles deterministically',
    steps: [
      'Read the process spawning and cleanup path.',
      'Kill child processes on success, failure, timeout, and signal paths.',
      'Await close or exit with a bounded fallback.',
      'Rerun diagnostics.',
    ],
    successCriteria: ['No open-handle or child cleanup warning remains.', 'diagnostics exits deterministically.'],
    stopCriteria: [
      'The same process remains open after bounded cleanup.',
      'The owning process cannot be identified from the workspace code.',
    ],
  },
  verification_failure: {
    id: 'inspect_failed_verification',
    mode: 'inspect_guided',
    title: 'Inspect the failed verification and choose a concrete repair',
    steps: [
      'Read the failed verification output carefully.',
      'Inspect the smallest implicated source, config, or test file.',
      'Patch only the concrete defect supported by evidence.',
      'Rerun the same verification before reporting completion.',
    ],
    successCriteria: ['The failed verification passes.', 'No new blocking verification failure appears.'],
    stopCriteria: [
      'No concrete source of failure can be identified from the output.',
      'The same failure signature repeats after two repair attempts.',
    ],
  },
};

export function getFailureRepairRecipe(causeId: VerificationFailureCauseId) {
  return recipes[causeId];
}
