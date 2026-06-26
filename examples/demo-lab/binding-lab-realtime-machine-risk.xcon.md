```xcon-demo
demo "Realtime machine risk"
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
    "title": "Realtime Machine Monitoring",
    "subtitle": "Risk gauges, machine topology, alert traces, and workqueue recovery.",
    "updatedAt": "runner idle",
    "status": "Waiting for workflow run",
    "statusColor": "#94a3b8",
    "summary": "Machine telemetry, risk warning, network topology, and scheduler-driven safety state.",
    "theme": {
      "bg": "#111827",
      "panel": "#171717",
      "card": "#f8fafc",
      "accent": "#f97316",
      "warn": "#facc15"
    },
    "heroImage": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    "metrics": {
      "revenue": 60,
      "growth": 5,
      "health": 67
    },
    "channels": [
      {
        "name": "Press #1",
        "revenue": 71,
        "status": "queued",
        "color": "#64748b"
      },
      {
        "name": "Motor #4",
        "revenue": 58,
        "status": "queued",
        "color": "#64748b"
      },
      {
        "name": "Pump #2",
        "revenue": 44,
        "status": "queued",
        "color": "#64748b"
      },
      {
        "name": "Cooling",
        "revenue": 39,
        "status": "queued",
        "color": "#64748b"
      }
    ],
    "team": [
      {
        "name": "Risk model",
        "owner": "AI monitor",
        "status": "Ready"
      },
      {
        "name": "Maintenance",
        "owner": "Technician",
        "status": "Waiting"
      },
      {
        "name": "Safety relay",
        "owner": "PLC",
        "status": "Armed"
      }
    ],
    "deliveryTargets": [
      {
        "name": "Shutdown plan",
        "status": "waiting",
        "color": "#64748b"
      },
      {
        "name": "Technician",
        "status": "waiting",
        "color": "#64748b"
      },
      {
        "name": "Shift lead",
        "status": "waiting",
        "color": "#64748b"
      }
    ],
    "mapMarkers": [
      {
        "label": "HQ",
        "lat": 37.5665,
        "lng": 126.978
      },
      {
        "label": "A1",
        "lat": 37.572,
        "lng": 126.982
      },
      {
        "label": "B2",
        "lat": 37.561,
        "lng": 126.974
      }
    ],
    "networkNodes": [
      {
        "id": "hub",
        "label": "SCADA",
        "color": "#f97316",
        "x": 400,
        "y": 300
      },
      {
        "id": "press",
        "label": "Press",
        "color": "#ef4444",
        "x": 210,
        "y": 160
      },
      {
        "id": "pump",
        "label": "Pump",
        "color": "#facc15",
        "x": 600,
        "y": 170
      },
      {
        "id": "cool",
        "label": "Cooling",
        "color": "#38bdf8",
        "x": 590,
        "y": 430
      },
      {
        "id": "ops",
        "label": "Ops",
        "color": "#22c55e",
        "x": 210,
        "y": 430
      }
    ],
    "networkLinks": [
      {
        "source": "hub",
        "target": "press"
      },
      {
        "source": "hub",
        "target": "pump"
      },
      {
        "source": "hub",
        "target": "cool"
      },
      {
        "source": "hub",
        "target": "ops",
        "type": "folder"
      }
    ],
    "queue": {
      "total": 4,
      "done": 0,
      "percent": 0,
      "percentLabel": "0%",
      "fillWidth": 0,
      "doneText": "0 / 4 processed"
    },
    "scheduler": {
      "label": "scheduler idle",
      "tick1": "#475569",
      "tick2": "#475569",
      "tick3": "#475569",
      "tick4": "#475569",
      "tick5": "#475569"
    },
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

# Realtime machine risk

Risk gauges, machine topology, alert traces, and workqueue recovery.

This preset is inspired by operational dashboard references: map panels, CCTV/image feeds, charts, SpanGrid tables, workflow queues, and scheduler ticks. The workflow updates only JSON fixture data; XCON Chain aliases recompute this document and the SKETCH UI.

```xcon-chain as title
= record.title
```

```xcon-chain as subtitle
= record.subtitle
```

```xcon-chain as status
= record.status
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

