import React from 'react';
import {
  createArtifactLineDiff,
  formatSignedNumber,
  type RestoredQualityArtifactDrilldown,
  type RestoredQualityArtifactLineDiff,
  type RestoredQualityArtifactLineDiffStatus,
  type RestoredQualityArtifactRepairResult,
  type RestoredQualityPackageDiff,
  type RestoredQualityPackageDiffHistoryItem,
  type RestoredQualityPackageSummary,
} from '../../agent/gowooriQualityPackageDiff';

type RestoredArtifactSide = 'package' | 'current' | 'repaired';
type CopyArtifactLineHandler = (
  side: RestoredArtifactSide,
  text: string,
  lineNumber: number | null,
) => void | Promise<void>;

export type GowooriRestoredPackageRepairResult = RestoredQualityArtifactRepairResult;

function formatArtifactLineNumber(lineNumber: number | null): string {
  return lineNumber === null ? '-' : String(lineNumber);
}

function getArtifactDiffLineClass(status: RestoredQualityArtifactLineDiffStatus): string {
  switch (status) {
    case 'changed':
      return 'wfr-gowoori-chat__artifact-diff-line wfr-gowoori-chat__artifact-diff-line--changed';
    case 'added':
      return 'wfr-gowoori-chat__artifact-diff-line wfr-gowoori-chat__artifact-diff-line--added';
    case 'removed':
      return 'wfr-gowoori-chat__artifact-diff-line wfr-gowoori-chat__artifact-diff-line--removed';
    case 'same':
    default:
      return 'wfr-gowoori-chat__artifact-diff-line wfr-gowoori-chat__artifact-diff-line--same';
  }
}

function renderArtifactLineDiff(
  restoredPackageDrilldown: RestoredQualityArtifactDrilldown,
  onCopyRestoredArtifactLine: CopyArtifactLineHandler,
  onApplyRestoredArtifactSource: (side: RestoredArtifactSide) => void | Promise<void>,
) {
  const artifactLineDiff = restoredPackageDrilldown.artifactLineDiff;
  return (
    <section className="wfr-gowoori-chat__artifact-line-diff" aria-label="Line diff">
      <header>
        <h5>Line diff</h5>
        <span>
          {artifactLineDiff.summary.changed} changed / {artifactLineDiff.summary.added} added /{' '}
          {artifactLineDiff.summary.removed} removed
        </span>
      </header>
      <div className="wfr-gowoori-chat__artifact-diff-grid">
        <div className="wfr-gowoori-chat__artifact-diff-heading">Package</div>
        <div className="wfr-gowoori-chat__artifact-diff-heading">Current</div>
        {artifactLineDiff.lines.length > 0 ? (
          artifactLineDiff.lines.map((line) => (
            <React.Fragment key={line.lineNumber}>
              <code className={getArtifactDiffLineClass(line.status)}>
                <span>{formatArtifactLineNumber(line.packageLineNumber)}</span>
                <b>{line.status}</b>
                <em>{line.packageText || ' '}</em>
                <small className="wfr-gowoori-chat__artifact-diff-line-actions">
                  <button
                    type="button"
                    onClick={() => void onCopyRestoredArtifactLine('package', line.packageText, line.packageLineNumber)}
                    disabled={line.packageLineNumber === null}
                  >
                    Copy package line
                  </button>
                  <button
                    type="button"
                    onClick={() => void onApplyRestoredArtifactSource('package')}
                    disabled={!restoredPackageDrilldown.packageSource}
                  >
                    Apply package from line
                  </button>
                </small>
              </code>
              <code className={getArtifactDiffLineClass(line.status)}>
                <span>{formatArtifactLineNumber(line.currentLineNumber)}</span>
                <b>{line.status}</b>
                <em>{line.currentText || ' '}</em>
                <small className="wfr-gowoori-chat__artifact-diff-line-actions">
                  <button
                    type="button"
                    onClick={() => void onCopyRestoredArtifactLine('current', line.currentText, line.currentLineNumber)}
                    disabled={line.currentLineNumber === null}
                  >
                    Copy current line
                  </button>
                  <button
                    type="button"
                    onClick={() => void onApplyRestoredArtifactSource('current')}
                    disabled={!restoredPackageDrilldown.currentSource}
                  >
                    Apply current from line
                  </button>
                </small>
              </code>
            </React.Fragment>
          ))
        ) : (
          <div className="wfr-gowoori-chat__artifact-diff-empty">
            No package or current artifact source is available.
          </div>
        )}
      </div>
    </section>
  );
}

