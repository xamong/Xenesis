```xcon-demo
demo "Invoice approval packet"
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
    "title": "Invoice approval packet",
    "updatedAt": "draft",
    "status": "Waiting for approval workflow",
    "statusColor": "#2563eb",
    "summary": "Finance approval data is bound into a document-ready invoice card.",
    "metrics": { "revenue": 3650, "growth": 12, "health": 94 },
    "channels": [
      { "name": "Design sprint", "revenue": 1800 },
      { "name": "Prototype build", "revenue": 1250 },
      { "name": "QA package", "revenue": 600 }
    ],
    "team": [
      { "name": "Prepared", "owner": "Northstar Design", "status": "Ready" },
      { "name": "Finance", "owner": "Mina", "status": "Review" },
      { "name": "Client", "owner": "Avery", "status": "Pending" }
    ],
    "workflow": { "status": "Workflow not started", "percent": 0, "percentLabel": "0%", "fillWidth": 0, "lastEvent": "No approval events yet." }
  }
}
```

# Invoice approval document

This preset shows how a business document can stay Markdown-readable while SKETCH renders a structured approval artifact.

```xcon-chain as total
= record.metrics.revenue | format "$#,###"
```

```xcon-chain as lineGrid
= record.teamGrid
```

Total due: **$total**.

```xcon-sketch
screen "Invoice Packet" 840x560 bg #f8fafc
  card: panel at 28 28 784 504
    bg white
    radius 24
    border
      visible true
      color #d8e0ea
    h: label "$record.title" at 34 28 360 34
      color #111827
      font
        size 28
        weight 800
    status: label "$record.status" at 34 70 420 22
      color $record.statusColor
      font
        size 14
        weight 800
    total: label "$total" at 600 34 140 44
      color #c4622d
      align right
      font
        size 36
        weight 800
    sheet: spanGrid at 34 132 716 190
      backgroundColor white
      readonly true
      data $lineGrid
    rail: shape at 34 374 680 10
      bg #dbe4f0
      radius 5
    fill: shape at 34 374 $record.workflow.fillWidth 10
      bg #22c55e
      radius 5
    event: label "$record.workflow.lastEvent" at 34 402 680 22
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
