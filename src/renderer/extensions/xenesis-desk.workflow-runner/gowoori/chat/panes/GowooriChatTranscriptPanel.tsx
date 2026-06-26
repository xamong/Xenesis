import React from 'react';
import {
  type GowooriArtifactActionState,
  resolveGowooriArtifactActionState,
} from '../../agent/gowooriArtifactPipeline';

export interface GowooriChatTranscriptMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  prompt?: string;
  source?: string;
  sourceState?: GowooriArtifactActionState;
  detail?: string;
  status?: string;
  toolApprovals?: GowooriChatToolApproval[];
  targetMode?: string;
}

export interface GowooriChatToolApproval {
  id: string;
  name: string;
  reason: string;
  inputSummary: string;
}

interface GowooriChatTranscriptPanelProps {
  messages: GowooriChatTranscriptMessage[];
  isGenerating: boolean;
  autoApply: boolean;
  showSimpleRepairGuidance?: boolean;
  providerLabel: string;
  onApplySourceToGowoori: (source: string, reason: string, targetOverride?: string) => void | Promise<void>;
  onRepairMessageArtifact: (message: GowooriChatTranscriptMessage) => void | Promise<void>;
  onRetryMessagePrompt: (message: GowooriChatTranscriptMessage) => void;
  onApproveToolMessage: (message: GowooriChatTranscriptMessage) => void;
}

export function GowooriChatTranscriptPanel({
  messages,
  isGenerating,
  autoApply,
  showSimpleRepairGuidance = false,
  providerLabel,
  onApplySourceToGowoori,
  onRepairMessageArtifact,
  onRetryMessagePrompt,
  onApproveToolMessage,
}: GowooriChatTranscriptPanelProps): React.ReactElement {
  return (
    <>
      {messages.map((message) => {
        const sourceState = message.source
          ? (message.sourceState ??
            resolveGowooriArtifactActionState({
              hasSource: true,
              preflightOk: true,
              applied: false,
              autoRepairAttempted: false,
              autoRepairSucceeded: false,
              hasPrompt: Boolean((message.prompt || message.text || '').trim()),
            }))
          : null;

        return (
          <article key={message.id} className={`wfr-gowoori-chat__message is-${message.role}`}>
            <div className="wfr-gowoori-chat__message-head">
              <strong>
                {message.role === 'assistant' ? 'Gowoori assistant' : message.role === 'user' ? 'You' : 'System'}
              </strong>
              {message.status && <span>{message.status}</span>}
            </div>
            <p>{message.text}</p>
            {message.toolApprovals && message.toolApprovals.length > 0 && (
              <section className="wfr-gowoori-chat__tool-approval-card" role="group" aria-label="Gowoori tool approval">
                <div>
                  <strong>Tool approval required</strong>
                  <span>{message.toolApprovals.length} local action(s) need approval before Gowoori continues.</span>
                </div>
                <ul>
                  {message.toolApprovals.map((approval) => (
                    <li key={approval.id}>
                      <b>{approval.name}</b>
                      <span>{approval.reason}</span>
                      <code>{approval.inputSummary}</code>
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={isGenerating} onClick={() => onApproveToolMessage(message)}>
                  Approve and continue
                </button>
              </section>
            )}
            {message.detail && <pre className="wfr-gowoori-chat__message-detail">{message.detail}</pre>}
            {message.status === 'review note' && message.prompt && (
              <div className="wfr-gowoori-chat__message-actions">
                <button type="button" disabled={isGenerating} onClick={() => onRetryMessagePrompt(message)}>
                  Repair from note
                </button>
                <span>{message.prompt.length.toLocaleString()} prompt chars</span>
              </div>
            )}
            {message.source && sourceState && (
              <>
                {showSimpleRepairGuidance && sourceState.tone === 'blocked' && sourceState.canRepair && (
                  <div className="wfr-gowoori-chat__repair-guidance" role="alert">
                    <div>
                      <strong>No renderable artifact</strong>
                      <span>Gowoori can repair this response or regenerate an XCON/SKETCH block.</span>
                    </div>
                    <button type="button" disabled={isGenerating} onClick={() => void onRepairMessageArtifact(message)}>
                      {autoApply ? 'Repair & apply now' : 'Repair now'}
                    </button>
                  </div>
                )}
                <div className="wfr-gowoori-chat__message-actions">
                  <span className={`wfr-gowoori-chat__message-state is-${sourceState.tone}`}>{sourceState.label}</span>
                  <button
                    type="button"
                    disabled={!sourceState.canPreview}
                    onClick={() =>
                      void onApplySourceToGowoori(message.source ?? '', `GowooriChat preview: ${message.text}`, 'new')
                    }
                  >
                    Preview only
                  </button>
                  <button
                    type="button"
                    disabled={!sourceState.canApply}
                    onClick={() => void onApplySourceToGowoori(message.source ?? '', `GowooriChat: ${message.text}`)}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    disabled={!sourceState.canRepair || isGenerating}
                    onClick={() => void onRepairMessageArtifact(message)}
                  >
                    {autoApply ? 'Repair & apply' : 'Repair'}
                  </button>
                  <button
                    type="button"
                    disabled={!sourceState.canRetry || isGenerating}
                    onClick={() => onRetryMessagePrompt(message)}
                  >
                    Retry
                  </button>
                  <span>{message.source.length.toLocaleString()} chars</span>
                </div>
              </>
            )}
          </article>
        );
      })}
      {isGenerating && (
        <article className="wfr-gowoori-chat__message is-assistant is-loading">
          <div className="wfr-gowoori-chat__message-head">
            <strong>Gowoori assistant</strong>
            <span>{providerLabel}</span>
          </div>
          <p>Drafting Markdown, chain fixture, workflow metadata, and XCON/SKETCH...</p>
        </article>
      )}
    </>
  );
}
