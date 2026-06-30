import React, { useMemo, useState } from 'react';
import type { MetaRelation } from '../metaManagementCmdbAssist';
import { buildMetaRelationGraphModel } from '../metaManagementRelationGraph';
import { DEFAULT_META_RELATION_VIEW_MODE, META_RELATION_VIEW_MODES } from '../metaManagementRelationTabs';
import { MetaManagementRelationGraphView } from './MetaManagementRelationGraphView';

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
  const [viewMode, setViewMode] = useState(DEFAULT_META_RELATION_VIEW_MODE);
  const relationGraph = useMemo(() => buildMetaRelationGraphModel(visibleRelations), [visibleRelations]);

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
      <div className="mm-xmdb-relation-view-tabs" role="tablist" aria-label="Relation view mode">
        {META_RELATION_VIEW_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="tab"
            aria-selected={viewMode === mode.id}
            className={`mm-xmdb-relation-view-tab${viewMode === mode.id ? ' active' : ''}`}
            onClick={() => setViewMode(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      {viewMode === 'graph' && visibleRelations.length > 0 && (
        <section className="mm-xmdb-relation-graph" role="tabpanel" aria-label="Relation graph">
          <div className="mm-xmdb-relation-graph-head">
            <strong>Graph</strong>
            <span>
              {relationGraph.nodes.length} nodes / {relationGraph.links.length} links
            </span>
          </div>
          <MetaManagementRelationGraphView graph={relationGraph} />
        </section>
      )}
      {viewMode === 'graph' && visibleRelations.length === 0 && (
        <div className="mm-xmdb-empty">No relations are available for the selected filter.</div>
      )}
      {viewMode === 'list' && (
        <div className="mm-xmdb-list" role="tabpanel" aria-label="Relation list">
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
      )}
    </div>
  );
}
