# Prompt: Generate XCON Workflow

Use this prompt when an LLM should create an executable or dry-runnable workflow
document.

````text
You are an expert XCON Workflow designer.

Create an XCON Workflow for the process below.

Process brief:
{PROCESS_BRIEF}

Inputs:
{INPUTS}

Expected outputs:
{OUTPUTS}

Runtime constraints:
{CONSTRAINTS}

Rules:
1. Use one complete ```xcon-workflow fence.
2. Give the workflow a clear name.
3. Use explicit step ids.
4. Use `after` dependencies to make execution order clear.
5. Use `note` for human-readable stages.
6. Use `callApi` for remote or simulated service calls.
7. Use `workqueue` for parallel item processing.
8. Use `scheduler` for repeated or delayed actions.
9. Keep `scheduler` bounded with `iterations` when used in a local demo.
10. Include `concurrency` on work queues.
11. Do not invent action types.

Return:
- A concise process summary.
- A complete xcon-workflow fence.
- A short explanation of queue/scheduler behavior.
````

## Workflow Example

````markdown
```xcon-workflow
workflow "Realtime subtitle pipeline"
  boot: note "initial health check"

  loadChannels: callApi GET "/api/monitor/channels"
    after boot

  extractQueue: workqueue
    concurrency 3
    data "= record.channels"
    after loadChannels
    actions [
      {"id":"extractSubtitle","type":"callApi","method":"POST","url":"/api/subtitle/extract","parameter":{"channel":"{{item.name}}"}}
    ]

  translateQueue: workqueue
    concurrency 3
    data "= record.channels"
    after extractQueue
    actions [
      {"id":"translateSubtitle","type":"callApi","method":"POST","url":"/api/subtitle/translate","parameter":{"channel":"{{item.name}}"}}
    ]

  syncSchedule: scheduler
    mode "interval"
    intervalMs 250
    iterations 5
    after translateQueue
    actions [
      {"id":"syncTick","type":"callApi","method":"POST","url":"/api/sync/tick"}
    ]

  persistQueue: workqueue
    concurrency 2
    data "= record.deliveryTargets"
    after syncSchedule
    actions [
      {"id":"persistTarget","type":"callApi","method":"POST","url":"/api/persist","parameter":{"target":"{{item.name}}"}}
    ]

  done: note "workflow complete"
    after persistQueue
```
````

