import React, { useEffect, useMemo, useState } from 'react';
import { buildMetaFormFields, buildMetaFormPreviewRows, buildMetaRelations } from '../metaManagementCmdbAssist';
import type { MetaImportSnapshotOptions, MetaRecord } from '../metaManagementProvider';
import { useMetaManagementExport } from '../useMetaManagementExport';
import { useMetaManagementImport } from '../useMetaManagementImport';
import { MetaManagementExportView } from './MetaManagementExportView';
import { MetaManagementFormView } from './MetaManagementFormView';
import { MetaManagementImportView } from './MetaManagementImportView';
import { type MetaManagementRelationFilter, MetaManagementRelationsView } from './MetaManagementRelationsView';

type AssistMode = 'form' | 'relations' | 'export' | 'import';

interface MetaManagementAssistPanelProps {
  selectedNode: MetaRecord | null;
  templates: MetaRecord[];
  attributes: MetaRecord[];
  rawAttrs: MetaRecord[];
  instances: MetaRecord[];
  colDefs: MetaRecord[];
  onPreviewImportSnapshot?: (snapshot: MetaRecord, options?: MetaImportSnapshotOptions) => Promise<MetaRecord>;
  onImportSnapshot?: (snapshot: MetaRecord, options?: MetaImportSnapshotOptions) => Promise<MetaRecord>;
}

const TABS: Array<{ id: AssistMode; label: string }> = [
  { id: 'form', label: 'Form' },
  { id: 'relations', label: 'Relations' },
  { id: 'export', label: 'Export' },
  { id: 'import', label: 'Import' },
];

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
  onPreviewImportSnapshot,
  onImportSnapshot,
}: MetaManagementAssistPanelProps) {
  const [mode, setMode] = useState<AssistMode>('form');
  const [copyStatus, setCopyStatus] = useState('');
  const [selectedRid, setSelectedRid] = useState('');
  const [relationFilter, setRelationFilter] = useState<MetaManagementRelationFilter>('all');

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

  return (
    <section className="mm-xmdb-assist" aria-label="XMDB Assist">
      <div className="mm-xmdb-assist-head">
        <div>
          <div className="mm-xmdb-title">XMDB Assist</div>
          <div className="mm-xmdb-subtitle">
            {selectedNode
              ? `${selectedNode.CODE ?? selectedNode.UID} / ${selectedNode.NAME ?? ''}`
              : 'Select a node to inspect metadata.'}
          </div>
        </div>
        <div className="mm-xmdb-tabs" role="tablist" aria-label="XMDB assist modes">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mm-xmdb-tab${mode === tab.id ? ' active' : ''}`}
              onClick={() => setMode(tab.id)}
              role="tab"
              aria-selected={mode === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mm-xmdb-body">
        {mode === 'form' && (
          <MetaManagementFormView
            formFields={formFields}
            formPreviewRows={formPreviewRows}
            instanceOptions={instanceOptions}
            selectedRid={selectedRid}
            onSelectedRidChange={setSelectedRid}
          />
        )}

        {mode === 'relations' && (
          <MetaManagementRelationsView
            relationFilters={RELATION_FILTERS}
            relations={relations}
            visibleRelations={visibleRelations}
            relationFilter={relationFilter}
            relationKindCounts={relationKindCounts}
            onRelationFilterChange={setRelationFilter}
          />
        )}

        {mode === 'export' && (
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
        )}

        {mode === 'import' && (
          <MetaManagementImportView
            selectedNode={selectedNode}
            tools={importTools}
            copyStatus={copyStatus}
            canPreviewImport={Boolean(onPreviewImportSnapshot)}
            canApplyImport={Boolean(onImportSnapshot)}
          />
        )}
      </div>
    </section>
  );
}
