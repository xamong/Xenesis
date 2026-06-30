import type { ToolResult } from '../../tools/types.js';
import type { AgentRunUsage, ToolExecutionPolicy } from '../AgentRunner.js';
import {
  type AppendEvidenceRecord,
  type CompletionClaim,
  type CompletionGateReport,
  type CompletionStatus,
  EvidenceLedger,
  evaluateCompletionGate,
} from '../completion/index.js';
import type { AgentRunEvent } from '../events.js';
import { assertProviderRequestReady, MessageLedger, providerMessagesFromLedger } from '../messages/index.js';
import type { AgentMessage, ToolCall } from '../messages.js';
import {
  evaluatePermissionEngine,
  type PermissionEngineDecision,
  type PermissionModeInput,
  type PermissionOperation,
} from '../permissions/index.js';
import type { KernelFailureReason } from './RecoveryController.js';
import { recoveryOverlayForKernelFailure } from './RecoveryController.js';
import type { AgentKernelRunState } from './RunState.js';
import { evaluateToolChoicePriority } from './ToolChoiceEvaluator.js';
import { evaluateToolExecutionPolicy } from './ToolPolicyEvaluator.js';
import { type ScheduledToolCall, scheduleToolCallBlocks, type ToolConcurrencyClassifier } from './ToolScheduler.js';

export interface AgentKernelAdapterRunOptions {
  providerMessages: AgentMessage[];
  turn: number;
}

export type AgentKernelAssistantMessage = Extract<AgentMessage, { role: 'assistant' }>;

export interface AgentKernelAdapterRunResult {
  content: string;
  assistantMessage?: AgentKernelAssistantMessage;
  completionClaims?: CompletionClaim[];
  events: AgentRunEvent[];
  usage?: AgentRunUsage;
}

export interface AgentKernelAdapter {
  run(options: AgentKernelAdapterRunOptions): Promise<AgentKernelAdapterRunResult>;
}

export interface AgentKernelToolExecutorOptions {
  toolCall: ToolCall;
  runId: string;
  turn: number;
  sequence: number;
}

export interface AgentKernelToolExecutor {
  execute(options: AgentKernelToolExecutorOptions): Promise<ToolResult>;
}

export interface AgentKernelToolEvidenceMapperOptions {
  toolCall: ToolCall;
  toolResult: ToolResult;
  runId: string;
  turn: number;
  sequence: number;
}

export type AgentKernelToolEvidenceMapper = (options: AgentKernelToolEvidenceMapperOptions) => AppendEvidenceRecord[];

export interface AgentKernelCompletionGateOptions {
  enabled: true;
  claims?: CompletionClaim[];
  mapToolResultToEvidence?: AgentKernelToolEvidenceMapper;
  pendingApprovalCount?: number;
  unresolvedRequiredTaskCount?: number;
}

export interface AgentKernelPermissionOperationOptions {
  toolCall: ToolCall;
  runId: string;
  turn: number;
  sequence: number;
}

export interface AgentKernelPermissionApprovalOptions extends AgentKernelPermissionOperationOptions {
  decision: PermissionEngineDecision;
  operation: PermissionOperation;
}

export interface AgentKernelPermissionEngineOptions {
  mode: PermissionModeInput;
  operationForToolCall(options: AgentKernelPermissionOperationOptions): PermissionOperation;
  approve?(options: AgentKernelPermissionApprovalOptions): Promise<boolean> | boolean;
}

export interface AgentKernelOptions {
  adapter: AgentKernelAdapter;
  toolExecutor?: AgentKernelToolExecutor;
  toolExecutionPolicy?: ToolExecutionPolicy;
  toolConcurrencyClassifier?: ToolConcurrencyClassifier;
  completionGate?: AgentKernelCompletionGateOptions;
  permissionEngine?: AgentKernelPermissionEngineOptions;
  maxTurns?: number;
}

export interface AgentKernelRunOptions {
  prompt: string;
  runId: string;
}

export interface AgentKernelRunResult extends AgentKernelAdapterRunResult {
  ledger: MessageLedger;
  completionReport?: CompletionGateReport;
  evidenceLedger?: EvidenceLedger;
}

export class AgentKernel {
  constructor(private readonly options: AgentKernelOptions) {}

