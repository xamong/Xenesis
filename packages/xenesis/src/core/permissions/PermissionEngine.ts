import { normalizePermissionMode, type PermissionMode, type PermissionModeInput } from './PermissionMode.js';

export type PermissionDecisionStatus = 'allow' | 'ask' | 'deny';
export type PermissionEngineRiskLevel = 'low' | 'medium' | 'high';
export type PermissionOperationKind = 'read' | 'file_edit' | 'shell' | 'control' | 'open_world' | 'unknown';
export type PermissionClassifierStatus =
  | 'safe'
  | 'unsafe'
  | 'ambiguous'
  | 'unavailable'
  | 'unparseable'
  | 'partial'
  | 'degraded';

export interface PermissionPolicyDecision {
  status: PermissionDecisionStatus;
  source: string;
  reason: string;
  riskLevel?: PermissionEngineRiskLevel;
  nonBypassable?: boolean;
}

export interface PermissionClassifierResult {
  status: PermissionClassifierStatus;
  reason: string;
}

export interface PermissionOperation {
  toolName: string;
  operationKind: PermissionOperationKind;
  isReadOnly: boolean;
  classifier?: PermissionClassifierResult;
  policyDecisions?: PermissionPolicyDecision[];
  bypassAllowed?: boolean;
}

export interface PermissionEngineInput {
  mode: PermissionModeInput;
  operation: PermissionOperation;
}

export interface PermissionEngineDecision {
  status: PermissionDecisionStatus;
  reason: string;
  source: string;
  riskLevel: PermissionEngineRiskLevel;
  normalizedMode: PermissionMode;
}

const statusPriority: Record<PermissionDecisionStatus, number> = {
  allow: 0,
  ask: 1,
  deny: 2,
};

function decision(
  status: PermissionDecisionStatus,
  reason: string,
  source: string,
  normalizedMode: PermissionMode,
  riskLevel: PermissionEngineRiskLevel,
): PermissionEngineDecision {
  return {
    status,
    reason,
    source,
    riskLevel,
    normalizedMode,
  };
}

function highestPriorityPolicyDecision(decisions: readonly PermissionPolicyDecision[] = []) {
  return [...decisions].sort((left, right) => statusPriority[right.status] - statusPriority[left.status])[0];
}

function unsafeClassifierDecision(
  classifier: PermissionClassifierResult | undefined,
  normalizedMode: PermissionMode,
): PermissionEngineDecision | undefined {
  if (!classifier) return undefined;
  if (classifier.status === 'safe') return undefined;

  if (
    classifier.status === 'unavailable' ||
    classifier.status === 'unparseable' ||
    classifier.status === 'partial' ||
    classifier.status === 'degraded'
  ) {
    return decision('ask', classifier.reason, 'classifier', normalizedMode, 'medium');
  }

  if (classifier.status === 'unsafe') {
    return decision('ask', classifier.reason, 'classifier', normalizedMode, 'high');
  }

  return decision('ask', classifier.reason, 'classifier', normalizedMode, 'medium');
}

function missingRequiredClassifierDecision(
  operation: PermissionOperation,
  normalizedMode: PermissionMode,
): PermissionEngineDecision | undefined {
  if (operation.classifier || operation.isReadOnly || operation.operationKind !== 'shell') return undefined;
  return decision('ask', 'classifier unavailable', 'classifier', normalizedMode, 'medium');
}

