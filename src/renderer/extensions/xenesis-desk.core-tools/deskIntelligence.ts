import type {
  McpBridgeBotArtifact,
  McpBridgeBotSession,
  McpBridgeRendererContentSnapshot,
  McpBridgeRendererStateSnapshot,
  TerminalWorkBlock,
} from '../../../shared/types';
import type { ExplorerContextItem } from '../../utils/explorerContextStore';

export type IntelligenceAreaKey =
  | 'ai-context-cockpit'
  | 'shell-context-tracking'
  | 'xd-cli-bridge'
  | 'artifact-library'
  | 'pane-visual-context'
  | 'remote-durable-lite'
  | 'explorer-remote-sync'
  | 'process-viewer'
  | 'terminal-inspector'
  | 'safe-file-edit-center'
  | 'run-task-panel';

export type ArtifactKindFilter =
  | 'all'
  | 'pane-capture'
  | 'screenshot'
  | 'trace'
  | 'markdown'
  | 'xcon'
  | 'workflow'
  | 'other';

export const ARTIFACT_KIND_FILTERS: ArtifactKindFilter[] = [
  'all',
  'pane-capture',
  'screenshot',
  'trace',
  'markdown',
  'xcon',
  'workflow',
  'other',
];

export type ArtifactSortMode = 'newest' | 'type' | 'session';

export const ARTIFACT_SORT_MODES: Array<{
  value: ArtifactSortMode;
  label: string;
}> = [
  { value: 'newest', label: 'Newest' },
  { value: 'type', label: 'Type' },
  { value: 'session', label: 'Session' },
];

export type ArtifactBundleMode = 'light' | 'full' | 'artifact-review' | 'debug' | 'workflow-repair';

export const ARTIFACT_BUNDLE_MODES: Array<{
  value: ArtifactBundleMode;
  label: string;
  description: string;
  artifactLimit: number;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Active desk summary and the most recent artifacts.',
    artifactLimit: 5,
  },
  {
    value: 'full',
    label: 'Full',
    description: 'Current desk summary plus a broader recent artifact list.',
    artifactLimit: 20,
  },
  {
    value: 'artifact-review',
    label: 'Artifact Review',
    description: 'Inspect generated files, screenshots, and provenance before repair.',
    artifactLimit: 12,
  },
  {
    value: 'debug',
    label: 'Debug',
    description: 'Focus on validation output, errors, terminal context, and next diagnostics.',
    artifactLimit: 12,
  },
  {
    value: 'workflow-repair',
    label: 'Workflow Repair',
    description: 'Prioritize XCON, SKETCH, workflow, and validation repair context.',
    artifactLimit: 12,
  },
];

export interface IntelligenceArea {
  key: IntelligenceAreaKey;
  title: string;
  summary: string;
  prompt: string;
}

export interface BotArtifactCard extends McpBridgeBotArtifact {
  id: string;
  sessionId: string;
  messageId: string;
  createdAt: string;
  label: string;
  kindGroup: ArtifactKindFilter;
  typeLabel: string;
  searchText: string;
}

export interface RendererStateSummary {
  reportedAt: string;
  activePaneId: string;
  activeContentTitle: string;
  activeContentType: string;
  openFileCount: number;
  panelCount: number;
  terminalCount: number;
  contentCount: number;
}

export interface ArtifactCompareResult {
  leftLabel: string;
  rightLabel: string;
  leftPath: string;
  rightPath: string;
  equal: boolean;
  changedLineCount: number;
  summary: string;
  diffText: string;
}

export interface ArtifactValidationResult {
  id: string;
  artifactId: string;
  label: string;
  ok: boolean;
  message: string;
  detail: string;
  at: string;
  filePath?: string;
}

export type ArtifactHealthStatus = 'ok' | 'needs-review' | 'not-validated' | 'missing-file';

export interface ArtifactReviewPack {
  id: string;
  name: string;
  mode: ArtifactBundleMode;
  createdAt: string;
  updatedAt: string;
  artifactCount: number;
  artifacts: Array<Record<string, string>>;
  searchText: string;
}

export interface ArtifactDetailMetadataRow {
  label: string;
  value: string;
}

export type ArtifactLibraryTimelineAction =
  | 'preview'
  | 'send'
  | 'bundle'
  | 'validate'
  | 'repair'
  | 'repair-loop'
  | 'open'
  | 'focus'
  | 'reveal'
  | 'copy'
  | 'compare'
  | 'provenance';

export interface ArtifactLibraryTimelineEvent {
  id: string;
  at: string;
  action: ArtifactLibraryTimelineAction;
  label: string;
  detail: string;
  artifactId?: string;
}

export const ARTIFACT_VALIDATION_STORAGE_KEY = 'xenesis-artifact-validation-results';
export const ARTIFACT_REVIEW_PACK_STORAGE_KEY = 'xenesis-artifact-review-packs';
export const ARTIFACT_TIMELINE_STORAGE_KEY = 'xenesis-artifact-timeline-events';

