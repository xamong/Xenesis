```xcon-demo
demo "Family binding demo"
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
    "title": "XCON family live ops",
    "updatedAt": "runner idle",
    "status": "Fixture waiting for workflow",
    "statusColor": "#94a3b8",
    "summary": "The workflow updates fixture data. Chain aliases recompute the UI; SKETCH stays untouched.",
    "metrics": { "revenue": 624000, "growth": 24, "health": 91 },
    "channels": [
      { "name": "KBS Drama", "status": "queued", "color": "#64748b", "revenue": 120000 },
      { "name": "MBC every1", "status": "queued", "color": "#64748b", "revenue": 106000 },
      { "name": "tvN", "status": "queued", "color": "#64748b", "revenue": 99000 },
      { "name": "JTBC", "status": "queued", "color": "#64748b", "revenue": 88000 },
      { "name": "Channel A", "status": "queued", "color": "#64748b", "revenue": 74000 },
      { "name": "KTV", "status": "queued", "color": "#64748b", "revenue": 51000 }
    ],
    "team": [
      { "name": "Subtitle extraction", "owner": "Queue A", "status": "Queued" },
      { "name": "Translation queue", "owner": "Workers", "status": "Waiting" },
      { "name": "Delivery shards", "owner": "Scheduler", "status": "Standby" }
    ],
    "deliveryTargets": [
      { "name": "DB shard A", "status": "waiting", "color": "#64748b" },
      { "name": "DB shard B", "status": "waiting", "color": "#64748b" },
      { "name": "CDN push", "status": "waiting", "color": "#64748b" },
      { "name": "Client notify", "status": "waiting", "color": "#64748b" }
    ],
    "queue": { "total": 6, "done": 0, "percent": 0, "percentLabel": "0%", "fillWidth": 0, "doneText": "0 / 6 translated" },
    "scheduler": { "label": "scheduler idle", "ticks": 0, "tick1": "#475569", "tick2": "#475569", "tick3": "#475569", "tick4": "#475569", "tick5": "#475569" },
    "workflow": { "status": "Workflow not started", "percent": 0, "percentLabel": "0%", "fillWidth": 0, "lastEvent": "No runtime event yet." }
  }
}
```

# XCON family binding monitor

Workflow changes only the JSON fixture. Chain aliases derive display values, and SKETCH renders the same static document again.

```xcon-chain as title
= record.title
```

```xcon-chain as status
= record.status
```

```xcon-chain as summary
= record.summary
```

```xcon-chain as queueText
= record.queue.doneText
```

```xcon-chain as queuePercent
= record.queue.percentLabel
```

```xcon-chain as queueWidth
= record.queue.fillWidth
```

```xcon-chain as readyChannels
= record.channels | filter status "done" | map name | join ", " | default "No translated channels yet"
```

```xcon-chain as lastEvent
= record.workflow.lastEvent
```

```xcon-sketch
screen "Family Binding Monitor" 960x650 bg #20242a
  shell: panel at 0 0 960 650
    bg #20242a
    title: label "$title" at 28 24 480 34
      color #ffffff
      font
        size 26
        weight 800
    clock: label "$record.updatedAt" at 622 28 300 28
      color #facc15
      align right
      font
        size 22
        weight 700
    subtitle: label "fixture -> chain aliases -> SKETCH render" at 30 62 520 18
      color #94a3b8
      font
        size 13
        weight 700
    statusPanel: panel at 28 100 904 106
      bg #111827
      radius 18
      statusTitle: label "$status" at 22 18 640 28
        color $record.statusColor
        font
          size 22
          weight 800
      summary: label "$summary" at 22 54 660 20
        color #cbd5e1
        font
          size 13
          weight 600
      pct: label "$queuePercent" at 790 24 92 34
        color #38bdf8
        align right
        font
          size 30
          weight 800
      rail: shape at 22 84 860 8
        bg #334155
        radius 4
      fill: shape at 22 84 $queueWidth 8
        bg #22c55e
        radius 4
    extract: panel at 28 236 280 178
      bg #1b222e
      radius 18
      h: label "1. Source channels" at 18 18 220 24
        color #ffffff
        font
          size 18
          weight 800
      e1: label "ON  $record.channels.0.name" at 22 62 130 22
        color $record.channels.0.color
        font
          size 14
          weight 800
      e2: label "ON  $record.channels.1.name" at 152 62 130 22
        color $record.channels.1.color
        font
          size 14
          weight 800
      e3: label "ON  $record.channels.2.name" at 22 100 130 22
        color $record.channels.2.color
        font
          size 14
          weight 800
      e4: label "ON  $record.channels.3.name" at 152 100 130 22
        color $record.channels.3.color
        font
          size 14
          weight 800
      e5: label "ON  $record.channels.4.name" at 22 138 130 22
        color $record.channels.4.color
        font
          size 14
          weight 800
      e6: label "ON  $record.channels.5.name" at 152 138 130 22
        color $record.channels.5.color
        font
          size 14
          weight 800
    queue: panel at 340 236 280 178
      bg #111827
      radius 18
      h: label "2. Work queue" at 18 18 220 24
        color #ffffff
        font
          size 18
          weight 800
      q: label "$queueText" at 20 62 220 32
        color #ffffff
        font
          size 24
          weight 800
      rail: shape at 20 112 238 14
        bg #334155
        radius 7
      fill: shape at 20 112 $record.queue.smallFillWidth 14
        bg #22c55e
        radius 7
      ready: label "$readyChannels" at 20 140 238 20
        color #94a3b8
        font
          size 12
          weight 700
    scheduler: panel at 652 236 280 178
      bg #1b222e
      radius 18
      h: label "3. Scheduler and delivery" at 18 18 240 24
        color #ffffff
        font
          size 18
          weight 800
      s: label "$record.scheduler.label" at 20 56 240 22
        color #facc15
        font
          size 15
          weight 800
      t1: shape at 24 102 22 22
        bg $record.scheduler.tick1
        radius 11
      t2: shape at 70 102 22 22
        bg $record.scheduler.tick2
        radius 11
      t3: shape at 116 102 22 22
        bg $record.scheduler.tick3
        radius 11
      t4: shape at 162 102 22 22
        bg $record.scheduler.tick4
        radius 11
      t5: shape at 208 102 22 22
        bg $record.scheduler.tick5
        radius 11
    delivery: panel at 28 446 904 126
      bg #0b1220
      radius 18
      h: label "Fixture-driven delivery map" at 22 18 260 24
        color #ffffff
        font
          size 18
          weight 800
      d1: label "ON  $record.deliveryTargets.0.name" at 24 62 180 22
        color $record.deliveryTargets.0.color
        font
          size 14
          weight 800
      d2: label "ON  $record.deliveryTargets.1.name" at 244 62 180 22
        color $record.deliveryTargets.1.color
        font
          size 14
          weight 800
      d3: label "ON  $record.deliveryTargets.2.name" at 464 62 180 22
        color $record.deliveryTargets.2.color
        font
          size 14
          weight 800
      d4: label "ON  $record.deliveryTargets.3.name" at 684 62 180 22
        color $record.deliveryTargets.3.color
        font
          size 14
          weight 800
      event: label "$lastEvent" at 24 96 820 20
        color #cbd5e1
        font
          size 13
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
