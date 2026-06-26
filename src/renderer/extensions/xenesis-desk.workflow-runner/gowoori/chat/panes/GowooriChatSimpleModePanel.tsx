import type { GowooriTargetMode } from '../../agent/gowooriChatRunController';
import { GOWOORI_PROVIDER_DEFINITIONS, type GowooriProvider } from '../../agent/gowooriProviders';
import { GOWOORI_SIMPLE_PROMPT_PRESETS, GOWOORI_SIMPLE_REFINEMENT_PROMPTS } from '../gowooriChatConstants';
import { isGowooriProviderId } from '../gowooriChatState';
import type { GowooriTargetOption } from '../gowooriChatTargetState';
import type {
  GowooriChatMessage,
  GowooriSimpleArtifactSummary,
  GowooriSimpleProgressStep,
  GowooriSimplePromptPreset,
  GowooriSimpleRefinementPromptPreset,
  GowooriSimpleResultSummary,
  GowooriSimpleSetupStep,
} from '../gowooriChatTypes';

export interface GowooriChatSimpleModePanelProps {
  provider: GowooriProvider;
  targetMode: GowooriTargetMode;
  targetOptions: GowooriTargetOption[];
  autoApply: boolean;
  isGenerating: boolean;
  isPreflighting: boolean;
  setupSteps: GowooriSimpleSetupStep[];
  progressSteps: GowooriSimpleProgressStep[];
  resultSummary: GowooriSimpleResultSummary;
  artifactSummary: GowooriSimpleArtifactSummary;
  latestSourceMessage: GowooriChatMessage | null;
  recentSourceMessages: GowooriChatMessage[];
  onSelectProvider: (provider: GowooriProvider) => void;
  onTargetModeChange: (targetMode: GowooriTargetMode) => void;
  onAutoApplyChange: (autoApply: boolean) => void;
  onRunProviderPreflight: () => void | Promise<void>;
  onRunPromptPreset: (preset: GowooriSimplePromptPreset) => void;
  onRunRefinementPrompt: (preset: GowooriSimpleRefinementPromptPreset) => void;
  onPreviewLatestArtifact: () => void;
  onApplyLatestArtifact: () => void;
  onRepairLatestArtifact: () => void;
  onRetryLatestPrompt: () => void;
  onFocusInput: () => void;
  onPreviewHistoryArtifact: (message: GowooriChatMessage) => void;
  onApplyHistoryArtifact: (message: GowooriChatMessage) => void;
  onRetryHistoryPrompt: (message: GowooriChatMessage) => void;
}

