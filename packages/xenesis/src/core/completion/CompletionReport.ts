export type CompletionStatus =
  | 'completed_verified'
  | 'completed_unverified'
  | 'completed_noop'
  | 'stopped_user_input_required'
  | 'stopped_permission_denied'
  | 'blocked_verification_failed'
  | 'blocked_repeated_failure'
  | 'blocked_external_dependency'
  | 'failed_runtime_error'
  | 'cancelled';

export type CompletionClaimType = 'edit' | 'test' | 'browse' | 'verification' | 'task_completion';

export type CompletionEvidenceKind = 'mutation' | 'verification' | 'browsing' | 'task' | 'review';

export type CompletionSemanticResult = 'passed' | 'failed' | 'partial' | 'unknown';

export interface CompletionReport {
  status: CompletionStatus;
  reasons: string[];
}
