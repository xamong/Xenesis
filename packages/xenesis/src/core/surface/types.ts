export interface SurfaceBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SurfaceElement {
  index: number;
  role: string;
  label: string;
  bbox?: SurfaceBBox;
}

export interface SurfaceCanvas {
  ref: string;
  width: number;
  height: number;
  clientWidth: number;
  clientHeight: number;
  visible: boolean;
  pixelContent: 'observed' | 'blank' | 'unknown';
}

export interface SurfaceSnapshot {
  surface: string;
  url?: string;
  title?: string;
  text: string;
  elements: SurfaceElement[];
  canvases?: SurfaceCanvas[];
  screenshot?: string;
  som: boolean;
}

export type SurfaceAction =
  | { type: 'navigate'; url: string }
  | { type: 'click'; index: number }
  | { type: 'fill'; index: number; text: string; submit?: boolean }
  | { type: 'back' };

export interface SnapshotOptions {
  som?: boolean;
}

export interface SurfaceHandler {
  readonly name: string;
  snapshot(options?: SnapshotOptions): Promise<SurfaceSnapshot>;
  act(action: SurfaceAction): Promise<SurfaceSnapshot>;
  close(): Promise<void>;
}

export function renderSurfaceSnapshot(snapshot: SurfaceSnapshot): string {
  const elements = snapshot.elements.map((element) => `[${element.index}] <${element.role}> ${element.label}`);
  const canvases = (snapshot.canvases ?? []).map((canvas) =>
    [
      canvas.ref,
      `${canvas.width}x${canvas.height}`,
      `client=${Math.round(canvas.clientWidth)}x${Math.round(canvas.clientHeight)}`,
      `visible=${canvas.visible}`,
      `pixels=${canvas.pixelContent}`,
    ].join(' '),
  );

  return [
    snapshot.url ? `url: ${snapshot.url}` : undefined,
    snapshot.title ? `title: ${snapshot.title}` : undefined,
    '',
    snapshot.text,
    '',
    elements.length > 0 ? `interactive elements:\n${elements.join('\n')}` : 'interactive elements: none',
    canvases.length > 0 ? `canvas surfaces:\n${canvases.join('\n')}` : 'canvas surfaces: none',
    `som: ${snapshot.som ? 'yes' : 'no'}`,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');
}
