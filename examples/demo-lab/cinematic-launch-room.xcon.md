```xcon-demo
demo "Cinematic launch room"
mode "cinematic"
autoplay false
stream.speed "natural"
workflow.run true
workflow.replayEvents true
scene.1.id "source"
scene.1.title "Draft source"
scene.1.caption "The demo script streams in as Markdown, Chain, Workflow, and SKETCH."
scene.1.action "stream"
scene.1.duration 800
scene.1.focus "source"
scene.2.id "artifact"
scene.2.title "Reveal artifact"
scene.2.caption "The generated XCON/SKETCH artifact becomes the stage."
scene.2.action "render"
scene.2.duration 1000
scene.2.focus "stage"
scene.2.actions [{"type":"caption","text":"Reveal the generated stage before the workflow starts."},{"type":"focus","target":"stage"},{"type":"render"},{"type":"wait","duration":650}]
scene.3.id "runtime"
scene.3.title "Replay workflow"
scene.3.caption "Queue and scheduler events drive the visible dashboard state."
scene.3.action "workflow"
scene.3.duration 1300
scene.3.focus "runtime"
caption.1 "The assistant drafts the operating room."
caption.2 "The workflow queue starts running."
caption.3 "The dashboard synchronizes without editing SKETCH."
```

# Launch room cinematic

This mode is inspired by scripted product demos: source appears, the artifact emerges, then workflow events animate the data contract.

```xcon-chain-fixture
{
  "record": {
    "title": "Premium launch room",
    "updatedAt": "demo idle",
    "status": "Waiting for cinematic run",
    "statusColor": "#facc15",
    "metrics": { "revenue": 912000, "growth": 19, "health": 89 },
    "channels": [
      { "name": "North", "revenue": 62, "status": "Queued", "color": "#64748b" },
      { "name": "South", "revenue": 48, "status": "Queued", "color": "#64748b" },
      { "name": "Partner", "revenue": 38, "status": "Queued", "color": "#64748b" }
    ],
    "team": [
      { "name": "Narrative", "owner": "LLM", "status": "Draft" },
      { "name": "Artifact", "owner": "Viewer", "status": "Ready" },
      { "name": "Workflow", "owner": "Runner", "status": "Waiting" }
    ],
    "workflow": { "status": "Workflow not started", "percent": 0, "percentLabel": "0%", "fillWidth": 0, "lastEvent": "No runtime event yet." }
  }
}
```

```xcon-chain as chartData
= record.chartData
```

```xcon-chain as gridData
= record.teamGrid
```

```xcon-workflow
workflow "Cinematic launch"
  draft: note "source drafted"

  renderQueue: workqueue
    concurrency 1
    data "= record.team"
    after draft
    actions [
      {"id":"renderStep","type":"callApi","method":"POST","url":"/api/demo/render","parameter":{"step":"{{item.name}}"}}
    ]

  syncPulse: scheduler
    mode "interval"
    intervalMs 220
    iterations 3
    after renderQueue
    actions [
      {"id":"syncFrame","type":"callApi","method":"POST","url":"/api/demo/frame"}
    ]
```

```xcon-sketch
screen "Cinematic Demo" 920x560 bg #090f1c
  hero: panel at 24 24 872 116
    bg #111827
    radius 24
    title: label "$record.title" at 28 24 340 34
      color #ffffff
      font
        size 28
        weight 800
    status: label "$record.workflow.status" at 28 70 520 24
      color $record.statusColor
      font
        size 16
        weight 800
    pct: label "$record.workflow.percentLabel" at 752 42 86 34
      color #38bdf8
      align right
      font
        size 30
        weight 800
  chartPanel: panel at 24 170 420 230
    bg #f8fafc
    radius 20
    chart: chart at 24 32 368 150
      chartType "line"
      chartData $chartData
  gridPanel: panel at 476 170 420 230
    bg #f8fafc
    radius 20
    grid: spanGrid at 24 32 368 150
      backgroundColor #ffffff
      readonly true
      data $gridData
  rail: shape at 60 470 780 10
    bg #334155
    radius 5
  fill: shape at 60 470 $record.workflow.fillWidth 10
    bg #22c55e
    radius 5
  event: label "$record.workflow.lastEvent" at 60 494 760 20
    color #cbd5e1
    font
      size 13
      weight 800
```
