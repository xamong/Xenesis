import type { MetaRelation } from './metaManagementCmdbAssist';

export interface MetaRelationGraphNode {
  id: string;
  label: string;
  type: string;
  group: string;
  color: string;
  metadata: Record<string, unknown>;
}

export interface MetaRelationGraphLink {
  source: string;
  target: string;
  type: MetaRelation['kind'];
  label: string;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface MetaRelationGraphModel {
  nodes: MetaRelationGraphNode[];
  links: MetaRelationGraphLink[];
  truncated: boolean;
}

export interface MetaRelationGraphOptions {
  maxRelations?: number;
}

export interface MetaRelationGraphHostMeasure {
  width?: number;
  height?: number;
}

export interface MetaRelationGraphSize {
  width: number;
  height: number;
}

const DEFAULT_MAX_RELATIONS = 120;

const NODE_COLORS: Record<string, string> = {
  node: '#38bdf8',
  attr: '#a78bfa',
  instance: '#34d399',
  value: '#facc15',
  unknown: '#94a3b8',
};

const LINK_WEIGHTS: Record<MetaRelation['kind'], number> = {
  parent: 1.15,
  template: 1,
  attribute: 0.82,
  instance: 0.72,
  value: 0.62,
};

export function buildMetaRelationGraphModel(
  relations: MetaRelation[],
  options: MetaRelationGraphOptions = {},
): MetaRelationGraphModel {
  const maxRelations = Math.max(1, Math.floor(options.maxRelations ?? DEFAULT_MAX_RELATIONS));
  const visibleRelations = relations.slice(0, maxRelations);
  const nodes = new Map<string, MetaRelationGraphNode>();
  const links: MetaRelationGraphLink[] = [];

  for (const relation of visibleRelations) {
    ensureRelationGraphNode(nodes, relation.from);
    ensureRelationGraphNode(nodes, relation.to);
    links.push({
      source: relation.from,
      target: relation.to,
      type: relation.kind,
      label: relation.label || relation.kind,
      weight: LINK_WEIGHTS[relation.kind],
      metadata: { relationId: relation.id },
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
    truncated: relations.length > visibleRelations.length,
  };
}

export function metaRelationGraphSizeFromHost(measure: MetaRelationGraphHostMeasure): MetaRelationGraphSize {
  const width = positiveFinite(measure.width, 720);
  const height = positiveFinite(measure.height, 360);
  return {
    width: Math.max(360, Math.round(width)),
    height: Math.max(240, Math.round(height)),
  };
}

export function buildMetaRelationGraphSketch(graph: MetaRelationGraphModel, size: MetaRelationGraphSize): string {
  const width = Math.max(360, Math.round(size.width));
  const height = Math.max(240, Math.round(size.height));
  return `screen "XMDB Relations" ${width}x${height} bg #0f1117
  relations: networkDiagram at 0 0 ${width} ${height}
    theme "obsidian"
    nodeRadius 16
    linkDistance 78
    charge -680
    friction 0.74
    showControls true
    showSearch false
    showFilters false
    showLegend false
    showLabels true
    showArrows true
    enableDrag true
    enableZoom true
    enablePan true
    enableHover true
    nodes ${JSON.stringify(graph.nodes)}
    links ${JSON.stringify(graph.links)}`;
}

function ensureRelationGraphNode(nodes: Map<string, MetaRelationGraphNode>, id: string): void {
  if (nodes.has(id)) return;
  const group = relationNodeGroup(id);
  nodes.set(id, {
    id,
    label: relationNodeLabel(id),
    type: group,
    group,
    color: NODE_COLORS[group] ?? NODE_COLORS.unknown,
    metadata: { rawId: id },
  });
}

function relationNodeGroup(id: string): string {
  const prefix = id.includes(':') ? id.split(':', 1)[0] : '';
  return prefix || 'unknown';
}

function relationNodeLabel(id: string): string {
  const separator = id.indexOf(':');
  if (separator < 0) return id;
  const prefix = id.slice(0, separator);
  const value = id.slice(separator + 1);
  return value ? `${prefix} ${value}` : prefix;
}

function positiveFinite(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}