export const XENIS_INTELLIGENCE_AREAS: IntelligenceArea[] = [
  {
    key: 'ai-context-cockpit',
    title: 'AI Context Cockpit',
    summary:
      'Collect active desk state, terminal context, files, artifacts, and approval status before asking the bot to act.',
    prompt:
      'Use xenesis_desk_active_context, xenesis_desk_terminal_list, xenesis_desk_terminal_tail, and open file context to build a concise Xenesis Desk work context before answering.',
  },
  {
    key: 'shell-context-tracking',
    title: 'Shell Context Tracking',
    summary: 'Track terminal cwd, last sent command, exit state, and connection health for AI and diagnostics.',
    prompt:
      'Inspect the active terminal shell context. Explain cwd, last command, exit state, remote profile, and what command should be run next only after user approval.',
  },
  {
    key: 'xd-cli-bridge',
    title: 'XD CLI Bridge',
    summary:
      'Expose user-facing xd commands that can open files, send AI prompts, run terminal commands, and tail sessions.',
    prompt:
      'Explain how to use scripts/xd.mjs for xd state, xd open, xd run, xd tail, and xd ai in the current environment.',
  },
  {
    key: 'artifact-library',
    title: 'Artifact Library',
    summary: 'Collect generated Markdown, XCON, screenshots, traces, and workflow artifacts across bot sessions.',
    prompt:
      'Review the current Xenesis Desk artifacts, identify the important generated files, and suggest which one should be opened or validated next.',
  },
  {
    key: 'pane-visual-context',
    title: 'Pane Visual Context',
    summary: 'Send active pane or dashboard screenshots to AI for visual inspection and rendering diagnostics.',
    prompt:
      'Use the active pane as visual context. If a screenshot is needed, ask for a pane capture and inspect layout, rendering, and artifact correctness.',
  },
  {
    key: 'remote-durable-lite',
    title: 'Remote Durable-lite',
    summary:
      'Add remote terminal health, reconnect guidance, and tmux/screen-friendly recovery before a full durable SSH stack.',
    prompt:
      'Inspect remote terminal health and propose a durable-lite recovery plan using reconnect, cwd restoration, and tmux or screen when appropriate.',
  },
  {
    key: 'explorer-remote-sync',
    title: 'Explorer Remote Sync',
    summary: 'Improve local and remote explorer flows with compare, transfer review, and sync planning.',
    prompt:
      'Compare local and remote file workflow needs. Suggest safe copy, upload, download, or sync actions without deleting anything automatically.',
  },
  {
    key: 'process-viewer',
    title: 'Process Viewer',
    summary: 'Inspect local or remote process lists and expose safe terminate/kill actions through approval.',
    prompt:
      'Prepare a process viewer workflow. Use terminal commands only after approval, prefer read-only process listing first, and flag risky kill actions.',
  },
  {
    key: 'terminal-inspector',
    title: 'Terminal Inspector',
    summary: 'Search, save, summarize, and send terminal scrollback or last command output to AI.',
    prompt:
      'Inspect the active terminal output. Summarize recent output, find errors, and recommend the next diagnostic command.',
  },
  {
    key: 'safe-file-edit-center',
    title: 'Safe File Edit Center',
    summary: 'Promote preview/apply/restore file edits from bot-only flows into a visible review workflow.',
    prompt:
      'When editing files, use xenesis_desk_preview_text_file_write first, explain the diff, wait for approval, then apply and provide restore instructions.',
  },
  {
    key: 'run-task-panel',
    title: 'Run Task Panel',
    summary:
      'Run one-off commands and workflow tasks as inspectable jobs with output, exit code, rerun, and artifact save actions.',
    prompt:
      'Turn the requested command or workflow into a run-as-task plan with visible output, exit code, rerun guidance, and saved artifacts.',
  },
];

export function findIntelligenceArea(key: string): IntelligenceArea {
  return XENIS_INTELLIGENCE_AREAS.find((area) => area.key === key) ?? XENIS_INTELLIGENCE_AREAS[0];
}

export function buildAiWorkbenchPrompt(key: string, summary?: RendererStateSummary): string {
  const area = findIntelligenceArea(key);
  const lines = [`Xenesis Desk AI Workbench request: ${area.title}`, area.prompt];
  if (summary) {
    lines.push(
      '',
      'Current renderer summary:',
      `- active: ${summary.activeContentTitle || '-'} (${summary.activeContentType || '-'})`,
      `- open files: ${summary.openFileCount}`,
      `- panels: ${summary.panelCount}`,
      `- terminals: ${summary.terminalCount}`,
      `- reported: ${summary.reportedAt || '-'}`,
    );
  }
  return lines.join('\n');
}

export function summarizeRendererState(state: McpBridgeRendererStateSnapshot | null | undefined): RendererStateSummary {
  const activePane =
    state?.panes.find((pane) => pane.id === state.activePaneId) ??
    state?.panes.find((pane) => pane.activeContentId) ??
    null;
  const activeContentId = activePane?.activeContentId ?? '';
  const activeContent = activeContentId
    ? (state?.contents.find((content) => content.id === activeContentId) ?? null)
    : null;
  const terminalCount = state?.contents.filter((content) => content.contentType === 'terminal').length ?? 0;
  return {
    reportedAt: state?.reportedAt ?? '',
    activePaneId: state?.activePaneId ?? '',
    activeContentTitle: activeContent?.title ?? '',
    activeContentType: activeContent?.contentType ?? '',
    openFileCount: state?.openFiles.length ?? 0,
    panelCount: state?.panels.length ?? 0,
    terminalCount,
    contentCount: state?.contents.length ?? 0,
  };
}

export function terminalContentFromState(
  state: McpBridgeRendererStateSnapshot | null | undefined,
): McpBridgeRendererContentSnapshot[] {
  return (state?.contents ?? []).filter((content) => content.contentType === 'terminal');
}

