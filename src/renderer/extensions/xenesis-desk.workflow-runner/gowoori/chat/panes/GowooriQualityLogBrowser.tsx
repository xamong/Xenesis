import React from 'react';
import type { GowooriQualityFilterOptions, GowooriQualityLogEntry } from '../../agent/gowooriQualityLog';
import type { GowooriQualityCaseDiffItem, GowooriQualityFilterSummary } from '../gowooriChatQualityState';

interface GowooriQualityLogBrowserProps {
  qualityLog: GowooriQualityLogEntry[];
  filteredQualityLog: GowooriQualityLogEntry[];
  qualityFilterOptions: GowooriQualityFilterOptions;
  selectedQualityProvider: string;
  selectedQualityMode: string;
  selectedQualityCase: string;
  selectedQualityEntry: GowooriQualityLogEntry | null;
  selectedQualityCaseDiff: GowooriQualityCaseDiffItem[];
  qualityFilterSummary: GowooriQualityFilterSummary;
  qualityFiltersActive: boolean;
  isRepairingQualityEntry: boolean;
  onSelectedQualityProviderChange: (value: string) => void;
  onSelectedQualityModeChange: (value: string) => void;
  onSelectedQualityCaseChange: (value: string) => void;
  onResetQualityFilters: () => void;
  onSelectQualityEntry: (entryId: string) => void;
  onApplySelectedQualityEntry: () => void | Promise<void>;
  onCopySelectedQualitySource: () => void | Promise<void>;
  onRepairSelectedQualityEntry: () => void | Promise<void>;
  onCopyFilteredQualityReport: () => void | Promise<void>;
  onSaveFilteredQualityReport: () => void;
  onSaveQualityReportPackage: () => void;
}

