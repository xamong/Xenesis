import React from 'react';
import '@pomelo-suite/timeline';
import type { ActivityPomeloTimelineModel, ActivityTimelineClip, ActivityTimelineTrack } from './activityTimelineModel';

interface TimelineEditorClipEvent {
  clip?: ActivityTimelineClip;
}

interface TimelineEditorInstance {
  tracks: ActivityTimelineTrack[];
  frameCount: number;
  frameWidth: number;
  minFrameWidth: number;
  maxFrameWidth: number;
  trackHeaderWidth: number;
  currentFrame: number;
  rulerMode: string;
  msPerFrame: number;
  majorTickMs: number;
  minorTickMs: number;
  render: () => void;
  addEventListener: (
    eventName: 'clipSelected',
    handler: (sender: TimelineEditorInstance, args: TimelineEditorClipEvent) => void,
  ) => void;
}

type TimelineEditorConstructor = new (
  canvas: HTMLCanvasElement,
  options?: Record<string, unknown>,
) => TimelineEditorInstance;

function getTimelineEditorConstructor(): TimelineEditorConstructor | null {
  return (globalThis as { TimelineEditor?: TimelineEditorConstructor }).TimelineEditor ?? null;
}

function formatWindowRange(model: ActivityPomeloTimelineModel): string {
  if (model.summary.total === 0) return 'No events';
  return `${new Date(model.startedAt).toLocaleTimeString()} - ${new Date(model.endedAt).toLocaleTimeString()}`;
}

export interface ActivityPomeloTimelineProps {
  model: ActivityPomeloTimelineModel;
  onSelectEvent?: (eventId: string) => void;
}

export function ActivityPomeloTimeline({ model, onSelectEvent }: ActivityPomeloTimelineProps) {
  const containerRef = React.useRef<HTMLElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const timelineRef = React.useRef<TimelineEditorInstance | null>(null);
  const onSelectEventRef = React.useRef(onSelectEvent);

  onSelectEventRef.current = onSelectEvent;

  const canvasHeight = Math.max(150, 30 + model.tracks.length * 40);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const syncCanvasSize = () => {
      const width = Math.max(620, Math.floor(container.clientWidth || 0));
      const height = canvasHeight;
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      timelineRef.current?.render();
    };

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [canvasHeight]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || timelineRef.current) return;

    const TimelineEditor = getTimelineEditorConstructor();
    if (!TimelineEditor) return;

    const timeline = new TimelineEditor(canvas, {
      rulerMode: 'time',
      msPerFrame: model.frameMs,
      majorTickMs: Math.max(model.frameMs, model.frameMs * 4),
      minorTickMs: model.frameMs,
    }) as TimelineEditorInstance;
    timeline.frameWidth = 16;
    timeline.minFrameWidth = 8;
    timeline.maxFrameWidth = 48;
    timeline.trackHeaderWidth = 116;

    timeline.addEventListener('clipSelected', (_sender, args) => {
      const eventId = args.clip?.tag?.eventId;
      if (eventId) onSelectEventRef.current?.(eventId);
    });

    timelineRef.current = timeline;
  }, [model.frameMs]);

  React.useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    timeline.tracks = model.tracks;
    timeline.frameCount = model.frameCount;
    timeline.rulerMode = 'time';
    timeline.msPerFrame = model.frameMs;
    timeline.majorTickMs = Math.max(model.frameMs, model.frameMs * 4);
    timeline.minorTickMs = model.frameMs;
    timeline.currentFrame = model.frameCount;
    timeline.render();
  }, [model]);

  if (model.summary.total === 0) {
    return (
      <section
        style={{
          borderBottom: '1px solid var(--border, #263142)',
          padding: '24px 12px',
          color: 'var(--ink-3, #7c8ba3)',
          textAlign: 'center',
        }}
      >
        No activity events recorded yet.
      </section>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-label="Activity timeline visual"
      style={{
        borderBottom: '1px solid var(--border, #263142)',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.92), rgba(8,13,24,0.98))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          color: 'var(--ink-2, #b8c7dc)',
          fontSize: 11,
          borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
        }}
      >
        <strong style={{ color: 'var(--ink, #f8fafc)', fontSize: 12 }}>Timeline</strong>
        <span>{formatWindowRange(model)}</span>
        <span style={{ marginLeft: 'auto' }}>{model.summary.total} events</span>
        {model.summary.running > 0 && <span>{model.summary.running} running</span>}
        {model.summary.failed > 0 && <span style={{ color: '#fca5a5' }}>{model.summary.failed} failed</span>}
      </div>
      <canvas
        ref={canvasRef}
        width={860}
        height={canvasHeight}
        style={{
          display: 'block',
          width: '100%',
          height: canvasHeight,
          pointerEvents: 'auto',
        }}
      />
    </section>
  );
}
