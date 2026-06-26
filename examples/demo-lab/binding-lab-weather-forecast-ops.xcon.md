```xcon-demo
demo "Weather forecast ops"
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
    "title": "Hourly Weather Forecast",
    "subtitle": "Forecast bands, regional alerts, utility load, and scheduled notifications.",
    "updatedAt": "runner idle",
    "status": "Waiting for workflow run",
    "statusColor": "#94a3b8",
    "summary": "Time-based weather forecast dashboard with map, chart, and alert workflow.",
    "theme": {
      "bg": "#dbeafe",
      "panel": "#1d4ed8",
      "card": "#ffffff",
      "accent": "#facc15",
      "warn": "#fb7185"
    },
    "heroImage": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    "metrics": {
      "revenue": 26,
      "growth": 3,
      "health": 82
    },
    "channels": [
      {
        "name": "Temperature",
        "revenue": 26,
        "status": "queued",
        "color": "#64748b"
      },
      {
        "name": "Humidity",
        "revenue": 54,
        "status": "queued",
        "color": "#64748b"
      },
      {
        "name": "Wind",
        "revenue": 18,
        "status": "queued",
        "color": "#64748b"
      },
      {
        "name": "Rain risk",
        "revenue": 31,
        "status": "queued",
        "color": "#64748b"
      }
    ],
    "team": [
      {
        "name": "Forecast run",
        "owner": "NWP",
        "status": "Ready"
      },
      {
        "name": "Alert rule",
        "owner": "Scheduler",
        "status": "Queued"
      },
      {
        "name": "Push message",
        "owner": "Notify API",
        "status": "Waiting"
      }
    ],
    "deliveryTargets": [
      {
        "name": "Mobile alert",
        "status": "waiting",
        "color": "#64748b"
      },
      {
        "name": "City board",
        "status": "waiting",
        "color": "#64748b"
      },
      {
        "name": "Utility desk",
        "status": "waiting",
        "color": "#64748b"
      }
    ],
    "mapMarkers": [
      {
        "label": "WX",
        "lat": 37.566,
        "lng": 126.978
      },
      {
        "label": "RN",
        "lat": 37.571,
        "lng": 126.981
      },
      {
        "label": "UV",
        "lat": 37.562,
        "lng": 126.973
      }
    ],
    "networkNodes": [
      {
        "id": "hub",
        "label": "Hub",
        "color": "#facc15",
        "x": 400,
        "y": 300
      },
      {
        "id": "api",
        "label": "API",
        "color": "#38bdf8",
        "x": 210,
        "y": 170
      },
      {
        "id": "queue",
        "label": "Queue",
        "color": "#facc15",
        "x": 590,
        "y": 170
      },
      {
        "id": "desk",
        "label": "Desk",
        "color": "#22c55e",
        "x": 600,
        "y": 430
      }
    ],
    "networkLinks": [
      {
        "source": "hub",
        "target": "api"
      },
      {
        "source": "hub",
        "target": "queue"
      },
      {
        "source": "hub",
        "target": "desk",
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

# Weather forecast ops

Forecast bands, regional alerts, utility load, and scheduled notifications.

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
screen "Hourly Weather Forecast" 1040x720 bg #dbeafe
  header: panel at 24 22 992 108
    bg #1d4ed8
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
      color #fb7185
      align right
      font
        size 22
        weight 800

  mapPanel: panel at 24 154 486 276
    bg #ffffff
    radius 18
    mapView: map at 18 18 450 240
      latitude 37.5665
      longitude 126.978
      zoom 11
      markers $mapMarkers
  chartPanel: panel at 534 154 482 276
    bg #ffffff
    radius 18
    chart: chart at 22 26 438 210
      chartType "bar"
      chartData $chartData
  gridPanel: panel at 24 454 992 126
    bg #ffffff
    radius 18
    grid: spanGrid at 18 18 956 90
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
      color #facc15
      align right
      font
        size 24
        weight 800
    rail: shape at 22 52 910 9
      bg #dbe4f0
      radius 5
    fill: shape at 22 52 $record.workflow.fillWidth 9
      bg #facc15
      radius 5
    event: label "$lastEvent" at 22 64 900 16
      color #64748b
      font
        size 11
        weight 700
```

```xcon-workflow
workflow "Weather forecast ops workflow"
  ingestTelemetry: callApi GET "/api/dashboard/weather-forecast-ops/telemetry"

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
