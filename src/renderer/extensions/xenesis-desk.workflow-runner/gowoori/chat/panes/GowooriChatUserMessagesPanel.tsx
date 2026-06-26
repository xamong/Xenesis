import { Fragment, useEffect, useRef } from 'react';
import type { GowooriTargetMode } from '../../agent/gowooriChatRunController';
import { GOWOORI_PROVIDER_DEFINITIONS, type GowooriProvider } from '../../agent/gowooriProviders';
import type { GowooriInstanceDetail } from '../../shared/gowooriEvents';
import { isGowooriProviderId } from '../gowooriChatState';
import { getGowooriArtifactTitleFromSource, getGowooriUserFacingArtifactSummary } from '../gowooriChatSummaries';
import type { GowooriChatMessage, GowooriUserTargetPreference } from '../gowooriChatTypes';

export interface GowooriChatUserMessagesPanelProps {
  provider: GowooriProvider;
  messages: GowooriChatMessage[];
  pendingUserPrompt: string;
  targets: GowooriInstanceDetail[];
  isGenerating: boolean;
  generationProgress?: string;
  onSelectProvider: (provider: GowooriProvider) => void;
  onRunPromptWithTarget: (
    prompt: string,
    targetMode: GowooriTargetMode,
    preference: GowooriUserTargetPreference | null,
  ) => void;
  onShowHistoryArtifact: (message: GowooriChatMessage) => void;
  onApproveToolMessage: (message: GowooriChatMessage) => void;
}

