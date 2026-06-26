---
type: architecture
repo: xenesis-desk
status: active
risk: high
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-27
depends_on:
  - "[[Final Goal]]"
  - "[[module-xenesis-agent-pane]]"
  - "[[module-provider-runtime]]"
  - "[[module-approval-system]]"
---

# Xenesis Agent Runtime

## Purpose

Describes how the native Agent pane, provider runtime, CR caller, approval system, and work log relate.

## Role In Final Goal

The Agent runtime turns natural-language user intent into Desk-control behavior
while preserving the CR-first control plane, provider settings, work logs, and
approval stops.

## Source Files

| Source | Role |
|---|---|
| `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx` | Native Agent pane UI and prompt submission surface. |
| `packages/xenesis-agent-core/src/embeddedRuntime.ts` | Embedded Agent runtime service entrypoint. |
| `packages/xenesis/src/core/AgentRuntimeFactory.ts` | Provider/runtime creation and system-context assembly. |
| `src/main/xenesisService.mjs` | Electron main service bridge for Agent runtime. |

## Control Flow

1. User submits natural language in the Agent pane.
2. Main process creates or reuses the configured Xenesis runtime.
3. Runtime chooses provider according to profile/settings.
4. Provider reasoning may call Desk tools.
5. Desk tools call CR paths or MCP bridge wrappers.
6. Results, approval stops, work-log entries, and final response return to the pane.

## Risks

- Natural conversation is incorrectly routed as Desk-control.
- Desk-control prompts bypass CR and call renderer shortcuts directly.
- Provider fallback hides credential or profile errors.
- Live Agent verification checks only tests and not actual pane behavior.

## Verification

- `npm --prefix packages/xenesis test`
- `npm --prefix packages/xenesis run provider:smoke`
- Live Electron Agent pane natural-language Desk-control prompt.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[module-xenesis-agent-pane]]
- Depends on [[module-provider-runtime]]
- Depends on [[module-approval-system]]