```xcon-chain as mapMarkers
= record.mapMarkers
```

```xcon-chain as networkNodes
= record.networkNodes
```

```xcon-chain as networkLinks
= record.networkLinks
```

```xcon-chain as lastEvent
= record.workflow.lastEvent
```

Top signals: **$topSignals**.

```xcon-sketch
screen "Realtime Machine Monitoring" 1040x720 bg #111827
  header: panel at 24 22 992 108
    bg #171717
    radius 22
    title: label "$title" at 26 20 430 34
      color #ffffff
      font
        size 28
        weight 800
    subtitle: label "$subtitle" at 28 62 560 20
      color #cbd5e1
      font
        size 13
        weight 700
    status: label "$status" at 646 26 310 24
      color $record.statusColor
      align right
      font
        size 17
        weight 800
    clock: label "$record.updatedAt" at 736 62 220 26
      color #facc15
      align right
      font
        size 22
        weight 800

  alertPanel: panel at 24 154 316 204
    bg #171717
    radius 18
    warn: label "!" at 118 30 80 80
      color #facc15
      align center
      font
        size 76
        weight 800
    risk: label "Risk score $record.metrics.health" at 42 130 220 28
      color #ffffff
      align center
      font
        size 22
        weight 800
  networkPanel: panel at 364 154 316 204
    bg #ffffff
    radius 18
    network: networkDiagram at 12 12 288 178
      backgroundColor #111827
      textColor #111827
      nodes $networkNodes
      links $networkLinks
  chartPanel: panel at 704 154 312 204
    bg #ffffff
    radius 18
    chart: chart at 18 24 272 140
      chartType "line"
      chartData $chartData
  gridPanel: panel at 24 382 992 198
    bg #ffffff
    radius 18
    grid: spanGrid at 18 22 956 146
      backgroundColor #ffffff
      readonly true
      data $gridData

  workflowPanel: panel at 24 610 992 84
    bg #ffffff
    radius 18
    border
      visible true
      color #d8e0ea
    wf: label "$record.workflow.status" at 22 16 600 24
      color $record.statusColor
      font
        size 18
        weight 800
    pct: label "$record.workflow.percentLabel" at 858 16 92 28
      color #f97316
      align right
      font
        size 24
        weight 800
    rail: shape at 22 52 910 9
      bg #dbe4f0
      radius 5
    fill: shape at 22 52 $record.workflow.fillWidth 9
      bg #f97316
      radius 5
    event: label "$lastEvent" at 22 64 900 16
      color #64748b
      font
        size 11
        weight 700
```

```xcon-workflow
workflow "Realtime machine risk workflow"
  ingestTelemetry: callApi GET "/api/dashboard/realtime-machine-risk/telemetry"

  processQueue: workqueue
    concurrency 2
    data "= record.channels"
    after ingestTelemetry
    actions [
      {"id":"processSignal","type":"callApi","method":"POST","url":"/api/dashboard/process","parameter":{"channel":"{{item.name}}"}}
    ]

  updateGrid: workqueue
    concurrency 2
    data "= record.team"
    after processQueue
    actions [
      {"id":"updateGridRow","type":"callApi","method":"POST","url":"/api/dashboard/grid","parameter":{"row":"{{item.name}}","owner":"{{item.owner}}"}}
    ]

  schedulerPulse: scheduler
    mode "interval"
    intervalMs 220
    iterations 5
    after updateGrid
    actions [
      {"id":"publishTick","type":"callApi","method":"POST","url":"/api/dashboard/pulse"}
    ]

  publishTargets: workqueue
    concurrency 2
    data "= record.deliveryTargets"
    after schedulerPulse
    actions [
      {"id":"publishTarget","type":"callApi","method":"POST","url":"/api/dashboard/publish","parameter":{"target":"{{item.name}}"}}
    ]

  complete: note "dashboard preset complete"
    after publishTargets
```
