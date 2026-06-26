import React from 'react';
import type { AiProviderProfile, AiProviderSettings, GowooriChatSettings } from '../../../../../../shared/types';
import type { GowooriTargetMode } from '../../agent/gowooriChatRunController';
import { getDefaultGowooriApiBaseUrl } from '../../agent/gowooriProviderRuntime';
import {
  GOWOORI_PROVIDER_DEFINITIONS,
  type GowooriProvider,
  type GowooriRequestMode,
  getGowooriProviderDefinition,
} from '../../agent/gowooriProviders';
import type { GowooriProviderReadinessItem } from '../../agent/gowooriQualityLog';
import type { GowooriApplyMode } from '../../shared/gowooriEvents';
import { DEFAULT_PROVIDER_TIMEOUT_MS } from '../gowooriChatConstants';
import type { GowooriTargetOption } from '../gowooriChatTargetState';

interface GowooriProviderSettingsPanelProps {
  activeAiProviderProfileId: string;
  activeAiProviderProfileName: string;
  aiProviderProfiles: AiProviderProfile[];
  aiProviderSettings: AiProviderSettings | null;
  provider: GowooriProvider;
  requestMode: GowooriRequestMode;
  targetMode: GowooriTargetMode;
  targetOptions: GowooriTargetOption[];
  applyMode: GowooriApplyMode;
  autoApply: boolean;
  providerSettings: GowooriChatSettings;
  providerDiagnostic: string;
  providerReadinessItem: GowooriProviderReadinessItem | null;
  isGenerating: boolean;
  isPreflighting: boolean;
  onSelectAiProviderProfile: (profileId: string) => void;
  onSelectProvider: (provider: GowooriProvider) => void;
  onRequestModeChange: (mode: GowooriRequestMode) => void;
  onTargetModeChange: (mode: GowooriTargetMode) => void;
  onApplyModeChange: (mode: GowooriApplyMode) => void;
  onAutoApplyChange: (enabled: boolean) => void;
  onUpdateProviderSettings: (updater: (current: GowooriChatSettings) => GowooriChatSettings) => void;
  onRunProviderPreflight: () => void | Promise<void>;
  onOpenProviderReadiness: (entry: GowooriProviderReadinessItem) => void;
}

