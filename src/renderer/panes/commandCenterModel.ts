export type CommandLineEnding = 'cr' | 'lf' | 'crlf';
export type CommandInputMode = 'event' | 'paste' | 'direct' | 'typed';
export type CommandCenterTargetModeValue = 'active' | 'selected' | 'all' | 'group';

export interface CommandCenterTerminalLabelSource {
  id: string;
  label?: string;
  cwd?: string;
}

export interface SyncCommandCenterSelectedTerminalIdsOptions {
  targetMode: CommandCenterTargetModeValue;
  selectedTerminalIds: string[];
  activeTermId: string;
  previousActiveTermId?: string;
  availableTerminalIds: string[];
}

export function commandLineEndingSequence(value: CommandLineEnding): string {
  if (value === 'lf') return '\n';
  if (value === 'crlf') return '\r\n';
  return '\r';
}

export function appendCommandLineEnding(command: string, value: CommandLineEnding): string {
  return `${command}${commandLineEndingSequence(value)}`;
}

export function formatCommandCenterTerminalLabel(source: CommandCenterTerminalLabelSource): string {
  const base = lastPathSegment(source.cwd) || cleanLabel(source.label) || 'terminal';
  const shortId = String(source.id || '')
    .trim()
    .slice(0, 8);
  return shortId ? `${base} ${shortId}` : base;
}

export function syncCommandCenterSelectedTerminalIds({
  targetMode,
  selectedTerminalIds,
  activeTermId,
  previousActiveTermId,
  availableTerminalIds,
}: SyncCommandCenterSelectedTerminalIdsOptions): string[] {
  const available = new Set(availableTerminalIds.map((id) => String(id || '').trim()).filter(Boolean));
  const filtered = selectedTerminalIds.filter((id) => available.has(id));
  const baseSelection = sameStringList(filtered, selectedTerminalIds) ? selectedTerminalIds : filtered;
  if (targetMode !== 'selected') return baseSelection;

  const active = String(activeTermId || '').trim();
  if (!active || !available.has(active)) return baseSelection;
  if (baseSelection.length === 0) return [active];
  if (baseSelection.length === 1 && baseSelection[0] === active) return baseSelection;

  const previousActive = String(previousActiveTermId || '').trim();
  if (baseSelection.length === 1 && previousActive && baseSelection[0] === previousActive) {
    return [active];
  }
  return baseSelection;
}

function cleanLabel(value: string | undefined): string {
  return String(value || '').trim();
}

function lastPathSegment(value: string | undefined): string {
  return (
    String(value || '')
      .split(/[\\/]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .pop() ?? ''
  );
}

function sameStringList(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
