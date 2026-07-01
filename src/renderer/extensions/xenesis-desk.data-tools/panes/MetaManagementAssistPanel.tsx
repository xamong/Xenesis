import { useEffect, useMemo, useState } from 'react';
import {
  closeMetaAssistDialog,
  getMetaAssistDialogTitle,
  META_MANAGEMENT_ASSIST_ACTIONS,
  type MetaManagementAssistMode,
  openMetaAssistDialog,
} from '../metaManagementAssistPanelModel';
import { buildMetaFormFields, buildMetaFormPreviewRows, buildMetaRelations } from '../metaManagementCmdbAssist';
import type { MetaActivityItem, MetaImportSnapshotOptions, MetaRecord } from '../metaManagementProvider';
import { useMetaManagementExport } from '../useMetaManagementExport';
import { useMetaManagementImport } from '../useMetaManagementImport';
import { MetaManagementActivityView } from './MetaManagementActivityView';
import { MetaManagementExportView } from './MetaManagementExportView';
import { MetaManagementFormView } from './MetaManagementFormView';
import { MetaManagementImportView } from './MetaManagementImportView';
import { type MetaManagementRelationFilter, MetaManagementRelationsView } from './MetaManagementRelationsView';

interface MetaManagementAssistPanelProps {
  selectedNode: MetaRecord | null;
  templates: MetaRecord[];
  attributes: MetaRecord[];
  rawAttrs: MetaRecord[];
  instances: MetaRecord[];
  colDefs: MetaRecord[];
  activityItems?: MetaActivityItem[];
  isActivityLoading?: boolean;
  onPreviewImportSnapshot?: (snapshot: MetaRecord, options?: MetaImportSnapshotOptions) => Promise<MetaRecord>;
  onImportSnapshot?: (snapshot: MetaRecord, options?: MetaImportSnapshotOptions) => Promise<MetaRecord>;
  onRefreshActivity?: () => void;
}

const RELATION_FILTERS: Array<{ id: MetaManagementRelationFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'parent', label: 'Parent' },
  { id: 'template', label: 'Template' },
  { id: 'attribute', label: 'Attribute' },
  { id: 'instance', label: 'Instance' },
  { id: 'value', label: 'Value' },
];

function instancePreviewId(row: MetaRecord): string {
  return String(row.RID ?? row.UID ?? row._rowId ?? '');
}

function instancePreviewLabel(row: MetaRecord, index: number): string {
  const id = instancePreviewId(row);
  const name = row.NAME ?? row.CODE ?? row.ROWID ?? row.Title ?? row.title;
  return `${index + 1}. ${id || 'record'}${name ? ` / ${name}` : ''}`;
}