  private appendState(
    ledger: MessageLedger,
    runId: string,
    sequence: number,
    state: AgentKernelRunState,
    summary?: string,
  ) {
    ledger.append({
      kind: 'run_state',
      id: `${runId}:state:${sequence}:${state}`,
      state,
      ...(summary ? { summary } : {}),
    });
  }

  private assistantMessageFromResult(result: AgentKernelAdapterRunResult): AgentKernelAssistantMessage {
    return result.assistantMessage ?? { role: 'assistant', content: result.content };
  }

  private toolFailureReason(error: unknown): KernelFailureReason {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'tool_unavailable' || error.code === 'invalid_tool_input')
    ) {
      return error.code;
    }
    return 'tool_execution_failed';
  }

  private toolErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private stateForCompletionStatus(status: CompletionStatus): AgentKernelRunState {
    if (status.startsWith('completed_')) return 'completed';
    if (status.startsWith('blocked_')) return 'blocked';
    if (status.startsWith('failed_')) return 'failed';
    return 'stopped';
  }

  private permissionDeniedResult(toolCall: ToolCall, decision: PermissionEngineDecision): ToolResult {
    return {
      ok: false,
      content: `Permission denied for tool "${toolCall.name}": ${decision.reason}.`,
    };
  }

  private permissionApprovalUnavailableResult(toolCall: ToolCall, decision: PermissionEngineDecision): ToolResult {
    return {
      ok: false,
      content: `Permission approval unavailable for tool "${toolCall.name}": ${decision.reason}.`,
    };
  }

  async run(options: AgentKernelRunOptions): Promise<AgentKernelRunResult> {
    const ledger = new MessageLedger();
    const evidenceLedger = this.options.completionGate ? new EvidenceLedger() : undefined;
    const events: AgentRunEvent[] = [];
    const maxTurns = this.options.maxTurns ?? 10;
    const successfulToolNames = new Set<string>();
    let stateSequence = 0;
    let lastResult: AgentKernelAdapterRunResult | undefined;

    const appendState = (state: AgentKernelRunState, summary?: string) => {
      stateSequence += 1;
      this.appendState(ledger, options.runId, stateSequence, state, summary);
    };

    const finalizeResult = (
      result: AgentKernelAdapterRunResult,
      assistantMessage: AgentKernelAssistantMessage,
    ): AgentKernelRunResult => {
      const content = result.content || assistantMessage.content;
      if (!this.options.completionGate || !evidenceLedger) {
        appendState('completed');
        return {
          ...result,
          content,
          events,
          ledger,
        };
      }

      const completionReport = evaluateCompletionGate({
        claims: result.completionClaims ?? this.options.completionGate.claims ?? [],
        evidence: evidenceLedger.snapshot(),
        pendingApprovalCount: this.options.completionGate.pendingApprovalCount,
        unresolvedRequiredTaskCount: this.options.completionGate.unresolvedRequiredTaskCount,
      });
      appendState(this.stateForCompletionStatus(completionReport.status), completionReport.status);
      return {
        ...result,
        content,
        events,
        ledger,
        completionReport,
        evidenceLedger,
      };
    };

    appendState('created');
    ledger.appendUserMessage({ id: `${options.runId}:user:1`, content: options.prompt });
    appendState('composing_prompt');

    for (let turn = 1; turn <= maxTurns; turn += 1) {
      assertProviderRequestReady(ledger.snapshot());
      const providerMessages = providerMessagesFromLedger(ledger.snapshot());
      appendState('provider_request');

      const result = await this.options.adapter.run({ providerMessages, turn });
      lastResult = result;
      events.push(...result.events);

      const assistantMessage = this.assistantMessageFromResult(result);
      ledger.appendAssistantMessage({
        id: `${options.runId}:assistant:${turn}`,
        content: assistantMessage.content,
        ...(assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0
          ? { toolCalls: assistantMessage.toolCalls }
          : {}),
      });
      appendState('assistant_received');

      const toolCalls = assistantMessage.toolCalls ?? [];
      if (toolCalls.length === 0) {
        return finalizeResult(result, assistantMessage);
      }

      appendState('tool_scheduling');
      const scheduledToolCallBlocks = scheduleToolCallBlocks(toolCalls, {
        classify: this.options.toolConcurrencyClassifier,
      });
      if (!this.options.toolExecutor) {
        const toolCall = scheduledToolCallBlocks[0]!.toolCalls[0]!.toolCall;
        ledger.appendRecoveryOverlay(
          recoveryOverlayForKernelFailure({
            id: `${options.runId}:recovery:${toolCall.id}`,
            reason: 'missing_tool_executor',
            toolCall,
          }),
        );
        appendState('recovery_decision', `missing executor for tool ${toolCall.name}`);
        appendState('blocked', `tool ${toolCall.name} cannot run without an executor`);
        return {
          ...result,
          events: [
            ...events,
            {
              type: 'error',
              message: `AgentKernel cannot execute tool "${toolCall.name}" without a toolExecutor`,
            },
          ],
          ledger,
        };
      }

      type PreparedToolResult = {
        kind: 'tool_result';
        scheduled: ScheduledToolCall;
        toolResult: ToolResult;
      };
      type FailedToolResult = {
        kind: 'failed';
        scheduled: ScheduledToolCall;
        reason: KernelFailureReason;
        errorMessage: string;
      };
      type ToolRunResult = PreparedToolResult | FailedToolResult;

      const prepareToolRun = async (scheduled: ScheduledToolCall): Promise<ToolRunResult> => {
        appendState('tool_running', `running tool ${scheduled.toolCall.name}`);
        const choiceAudit = evaluateToolChoicePriority({
          policy: this.options.toolExecutionPolicy,
          toolCall: scheduled.toolCall,
          successfulToolNames,
        });
        if (choiceAudit) {
          ledger.appendToolChoiceAudit({
            id: `${options.runId}:tool_choice:${scheduled.toolCall.id}`,
            toolCallId: choiceAudit.toolCallId,
            name: choiceAudit.name,
            status: choiceAudit.status,
            reason: choiceAudit.reason,
            priorityReasons: choiceAudit.priorityReasons,
            priorityTools: choiceAudit.priorityTools,
            unmetPriorityTools: choiceAudit.unmetPriorityTools,
          });
        }
        const policyDecision = evaluateToolExecutionPolicy({
          policy: this.options.toolExecutionPolicy,
          toolCall: scheduled.toolCall,
          successfulToolNames,
        });
        if (this.options.toolExecutionPolicy) {
          ledger.appendToolPolicyAudit({
            id: `${options.runId}:tool_policy:${scheduled.toolCall.id}`,
            toolCallId: scheduled.toolCall.id,
            name: scheduled.toolCall.name,
            policyName: policyDecision.policyName,
            status: policyDecision.status,
            reason: policyDecision.reason,
            ...(policyDecision.nextAction ? { nextAction: policyDecision.nextAction } : {}),
            requiredBefore: policyDecision.requiredBefore,
            missingBefore: policyDecision.missingBefore,
            requiredBeforeAny: policyDecision.requiredBeforeAny,
            missingBeforeAny: policyDecision.missingBeforeAny,
            priorityTools: policyDecision.priorityTools,
          });
        }
        if (policyDecision.status === 'deny') {
          return {
            kind: 'tool_result',
            scheduled,
            toolResult: {
              ok: false,
              content: [
                `Tool policy "${policyDecision.policyName}" denied tool "${scheduled.toolCall.name}":`,
                `${policyDecision.reason}.`,
              ].join(' '),
            },
          };
        }

        const permissionEngine = this.options.permissionEngine;
        if (permissionEngine) {
          const operation = permissionEngine.operationForToolCall({
            toolCall: scheduled.toolCall,
            runId: options.runId,
            turn,
            sequence: scheduled.sequence,
          });
          const permissionDecision = evaluatePermissionEngine({
            mode: permissionEngine.mode,
            operation,
          });
          let approved: boolean | undefined;

          if (permissionDecision.status === 'ask') {
            approved = permissionEngine.approve
              ? await permissionEngine.approve({
                  toolCall: scheduled.toolCall,
                  runId: options.runId,
                  turn,
                  sequence: scheduled.sequence,
                  decision: permissionDecision,
                  operation,
                })
              : false;
          } else if (permissionDecision.status === 'deny') {
            approved = false;
          }

          ledger.appendPermissionAudit({
            id: `${options.runId}:permission:${scheduled.toolCall.id}`,
            toolCallId: scheduled.toolCall.id,
            name: scheduled.toolCall.name,
            status: permissionDecision.status,
            reason: permissionDecision.reason,
            source: permissionDecision.source,
            riskLevel: permissionDecision.riskLevel,
            normalizedMode: permissionDecision.normalizedMode,
            ...(approved !== undefined ? { approved } : {}),
          });

          if (permissionDecision.status === 'deny') {
            return {
              kind: 'tool_result',
              scheduled,
              toolResult: this.permissionDeniedResult(scheduled.toolCall, permissionDecision),
            };
          }

          if (permissionDecision.status === 'ask' && !approved) {
            return {
              kind: 'tool_result',
              scheduled,
              toolResult: this.permissionApprovalUnavailableResult(scheduled.toolCall, permissionDecision),
            };
          }
        }

        try {
          const toolResult = await this.options.toolExecutor!.execute({
            toolCall: scheduled.toolCall,
            runId: options.runId,
            turn,
            sequence: scheduled.sequence,
          });
          return {
            kind: 'tool_result',
            scheduled,
            toolResult,
          };
        } catch (error) {
          const errorMessage = this.toolErrorMessage(error);
          const reason = this.toolFailureReason(error);
          return {
            kind: 'failed',
            scheduled,
            reason,
            errorMessage,
          };
        }
      };

      const commitToolResult = (prepared: PreparedToolResult) => {
        ledger.appendToolResult({
          id: `${options.runId}:tool_result:${prepared.scheduled.toolCall.id}`,
          toolCallId: prepared.scheduled.toolCall.id,
          name: prepared.scheduled.toolCall.name,
          content: prepared.toolResult.content,
          ...(prepared.toolResult.attachments && prepared.toolResult.attachments.length > 0
            ? { attachments: prepared.toolResult.attachments }
            : {}),
        });
        if (prepared.toolResult.ok) successfulToolNames.add(prepared.scheduled.toolCall.name);
        const evidenceRecords =
          this.options.completionGate?.mapToolResultToEvidence?.({
            toolCall: prepared.scheduled.toolCall,
            toolResult: prepared.toolResult,
            runId: options.runId,
            turn,
            sequence: prepared.scheduled.sequence,
          }) ?? [];
        for (const evidence of evidenceRecords) {
          evidenceLedger?.append(evidence);
        }
      };

      const failedToolResult = (failed: FailedToolResult): AgentKernelRunResult => {
        ledger.appendRecoveryOverlay(
          recoveryOverlayForKernelFailure({
            id: `${options.runId}:recovery:${failed.scheduled.toolCall.id}`,
            reason: failed.reason,
            toolCall: failed.scheduled.toolCall,
            errorMessage: failed.errorMessage,
          }),
        );
        appendState('recovery_decision', `tool ${failed.scheduled.toolCall.name} failed before commit`);
        appendState('failed', failed.errorMessage);
        return {
          ...result,
          events: [
            ...events,
            {
              type: 'error',
              message: failed.errorMessage,
            },
          ],
          ledger,
        };
      };

      for (const block of scheduledToolCallBlocks) {
        const blockResults = block.concurrent
          ? await Promise.all(block.toolCalls.map((scheduled) => prepareToolRun(scheduled)))
          : [];

        if (block.concurrent) {
          const failed = blockResults.find(
            (blockResult): blockResult is FailedToolResult => blockResult.kind === 'failed',
          );
          if (failed) return failedToolResult(failed);

          for (const prepared of blockResults) {
            commitToolResult(prepared as PreparedToolResult);
          }
          continue;
        }

        for (const scheduled of block.toolCalls) {
          const prepared = await prepareToolRun(scheduled);
          if (prepared.kind === 'failed') return failedToolResult(prepared);
          commitToolResult(prepared);
        }
      }
      appendState('tool_results_committed');
    }

    appendState('stopped', 'max turns reached');
    return {
      content: lastResult?.content ?? '',
      ...(lastResult?.assistantMessage ? { assistantMessage: lastResult.assistantMessage } : {}),
      events: [...events, { type: 'stopped', reason: 'max_turns', turns: maxTurns, usage: lastResult?.usage }],
      ...(lastResult?.usage ? { usage: lastResult.usage } : {}),
      ledger,
    };
  }
}
