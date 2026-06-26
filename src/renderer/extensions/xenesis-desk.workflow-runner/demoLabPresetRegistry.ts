import bindingDashboardSource from '../../../../examples/demo-lab/binding-dashboard.xcon.md?raw';
import chatStreamWeatherSource from '../../../../examples/demo-lab/chat-stream-weather.xcon.md?raw';
import cinematicLaunchRoomSource from '../../../../examples/demo-lab/cinematic-launch-room.xcon.md?raw';
import gridEditorCanvasModeSource from '../../../../examples/demo-lab/grid-editor-canvas-mode.xcon.md?raw';
import typingWriterCardSource from '../../../../examples/demo-lab/typing-writer-card.xcon.md?raw';
import { BUILT_IN_DEMO } from './demoLabPreset';

const bindingLabPresetSources = import.meta.glob<string>('../../../../examples/demo-lab/binding-lab-*.xcon.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});

export type DemoLabPresetKind = 'built-in' | 'example' | 'local';
export type DemoLabPresetCategory = 'Starter' | 'Chat' | 'Data binding' | 'Cinematic' | 'Canvas' | 'Local';

export interface DemoLabPresetRegistryItem {
  id: string;
  title: string;
  fileName: string;
  kind: DemoLabPresetKind;
  category: DemoLabPresetCategory;
  description: string;
  tags: string[];
  content: string;
  demoRank?: number;
  recommendedFor?: string[];
}

type BindingLabPresetMetadata = Omit<DemoLabPresetRegistryItem, 'kind' | 'category' | 'content'>;

export const FIRST_FIVE_MINUTE_DEMO_PRESET_IDS = [
  'chat-stream-weather',
  'binding-lab-weather-forecast-ops',
  'binding-dashboard',
  'built-in',
  'cinematic-launch-room',
  'grid-editor-canvas-mode',
] as const;

const BINDING_LAB_PRESET_METADATA: BindingLabPresetMetadata[] = [
  {
    id: 'binding-lab-metadata-brief',
    title: 'Metadata operations brief',
    fileName: 'binding-lab-metadata-brief.xcon.md',
    description: 'Template-lab style binding demo with chart, SpanGrid, fixture aliases, and workflow progress.',
    tags: ['binding-lab', 'metadata', 'chart', 'spangrid', 'workflow'],
  },
  {
    id: 'binding-lab-family-binding-demo',
    title: 'Family binding demo',
    fileName: 'binding-lab-family-binding-demo.xcon.md',
    description: 'Fixture + chain + workflow split where the workflow changes JSON only and SKETCH stays static.',
    tags: ['binding-lab', 'fixture', 'chain', 'workflow', 'family'],
  },
  {
    id: 'binding-lab-monitoring-sketch-demo',
    title: 'Monitoring SKETCH demo',
    fileName: 'binding-lab-monitoring-sketch-demo.xcon.md',
    description: 'Queue and scheduler events rendered as a live monitoring dashboard.',
    tags: ['binding-lab', 'monitoring', 'queue', 'scheduler', 'sketch'],
  },
  {
    id: 'binding-lab-incident-response',
    title: 'Incident response brief',
    fileName: 'binding-lab-incident-response.xcon.md',
    description: 'Operations status report with risk chart, command-owner grid, and workflow progress.',
    tags: ['binding-lab', 'incident', 'operations', 'chart', 'workflow'],
  },
  {
    id: 'binding-lab-invoice-approval',
    title: 'Invoice approval packet',
    fileName: 'binding-lab-invoice-approval.xcon.md',
    description: 'Document-style invoice approval flow with editable fixture data and workflow-driven progress.',
    tags: ['binding-lab', 'invoice', 'approval', 'document', 'workflow'],
  },
  {
    id: 'binding-lab-all-chart-types-gallery',
    title: 'All chart types gallery',
    fileName: 'binding-lab-all-chart-types-gallery.xcon.md',
    description: 'Chart gallery for bar, line, pie, doughnut, radar, polarArea, scatter, and bubble previews.',
    tags: ['binding-lab', 'chart', 'gallery', 'spangrid', 'workflow'],
  },
  {
    id: 'binding-lab-sensor-drone-monitoring',
    title: 'Sensor drone monitoring',
    fileName: 'binding-lab-sensor-drone-monitoring.xcon.md',
    description: 'Drone, camera, map, sensor gauges, network diagram, and dispatch workflow.',
    tags: ['binding-lab', 'dashboard', 'map', 'network', 'drone'],
  },
  {
    id: 'binding-lab-smart-factory-monitoring',
    title: 'Smart factory monitoring',
    fileName: 'binding-lab-smart-factory-monitoring.xcon.md',
    description: 'Factory KPI wall with machine cells, production chart, and queue-driven line updates.',
    tags: ['binding-lab', 'dashboard', 'factory', 'chart', 'grid'],
  },
  {
    id: 'binding-lab-urban-cctv-command',
    title: 'Urban CCTV command',
    fileName: 'binding-lab-urban-cctv-command.xcon.md',
    description: 'Traffic CCTV, static map preview, incident table, and workflow-fed regional monitoring.',
    tags: ['binding-lab', 'dashboard', 'cctv', 'map', 'workflow'],
  },
  {
    id: 'binding-lab-hospital-operations',
    title: 'Hospital operations',
    fileName: 'binding-lab-hospital-operations.xcon.md',
    description: 'Medical command dashboard with vitals, care teams, and real-time care workflow state.',
    tags: ['binding-lab', 'dashboard', 'medical', 'network', 'workflow'],
  },
  {
    id: 'binding-lab-energy-utility-dashboard',
    title: 'Energy & utility dashboard',
    fileName: 'binding-lab-energy-utility-dashboard.xcon.md',
    description: 'Utility consumption, service-region map, forecast chart, and meter workqueue.',
    tags: ['binding-lab', 'dashboard', 'energy', 'map', 'chart'],
  },
  {
    id: 'binding-lab-financial-ar-ap-dashboard',
    title: 'Financial AR/AP dashboard',
    fileName: 'binding-lab-financial-ar-ap-dashboard.xcon.md',
    description: 'Finance dashboard with receivables, payables, aging buckets, and approval workflow.',
    tags: ['binding-lab', 'dashboard', 'finance', 'workflow', 'chart'],
  },
  {
    id: 'binding-lab-parking-lot-monitoring',
    title: 'Parking lot monitoring',
    fileName: 'binding-lab-parking-lot-monitoring.xcon.md',
    description: 'Parking occupancy, vehicle camera, slot grid, and incident workflow.',
    tags: ['binding-lab', 'dashboard', 'parking', 'grid', 'workflow'],
  },
  {
    id: 'binding-lab-realtime-machine-risk',
    title: 'Realtime machine risk',
    fileName: 'binding-lab-realtime-machine-risk.xcon.md',
    description: 'Machine telemetry, risk warning, network topology, and scheduler-driven safety state.',
    tags: ['binding-lab', 'dashboard', 'machine', 'risk', 'network'],
  },
  {
    id: 'binding-lab-weather-forecast-ops',
    title: 'Weather forecast ops',
    fileName: 'binding-lab-weather-forecast-ops.xcon.md',
    description: 'Time-based weather forecast dashboard with map, chart, and alert workflow.',
    tags: ['binding-lab', 'dashboard', 'weather', 'map', 'workflow', 'first-5-demo'],
    demoRank: 20,
    recommendedFor: ['first-5-demo', 'gowoori', 'weather'],
  },
  {
    id: 'binding-lab-sales-comparison-dashboard',
    title: 'Sales comparison dashboard',
    fileName: 'binding-lab-sales-comparison-dashboard.xcon.md',
    description: 'Long-period sales comparison dashboard with charts, tables, and workflow approval state.',
    tags: ['binding-lab', 'dashboard', 'sales', 'chart', 'workflow'],
  },
];

function getBindingLabPresetContent(fileName: string): string {
  return bindingLabPresetSources[`../../../../examples/demo-lab/${fileName}`] ?? '';
}

export const DEMO_LAB_PRESET_REGISTRY: DemoLabPresetRegistryItem[] = [
  {
    id: 'built-in',
    title: 'Built-in demo preset',
    fileName: 'built-in-demo.xcon.md',
    kind: 'built-in',
    category: 'Starter',
    description: 'Baseline Markdown plus XCON/SKETCH demo preset for verifying the Demo Lab player.',
    tags: ['starter', 'markdown', 'sketch', 'timeline', 'first-5-demo'],
    demoRank: 40,
    recommendedFor: ['first-5-demo', 'baseline'],
    content: BUILT_IN_DEMO,
  },
  {
    id: 'chat-stream-weather',
    title: 'Chat stream weather',
    fileName: 'chat-stream-weather.xcon.md',
    kind: 'example',
    category: 'Chat',
    description: 'Chat-style streaming demo where an assistant response appears as Markdown plus XCON/SKETCH.',
    tags: ['chat', 'stream', 'weather', 'sketch', 'first-5-demo'],
    demoRank: 10,
    recommendedFor: ['first-5-demo', 'gowoori', 'chat'],
    content: chatStreamWeatherSource,
  },
  {
    id: 'binding-dashboard',
    title: 'Binding replay dashboard',
    fileName: 'binding-dashboard.xcon.md',
    kind: 'example',
    category: 'Data binding',
    description: 'Workflow changes fixture data; chain aliases recompute chart, grid, and progress UI.',
    tags: ['fixture', 'chain', 'workflow', 'dashboard', 'binding', 'first-5-demo'],
    demoRank: 30,
    recommendedFor: ['first-5-demo', 'binding'],
    content: bindingDashboardSource,
  },
  {
    id: 'typing-writer-card',
    title: 'Typing writer card',
    fileName: 'typing-writer-card.xcon.md',
    kind: 'example',
    category: 'Chat',
    description:
      'Typing-focused demo showing clear, append, live Markdown, and SKETCH rendering from typeText actions.',
    tags: ['typing', 'typeText', 'markdown', 'sketch', 'stream'],
    content: typingWriterCardSource,
  },
  ...BINDING_LAB_PRESET_METADATA.map((preset) => ({
    ...preset,
    kind: 'example' as const,
    category: 'Data binding' as const,
    content: getBindingLabPresetContent(preset.fileName),
  })),
  {
    id: 'cinematic-launch-room',
    title: 'Cinematic launch room',
    fileName: 'cinematic-launch-room.xcon.md',
    kind: 'example',
    category: 'Cinematic',
    description: 'GridEditor-inspired guided demo manifest with captions, source streaming, and workflow replay.',
    tags: ['cinematic', 'stream', 'workflow', 'dashboard', 'timeline', 'first-5-demo'],
    demoRank: 50,
    recommendedFor: ['first-5-demo', 'demo-video'],
    content: cinematicLaunchRoomSource,
  },
  {
    id: 'grid-editor-canvas-mode',
    title: 'GridEditor canvas mode',
    fileName: 'grid-editor-canvas-mode.xcon.md',
    kind: 'example',
    category: 'Canvas',
    description: 'Canvas editing scenario with cursor movement, in-place grid generation, and workflow replay.',
    tags: ['canvas', 'grid', 'cursor', 'workflow', 'editor', 'first-5-demo'],
    demoRank: 60,
    recommendedFor: ['first-5-demo', 'canvas'],
    content: gridEditorCanvasModeSource,
  },
];

export function sortDemoLabPresetsForFirstFiveMinuteDemo(
  presets: DemoLabPresetRegistryItem[],
): DemoLabPresetRegistryItem[] {
  return [...presets].sort((left, right) => {
    const leftRank = Number.isFinite(left.demoRank)
      ? (left.demoRank ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    const rightRank = Number.isFinite(right.demoRank)
      ? (right.demoRank ?? Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) return leftRank - rightRank;
    const categoryOrder = left.category.localeCompare(right.category);
    if (categoryOrder !== 0) return categoryOrder;
    return left.title.localeCompare(right.title);
  });
}

export function getDemoLabPresetById(id: string): DemoLabPresetRegistryItem | undefined {
  return DEMO_LAB_PRESET_REGISTRY.find((preset) => preset.id === id);
}

export function getDemoLabPresetOptions(): DemoLabPresetRegistryItem[] {
  return sortDemoLabPresetsForFirstFiveMinuteDemo(DEMO_LAB_PRESET_REGISTRY);
}
