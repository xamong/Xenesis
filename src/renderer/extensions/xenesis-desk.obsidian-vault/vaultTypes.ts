export type VaultSourceKind = 'local' | 'remote';
export type VaultGraphScope = 'local' | 'global';
export type VaultIssueFilter = '' | 'unresolved' | 'orphan';

export interface VaultRef {
  id: string;
  source: VaultSourceKind;
  rootPath: string;
  displayName: string;
}

export interface VaultFileRecord {
  vaultId: string;
  path: string;
  absolutePath: string;
  content: string;
  modifiedAt?: number;
  sizeBytes?: number;
}

export interface VaultHeading {
  depth: number;
  text: string;
  slug: string;
}

export interface VaultWikiLink {
  target: string;
  label: string;
  heading?: string;
  index: number;
}

export type VaultAttachmentKind = 'embed' | 'image' | 'file';

export interface VaultAttachmentRef {
  kind: VaultAttachmentKind;
  target: string;
  label?: string;
  resolvedPath: string;
  safe: boolean;
}

export interface VaultNote {
  id: string;
  vaultId: string;
  path: string;
  absolutePath: string;
  title: string;
  body: string;
  frontmatter: Record<string, unknown>;
  aliases: string[];
  tags: string[];
  headings: VaultHeading[];
  links: VaultWikiLink[];
  attachments: VaultAttachmentRef[];
  modifiedAt?: number;
  sizeBytes?: number;
  warnings: string[];
}

export interface VaultResolvedLink {
  source: string;
  target: string;
  rawTarget: string;
  label: string;
  heading?: string;
  resolved: true;
  type: 'wiki';
}

export interface VaultUnresolvedLink {
  source: string;
  rawTarget: string;
  label: string;
  heading?: string;
  reason: 'missing' | 'ambiguous';
}

export interface VaultDiagnostic {
  code:
    | 'frontmatter-warning'
    | 'duplicate-title'
    | 'duplicate-alias'
    | 'ambiguous-link'
    | 'unsafe-attachment'
    | 'read-warning';
  severity: 'info' | 'warning' | 'error';
  path?: string;
  message: string;
  value?: string;
}

export interface VaultIndex {
  vault: VaultRef;
  notes: Map<string, VaultNote>;
  links: VaultResolvedLink[];
  backlinks: Map<string, VaultResolvedLink[]>;
  tags: Map<string, string[]>;
  unresolvedLinks: VaultUnresolvedLink[];
  orphanNoteIds: Set<string>;
  diagnostics: VaultDiagnostic[];
}

export interface VaultGraphNode {
  id: string;
  label: string;
  type: 'note' | 'orphan' | 'unresolved';
  group: string;
  color: string;
  metadata: Record<string, unknown>;
  isRoot?: boolean;
}

export interface VaultGraphLink {
  source: string;
  target: string;
  type: 'wiki' | 'unresolved';
  label: string;
  weight: number;
  metadata: Record<string, unknown>;
}

export interface VaultGraphGroup {
  id: string;
  label: string;
  color: string;
  metadata: Record<string, unknown>;
}

export interface VaultGraphModel {
  nodes: VaultGraphNode[];
  links: VaultGraphLink[];
  groups: VaultGraphGroup[];
  rootNodeId?: string;
  truncated: boolean;
}

export interface VaultViewerState {
  vaultRootPath: string;
  selectedNoteId: string;
  query: string;
  tag: string;
  issue: VaultIssueFilter;
  graphScope: VaultGraphScope;
  panelSizes: {
    sidebar: number;
    inspector: number;
    graph: number;
  };
}
