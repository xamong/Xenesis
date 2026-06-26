# Prompt: Generate a Workflow Monitoring Dashboard

Use this prompt when an LLM should create a realtime monitoring document where
Workflow execution is visible as a dashboard.

````text
You are an expert XCON monitoring dashboard designer.

Create a dashboard document that shows this workflow running:
{WORKFLOW_USE_CASE}

Monitoring requirements:
{MONITORING_REQUIREMENTS}

Data to monitor:
{DATA_TO_MONITOR}

Rules:
1. Produce Markdown containing a complete `xcon-sketch` screen and a complete
   `xcon-workflow` workflow.
2. The `xcon-sketch` screen must start with `screen`.
3. Use clear named components for values that a runner can update, such as
   `queueFill`, `requestValue`, `doneValue`, `statusText`, `tick1`.
4. The dashboard must include:
   - status header
   - queue progress
   - scheduler ticks
   - counters
   - event stream
   - final completion state
5. The workflow must include:
   - boot or setup step
   - at least one `workqueue`
   - at least one bounded `scheduler`
   - final `note`
6. Keep the visual dashboard polished and legible.

Return:
- A Markdown overview.
- A complete `xcon-sketch` dashboard fence.
- A complete `xcon-workflow` fence.
````

## Dashboard Pattern

Use named visual parts so a runner can update them:

```code
queueFill: panel at 20 112 1 18
requestValue: label "0" at 34 82 120 48
doneValue: label "0" at 382 82 120 48
tick1: label "●" at 36 70 40 40
eventLine1: label "Ready." at 22 54 1060 22
```

## Workflow Pattern

```code
extractQueue: workqueue
  concurrency 3
  data "= record.channels"
  actions [...]

syncSchedule: scheduler
  mode "interval"
  intervalMs 250
  iterations 5
  actions [...]
```

