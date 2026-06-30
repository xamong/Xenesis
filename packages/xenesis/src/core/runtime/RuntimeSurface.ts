import type { AgentRunEvent } from '../events.js';

export type RuntimeSurfaceName = 'cli' | 'gateway' | 'headless' | 'embedded' | 'worker' | 'channel' | 'sdk';

export type RuntimeOutputMode = 'text' | 'json' | 'stream-json';

export interface RuntimeSurfaceDescriptor {
  name: RuntimeSurfaceName;
  outputMode: RuntimeOutputMode;
  interactive: boolean;
}

export interface RuntimeSurfaceSnapshot {
  surface: RuntimeSurfaceDescriptor;
  events: AgentRunEvent[];
  notices: string[];
  output: string;
}

export class RuntimeSurfaceObjectModel {
  private readonly events: AgentRunEvent[] = [];
  private readonly notices: string[] = [];
  private readonly lines: string[] = [];

  constructor(readonly surface: RuntimeSurfaceDescriptor) {}

  recordEvent(event: AgentRunEvent) {
    this.events.push(event);
    if (this.surface.outputMode === 'stream-json' || this.surface.outputMode === 'json') {
      this.lines.push(JSON.stringify(event));
    }
  }

  recordNotice(line: string) {
    this.notices.push(line);
    if (this.surface.outputMode === 'stream-json') {
      this.lines.push(JSON.stringify({ type: 'notice', message: line }));
    } else if (this.surface.outputMode === 'text') {
      this.lines.push(line);
    }
  }

  importEvents(events: readonly AgentRunEvent[]) {
    for (const event of events) this.recordEvent(event);
  }

  snapshot(): RuntimeSurfaceSnapshot {
    return {
      surface: this.surface,
      events: [...this.events],
      notices: [...this.notices],
      output: this.lines.join('\n'),
    };
  }
}

export function createRuntimeSurfaceObjectModel(surface: RuntimeSurfaceDescriptor) {
  return new RuntimeSurfaceObjectModel(surface);
}
