import type { GowooriTargetMode } from '../agent/gowooriChatRunController';
import type { GowooriApplyDetail, GowooriApplyMode, GowooriInstanceDetail } from '../shared/gowooriEvents';
import type { GowooriUserTargetPreference } from './gowooriChatTypes';

export interface GowooriTargetOption {
  id: GowooriTargetMode;
  label: string;
}

export interface CreateGowooriApplyDetailInput {
  source: string;
  label: string;
  targetMode: GowooriTargetMode;
  applyMode: GowooriApplyMode;
}

export function createGowooriTargetOptions(targets: GowooriInstanceDetail[]): GowooriTargetOption[] {
  return [
    { id: 'new', label: 'New Gowoori' },
    { id: 'all', label: 'All open Gowoori panes' },
    ...targets.map((target) => ({
      id: target.id,
      label: `${target.title}${target.modified ? ' *' : ''}`,
    })),
  ];
}

export function isGowooriTargetAvailable(targetMode: GowooriTargetMode, targets: GowooriInstanceDetail[]): boolean {
  return targetMode === 'new' || targetMode === 'all' || targets.some((target) => target.id === targetMode);
}

export function normalizeGowooriTargetMode(
  targetMode: GowooriTargetMode,
  targets: GowooriInstanceDetail[],
): GowooriTargetMode {
  return isGowooriTargetAvailable(targetMode, targets) ? targetMode : (targets[0]?.id ?? 'new');
}

export function getGowooriTargetLabel(targetMode: GowooriTargetMode, targetOptions: GowooriTargetOption[]): string {
  return targetOptions.find((target) => target.id === targetMode)?.label ?? targetMode;
}

export function createGowooriUserTargetPreferenceLabel(preference: GowooriUserTargetPreference | null): string {
  if (!preference) return 'Ask before first render';
  if (preference.mode === 'always-new') return 'Always open a new Gowoori';
  return `Keep using ${preference.targetLabel}`;
}

export function shouldClearGowooriUserTargetPreference(
  preference: GowooriUserTargetPreference | null,
  targets: GowooriInstanceDetail[],
): boolean {
  return preference?.mode === 'sticky' && !targets.some((target) => target.id === preference.targetId);
}

export function resolveStickyGowooriUserTarget(
  preference: GowooriUserTargetPreference | null,
  targets: GowooriInstanceDetail[],
): GowooriTargetMode | null {
  if (!preference) return null;
  if (preference.mode === 'always-new') return 'new';
  return targets.some((target) => target.id === preference.targetId) ? preference.targetId : null;
}

export function createGowooriApplyDetail({
  source,
  label,
  targetMode,
  applyMode,
}: CreateGowooriApplyDetailInput): GowooriApplyDetail {
  return {
    targetId: targetMode === 'new' ? 'pending' : targetMode,
    source,
    label,
    mode: applyMode,
  };
}
