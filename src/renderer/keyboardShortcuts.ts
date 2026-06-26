import type { CommandShortcutBinding } from '../shared/types';

const MODIFIER_ORDER = ['Ctrl', 'Shift', 'Alt', 'Meta'];

type KeyboardLike = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'>;

function normalizeKeyName(key: string): string {
  const raw = String(key || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower === 'control' || lower === 'ctrl') return 'Ctrl';
  if (lower === 'shift') return 'Shift';
  if (lower === 'alt' || lower === 'option') return 'Alt';
  if (lower === 'meta' || lower === 'cmd' || lower === 'command' || lower === 'win') return 'Meta';
  if (lower === ' ') return 'Space';
  if (lower === 'esc') return 'Escape';
  if (lower === 'arrowup') return 'ArrowUp';
  if (lower === 'arrowdown') return 'ArrowDown';
  if (lower === 'arrowleft') return 'ArrowLeft';
  if (lower === 'arrowright') return 'ArrowRight';
  if (/^f\d{1,2}$/.test(lower)) return lower.toUpperCase();
  if (raw.length === 1) return raw.toUpperCase();
  return raw[0].toUpperCase() + raw.slice(1);
}

export function normalizeAccelerator(value: string): string {
  const parts = String(value || '')
    .split('+')
    .map((part) => normalizeKeyName(part))
    .filter(Boolean);
  const modifiers = MODIFIER_ORDER.filter((modifier) => parts.includes(modifier));
  const key = parts.find((part) => !MODIFIER_ORDER.includes(part));
  return key ? [...modifiers, key].join('+') : modifiers.join('+');
}

export function eventToAccelerator(event: KeyboardLike): string {
  const key = normalizeKeyName(event.key);
  if (!key || MODIFIER_ORDER.includes(key)) return '';
  const parts = [
    event.ctrlKey ? 'Ctrl' : '',
    event.shiftKey ? 'Shift' : '',
    event.altKey ? 'Alt' : '',
    event.metaKey ? 'Meta' : '',
    key,
  ].filter(Boolean);
  return normalizeAccelerator(parts.join('+'));
}

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function normalizeCommandShortcutBindings(value: unknown): CommandShortcutBinding[] {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  const byCommandId = new Map<string, CommandShortcutBinding>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const raw = item as Partial<CommandShortcutBinding>;
    const commandId = String(raw.commandId || '').trim();
    if (!commandId) continue;
    byCommandId.set(commandId, {
      id: String(raw.id || `shortcut-${commandId}-${now}`).trim(),
      commandId,
      accelerator: normalizeAccelerator(String(raw.accelerator || '')),
      enabled: raw.enabled !== false,
      createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : now,
      updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : now,
    });
  }
  return Array.from(byCommandId.values());
}

export function findDuplicateAccelerators(bindings: CommandShortcutBinding[]): Set<string> {
  const counts = new Map<string, number>();
  for (const binding of bindings) {
    if (!binding.enabled || !binding.accelerator) continue;
    const accelerator = normalizeAccelerator(binding.accelerator);
    counts.set(accelerator, (counts.get(accelerator) ?? 0) + 1);
  }
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([accelerator]) => accelerator),
  );
}
