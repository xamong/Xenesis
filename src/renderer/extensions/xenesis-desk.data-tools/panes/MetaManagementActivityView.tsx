import { useMemo, useState } from 'react';
import type { MetaActivityItem } from '../metaManagementProvider';

type MetaActivityFilter = 'all' | 'meta' | 'import' | 'cr' | 'errors';

export interface MetaManagementActivityViewProps {
  items: MetaActivityItem[];
  isLoading: boolean;
  onRefresh: () => void;
}

const ACTIVITY_FILTERS: Array<{ id: MetaActivityFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'meta', label: 'Meta' },
  { id: 'import', label: 'Import' },
  { id: 'cr', label: 'CR' },
  { id: 'errors', label: 'Errors' },
];

function isActivityError(item: MetaActivityItem): boolean {
  return item.ok === false || item.ok === 0 || Boolean(item.error);
}

function matchesActivityFilter(item: MetaActivityItem, filter: MetaActivityFilter): boolean {
  const action = item.action ?? '';
  if (filter === 'all') return true;
  if (filter === 'errors') return isActivityError(item);
  if (filter === 'import') return action.startsWith('import.');
  if (filter === 'cr') return item.kind === 'cr';
  return item.kind === 'meta';
}

function formatActivityTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function MetaManagementActivityView({ items, isLoading, onRefresh }: MetaManagementActivityViewProps) {
  const [filter, setFilter] = useState<MetaActivityFilter>('all');
  const visibleItems = useMemo(() => items.filter((item) => matchesActivityFilter(item, filter)), [filter, items]);

  return (
    <div className="mm-xmdb-activity">
      <div className="mm-xmdb-activity-toolbar">
        <div className="mm-xmdb-activity-filters" role="tablist" aria-label="Activity filters">
          {ACTIVITY_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`mm-xmdb-activity-filter${filter === item.id ? ' active' : ''}`}
              onClick={() => setFilter(item.id)}
              role="tab"
              aria-selected={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" className="mm-btn-sm blue" onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="mm-xmdb-activity-list" aria-label="Meta activity timeline">
        {visibleItems.length === 0 ? (
          <div className="mm-xmdb-empty">{isLoading ? 'Loading activity...' : 'No activity found.'}</div>
        ) : (
          visibleItems.map((item) => {
            const isError = isActivityError(item);
            const title = item.title ?? item.action ?? item.source ?? item.id;
            return (
              <div className={`mm-xmdb-activity-item${isError ? ' error' : ''}`} key={`${item.kind}-${item.id}`}>
                <div className="mm-xmdb-activity-dot" aria-hidden="true" />
                <div className="mm-xmdb-activity-main">
                  <div className="mm-xmdb-activity-head">
                    <strong>{title}</strong>
                    <span>{formatActivityTime(item.createdAt)}</span>
                  </div>
                  <div className="mm-xmdb-activity-meta">
                    <span>{item.kind}</span>
                    {item.action && <span>{item.action}</span>}
                    {item.source && <span>{item.source}</span>}
                  </div>
                  {(item.summary || item.error) && (
                    <div className="mm-xmdb-activity-summary">{item.error || item.summary}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
