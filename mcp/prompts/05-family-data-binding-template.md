# Prompt: Generate an XCON Family Data-Binding Template

Use this prompt when you want a complete template that combines:

- Markdown prose
- `xcon-chain-fixture`
- `xcon-chain` aliases
- `xcon-sketch` visual rendering
- optional `xcon-workflow`

This is the recommended pattern for data-bound UI documents.

````text
You are an expert XCON family template author.

Create a data-bound document for this use case:
{USE_CASE}

Data domain:
{DATA_DOMAIN}

Required visual output:
{VISUAL_OUTPUT}

Workflow behavior, if any:
{WORKFLOW_BEHAVIOR}

Architecture rules:
1. The fixture is the source of truth.
2. Chain aliases derive display values from the fixture.
3. SKETCH reads aliases and fixture values, but does not contain business logic.
4. Workflow updates fixture data only, unless the task explicitly asks for
   direct dashboard mutation.
5. The SKETCH source must stay stable while fixture values change.

Required output:
1. A Markdown title and short explanation.
2. One `xcon-chain-fixture` fence.
3. Multiple `xcon-chain as alias` fences.
4. One complete `xcon-sketch` fence that starts with `screen`.
5. Optional `xcon-workflow` fence if the use case needs process execution.

Self-check:
- All `$alias` references are declared.
- Fixture paths used in SKETCH exist.
- Workflow steps modify only fixture values unless explicitly required.
- The rendered SKETCH screen is useful even before workflow execution.
````

## Reference Structure

````markdown
# Metadata-bound Operations Brief

```xcon-chain-fixture
{
  "record": {
    "title": "Launch operations",
    "status": "Waiting for workflow",
    "metrics": { "done": 0, "total": 6 }
  }
}
```

```xcon-chain as statusText
= record.status
```

```xcon-chain as progressText
= record.metrics.done | concat " / " | concat (record.metrics.total)
```

```xcon-sketch
screen "Bound Monitor" 640x260 bg #20242a
  card: panel at 24 24 592 180
    bg #111827
    radius 20
    title: label "$statusText" at 24 24 420 32
      color white
      font
        size 24
        weight 800
    progress: label "$progressText" at 24 72 180 34
      color #38bdf8
      font
        size 30
        weight 800
```
````