function renderReadOnlyArtifactLineDiff(
  title: string,
  leftLabel: string,
  rightLabel: string,
  artifactLineDiff: RestoredQualityArtifactLineDiff,
) {
  return (
    <section className="wfr-gowoori-chat__artifact-line-diff" aria-label={title}>
      <header>
        <h5>{title}</h5>
        <span>
          {artifactLineDiff.summary.changed} changed / {artifactLineDiff.summary.added} added /{' '}
          {artifactLineDiff.summary.removed} removed
        </span>
      </header>
      <div className="wfr-gowoori-chat__artifact-diff-grid">
        <div className="wfr-gowoori-chat__artifact-diff-heading">{leftLabel}</div>
        <div className="wfr-gowoori-chat__artifact-diff-heading">{rightLabel}</div>
        {artifactLineDiff.lines.length > 0 ? (
          artifactLineDiff.lines.map((line) => (
            <React.Fragment key={`${title}-${line.lineNumber}`}>
              <code className={getArtifactDiffLineClass(line.status)}>
                <span>{formatArtifactLineNumber(line.packageLineNumber)}</span>
                <b>{line.status}</b>
                <em>{line.packageText || ' '}</em>
              </code>
              <code className={getArtifactDiffLineClass(line.status)}>
                <span>{formatArtifactLineNumber(line.currentLineNumber)}</span>
                <b>{line.status}</b>
                <em>{line.currentText || ' '}</em>
              </code>
            </React.Fragment>
          ))
        ) : (
          <div className="wfr-gowoori-chat__artifact-diff-empty">No compared artifact source is available.</div>
        )}
      </div>
    </section>
  );
}

interface GowooriRestoredPackagePanelProps {
  restoredPackageSummary: RestoredQualityPackageSummary | null;
  restoredPackageDiff: RestoredQualityPackageDiff | null;
  restoredPackageDrilldown: RestoredQualityArtifactDrilldown | null;
  restoredPackageRepairResult: GowooriRestoredPackageRepairResult | null;
  restoredPackageDiffHistory: RestoredQualityPackageDiffHistoryItem[];
  showRestoredPackageDiff: boolean;
  onToggleRestoredPackageDiff: () => void;
  onCopyRestoredPackageDiffReport: () => void | Promise<void>;
  onSaveRestoredPackageDiffReport: () => void;
  onSelectProviderDiff: (provider: string) => void;
  onSelectCaseDiff: (caseTitle: string) => void;
  onSelectScorecardDiff: (provider: string) => void;
  onSelectMatrixDiff: (provider: string, caseTitle: string) => void;
  onCopyRestoredArtifactSource: (side: RestoredArtifactSide) => void | Promise<void>;
  onCopyRestoredArtifactLine: CopyArtifactLineHandler;
  onApplyRestoredArtifactSource: (side: RestoredArtifactSide) => void | Promise<void>;
  onCopyRestoredArtifactReviewNote: () => void | Promise<void>;
  onSaveRestoredArtifactReviewNote: () => void;
  onInsertRestoredArtifactReviewNote: () => void;
  onRepairRestoredArtifactNow: () => void;
  onReopenRestoredPackageDiffHistoryItem: (item: RestoredQualityPackageDiffHistoryItem) => void;
  onOpenRestoredPackageRepairComparison: (item: RestoredQualityPackageDiffHistoryItem) => void;
  onCopyRestoredPackageDiffHistoryReport: (item: RestoredQualityPackageDiffHistoryItem) => void | Promise<void>;
  onSaveRestoredPackageDiffHistoryReport: (item: RestoredQualityPackageDiffHistoryItem) => void;
}

