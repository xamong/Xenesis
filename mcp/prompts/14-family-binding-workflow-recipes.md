# Family Binding And Workflow Recipes

Use this recipe when a document should stay data-bound across Markdown, Chain,
SKETCH, and Workflow. This is the strongest pattern for Hermes gateway,
Telegram, MCP, and bot-generated artifacts because one fixture can drive both a
viewer artifact and a generated PDF/export.

## Architecture

Recommended order:

1. Markdown title and short operational context.
2. `xcon-chain-fixture` with one source-of-truth object.
3. `xcon-chain as alias` blocks for display-ready values.
4. `xcon-sketch` that reads aliases and fixture-derived data.
5. Optional `xcon-workflow` that changes fixture values.

Workflow updates fixture data only. The SKETCH should not contain business logic
that belongs in Chain or Workflow.

Useful alias names:

- `titleText`, `statusText`, `ownerText`, `updatedAtText`
- `progressText`, `riskText`, `slaText`, `totalText`
- `chartData` for charts
- `gridData` for span grids
- `mapMarkers` for maps
- `networkNodes` and `networkLinks` for network diagrams
- `queueItems` or `alertItems` for lists

## Workflow Actions

Use `xcon-workflow` when the artifact needs an executable process model.
Common actions:

- `note` for visible explanation or milestones.
- `callApi` for external data fetch or update.
- `workqueue` for human review, approval, assignment, or triage.
- `scheduler` for polling, refresh, reminder, or periodic checks.

Use `after` to make dependencies explicit. Use `concurrency` only when the
workflow really runs independent branches.

## Bound Packet Example

````markdown
# Bound Operations Packet

```xcon-chain-fixture
{
  "record": {
    "title": "North zone dispatch",
    "status": "Waiting",
    "metrics": { "done": 3, "total": 8 },
    "series": [72, 64, 81, 57],
    "queue": [
      ["Task", "Owner", "State"],
      ["Inspect W-12", "Mina", "Queued"],
      ["Battery swap", "Jae", "Ready"]
    ]
  }
}
```

```xcon-chain as titleText
= record.title
```

```xcon-chain as statusText
= record.status
```

```xcon-chain as progressText
= record.metrics.done | concat " / " | concat (record.metrics.total)
```

```xcon-chain as chartData
= {"labels":["A","B","C","D"],"datasets":[{"label":"Load","data":record.series}]}
```

```xcon-chain as gridData
= record.queue
```

```xcon-sketch
screen "Bound Operations" 760x420 bg @surface
  title: label "$titleText" at 28 24 360 34
    color @ink
    font
      size 26
      weight 900
  status: badge "$statusText" at 598 26 118 30
    bg #fef3c7
    color #92400e
  progress: label "$progressText" at 28 78 180 34
    color @accent
    font
      size 30
      weight 900
  chart: chart at 28 136 300 230
    chartType "bar"
    chartData $chartData
  queue: spanGrid at 356 136 360 230
    backgroundColor @surface2
    readonly true
    data $gridData
    columns [{"id":"task","title":"Task","width":160},{"id":"owner","title":"Owner","width":100},{"id":"state","title":"State","width":100}]
```

```xcon-workflow
workflow "Dispatch Refresh"
  refresh: scheduler "Refresh every 10 minutes"
    cron "*/10 * * * *"

  fetch: callApi "Fetch latest field state"
    after refresh
    method "GET"
    url "https://example.com/api/field-state"

  triage: workqueue "Review blocked dispatch items"
    after fetch
    assignee "ops-lead"
```
````

## Pitfalls

- Do not duplicate fixture values manually inside SKETCH.
- Do not reference `$alias` before its `xcon-chain as alias` block.
- Do not mutate SKETCH nodes from Workflow unless explicitly requested.
