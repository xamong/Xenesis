import type { McpBridgeActionInboxItem } from '../../../shared/types';
import type { XenisBotSession } from './xenisBotStore';

export type HermesTimelineItemType = 'approval' | 'artifact' | 'artifact-control';

export interface HermesArtifactControlEvent {
  id: string;
  at: string;
  action: string;
  label: string;
  detail: string;
  artifactId?: string;
}

export interface HermesTimelineItem {
  id: string;
  type: HermesTimelineItemType;
  at: string;
  title: string;
  summary: string;
  sessionId: string;
  messageId: string;
  status: string;
  command?: string;
  result?: string;
  error?: string;
  kind?: string;
  filePath?: string;
  openCommand?: string;
  focusCommand?: string;
}

export interface HermesTimelineInput {
  actionInbox?: McpBridgeActionInboxItem[];
  sessions?: XenisBotSession[];
  artifactEvents?: HermesArtifactControlEvent[];
}

export interface HermesTimelineFilters {
  type?: HermesTimelineItemType | 'all';
  sessionId?: string;
  query?: string;
}

export interface HermesTimelineMarkdownOptions {
  generatedAt?: string;
}

export interface HermesWorkPacketHistoryItem {
  id: string;
  sessionId: string;
  messageId: string;
  at: string;
  title: string;
  summary: string;
  content: string;
  itemCount: number;
}

export interface HermesWorkPacketReceiptArtifactPath {
  index: number;
  path: string;
  command: string;
}

export interface HermesWorkPacketReceiptCommand {
  index: number;
  label: string;
  command: string;
}

export type HermesWorkPacketReceiptActionStatus = 'sent' | 'running' | 'completed' | 'failed';

export interface HermesWorkPacketReceiptAction {
  id: string;
  command: string;
  status: HermesWorkPacketReceiptActionStatus;
  at: string;
  messageId: string;
  role: string;
  summary: string;
}

export interface HermesWorkPacketReceiptItem {
  id: string;
  sessionId: string;
  messageId: string;
  at: string;
  title: string;
  summary: string;
  content: string;
  itemCount: number;
  artifactPaths: HermesWorkPacketReceiptArtifactPath[];
  replayCommands: HermesWorkPacketReceiptCommand[];
  actions: HermesWorkPacketReceiptAction[];
}

export function buildHermesWorkPacketHistoryItems(sessions?: XenisBotSession[]): HermesWorkPacketHistoryItem[];
export function buildHermesWorkPacketReceiptItems(sessions?: XenisBotSession[]): HermesWorkPacketReceiptItem[];
export function buildHermesArtifactControlItems(artifactEvents?: HermesArtifactControlEvent[]): HermesTimelineItem[];
export function buildHermesTimelineItems(input?: HermesTimelineInput): HermesTimelineItem[];
export function buildHermesTimelineMarkdown(
  input?: HermesTimelineInput,
  options?: HermesTimelineMarkdownOptions,
): string;
export function buildHermesTimelineMarkdownFromItems(
  items?: HermesTimelineItem[],
  options?: HermesTimelineMarkdownOptions,
): string;
export function buildHermesTimelineWorkPacketMarkdown(
  items?: HermesTimelineItem[],
  options?: HermesTimelineMarkdownOptions,
): string;
export function filterHermesTimelineItems(
  items?: HermesTimelineItem[],
  filters?: HermesTimelineFilters,
): HermesTimelineItem[];
export function timelineArtifactOpenCommand(item?: Partial<HermesTimelineItem>): string;
export function timelineArtifactFocusCommand(item?: Partial<HermesTimelineItem>): string;
