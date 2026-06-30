export type ProviderAcceptanceStatus = 'passed' | 'failed' | 'skipped';

export interface AcceptanceCheck {
  id: string;
  required: boolean;
  passed: boolean;
  evidence?: string;
}

export interface ProviderAcceptanceExpected {
  provider?: string;
  processModel?: 'persistent-process' | 'process-per-turn' | 'embedded';
  toolCalls?: string[];
  capabilityPaths?: string[];
  readbacks?: string[];
  requiresApprovalRecord?: boolean;
  forbidsInternalLeak?: boolean;
  forbidsMockFallback?: boolean;
}

export interface ProviderAcceptanceObserved {
  provider: string;
  profileSource: string;
  localCli?: string;
  processModel?: string;
  toolCalls: string[];
  capabilityPaths: string[];
  readbacks: string[];
  approvalRecords: string[];
  text: string;
}

export interface ProviderAcceptanceInput {
  scenarioId: string;
  prompt: string;
  expected: ProviderAcceptanceExpected;
  observed: ProviderAcceptanceObserved;
}

export interface ProviderAcceptanceChecks {
  transcriptChecks: AcceptanceCheck[];
  toolChecks: AcceptanceCheck[];
  crChecks: AcceptanceCheck[];
  readbackChecks: AcceptanceCheck[];
  approvalChecks: AcceptanceCheck[];
  internalLeakChecks: AcceptanceCheck[];
}

export interface ProviderAcceptanceRecord extends ProviderAcceptanceChecks {
  scenarioId: string;
  prompt: string;
  status: ProviderAcceptanceStatus;
  provider: {
    expected?: string;
    resolved: string;
    profileSource: string;
    localCli?: string;
    processModel?: string;
  };
  errors: string[];
}

function requiredCheck(id: string, passed: boolean, evidence?: string): AcceptanceCheck {
  return {
    id,
    required: true,
    passed,
    ...(evidence ? { evidence } : {}),
  };
}

function has(values: readonly string[], expected: string) {
  return values.includes(expected);
}

function leaksInternalApprovalText(text: string) {
  return (
    /\b(?:approval[_-]?required|approvalRequired|action[_-]?inbox[_-]?item|actionInboxItem|approval[_-]?session[_-]?key|approvalSessionKey|approval[_-]?id|approvalId|actionInboxItem\.id|session[_-]?id|sessionId|pane[_-]?id|paneId|raw[_-]?\s*args?|rawArgs|(?:[A-Z0-9_]*API[_-]?KEY)|XENIS[_-]?MCP[_-]?BRIDGE[_-]?TOKEN|api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|authorization\s*:\s*bearer|bearer\s+[A-Za-z0-9._~+/=-]{6,})\b/i.test(
      text,
    ) || /\bargs\s*[:=]/i.test(text)
  );
}

export function evaluateAcceptanceChecks(input: ProviderAcceptanceInput): ProviderAcceptanceChecks {
  const { expected, observed } = input;
  const transcriptChecks: AcceptanceCheck[] = [];

  if (expected.provider) {
    transcriptChecks.push(requiredCheck('provider', observed.provider === expected.provider, observed.provider));
  }
  if (expected.processModel) {
    transcriptChecks.push(
      requiredCheck('process-model', observed.processModel === expected.processModel, observed.processModel),
    );
  }
  if (expected.forbidsMockFallback) {
    transcriptChecks.push(requiredCheck('forbid-mock-fallback', observed.provider !== 'mock', observed.provider));
  }

  const toolChecks = (expected.toolCalls ?? []).map((tool) =>
    requiredCheck(`tool:${tool}`, has(observed.toolCalls, tool), has(observed.toolCalls, tool) ? tool : undefined),
  );
  const crChecks = (expected.capabilityPaths ?? []).map((path) =>
    requiredCheck(
      `capability:${path}`,
      has(observed.capabilityPaths, path),
      has(observed.capabilityPaths, path) ? path : undefined,
    ),
  );
  const readbackChecks = (expected.readbacks ?? []).map((path) =>
    requiredCheck(`readback:${path}`, has(observed.readbacks, path), has(observed.readbacks, path) ? path : undefined),
  );
  const approvalChecks = expected.requiresApprovalRecord
    ? [requiredCheck('approval-record', observed.approvalRecords.length > 0, observed.approvalRecords[0])]
    : [];
  const internalLeakChecks = expected.forbidsInternalLeak
    ? [requiredCheck('forbid-internal-approval-text', !leaksInternalApprovalText(observed.text))]
    : [];

  return {
    transcriptChecks,
    toolChecks,
    crChecks,
    readbackChecks,
    approvalChecks,
    internalLeakChecks,
  };
}

function errorForFailedCheck(check: AcceptanceCheck, observed: ProviderAcceptanceObserved) {
  if (check.id === 'provider') {
    return `provider mismatch: ${observed.provider} !== ${check.evidence ? check.evidence : 'expected'}`;
  }
  if (check.id === 'process-model') return 'failed acceptance check: process-model';
  if (check.id.startsWith('capability:')) {
    return `missing capability path: ${check.id.slice('capability:'.length)}`;
  }
  if (check.id.startsWith('readback:')) {
    return `missing readback: ${check.id.slice('readback:'.length)}`;
  }
  if (check.id.startsWith('tool:')) {
    return `missing tool call: ${check.id.slice('tool:'.length)}`;
  }
  return `failed acceptance check: ${check.id}`;
}

export function buildProviderAcceptanceRecord(input: ProviderAcceptanceInput): ProviderAcceptanceRecord {
  const checks = evaluateAcceptanceChecks(input);
  const allChecks = Object.values(checks).flat();
  const errors = allChecks
    .filter((check) => check.required && !check.passed)
    .map((check) => {
      if (check.id === 'provider' && input.expected.provider) {
        return `provider mismatch: ${input.observed.provider} !== ${input.expected.provider}`;
      }
      return errorForFailedCheck(check, input.observed);
    });

  return {
    scenarioId: input.scenarioId,
    prompt: input.prompt,
    status: errors.length === 0 ? 'passed' : 'failed',
    provider: {
      expected: input.expected.provider,
      resolved: input.observed.provider,
      profileSource: input.observed.profileSource,
      ...(input.observed.localCli ? { localCli: input.observed.localCli } : {}),
      ...(input.observed.processModel ? { processModel: input.observed.processModel } : {}),
    },
    ...checks,
    errors,
  };
}
