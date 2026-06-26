```xcon-demo
demo "Binding replay dashboard"
mode "binding-replay"
workflow.run true
workflow.bindMode "fixture"
scene.1.id "render"
scene.1.title "Render dashboard"
scene.1.caption "Render the initial Markdown, aliases, chart, SpanGrid, and SKETCH artifact."
scene.1.action "render"
scene.1.duration 900
scene.1.focus "stage"
scene.2.id "workflow"
scene.2.title "Run data workflow"
scene.2.caption "Workflow events mutate only the fixture; Chain recomputes the artifact."
scene.2.action "workflow"
scene.2.duration 1200
scene.2.focus "runtime"
scene.3.id "inspect"
scene.3.title "Inspect binding"
scene.3.caption "Review fixture, aliases, and execution events after the run."
scene.3.action "render"
scene.3.duration 900
scene.3.focus "runtime"
scene.3.actions [{"type":"caption","text":"The final scene patches fixture metadata, then renders the synchronized artifact."},{"type":"setFixture","path":"record.updatedAt","value":"inspected by scene action"},{"type":"focus","target":"runtime"},{"type":"render"},{"type":"wait","duration":500}]
```

# Operations dashboard

The workflow below updates only the JSON fixture. Chain aliases recompute the SKETCH dashboard, including chart and SpanGrid data.

```xcon-chain-fixture
{
  "record": {
    "title": "Launch operations room",
    "subtitle": "Queue, scheduler, chart, and table update from workflow events.",
    "updatedAt": "demo idle",
    "status": "Workflow not started",
    "statusColor": "#94a3b8",
    "metrics": { "revenue": 184000, "growth": 12, "health": 84 },
    "channels": [
      { "name": "API", "revenue": 42, "status": "Queued", "color": "#64748b" },
      { "name": "Billing", "revenue": 31, "status": "Queued", "color": "#64748b" },
      { "name": "Search", "revenue": 28, "status": "Queued", "color": "#64748b" },
      { "name": "Notify", "revenue": 18, "status": "Queued", "color": "#64748b" }
    ],
    "team": [
      { "name": "Preflight", "owner": "Ops A", "status": "Waiting" },
      { "name": "Data sync", "owner": "Queue", "status": "Waiting" },
      { "name": "Publish", "owner": "Scheduler", "status": "Waiting" }
    ],
    "workflow": { "status": "Workflow not started", "percent": 0, "percentLabel": "0%", "fillWidth": 0, "lastEvent": "No runtime event yet." }
  }
}
```

```xcon-chain as title
= record.title
```

```xcon-chain as topSignals
= record.channels | sortBy revenue desc | map name | join ", "
```

```xcon-chain as chartData
= record.chartData
```

```xcon-chain as gridData
= record.teamGrid
```

Top signals: **$topSignals**.

```xcon-workflow
workflow "Demo binding replay"
  preflight: callApi GET "/api/demo/preflight"

  queueSync: workqueue
    concurrency 2
    data "= record.channels"
    after preflight
    actions [
      {"id":"syncChannel","type":"callApi","method":"POST","url":"/api/demo/channel","parameter":{"name":"{{item.name}}"}}
    ]

  pulse: scheduler
    mode "interval"
    intervalMs 180
    iterations 4
    after queueSync
    actions [
      {"id":"refreshMetric","type":"callApi","method":"POST","url":"/api/demo/pulse"}
    ]

  complete: note "binding replay complete"
    after pulse
```

```xcon-sketch
screen "Binding Replay" 980x620 bg #f8fafc
  header: panel at 24 24 932 116
    bg #111827
    radius 24
    title: label "$title" at 28 24 420 34
      color #ffffff
      font
        size 28
        weight 800
    subtitle: label "$record.subtitle" at 30 68 480 20
      color #cbd5e1
      font
        size 13
        weight 700
    status: label "$record.workflow.status" at 580 30 350 26
      color $record.statusColor
      align right
      font
        size 17
        weight 800

  chartPanel: panel at 24 170 456 256
    bg #ffffff
    radius 20
    border
      visible true
      color #d8e0ea
    h: label "Signal values" at 22 18 160 24
      color #172033
      font
        size 18
        weight 800
    c: chart at 22 58 410 160
      chartType "bar"
      chartData $chartData

  gridPanel: panel at 512 170 444 256
    bg #ffffff
    radius 20
    border
      visible true
      color #d8e0ea
    h: label "Workstream state" at 22 18 220 24
      color #172033
      font
        size 18
        weight 800
    grid: spanGrid at 22 58 400 160
      backgroundColor #ffffff
      readonly true
      data $gridData

  footer: panel at 24 462 932 88
    bg #111827
    radius 20
    event: label "$record.workflow.lastEvent" at 24 18 640 22
      color #cbd5e1
      font
        size 14
        weight 800
    pct: label "$record.workflow.percentLabel" at 812 14 92 30
      color #38bdf8
      align right
      font
        size 28
        weight 800
    rail: shape at 24 58 780 8
      bg #334155
      radius 4
    fill: shape at 24 58 $record.workflow.fillWidth 8
      bg #22c55e
      radius 4
```
