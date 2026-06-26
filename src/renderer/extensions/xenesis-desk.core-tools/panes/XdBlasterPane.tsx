import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyXdBlasterEvent,
  createXdBlasterState,
  parseXdBlasterMessage,
  resizeXdBlasterState,
  tickXdBlasterState,
  XD_BLASTER_STARTERS,
  type XdBlasterClassName,
  type XdBlasterEvent,
} from './xdBlasterModel';

const BLASTER_MESSAGE_EVENT = 'xd-blaster-message';

interface XdBlasterLogEntry {
  id: string;
  message: string;
  className?: XdBlasterClassName;
}

function eventMessage(event: XdBlasterEvent): string {
  const parts = [`xd.blaster.${event.type}`];
  if (event.name) parts.push(event.name);
  if (event.className) parts.push(event.className);
  return parts.join(' ');
}

function readDetailAsEvent(detail: unknown): XdBlasterEvent | null {
  if (typeof detail === 'string') return parseXdBlasterMessage(detail);
  if (!detail || typeof detail !== 'object') return null;
  const record = detail as Partial<XdBlasterEvent>;
  if (!record.type) return null;
  return record as XdBlasterEvent;
}

export function XdBlasterPane() {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState(() => createXdBlasterState({ width: 900, height: 420 }));
  const [input, setInput] = useState('xd.blaster.start capability-registry greencircle');
  const [recentNames, setRecentNames] = useState<string[]>([]);
  const [logs, setLogs] = useState<XdBlasterLogEntry[]>([]);

  const activeBubbles = useMemo(() => state.bubbles.filter((bubble) => bubble.state !== 'idle'), [state.bubbles]);

  const applyEvent = useCallback((event: XdBlasterEvent) => {
    setState((prev) => applyXdBlasterEvent(prev, event));
    setLogs((prev) =>
      [
        {
          id: crypto.randomUUID(),
          message: eventMessage(event),
          className: event.className,
        },
        ...prev,
      ].slice(0, 14),
    );
    if ((event.type === 'start' || event.type === 'init') && event.name) {
      setRecentNames((prev) => [event.name!, ...prev.filter((name) => name !== event.name)].slice(0, 8));
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setState((prev) => tickXdBlasterState(prev));
    }, 120);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.floor(entry.contentRect.width));
      const height = Math.max(1, Math.floor(entry.contentRect.height));
      setState((prev) => resizeXdBlasterState(prev, width, height));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<unknown>).detail;
      const parsed = readDetailAsEvent(detail);
      if (!parsed) return;
      applyEvent(parsed);
    };
    window.addEventListener(BLASTER_MESSAGE_EVENT, handler);
    return () => window.removeEventListener(BLASTER_MESSAGE_EVENT, handler);
  }, [applyEvent]);

  const submitInput = useCallback(() => {
    const parsed = parseXdBlasterMessage(input);
    if (!parsed) {
      setLogs((prev) => [{ id: crypto.randomUUID(), message: `ignored: ${input}` }, ...prev].slice(0, 14));
      return;
    }
    applyEvent(parsed);
  }, [applyEvent, input]);

  const hideRecent = useCallback(() => {
    const [name] = recentNames;
    if (!name) return;
    applyEvent({ type: 'hide', name, source: 'ui' });
    setRecentNames((prev) => prev.slice(1));
  }, [applyEvent, recentNames]);

  const runBurst = useCallback(() => {
    XD_BLASTER_STARTERS.forEach((starter, index) => {
      window.setTimeout(() => {
        applyEvent({
          ...starter.event,
          name: `${starter.event.name}-${Date.now().toString(36)}-${index}`,
        });
      }, index * 120);
    });
  }, [applyEvent]);

  return (
    <div className="xd-blaster-pane">
      <div className="xd-blaster-toolbar">
        <div className="xd-blaster-title">
          <strong>XD Blaster</strong>
          <span>{state.activeCount} active</span>
        </div>
        <div className="xd-blaster-actions">
          {XD_BLASTER_STARTERS.map((starter) => (
            <button key={starter.label} type="button" onClick={() => applyEvent(starter.event)}>
              {starter.label}
            </button>
          ))}
          <button type="button" onClick={hideRecent} disabled={recentNames.length === 0}>
            Hide Last
          </button>
          <button type="button" onClick={runBurst}>
            Burst
          </button>
          <button type="button" onClick={() => applyEvent({ type: 'reset', source: 'ui' })}>
            Reset
          </button>
        </div>
      </div>

      <div ref={stageRef} className="xd-blaster-stage" aria-label="XD Blaster bubble stage">
        <div className="xd-blaster-grid" />
        {activeBubbles.map((bubble) => (
          <div
            key={bubble.id}
            className={`xd-blaster-bubble is-${bubble.className}`}
            title={`${bubble.name} ${bubble.state}`}
            style={{
              left: bubble.x,
              top: bubble.y,
              width: bubble.radius * 2,
              height: bubble.radius * 2,
              backgroundColor: bubble.style.fill,
              borderColor: bubble.style.stroke,
              boxShadow: `0 0 ${Math.max(8, bubble.radius)}px ${bubble.style.glow}`,
              opacity: bubble.state === 'hiding' ? 0.72 : 1,
            }}
          />
        ))}
      </div>

      <div className="xd-blaster-console">
        <form
          className="xd-blaster-input"
          onSubmit={(event) => {
            event.preventDefault();
            submitInput();
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            spellCheck={false}
            aria-label="XD Blaster message"
          />
          <button type="submit">Send</button>
        </form>
        <div className="xd-blaster-log" aria-label="XD Blaster events">
          {logs.length === 0 ? (
            <span className="xd-blaster-empty">Waiting for xd.blaster messages.</span>
          ) : (
            logs.map((entry) => (
              <span key={entry.id} className={entry.className ? `is-${entry.className}` : undefined}>
                {entry.message}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
