/**
 * D3-based advanced visualization components for XCON.
 *
 * These renderers generate SVG markup that can be embedded in XCON sketch
 * or used directly in Desk panels. They complement the existing Chart.js
 * (bar/line/pie) and @pomelo-suite/diagram (network) renderers.
 *
 * New component types: treemap, sankey, sunburst, chord, forceGraph
 */

import * as d3Array from 'd3-array';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Scale from 'd3-scale';
import * as d3Shape from 'd3-shape';

export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  color?: string;
}

export interface SankeyNode {
  id: string;
  label: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface ChordEntry {
  source: string;
  target: string;
  value: number;
}

const DEFAULT_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#22c55e', '#ec4899', '#06b6d4'];

export function renderTreemapSvg(data: TreemapNode, width = 600, height = 400): string {
  const root = d3Hierarchy
    .hierarchy(data)
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  d3Hierarchy.treemap<TreemapNode>().size([width, height]).padding(2)(root);

  const leaves = root.leaves();
  const rects = leaves.map((leaf, i) => {
    const x = (leaf as any).x0 ?? 0;
    const y = (leaf as any).y0 ?? 0;
    const w = ((leaf as any).x1 ?? 0) - x;
    const h = ((leaf as any).y1 ?? 0) - y;
    const color = leaf.data.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const label = leaf.data.name;
    const value = leaf.value ?? 0;

    return (
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" stroke="#fff" stroke-width="1" rx="2"/>` +
      (w > 40 && h > 20
        ? `<text x="${x + 4}" y="${y + 14}" font-size="11" fill="#fff" font-weight="600">${escSvg(label)}</text>`
        : '') +
      (w > 40 && h > 34
        ? `<text x="${x + 4}" y="${y + 28}" font-size="10" fill="rgba(255,255,255,0.7)">${value}</text>`
        : '')
    );
  });

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${rects.join('')}</svg>`;
}

export function renderSunburstSvg(data: TreemapNode, width = 400, height = 400): string {
  const radius = Math.min(width, height) / 2;
  const root = d3Hierarchy
    .hierarchy(data)
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const partition = d3Hierarchy.partition<TreemapNode>().size([2 * Math.PI, radius]);
  partition(root);

  const arc = d3Shape
    .arc<any>()
    .startAngle((d) => d.x0)
    .endAngle((d) => d.x1)
    .innerRadius((d) => d.y0)
    .outerRadius((d) => d.y1);

  const paths = root
    .descendants()
    .filter((d) => d.depth > 0)
    .map((d, i) => {
      const color = d.data.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
      return `<path d="${arc(d)}" fill="${color}" stroke="#fff" stroke-width="0.5"/>`;
    });

  return `<svg viewBox="${-radius} ${-radius} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`;
}

export function renderForceGraphSvg(
  nodes: Array<{ id: string; label: string; color?: string; x?: number; y?: number }>,
  links: Array<{ source: string; target: string }>,
  width = 600,
  height = 400,
): string {
  const nodeMap = new Map(
    nodes.map((n, i) => [
      n.id,
      {
        ...n,
        x: n.x ?? width / 2 + Math.cos((i * 2 * Math.PI) / nodes.length) * width * 0.3,
        y: n.y ?? height / 2 + Math.sin((i * 2 * Math.PI) / nodes.length) * height * 0.3,
      },
    ]),
  );

  const lines = links.map((l) => {
    const s = nodeMap.get(l.source);
    const t = nodeMap.get(l.target);
    if (!s || !t) return '';
    return `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="#94a3b8" stroke-width="1.5"/>`;
  });

  const circles = nodes.map((n, i) => {
    const pos = nodeMap.get(n.id)!;
    const color = n.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return (
      `<circle cx="${pos.x}" cy="${pos.y}" r="18" fill="${color}" stroke="#fff" stroke-width="2"/>` +
      `<text x="${pos.x}" y="${pos.y + 4}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${escSvg(n.label)}</text>`
    );
  });

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${lines.join('')}${circles.join('')}</svg>`;
}

export function renderChordSvg(entries: ChordEntry[], labels: string[], width = 400, height = 400): string {
  const n = labels.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const labelIndex = new Map(labels.map((l, i) => [l, i]));

  for (const e of entries) {
    const si = labelIndex.get(e.source);
    const ti = labelIndex.get(e.target);
    if (si !== undefined && ti !== undefined) matrix[si][ti] = e.value;
  }

  const radius = Math.min(width, height) / 2 - 30;
  const innerRadius = radius * 0.8;

  const chordAngles: Array<{ startAngle: number; endAngle: number }> = [];
  const total = matrix.flat().reduce((a, b) => a + b, 0) || 1;
  let angle = 0;
  for (let i = 0; i < n; i++) {
    const rowSum = matrix[i].reduce((a, b) => a + b, 0);
    const span = (rowSum / total) * 2 * Math.PI;
    chordAngles.push({ startAngle: angle, endAngle: angle + span });
    angle += span + 0.02;
  }

  const arcs = chordAngles.map((a, i) => {
    const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    const arcGen = d3Shape.arc<any>().innerRadius(innerRadius).outerRadius(radius);
    return `<path d="${arcGen(a)}" fill="${color}" stroke="#fff" stroke-width="1"/>`;
  });

  return `<svg viewBox="${-width / 2} ${-height / 2} ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${arcs.join('')}</svg>`;
}

function escSvg(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
