import React from 'react';
import type { GowooriChatInspectorTab } from '../gowooriChatTypes';
import { GowooriChatTranscriptPanel } from './GowooriChatTranscriptPanel';
import { GowooriProviderSettingsPanel } from './GowooriProviderSettingsPanel';
import { GowooriQualityActions } from './GowooriQualityActions';
import { GowooriQualityInsightsPanel } from './GowooriQualityInsightsPanel';
import { GowooriQualityLogBrowser } from './GowooriQualityLogBrowser';
import { GowooriRepairDiagnosticsPanel } from './GowooriRepairDiagnosticsPanel';
import { GowooriRestoredPackagePanel } from './GowooriRestoredPackagePanel';

interface GowooriFirstRunStep {
  title: string;
  description: string;
}

interface GowooriDeveloperQualitySummary {
  total: number;
  stable: number;
  repaired: number;
  blocked: number;
  applied: number;
}

interface GowooriChatDeveloperInspectorPanelProps {
  isAdvancedMode: boolean;
  inspectorTab: GowooriChatInspectorTab;
  rawStream: string;
  qualityLogLength: number;
  qualitySummary: GowooriDeveloperQualitySummary;
  isSimpleFirstRun: boolean;
  firstRunSteps: GowooriFirstRunStep[];
  providerSettingsPanelProps: React.ComponentProps<typeof GowooriProviderSettingsPanel>;
  qualityActionsProps: React.ComponentProps<typeof GowooriQualityActions>;
  restoredPackagePanelProps: React.ComponentProps<typeof GowooriRestoredPackagePanel>;
  qualityInsightsPanelProps: React.ComponentProps<typeof GowooriQualityInsightsPanel>;
  qualityLogBrowserProps: React.ComponentProps<typeof GowooriQualityLogBrowser>;
  repairDiagnosticsPanelProps: React.ComponentProps<typeof GowooriRepairDiagnosticsPanel>;
  transcriptPanelProps: React.ComponentProps<typeof GowooriChatTranscriptPanel>;
  onInspectorTabChange: (tab: GowooriChatInspectorTab) => void;
}

export function GowooriChatDeveloperInspectorPanel({
  isAdvancedMode,
  inspectorTab,
  rawStream,
  qualityLogLength,
  qualitySummary,
  isSimpleFirstRun,
  firstRunSteps,
  providerSettingsPanelProps,
  qualityActionsProps,
  restoredPackagePanelProps,
  qualityInsightsPanelProps,
  qualityLogBrowserProps,
  repairDiagnosticsPanelProps,
  transcriptPanelProps,
  onInspectorTabChange,
}: GowooriChatDeveloperInspectorPanelProps) {
  return (
    <>
      {isAdvancedMode && <GowooriProviderSettingsPanel {...providerSettingsPanelProps} />}

      <div className="wfr-gowoori-chat__inspector-tabs">
        <button
          type="button"
          className={inspectorTab === 'chat' ? 'is-active' : ''}
          onClick={() => onInspectorTabChange('chat')}
        >
          Chat
        </button>
        {isAdvancedMode && (
          <button
            type="button"
            className={inspectorTab === 'stream' ? 'is-active' : ''}
            onClick={() => onInspectorTabChange('stream')}
          >
            Raw stream
          </button>
        )}
        <button
          type="button"
          className={inspectorTab === 'repair' ? 'is-active' : ''}
          onClick={() => onInspectorTabChange('repair')}
        >
          Repair diagnostics
        </button>
        {isAdvancedMode && (
          <button
            type="button"
            className={inspectorTab === 'quality' ? 'is-active' : ''}
            onClick={() => onInspectorTabChange('quality')}
          >
            Quality log
          </button>
        )}
      </div>

      <div className="wfr-gowoori-chat__messages" aria-live="polite">
        {isAdvancedMode && inspectorTab === 'stream' ? (
          <pre className="wfr-gowoori-chat__raw-stream">{rawStream || 'No provider stream yet.'}</pre>
        ) : isAdvancedMode && inspectorTab === 'quality' ? (
          <div className="wfr-gowoori-chat__quality-log">
            <GowooriQualityActions {...qualityActionsProps} />
            {qualityLogLength === 0 ? (
              <p>No quality log yet. Send a prompt to compare provider stability, repair rate, and apply readiness.</p>
            ) : (
              <>
                <div className="wfr-gowoori-chat__quality-summary">
                  <span>
                    <strong>{qualitySummary.total}</strong>Total
                  </span>
                  <span>
                    <strong>{qualitySummary.stable}</strong>Stable
                  </span>
                  <span>
                    <strong>{qualitySummary.repaired}</strong>Repaired
                  </span>
                  <span>
                    <strong>{qualitySummary.blocked}</strong>Blocked
                  </span>
                  <span>
                    <strong>{qualitySummary.applied}</strong>Applied
                  </span>
                </div>
                <GowooriRestoredPackagePanel {...restoredPackagePanelProps} />
                <GowooriQualityInsightsPanel {...qualityInsightsPanelProps} />
                <GowooriQualityLogBrowser {...qualityLogBrowserProps} />
              </>
            )}
          </div>
        ) : inspectorTab === 'repair' ? (
          <GowooriRepairDiagnosticsPanel {...repairDiagnosticsPanelProps} />
        ) : isSimpleFirstRun ? (
          <section className="wfr-gowoori-chat__first-run" aria-label="Gowoori first run guide">
            <header>
              <span>Simple Mode guide</span>
              <strong>How to start</strong>
              <p>
                Choose a quick start above or describe the artifact you want. GowooriChat will stream, validate, and
                apply the result.
              </p>
            </header>
            <div>
              {firstRunSteps.map((step) => (
                <article key={step.title} className="wfr-gowoori-chat__first-run-step">
                  <strong>{step.title}</strong>
                  <span>{step.description}</span>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <GowooriChatTranscriptPanel {...transcriptPanelProps} />
        )}
      </div>
    </>
  );
}
