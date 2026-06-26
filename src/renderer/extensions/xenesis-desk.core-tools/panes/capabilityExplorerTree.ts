import type { DeskBridgeCapabilityNode } from '../../../../shared/deskBridgeCapabilities';

export interface CapabilityTreeRow {
  node: DeskBridgeCapabilityNode;
  depth: number;
  segment: string;
  hasChildren: boolean;
  expanded: boolean;
}

function normalizeCapabilityFilter(value: string): string {
  return value.trim().toLowerCase();
}

export function capabilityPathSegment(path: string): string {
  const segments = String(path || '')
    .split('.')
    .filter(Boolean);
  return segments.at(-1) ?? String(path || '');
}

export function createDefaultExpandedCapabilityPaths(root: DeskBridgeCapabilityNode): Set<string> {
  return new Set([root.path]);
}

function nodeMatchesQuery(node: DeskBridgeCapabilityNode, query: string): boolean {
  if (!query) return true;
  return [
    capabilityPathSegment(node.path),
    node.path,
    node.label,
    node.description,
    node.kind,
    node.permission,
    node.approval,
  ].some((value) =>
    String(value ?? '')
      .toLowerCase()
      .includes(query),
  );
}

function subtreeMatchesQuery(node: DeskBridgeCapabilityNode, query: string): boolean {
  if (nodeMatchesQuery(node, query)) return true;
  return Boolean(node.children?.some((child) => subtreeMatchesQuery(child, query)));
}

export function visibleCapabilityTreeRows(
  root: DeskBridgeCapabilityNode,
  expandedPaths: ReadonlySet<string>,
  filterText = '',
): CapabilityTreeRow[] {
  const query = normalizeCapabilityFilter(filterText);

  function visit(node: DeskBridgeCapabilityNode, depth: number, ancestorMatched: boolean): CapabilityTreeRow[] {
    const children = node.children ?? [];
    const hasChildren = children.length > 0;
    const selfMatched = nodeMatchesQuery(node, query);
    const descendantMatched = query ? children.some((child) => subtreeMatchesQuery(child, query)) : false;
    const includeNode = !query || selfMatched || descendantMatched || ancestorMatched;
    if (!includeNode) return [];

    const expanded = query
      ? hasChildren && (selfMatched || descendantMatched || ancestorMatched)
      : expandedPaths.has(node.path);
    const rows: CapabilityTreeRow[] = [
      {
        node,
        depth,
        segment: capabilityPathSegment(node.path),
        hasChildren,
        expanded,
      },
    ];

    if (expanded) {
      const nextAncestorMatched = Boolean(query && (ancestorMatched || selfMatched));
      for (const child of children) {
        rows.push(...visit(child, depth + 1, nextAncestorMatched));
      }
    }
    return rows;
  }

  return visit(root, 0, false);
}