export function GowooriRestoredPackagePanel({
  restoredPackageSummary,
  restoredPackageDiff,
  restoredPackageDrilldown,
  restoredPackageRepairResult,
  restoredPackageDiffHistory,
  showRestoredPackageDiff,
  onToggleRestoredPackageDiff,
  onCopyRestoredPackageDiffReport,
  onSaveRestoredPackageDiffReport,
  onSelectProviderDiff,
  onSelectCaseDiff,
  onSelectScorecardDiff,
  onSelectMatrixDiff,
  onCopyRestoredArtifactSource,
  onCopyRestoredArtifactLine,
  onApplyRestoredArtifactSource,
  onCopyRestoredArtifactReviewNote,
  onSaveRestoredArtifactReviewNote,
  onInsertRestoredArtifactReviewNote,
  onRepairRestoredArtifactNow,
  onReopenRestoredPackageDiffHistoryItem,
  onOpenRestoredPackageRepairComparison,
  onCopyRestoredPackageDiffHistoryReport,
  onSaveRestoredPackageDiffHistoryReport,
}: GowooriRestoredPackagePanelProps) {
  if (!restoredPackageSummary && restoredPackageDiffHistory.length === 0) {
    return null;
  }

  const scorecardChanges =
    restoredPackageDiff?.scorecardChanges
      .filter((item) => item.recommendationChanged || item.scoreDelta !== 0 || item.rankDelta !== 0)
      .slice(0, 6) ?? [];
  const matrixChanges = restoredPackageDiff?.matrixChanges.filter((item) => item.changed).slice(0, 8) ?? [];
  const activeRepairResult =
    restoredPackageDrilldown &&
    restoredPackageRepairResult &&
    restoredPackageRepairResult.provider === restoredPackageDrilldown.provider &&
    restoredPackageRepairResult.caseTitle === restoredPackageDrilldown.caseTitle
      ? restoredPackageRepairResult
      : null;
  const packageToRepairedLineDiff =
    activeRepairResult && restoredPackageDrilldown
      ? createArtifactLineDiff(restoredPackageDrilldown.packageSource, activeRepairResult.source)
      : null;
  const currentToRepairedLineDiff =
    activeRepairResult && restoredPackageDrilldown
      ? createArtifactLineDiff(restoredPackageDrilldown.currentSource, activeRepairResult.source)
      : null;

  return (
    <>
      {restoredPackageSummary && (
        <section className="wfr-gowoori-chat__restored-package" aria-label="Restored package">
          <header>
            <div>
              <strong>Restored package</strong>
              <span>{restoredPackageSummary.name}</span>
            </div>
            <div className="wfr-gowoori-chat__restored-package-actions">
              <span>{new Date(restoredPackageSummary.importedAt).toLocaleString()}</span>
              <button type="button" onClick={onToggleRestoredPackageDiff}>
                {showRestoredPackageDiff ? 'Hide package diff' : 'View package diff'}
              </button>
              <button
                type="button"
                onClick={() => void onCopyRestoredPackageDiffReport()}
                disabled={!restoredPackageDiff}
              >
                Copy package diff
              </button>
              <button type="button" onClick={onSaveRestoredPackageDiffReport} disabled={!restoredPackageDiff}>
                Save package diff
              </button>
            </div>
          </header>
          <div className="wfr-gowoori-chat__restored-package-metrics">
            <span>
              <b>{restoredPackageSummary.retained}</b>retained
            </span>
            <span>
              <b>{restoredPackageSummary.missing}</b>missing
            </span>
            <span>
              <b>{restoredPackageSummary.outsidePackage}</b>outside package
            </span>
            <span>
              <b>
                {restoredPackageSummary.currentDelta > 0 ? '+' : ''}
                {restoredPackageSummary.currentDelta}
              </b>
              Current delta
            </span>
            <span>
              <b>
                {restoredPackageSummary.providerDelta > 0 ? '+' : ''}
                {restoredPackageSummary.providerDelta}
              </b>
              provider delta
            </span>
            <span>
              <b>{restoredPackageSummary.recommendedProviderChanged ? 'changed' : 'same'}</b>
              recommendation
            </span>
            <span>
              <b>{restoredPackageSummary.scorecardChangeCount}</b>scorecard changes
            </span>
            <span>
              <b>{restoredPackageSummary.matrixChangeCount}</b>matrix changes
            </span>
          </div>
          <p>
            Restored filter {restoredPackageSummary.provider} / {restoredPackageSummary.mode} /{' '}
            {restoredPackageSummary.caseTitle}. package baseline had {restoredPackageSummary.benchmarkTotal} run(s)
            across {restoredPackageSummary.benchmarkProviderCount} provider(s). Recommended provider{' '}
            {restoredPackageSummary.packageRecommendedProvider ?? 'none'} {'->'}{' '}
            {restoredPackageSummary.currentRecommendedProvider ?? 'none'}.
          </p>
          {showRestoredPackageDiff && restoredPackageDiff && (
            <div className="wfr-gowoori-chat__restored-package-diff">
              <section>
                <h4>Provider changes</h4>
                {restoredPackageDiff.providerChanges.slice(0, 6).map((item) => (
                  <button key={item.key} type="button" onClick={() => onSelectProviderDiff(item.key)}>
                    <strong>{item.label}</strong>
                    <span>
                      {item.total}/{item.baseline.total} run(s)
                    </span>
                    <em>
                      {item.delta >= 0 ? '+' : ''}
                      {item.delta}
                    </em>
                  </button>
                ))}
              </section>
              <section>
                <h4>Case changes</h4>
                {restoredPackageDiff.caseChanges.slice(0, 6).map((item) => (
                  <button key={item.key} type="button" onClick={() => onSelectCaseDiff(item.key)}>
                    <strong>{item.label}</strong>
                    <span>
                      {item.total}/{item.baseline.total} run(s)
                    </span>
                    <em>
                      {item.delta >= 0 ? '+' : ''}
                      {item.delta}
                    </em>
                  </button>
                ))}
              </section>
              <section>
                <h4>Status changes</h4>
                {restoredPackageDiff.statusChanges.map((item) => (
                  <article key={item.status}>
                    <strong>{item.status}</strong>
                    <span>
                      {item.current}/{item.baseline}
                    </span>
                    <em>
                      {item.delta >= 0 ? '+' : ''}
                      {item.delta}
                    </em>
                  </article>
                ))}
              </section>
              <section>
                <h4>Scorecard changes</h4>
                {scorecardChanges.length > 0 ? (
                  scorecardChanges.map((item) => (
                    <button key={item.provider} type="button" onClick={() => onSelectScorecardDiff(item.provider)}>
                      <strong>{item.provider}</strong>
                      <span>
                        {item.currentScore}/{item.packageScore} score
                      </span>
                      <em>{formatSignedNumber(item.scoreDelta)}</em>
                      <small>
                        {item.packageRecommendation} {'->'} {item.currentRecommendation}
                        {item.recommendationChanged ? ' / recommendation changed' : ''}
                      </small>
                    </button>
                  ))
                ) : (
                  <article>
                    <strong>No scorecard changes</strong>
                    <span>Package and current provider scores are aligned.</span>
                  </article>
                )}
              </section>
              <section>
                <h4>Matrix changes</h4>
                {matrixChanges.length > 0 ? (
                  matrixChanges.map((item) => (
                    <button
                      key={`${item.caseTitle}-${item.provider}`}
                      type="button"
                      onClick={() => onSelectMatrixDiff(item.provider, item.caseTitle)}
                    >
                      <strong>{item.caseTitle}</strong>
                      <span>{item.provider}</span>
                      <em>
                        {item.packageStatus} {'->'} {item.currentStatus}
                      </em>
                      <small>
                        diagnostics {item.packageDiagnostics} {'->'} {item.currentDiagnostics}
                      </small>
                    </button>
                  ))
                ) : (
                  <article>
                    <strong>No matrix changes</strong>
                    <span>Package and current case matrix statuses are aligned.</span>
                  </article>
                )}
              </section>
              <section>
                <h4>Package entries</h4>
                <article>
                  <strong>Missing from current log</strong>
                  <span>{restoredPackageDiff.missingEntries.length}</span>
                  <small>
                    {restoredPackageDiff.missingEntries
                      .slice(0, 3)
                      .map((entry) => entry.promptTitle)
                      .join(', ') || 'None'}
                  </small>
                </article>
                <article>
                  <strong>New outside package</strong>
                  <span>{restoredPackageDiff.outsideEntries.length}</span>
                  <small>
                    {restoredPackageDiff.outsideEntries
                      .slice(0, 3)
                      .map((entry) => entry.promptTitle)
                      .join(', ') || 'None'}
                  </small>
                </article>
              </section>
              {restoredPackageDrilldown && (
                <section className="wfr-gowoori-chat__restored-package-artifact-drilldown">
                  <header>
                    <div>
                      <h4>Artifact drilldown</h4>
                      <span>
                        {restoredPackageDrilldown.provider} / {restoredPackageDrilldown.caseTitle}
                      </span>
                    </div>
                    <div className="wfr-gowoori-chat__artifact-drilldown-actions">
                      <small>
                        {restoredPackageDrilldown.packageStatus} ({restoredPackageDrilldown.packageDiagnostics}){' -> '}
                        {restoredPackageDrilldown.currentStatus} ({restoredPackageDrilldown.currentDiagnostics})
                      </small>
                      <button
                        type="button"
                        onClick={() => void onCopyRestoredArtifactReviewNote()}
                        disabled={!restoredPackageDrilldown.hasArtifactComparison}
                      >
                        Copy review note
                      </button>
                      <button
                        type="button"
                        onClick={onSaveRestoredArtifactReviewNote}
                        disabled={!restoredPackageDrilldown.hasArtifactComparison}
                      >
                        Save review note
                      </button>
                      <button
                        type="button"
                        onClick={onInsertRestoredArtifactReviewNote}
                        disabled={!restoredPackageDrilldown.hasArtifactComparison}
                      >
                        Insert review note
                      </button>
                      <button
                        type="button"
                        onClick={onRepairRestoredArtifactNow}
                        disabled={!restoredPackageDrilldown.hasArtifactComparison}
                      >
                        Repair now
                      </button>
                    </div>
                  </header>
                  <div className="wfr-gowoori-chat__restored-package-artifacts">
                    <article>
                      <strong>Package artifact</strong>
                      <span>{restoredPackageDrilldown.packageEntry?.id ?? 'No package entry'}</span>
                      <div className="wfr-gowoori-chat__restored-package-artifact-actions">
                        <button
                          type="button"
                          onClick={() => void onCopyRestoredArtifactSource('package')}
                          disabled={!restoredPackageDrilldown.packageSource}
                        >
                          Copy package source
                        </button>
                        <button
                          type="button"
                          onClick={() => void onApplyRestoredArtifactSource('package')}
                          disabled={!restoredPackageDrilldown.packageSource}
                        >
                          Apply package artifact
                        </button>
                      </div>
                    </article>
                    <article>
                      <strong>Current artifact</strong>
                      <span>{restoredPackageDrilldown.currentEntry?.id ?? 'No current entry'}</span>
                      <div className="wfr-gowoori-chat__restored-package-artifact-actions">
                        <button
                          type="button"
                          onClick={() => void onCopyRestoredArtifactSource('current')}
                          disabled={!restoredPackageDrilldown.currentSource}
                        >
                          Copy current source
                        </button>
                        <button
                          type="button"
                          onClick={() => void onApplyRestoredArtifactSource('current')}
                          disabled={!restoredPackageDrilldown.currentSource}
                        >
                          Apply current artifact
                        </button>
                      </div>
                    </article>
                    {activeRepairResult && (
                      <article>
                        <strong>Repaired artifact</strong>
                        <span>{activeRepairResult.summary}</span>
                        <small>{new Date(activeRepairResult.createdAt).toLocaleString()}</small>
                        <div className="wfr-gowoori-chat__restored-package-artifact-actions">
                          <button
                            type="button"
                            onClick={() => void onCopyRestoredArtifactSource('repaired')}
                            disabled={!activeRepairResult.source}
                          >
                            Copy repaired source
                          </button>
                          <button
                            type="button"
                            onClick={() => void onApplyRestoredArtifactSource('repaired')}
                            disabled={!activeRepairResult.source}
                          >
                            Apply repaired artifact
                          </button>
                        </div>
                      </article>
                    )}
                  </div>
                  {renderArtifactLineDiff(
                    restoredPackageDrilldown,
                    onCopyRestoredArtifactLine,
                    onApplyRestoredArtifactSource,
                  )}
                  {packageToRepairedLineDiff &&
                    renderReadOnlyArtifactLineDiff(
                      'Package -> repaired',
                      'Package',
                      'Repaired',
                      packageToRepairedLineDiff,
                    )}
                  {currentToRepairedLineDiff &&
                    renderReadOnlyArtifactLineDiff(
                      'Current -> repaired',
                      'Current',
                      'Repaired',
                      currentToRepairedLineDiff,
                    )}
                </section>
              )}
            </div>
          )}
        </section>
      )}
      {restoredPackageDiffHistory.length > 0 && (
        <section className="wfr-gowoori-chat__package-diff-history" aria-label="Package diff history">
          <header>
            <div>
              <strong>Package diff history</strong>
              <span>Session-only package comparisons</span>
            </div>
            <span>{restoredPackageDiffHistory.length} import(s)</span>
          </header>
          <div>
            {restoredPackageDiffHistory.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.summary.name}</strong>
                  <span>{new Date(item.summary.importedAt).toLocaleString()}</span>
                  {item.repairResult && (
                    <span className="wfr-gowoori-chat__package-diff-history-badge">Repaired captured</span>
                  )}
                </div>
                <dl>
                  <div>
                    <dt>Current</dt>
                    <dd>{formatSignedNumber(item.summary.currentDelta)}</dd>
                  </div>
                  <div>
                    <dt>Providers</dt>
                    <dd>{formatSignedNumber(item.summary.providerDelta)}</dd>
                  </div>
                  <div>
                    <dt>Missing</dt>
                    <dd>{item.summary.missing}</dd>
                  </div>
                  <div>
                    <dt>Outside</dt>
                    <dd>{item.summary.outsidePackage}</dd>
                  </div>
                  <div>
                    <dt>Report</dt>
                    <dd>{item.report.length.toLocaleString()} chars</dd>
                  </div>
                  <div>
                    <dt>Last drilldown</dt>
                    <dd>
                      {item.drilldownRequest
                        ? `${item.drilldownRequest.provider}${item.drilldownRequest.caseTitle ? ` / ${item.drilldownRequest.caseTitle}` : ''}`
                        : 'None'}
                    </dd>
                  </div>
                  <div>
                    <dt>Repaired</dt>
                    <dd>{item.repairResult ? item.repairResult.caseTitle : 'None'}</dd>
                  </div>
                </dl>
                <div className="wfr-gowoori-chat__package-diff-history-actions">
                  <button type="button" onClick={() => onReopenRestoredPackageDiffHistoryItem(item)}>
                    Reopen diff
                  </button>
                  {item.repairResult && (
                    <button type="button" onClick={() => onOpenRestoredPackageRepairComparison(item)}>
                      Open repaired comparison
                    </button>
                  )}
                  <button type="button" onClick={() => void onCopyRestoredPackageDiffHistoryReport(item)}>
                    Copy report
                  </button>
                  <button type="button" onClick={() => onSaveRestoredPackageDiffHistoryReport(item)}>
                    Save report
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
