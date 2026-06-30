import type {
  VaultGraphLink,
  VaultGraphModel,
  VaultGraphNode,
  VaultIndex,
  VaultIssueFilter,
  VaultNote,
} from './vaultTypes';

const MAX_GRAPH_NODES = 180;

export interface VaultGraphState {
  selectedNoteId?: string;
  query?: string;
  tag?: string;
  issue?: VaultIssueFilter;
  noteIds?: Set<string>;
}

export function graphFromVaultIndex(index: VaultIndex, state: VaultGraphState = {}): VaultGraphModel {
  const visibleNotes = filterGraphNotes(index, state).slice(0, MAX_GRAPH_NODES);
  const truncated = filterGraphNotes(index, state).length > visibleNotes.length;
  const visibleIds = new Set(visibleNotes.map((note) => note.id));
  const rootNodeId =
    state.selectedNoteId && visibleIds.has(state.selectedNoteId) ? state.selectedNoteId : visibleNotes[0]?.id;
  const nodes = visibleNotes.map((note) => noteToGraphNode(note, index, rootNodeId));
  const links: VaultGraphLink[] = index.links
    .filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target))
    .map((link) => ({
      source: link.source,
      target: link.target,
      type: 'wiki' as const,
      label: link.label,
      weight: 1,
      metadata: { rawTarget: link.rawTarget, heading: link.heading || '' },
    }));

  for (const unresolved of index.unresolvedLinks) {
    if (!visibleIds.has(unresolved.source) || nodes.length >= MAX_GRAPH_NODES) continue;
    const unresolvedId = `unresolved:${unresolved.source}:${unresolved.rawTarget}`;
    nodes.push({
      id: unresolvedId,
      label: unresolved.rawTarget,
      type: 'unresolved',
      group: 'unresolved',
      color: '#fb7185',
      metadata: { unresolved: true, source: unresolved.source },
    });
    links.push({
      source: unresolved.source,
      target: unresolvedId,
      type: 'unresolved',
      label: unresolved.label,
      weight: 0.35,
      metadata: {},
    });
  }

  return { nodes, links, groups: graphGroups(nodes), rootNodeId, truncated };
}

export function localGraphForNote(
  index: VaultIndex,
  noteId: string,
  state: Omit<VaultGraphState, 'noteIds'> = {},
): VaultGraphModel {
  const ids = new Set<string>();
  if (index.notes.has(noteId)) ids.add(noteId);
  for (const link of index.links) {
    if (link.source === noteId) ids.add(link.target);
    if (link.target === noteId) ids.add(link.source);
  }
  return graphFromVaultIndex(index, { ...state, selectedNoteId: noteId, noteIds: ids });
}

function filterGraphNotes(index: VaultIndex, state: VaultGraphState): VaultNote[] {
  const needle = String(state.query || '')
    .trim()
    .toLowerCase();
  return Array.from(index.notes.values()).filter((note) => {
    if (state.noteIds && !state.noteIds.has(note.id)) return false;
    if (needle && !`${note.title} ${note.path} ${note.body}`.toLowerCase().includes(needle)) return false;
    if (state.tag && !note.tags.map((tag) => tag.toLowerCase()).includes(state.tag.toLowerCase())) return false;
    if (state.issue === 'orphan' && !index.orphanNoteIds.has(note.id)) return false;
    if (state.issue === 'unresolved' && !index.unresolvedLinks.some((link) => link.source === note.id)) return false;
    return true;
  });
}

function noteToGraphNode(note: VaultNote, index: VaultIndex, rootNodeId?: string): VaultGraphNode {
  const orphan = index.orphanNoteIds.has(note.id);
  const group = orphan ? 'orphan' : groupForNote(note);
  return {
    id: note.id,
    label: note.title,
    type: orphan ? 'orphan' : 'note',
    group,
    color: orphan ? '#f59e0b' : colorForGroup(group),
    metadata: { path: note.path, tags: note.tags },
    isRoot: note.id === rootNodeId,
  };
}

function groupForNote(note: VaultNote): string {
  const area = note.frontmatter.area;
  if (typeof area === 'string' && area.trim()) return area.trim();
  return note.path.includes('/') ? note.path.split('/')[0] : 'notes';
}

function graphGroups(nodes: VaultGraphNode[]): VaultGraphModel['groups'] {
  const groups = new Map<string, VaultGraphModel['groups'][number]>();
  for (const node of nodes) {
    if (groups.has(node.group)) continue;
    groups.set(node.group, { id: node.group, label: node.group, color: node.color, metadata: {} });
  }
  return Array.from(groups.values());
}

function colorForGroup(group: string): string {
  const palette = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#fb923c', '#60a5fa', '#c084fc'];
  let hash = 0;
  for (let index = 0; index < group.length; index += 1) hash = (hash * 31 + group.charCodeAt(index)) >>> 0;
  return palette[hash % palette.length];
}
