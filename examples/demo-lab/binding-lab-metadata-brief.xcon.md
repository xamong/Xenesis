```xcon-demo
demo "Metadata operations brief"
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
    "title": "Monthly growth operations",
    "updatedAt": "runner idle",
    "status": "Waiting for workflow run",
    "statusColor": "#94a3b8",
    "summary": "The SKETCH document is static. JSON fixture changes drive the rendered values.",
    "metrics": {
      "revenue": 1284000,
      "growth": 18,
      "health": 87
    },
    "channels": [
      { "name": "Enterprise", "revenue": 610000 },
      { "name": "Partner", "revenue": 420000 },
      { "name": "Marketplace", "revenue": 254000 }
    ],
    "team": [
      { "name": "Data room", "owner": "Nia", "status": "Ready" },
      { "name": "Email ops", "owner": "Jules", "status": "Review" },
      { "name": "Launch desk", "owner": "Ari", "status": "Launch" }
    ],
    "workflow": {
      "status": "Workflow not started",
      "percent": 0,
      "percentLabel": "0%",
      "fillWidth": 0,
      "eventCount": 0,
      "lastEvent": "No workflow events yet."
    }
  }
}
```

# Metadata-bound operations brief

This document is ordinary Markdown plus XCON Chain aliases and one XCON/SKETCH dashboard. Run the workflow to update only the JSON fixture, then render again.

```xcon-chain as revenueTotal
= record.metrics.revenue | format "$#,###"
```

```xcon-chain as growthLabel
= record.metrics.growth | concat "% growth"
```

```xcon-chain as topChannels
= record.channels | sortBy revenue desc | map name | join ", "
```

```xcon-chain as teamGrid
= record.teamGrid
```

```xcon-chain as chartData
= record.chartData
```

```xcon-chain as workflowStatus
= record.workflow.status
```

```xcon-chain as workflowPercent
= record.workflow.percentLabel
```

```xcon-chain as workflowWidth
= record.workflow.fillWidth
```

```xcon-chain as lastEvent
= record.workflow.lastEvent
```

**$revenueTotal** revenue, **$growthLabel**. Top channels: $topChannels.

```xcon-sketch
screen "Binding Lab Dashboard" 940x620 bg #f8fafc
  hero: panel at 24 24 892 138
    bg #111827
    radius 24
    title: label "Quarterly binding brief" at 28 24 340 32
      color white
      font
        size 24
        weight 800
    revenue: label "$revenueTotal" at 28 66 200 44
      color #fbbf24
      font
        size 34
        weight 800
    growth: label "$growthLabel" at 260 76 180 26
      color #a7f3d0
      font
        size 18
        weight 800
    source: label "Markdown + SKETCH + fixture + workflow" at 28 112 360 18
      color #cbd5e1
      font
        size 13
        weight 700
    health: panel at 692 34 160 74
      bg #1f2937
      radius 18
      h1: label "Health score" at 20 14 120 18
        color #cbd5e1
        font
          size 12
          weight 700
      h2: label "$record.metrics.health" at 20 34 100 30
        color #38bdf8
        font
          size 30
          weight 800

  chartBlock: panel at 24 186 430 246
    bg white
    border
      visible true
      color #d8e0ea
    chartTitle: label "Revenue by channel" at 20 18 220 24
      color #172033
      font
        size 18
        weight 800
    salesChart: chart at 20 58 388 158
      chartType "bar"
      chartData $chartData

  tableBlock: panel at 486 186 430 246
    bg white
    border
      visible true
      color #d8e0ea
    tableTitle: label "Data contract rows" at 20 18 220 24
      color #172033
      font
        size 18
        weight 800
    sheet: spanGrid at 20 58 388 158
      backgroundColor white
      readonly true
      data $teamGrid

  workflowBlock: panel at 24 462 892 120
    bg white
    radius 18
    border
      visible true
      color #d8e0ea
    wfTitle: label "$workflowStatus" at 22 20 520 26
      color $record.statusColor
      font
        size 20
        weight 800
    wfPct: label "$workflowPercent" at 770 20 82 28
      color #2563eb
      align right
      font
        size 24
        weight 800
    rail: shape at 22 62 828 8
      bg #dbe4f0
      radius 4
    fill: shape at 22 62 $workflowWidth 8
      bg #22c55e
      radius 4
    event: label "$lastEvent" at 22 84 820 18
      color #64748b
      font
        size 12
        weight 700
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
