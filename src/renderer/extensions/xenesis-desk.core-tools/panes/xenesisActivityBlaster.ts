import type { XdBlasterClassName, XdBlasterEvent } from './xdBlasterModel';
import type { XenesisDeskActionActivity, XenesisDeskActionRequest } from './xenesisAgentDeskControl';

const XD_BLASTER_MESSAGE_EVENT = 'xd-blaster-message';
const XD_BLASTER_ACTIVITY_SOURCE = 'xenesis-activity' as const;

export function xdBlasterClassForDeskPath(path: string): XdBlasterClassName {
  const normalized = String(path || '').trim();
  if (normalized.startsWith('xd.terminals.')) return 'bluecircle';
  if (normalized.startsWith('xd.dock.')) return 'fuchsiacircle';
  if (normalized.startsWith('xd.files.')) return 'yellowcircle';
  if (normalized.startsWith('xd.tools.')) return 'greencircle';
  if (normalized.startsWith('xd.automation.')) return 'whitecircle';
  if (normalized.startsWith('xd.xenesis.') || normalized.startsWith('xd.services.xenesis.')) return 'limecircle';
  if (normalized.startsWith('xd.diagnostics.')) return 'orangecircle';
  return 'greencircle';
}

export function xdBlasterNameForDeskAction(action: XenesisDeskActionRequest): string {
  const rawName = String(action.id || action.path || 'action')
    .trim()
    .replace(/\s+/g, '-');
  return `desk:${rawName.slice(0, 80) || 'action'}`;
}

export function createXdBlasterEventsForDeskActionActivity(activity: XenesisDeskActionActivity): XdBlasterEvent[] {
  const name = xdBlasterNameForDeskAction(activity.action);
  if (activity.phase === 'start') {
    return [
      {
        type: 'start',
        name,
        className: xdBlasterClassForDeskPath(activity.action.path),
        source: XD_BLASTER_ACTIVITY_SOURCE,
      },
    ];
  }

  if (activity.phase === 'success') {
    return [{ type: 'end', name, source: XD_BLASTER_ACTIVITY_SOURCE }];
  }

  if (activity.phase === 'approval-required') {
    return [
      { type: 'hide', name, source: XD_BLASTER_ACTIVITY_SOURCE },
      {
        type: 'start',
        name: `${name}:approval`,
        className: 'yellowcircle',
        source: XD_BLASTER_ACTIVITY_SOURCE,
      },
    ];
  }

  return [
    { type: 'hide', name, source: XD_BLASTER_ACTIVITY_SOURCE },
    {
      type: 'start',
      name: `${name}:error`,
      className: 'redcircle',
      source: XD_BLASTER_ACTIVITY_SOURCE,
    },
  ];
}

export function dispatchXdBlasterEvent(event: XdBlasterEvent, target: EventTarget | undefined = globalThis): boolean {
  if (!target || typeof target.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return false;
  target.dispatchEvent(new CustomEvent(XD_BLASTER_MESSAGE_EVENT, { detail: event }));
  return true;
}

export function dispatchXdBlasterEvents(events: XdBlasterEvent[], target?: EventTarget): number {
  let dispatched = 0;
  for (const event of events) {
    if (dispatchXdBlasterEvent(event, target)) dispatched += 1;
  }
  return dispatched;
}
