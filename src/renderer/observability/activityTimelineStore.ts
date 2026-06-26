import {
  type ActivityEvent,
  type ActivitySource,
  createActivityTimelineCollector,
} from '../extensions/xenesis-desk.core-tools/panes/activityTimelineCollector';

export const activityTimelineStore = createActivityTimelineCollector();

export function recordActivityEvent(event: Omit<ActivityEvent, 'id' | 'color'>): string {
  return activityTimelineStore.record(event);
}

export function completeActivityEvent(id: string, status: 'completed' | 'failed' = 'completed'): void {
  activityTimelineStore.complete(id, status);
}

export type { ActivityEvent, ActivitySource };
