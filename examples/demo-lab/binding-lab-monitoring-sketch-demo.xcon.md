```xcon-demo
demo "Monitoring SKETCH demo"
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
    "title": "Realtime subtitle workflow monitor",
    "updatedAt": "runner idle",
    "status": "Waiting for live runner events",
    "statusColor": "#94a3b8",
    "summary": "SKETCH dashboard plus queue and scheduler events.",
    "metrics": { "revenue": 22, "growth": 0, "health": 0 },
    "channels": [
      { "name": "KBS Drama", "status": "queued", "color": "#64748b", "revenue": 1 },
      { "name": "MBC every1", "status": "queued", "color": "#64748b", "revenue": 1 },
      { "name": "tvN", "status": "queued", "color": "#64748b", "revenue": 1 },
      { "name": "JTBC", "status": "queued", "color": "#64748b", "revenue": 1 },
      { "name": "Channel A", "status": "queued", "color": "#64748b", "revenue": 1 },
      { "name": "KTV", "status": "queued", "color": "#64748b", "revenue": 1 }
    ],
    "team": [
      { "name": "extractQueue", "owner": "Subtitle extraction", "status": "waiting" },
      { "name": "translateQueue", "owner": "Translation workers", "status": "waiting" },
      { "name": "persistQueue", "owner": "Delivery shards", "status": "waiting" }
    ],
    "queue": { "total": 6, "done": 0, "percent": 0, "percentLabel": "0%", "fillWidth": 0, "doneText": "0 / 6 channels translated" },
    "scheduler": { "label": "scheduler idle", "tick1": "#6b7280", "tick2": "#6b7280", "tick3": "#6b7280", "tick4": "#6b7280", "tick5": "#6b7280" },
    "workflow": { "status": "Workflow not started", "percent": 0, "percentLabel": "0%", "fillWidth": 0, "lastEvent": "Ready." }
  }
}
```

# Realtime monitoring dashboard

This preset mirrors the SKETCH monitor demo: workflow events run as queue and scheduler primitives, while the visual dashboard updates through fixture-bound chain values.

```xcon-chain as translated
= record.queue.doneText
```

```xcon-chain as queuePercent
= record.queue.percentLabel
```

```xcon-chain as queueFill
= record.queue.fillWidth
```

```xcon-chain as eventLine
= record.workflow.lastEvent
```

```xcon-sketch
screen "Realtime Monitor" 980x590 bg #20242a
  root: panel at 0 0 980 590
    bg #20242a
    title: label "$record.title" at 28 24 470 32
      color white
      font
        size 26
        weight 800
    clock: label "$record.updatedAt" at 650 26 280 28
      color #facc15
      align right
      font
        size 22
        weight 700
    subtitle: label "Queue + scheduler events replay into fixture data" at 30 62 560 20
      color #94a3b8
      font
        size 13
        weight 700
    extractPanel: panel at 28 108 292 180
      bg #1b222e
      radius 18
      h: label "1. Subtitle extraction" at 18 18 230 24
        color white
        font
          size 18
          weight 800
      e1: label "● $record.channels.0.name" at 24 66 130 22
        color $record.channels.0.color
        font
          size 14
          weight 800
      e2: label "● $record.channels.1.name" at 158 66 130 22
        color $record.channels.1.color
        font
          size 14
          weight 800
      e3: label "● $record.channels.2.name" at 24 106 130 22
        color $record.channels.2.color
        font
          size 14
          weight 800
      e4: label "● $record.channels.3.name" at 158 106 130 22
        color $record.channels.3.color
        font
          size 14
          weight 800
    queuePanel: panel at 344 108 292 180
      bg #101722
      radius 18
      h: label "2. Translation queue" at 18 18 230 24
        color white
        font
          size 18
          weight 800
      translated: label "$translated" at 20 58 220 34
        color white
        font
          size 24
          weight 800
      rail: shape at 20 110 248 14
        bg #334155
        radius 7
      fill: shape at 20 110 $record.queue.smallFillWidth 14
        bg #22c55e
        radius 7
    schedulePanel: panel at 660 108 292 180
      bg #1b222e
      radius 18
      h: label "3. Scheduler ticks" at 18 18 230 24
        color white
        font
          size 18
          weight 800
      s: label "$record.scheduler.label" at 20 56 230 22
        color #facc15
        font
          size 15
          weight 800
      t1: shape at 30 104 24 24
        bg $record.scheduler.tick1
        radius 12
      t2: shape at 76 104 24 24
        bg $record.scheduler.tick2
        radius 12
      t3: shape at 122 104 24 24
        bg $record.scheduler.tick3
        radius 12
      t4: shape at 168 104 24 24
        bg $record.scheduler.tick4
        radius 12
      t5: shape at 214 104 24 24
        bg $record.scheduler.tick5
        radius 12
    stream: panel at 28 324 924 160
      bg #0b1220
      radius 18
      h: label "Live runner event stream" at 22 18 260 24
        color white
        font
          size 20
          weight 800
      line: label "$eventLine" at 22 58 860 24
        color #cbd5e1
        font
          size 14
          weight 700
```

```xcon-workflow
workflow "Fixture only subtitle pipeline"
  loadChannels: callApi GET "/api/monitor/channels"

  extractQueue: workqueue
    concurrency 3
    data "= record.channels"
    after loadChannels
    actions [
      {"id":"extractSubtitle","type":"callApi","method":"POST","url":"/api/subtitle/extract","parameter":{"channel":"{{item.name}}"}}
    ]

  translateQueue: workqueue
    concurrency 2
    data "= record.channels"
    after extractQueue
    actions [
      {"id":"translateSubtitle","type":"callApi","method":"POST","url":"/api/subtitle/translate","parameter":{"channel":"{{item.name}}"}}
    ]

  syncScheduler: scheduler
    mode "interval"
    intervalMs 220
    iterations 5
    after translateQueue
    actions [
      {"id":"syncTick","type":"callApi","method":"POST","url":"/api/monitor/sync"}
    ]

  persistQueue: workqueue
    concurrency 2
    data "= record.deliveryTargets"
    after syncScheduler
    actions [
      {"id":"persistShard","type":"callApi","method":"POST","url":"/api/monitor/persist","parameter":{"target":"{{item.name}}"}}
    ]

  complete: note "fixture complete"
    after persistQueue
```
