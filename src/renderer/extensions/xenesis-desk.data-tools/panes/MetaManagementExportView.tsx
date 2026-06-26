import React from 'react';

export type MetaManagementExportSection = 'templates' | 'attributes' | 'instances' | 'relations';

export interface MetaManagementExportSectionOption {
  id: MetaManagementExportSection;
  label: string;
}

export interface MetaManagementExportSummaryItem {
  label: string;
  value: number;
}

export interface MetaManagementExportViewProps {
  exportSections: MetaManagementExportSectionOption[];
  exportSummary: MetaManagementExportSummaryItem[];
  exportScope: Record<MetaManagementExportSection, boolean>;
  exportJson: string;
  copyStatus: string;
  onCopyExportJson: () => void | Promise<void>;
  onDownloadExportJson: () => void;
  onToggleExportSection: (section: MetaManagementExportSection) => void;
}

export function MetaManagementExportView({
  exportSections,
  exportSummary,
  exportScope,
  exportJson,
  copyStatus,
  onCopyExportJson,
  onDownloadExportJson,
  onToggleExportSection,
}: MetaManagementExportViewProps) {
  return (
    <div className="mm-xmdb-export">
      <div className="mm-xmdb-export-summary" aria-label="Export snapshot summary">
        {exportSummary.map((item) => (
          <span key={item.label}>
            {item.label} <strong>{item.value}</strong>
          </span>
        ))}
      </div>
      <div className="mm-xmdb-export-scope" aria-label="Export Scope">
        <strong>Export Scope</strong>
        {exportSections.map((section) => (
          <label key={section.id}>
            <input
              type="checkbox"
              checked={exportScope[section.id]}
              onChange={() => onToggleExportSection(section.id)}
            />
            <span>{section.label}</span>
          </label>
        ))}
      </div>
      <div className="mm-xmdb-actions">
        <button className="mm-btn-sm blue" type="button" onClick={onCopyExportJson}>
          Copy JSON
        </button>
        <button className="mm-btn-sm green" type="button" onClick={onDownloadExportJson}>
          Download
        </button>
        {copyStatus && <span className="mm-xmdb-status">{copyStatus}</span>}
      </div>
      <textarea className="mm-xmdb-json" value={exportJson} readOnly />
    </div>
  );
}