export function GowooriChatSimpleModePanel({
  provider,
  targetMode,
  targetOptions,
  autoApply,
  isGenerating,
  isPreflighting,
  setupSteps,
  progressSteps,
  resultSummary,
  artifactSummary,
  latestSourceMessage,
  recentSourceMessages,
  onSelectProvider,
  onTargetModeChange,
  onAutoApplyChange,
  onRunProviderPreflight,
  onRunPromptPreset,
  onRunRefinementPrompt,
  onPreviewLatestArtifact,
  onApplyLatestArtifact,
  onRepairLatestArtifact,
  onRetryLatestPrompt,
  onFocusInput,
  onPreviewHistoryArtifact,
  onApplyHistoryArtifact,
  onRetryHistoryPrompt,
}: GowooriChatSimpleModePanelProps) {
  return (
    <>
      <section className="wfr-gowoori-chat__compact-controls" aria-label="Gowoori Simple Mode run setup">
        <header>
          <div>
            <strong>Run setup</strong>
            <span>Choose where GowooriChat applies the next generated artifact.</span>
          </div>
        </header>
        <div className="wfr-gowoori-chat__compact-controls-grid">
          <label className="wfr-gowoori-chat__compact-control">
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
          <label className="wfr-gowoori-chat__compact-control">
            <span>Gowoori target</span>
            <select
              value={targetMode}
              disabled={isGenerating}
              onChange={(event) => onTargetModeChange(event.target.value as GowooriTargetMode)}
            >
              {targetOptions.map((target) => (
                <option key={target.id} value={target.id}>
                  {target.label}
                </option>
              ))}
            </select>
          </label>
          <label className="wfr-gowoori-chat__compact-toggle">
            <input
              type="checkbox"
              checked={autoApply}
              disabled={isGenerating}
              onChange={(event) => onAutoApplyChange(event.target.checked)}
            />
            <span>
              <strong>Auto apply</strong>
              <small>Apply renderable artifacts and keep diagnostics.</small>
            </span>
          </label>
        </div>
      </section>

      <section className="wfr-gowoori-chat__setup-checklist" aria-label="Gowoori Simple Mode ready checklist">
        <header>
          <div>
            <strong>Ready checklist</strong>
            <span>Check the basics before asking Gowoori to generate an artifact.</span>
          </div>
          <button type="button" disabled={isPreflighting} onClick={() => void onRunProviderPreflight()}>
            {isPreflighting ? <span>Checking...</span> : <span>Run preflight</span>}
          </button>
        </header>
        <div>
          {setupSteps.map((step) => (
            <article
              key={step.id}
              className={`wfr-gowoori-chat__setup-step is-${step.state}`}
              data-setup-step={step.id}
            >
              <i aria-hidden="true" />
              <div>
                <strong>{step.label}</strong>
                <span>{step.detail}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wfr-gowoori-chat__quick-prompts" aria-label="Gowoori quick starts">
        <header>
          <div>
            <strong>Quick starts</strong>
            <span>Pick a working artifact or type a request below.</span>
          </div>
        </header>
        <div>
          {GOWOORI_SIMPLE_PROMPT_PRESETS.map((preset) => (
            <button key={preset.id} type="button" disabled={isGenerating} onClick={() => onRunPromptPreset(preset)}>
              <strong>{preset.label}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="wfr-gowoori-chat__simple-progress" aria-label="Gowoori Simple Mode progress">
        {progressSteps.map((step) => (
          <span
            key={step.id}
            className={`wfr-gowoori-chat__simple-progress-step is-${step.state}`}
            data-progress-step={step.id}
          >
            <i aria-hidden="true" />
            <strong>{step.label}</strong>
          </span>
        ))}
      </section>

      <section
        className={`wfr-gowoori-chat__result-summary is-${resultSummary.tone}`}
        aria-label="Gowoori result summary"
      >
        <div>
          <span>Current result</span>
          <strong>{resultSummary.title}</strong>
          <p>{resultSummary.description}</p>
          <div className={`wfr-gowoori-chat__artifact-summary${artifactSummary.canPreview ? ' is-ready' : ''}`}>
            <strong>Artifact preview</strong>
            <span>{artifactSummary.title}</span>
            <small>{artifactSummary.description}</small>
            <div className="wfr-gowoori-chat__artifact-summary-meta">
              <span>{artifactSummary.stateLabel}</span>
              <span>{artifactSummary.sourceSizeLabel}</span>
            </div>
          </div>
        </div>
        <div className="wfr-gowoori-chat__result-summary-action">
          <span>{resultSummary.nextActionLabel}</span>
          <small>{resultSummary.statusText}</small>
          <div className="wfr-gowoori-chat__result-summary-buttons">
            {artifactSummary.canPreview && (
              <button type="button" disabled={isGenerating} onClick={onPreviewLatestArtifact}>
                Preview only
              </button>
            )}
            {resultSummary.tone === 'ready' && (
              <button
                type="button"
                className="is-primary"
                disabled={isGenerating || !latestSourceMessage?.sourceState?.canApply}
                onClick={onApplyLatestArtifact}
              >
                Apply now
              </button>
            )}
            {resultSummary.tone === 'blocked' && (
              <button
                type="button"
                className="is-primary"
                disabled={isGenerating || !latestSourceMessage?.sourceState?.canRepair}
                onClick={onRepairLatestArtifact}
              >
                Repair now
              </button>
            )}
            {(resultSummary.tone === 'idle' ||
              resultSummary.tone === 'waiting' ||
              resultSummary.tone === 'applied') && (
              <button type="button" className="is-primary" onClick={onFocusInput}>
                Start typing
              </button>
            )}
            {latestSourceMessage?.sourceState?.canRetry && (
              <button type="button" disabled={isGenerating} onClick={onRetryLatestPrompt}>
                Retry
              </button>
            )}
          </div>
          {latestSourceMessage?.source && (
            <div className="wfr-gowoori-chat__refinement-prompts" aria-label="Gowoori refinement prompts">
              <span>Refine result</span>
              <div>
                {GOWOORI_SIMPLE_REFINEMENT_PROMPTS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => onRunRefinementPrompt(preset)}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {recentSourceMessages.length > 0 && (
            <div className="wfr-gowoori-chat__recent-results" aria-label="Gowoori recent results">
              <span>Recent results</span>
              <div>
                {recentSourceMessages.map((message, index) => {
                  const sourceState = message.sourceState;
                  return (
                    <article
                      key={message.id}
                      className={`wfr-gowoori-chat__recent-result-card is-${sourceState?.tone ?? 'empty'}`}
                    >
                      <strong>Result #{index + 1}</strong>
                      <span>{sourceState?.label ?? 'No state'}</span>
                      <small>{(message.source ?? '').length.toLocaleString()} chars</small>
                      <div className="wfr-gowoori-chat__recent-result-actions">
                        <button
                          type="button"
                          disabled={isGenerating || !sourceState?.canPreview}
                          onClick={() => onPreviewHistoryArtifact(message)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating || !sourceState?.canApply}
                          onClick={() => onApplyHistoryArtifact(message)}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          disabled={isGenerating || !sourceState?.canRetry}
                          onClick={() => onRetryHistoryPrompt(message)}
                        >
                          Retry
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
