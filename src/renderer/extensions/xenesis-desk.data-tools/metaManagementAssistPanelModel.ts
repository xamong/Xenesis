export type MetaManagementAssistMode = 'form' | 'relations' | 'export' | 'import' | 'activity';

export interface MetaManagementAssistAction {
  id: MetaManagementAssistMode;
  label: string;
  surface: 'dialog';
}

export const META_MANAGEMENT_ASSIST_ACTIONS: MetaManagementAssistAction[] = [
  { id: 'form', label: 'Form', surface: 'dialog' },
  { id: 'relations', label: 'Relations', surface: 'dialog' },
  { id: 'export', label: 'Export', surface: 'dialog' },
  { id: 'import', label: 'Import', surface: 'dialog' },
  { id: 'activity', label: 'Activity', surface: 'dialog' },
];

export function openMetaAssistDialog(
  _current: MetaManagementAssistMode | null,
  next: MetaManagementAssistMode,
): MetaManagementAssistMode {
  return next;
}

export function closeMetaAssistDialog(_current: MetaManagementAssistMode | null): null {
  return null;
}

export function getMetaAssistDialogTitle(mode: MetaManagementAssistMode | null): string {
  return META_MANAGEMENT_ASSIST_ACTIONS.find((action) => action.id === mode)?.label ?? 'XMDB Assist';
}
