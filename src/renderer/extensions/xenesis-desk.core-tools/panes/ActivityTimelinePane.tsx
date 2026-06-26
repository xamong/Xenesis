import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ActivityEvent,
  type ActivitySource,
  activityTimelineStore,
} from '../../../observability/activityTimelineStore';
import { ActivityPomeloTimeline } from './ActivityPomeloTimeline';
import { ACTIVITY_SOURCE_LABELS, createActivityPomeloTimelineModel } from './activityTimelineModel';

export default function ActivityTimelinePane() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<ActivitySource | 'all'>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    const opts = filter === 'all' ? { limit: 100 } : { source: filter as ActivitySource, limit: 100 };
    const nextEvents = activityTimelineStore.getEvents(opts);
    setEvents(nextEvents);
    setSelectedEventId((current) => (current && nextEvents.some((event) => event.id === current) ? current : null));
    setRefreshKey((k) => k + 1);
  }, [filter]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, [refresh]);

  const sources = useMemo(() => ['all', ...Object.keys(ACTIVITY_SOURCE_LABELS)] as const, []);
  const timelineModel = useMemo(
    () => createActivityPomeloTimelineModel(events, { now: Date.now() }),
    [events, refreshKey],
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, system-ui)',
        fontSize: 13,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 12px',
          borderBottom: '1px solid var(--border, #333)',
          flexWrap: 'wrap',
        }}
      >
        {sources.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s as any)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid var(--border, #444)',
              background: filter === s ? 'var(--accent, #2563eb)' : 'transparent',
              color: filter === s ? '#fff' : 'var(--ink-2, #aaa)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {s === 'all' ? 'All' : ACTIVITY_SOURCE_LABELS[s as ActivitySource]}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--ink-3, #666)', fontSize: 11 }}>{events.length} events</span>
      </div>
      <ActivityPomeloTimeline model={timelineModel} onSelectEvent={setSelectedEventId} />
      <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3, #666)' }}>
            No activity events recorded yet.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 8px',
                borderBottom: '1px solid var(--border, #222)',
                borderLeft: selectedEventId === event.id ? `3px solid ${event.color}` : '3px solid transparent',
                background: selectedEventId === event.id ? 'rgba(14, 165, 233, 0.10)' : 'transparent',
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: event.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--ink-3, #888)', minWidth: 50 }}>
                {new Date(event.startedAt).toLocaleTimeString()}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, minWidth: 60 }}>
                {ACTIVITY_SOURCE_LABELS[event.source]}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background:
                    event.status === 'completed' ? '#166534' : event.status === 'failed' ? '#991b1b' : '#1e40af',
                  color: '#fff',
                }}
              >
                {event.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
