import type { ImportHistoryEntry, ImportHistoryPolicyFilter } from '../metaManagementImportHistory';
import { buildImportHistoryAuditSummary, metaImportConflictResolutionLabel } from '../metaManagementImportHistory';
import type { MetaImportConflictPolicy, MetaRecord } from '../metaManagementProvider';
import type { MetaManagementImportTools } from '../useMetaManagementImport';

export interface MetaManagementImportViewProps {
  selectedNode: MetaRecord | null;
  tools: MetaManagementImportTools;
  copyStatus: string;
  canPreviewImport: boolean;
  canApplyImport: boolean;
}

function formatChangeValue(value: unknown): string {
  const text = value === undefined || value === null || value === '' ? '(empty)' : String(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

function ConflictChangeList({ conflict }: { conflict: MetaRecord }) {
  const changes = Array.isArray(conflict.changes) ? (conflict.changes as MetaRecord[]) : [];
  if (changes.length === 0) return null;
  return (
    <div className="mm-xmdb-change-list">
      <strong>Field Changes</strong>
      {changes.slice(0, 5).map((change, index) => (
        <div key={`${change.field ?? 'field'}-${index}`} className="mm-xmdb-change-row">
          <span className="mm-xmdb-change-field">{change.field ?? '-'}</span>
          <span className="mm-xmdb-change-value">{formatChangeValue(change.before)}</span>
          <span className="mm-xmdb-change-arrow">-&gt;</span>
          <span className="mm-xmdb-change-value">{formatChangeValue(change.after)}</span>
        </div>
      ))}
      {changes.length > 5 && <div className="mm-xmdb-change-more">Showing 5 of {changes.length} field changes.</div>}
    </div>
  );
}

function ImportHistoryAudit({ entry }: { entry: ImportHistoryEntry }) {
  const auditSummary = buildImportHistoryAuditSummary(entry);
  const changedRowsDetail = Array.isArray(auditSummary.changedRowsDetail)
    ? (auditSummary.changedRowsDetail as MetaRecord[])
    : [];
  const conflictResolutions = Array.isArray(auditSummary.conflictResolutions)
    ? (auditSummary.conflictResolutions as MetaRecord[])
    : [];
  const warnings = Array.isArray(auditSummary.warnings) ? (auditSummary.warnings as string[]) : [];
  return (
    <details className="mm-xmdb-import-audit">
      <summary>Import Audit Details</summary>
      <div className="mm-xmdb-import-audit-section">
        <strong>Changed Rows</strong>
        <div>
          {auditSummary.changedRows ?? entry.summary.changedRows} rows /{' '}
          {auditSummary.changedFields ?? entry.summary.changedFields} fields changed.
        </div>
        {changedRowsDetail.length === 0 ? (
          <div>No field-level changes were reported.</div>
        ) : (
          changedRowsDetail.slice(0, 6).map((change, index) => (
            <div key={`${change.code ?? 'change'}-${index}`} className="mm-xmdb-import-audit-conflict">
              <div className="mm-xmdb-conflict-meta">
                <span>{change.code ?? '-'}</span>
                <span>{change.changedFields ?? 0} field changes</span>
              </div>
              <ConflictChangeList conflict={change} />
            </div>
          ))
        )}
        {changedRowsDetail.length > 6 && <div>Showing 6 of {changedRowsDetail.length} changed rows.</div>}
      </div>
      <div className="mm-xmdb-import-audit-section">
        <strong>Conflict Resolutions</strong>
        {conflictResolutions.length === 0 ? (
          <div>No target conflicts were reported.</div>
        ) : (
          conflictResolutions.slice(0, 6).map((conflict, index) => (
            <div key={`${conflict.code ?? 'conflict'}-${index}`} className="mm-xmdb-import-audit-conflict">
              <div className="mm-xmdb-conflict-meta">
                <span className={`mm-xmdb-resolution-badge ${conflict.resolved === true ? 'resolved' : 'blocked'}`}>
                  {conflict.resolution ?? 'Blocked'}
                </span>
                <span>
                  {conflict.type ?? 'row'} {conflict.code ?? '-'}
                </span>
                <span>Existing UID {conflict.existingUID ?? '-'}</span>
                {conflict.sourceUID !== undefined && <span>Source UID {conflict.sourceUID}</span>}
              </div>
              <div>{conflict.message ?? 'Conflict resolution was recorded during import.'}</div>
            </div>
          ))
        )}
        {conflictResolutions.length > 6 && <div>Showing 6 of {conflictResolutions.length} conflict resolutions.</div>}
      </div>
      {Number(auditSummary.warningCount ?? warnings.length) > 0 && (
        <div className="mm-xmdb-import-audit-section warn">
          <strong>Warnings</strong>
          {warnings.slice(0, 6).map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
          {warnings.length > 6 && <div>Showing 6 of {warnings.length} warnings.</div>}
        </div>
      )}
    </details>
  );
}

export function MetaManagementImportView({
  selectedNode,
  tools,
  copyStatus,
  canPreviewImport,
  canApplyImport,
}: MetaManagementImportViewProps) {
  return (
    <div className="mm-xmdb-import">
      <textarea
        className="mm-xmdb-json"
        value={tools.importText}
        onChange={(event) => tools.changeImportText(event.target.value)}
        placeholder="Paste a XMDB assist JSON snapshot to preview it."
      />
      <div className={`mm-xmdb-import-result${tools.importPreview.ok ? ' ok' : ' error'}`}>
        {tools.importPreview.ok && tools.importPreview.summary
          ? `Valid snapshot: ${tools.importPreview.summary.templates} templates, ${tools.importPreview.summary.attributes} attributes, ${tools.importPreview.summary.instances} instances, ${tools.importPreview.summary.relations} relations.`
          : tools.importPreview.error}
      </div>
      {tools.importContextSummary && (
        <div className="mm-xmdb-import-context" aria-label="Import Context">
          <div className="mm-xmdb-import-context-card">
            <strong>Source Snapshot</strong>
            <span>{tools.importContextSummary.sourceLabel}</span>
            <small>{tools.importContextSummary.sourceMeta}</small>
          </div>
          <div className="mm-xmdb-import-context-card">
            <strong>Target Node</strong>
            <span>{tools.importContextSummary.targetLabel}</span>
            <small>{tools.importContextSummary.targetMeta}</small>
          </div>
          <div className="mm-xmdb-import-context-card">
            <strong>Exported</strong>
            <span>{tools.importContextSummary.exportedAt}</span>
            <small>Snapshot timestamp</small>
          </div>
        </div>
      )}
      {tools.importPlan.ok && (
        <div className="mm-xmdb-plan">
          <div className="mm-xmdb-plan-head">
            <strong>Batch Plan</strong>
            <span>{tools.importPlan.summary.totalItems} insert items</span>
            <div className="mm-xmdb-plan-actions">
              <label className="mm-xmdb-policy">
                <span>Import Policy</span>
                <select
                  value={tools.conflictPolicy}
                  onChange={(event) => tools.changeConflictPolicy(event.target.value as MetaImportConflictPolicy)}
                >
                  <option value="insert">Insert Duplicates</option>
                  <option value="merge">Merge Existing</option>
                  <option value="update">Update Existing</option>
                </select>
              </label>
              <button className="mm-btn-sm blue" type="button" onClick={tools.copyBatchItems}>
                Copy Batch Items
              </button>
              <button
                className="mm-btn-sm blue"
                type="button"
                onClick={tools.previewImportSnapshot}
                disabled={!canPreviewImport || tools.isPreviewing || tools.isApplying || !selectedNode}
              >
                {tools.isPreviewing ? 'Checking...' : 'Server Dry Run'}
              </button>
              <button
                className="mm-btn-sm green"
                type="button"
                onClick={tools.applyImportSnapshot}
                disabled={
                  !canApplyImport ||
                  tools.isApplying ||
                  tools.isPreviewing ||
                  !selectedNode ||
                  !tools.hasFreshDryRun ||
                  tools.hasBlockingConflicts
                }
              >
                {tools.isApplying ? 'Applying...' : 'Apply Import'}
              </button>
            </div>
          </div>
          {!selectedNode && (
            <div className="mm-xmdb-plan-warning">Select a target node before applying the import.</div>
          )}
          {selectedNode && !tools.hasFreshDryRun && (
            <div className="mm-xmdb-plan-warning">Run Server Dry Run before applying this import.</div>
          )}
          {tools.hasBlockingConflicts && (
            <div className="mm-xmdb-plan-warning">
              Resolve conflicts by choosing Merge Existing or Update Existing, then run Server Dry Run again.
            </div>
          )}
          {tools.importPlan.warnings.map((warning) => (
            <div key={warning} className="mm-xmdb-plan-warning">
              {warning}
            </div>
          ))}
          {tools.importStatus && (
            <div
              className={`mm-xmdb-import-result${tools.unresolvedConflicts.length ? ' error' : tools.serverWarnings.length ? ' warn' : ' ok'}`}
            >
              {tools.importStatus}
            </div>
          )}
          {tools.serverPreview && tools.serverPreviewPhase === 'applied' && (
            <div className="mm-xmdb-applied-summary" aria-label="Applied Result Summary">
              <div className="mm-xmdb-applied-summary-head">
                <strong>Applied Result Summary</strong>
                <span>Actual import result after refresh.</span>
              </div>
              <div className="mm-xmdb-server-preview-grid">
                <span>
                  Inserted <strong>{tools.serverPreview.inserted ?? 0}</strong>
                </span>
                <span>
                  Templates <strong>{tools.serverPreview.insertedTemplates ?? 0}</strong>
                </span>
                <span>
                  Attributes <strong>{tools.serverPreview.insertedAttributes ?? 0}</strong>
                </span>
                <span>
                  Instances <strong>{tools.serverPreview.insertedInstances ?? 0}</strong>
                </span>
                <span>
                  Reused <strong>{tools.serverPreview.reusedConflicts ?? 0}</strong>
                </span>
                <span>
                  Updated <strong>{tools.serverPreview.updatedConflicts ?? 0}</strong>
                </span>
                <span>
                  Changed <strong>{tools.serverPreview.changedFields ?? 0}</strong>
                </span>
                <span>
                  Skipped <strong>{tools.serverPreview.skippedAttributes ?? 0}</strong>
                </span>
              </div>
              {tools.serverWarnings.length > 0 && (
                <div className="mm-xmdb-server-preview-section warn">
                  <strong>Warnings</strong>
                  {tools.serverWarnings.slice(0, 6).map((warning: string) => (
                    <div key={warning}>{warning}</div>
                  ))}
                  {tools.serverWarnings.length > 6 && <div>Showing 6 of {tools.serverWarnings.length} warnings.</div>}
                </div>
              )}
            </div>
          )}
          {tools.serverPreview && tools.serverPreviewPhase === 'dryRun' && (
            <div className="mm-xmdb-server-preview">
              <div className="mm-xmdb-server-preview-grid">
                <span>
                  Templates <strong>{tools.serverPreview.insertedTemplates ?? 0}</strong>
                </span>
                <span>
                  Attributes <strong>{tools.serverPreview.insertedAttributes ?? 0}</strong>
                </span>
                <span>
                  Instances <strong>{tools.serverPreview.insertedInstances ?? 0}</strong>
                </span>
                <span>
                  Reused <strong>{tools.serverPreview.reusedConflicts ?? 0}</strong>
                </span>
                <span>
                  Updated <strong>{tools.serverPreview.updatedConflicts ?? 0}</strong>
                </span>
                <span>
                  Changed <strong>{tools.serverPreview.changedFields ?? 0}</strong>
                </span>
                <span>
                  Skipped <strong>{tools.serverPreview.skippedAttributes ?? 0}</strong>
                </span>
              </div>
              {tools.serverConflicts.length > 0 && (
                <div className="mm-xmdb-server-preview-section error">
                  <strong>Conflicts</strong>
                  <div className="mm-xmdb-conflict-summary" aria-label="Conflict Resolution Summary">
                    <span>
                      Total <strong>{tools.conflictSummary.total}</strong>
                    </span>
                    <span>
                      Blocked <strong>{tools.conflictSummary.blocked}</strong>
                    </span>
                    <span>
                      Reused <strong>{tools.conflictSummary.reused}</strong>
                    </span>
                    <span>
                      Updated <strong>{tools.conflictSummary.updated}</strong>
                    </span>
                    <span>
                      Changed <strong>{tools.conflictSummary.changedFields}</strong>
                    </span>
                  </div>
                  {tools.serverConflicts.slice(0, 6).map((conflict: MetaRecord, index: number) => (
                    <div key={`${conflict.CODE ?? 'conflict'}-${index}`} className="mm-xmdb-conflict-card">
                      <div className="mm-xmdb-conflict-meta">
                        <span
                          className={`mm-xmdb-resolution-badge ${conflict.resolved === true ? 'resolved' : 'blocked'}`}
                        >
                          Resolution: {metaImportConflictResolutionLabel(conflict)}
                        </span>
                        <span>Existing UID {conflict.existingUID ?? '-'}</span>
                        {conflict.sourceUID !== undefined && <span>Source UID {conflict.sourceUID}</span>}
                        {(conflict.changedFields ?? 0) > 0 && <span>{conflict.changedFields} field changes</span>}
                      </div>
                      <div>{conflict.message ?? `${conflict.CODE ?? '-'} already exists.`}</div>
                      <ConflictChangeList conflict={conflict} />
                    </div>
                  ))}
                  {tools.serverConflicts.length > 6 && (
                    <div>Showing 6 of {tools.serverConflicts.length} conflicts.</div>
                  )}
                </div>
              )}
              {tools.serverWarnings.length > 0 && (
                <div className="mm-xmdb-server-preview-section warn">
                  <strong>Warnings</strong>
                  {tools.serverWarnings.slice(0, 6).map((warning: string) => (
                    <div key={warning}>{warning}</div>
                  ))}
                  {tools.serverWarnings.length > 6 && <div>Showing 6 of {tools.serverWarnings.length} warnings.</div>}
                </div>
              )}
            </div>
          )}
          <textarea className="mm-xmdb-json" value={tools.batchJson} readOnly />
        </div>
      )}
      <div className="mm-xmdb-import-history" aria-label="Import Result History">
        <div className="mm-xmdb-import-history-head">
          <div>
            <strong>Import Result History</strong>
            <span>Recent applied imports retained locally.</span>
          </div>
        </div>
        <div className="mm-xmdb-import-history-toolbar">
          <label>
            <span>Target Filter</span>
            <select
              value={tools.importHistoryTargetFilter}
              onChange={(event) => tools.setImportHistoryTargetFilter(event.target.value)}
              disabled={tools.importHistory.length === 0}
            >
              <option value="all">All targets</option>
              {tools.importHistoryTargetOptions.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Policy Filter</span>
            <select
              value={tools.importHistoryPolicyFilter}
              onChange={(event) => tools.setImportHistoryPolicyFilter(event.target.value as ImportHistoryPolicyFilter)}
              disabled={tools.importHistory.length === 0}
            >
              <option value="all">All policies</option>
              <option value="insert">Insert Duplicates</option>
              <option value="merge">Merge Existing</option>
              <option value="update">Update Existing</option>
            </select>
          </label>
          <div className="mm-xmdb-import-history-actions">
            <button
              className="mm-btn-sm blue"
              type="button"
              onClick={tools.downloadImportHistory}
              disabled={tools.visibleImportHistory.length === 0}
            >
              Export History
            </button>
            <button
              className="mm-btn-sm"
              type="button"
              onClick={tools.clearImportHistory}
              disabled={tools.importHistory.length === 0}
            >
              Clear History
            </button>
          </div>
        </div>
        <div className="mm-xmdb-import-history-count">
          Showing {tools.visibleImportHistory.length} of {tools.importHistory.length} applied imports.
        </div>
        {tools.importHistory.length === 0 ? (
          <div className="mm-xmdb-empty">No applied imports yet.</div>
        ) : tools.visibleImportHistory.length === 0 ? (
          <div className="mm-xmdb-empty">No imports match the current filters.</div>
        ) : (
          <div className="mm-xmdb-import-history-list">
            {tools.visibleImportHistory.map((entry) => (
              <div key={entry.id} className="mm-xmdb-import-history-item">
                <div className="mm-xmdb-import-history-meta">
                  <strong>{entry.targetLabel}</strong>
                  <span>{entry.appliedAt}</span>
                  <span>{entry.policy}</span>
                </div>
                <div className="mm-xmdb-server-preview-grid">
                  <span>
                    Inserted <strong>{entry.summary.inserted}</strong>
                  </span>
                  <span>
                    Templates <strong>{entry.summary.templates}</strong>
                  </span>
                  <span>
                    Attributes <strong>{entry.summary.attributes}</strong>
                  </span>
                  <span>
                    Instances <strong>{entry.summary.instances}</strong>
                  </span>
                  <span>
                    Reused <strong>{entry.summary.reused}</strong>
                  </span>
                  <span>
                    Updated <strong>{entry.summary.updated}</strong>
                  </span>
                  <span>
                    Changed <strong>{entry.summary.changedFields}</strong>
                  </span>
                  <span>
                    Skipped <strong>{entry.summary.skipped}</strong>
                  </span>
                </div>
                <div className="mm-xmdb-import-history-foot">
                  <span>{entry.message}</span>
                  <button className="mm-btn-sm blue" type="button" onClick={() => tools.copyImportHistoryEntry(entry)}>
                    Copy Result
                  </button>
                </div>
                <ImportHistoryAudit entry={entry} />
              </div>
            ))}
          </div>
        )}
        {copyStatus && <span className="mm-xmdb-status">{copyStatus}</span>}
      </div>
    </div>
  );
}