export function GowooriQualityLogBrowser({
  qualityLog,
  filteredQualityLog,
  qualityFilterOptions,
  selectedQualityProvider,
  selectedQualityMode,
  selectedQualityCase,
  selectedQualityEntry,
  selectedQualityCaseDiff,
  qualityFilterSummary,
  qualityFiltersActive,
  isRepairingQualityEntry,
  onSelectedQualityProviderChange,
  onSelectedQualityModeChange,
  onSelectedQualityCaseChange,
  onResetQualityFilters,
  onSelectQualityEntry,
  onApplySelectedQualityEntry,
  onCopySelectedQualitySource,
  onRepairSelectedQualityEntry,
  onCopyFilteredQualityReport,
  onSaveFilteredQualityReport,
  onSaveQualityReportPackage,
}: GowooriQualityLogBrowserProps) {
  return (
    <>
      <div className="wfr-gowoori-chat__quality-filters" aria-label="Quality log filters">
        <label className="wfr-gowoori-chat__quality-filter">
          <span>Provider</span>
          <select
            value={selectedQualityProvider}
            onChange={(event) => onSelectedQualityProviderChange(event.target.value)}
          >
            {qualityFilterOptions.providers.map((providerName) => (
              <option key={providerName} value={providerName}>
                {providerName === 'all'
                  ? `All providers (${qualityLog.length})`
                  : `${providerName} (${qualityLog.filter((entry) => entry.provider === providerName).length})`}
              </option>
            ))}
          </select>
        </label>
        <label className="wfr-gowoori-chat__quality-filter">
          <span>Mode</span>
          <select value={selectedQualityMode} onChange={(event) => onSelectedQualityModeChange(event.target.value)}>
            {qualityFilterOptions.modes.map((modeName) => (
              <option key={modeName} value={modeName}>
                {modeName === 'all'
                  ? `All modes (${qualityLog.length})`
                  : `${modeName} (${qualityLog.filter((entry) => entry.mode === modeName).length})`}
              </option>
            ))}
          </select>
        </label>
        <label className="wfr-gowoori-chat__quality-filter">
          <span>Case</span>
          <select value={selectedQualityCase} onChange={(event) => onSelectedQualityCaseChange(event.target.value)}>
            {qualityFilterOptions.caseTitles.map((caseTitle) => (
              <option key={caseTitle} value={caseTitle}>
                {caseTitle === 'all'
                  ? `All cases (${qualityLog.length})`
                  : `${caseTitle} (${qualityLog.filter((entry) => entry.promptTitle === caseTitle).length})`}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="wfr-gowoori-chat__quality-filter-reset"
          onClick={onResetQualityFilters}
          disabled={!qualityFiltersActive}
          title="Show all quality log entries"
        >
          Reset filters
        </button>
      </div>
      <div className="wfr-gowoori-chat__quality-entries">
        {filteredQualityLog.map((entry) => (
          <article
            key={entry.id}
            className={`is-${entry.status}${selectedQualityEntry?.id === entry.id ? ' is-selected' : ''}`}
            onClick={() => onSelectQualityEntry(entry.id)}
          >
            <header>
              <strong>{entry.promptTitle}</strong>
              <span>{entry.status}</span>
            </header>
            <dl>
              <div>
                <dt>Provider</dt>
                <dd>{entry.provider}</dd>
              </div>
              <div>
                <dt>Mode</dt>
                <dd>{entry.mode}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{entry.durationMs.toLocaleString()}ms</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{entry.sourceChars.toLocaleString()} chars</dd>
              </div>
              <div>
                <dt>Preflight</dt>
                <dd>{entry.preflightOk ? 'ok' : 'blocked'}</dd>
              </div>
              <div>
                <dt>Repair</dt>
                <dd>{entry.autoRepairAttempted ? (entry.autoRepairSucceeded ? 'succeeded' : 'attempted') : 'none'}</dd>
              </div>
              <div>
                <dt>Failure reason</dt>
                <dd>{entry.failureReason}</dd>
              </div>
              <div>
                <dt>Apply state</dt>
                <dd>{entry.applyState}</dd>
              </div>
              <div>
                <dt>Repair delta</dt>
                <dd>
                  {entry.repairDiagnosticsDelta > 0 ? '+' : ''}
                  {entry.repairDiagnosticsDelta}
                </dd>
              </div>
              <div>
                <dt>Diagnostics</dt>
                <dd>
                  {entry.errorCount} error / {entry.warningCount} warning
                </dd>
              </div>
            </dl>
            {entry.summary && <p>{entry.summary}</p>}
            <button type="button" onClick={() => onSelectQualityEntry(entry.id)}>
              Inspect run
            </button>
          </article>
        ))}
        {filteredQualityLog.length === 0 && <p>No quality log entries match the selected filters.</p>}
      </div>
      {selectedQualityEntry && (
        <section className="wfr-gowoori-chat__quality-detail" aria-label="Selected quality run detail">
          <header>
            <div>
              <strong>{selectedQualityEntry.promptTitle}</strong>
              <span>
                {selectedQualityEntry.provider} / {selectedQualityEntry.mode} / {selectedQualityEntry.status}
              </span>
            </div>
            <span>{new Date(selectedQualityEntry.completedAt).toLocaleString()}</span>
          </header>
          <section className="wfr-gowoori-chat__quality-filter-summary" aria-label="Filtered view">
            <header>
              <div>
                <strong>Filtered view</strong>
                <span>
                  {qualityFilterSummary.provider} / {qualityFilterSummary.mode} / {qualityFilterSummary.caseTitle}
                </span>
              </div>
              <span>
                {qualityFilterSummary.visible} / {qualityFilterSummary.total} run(s)
              </span>
            </header>
            <dl>
              <div>
                <dt>Stable</dt>
                <dd>{qualityFilterSummary.stable}</dd>
              </div>
              <div>
                <dt>Repaired</dt>
                <dd>{qualityFilterSummary.repaired}</dd>
              </div>
              <div>
                <dt>Blocked</dt>
                <dd>{qualityFilterSummary.blocked}</dd>
              </div>
              <div>
                <dt>Applied</dt>
                <dd>{qualityFilterSummary.applied}</dd>
              </div>
              <div>
                <dt>Errors</dt>
                <dd>{qualityFilterSummary.errors}</dd>
              </div>
              <div>
                <dt>Warnings</dt>
                <dd>{qualityFilterSummary.warnings}</dd>
              </div>
            </dl>
            <div className="wfr-gowoori-chat__quality-filter-summary-actions">
              <button type="button" onClick={onResetQualityFilters} disabled={!qualityFiltersActive}>
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => void onCopyFilteredQualityReport()}
                disabled={filteredQualityLog.length === 0}
              >
                Copy filtered report
              </button>
              <button type="button" onClick={onSaveFilteredQualityReport} disabled={filteredQualityLog.length === 0}>
                Save filtered report
              </button>
              <button type="button" onClick={onSaveQualityReportPackage} disabled={filteredQualityLog.length === 0}>
                Quality report package
              </button>
            </div>
          </section>
          <div className="wfr-gowoori-chat__quality-detail-actions">
            <button
              type="button"
              onClick={() => void onApplySelectedQualityEntry()}
              disabled={!selectedQualityEntry.artifactSource}
            >
              Apply selected artifact
            </button>
            <button
              type="button"
              onClick={() => void onCopySelectedQualitySource()}
              disabled={!selectedQualityEntry.artifactSource}
            >
              Copy artifact source
            </button>
            <button
              type="button"
              onClick={() => void onRepairSelectedQualityEntry()}
              disabled={!selectedQualityEntry.artifactSource || isRepairingQualityEntry}
            >
              {isRepairingQualityEntry ? 'Repairing...' : 'Repair selected artifact'}
            </button>
          </div>
          <dl>
            <div>
              <dt>Preflight</dt>
              <dd>{selectedQualityEntry.preflightOk ? 'ok' : 'blocked'}</dd>
            </div>
            <div>
              <dt>Repair</dt>
              <dd>
                {selectedQualityEntry.autoRepairAttempted
                  ? selectedQualityEntry.autoRepairSucceeded
                    ? 'succeeded'
                    : 'attempted'
                  : 'none'}
              </dd>
            </div>
            <div>
              <dt>Failure reason</dt>
              <dd>{selectedQualityEntry.failureReason}</dd>
            </div>
            <div>
              <dt>Apply state</dt>
              <dd>{selectedQualityEntry.applyState}</dd>
            </div>
            <div>
              <dt>Repair delta</dt>
              <dd>
                {selectedQualityEntry.repairBeforeDiagnosticsCount}
                {' -> '}
                {selectedQualityEntry.repairAfterDiagnosticsCount}
                {' / '}
                {selectedQualityEntry.repairDiagnosticsDelta > 0 ? '+' : ''}
                {selectedQualityEntry.repairDiagnosticsDelta}
              </dd>
            </div>
            <div>
              <dt>Artifact</dt>
              <dd>
                {selectedQualityEntry.artifactSource
                  ? `${selectedQualityEntry.sourceChars.toLocaleString()} chars stored`
                  : `${selectedQualityEntry.sourceChars.toLocaleString()} chars, source not stored`}
              </dd>
            </div>
          </dl>
          {selectedQualityEntry.diagnosticMessages.length > 0 && (
            <ul>
              {selectedQualityEntry.diagnosticMessages.map((diagnostic, index) => (
                <li
                  key={`${selectedQualityEntry.id}-${diagnostic.severity}-${index}`}
                  className={`is-${diagnostic.severity}`}
                >
                  <span>{diagnostic.severity}</span>
                  <p>{diagnostic.message}</p>
                </li>
              ))}
            </ul>
          )}
          <section className="wfr-gowoori-chat__quality-case-diff" aria-label="Case diff panel">
            <header>
              <div>
                <strong>Case diff panel</strong>
                <span>{selectedQualityEntry.promptTitle}</span>
              </div>
              <span>{selectedQualityCaseDiff.filter((item) => item.entry).length} provider run(s)</span>
            </header>
            <div className="wfr-gowoori-chat__quality-case-diff-grid">
              {selectedQualityCaseDiff.map((item) => (
                <article
                  key={`${selectedQualityEntry.promptTitle}-${item.provider}`}
                  className={`is-${item.entry?.status ?? 'missing'}`}
                >
                  <header>
                    <strong>{item.provider}</strong>
                    <span>{item.entry?.status ?? 'missing'}</span>
                  </header>
                  {item.entry ? (
                    <>
                      <dl>
                        <div>
                          <dt>Preflight</dt>
                          <dd>{item.entry.preflightOk ? 'ok' : 'blocked'}</dd>
                        </div>
                        <div>
                          <dt>Repair</dt>
                          <dd>
                            {item.entry.autoRepairAttempted
                              ? item.entry.autoRepairSucceeded
                                ? 'succeeded'
                                : 'attempted'
                              : 'none'}
                          </dd>
                        </div>
                        <div>
                          <dt>Diagnostics</dt>
                          <dd>
                            {item.entry.errorCount} error / {item.entry.warningCount} warning
                          </dd>
                        </div>
                        <div>
                          <dt>Duration</dt>
                          <dd>{item.entry.durationMs.toLocaleString()}ms</dd>
                        </div>
                      </dl>
                      {item.entry.diagnosticMessages.length > 0 ? (
                        <ul>
                          {item.entry.diagnosticMessages.slice(0, 3).map((diagnostic, index) => (
                            <li key={`${item.entry?.id}-diff-${diagnostic.severity}-${index}`}>
                              <b>{diagnostic.severity}</b>
                              <span>{diagnostic.message}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>No diagnostics.</p>
                      )}
                      <pre>{item.entry.artifactSource?.slice(0, 900) || 'Source was not captured for this run.'}</pre>
                      {item.entry.id !== selectedQualityEntry.id && (
                        <button type="button" onClick={() => onSelectQualityEntry(item.entry!.id)}>
                          Inspect this run
                        </button>
                      )}
                    </>
                  ) : (
                    <p>No comparable provider run yet.</p>
                  )}
                </article>
              ))}
            </div>
          </section>
          <pre className="wfr-gowoori-chat__quality-source">
            {selectedQualityEntry.artifactSource || 'This log entry was recorded before source capture was available.'}
          </pre>
        </section>
      )}
    </>
  );
}
