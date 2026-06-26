interface DiagramNode {
  id?: string;
  key?: string;
  name?: string;
  title?: string;
  label?: string;
  type?: string;
  action?: string;
  actionType?: string;
  props?: Record<string, unknown>;
  data?: unknown;
  [key: string]: unknown;
}

interface DiagramEdge {
  from?: string;
  to?: string;
  source?: string;
  target?: string;
  sourceId?: string;
  targetId?: string;
}

interface DiagramModel {
  name?: string;
  nodes?: DiagramNode[];
  items?: (DiagramNode & { kind?: string })[];
  edges?: DiagramEdge[];
  links?: DiagramEdge[];
  connections?: DiagramEdge[];
}

type NormalizedNode = DiagramNode & {
  id: string;
  actionType?: string;
};

const CONTROL_KEYS = new Set([
  'id',
  'key',
  'name',
  'title',
  'label',
  'type',
  'actionType',
  'props',
  'data',
  'x',
  'y',
  'width',
  'height',
]);

export function diagramToWorkflowSketch(diagram: DiagramModel, options: { name?: string } = {}): string {
  const nodes = normalizeNodes(diagram);
  const edges = normalizeEdges(diagram);
  const incoming = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.from || !edge.to) continue;
    if (!incoming.has(edge.to)) incoming.set(edge.to, []);
    incoming.get(edge.to)?.push(edge.from);
  }

  const lines = [`workflow "${escapeText(options.name || diagram?.name || 'Diagram Workflow')}"`];
  for (const node of nodes) {
    const id = sketchId(node.id);
    const type = node.actionType || node.type || 'note';
    const inline = node.label ? ` "${escapeText(node.label)}"` : '';
    lines.push(`  ${id}: ${type}${inline}`);
    const props: Record<string, unknown> = {
      ...(isPlainObject(node.props) ? node.props : {}),
      ...(isPlainObject(node.data) ? node.data : {}),
    };
    if (node.data !== undefined && !isPlainObject(node.data)) props.data = node.data;
    for (const [key, value] of Object.entries(node)) {
      if (!CONTROL_KEYS.has(key)) props[key] = value;
    }
    for (const dep of incoming.get(node.id || '') || []) lines.push(`    after ${sketchId(dep)}`);
    for (const [key, value] of Object.entries(props)) {
      if (value !== undefined) lines.push(`    ${key} ${formatValue(value)}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function normalizeNodes(diagram: DiagramModel): NormalizedNode[] {
  const source = Array.isArray(diagram?.nodes)
    ? diagram.nodes
    : Array.isArray(diagram?.items)
      ? diagram.items.filter((item) => item.kind !== 'edge')
      : [];
  const actionTypeFrom = (node: DiagramNode): string | undefined => {
    if (typeof node.actionType === 'string') return node.actionType;
    if (typeof node.action === 'string') return node.action;
    if (isPlainObject(node.data) && typeof node.data.actionType === 'string') return node.data.actionType;
    if (typeof node.props?.type === 'string') return node.props.type;
    return undefined;
  };
  return source.map((node) => ({
    ...node,
    id: String(node.id || node.key || node.name || node.title || 'step'),
    actionType: actionTypeFrom(node),
  }));
}

function normalizeEdges(diagram: DiagramModel): { from: string; to: string }[] {
  const source = diagram?.edges || diagram?.links || diagram?.connections || [];
  return source.map((edge) => ({
    from: String(edge.from || edge.source || edge.sourceId || ''),
    to: String(edge.to || edge.target || edge.targetId || ''),
  }));
}

function sketchId(id: unknown): string {
  const text = String(id || 'step').replace(/[^\w-]/g, '_');
  return /^[A-Za-z_]/.test(text) ? text : `step_${text}`;
}

function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    if (value.trim().startsWith('=') && /["`]/.test(value)) return `\`${escapeBacktick(value)}\``;
    return JSON.stringify(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function escapeText(value: unknown): string {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeBacktick(value: unknown): string {
  return String(value).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
