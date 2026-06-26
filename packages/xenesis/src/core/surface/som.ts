import type { SurfaceBBox } from "./types.js";

export interface MarkInput {
  index: number;
  bbox: SurfaceBBox;
}

export function buildMarkOverlayScript(marks: MarkInput[]): string {
  const data = JSON.stringify(marks);
  return `(() => {
    const prev = document.getElementById('__xenesis_som__');
    if (prev) prev.remove();
    const c = document.createElement('div');
    c.id = '__xenesis_som__';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none';
    for (const m of ${data}) {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;border:2px solid #e11;box-sizing:border-box;left:' + m.bbox.x + 'px;top:' + m.bbox.y + 'px;width:' + m.bbox.width + 'px;height:' + m.bbox.height + 'px';
      const tag = document.createElement('div');
      tag.textContent = String(m.index);
      tag.style.cssText = 'position:fixed;background:#e11;color:#fff;font:12px monospace;padding:0 3px;left:' + m.bbox.x + 'px;top:' + Math.max(0, m.bbox.y - 14) + 'px';
      c.appendChild(box);
      c.appendChild(tag);
    }
    document.body.appendChild(c);
  })();`;
}

export function removeMarkOverlayScript(): string {
  return `(() => { const c = document.getElementById('__xenesis_som__'); if (c) c.remove(); })();`;
}
