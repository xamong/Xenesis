import type { MetaGridPendingSummary } from '../metaManagementGridStatus';
import type { MetaSummary } from '../metaManagementProvider';

export interface MetaManagementStatusBarProps {
  selectedPath: string;
  templatesCount: number;
  pendingSummary: MetaGridPendingSummary;
  connected: boolean | null;
  summary: MetaSummary | null;
  validationStatus: string | null;
  t: (key: string, values?: Record<string, string | number>) => string;
}

export function MetaManagementStatusBar({
  selectedPath,
  templatesCount,
  pendingSummary,
  connected,
  summary,
  validationStatus,
  t,
}: MetaManagementStatusBarProps) {
  const dbLabel = summary?.dbPath ? summary.dbPath.split(/[\\/]/).pop() || summary.dbPath : 'DB';
  const connectionLabel = connected === null ? 'Checking' : connected ? 'Connected' : 'Disconnected';
  const connectionClass =
    connected === null ? 'mm-statusbar-checking' : connected ? 'mm-statusbar-connected' : 'mm-statusbar-disconnected';
  const validationLabel = validationStatus ?? summary?.lastValidationStatus ?? 'Not validated';

  return (
    <div className="mm-statusbar">
      <span className="mm-statusbar-item mm-statusbar-path">
        {t('meta.selectedPath')} <strong>{selectedPath}</strong>
      </span>
      <span className="mm-statusbar-item">
        {t('meta.templateCount')} <strong>{templatesCount}</strong>
      </span>
      <span className="mm-statusbar-item">
        DB <strong>{dbLabel}</strong>
      </span>
      <span className={`mm-statusbar-item ${connectionClass}`}>{connectionLabel}</span>
      <span className="mm-statusbar-item">
        Validation <strong>{validationLabel}</strong>
      </span>
      <span className={pendingSummary.total > 0 ? 'mm-statusbar-pending' : 'mm-statusbar-clean'}>
        Pending <strong>{pendingSummary.total}</strong>
      </span>
    </div>
  );
}
