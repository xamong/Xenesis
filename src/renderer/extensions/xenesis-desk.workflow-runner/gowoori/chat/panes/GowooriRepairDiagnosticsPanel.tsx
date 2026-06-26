import React from 'react';
import type { GowooriArtifactComparison } from '../../agent/gowooriArtifactComparison';
import type { GowooriArtifactRepairDiagnostic } from '../../agent/gowooriArtifactRepair';

interface GowooriChatRepairDiagnostic {
  id: string;
  context: string;
  changed: boolean;
  renderable: boolean;
  diagnostics: GowooriArtifactRepairDiagnostic[];
}

interface GowooriRepairDiagnosticsPanelProps {
  repairComparisons: GowooriArtifactComparison[];
  repairDiagnostics: GowooriChatRepairDiagnostic[];
  onApplySourceToGowoori: (source: string, reason: string) => void | Promise<void>;
}

export function GowooriRepairDiagnosticsPanel({
  repairComparisons,
  repairDiagnostics,
  onApplySourceToGowoori,
}: GowooriRepairDiagnosticsPanelProps): React.ReactElement {
  return (
    <div className="wfr-gowoori-chat__repair-diagnostics">
      {repairComparisons.length > 0 && (
        <div className="wfr-gowoori-chat__repair-comparisons">
          {repairComparisons.map((comparison, index) => (
            <article key={`${comparison.context}-${index}`} className="wfr-gowoori-chat__repair-compare">
              <header>
                <strong>{comparison.context}</strong>
                <span>
                  {comparison.repaired.canApply ? 'repaired artifact is renderable' : 'repair still needs review'}
                </span>
              </header>
              <div className="wfr-gowoori-chat__repair-compare-grid">
                <section>
                  <div className="wfr-gowoori-chat__repair-compare-head">
                    <strong>Original</strong>
                    <span className={comparison.original.canApply ? 'is-ok' : 'is-error'}>
                      {comparison.original.canApply ? 'applicable' : 'blocked'}
                    </span>
                  </div>
                  <pre>{comparison.original.preview || '(empty)'}</pre>
                  <button
                    type="button"
                    disabled={!comparison.original.canApply}
                    onClick={() =>
                      void onApplySourceToGowoori(
                        comparison.original.source,
                        `GowooriChat original: ${comparison.context}`,
                      )
                    }
                  >
                    Apply original
                  </button>
                </section>
                <section>
                  <div className="wfr-gowoori-chat__repair-compare-head">
                    <strong>Repaired</strong>
                    <span className={comparison.repaired.canApply ? 'is-ok' : 'is-error'}>
                      {comparison.repaired.canApply ? 'applicable' : 'blocked'}
                    </span>
                  </div>
                  <pre>{comparison.repaired.preview || '(empty)'}</pre>
                  <button
                    type="button"
                    disabled={!comparison.repaired.canApply}
                    onClick={() =>
                      void onApplySourceToGowoori(
                        comparison.repaired.source,
                        `GowooriChat repaired: ${comparison.context}`,
                      )
                    }
                  >
                    Apply repaired
                  </button>
                </section>
              </div>
              <section className="wfr-gowoori-chat__repair-diff" aria-label="Repair diff">
                <header>
                  <strong>Repair diff</strong>
                  <span>{comparison.diff.length.toLocaleString()} line(s)</span>
                </header>
                <pre>
                  {comparison.diff.length === 0
                    ? 'No source changes.'
                    : comparison.diff.map((line, lineIndex) => {
                        const marker = line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' ';
                        const oldLine = line.oldLineNumber ? String(line.oldLineNumber).padStart(4, ' ') : '    ';
                        const newLine = line.newLineNumber ? String(line.newLineNumber).padStart(4, ' ') : '    ';
                        return (
                          <span key={`${line.kind}-${lineIndex}`} className={`is-${line.kind}`}>
                            <b>{marker}</b>
                            <em>{oldLine}</em>
                            <em>{newLine}</em>
                            <code>{line.text || ' '}</code>
                          </span>
                        );
                      })}
                </pre>
              </section>
            </article>
          ))}
        </div>
      )}
      {repairDiagnostics.length === 0 && repairComparisons.length === 0 ? (
        <p>
          No repair diagnostics yet. Gowoori will report normalization work here when provider output needs cleanup.
        </p>
      ) : (
        repairDiagnostics.map((entry) => (
          <article key={entry.id} className="wfr-gowoori-chat__repair-card">
            <header>
              <strong>{entry.context}</strong>
              <span>
                {entry.renderable ? 'renderable' : 'not renderable'}
                {entry.changed ? ' / changed' : ''}
              </span>
            </header>
            <ul>
              {entry.diagnostics.map((diagnostic, index) => (
                <li key={`${entry.id}-${index}`} className={`is-${diagnostic.severity}`}>
                  <span>{diagnostic.severity}</span>
                  <p>{diagnostic.message}</p>
                </li>
              ))}
            </ul>
          </article>
        ))
      )}
    </div>
  );
}
