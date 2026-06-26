import React from 'react';
import type { MetaRelation } from '../metaManagementCmdbAssist';

export type MetaManagementRelationFilter = 'all' | MetaRelation['kind'];

export interface MetaManagementRelationFilterOption {
  id: MetaManagementRelationFilter;
  label: string;
}

export interface MetaManagementRelationsViewProps {
  relationFilters: MetaManagementRelationFilterOption[];
  relations: MetaRelation[];
  visibleRelations: MetaRelation[];
  relationFilter: MetaManagementRelationFilter;
  relationKindCounts: Record<string, number>;
  onRelationFilterChange: (filter: MetaManagementRelationFilter) => void;
}

export function MetaManagementRelationsView({
  relationFilters,
  relations,
  visibleRelations,
  relationFilter,
  relationKindCounts,
  onRelationFilterChange,
}: MetaManagementRelationsViewProps) {
  return (
    <div className="mm-xmdb-relations">
      <div className="mm-xmdb-relation-toolbar" aria-label="Relation filters">
        {relationFilters.map((filter) => {
          const count = filter.id === 'all' ? relations.length : (relationKindCounts[filter.id] ?? 0);
          return (
            <button
              key={filter.id}
              type="button"
              className={`mm-xmdb-relation-filter${relationFilter === filter.id ? ' active' : ''}`}
              onClick={() => onRelationFilterChange(filter.id)}
              disabled={count === 0}
            >
              <span>{filter.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </div>
      <div className="mm-xmdb-list">
        {visibleRelations.length === 0 ? (
          <div className="mm-xmdb-empty">No relations are available for the selected filter.</div>
        ) : (
          visibleRelations.slice(0, 80).map((relation) => (
            <div key={relation.id} className="mm-xmdb-relation">
              <span className="mm-xmdb-badge">{relation.kind}</span>
              <span className="mm-xmdb-relation-node">{relation.from}</span>
              <span className="mm-xmdb-relation-label">{relation.label}</span>
              <span className="mm-xmdb-relation-node">{relation.to}</span>
            </div>
          ))
        )}
        {visibleRelations.length > 80 && (
          <div className="mm-xmdb-empty">Showing 80 of {visibleRelations.length} filtered relations.</div>
        )}
      </div>
    </div>
  );
}
