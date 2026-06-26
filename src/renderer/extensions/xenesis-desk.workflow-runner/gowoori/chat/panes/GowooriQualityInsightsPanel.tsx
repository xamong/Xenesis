import React from 'react';
import { type GowooriProvider, getGowooriProviderDefinition } from '../../agent/gowooriProviders';
import type {
  GowooriBridgeMatrixSummary,
  GowooriProviderBenchmarkComparisonReport,
  GowooriProviderBenchmarkReport,
  GowooriProviderHealthDashboard,
  GowooriProviderReadinessItem,
  GowooriProviderReadinessReport,
  GowooriProviderScorecardReport,
  GowooriProviderTimelineReport,
  GowooriQualityLogEntry,
  GowooriQualityProviderSummary,
} from '../../agent/gowooriQualityLog';
import type { GowooriQualityCaseMatrixRow } from '../gowooriChatQualityState';

interface GowooriQualityInsightsPanelProps {
  bridgeMatrixSummary: GowooriBridgeMatrixSummary;
  qualityHealth: GowooriProviderHealthDashboard;
  providerReadiness: GowooriProviderReadinessReport;
  qualitySummaryProviders: GowooriQualityProviderSummary[];
  qualityBenchmark: GowooriProviderBenchmarkReport;
  qualityScorecard: GowooriProviderScorecardReport;
  benchmarkBestProvider: GowooriProvider | null;
  activeProvider: GowooriProvider;
  qualityCaseMatrix: GowooriQualityCaseMatrixRow[];
  benchmarkComparison: GowooriProviderBenchmarkComparisonReport | null;
  benchmarkBaselineName: string;
  qualityTimeline: GowooriProviderTimelineReport;
  selectedQualityProvider: string;
  onDrillIntoBridgeProvider: (provider: string) => void;
  onDrillIntoProviderReadiness: (entry: GowooriProviderReadinessItem) => void;
  onDrillIntoQualityEntry: (entry: GowooriQualityLogEntry) => void;
  onUseBestBenchmarkProvider: () => void;
}

