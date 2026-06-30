# Xenesis Desk Input Control Layer Mini Design

Date: 2026-06-30

## Goal

Implement the first safe slice of the input control layer described in the
upstream design:

`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\docs\superpowers\specs\2026-06-26-input-control-layer-design.md`

This slice adds a CR-first `xd.input.*` contract, shared input DSL validation,
and a dispatcher/service boundary that can execute registered external desktop
app text and hotkey actions through the existing app-control layer. Browser
coordinate execution and full desktop automation are deferred.

## Approved Scope

The approved scope is option A:

- Register `xd.input.targets`, `xd.input.describe`,
  `xd.input.screenshot`, and `xd.input.run`.
- Add shared validation for the simple input DSL, target model, normalized
  `0..999` coordinates, result shape, and risk classification.
- Add a new `InputControlService` as the main-process dispatcher boundary.
- Reuse existing registered external app behavior for the first executable
  adapter path.
- Expose browser targets and describe support where current Desk browser state
  can support it, but do not implement browser coordinate execution in this
  slice.
- Keep existing `xd.apps.*`, `xd.computer.*`, `xd.panes.browser.*`, and
  `xd.playwright.*` surfaces intact.

## Non-Goals

- Do not replace existing specialized CR surfaces.
- Do not add unrestricted full-desktop automation.
- Do not introduce native mouse injection for external apps in this slice.
- Do not fake screenshot paths for unsupported targets.
- Do not add a vision observe-act loop.
- Do not route around Capability Registry approval or audit behavior.

## Existing Repo Context

The current repo already has several relevant CR surfaces:

- `xd.apps.*` controls registered external desktop apps and has Notepad live
  smoke coverage.
- `xd.computer.*` exposes an element-index native computer-use model, but it is
  not the same as the normalized coordinate DSL in the input-control design.
- `xd.panes.browser.*` supports visible browser pane navigation, state,
  text/DOM snapshots, and selector/text-based element actions.
- `xd.playwright.*` supports Playwright URL automation and screenshots.

The mini input layer should compose these surfaces rather than duplicate or
bypass them.

## Architecture

Use a new service boundary instead of putting DSL conversion directly inside
`deskBridgeCapabilities.ts`.

```text
xd.input.* CR
  -> InputControlService
      -> shared input model / validation / risk classification
      -> DesktopRegisteredAppAdapter
          -> existing appControlService / xd.apps.* behavior
      -> Browser adapter placeholder
          -> existing browser state/describe paths first
```

Responsibilities:

- `src/shared/inputControl.ts` owns the external input DSL types,
  normalization, validation, coordinate conversion, secret-shaped text checks,
  action support metadata, and result helpers.
- `src/main/inputControl/inputControlService.ts` resolves targets and executes
  supported action batches through injected adapters.
- `src/shared/deskBridgeCapabilities.ts` registers the `xd.input.*` family and
  dispatches calls to a new adapter method such as `inputControlCall`.
- Electron main wires `inputControlCall` in the Desk bridge adapter.

## Capability Contract

First slice capabilities:

```text
xd.input.targets      read
xd.input.describe     read
xd.input.screenshot   read
xd.input.run          execute, approval required for external callers
```

`xd.input.targets` returns controllable targets with explicit support metadata:

```json
{
  "ok": true,
  "targets": [
    {
      "environment": "desktop",
      "target": { "kind": "app", "appId": "notepad" },
      "label": "Notepad",
      "runSupport": "partial",
      "supportedActions": ["type", "hotkey", "wait"]
    }
  ]
}
```

`xd.input.describe` returns target details such as environment, bounds or
viewport, title, URL, supported actions, and safety limits.

`xd.input.screenshot` returns a real screenshot artifact only when a real
adapter supports it. For the first slice, unsupported targets return:

```json
{
  "ok": false,
  "error": "Input screenshot is not available for this target.",
  "unsupported": true
}
```

`xd.input.run` executes an ordered action batch and stops at the first failed
action unless `continueOnError` is explicitly true.

## Request Model

The request model follows the upstream DSL:

```json
{
  "environment": "desktop",
  "target": {
    "kind": "app",
    "appId": "notepad"
  },
  "actions": [
    { "type": "type", "text": "hello", "intent": "write text" },
    { "type": "hotkey", "keys": ["CTRL", "A"], "intent": "select text" },
    { "type": "wait", "seconds": 1, "intent": "let the UI settle" }
  ],
  "continueOnError": false
}
```

