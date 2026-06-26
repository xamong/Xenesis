import type { MetaGridPendingSummary } from '../metaManagementGridStatus';

export interface MetaManagementStatusBarProps {
  selectedPath: string;
  templatesCount: number;
  pendingSummary: MetaGridPendingSummary;
  t: (key: string, values?: Record<string, string>) => string;
}

export function MetaManagementStatusBar({
  selectedPath,
  templatesCount,
  pendingSummary,
  t,
}: MetaManagementStatusBarProps) {
  return (
    <div className="mm-statusbar">
      <span>
        {t('meta.selectedPath')} <strong>{selectedPath}</strong>
      </span>
      <span style={{ marginLeft: 16 }}>
        {t('meta.templateCount')} <strong>{templatesCount}</strong>
      </span>
      <span className={pendingSummary.total > 0 ? 'mm-statusbar-pending' : 'mm-statusbar-clean'}>
        Pending <strong>{pendingSummary.total}</strong>
      </span>
    </div>
  );
}