function lowerArtifactBlob(artifact: McpBridgeBotArtifact): string {
  return [artifact.title, artifact.kind, artifact.filePath, artifact.openCommand, artifact.focusCommand]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function lowerArtifactPath(artifact: McpBridgeBotArtifact): string {
  return (artifact.filePath ?? '').trim().toLowerCase();
}

function artifactFileName(artifact: McpBridgeBotArtifact): string {
  const normalized = lowerArtifactPath(artifact).replace(/\\/g, '/');
  return normalized.split('/').pop() ?? normalized;
}

function pathEndsWithAny(filePath: string, extensions: string[]): boolean {
  return extensions.some((extension) => filePath.endsWith(extension));
}

export function artifactKindLabel(kind: ArtifactKindFilter): string {
  switch (kind) {
    case 'all':
      return 'All types';
    case 'pane-capture':
      return 'Pane capture';
    case 'screenshot':
      return 'Screenshot';
    case 'trace':
      return 'Trace';
    case 'markdown':
      return 'Markdown';
    case 'xcon':
      return 'XCON';
    case 'workflow':
      return 'Workflow';
    case 'other':
    default:
      return 'Other';
  }
}

export function classifyArtifactKind(artifact: McpBridgeBotArtifact): ArtifactKindFilter {
  const blob = lowerArtifactBlob(artifact);
  const filePath = lowerArtifactPath(artifact);
  const fileName = artifactFileName(artifact);
  const hasPaneCaptureHint =
    fileName.includes('pane_capture_') ||
    (blob.includes('pane') && (blob.includes('capture') || blob.includes('screenshot')));
  if (hasPaneCaptureHint) return 'pane-capture';

  if (blob.includes('workflow') || pathEndsWithAny(filePath, ['.xcont', '.workflow', '.xcon-workflow'])) {
    return 'workflow';
  }

  if (
    pathEndsWithAny(filePath, ['.xcon', '.xconj', '.xcon.json', '.xcon.xml', '.xcon.sketch', '.sketch']) ||
    blob.includes('xcon-sketch')
  ) {
    return 'xcon';
  }

  if (blob.includes('trace') || pathEndsWithAny(filePath, ['.trace', '.har', '.trace.zip'])) {
    return 'trace';
  }

  if (pathEndsWithAny(filePath, ['.md', '.markdown', '.mdx'])) {
    return 'markdown';
  }

  if (
    blob.includes('screenshot') ||
    blob.includes('screen shot') ||
    blob.includes('capture') ||
    pathEndsWithAny(filePath, ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'])
  ) {
    return 'screenshot';
  }

  return 'other';
}

export function buildArtifactSearchText(artifact: McpBridgeBotArtifact & Partial<BotArtifactCard>): string {
  return [
    artifact.label,
    artifact.typeLabel,
    artifact.kindGroup,
    artifact.kind,
    artifact.title,
    artifact.filePath,
    artifact.sessionId,
    artifact.messageId,
    artifact.createdAt,
    artifact.openCommand,
    artifact.focusCommand,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterBotArtifacts(
  artifacts: BotArtifactCard[],
  query: string,
  kindFilter: ArtifactKindFilter,
): BotArtifactCard[] {
  const needle = query.trim().toLowerCase();
  return artifacts.filter((artifact) => {
    if (kindFilter !== 'all' && artifact.kindGroup !== kindFilter) return false;
    if (!needle) return true;
    return (artifact.searchText || buildArtifactSearchText(artifact)).includes(needle);
  });
}

function artifactCreatedMillis(artifact: Pick<BotArtifactCard, 'createdAt'>): number {
  const millis = Date.parse(artifact.createdAt || '');
  return Number.isFinite(millis) ? millis : 0;
}

function compareArtifactLabel(left: BotArtifactCard, right: BotArtifactCard): number {
  return left.label.localeCompare(right.label) || left.id.localeCompare(right.id);
}

export function sortBotArtifacts(artifacts: BotArtifactCard[], mode: ArtifactSortMode = 'newest'): BotArtifactCard[] {
  return [...artifacts].sort((left, right) => {
    if (mode === 'type') {
      return (
        left.typeLabel.localeCompare(right.typeLabel) ||
        left.kindGroup.localeCompare(right.kindGroup) ||
        artifactCreatedMillis(right) - artifactCreatedMillis(left) ||
        compareArtifactLabel(left, right)
      );
    }
    if (mode === 'session') {
      return (
        left.sessionId.localeCompare(right.sessionId) ||
        artifactCreatedMillis(right) - artifactCreatedMillis(left) ||
        compareArtifactLabel(left, right)
      );
    }
    return artifactCreatedMillis(right) - artifactCreatedMillis(left) || compareArtifactLabel(left, right);
  });
}

export function buildArtifactDetailMetadataRows(artifact: BotArtifactCard): ArtifactDetailMetadataRow[] {
  return [
    { label: 'Type', value: artifact.typeLabel || artifact.kindGroup || 'artifact' },
    { label: 'Kind', value: artifact.kind || artifact.kindGroup || '-' },
    { label: 'Session', value: artifact.sessionId || '-' },
    { label: 'Message', value: artifact.messageId || '-' },
    { label: 'Created', value: artifact.createdAt || '-' },
    { label: 'File', value: artifact.filePath || 'File path missing' },
    { label: 'Open', value: buildArtifactOpenCommand(artifact) || '-' },
    { label: 'Focus', value: buildArtifactFocusCommand(artifact) || '-' },
  ];
}

export function isPreviewableImageArtifact(
  artifact: McpBridgeBotArtifact & { kindGroup?: ArtifactKindFilter },
): boolean {
  const filePath = artifact.filePath?.trim();
  if (!filePath) return false;
  const kindGroup = artifact.kindGroup ?? classifyArtifactKind(artifact);
  return kindGroup === 'pane-capture' || kindGroup === 'screenshot';
}

export function isPreviewableTextArtifact(
  artifact: McpBridgeBotArtifact & { kindGroup?: ArtifactKindFilter },
): boolean {
  const filePath = artifact.filePath?.trim();
  if (!filePath) return false;
  const kindGroup = artifact.kindGroup ?? classifyArtifactKind(artifact);
  return kindGroup === 'markdown' || kindGroup === 'xcon' || kindGroup === 'workflow';
}

export function buildArtifactPreviewUrl(artifact: McpBridgeBotArtifact & { kindGroup?: ArtifactKindFilter }): string {
  const filePath = artifact.filePath?.trim();
  if (!filePath || !isPreviewableImageArtifact(artifact)) return '';
  if (/^(file|https?|data):/i.test(filePath)) return filePath;
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath.startsWith('/') ? `file://${normalizedPath}` : `file:///${normalizedPath}`;
}

export function collectBotArtifacts(sessions: McpBridgeBotSession[]): BotArtifactCard[] {
  const cards: BotArtifactCard[] = [];
  for (const session of sessions) {
    for (const message of session.messages ?? []) {
      for (const artifact of message.artifacts ?? []) {
        const label = artifact.title || artifact.filePath || artifact.kind || 'Artifact';
        const kindGroup = classifyArtifactKind(artifact);
        const typeLabel = artifactKindLabel(kindGroup);
        const card: BotArtifactCard = {
          ...artifact,
          id: `${session.id}:${message.id}:${cards.length}`,
          sessionId: session.id,
          messageId: message.id,
          createdAt: message.createdAt,
          label,
          kindGroup,
          typeLabel,
          searchText: '',
        };
        card.searchText = buildArtifactSearchText(card);
        cards.push(card);
      }
    }
  }
  return sortBotArtifacts(cards, 'newest');
}

export function buildArtifactOpenCommand(artifact: McpBridgeBotArtifact): string {
  const command = artifact.openCommand?.trim();
  if (command) return command;
  const filePath = artifact.filePath?.trim();
  return filePath ? `/xd open "${filePath.replace(/"/g, '\\"')}"` : '';
}

export function buildArtifactFocusCommand(artifact: McpBridgeBotArtifact): string {
  const command = artifact.focusCommand?.trim();
  return command || buildArtifactOpenCommand(artifact);
}

function buildArtifactContextPayload(artifact: BotArtifactCard): Record<string, string> {
  return {
    id: artifact.id,
    label: artifact.label,
    kind: artifact.kind ?? '',
    kindGroup: artifact.kindGroup,
    typeLabel: artifact.typeLabel,
    sessionId: artifact.sessionId,
    messageId: artifact.messageId,
    createdAt: artifact.createdAt,
    filePath: artifact.filePath ?? '',
    openCommand: buildArtifactOpenCommand(artifact),
    focusCommand: buildArtifactFocusCommand(artifact),
  };
}

function findArtifactBundleMode(mode: ArtifactBundleMode): (typeof ARTIFACT_BUNDLE_MODES)[number] {
  return ARTIFACT_BUNDLE_MODES.find((candidate) => candidate.value === mode) ?? ARTIFACT_BUNDLE_MODES[0];
}

function buildArtifactBundleModeGuidance(mode: ArtifactBundleMode): string {
  switch (mode) {
    case 'full':
      return 'Review the active desk summary and broader artifact list. Call out stale, duplicate, or missing artifacts before acting.';
    case 'artifact-review':
      return 'Review generated artifacts together. Use open/focus commands only when needed, and validate Markdown/XCON artifacts before repairs.';
    case 'debug':
      return 'Focus on validation failures, terminal/process clues, and the smallest next diagnostic command. Ask before running commands.';
    case 'workflow-repair':
      return 'Prioritize workflow, XCON, SKETCH, and validation context. Propose the smallest safe repair with preview/apply steps.';
    case 'light':
    default:
      return 'Start with the active pane, open files, terminals, and the most recent artifacts. Ask before running commands or applying file changes.';
  }
}

function limitedArtifactPayloads(
  artifacts: BotArtifactCard[],
  mode: ArtifactBundleMode,
): Array<Record<string, string>> {
  return selectArtifactsForBundleMode(artifacts, mode).map(buildArtifactContextPayload);
}

interface CommandBundleContextPayload {
  id: string;
  label: string;
  group: string;
  terminalKind: string;
  cwd: string;
  commandPreview: string;
  lineCount: number;
  runCount: number;
  updatedAt: number;
}

const COMMAND_BUNDLE_LIMIT = 12;
const COMMAND_BUNDLE_PREVIEW_LIMIT = 240;

function buildCommandBundlePreview(command: string): string {
  const normalized = String(command ?? '').trim();
  if (normalized.length <= COMMAND_BUNDLE_PREVIEW_LIMIT) return normalized;
  return `${normalized.slice(0, COMMAND_BUNDLE_PREVIEW_LIMIT).trimEnd()}\n... truncated`;
}

function countCommandBundleLines(command: string): number {
  const normalized = String(command ?? '').trim();
  return normalized ? normalized.split(/\r?\n/).length : 0;
}

export function limitedCommandBundlePayloads(
  commandBundles: TerminalWorkBlock[],
  limit = COMMAND_BUNDLE_LIMIT,
): CommandBundleContextPayload[] {
  return [...commandBundles]
    .filter((bundle) => typeof bundle.command === 'string' && bundle.command.trim())
    .sort(
      (left, right) =>
        right.updatedAt - left.updatedAt ||
        right.runCount - left.runCount ||
        left.label.localeCompare(right.label) ||
        left.id.localeCompare(right.id),
    )
    .slice(0, limit)
    .map((bundle) => ({
      id: bundle.id,
      label: bundle.label,
      group: bundle.group || '',
      terminalKind: String(bundle.terminalKind || ''),
      cwd: bundle.cwd || '',
      commandPreview: buildCommandBundlePreview(bundle.command),
      lineCount: countCommandBundleLines(bundle.command),
      runCount: bundle.runCount,
      updatedAt: bundle.updatedAt,
    }));
}

export function selectArtifactsForBundleMode(
  artifacts: BotArtifactCard[],
  mode: ArtifactBundleMode = 'artifact-review',
): BotArtifactCard[] {
  const modeSpec = findArtifactBundleMode(mode);
  const modeArtifacts = (() => {
    if (mode === 'workflow-repair') {
      return artifacts
        .filter((artifact) => ['workflow', 'xcon', 'markdown'].includes(artifact.kindGroup))
        .concat(artifacts);
    }
    if (mode === 'debug') {
      return artifacts
        .filter((artifact) => ['trace', 'xcon', 'workflow', 'markdown'].includes(artifact.kindGroup))
        .concat(artifacts);
    }
    if (mode === 'artifact-review') {
      return artifacts
        .filter((artifact) =>
          ['pane-capture', 'screenshot', 'markdown', 'xcon', 'workflow'].includes(artifact.kindGroup),
        )
        .concat(artifacts);
    }
    return artifacts;
  })();
  const uniqueArtifacts: BotArtifactCard[] = [];
  const seen = new Set<string>();
  for (const artifact of modeArtifacts) {
    if (seen.has(artifact.id)) continue;
    seen.add(artifact.id);
    uniqueArtifacts.push(artifact);
    if (uniqueArtifacts.length >= modeSpec.artifactLimit) break;
  }
  return uniqueArtifacts;
}

export function buildArtifactBundlePreviewText(
  artifacts: BotArtifactCard[],
  mode: ArtifactBundleMode = 'artifact-review',
): string {
  const modeSpec = findArtifactBundleMode(mode);
  const lines = [`${modeSpec.label} bundle preview`, modeSpec.description, `Artifacts: ${artifacts.length}`, ''];
  if (!artifacts.length) {
    lines.push('No artifacts selected for this bundle.');
    return lines.join('\n');
  }
  artifacts.forEach((artifact, index) => {
    lines.push(`${index + 1}. ${artifact.label}`);
    lines.push(`   Type: ${artifact.typeLabel || artifact.kindGroup}`);
    lines.push(`   File: ${artifact.filePath || 'File path missing'}`);
    lines.push(`   Source: ${artifact.sessionId || '-'} / ${artifact.messageId || '-'}`);
  });
  return lines.join('\n');
}

interface ArtifactRepairValidationContext {
  label?: string;
  ok?: boolean;
  message?: string;
  detail?: string;
  at?: string;
}

export function buildArtifactRepairLoopMessage(
  artifact: BotArtifactCard,
  validation?: ArtifactRepairValidationContext | null,
): string {
  const payload = {
    type: 'xenesis-artifact-repair-loop',
    artifact: buildArtifactContextPayload(artifact),
    validation: validation
      ? {
          label: validation.label ?? artifact.label,
          ok: Boolean(validation.ok),
          message: validation.message ?? '',
          detail: validation.detail ?? '',
          at: validation.at ?? '',
        }
      : null,
    safeEditTools: [
      'xenesis_desk_preview_text_file_write',
      'xenesis_desk_apply_text_file_write',
      'xenesis_desk_restore_text_file_backup',
    ],
  };
  return [
    `Start an Xenesis Desk artifact repair loop for: ${artifact.label}`,
    '',
    '```xenesis-artifact-repair-loop',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    'Use the Safe File Edit Center safety model:',
    '- Read the artifact and explain the validation failure.',
    '- Propose the smallest safe repair.',
    '- Use `xenesis_desk_preview_text_file_write` first and show the diff.',
    '- Apply only after approval with `xenesis_desk_apply_text_file_write`.',
    '- If needed, restore with `xenesis_desk_restore_text_file_backup`.',
    '',
    'Do not overwrite files directly. Keep the workflow in preview/apply mode and ask before applying changes.',
  ].join('\n');
}

function splitArtifactLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
}

export function buildArtifactCompareText(
  left: BotArtifactCard,
  leftText: string,
  right: BotArtifactCard,
  rightText: string,
): ArtifactCompareResult {
  const leftLines = splitArtifactLines(leftText);
  const rightLines = splitArtifactLines(rightText);
  const maxLines = Math.max(leftLines.length, rightLines.length);
  const diffLines: string[] = [];
  let changedLineCount = 0;
  for (let index = 0; index < maxLines; index += 1) {
    const leftLine = leftLines[index];
    const rightLine = rightLines[index];
    if (leftLine === rightLine) continue;
    changedLineCount += 1;
    const lineNumber = String(index + 1).padStart(4, ' ');
    if (leftLine !== undefined) diffLines.push(`- ${lineNumber} ${leftLine}`);
    if (rightLine !== undefined) diffLines.push(`+ ${lineNumber} ${rightLine}`);
    if (diffLines.length >= 400) {
      diffLines.push('... diff truncated after 400 visible lines');
      break;
    }
  }
  const equal = changedLineCount === 0;
  return {
    leftLabel: left.label,
    rightLabel: right.label,
    leftPath: left.filePath ?? '',
    rightPath: right.filePath ?? '',
    equal,
    changedLineCount,
    summary: equal
      ? 'No text differences found.'
      : `${changedLineCount} changed line${changedLineCount === 1 ? '' : 's'} found.`,
    diffText: equal ? 'No text differences found.' : diffLines.join('\n'),
  };
}

function addArtifactStructureToken(tokens: Set<string>, key: string, value: unknown): void {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const normalizedValue = String(value).trim();
    if (normalizedValue) tokens.add(`${normalizedKey}:${normalizedValue}`);
  }
}

function collectArtifactStructureTokens(value: unknown, tokens: Set<string>, keyHint = ''): void {
  if (Array.isArray(value)) {
    if (keyHint && ['success', 'failure', 'catch', 'finally'].includes(keyHint.toLowerCase())) {
      tokens.add(`branch:${keyHint.toLowerCase()}`);
    }
    value.forEach((item) => collectArtifactStructureTokens(item, tokens));
    return;
  }
  if (!value || typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  for (const [key, entry] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (['action', 'id', 'type', 'command', 'name', 'label', 'mode'].includes(lowerKey)) {
      addArtifactStructureToken(tokens, lowerKey, entry);
    }
    if (['success', 'failure', 'catch', 'finally'].includes(lowerKey)) {
      tokens.add(`branch:${lowerKey}`);
    }
    collectArtifactStructureTokens(entry, tokens, lowerKey);
  }
}

function collectStructureTokensFromText(text: string, tokens: Set<string>): void {
  const keyValuePattern = /["']?(action|id|type|command|name|label|mode)["']?\s*[:=]\s*["']([^"'\n\r,}]+)["']/gi;
  for (const match of text.matchAll(keyValuePattern)) {
    addArtifactStructureToken(tokens, match[1].toLowerCase(), match[2]);
  }
  const branchPattern = /\b(success|failure|catch|finally)\b/gi;
  for (const match of text.matchAll(branchPattern)) {
    tokens.add(`branch:${match[1].toLowerCase()}`);
  }
}

export function extractArtifactStructureTokens(text: string): string[] {
  const tokens = new Set<string>();
  const trimmed = text.trim();
  if (!trimmed) return [];
  try {
    collectArtifactStructureTokens(JSON.parse(trimmed), tokens);
  } catch {
    collectStructureTokensFromText(trimmed, tokens);
  }
  if (tokens.size === 0) collectStructureTokensFromText(trimmed, tokens);
  return [...tokens].sort((left, right) => left.localeCompare(right));
}

export function buildArtifactStructuralCompareText(
  left: BotArtifactCard,
  leftText: string,
  right: BotArtifactCard,
  rightText: string,
): ArtifactCompareResult {
  const leftTokens = extractArtifactStructureTokens(leftText);
  const rightTokens = extractArtifactStructureTokens(rightText);
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const removed = leftTokens.filter((token) => !rightSet.has(token));
  const added = rightTokens.filter((token) => !leftSet.has(token));
  const diffLines = [...removed.map((token) => `- ${token}`), ...added.map((token) => `+ ${token}`)];
  const changedLineCount = diffLines.length;
  const equal = changedLineCount === 0;
  return {
    leftLabel: left.label,
    rightLabel: right.label,
    leftPath: left.filePath ?? '',
    rightPath: right.filePath ?? '',
    equal,
    changedLineCount,
    summary: equal
      ? 'No structural differences found.'
      : `${changedLineCount} structural token difference${changedLineCount === 1 ? '' : 's'} found.`,
    diffText: equal ? 'No structural differences found.' : diffLines.join('\n'),
  };
}

function isArtifactValidationResult(value: unknown): value is ArtifactValidationResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArtifactValidationResult>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.artifactId === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.ok === 'boolean' &&
    typeof candidate.message === 'string' &&
    typeof candidate.detail === 'string' &&
    typeof candidate.at === 'string'
  );
}

export function parseArtifactValidationResults(raw: string | null | undefined): ArtifactValidationResult[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArtifactValidationResult).slice(0, 200);
  } catch {
    return [];
  }
}

export function serializeArtifactValidationResults(results: ArtifactValidationResult[]): string {
  return JSON.stringify(results.filter(isArtifactValidationResult).slice(0, 200));
}

export function mergeArtifactValidationResults(
  current: ArtifactValidationResult[] = [],
  incoming: ArtifactValidationResult[] = [],
  limit = 200,
): ArtifactValidationResult[] {
  const byId = new Map<string, ArtifactValidationResult>();
  for (const result of [...current, ...incoming]) {
    if (!isArtifactValidationResult(result)) continue;
    byId.set(result.id, result);
  }
  return [...byId.values()]
    .sort(
      (left, right) =>
        artifactCreatedMillis({ createdAt: right.at }) - artifactCreatedMillis({ createdAt: left.at }) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, limit);
}

function normalizeArtifactPath(value: string | undefined): string {
  return (value ?? '').trim().replace(/\\/g, '/').toLowerCase();
}

function latestValidationForArtifact(
  artifact: Pick<BotArtifactCard, 'id' | 'filePath'>,
  results: ArtifactValidationResult[],
): ArtifactValidationResult | null {
  const artifactPath = normalizeArtifactPath(artifact.filePath);
  return (
    mergeArtifactValidationResults([], results).find(
      (result) =>
        result.artifactId === artifact.id || (artifactPath && normalizeArtifactPath(result.filePath) === artifactPath),
    ) ?? null
  );
}

export function artifactHealthStatus(
  artifact: Pick<BotArtifactCard, 'id' | 'filePath'>,
  results: ArtifactValidationResult[],
): ArtifactHealthStatus {
  if (!artifact.filePath?.trim()) return 'missing-file';
  const latest = latestValidationForArtifact(artifact, results);
  if (!latest) return 'not-validated';
  return latest.ok ? 'ok' : 'needs-review';
}

export function buildArtifactCompareBotMessage(compare: ArtifactCompareResult): string {
  const payload = {
    type: 'xenesis-artifact-compare',
    leftLabel: compare.leftLabel,
    rightLabel: compare.rightLabel,
    leftPath: compare.leftPath,
    rightPath: compare.rightPath,
    equal: compare.equal,
    changedLineCount: compare.changedLineCount,
    summary: compare.summary,
  };
  return [
    `Review this Xenesis Desk Artifact Compare result: ${compare.leftLabel} vs ${compare.rightLabel}`,
    '',
    '```xenesis-artifact-compare',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    'Diff:',
    '',
    '```diff',
    compare.diffText,
    '```',
    '',
    'Use this compare result to identify the smallest safe follow-up. Do not edit files without a preview/apply flow.',
  ].join('\n');
}

export function formatArtifactTimelineLabel(action: ArtifactLibraryTimelineAction): string {
  switch (action) {
    case 'preview':
      return 'Preview';
    case 'send':
      return 'Send to Agent';
    case 'bundle':
      return 'Bundle';
    case 'validate':
      return 'Validate';
    case 'repair':
      return 'Repair';
    case 'repair-loop':
      return 'Repair loop';
    case 'open':
      return 'Open';
    case 'focus':
      return 'Focus';
    case 'reveal':
      return 'Reveal';
    case 'copy':
      return 'Copy path';
    case 'compare':
      return 'Compare';
    case 'provenance':
      return 'Provenance';
    default:
      return action;
  }
}

export function buildArtifactTimelineEvent(
  action: ArtifactLibraryTimelineAction,
  artifact: Pick<BotArtifactCard, 'id' | 'label' | 'filePath'> | string,
  detail = '',
): ArtifactLibraryTimelineEvent {
  const artifactLabel = typeof artifact === 'string' ? artifact : artifact.label;
  const artifactDetail = typeof artifact === 'string' ? detail : detail || artifact.filePath || artifact.label;
  return {
    id: `${action}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    at: new Date().toISOString(),
    action,
    label: `${formatArtifactTimelineLabel(action)}: ${artifactLabel}`,
    detail: artifactDetail,
    artifactId: typeof artifact === 'string' ? undefined : artifact.id,
  };
}

function isArtifactTimelineEvent(value: unknown): value is ArtifactLibraryTimelineEvent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArtifactLibraryTimelineEvent>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.at === 'string' &&
    typeof candidate.action === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.detail === 'string'
  );
}

export function parseArtifactTimelineEvents(raw: string | null | undefined): ArtifactLibraryTimelineEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArtifactTimelineEvent).slice(0, 200);
  } catch {
    return [];
  }
}

export function serializeArtifactTimelineEvents(events: ArtifactLibraryTimelineEvent[]): string {
  return JSON.stringify(events.filter(isArtifactTimelineEvent).slice(0, 200));
}

export function mergeArtifactTimelineEvents(
  current: ArtifactLibraryTimelineEvent[] = [],
  incoming: ArtifactLibraryTimelineEvent[] = [],
  limit = 200,
): ArtifactLibraryTimelineEvent[] {
  const byId = new Map<string, ArtifactLibraryTimelineEvent>();
  for (const event of [...current, ...incoming]) {
    if (!isArtifactTimelineEvent(event)) continue;
    byId.set(event.id, event);
  }
  return [...byId.values()]
    .sort(
      (left, right) =>
        artifactCreatedMillis({ createdAt: right.at }) - artifactCreatedMillis({ createdAt: left.at }) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, limit);
}

export function buildArtifactProvenanceSummary(artifact: BotArtifactCard): string {
  const payload = {
    type: 'xenesis-artifact-provenance',
    ...buildArtifactContextPayload(artifact),
  };
  return ['```xenesis-artifact-provenance', JSON.stringify(payload, null, 2), '```'].join('\n');
}

export function buildArtifactBotContextMessage(artifact: BotArtifactCard): string {
  const payload = {
    type: 'xenesis-artifact-context',
    ...buildArtifactContextPayload(artifact),
  };

  return [
    `Use this Xenesis Desk artifact as context: ${artifact.label}`,
    '',
    '```xenesis-artifact-context',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    'Open or focus the artifact when needed. If this is a Pane capture or Screenshot, inspect it visually for layout, clipping, rendering, and missing content before proposing changes.',
  ].join('\n');
}

export function buildArtifactContextBundleMessage(
  artifacts: BotArtifactCard[],
  mode: ArtifactBundleMode = 'artifact-review',
): string {
  const modeSpec = findArtifactBundleMode(mode);
  const artifactPayloads = limitedArtifactPayloads(artifacts, mode);
  const payload = {
    type: 'xenesis-artifact-bundle',
    marker: 'artifact-bundle-mode',
    mode: modeSpec.value,
    modeLabel: modeSpec.label,
    modeDescription: modeSpec.description,
    count: artifacts.length,
    includedCount: artifactPayloads.length,
    artifacts: artifactPayloads,
  };
  return [
    `Use this Xenesis Desk artifact bundle as context (${modeSpec.label}, ${artifactPayloads.length}/${artifacts.length} artifacts).`,
    '',
    '```xenesis-artifact-bundle',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    buildArtifactBundleModeGuidance(mode),
  ].join('\n');
}

export function buildArtifactReviewPack(
  name: string,
  artifacts: BotArtifactCard[],
  mode: ArtifactBundleMode = 'artifact-review',
): ArtifactReviewPack {
  const cleanName = name.trim() || `Artifact Review Pack ${new Date().toLocaleString()}`;
  const now = new Date().toISOString();
  const artifactPayloads = artifacts.map(buildArtifactContextPayload);
  return {
    id: `review-pack-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: cleanName,
    mode,
    createdAt: now,
    updatedAt: now,
    artifactCount: artifactPayloads.length,
    artifacts: artifactPayloads,
    searchText: [
      cleanName,
      mode,
      ...artifactPayloads.flatMap((payload) => [payload.label, payload.kindGroup, payload.filePath]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

function isArtifactReviewPack(value: unknown): value is ArtifactReviewPack {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArtifactReviewPack>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.mode === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.updatedAt === 'string' &&
    typeof candidate.artifactCount === 'number' &&
    Array.isArray(candidate.artifacts) &&
    typeof candidate.searchText === 'string'
  );
}

export function parseArtifactReviewPacks(raw: string | null | undefined): ArtifactReviewPack[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isArtifactReviewPack).slice(0, 50);
  } catch {
    return [];
  }
}

export function serializeArtifactReviewPacks(packs: ArtifactReviewPack[]): string {
  return JSON.stringify(packs.filter(isArtifactReviewPack).slice(0, 50));
}

export function mergeArtifactReviewPacks(
  current: ArtifactReviewPack[] = [],
  incoming: ArtifactReviewPack[] = [],
  limit = 50,
): ArtifactReviewPack[] {
  const byId = new Map<string, ArtifactReviewPack>();
  for (const pack of [...current, ...incoming]) {
    if (!isArtifactReviewPack(pack)) continue;
    byId.set(pack.id, pack);
  }
  return [...byId.values()]
    .sort(
      (left, right) =>
        artifactCreatedMillis({ createdAt: right.updatedAt }) - artifactCreatedMillis({ createdAt: left.updatedAt }) ||
        right.id.localeCompare(left.id),
    )
    .slice(0, limit);
}

export function buildArtifactReviewPackBotMessage(pack: ArtifactReviewPack): string {
  const modeSpec = findArtifactBundleMode(pack.mode);
  const payload = {
    type: 'xenesis-artifact-review-pack',
    marker: 'artifact-bundle-mode',
    id: pack.id,
    name: pack.name,
    mode: pack.mode,
    modeLabel: modeSpec.label,
    artifactCount: pack.artifactCount,
    createdAt: pack.createdAt,
    updatedAt: pack.updatedAt,
    artifacts: pack.artifacts,
  };
  return [
    `Use this Xenesis Desk Artifact Review Pack as context: ${pack.name}`,
    '',
    '```xenesis-artifact-review-pack',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    buildArtifactBundleModeGuidance(pack.mode),
  ].join('\n');
}

export function buildArtifactValidationMessage(artifact: BotArtifactCard): string {
  return [
    `Validate this Xenesis Desk artifact and repair it if needed: ${artifact.label}`,
    '',
    buildArtifactProvenanceSummary(artifact),
    '',
    'If the artifact is Markdown or XCON/SKETCH, read the file and run `xenesis_desk_validate_xcon_markdown` on the content. If validation fails, use review-repair guidance and explain the smallest safe repair.',
    'Do not overwrite files without an explicit preview/apply flow.',
  ].join('\n');
}

export function buildAiWorkbenchContextBundleMessage(
  summary: RendererStateSummary,
  artifacts: BotArtifactCard[],
  mode: ArtifactBundleMode = 'light',
  explorerContextItems: ExplorerContextItem[] = [],
  commandBundles: TerminalWorkBlock[] = [],
): string {
  const modeSpec = findArtifactBundleMode(mode);
  const recentArtifacts = limitedArtifactPayloads(artifacts, mode);
  const commandBundlePayloads = limitedCommandBundlePayloads(commandBundles);
  const payload = {
    type: 'xenesis-ai-context-bundle',
    marker: 'artifact-bundle-mode',
    mode: modeSpec.value,
    modeLabel: modeSpec.label,
    modeDescription: modeSpec.description,
    summary,
    recentArtifactCount: recentArtifacts.length,
    recentArtifacts,
    explorerContextCount: explorerContextItems.length,
    explorerContext: explorerContextItems.slice(0, 24).map((item) => ({
      id: item.id,
      source: item.source,
      kind: item.kind,
      name: item.name,
      path: item.path,
      ext: item.ext ?? '',
      profile: item.profile ?? null,
      addedAt: item.addedAt,
    })),
    commandBundleCount: commandBundlePayloads.length,
    commandBundles: commandBundlePayloads,
  };
  return [
    `Use this Xenesis Desk Context Bundle before planning the next action (${modeSpec.label}).`,
    '',
    commandBundlePayloads.length
      ? `It includes ${commandBundlePayloads.length} reusable command bundles from Command Center.`
      : 'No reusable command bundles are included.',
    '',
    '```xenesis-ai-context-bundle',
    JSON.stringify(payload, null, 2),
    '```',
    '',
    buildArtifactBundleModeGuidance(mode),
  ].join('\n');
}
