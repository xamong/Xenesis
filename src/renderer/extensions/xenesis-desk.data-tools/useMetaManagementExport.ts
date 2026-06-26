import { useMemo, useState } from 'react';
import { buildMetaExportPayload, type MetaExportPayload } from './metaManagementCmdbAssist';
import type { MetaRecord } from './metaManagementProvider';

export type MetaManagementExportSection = 'templates' | 'attributes' | 'instances' | 'relations';

export interface MetaManagementExportSectionOption {
  id: MetaManagementExportSection;
  label: string;
}

export interface MetaManagementExportSummaryItem {
  label: string;
  value: number;
}

export interface UseMetaManagementExportArgs {
  selectedNode: MetaRecord | null;
  templates: MetaRecord[];
  attributes: MetaRecord[];
  rawAttrs: MetaRecord[];
  instances: MetaRecord[];
  colDefs: MetaRecord[];
  setCopyStatus: (status: string) => void;
}

export interface UseMetaManagementExportResult {
  exportSections: MetaManagementExportSectionOption[];
  exportScope: Record<MetaManagementExportSection, boolean>;
  exportPayload: MetaExportPayload;
  exportSummary: MetaManagementExportSummaryItem[];
  exportJson: string;
  copyExportJson: () => Promise<void>;
  downloadExportJson: () => void;
  toggleExportSection: (section: MetaManagementExportSection) => void;
}

const EXPORT_SECTIONS: MetaManagementExportSectionOption[] = [
  { id: 'templates', label: 'Templates' },
  { id: 'attributes', label: 'Attributes' },
  { id: 'instances', label: 'Instances' },
  { id: 'relations', label: 'Relations' },
];

const DEFAULT_EXPORT_SCOPE: Record<MetaManagementExportSection, boolean> = {
  templates: true,
  attributes: true,
  instances: true,
  relations: true,
};

function exportFileStem(selectedNode: MetaRecord | null): string {
  const code = selectedNode?.CODE ? String(selectedNode.CODE) : 'meta';
  return code.replace(/[^\w.-]+/g, '_') || 'meta';
}

export function useMetaManagementExport({
  selectedNode,
  templates,
  attributes,
  rawAttrs,
  instances,
  colDefs,
  setCopyStatus,
}: UseMetaManagementExportArgs): UseMetaManagementExportResult {
  const [exportScope, setExportScope] = useState<Record<MetaManagementExportSection, boolean>>(DEFAULT_EXPORT_SCOPE);

  const exportPayload = useMemo(() => {
    const payload = buildMetaExportPayload({
      selectedNode,
      templates: exportScope.templates ? templates : [],
      attributes: exportScope.attributes ? attributes : [],
      rawAttrs: exportScope.attributes ? rawAttrs : [],
      instances: exportScope.instances ? instances : [],
      colDefs: exportScope.attributes ? colDefs : [],
    });
    return exportScope.relations ? payload : { ...payload, relations: [] };
  }, [selectedNode, templates, attributes, rawAttrs, instances, colDefs, exportScope]);

  const exportSummary = useMemo(
    () => [
      { label: 'Templates', value: exportPayload.templates.length },
      { label: 'Attributes', value: exportPayload.attributes.length },
      { label: 'Instances', value: exportPayload.instances.length },
      { label: 'Fields', value: exportPayload.formFields.length },
      { label: 'Relations', value: exportPayload.relations.length },
    ],
    [exportPayload],
  );

  const exportJson = useMemo(() => JSON.stringify(exportPayload, null, 2), [exportPayload]);

  async function copyExportJson() {
    try {
      await navigator.clipboard?.writeText(exportJson);
      setCopyStatus('Copied');
    } catch {
      setCopyStatus('Copy failed');
    }
  }

  function downloadExportJson() {
    const blob = new Blob([exportJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${exportFileStem(selectedNode)}-xmdb-assist.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleExportSection(section: MetaManagementExportSection) {
    setExportScope((current) => ({ ...current, [section]: !current[section] }));
  }

  return {
    exportSections: EXPORT_SECTIONS,
    exportScope,
    exportPayload,
    exportSummary,
    exportJson,
    copyExportJson,
    downloadExportJson,
    toggleExportSection,
  };
}
