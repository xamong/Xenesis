```xcon-demo
demo "Incident response brief"
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
    "title": "Incident command center",
    "updatedAt": "standby",
    "status": "Waiting for triage workflow",
    "statusColor": "#facc15",
    "summary": "Incident response is modeled as workflow data, then rendered as an operations document.",
    "metrics": { "revenue": 4, "growth": 2, "health": 72 },
    "channels": [
      { "name": "API latency", "status": "open", "color": "#facc15", "revenue": 72 },
      { "name": "Checkout", "status": "open", "color": "#fb7185", "revenue": 41 },
      { "name": "Search", "status": "monitor", "color": "#38bdf8", "revenue": 28 }
    ],
    "team": [
      { "name": "Triage", "owner": "Nina", "status": "Ready" },
      { "name": "Rollback", "owner": "Leo", "status": "Waiting" },
      { "name": "Comms", "owner": "Ari", "status": "Drafting" }
    ],
    "workflow": { "status": "Workflow not started", "percent": 0, "percentLabel": "0%", "fillWidth": 0, "lastEvent": "No incident workflow events yet." }
  }
}
```

# Incident response briefing

Use this preset when the document must combine Markdown context, operational data binding, a chart, and a workflow progress strip.

```xcon-chain as openAreas
= record.channels | map name | join ", "
```

```xcon-chain as teamGrid
= record.teamGrid
```

```xcon-chain as chartData
= record.chartData
```

Open areas: **$openAreas**.

```xcon-sketch
screen "Incident Brief" 900x560 bg #f8fafc
  hero: panel at 24 24 852 128
    bg #111827
    radius 22
    title: label "$record.title" at 26 22 360 34
      color white
      font
        size 26
        weight 800
    status: label "$record.status" at 26 68 480 22
      color $record.statusColor
      font
        size 16
        weight 800
    health: label "$record.metrics.health" at 720 34 84 46
      color #38bdf8
      align right
      font
        size 42
        weight 800
    label: label "service health" at 654 84 150 18
      color #cbd5e1
      align right
  chartPanel: panel at 24 184 408 250
    bg white
    border
      visible true
      color #d8e0ea
    h: label "Risk by area" at 20 18 180 24
      color #172033
      font
        size 18
        weight 800
    c: chart at 20 58 360 160
      chartType "bar"
      chartData $chartData
  teamPanel: panel at 468 184 408 250
    bg white
    border
      visible true
      color #d8e0ea
    h: label "Command owners" at 20 18 180 24
      color #172033
      font
        size 18
        weight 800
    grid: spanGrid at 20 58 360 160
      backgroundColor white
      readonly true
      data $teamGrid
  rail: shape at 46 486 760 10
    bg #dbe4f0
    radius 5
  fill: shape at 46 486 $record.workflow.fillWidth 10
    bg #22c55e
    radius 5
  last: label "$record.workflow.lastEvent" at 46 508 760 20
    color #64748b
```

```xcon-workflow
workflow "Generic binding run"
  fetchMetrics: callApi GET "/api/binding/metrics"

  processQueue: workqueue
    concurrency 2
    data "= record.team"
    after fetchMetrics
    actions [
      {"id":"reviewRow","type":"callApi","method":"POST","url":"/api/binding/review","parameter":{"owner":"{{item.owner}}","team":"{{item.name}}"}}
    ]

  schedulerPulse: scheduler
    mode "interval"
    intervalMs 220
    iterations 4
    after processQueue
    actions [
      {"id":"publishPulse","type":"callApi","method":"POST","url":"/api/binding/pulse"}
    ]

  complete: note "binding fixture complete"
    after schedulerPulse
```
