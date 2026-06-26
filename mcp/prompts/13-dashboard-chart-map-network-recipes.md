# Dashboard, Chart, Map, And Network Recipes

Use these recipes for analytical, operational, monitoring, and command-center
artifacts. The goal is to combine summary metrics, charts, tables, maps, media,
and relationship diagrams into one coherent screen.

## Dashboard Structure

Prefer this order:

1. Header with title, timestamp, scope, and primary mode.
2. KPI cards with numbers, deltas, badges, or progress bars.
3. Main visualization area: chart, map, network, image feed, or span grid.
4. Supporting queue, alert list, detail panel, or workflow status.

Use `spanGrid` for table-like data. Use `list` for alerts or cards. Use
`badge` and `progressBar` for state density.

## Semantic Data Components

Use semantic data components whenever the brief contains structured or numeric
data. Do not emulate tables, charts, maps, or relationship diagrams with labels
when an XCON component exists for that job.

- Table-like rankings, schedules, inventories, standings, ledgers, and dense
  comparison rows should use `spanGrid`.
- Comparative values, trends, distributions, forecasts, and rankings should use
  `chart` with the chart type that matches the question.
- Sports, league, market, or score standings should combine both: a `spanGrid`
  for the ranked rows and a `chart` for wins, points, percentage, score, or
  rank comparison.
- Geographic, regional, route, venue, facility, or weather-location reports
  should use `map`.
- Dependencies, handoffs, topologies, process flows, lineage, and blast-radius
  explanations should use `networkDiagram`.
- Use labels for headings, annotations, and KPI values. Do not build fake
  tables, bar charts, maps, or diagrams from many labels.

## Chart Recipes

Use `chart` when values are comparative, trend-based, or distribution-based.
Known chart types from the XCON family examples include:

- `chartType "bar"` for category comparison.
- `chartType "line"` for time series.
- `chartType "pie"` or `chartType "doughnut"` for composition.
- `chartType "radar"` for capability or quality profiles.
- `chartType "polarArea"` for radial category strength.
- `chartType "scatter"` for correlation.
- `chartType "bubble"` for risk, volume, and impact maps.

Put chart values in `chartData` when the chart is data-bound through Chain or a
fixture. Keep labels short.

## Map And Network Recipes

Use `map` for location-aware operations:

- Include `latitude`, `longitude`, and `zoom`.
- Use `markers` with label, status, and coordinates when available.
- Use `snapshotUrl` and `snapshotAlt` when a static image preview is needed.

Use `networkDiagram` when the content is relationships, dependencies, topology,
or incident blast radius:

- Use `nodes` with stable IDs, labels, groups, and optional status.
- Use `links` with source, target, and label.
- Keep the node count focused; large graphs should use grouping.

## Compact Dashboard Example

```xcon-sketch
screen "Field Dashboard" 960x620 bg @surface
  title: label "Field Monitoring" at 28 24 280 36
    color @ink
    font
      size 28
      weight 900

  kpi: panel at 28 78 260 110
    bg @surface2
    radius 18
    label: label "Active units" at 20 18 140 20
      color @ink-2
    value: label "42" at 20 44 100 42
      color @accent
      font
        size 38
        weight 900
    state: badge "Stable" at 166 38 72 30
      bg #dcfce7
      color #166534

  trend: chart at 312 78 300 220
    chartType "bar"
    chartData {"labels":["A","B","C","D"],"datasets":[{"label":"Load","data":[72,64,81,57],"backgroundColor":["#2563eb","#0ea5e9","#22c55e","#f59e0b"]}]}

  sites: map at 636 78 296 220
    latitude 37.5665
    longitude 126.9780
    zoom 11
    markers [{"label":"HQ","lat":37.5665,"lng":126.9780,"status":"ok"},{"label":"West","lat":37.55,"lng":126.91,"status":"watch"}]

  topology: networkDiagram at 28 324 430 246
    nodes [{"id":"hub","label":"Gateway","group":"core"},{"id":"drone-a","label":"Drone A","group":"field"},{"id":"sensor-7","label":"Sensor 7","group":"sensor"}]
    links [{"source":"hub","target":"drone-a","label":"telemetry"},{"source":"drone-a","target":"sensor-7","label":"scan"}]

  queue: spanGrid at 482 324 450 246
    backgroundColor @surface2
    readonly true
    data [["Job","Owner","State"],["Inspect W-12","Mina","Queued"],["Battery swap","Jae","Ready"],["Fence alert","Ops","Watch"]]
    columns [{"id":"job","title":"Job","width":190},{"id":"owner","title":"Owner","width":120},{"id":"state","title":"State","width":120}]
```

## Pitfalls

- Do not make every panel a chart. Mix metrics, queues, maps, and diagrams.
- Do not use a map when the brief has no location dimension.
- Do not use a network diagram for a simple list of tasks.