Target kinds retained in the contract:

- `active`
- `browser`
- `desktop`
- `app`
- `pane`
- `content`

Executable first-slice target:

- `environment: "desktop"` with `target.kind: "app"` and a registered
  `appId`.

Deferred or read-only first-slice targets:

- `browser`, `pane`, `content`, and `active` may be described when resolvable,
  but `run` returns an honest unsupported result for coordinate actions.
- `desktop` full-screen target is disabled.
- unregistered app/path targets are rejected.

## Action Support

The input DSL keeps the upstream action names:

```text
click
double_click
right_click
move
mouse_down
mouse_up
drag_and_drop
type
press_key
key_down
key_up
hotkey
scroll
wait
take_screenshot
navigate
go_back
go_forward
```

First-slice executable actions:

- `type`: maps to registered app text entry.
- `hotkey`: maps to registered app hotkey.
- `wait`: local delay, bounded by a small maximum.

First-slice validated but unsupported actions:

- mouse coordinate actions
- drag actions
- scroll
- low-level key down/up
- browser navigation and history actions through `xd.input.run`
- screenshot action

Coordinates are still validated as integers in `0..999`, and shared pixel
conversion utilities are added for future adapters. The first slice does not
use pixel conversion for OS mouse injection.

## Result Model

Successful run:

```json
{
  "ok": true,
  "environment": "desktop",
  "target": { "kind": "app", "appId": "notepad" },
  "actions": [
    {
      "index": 0,
      "type": "type",
      "ok": true,
      "intent": "write text",
      "adapterPath": "xd.apps.typeText"
    }
  ]
}
```

Failed run:

```json
{
  "ok": false,
  "failedIndex": 1,
  "error": "Input action is not supported for this target.",
  "partialResults": [
    {
      "index": 0,
      "type": "type",
      "ok": true,
      "adapterPath": "xd.apps.typeText"
    }
  ]
}
```

Action results may include `normalized` and `pixel` fields when the action uses
coordinates and an adapter has resolved target bounds.

## Approval And Safety

`xd.input.run` is approval-protected for external callers through the existing
Capability Registry approval flow. The implementation must create real approval
records and must not rely on chat-only approval text.

Safety rules:

- read-only paths do not mutate targets.
- full desktop target is disabled in this slice.
- unregistered app/path targets are rejected.
- `type` text is length-limited and checked for secret-shaped values.
- text and value fields are redacted in summaries and logs.
- dangerous hotkeys are blocked or classified as unsupported.
- unsupported actions return structured action failures.
- `continueOnError` defaults to false.
- approval summaries use readable target/action intent text before raw details.

Registered external app actions continue to reuse app-control profile policy
and approval sensitivity where applicable.

## Testing Strategy

Use TDD for implementation after this spec is approved.

Focused tests:

- `src/shared/inputControl.test.ts`
  - DSL normalization
  - target validation
  - coordinate validation
  - pixel conversion utility
  - action support classification
  - secret-shaped text handling
  - result shape helpers
- `src/main/inputControl/inputControlService.test.ts`
  - `targets` exposes registered app targets
  - `describe` reads app status/bounds through the adapter
  - `run` maps `type`, `hotkey`, and `wait`
  - unsupported actions return structured failures
  - failure stops the batch unless `continueOnError` is true
- `src/shared/inputControlCapabilities.test.ts`
  - `xd.input.*` paths are registered
  - permission and approval metadata match the contract
  - dispatcher reaches the injected input-control adapter

Broader verification:

- `npm run typecheck`
- `npm run docs:capabilities:audit`
- `node scripts/assertCapabilityAuditZero.mjs`
- `npm test` when the focused implementation is stable

Live smoke is optional for this first mini slice if only service-level app
adapter stubs are exercised. A later slice that performs actual browser
coordinate control or desktop mouse injection must add Electron live smoke
evidence.

## Implementation Boundaries

The implementation plan should keep changes scoped to:

- shared input-control model and tests
- main input-control service and tests
- CR registration and dispatch tests
- main bridge adapter wiring
- `handoff.md` updates

It should avoid unrelated provider/runtime files currently dirty in the local
worktree.

## Review Checklist

- No existing specialized capability is removed or replaced.
- `xd.input.*` remains discoverable through CR.
- `xd.input.run` cannot execute unregistered full-desktop control.
- Unsupported action behavior is explicit and test-covered.
- Text and hotkey safety checks run before adapter execution.
- Browser coordinate execution is deferred rather than partially hidden.
