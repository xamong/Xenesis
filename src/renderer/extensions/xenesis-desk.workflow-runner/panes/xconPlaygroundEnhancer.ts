/**
 * XCON Playground enhancer.
 *
 * Augments the existing XconViewerPane with:
 *   - Live preview (CodeMirror left → XCON render right)
 *   - Fixture editing with instant re-render
 *   - Template quick-start
 *   - XCON syntax autocomplete hints
 *
 * This module provides the data layer; the UI is in the existing
 * XconViewerPane split mode.
 */

export interface PlaygroundState {
  source: string;
  fixtureJson: string;
  previewHtml: string;
  lastRenderMs: number;
  errors: string[];
}

export interface PlaygroundTemplate {
  id: string;
  label: string;
  category: string;
  source: string;
  description?: string;
  tags?: string[];
  demoRank?: number;
  recommendedFor?: string[];
}

export const FIRST_FIVE_MINUTE_TEMPLATE_IDS = [
  'first-run-viral-dashboard',
  'fixture-binding',
  'basic-chart',
  'basic-grid',
] as const;

const TEMPLATES: PlaygroundTemplate[] = [
  {
    id: 'first-run-viral-dashboard',
    label: 'First run viral dashboard',
    category: 'dashboard',
    description: 'Chart, grid, and map starter for a five-minute Desk demo artifact.',
    tags: ['dashboard', 'chart', 'map', 'spangrid', 'first-5-demo'],
    demoRank: 10,
    recommendedFor: ['first-5-demo', 'demo-route', 'gowoori'],
    source: `\`\`\`xcon-sketch
screen "First Run Demo Handoff" 960x540
  title: label "First Run Demo Handoff" at 32 24 420 36
    font
      size 24
      weight 800
  chart1: chart at 32 84 420 220
    chartType "bar"
    chartData {"labels":["Onboarding","Agent","Gowoori"],"datasets":[{"label":"Demo steps","data":[7,2,3],"backgroundColor":["#06b6d4","#8b5cf6","#22c55e"]}]}
  grid1: spanGrid at 32 328 420 160
    backgroundColor "#ffffff"
    readonly true
    data [["Stage","Capability"],["Onboarding","sample + capture"],["Xenesis","status + pane"],["Gowoori","artifact + thumbnail"]]
  map1: map at 500 84 420 220
    latitude 33.4996
    longitude 126.5312
    zoom 7
    markers [{"lat":33.4996,"lng":126.5312,"title":"Jeju demo artifact"}]
\`\`\``,
  },
  {
    id: 'basic-chart',
    label: 'Bar Chart',
    category: 'chart',
    description: 'Compact chart starter for the Template Catalog.',
    tags: ['chart', 'bar', 'first-5-demo'],
    demoRank: 30,
    recommendedFor: ['first-5-demo'],
    source: `\`\`\`xcon-sketch
screen "Chart Demo" 600x400
  chart1: chart at 20 20 560 360
    chartType "bar"
    chartData {"labels":["A","B","C"],"datasets":[{"label":"Score","data":[42,68,56],"backgroundColor":["#2563eb","#14b8a6","#f59e0b"]}]}
\`\`\``,
  },
  {
    id: 'basic-grid',
    label: 'Data Grid',
    category: 'spanGrid',
    description: 'Small read-only data grid starter.',
    tags: ['spangrid', 'grid', 'first-5-demo'],
    demoRank: 40,
    recommendedFor: ['first-5-demo'],
    source: `\`\`\`xcon-sketch
screen "Grid Demo" 600x300
  grid1: spanGrid at 20 20 560 260
    backgroundColor "#ffffff"
    readonly true
    data [["Name","Status","Value"],["Alpha","Ready","42"],["Beta","Watch","68"]]
\`\`\``,
  },
  {
    id: 'basic-network',
    label: 'Network Diagram',
    category: 'networkDiagram',
    description: 'Network diagram starter for technical demos.',
    tags: ['network', 'diagram'],
    source: `\`\`\`xcon-sketch
screen "Network Demo" 600x400
  net1: networkDiagram at 20 20 560 360
    backgroundColor "#0f172a"
    showLabels true
    showArrows true
    nodes [{"id":"a","label":"API","x":100,"y":200},{"id":"b","label":"DB","x":300,"y":100},{"id":"c","label":"Cache","x":300,"y":300}]
    links [{"source":"a","target":"b"},{"source":"a","target":"c"}]
\`\`\``,
  },
  {
    id: 'fixture-binding',
    label: 'Fixture Binding',
    category: 'data-binding',
    description: 'Fixture and chain starter for explaining live data binding.',
    tags: ['fixture', 'chain', 'binding', 'first-5-demo'],
    demoRank: 20,
    recommendedFor: ['first-5-demo', 'binding'],
    source: `\`\`\`xcon-chain-fixture
{
  "title": "Fixture Demo",
  "value": 42
}
\`\`\`

\`\`\`xcon-chain as displayValue
= "Current: " + record.value
\`\`\`

\`\`\`xcon-sketch
screen "Binding Demo" 400x200
  label1: label "$displayValue" at 20 20 360 40
    font
      size 24
      weight 800
\`\`\``,
  },
];

function sortPlaygroundTemplatesForFirstFiveMinuteDemo(templates: PlaygroundTemplate[]): PlaygroundTemplate[] {
  return [...templates].sort((left, right) => {
    const leftRank = Number.isFinite(left.demoRank)
      ? (left.demoRank ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.demoRank)
      ? (right.demoRank ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.label.localeCompare(right.label);
  });
}

export function getPlaygroundTemplates(): PlaygroundTemplate[] {
  return sortPlaygroundTemplatesForFirstFiveMinuteDemo(TEMPLATES);
}

export function getPlaygroundTemplate(id: string): PlaygroundTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplateCategories(): string[] {
  return [...new Set(TEMPLATES.map((t) => t.category))];
}