export default function MetaManagementAssistPanel({
  selectedNode,
  templates,
  attributes,
  rawAttrs,
  instances,
  colDefs,
  activityItems = [],
  isActivityLoading = false,
  onPreviewImportSnapshot,
  onImportSnapshot,
  onRefreshActivity,
}: MetaManagementAssistPanelProps) {
  const [activeMode, setActiveMode] = useState<MetaManagementAssistMode | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  const [selectedRid, setSelectedRid] = useState('');
  const [relationFilter, setRelationFilter] = useState<MetaManagementRelationFilter>('all');
  const subtitle = selectedNode
    ? `${selectedNode.CODE ?? selectedNode.UID} / ${selectedNode.NAME ?? ''}`
    : 'Select a node to inspect metadata.';

  const formFields = useMemo(() => buildMetaFormFields(rawAttrs, colDefs), [rawAttrs, colDefs]);
  const instanceOptions = useMemo(
    () =>
      instances
        .map((row, index) => ({ value: instancePreviewId(row), label: instancePreviewLabel(row, index) }))
        .filter((option) => option.value),
    [instances],
  );
  const formPreviewRows = useMemo(
    () => buildMetaFormPreviewRows(formFields, instances, selectedRid),
    [formFields, instances, selectedRid],
  );
  const relations = useMemo(
    () => buildMetaRelations(selectedNode, templates, attributes, instances),
    [selectedNode, templates, attributes, instances],
  );
  const relationKindCounts = useMemo(
    () =>
      relations.reduce<Record<string, number>>((acc, relation) => {
        acc[relation.kind] = (acc[relation.kind] ?? 0) + 1;
        return acc;
      }, {}),
    [relations],
  );
  const visibleRelations = useMemo(
    () => (relationFilter === 'all' ? relations : relations.filter((relation) => relation.kind === relationFilter)),
    [relations, relationFilter],
  );
  const exportTools = useMetaManagementExport({
    selectedNode,
    templates,
    attributes,
    rawAttrs,
    instances,
    colDefs,
    setCopyStatus,
  });
  const importTools = useMetaManagementImport({
    selectedNode,
    onPreviewImportSnapshot,
    onImportSnapshot,
    setCopyStatus,
  });

  useEffect(() => {
    if (instanceOptions.length === 0) {
      if (selectedRid) setSelectedRid('');
      return;
    }
    if (!instanceOptions.some((option) => option.value === selectedRid)) {
      setSelectedRid(instanceOptions[0].value);
    }
  }, [instanceOptions, selectedRid]);

  useEffect(() => {
    if (relationFilter !== 'all' && !relationKindCounts[relationFilter]) {
      setRelationFilter('all');
    }
  }, [relationFilter, relationKindCounts]);

  useEffect(() => {
    if (!activeMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMode((current) => closeMetaAssistDialog(current));
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [activeMode]);

  const closeDialog = () => setActiveMode((current) => closeMetaAssistDialog(current));

  const dialogContent =
    activeMode === 'form' ? (
      <MetaManagementFormView
        formFields={formFields}
        formPreviewRows={formPreviewRows}
        instanceOptions={instanceOptions}
        selectedRid={selectedRid}
        onSelectedRidChange={setSelectedRid}
      />
    ) : activeMode === 'relations' ? (
      <MetaManagementRelationsView
        relationFilters={RELATION_FILTERS}
        relations={relations}
        visibleRelations={visibleRelations}
        relationFilter={relationFilter}
        relationKindCounts={relationKindCounts}
        onRelationFilterChange={setRelationFilter}
      />
    ) : activeMode === 'export' ? (
      <MetaManagementExportView
        exportSections={exportTools.exportSections}
        exportSummary={exportTools.exportSummary}
        exportScope={exportTools.exportScope}
        exportJson={exportTools.exportJson}
        copyStatus={copyStatus}
        onCopyExportJson={exportTools.copyExportJson}
        onDownloadExportJson={exportTools.downloadExportJson}
        onToggleExportSection={exportTools.toggleExportSection}
      />
    ) : activeMode === 'import' ? (
      <MetaManagementImportView
        selectedNode={selectedNode}
        tools={importTools}
        copyStatus={copyStatus}
        canPreviewImport={Boolean(onPreviewImportSnapshot)}
        canApplyImport={Boolean(onImportSnapshot)}
      />
    ) : activeMode === 'activity' ? (
      <MetaManagementActivityView
        items={activityItems}
        isLoading={isActivityLoading}
        onRefresh={onRefreshActivity ?? (() => undefined)}
      />
    ) : null;

  return (
    <section className="mm-xmdb-assist" aria-label="XMDB Assist">
      <div className="mm-xmdb-assist-head">
        <div>
          <div className="mm-xmdb-title">XMDB Assist</div>
          <div className="mm-xmdb-subtitle">{subtitle}</div>
        </div>
        <div className="mm-xmdb-tabs" role="toolbar" aria-label="XMDB assist actions">
          {META_MANAGEMENT_ASSIST_ACTIONS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mm-xmdb-tab${activeMode === tab.id ? ' active' : ''}`}
              onClick={() => setActiveMode((current) => openMetaAssistDialog(current, tab.id))}
              aria-haspopup="dialog"
              aria-expanded={activeMode === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeMode && (
        <div className="mm-modal-overlay mm-xmdb-dialog-overlay" role="presentation" onClick={closeDialog}>
          <div
            className="mm-modal mm-xmdb-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${getMetaAssistDialogTitle(activeMode)} XMDB Assist`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mm-modal-header mm-xmdb-dialog-header">
              <div>
                <div className="mm-xmdb-dialog-title">{getMetaAssistDialogTitle(activeMode)}</div>
                <div className="mm-xmdb-subtitle">{subtitle}</div>
              </div>
              <button
                type="button"
                className="mm-xmdb-dialog-close"
                onClick={closeDialog}
                aria-label="Close XMDB Assist dialog"
              >
                Close
              </button>
            </div>
            <div className="mm-xmdb-body mm-xmdb-dialog-body">{dialogContent}</div>
          </div>
        </div>
      )}
    </section>
  );
}