export function GowooriProviderSettingsPanel({
  activeAiProviderProfileId,
  activeAiProviderProfileName,
  aiProviderProfiles,
  aiProviderSettings,
  provider,
  requestMode,
  targetMode,
  targetOptions,
  applyMode,
  autoApply,
  providerSettings,
  providerDiagnostic,
  providerReadinessItem,
  isGenerating,
  isPreflighting,
  onSelectAiProviderProfile,
  onSelectProvider,
  onRequestModeChange,
  onTargetModeChange,
  onApplyModeChange,
  onAutoApplyChange,
  onUpdateProviderSettings,
  onRunProviderPreflight,
  onOpenProviderReadiness,
}: GowooriProviderSettingsPanelProps): React.ReactElement {
  const readinessState = providerReadinessItem?.state ?? 'unknown';
  const readinessLabel = readinessState === 'ready' ? 'Ready' : readinessState === 'blocked' ? 'Blocked' : 'Not tested';
  const readinessSummary = providerReadinessItem?.summary ?? 'Run Preflight before the first real generation.';
  const readinessTime = providerReadinessItem?.latestCompletedAt
    ? new Date(providerReadinessItem.latestCompletedAt).toLocaleString()
    : 'No preflight run yet';

  return (
    <>
      <div className="wfr-gowoori-chat__controls">
        <label>
          <span>AI profile</span>
          <select
            value={activeAiProviderProfileId}
            disabled={aiProviderProfiles.length === 0}
            onChange={(event) => onSelectAiProviderProfile(event.target.value)}
          >
            {aiProviderProfiles.length === 0 ? (
              <option value="">Default AI profile</option>
            ) : (
              aiProviderProfiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          <span>Provider</span>
          <select value={provider} onChange={(event) => onSelectProvider(event.target.value as GowooriProvider)}>
            {GOWOORI_PROVIDER_DEFINITIONS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Mode</span>
          <select
            value={requestMode}
            onChange={(event) => onRequestModeChange(event.target.value as GowooriRequestMode)}
          >
            <option value="generate">Generate</option>
            <option value="repair">Repair</option>
            <option value="continue">Continue</option>
            <option value="explain">Explain</option>
          </select>
        </label>
        <label>
          <span>Target</span>
          <select value={targetMode} onChange={(event) => onTargetModeChange(event.target.value)}>
            {targetOptions.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Apply</span>
          <select value={applyMode} onChange={(event) => onApplyModeChange(event.target.value as GowooriApplyMode)}>
            <option value="replace">Replace</option>
            <option value="append">Append</option>
          </select>
        </label>
        <label className="wfr-gowoori-chat__check">
          <input type="checkbox" checked={autoApply} onChange={(event) => onAutoApplyChange(event.target.checked)} />
          <span>Auto apply</span>
        </label>
        <button
          type="button"
          className="wfr-gowoori-chat__ghost"
          disabled={isGenerating || isPreflighting}
          onClick={() => void onRunProviderPreflight()}
        >
          {isPreflighting ? 'Checking...' : 'Preflight'}
        </button>
      </div>

      <section
        className={`wfr-gowoori-chat__provider-preflight is-${readinessState}`}
        aria-label="Current provider readiness"
      >
        <header>
          <div>
            <span>Current provider</span>
            <strong>{getGowooriProviderDefinition(provider).label}</strong>
          </div>
          <b>{readinessLabel}</b>
        </header>
        <p>{readinessSummary}</p>
        <footer>
          <span>{readinessTime}</span>
          <div>
            <button
              type="button"
              disabled={isGenerating || isPreflighting}
              onClick={() => void onRunProviderPreflight()}
            >
              {isPreflighting ? 'Checking...' : 'Run preflight'}
            </button>
            <button
              type="button"
              disabled={!providerReadinessItem?.latestEntry}
              onClick={() => {
                if (providerReadinessItem) onOpenProviderReadiness(providerReadinessItem);
              }}
            >
              Open log
            </button>
          </div>
        </footer>
        {providerReadinessItem?.diagnosticSummary && <em>{providerReadinessItem.diagnosticSummary}</em>}
      </section>

      <details className="wfr-gowoori-chat__provider-settings">
        <summary>Provider settings</summary>
        <p className="wfr-gowoori-chat__provider-diagnostic">{providerDiagnostic}</p>
        <div className="wfr-gowoori-chat__provider-grid">
          <label>
            <span>Active AI profile</span>
            <input value={activeAiProviderProfileName} readOnly title={activeAiProviderProfileId || undefined} />
          </label>
          <label>
            <span>Saved profiles</span>
            <input value={`${aiProviderProfiles.length} profile(s)`} readOnly />
          </label>
          <label>
            <span>Command</span>
            <input
              value={providerSettings.commandOverrides[provider] ?? ''}
              placeholder={getGowooriProviderDefinition(provider).command ?? provider}
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  commandOverrides: {
                    ...current.commandOverrides,
                    [provider]: event.target.value,
                  },
                }))
              }
            />
          </label>
          <label>
            <span>Args</span>
            <input
              value={providerSettings.commandArgs}
              placeholder="exec --model gpt-5"
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  commandArgs: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>Prompt handoff</span>
            <select
              value={providerSettings.promptMode}
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  promptMode: event.target.value === 'argument' ? 'argument' : 'stdin',
                }))
              }
            >
              <option value="stdin">stdin / interactive</option>
              <option value="argument">quoted argument</option>
            </select>
          </label>
          <label>
            <span>Timeout</span>
            <input
              type="number"
              min={5}
              value={Math.round(providerSettings.timeoutMs / 1000)}
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  timeoutMs: Math.max(5, Number(event.target.value) || DEFAULT_PROVIDER_TIMEOUT_MS / 1000) * 1000,
                }))
              }
            />
          </label>
          <label className="wfr-gowoori-chat__check">
            <input
              type="checkbox"
              checked={providerSettings.livePreview}
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  livePreview: event.target.checked,
                }))
              }
            />
            <span>Live preview while streaming</span>
          </label>
          <label>
            <span>API URL</span>
            <input
              value={providerSettings.apiBaseUrl}
              placeholder={getDefaultGowooriApiBaseUrl(
                aiProviderSettings?.provider,
                providerSettings.apiModel || aiProviderSettings?.model,
              )}
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  apiBaseUrl: event.target.value,
                }))
              }
            />
          </label>
          <label>
            <span>API model</span>
            <input
              value={providerSettings.apiModel}
              placeholder={aiProviderSettings?.model || 'gpt-4o'}
              onChange={(event) =>
                onUpdateProviderSettings((current) => ({
                  ...current,
                  apiModel: event.target.value,
                }))
              }
            />
          </label>
        </div>
      </details>
    </>
  );
}