export function GowooriQualityInsightsPanel({
  bridgeMatrixSummary,
  qualityHealth,
  providerReadiness,
  qualitySummaryProviders,
  qualityBenchmark,
  qualityScorecard,
  benchmarkBestProvider,
  activeProvider,
  qualityCaseMatrix,
  benchmarkComparison,
  benchmarkBaselineName,
  qualityTimeline,
  selectedQualityProvider,
  onDrillIntoBridgeProvider,
  onDrillIntoProviderReadiness,
  onDrillIntoQualityEntry,
  onUseBestBenchmarkProvider,
}: GowooriQualityInsightsPanelProps) {
  const qualityCaseMatrixHasData = qualityCaseMatrix.some((row) => row.providers.some((cell) => cell.entry));

  return (
    <>
      {providerReadiness.total > 0 && (
        <section className="wfr-gowoori-chat__provider-readiness" aria-label="Provider readiness">
          <header>
            <div>
              <strong>Provider readiness</strong>
              <span>Latest Settings/GowooriChat preflight smoke result per provider</span>
            </div>
            <span>
              {providerReadiness.ready} ready · {providerReadiness.blocked} blocked · {providerReadiness.unknown}{' '}
              unknown
            </span>
          </header>
          <div className="wfr-gowoori-chat__provider-readiness-grid">
            {providerReadiness.providers.map((item) => (
              <article
                key={item.provider}
                className={`is-${item.state}${item.provider === activeProvider ? ' is-current' : ''}${item.provider === selectedQualityProvider ? ' is-filtered' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => onDrillIntoProviderReadiness(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onDrillIntoProviderReadiness(item);
                  }
                }}
              >
                <header>
                  <strong>
                    {getGowooriProviderDefinition(item.provider as GowooriProvider).label ?? item.provider}
                  </strong>
                  <span>{item.state}</span>
                </header>
                <p>{item.summary}</p>
                <footer>
                  <span>
                    {item.latestCompletedAt ? new Date(item.latestCompletedAt).toLocaleString() : 'Not tested'}
                  </span>
                  {item.provider === activeProvider && <b>active</b>}
                </footer>
                {item.diagnosticSummary && <em>{item.diagnosticSummary}</em>}
              </article>
            ))}
          </div>
        </section>
      )}
      {bridgeMatrixSummary.total > 0 && (
        <section className="wfr-gowoori-chat__bridge-matrix-summary" aria-label="Bridge Matrix Summary">
          <header>
            <div>
              <strong>Bridge Matrix Summary</strong>
              <span>Imported dev bridge smoke runs only</span>
            </div>
            <span>{bridgeMatrixSummary.total} run(s)</span>
          </header>
          <div className="wfr-gowoori-chat__bridge-matrix-metrics">
            <span>
              <b>{bridgeMatrixSummary.passRate}%</b>passed
            </span>
            <span>
              <b>{bridgeMatrixSummary.failed}</b>failed
            </span>
            <span>
              <b>{bridgeMatrixSummary.repairSuccessRate}%</b>repair success
            </span>
            <span>
              <b>{bridgeMatrixSummary.averageDurationMs}ms</b>avg
            </span>
          </div>
          <div className="wfr-gowoori-chat__bridge-matrix-meter" aria-label="Bridge matrix pass rate">
            <i style={{ width: `${bridgeMatrixSummary.passRate}%` }} />
          </div>
          {bridgeMatrixSummary.providers.length > 0 && (
            <div className="wfr-gowoori-chat__bridge-matrix-providers">
              {bridgeMatrixSummary.providers.map((item) => (
                <article
                  key={item.provider}
                  className={item.failed > 0 ? 'is-risk' : 'is-good'}
                  role="button"
                  tabIndex={0}
                  onClick={() => onDrillIntoBridgeProvider(item.provider)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onDrillIntoBridgeProvider(item.provider);
                    }
                  }}
                >
                  <header>
                    <strong>{item.provider}</strong>
                    <span>{item.passRate}% pass</span>
                  </header>
                  <p>
                    {item.passed}/{item.total} passed · {item.repairSucceeded}/{item.repairAttempted} repair success ·{' '}
                    {item.averageDurationMs}ms avg
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {qualityHealth.providers.length > 0 && (
        <section className="wfr-gowoori-chat__quality-health" aria-label="Provider health dashboard">
          <header>
            <div>
              <strong>Provider health</strong>
              <span>
                Recent success {qualityHealth.recent.successRate}% / trend {qualityHealth.recent.trendDirection}
                {qualityHealth.recent.trendDelta !== 0
                  ? ` (${qualityHealth.recent.trendDelta > 0 ? '+' : ''}${qualityHealth.recent.trendDelta}%)`
                  : ''}
              </span>
            </div>
            <span>{qualityHealth.recent.total} recent run(s)</span>
          </header>
          <div className="wfr-gowoori-chat__quality-health-grid">
            {qualityHealth.providers.map((item) => (
              <article key={item.provider} className={`is-${item.health}`}>
                <header>
                  <strong>{item.provider}</strong>
                  <span>{item.health}</span>
                </header>
                <div className="wfr-gowoori-chat__quality-health-metrics">
                  <span>
                    <b>{item.successRate}%</b>success
                  </span>
                  <span>
                    <b>{item.recentSuccessRate}%</b>recent
                  </span>
                  <span>
                    <b>{item.repairSuccessRate}%</b>repair
                  </span>
                  <span>
                    <b>{item.averageDurationMs}ms</b>avg
                  </span>
                </div>
                <div
                  className="wfr-gowoori-chat__quality-health-meter"
                  aria-label={`${item.provider} recent success rate`}
                >
                  <i style={{ width: `${item.recentSuccessRate}%` }} />
                </div>
                <p>
                  {item.repairAttempted > 0
                    ? `${item.repairSucceeded}/${item.repairAttempted} automatic repair(s) succeeded.`
                    : 'No automatic repair attempt recorded.'}
                </p>
              </article>
            ))}
          </div>
          {qualityHealth.topDiagnostics.length > 0 && (
            <div className="wfr-gowoori-chat__quality-health-diagnostics">
              <strong>Failure signals</strong>
              {qualityHealth.topDiagnostics.map((diagnostic) => (
                <span key={`health-${diagnostic.severity}-${diagnostic.message}`}>
                  <b>{diagnostic.count}x</b>
                  {diagnostic.message}
                  <em>{diagnostic.providers.join(', ')}</em>
                </span>
              ))}
            </div>
          )}
        </section>
      )}
      {qualitySummaryProviders.length > 0 && (
        <div className="wfr-gowoori-chat__quality-providers">
          {qualitySummaryProviders.map((item) => (
            <article key={item.provider}>
              <header>
                <strong>{item.provider}</strong>
                <span>{item.total} run(s)</span>
              </header>
              <div>
                <span>{item.stable} stable</span>
                <span>{item.repaired} repaired</span>
                <span>{item.blocked} blocked</span>
                <span>{item.averageDurationMs}ms avg</span>
              </div>
            </article>
          ))}
        </div>
      )}
      {qualityScorecard.providers.length > 0 && (
        <section className="wfr-gowoori-chat__provider-scorecard" aria-label="Provider scorecard">
          <header>
            <div>
              <strong>Provider scorecard</strong>
              <span>
                {qualityScorecard.recommendedProvider
                  ? `Recommended provider: ${qualityScorecard.recommendedProvider}`
                  : 'No recommended provider yet'}
              </span>
            </div>
            <span>{qualityScorecard.total.toLocaleString()} scored run(s)</span>
          </header>
          <div className="wfr-gowoori-chat__provider-scorecard-groups">
            <span className="is-recommended">
              <b>{qualityScorecard.recommended.length}</b>recommended
            </span>
            <span className="is-watch">
              <b>{qualityScorecard.watch.length}</b>watch
            </span>
            <span className="is-risk">
              <b>{qualityScorecard.risk.length}</b>risk
            </span>
          </div>
          <div className="wfr-gowoori-chat__provider-scorecard-grid">
            {qualityScorecard.providers.map((item) => (
              <article
                key={item.provider}
                className={`is-${item.recommendation}${item.provider === activeProvider ? ' is-current' : ''}`}
              >
                <header>
                  <strong>
                    {item.rank}. {item.provider}
                  </strong>
                  <span>{item.recommendation}</span>
                </header>
                {item.provider === activeProvider && (
                  <p className="wfr-gowoori-chat__quality-current-provider">Current active provider</p>
                )}
                <div className="wfr-gowoori-chat__provider-scorecard-metrics">
                  <span>
                    <b>{item.score}</b>score
                  </span>
                  <span>
                    <b>{item.successRate}%</b>success
                  </span>
                  <span>
                    <b>{item.stableFirstRate}%</b>stable-first
                  </span>
                  <span>
                    <b>{item.repairDependencyRate}%</b>repair dependency
                  </span>
                  <span>
                    <b>{item.blockRate}%</b>blocked
                  </span>
                  <span>
                    <b>{item.averageDurationMs}ms</b>avg
                  </span>
                </div>
                <div className="wfr-gowoori-chat__provider-scorecard-meter" aria-label={`${item.provider} score`}>
                  <i style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} />
                </div>
                <p>{item.reason}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      {qualityBenchmark.providers.length > 0 && (
        <section className="wfr-gowoori-chat__quality-benchmark" aria-label="Provider benchmark">
          <header>
            <div>
              <strong>Provider benchmark</strong>
              <span>
                {qualityBenchmark.bestProvider
                  ? `Best current provider: ${qualityBenchmark.bestProvider}`
                  : 'No benchmark winner yet'}
              </span>
            </div>
            <div className="wfr-gowoori-chat__quality-benchmark-header-actions">
              <span>{qualityBenchmark.total.toLocaleString()} run(s)</span>
              <button
                type="button"
                onClick={onUseBestBenchmarkProvider}
                disabled={!benchmarkBestProvider || benchmarkBestProvider === activeProvider}
                title={
                  !qualityBenchmark.bestProvider
                    ? 'Run a benchmark first.'
                    : !benchmarkBestProvider
                      ? `Unsupported benchmark provider: ${qualityBenchmark.bestProvider}`
                      : benchmarkBestProvider === activeProvider
                        ? 'The best benchmark provider is already active.'
                        : `Switch to ${getGowooriProviderDefinition(benchmarkBestProvider).label}`
                }
              >
                Use best provider
              </button>
            </div>
          </header>
          <div className="wfr-gowoori-chat__quality-benchmark-grid">
            {qualityBenchmark.providers.map((item, index) => (
              <article
                key={item.provider}
                className={`${item.provider === qualityBenchmark.bestProvider ? 'is-best' : ''}${item.provider === activeProvider ? ' is-current' : ''}`}
              >
                <header>
                  <strong>
                    {index + 1}. {item.provider}
                  </strong>
                  <span>
                    {item.provider === qualityBenchmark.bestProvider ? 'best' : `${item.successRate}% success`}
                  </span>
                </header>
                {item.provider === activeProvider && (
                  <p className="wfr-gowoori-chat__quality-current-provider">Current active provider</p>
                )}
                <div className="wfr-gowoori-chat__quality-rates">
                  <span>
                    <b>{item.stableRate}%</b>stable
                  </span>
                  <span>
                    <b>{item.repairRate}%</b>repair
                  </span>
                  <span>
                    <b>{item.blockRate}%</b>blocked
                  </span>
                  <span>
                    <b>{item.averageDurationMs}ms</b>avg
                  </span>
                </div>
                <div className="wfr-gowoori-chat__quality-meter" aria-label={`${item.provider} success rate`}>
                  <i style={{ width: `${item.successRate}%` }} />
                </div>
                {item.topDiagnostics.length > 0 ? (
                  <ul>
                    {item.topDiagnostics.slice(0, 3).map((diagnostic) => (
                      <li key={`${item.provider}-${diagnostic.severity}-${diagnostic.message}`}>
                        <span>{diagnostic.severity}</span>
                        <p>{diagnostic.message}</p>
                        <em>{diagnostic.count}x</em>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No diagnostics recorded.</p>
                )}
              </article>
            ))}
          </div>
          <section className="wfr-gowoori-chat__quality-case-matrix" aria-label="Provider/case matrix">
            <header>
              <div>
                <strong>Provider/case matrix</strong>
                <span>Latest acceptance result per case and provider</span>
              </div>
              <span>
                {qualityCaseMatrixHasData ? `${qualityCaseMatrix.length} case(s)` : 'No case-level benchmark data yet'}
              </span>
            </header>
            {qualityCaseMatrixHasData ? (
              <div className="wfr-gowoori-chat__quality-case-table">
                <div className="wfr-gowoori-chat__quality-case-row is-head">
                  <span>Case</span>
                  {qualityBenchmark.providers.map((item) => (
                    <span key={item.provider}>{item.provider}</span>
                  ))}
                </div>
                {qualityCaseMatrix.map((row) => (
                  <div key={row.id} className="wfr-gowoori-chat__quality-case-row">
                    <strong>{row.title}</strong>
                    {row.providers.map((cell) => {
                      const entry = cell.entry;
                      return (
                        <button
                          key={`${row.id}-${cell.provider}`}
                          type="button"
                          className={`case-cell is-${entry?.status ?? 'missing'}`}
                          onClick={() => entry && onDrillIntoQualityEntry(entry)}
                          disabled={!entry}
                          title={
                            entry
                              ? `${cell.provider} / ${row.title}: ${entry.status}, ${entry.diagnosticsCount} diagnostic(s), ${entry.durationMs}ms`
                              : `${cell.provider} has no recorded ${row.title} run.`
                          }
                        >
                          <b>{entry?.status ?? '-'}</b>
                          <span>{entry ? `${entry.diagnosticsCount} diag / ${entry.durationMs}ms` : 'missing'}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <p className="wfr-gowoori-chat__quality-case-empty">
                No case-level benchmark data yet. Run the acceptance benchmark for one or more providers.
              </p>
            )}
          </section>
          {qualityBenchmark.topDiagnostics.length > 0 && (
            <div className="wfr-gowoori-chat__quality-top-diagnostics">
              <strong>Top diagnostics</strong>
              {qualityBenchmark.topDiagnostics.map((diagnostic) => (
                <span key={`${diagnostic.severity}-${diagnostic.message}`}>
                  <b>{diagnostic.count}x</b>
                  {diagnostic.message}
                  <em>{diagnostic.providers.join(', ')}</em>
                </span>
              ))}
            </div>
          )}
        </section>
      )}
      {benchmarkComparison && (
        <section className="wfr-gowoori-chat__quality-history-compare" aria-label="Benchmark history compare">
          <header>
            <div>
              <strong>Benchmark history compare</strong>
              <span>Baseline {benchmarkBaselineName || 'imported benchmark'} vs current quality log</span>
            </div>
            <span>
              {benchmarkComparison.currentTotal.toLocaleString()} current /{' '}
              {benchmarkComparison.baselineTotal.toLocaleString()} baseline
            </span>
          </header>
          <div className="wfr-gowoori-chat__quality-history-summary">
            <span className="is-improved">
              <b>{benchmarkComparison.improvementCount}</b>improved
            </span>
            <span className="is-regressed">
              <b>{benchmarkComparison.regressionCount}</b>regressed
            </span>
            <span className="is-new">
              <b>{benchmarkComparison.newProviderCount}</b>new provider
            </span>
            <span className="is-removed">
              <b>{benchmarkComparison.removedProviderCount}</b>removed provider
            </span>
            <span>
              <b>{benchmarkComparison.missingBaselineCount}</b>new case row
            </span>
          </div>
          <div className="wfr-gowoori-chat__quality-history-providers">
            {benchmarkComparison.providerDeltas.slice(0, 6).map((item) => (
              <article key={item.provider} className={`is-${item.trend}`}>
                <header>
                  <strong>{item.provider}</strong>
                  <span>{item.trend}</span>
                </header>
                <dl>
                  <div>
                    <dt>Success</dt>
                    <dd>
                      {item.baselineSuccessRate}%{' -> '}
                      {item.currentSuccessRate}% ({item.successRateDelta > 0 ? '+' : ''}
                      {item.successRateDelta}%)
                    </dd>
                  </div>
                  <div>
                    <dt>Blocked</dt>
                    <dd>
                      {item.baselineBlockRate}%{' -> '}
                      {item.currentBlockRate}% ({item.blockRateDelta > 0 ? '+' : ''}
                      {item.blockRateDelta}%)
                    </dd>
                  </div>
                  <div>
                    <dt>Runs</dt>
                    <dd>
                      {item.baselineTotal}
                      {' -> '}
                      {item.currentTotal} ({item.totalDelta > 0 ? '+' : ''}
                      {item.totalDelta})
                    </dd>
                  </div>
                  <div>
                    <dt>Avg time</dt>
                    <dd>
                      {item.averageDurationMsDelta > 0 ? '+' : ''}
                      {item.averageDurationMsDelta}ms
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          {benchmarkComparison.caseDeltas.some((item) => item.trend !== 'flat') ? (
            <div className="wfr-gowoori-chat__quality-history-cases">
              {benchmarkComparison.caseDeltas
                .filter((item) => item.trend !== 'flat')
                .slice(0, 8)
                .map((item) => (
                  <article key={`${item.caseId}-${item.provider}`} className={`is-${item.trend}`}>
                    <header>
                      <strong>{item.caseTitle}</strong>
                      <span>
                        {item.provider} / {item.trend}
                      </span>
                    </header>
                    <p>
                      {item.baselineStatus}
                      {' -> '}
                      {item.currentStatus}
                    </p>
                    <small>
                      Diagnostics {item.diagnosticsDelta > 0 ? '+' : ''}
                      {item.diagnosticsDelta}
                      {' / '}
                      Duration {item.durationMsDelta > 0 ? '+' : ''}
                      {item.durationMsDelta}ms
                      {item.successChanged ? ' / success changed' : ''}
                    </small>
                  </article>
                ))}
            </div>
          ) : (
            <p className="wfr-gowoori-chat__quality-history-empty">
              No case-level regressions or improvements compared with the imported baseline.
            </p>
          )}
        </section>
      )}
      {qualityTimeline.points.length > 0 && (
        <section className="wfr-gowoori-chat__quality-timeline" aria-label="Provider comparison timeline">
          <header>
            <div>
              <strong>Provider timeline</strong>
              <span>Recent {qualityTimeline.total.toLocaleString()} run(s), oldest to newest</span>
            </div>
            <span>{selectedQualityProvider === 'all' ? 'All providers' : selectedQualityProvider}</span>
          </header>
          <div className="wfr-gowoori-chat__quality-timeline-tracks">
            {qualityTimeline.providers.map((track) => (
              <article key={track.provider}>
                <header>
                  <strong>{track.provider}</strong>
                  <span>
                    {track.total} run(s) / avg {track.averageDurationMs}ms
                  </span>
                </header>
                <div className="wfr-gowoori-chat__quality-timeline-points">
                  {qualityTimeline.points
                    .filter((point) => point.provider === track.provider)
                    .map((point) => (
                      <span
                        key={point.id}
                        className={`wfr-gowoori-chat__quality-timeline-point is-${point.status}`}
                        title={[point.promptTitle, point.status, `${point.durationMs}ms`, point.diagnosticSummary]
                          .filter(Boolean)
                          .join(' · ')}
                      >
                        <b>
                          {new Date(point.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </b>
                        <i>{point.mode}</i>
                      </span>
                    ))}
                </div>
                <footer>
                  <span>{track.stable} stable</span>
                  <span>{track.repaired} repaired</span>
                  <span>{track.blocked} blocked</span>
                  <span>{track.applied} applied</span>
                </footer>
              </article>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
