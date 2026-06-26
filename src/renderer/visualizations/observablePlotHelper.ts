/**
 * Observable Plot helper for XCON data visualization.
 *
 * Observable Plot uses a declarative, data-centric API that is 3-4x more
 * token-efficient than Chart.js configuration objects. This makes it ideal
 * for LLM-generated visualizations.
 *
 * Chart.js: ~30 lines of config
 * Observable Plot: ~3-5 lines
 */

import * as Plot from '@observablehq/plot';

export interface PlotSpec {
  type: 'bar' | 'line' | 'dot' | 'area' | 'cell' | 'rule';
  data: Record<string, unknown>[];
  x: string;
  y?: string;
  fill?: string;
  stroke?: string;
  title?: string;
  width?: number;
  height?: number;
}

export function renderPlot(spec: PlotSpec): SVGSVGElement | HTMLElement {
  const marks: Plot.Markish[] = [];

  switch (spec.type) {
    case 'bar':
      marks.push(Plot.barY(spec.data, { x: spec.x, y: spec.y || 'value', fill: spec.fill || spec.x }));
      marks.push(Plot.ruleY([0]));
      break;
    case 'line':
      marks.push(Plot.lineY(spec.data, { x: spec.x, y: spec.y || 'value', stroke: spec.stroke }));
      break;
    case 'dot':
      marks.push(Plot.dot(spec.data, { x: spec.x, y: spec.y || 'value', fill: spec.fill }));
      break;
    case 'area':
      marks.push(
        Plot.areaY(spec.data, { x: spec.x, y: spec.y || 'value', fill: spec.fill || '#2563eb', fillOpacity: 0.3 }),
      );
      marks.push(Plot.lineY(spec.data, { x: spec.x, y: spec.y || 'value' }));
      break;
    case 'cell':
      marks.push(Plot.cell(spec.data, { x: spec.x, y: spec.y, fill: spec.fill || 'value' }));
      break;
    case 'rule':
      marks.push(Plot.ruleY(spec.data, { y: spec.y || 'value' }));
      break;
  }

  return Plot.plot({
    width: spec.width || 600,
    height: spec.height || 400,
    marks,
    style: { background: 'transparent' },
  });
}

export function renderPlotToSvgString(spec: PlotSpec): string {
  const element = renderPlot(spec);
  if (element instanceof SVGSVGElement) return element.outerHTML;
  return element.innerHTML;
}

export function quickBarChart(
  data: Array<{ label: string; value: number }>,
  options: { width?: number; height?: number; title?: string } = {},
): SVGSVGElement | HTMLElement {
  return renderPlot({
    type: 'bar',
    data,
    x: 'label',
    y: 'value',
    ...options,
  });
}

export function quickLineChart(
  data: Array<{ x: string | number; y: number }>,
  options: { width?: number; height?: number; title?: string } = {},
): SVGSVGElement | HTMLElement {
  return renderPlot({
    type: 'line',
    data,
    x: 'x',
    y: 'y',
    ...options,
  });
}
