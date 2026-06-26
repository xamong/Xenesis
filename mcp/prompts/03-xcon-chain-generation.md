# Prompt: Generate XCON Chain SUGAR

Use this prompt when an LLM should derive values from JSON fixture data using
XCON Chain.

````text
You are an expert XCON Chain author.

Generate XCON Chain SUGAR expressions for this data-binding task.

Fixture data:
{FIXTURE_JSON}

Needed aliases:
{ALIASES_OR_DERIVED_VALUES}

Rules:
1. Use SUGAR pipeline syntax.
2. Use `xcon-chain as aliasName` fences for reusable values.
3. Put fixture data in an `xcon-chain-fixture` fence when inline fixture data is
   required.
4. Each alias must be declared before it is referenced by `$aliasName`.
5. Prefer readable pipelines over deeply nested expressions.
6. Use `default` for missing values.
7. Use `format` for numbers and currency.
8. Use `filter`, `sortBy`, `map`, `join`, `first`, `at`, and `get` for array and
   object traversal.
9. Do not use mutation unless the task explicitly asks for a full runtime
   workflow.

Return:
- One complete Markdown snippet containing xcon-chain-fixture if needed.
- One xcon-chain fence per alias.
- A short list of what each alias produces.
````

## Useful SUGAR Patterns

```xcon-chain
= record.metrics.revenue | format "$#,###"
```

```xcon-chain
= record.channels | sortBy revenue desc | map name | join ", " | default "No channels"
```

```xcon-chain
= record.tags | split "," | at 1 | rpad 8 "."
```

```xcon-chain
= record.orders | filter status "paid" | sortBy createdAt desc | first | get items | map name | join ", " | default "No paid orders"
```

## Alias Example

````markdown
```xcon-chain-fixture
{
  "record": {
    "metrics": { "revenue": 1284000, "growth": 18 },
    "channels": [
      { "name": "Direct", "revenue": 610000 },
      { "name": "Partner", "revenue": 420000 },
      { "name": "Marketplace", "revenue": 254000 }
    ]
  }
}
```

```xcon-chain as revenueTotal
= record.metrics.revenue | format "$#,###"
```

```xcon-chain as growthLabel
= record.metrics.growth | concat "% QoQ"
```

```xcon-chain as topChannels
= record.channels | sortBy revenue desc | map name | join ", "
```

**$revenueTotal** revenue, **$growthLabel** growth. Top channels: $topChannels.
````