export function GowooriChatUserMessagesPanel({
  provider,
  messages,
  pendingUserPrompt,
  targets,
  isGenerating,
  generationProgress = '',
  onSelectProvider,
  onRunPromptWithTarget,
  onShowHistoryArtifact,
  onApproveToolMessage,
}: GowooriChatUserMessagesPanelProps) {
  const tailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = window.requestAnimationFrame(() => {
      tailRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [messages.length, pendingUserPrompt, isGenerating]);

  return (
    <>
      <section className="wfr-gowoori-chat__user-runbar" aria-label="GowooriChat provider and run state">
        <label>
          <span>Provider</span>
          <select
            value={provider}
            disabled={isGenerating}
            onChange={(event) => {
              const nextProvider = event.target.value;
              if (isGowooriProviderId(nextProvider)) onSelectProvider(nextProvider);
            }}
          >
            {GOWOORI_PROVIDER_DEFINITIONS.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.label}
              </option>
            ))}
          </select>
        </label>
        {isGenerating ? (
          <div className="wfr-gowoori-chat__responding" role="status" aria-live="polite">
            <i aria-hidden="true" />
            <span>{generationProgress || 'Gowoori is generating...'}</span>
          </div>
        ) : (
          <div className="wfr-gowoori-chat__responding is-idle" aria-live="polite">
            <span>Ready</span>
          </div>
        )}
      </section>
      {messages.length === 0 && (
        <article className="wfr-gowoori-chat__user-message is-assistant">
          <div className="wfr-gowoori-chat__user-avatar">K</div>
          <div>
            <header>
              <strong>GowooriChat</strong>
              <span>Ready</span>
            </header>
            <p>안녕하세요. 거울이입니다. 보고싶은 내용을 말씀해 주세요. 실시간으로 시각화해 드립니다.</p>
            <small>What should I make for you?</small>
          </div>
        </article>
      )}
      {pendingUserPrompt && (
        <>
          <article className="wfr-gowoori-chat__user-message is-user">
            <div>
              <header>
                <strong>You</strong>
              </header>
              <p>{pendingUserPrompt}</p>
            </div>
          </article>
          <article className="wfr-gowoori-chat__user-message is-assistant">
            <div className="wfr-gowoori-chat__user-avatar">K</div>
            <div>
              <header>
                <strong>GowooriChat</strong>
                <span>Choose target</span>
              </header>
              <p>Where should I show this result?</p>
              <small>Pick once, or keep the same choice for this chat session.</small>
              <section className="wfr-gowoori-chat__target-chooser" aria-label="Gowoori user target chooser">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onRunPromptWithTarget(pendingUserPrompt, 'new', null)}
                >
                  Open new once
                </button>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => onRunPromptWithTarget(pendingUserPrompt, 'new', { mode: 'always-new' })}
                >
                  Always open new
                </button>
                {targets.length === 0 && <span>No open Gowoori pane is available yet.</span>}
                {targets.map((target) => {
                  const targetLabel = `${target.title}${target.modified ? ' *' : ''}`;
                  return (
                    <Fragment key={target.id}>
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() => onRunPromptWithTarget(pendingUserPrompt, target.id, null)}
                      >
                        Use {targetLabel} once
                      </button>
                      <button
                        type="button"
                        disabled={isGenerating}
                        onClick={() =>
                          onRunPromptWithTarget(pendingUserPrompt, target.id, {
                            mode: 'sticky',
                            targetId: target.id,
                            targetLabel,
                          })
                        }
                      >
                        Keep using {targetLabel}
                      </button>
                    </Fragment>
                  );
                })}
              </section>
            </div>
          </article>
        </>
      )}
      {messages
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .map((message) => {
          const artifactTitle = message.source ? getGowooriArtifactTitleFromSource(message.source, message.text) : '';
          const messageText =
            message.role === 'assistant' && message.source
              ? getGowooriUserFacingArtifactSummary(message.source, message.text)
              : message.text;
          const sourceState = message.sourceState;
          return (
            <article key={message.id} className={`wfr-gowoori-chat__user-message is-${message.role}`}>
              {message.role === 'assistant' && <div className="wfr-gowoori-chat__user-avatar">K</div>}
              <div>
                <header>
                  <strong>{message.role === 'user' ? 'You' : 'GowooriChat'}</strong>
                  {sourceState && <span>{sourceState.label}</span>}
                </header>
                <p>{messageText}</p>
                {message.role === 'assistant' && message.toolApprovals && message.toolApprovals.length > 0 && (
                  <section
                    className="wfr-gowoori-chat__user-approval-card"
                    role="group"
                    aria-label="Gowoori tool approval"
                  >
                    <div>
                      <span>Approval required</span>
                      <strong>{message.toolApprovals.length} local action(s)</strong>
                      <small>승인하면 같은 요청을 이어서 실행합니다.</small>
                    </div>
                    <button type="button" disabled={isGenerating} onClick={() => onApproveToolMessage(message)}>
                      Approve and continue
                    </button>
                  </section>
                )}
                {message.role === 'assistant' && message.source && sourceState && (
                  <section className={`wfr-gowoori-chat__user-artifact-card is-${sourceState.tone}`}>
                    <div>
                      <span>Result in Gowoori</span>
                      <strong>{artifactTitle}</strong>
                      <small>
                        {sourceState.canPreview ? 'You can reopen this result in Gowoori.' : sourceState.label}
                      </small>
                    </div>
                    <button
                      type="button"
                      disabled={!sourceState.canPreview}
                      onClick={() => onShowHistoryArtifact(message)}
                    >
                      Show in Gowoori
                    </button>
                  </section>
                )}
                {sourceState?.tone === 'blocked' && (
                  <small>렌더 가능한 XCON/SKETCH 블록이 없어 다시 생성하거나 수리가 필요합니다.</small>
                )}
                {message.detail && (
                  <details className="wfr-gowoori-chat__user-message-detail">
                    <summary>Provider detail</summary>
                    <pre>{message.detail}</pre>
                  </details>
                )}
              </div>
            </article>
          );
        })}
      {isGenerating && (
        <article className="wfr-gowoori-chat__user-message is-assistant is-loading">
          <div className="wfr-gowoori-chat__user-avatar">K</div>
          <div>
            <header>
              <strong>GowooriChat</strong>
              <span className="wfr-gowoori-chat__working-label">
                <i aria-hidden="true" />
                Working
              </span>
            </header>
            <p>{generationProgress || '요청을 XCON/SKETCH 문서로 만들고 있습니다.'}</p>
          </div>
        </article>
      )}
      <div ref={tailRef} className="wfr-gowoori-chat__scroll-anchor" aria-hidden="true" />
    </>
  );
}
