import type { XenesisChatMessage, XenesisRawStreamEntry } from './xenesisAgentTypes';
import { isXenesisCliTransportNoise, isXenesisInternalPromptNoise } from './xenesisAgentTypes';

export type XenesisTranscriptActivityStatus = 'running' | 'ok' | 'waiting' | 'error' | 'info';

export interface XenesisTranscriptActivityItem {
  id: string;
  at: string;
  kind: string;
  label: string;
  summary: string;
  status: XenesisTranscriptActivityStatus;
  detail?: string;
}

export interface XenesisTranscriptActivitySummary {
  totalCount: number;
  toolCount: number;
  errorCount: number;
  items: XenesisTranscriptActivityItem[];
  summary: string;
}

export interface XenesisChoiceOption {
  index: number;
  label: string;
  input: string;
}

const CHOICE_CONTEXT_PATTERN =
  /\b(?:input requested|approval requested|choose|select|pick|which|next step)\b|(?:선택(?:하세요|해 주세요|해줘|하십시오|할|지)|고르(?:세요|십시오|기)|입력\s*요청|승인\s*요청|다음\s*작업|번호를\s*입력)/i;

export function isXenesisAuxiliaryTranscriptMessage(message: XenesisChatMessage): boolean {
  if (message.role !== 'system') return false;
  if (message.kind === 'tool') return true;
  const normalized = message.content.trim().toLowerCase();
  return normalized.startsWith('tool:') || normalized.startsWith('desk tool');
}

export function getXenesisVisibleTranscriptMessages(messages: XenesisChatMessage[]): XenesisChatMessage[] {
  return messages.filter((message) => !isXenesisAuxiliaryTranscriptMessage(message));
}

function activityLabelForEntry(entry: XenesisRawStreamEntry): string {
  switch (entry.kind) {
    case 'desk_tool_call':
      return 'Desk call';
    case 'desk_tool_result':
      return 'Desk result';
    case 'tool_call':
      return 'Tool call';
    case 'tool_result':
      return 'Tool result';
    case 'task_lifecycle':
      return 'Task';
    case 'approval':
    case 'artifact_tool_approval':
      return 'Approval';
    case 'run':
      return 'Run';
    case 'result':
      return 'Result';
    case 'run_error':
    case 'artifact_error':
      return 'Error';
    default:
      if (entry.kind.startsWith('artifact')) return 'Artifact';
      return 'Event';
  }
}

function activityStatusForEntry(entry: XenesisRawStreamEntry): XenesisTranscriptActivityStatus {
  if (entry.kind === 'approval' || entry.kind === 'artifact_tool_approval') return 'waiting';
  if (entry.error) return 'error';
  if (entry.kind === 'desk_tool_call' || entry.kind === 'tool_call' || entry.kind === 'run') return 'running';
  if (
    entry.kind === 'desk_tool_result' ||
    entry.kind === 'tool_result' ||
    entry.kind === 'result' ||
    entry.kind === 'artifact_result'
  )
    return 'ok';
  return 'info';
}

function isActivityEntry(entry: XenesisRawStreamEntry): boolean {
  if (entry.kind === 'artifact_stream' || entry.kind === 'assistant_delta') return false;
  return /^(?:desk_tool_|tool_|task_lifecycle|approval|artifact_|run|result|run_error)/.test(entry.kind);
}

export function summarizeXenesisTranscriptActivity(
  rawStream: XenesisRawStreamEntry[],
  limit = 10,
): XenesisTranscriptActivitySummary {
  const source = rawStream.filter(isActivityEntry);
  const items = source.slice(0, limit).map((entry) => {
    const status = activityStatusForEntry(entry);
    return {
      id: entry.id,
      at: entry.at,
      kind: entry.kind,
      label: activityLabelForEntry(entry),
      summary: entry.summary,
      status,
      detail: entry.detail,
    };
  });
  const toolCount = source.filter((entry) => /^(?:desk_tool_|tool_)/.test(entry.kind)).length;
  const errorCount = source.filter((entry) => entry.error || activityStatusForEntry(entry) === 'waiting').length;
  const attention = errorCount > 0 ? ` · ${errorCount} need attention` : '';
  const toolPart = toolCount > 0 ? ` · ${toolCount} tools` : '';
  return {
    totalCount: source.length,
    toolCount,
    errorCount,
    items,
    summary: `${source.length} events${toolPart}${attention}`,
  };
}

export function extractXenesisChoiceOptions(content: string): XenesisChoiceOption[] {
  const source = String(content || '');
  if (isXenesisInternalPromptNoise(source) || isXenesisCliTransportNoise(source)) return [];

  const lines = source.split(/\r?\n/);
  const options: XenesisChoiceOption[] = [];
  let firstOptionLineIndex = -1;
  for (const [lineIndex, line] of lines.entries()) {
    const match = line.match(/^\s*(?:[-*]\s*)?(\d{1,2})[.)]\s+(.+?)\s*$/);
    if (!match) {
      if (options.length > 0 && line.trim()) break;
      continue;
    }
    if (firstOptionLineIndex < 0) firstOptionLineIndex = lineIndex;
    const index = Number(match[1]);
    const label = match[2].replace(/^\*\*(.+)\*\*$/, '$1').trim();
    if (!Number.isInteger(index) || index <= 0 || !label) continue;
    options.push({ index, label, input: String(index) });
  }
  if (firstOptionLineIndex < 0) return [];
  const localChoiceContext = lines.slice(Math.max(0, firstOptionLineIndex - 4), firstOptionLineIndex).join('\n');
  if (!CHOICE_CONTEXT_PATTERN.test(localChoiceContext)) return [];
  return options.length >= 2 ? options : [];
}
