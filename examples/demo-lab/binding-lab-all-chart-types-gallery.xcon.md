```xcon-demo
demo "All chart types gallery"
mode "binding-lab"
autoplay false
stream.speed "guided"
workflow.run true
workflow.bindMode "fixture"
workflow.replayEvents true
scene.1.id "render"
scene.1.title "Render document"
scene.1.caption "Render the Markdown, XCON Chain aliases, and SKETCH artifact from the fixture."
scene.1.action "render"
scene.1.duration 900
scene.1.focus "stage"
scene.2.id "workflow"
scene.2.title "Run workflow"
scene.2.caption "Workflow events update fixture data; chain aliases recompute the visible document."
scene.2.action "workflow"
scene.2.duration 1400
scene.2.focus "runtime"
scene.3.id "inspect"
scene.3.title "Inspect synchronized state"
scene.3.caption "Review the updated fixture, aliases, chart, grid, and workflow progress."
scene.3.action "render"
scene.3.duration 900
scene.3.focus "stage"
scene.3.actions [{"type":"caption","text":"The visual source remains static while the data contract changes."},{"type":"focus","target":"stage"},{"type":"render"},{"type":"wait","duration":500}]
```

```xcon-chain-fixture
{
  "record": {
    "title": "All Chart Types Gallery",
    "updatedAt": "runner idle",
    "status": "Waiting for chart workflow",
    "statusColor": "#94a3b8",
    "summary": "Use this preset to inspect every public static chart preview supported by XCON Viewer.",
    "metrics": { "revenue": 8, "growth": 4, "health": 88 },
    "channels": [
      { "name": "North", "revenue": 42, "status": "queued", "color": "#64748b" },
      { "name": "South", "revenue": 31, "status": "queued", "color": "#64748b" },
      { "name": "East", "revenue": 26, "status": "queued", "color": "#64748b" },
      { "name": "West", "revenue": 18, "status": "queued", "color": "#64748b" },
      { "name": "Central", "revenue": 35, "status": "queued", "color": "#64748b" }
    ],
    "team": [
      { "name": "bar", "owner": "Static preview", "status": "Supported" },
      { "name": "line", "owner": "Static preview", "status": "Supported" },
      { "name": "pie", "owner": "Static preview", "status": "Supported" },
      { "name": "doughnut", "owner": "Static preview", "status": "Supported" },
      { "name": "radar", "owner": "Static preview", "status": "Supported" },
      { "name": "polarArea", "owner": "Static preview", "status": "Supported" },
      { "name": "scatter", "owner": "Static preview", "status": "Supported" },
      { "name": "bubble", "owner": "Static preview", "status": "Supported" }
    ],
    "deliveryTargets": [
      { "name": "Static preview", "status": "waiting", "color": "#64748b" },
      { "name": "Canvas data attrs", "status": "waiting", "color": "#64748b" },
      { "name": "Workflow refresh", "status": "waiting", "color": "#64748b" }
    ],
    "workflow": {
      "status": "Workflow not started",
      "percent": 0,
      "percentLabel": "0%",
      "fillWidth": 0,
      "eventCount": 0,
      "lastEvent": "No chart workflow events yet."
    }
  }
}
```

# All chart types gallery

Static preview modes: bar, line, pie, doughnut, radar, polarArea, scatter, bubble.

Each chart also keeps its `data-xcon-chart-type` attribute, so a runtime chart library can hydrate the same contract when available.

```xcon-chain as chartData
= record.chartData
```

```xcon-chain as gridData
= record.teamGrid
```

```xcon-chain as lastEvent
= record.workflow.lastEvent
```

```xcon-sketch
screen "All Chart Types Gallery" 1080x820 bg #f8fafc
  header: panel at 24 22 1032 112
    bg #111827
    radius 24
    title: label "All Chart Types Gallery" at 28 22 460 34
      color #ffffff
      font
        size 30
        weight 800
    note1: label "Static preview: bar, line, pie, doughnut, radar, polarArea" at 30 62 500 20
      color #a7f3d0
      font
        size 14
        weight 800
    note2: label "Static preview: scatter, bubble" at 30 86 520 18
      color #cbd5e1
      font
        size 13
        weight 700
    status: label "$record.workflow.status" at 640 34 390 24
      color $record.statusColor
      align right
      font
        size 16
        weight 800

  barPanel: panel at 24 162 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "bar" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    c: chart at 14 42 216 118
      chartType "bar"
      chartData $chartData

  linePanel: panel at 292 162 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "line" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    c: chart at 14 42 216 118
      chartType "line"
      chartData $chartData

  piePanel: panel at 560 162 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "pie" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    c: chart at 42 38 160 124
      chartType "pie"
      chartData $chartData

  doughnutPanel: panel at 828 162 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "doughnut" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    c: chart at 42 38 160 124
      chartType "doughnut"
      chartData $chartData

  radarPanel: panel at 24 356 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "radar" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    badge: label "static" at 164 14 62 18
      color #2563eb
      align right
      font
        size 11
        weight 800
    c: chart at 14 42 216 118
      chartType "radar"
      chartData $chartData

  polarPanel: panel at 292 356 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "polarArea" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    badge: label "static" at 164 14 62 18
      color #2563eb
      align right
      font
        size 11
        weight 800
    c: chart at 14 42 216 118
      chartType "polarArea"
      chartData $chartData

  scatterPanel: panel at 560 356 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "scatter" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    badge: label "static" at 164 14 62 18
      color #2563eb
      align right
      font
        size 11
        weight 800
    c: chart at 14 42 216 118
      chartType "scatter"
      chartData $chartData

  bubblePanel: panel at 828 356 244 170
    bg #ffffff
    radius 16
    border
      visible true
      color #d8e0ea
    title: label "bubble" at 16 14 120 20
      color #111827
      font
        size 16
        weight 800
    badge: label "static" at 164 14 62 18
      color #2563eb
      align right
      font
        size 11
        weight 800
    c: chart at 14 42 216 118
      chartType "bubble"
      chartData $chartData

  supportPanel: panel at 24 556 1032 130
    bg #ffffff
    radius 18
    border
      visible true
      color #d8e0ea
    title: label "Supported chart contract" at 20 16 260 24
      color #111827
      font
        size 18
        weight 800
    grid: spanGrid at 20 50 990 64
      backgroundColor #ffffff
      readonly true
      data $gridData

  workflowPanel: panel at 24 708 1032 70
    bg #111827
    radius 18
    wf: label "$lastEvent" at 22 18 760 22
      color #cbd5e1
      font
        size 14
        weight 700
    pct: label "$record.workflow.percentLabel" at 898 18 80 24
      color #38bdf8
      align right
      font
        size 22
        weight 800
    rail: shape at 22 48 970 8
      bg #334155
      radius 4
    fill: shape at 22 48 $record.workflow.fillWidth 8
      bg #22c55e
      radius 4
```

```xcon-workflow
workflow "Chart gallery refresh"
  loadChartDataset: callApi GET "/api/chart-gallery/dataset"

  refreshTypes: workqueue
    concurrency 3
    data "= record.team"
    after loadChartDataset
    actions [
      {"id":"refreshChartType","type":"callApi","method":"POST","url":"/api/chart-gallery/refresh","parameter":{"chartType":"{{item.name}}"}}
    ]

  schedulerPulse: scheduler
    mode "interval"
    intervalMs 220
    iterations 4
    after refreshTypes
    actions [
      {"id":"publishChartFrame","type":"callApi","method":"POST","url":"/api/chart-gallery/publish"}
    ]

  complete: note "chart gallery complete"
    after schedulerPulse
```