function modeDefaultDecision(normalizedMode: PermissionMode, operation: PermissionOperation): PermissionEngineDecision {
  if (normalizedMode === 'plan') {
    if (operation.isReadOnly) {
      return decision('allow', 'plan mode allows read-only operations', 'mode:plan', normalizedMode, 'low');
    }
    return decision('deny', 'plan mode blocks mutations before approval', 'mode:plan', normalizedMode, 'high');
  }

  if (normalizedMode === 'acceptEdits') {
    if (operation.isReadOnly) {
      return decision(
        'allow',
        'acceptEdits mode allows read-only operations',
        'mode:acceptEdits',
        normalizedMode,
        'low',
      );
    }
    if (operation.operationKind === 'file_edit') {
      return decision('allow', 'acceptEdits mode allows file edits', 'mode:acceptEdits', normalizedMode, 'medium');
    }
    if (operation.operationKind === 'shell') {
      return decision(
        'ask',
        'acceptEdits mode requires approval for shell',
        'mode:acceptEdits',
        normalizedMode,
        'medium',
      );
    }
    return decision(
      'ask',
      'acceptEdits mode requires approval for non-file operations',
      'mode:acceptEdits',
      normalizedMode,
      'medium',
    );
  }

  if (normalizedMode === 'auto') {
    if (operation.isReadOnly || operation.classifier?.status === 'safe') {
      return decision('allow', 'auto mode allows safe operations', 'mode:auto', normalizedMode, 'low');
    }
    return decision(
      'ask',
      'auto mode requires approval for ambiguous operations',
      'mode:auto',
      normalizedMode,
      'medium',
    );
  }

  if (normalizedMode === 'bypassPermissions') {
    if (operation.isReadOnly || operation.bypassAllowed) {
      return decision(
        'allow',
        'bypassPermissions mode allowed by policy',
        'mode:bypassPermissions',
        normalizedMode,
        'medium',
      );
    }
    return decision(
      'ask',
      'bypassPermissions mode requires explicit bypass allowance',
      'mode:bypassPermissions',
      normalizedMode,
      'medium',
    );
  }

  if (operation.isReadOnly) {
    return decision('allow', 'default mode allows read-only operations', 'mode:default', normalizedMode, 'low');
  }

  return decision(
    'ask',
    'default mode requires approval for unsafe operations',
    'mode:default',
    normalizedMode,
    'medium',
  );
}

function applyDontAsk(normalizedMode: PermissionMode, candidate: PermissionEngineDecision): PermissionEngineDecision {
  if (normalizedMode !== 'dontAsk' || candidate.status !== 'ask') return candidate;
  return {
    ...candidate,
    status: 'deny',
    reason: `dontAsk mode denies approval prompts: ${candidate.reason}`,
    source: 'mode:dontAsk',
    riskLevel: candidate.riskLevel === 'low' ? 'medium' : candidate.riskLevel,
  };
}

export function evaluatePermissionEngine(input: PermissionEngineInput): PermissionEngineDecision {
  const normalizedMode = normalizePermissionMode(input.mode);
  const policyDecision = highestPriorityPolicyDecision(input.operation.policyDecisions);
  const classifierDecision = unsafeClassifierDecision(input.operation.classifier, normalizedMode);
  const missingClassifierDecision = missingRequiredClassifierDecision(input.operation, normalizedMode);

  if (policyDecision) {
    if (policyDecision.status === 'deny') {
      if (normalizedMode === 'bypassPermissions' && !policyDecision.nonBypassable && input.operation.bypassAllowed) {
        if (classifierDecision) return applyDontAsk(normalizedMode, classifierDecision);
        if (missingClassifierDecision) return applyDontAsk(normalizedMode, missingClassifierDecision);
        return decision(
          'allow',
          'bypassPermissions mode bypassed policy prompt',
          'mode:bypassPermissions',
          normalizedMode,
          policyDecision.riskLevel ?? 'medium',
        );
      }
      return decision(
        'deny',
        policyDecision.reason,
        policyDecision.source,
        normalizedMode,
        policyDecision.riskLevel ?? 'high',
      );
    }

    if (classifierDecision) return applyDontAsk(normalizedMode, classifierDecision);

    if (policyDecision.status === 'ask') {
      if (normalizedMode === 'bypassPermissions' && input.operation.bypassAllowed) {
        if (missingClassifierDecision) return applyDontAsk(normalizedMode, missingClassifierDecision);
        return decision(
          'allow',
          'bypassPermissions mode bypassed approval prompt',
          'mode:bypassPermissions',
          normalizedMode,
          policyDecision.riskLevel ?? 'medium',
        );
      }
      return applyDontAsk(
        normalizedMode,
        decision(
          'ask',
          policyDecision.reason,
          policyDecision.source,
          normalizedMode,
          policyDecision.riskLevel ?? 'medium',
        ),
      );
    }

    if (missingClassifierDecision) return applyDontAsk(normalizedMode, missingClassifierDecision);

    return decision(
      'allow',
      policyDecision.reason,
      policyDecision.source,
      normalizedMode,
      policyDecision.riskLevel ?? 'low',
    );
  }

  if (classifierDecision) return applyDontAsk(normalizedMode, classifierDecision);

  const defaultDecision = modeDefaultDecision(normalizedMode, input.operation);
  if (defaultDecision.status === 'allow' && missingClassifierDecision) {
    return applyDontAsk(normalizedMode, missingClassifierDecision);
  }

  return applyDontAsk(normalizedMode, defaultDecision);
}
