# Dock Tear-Off Hardening Design

## Scope

Strengthen the existing dock tab tear-off flow without rewriting the dock
engine or changing context-menu detach behavior. This pass implements the full
scope of the 2026-06-27 design from the sibling `xenesis-desk` workspace:
pointer-driven placement, remembered detached size, display clamping, drag
cleanup, and transfer failure safety.

## Goals

- Pointer drag detach opens a detached Electron window near the mouse drop
  point.
- Detached windows remember their last usable size in memory and reuse that
  size for later pointer detaches.
- Requested detached bounds are clamped to the matching display work area.
- Drag cancellation clears renderer ghost/drop overlays, reattach target
  overlays, and detached merge highlights.
- Reattach and detached-window merge keep source content until the target IPC
  operation succeeds.
- Existing detach payload callers remain compatible.

## Non-Goals

- Do not change extension or menu behavior.
- Do not restore detached windows across app restarts.
- Do not add a full Electron drag E2E harness in this pass.
- Do not introduce new IPC channels unless implementation proves an existing
  channel cannot carry the required optional data.

## Current Implementation Summary

- `src/renderer/dock/useDragManager.ts` owns pointer drag state, drop-zone
  detection, renderer ghost UI, main-window reattach overlay start/cancel, and
  detached-window merge highlight toggles.
- `src/renderer/App.tsx` owns `handleDetach`, builds `DetachPayload`, calls the
  window IPC methods, and currently closes source content immediately after
  starting the IPC operation.
- `src/shared/types.ts` defines `DetachPayload` without placement data.
- `src/main/index.ts` creates every detached window with fixed `960x680`
  constructor bounds through `createDetachedWindow(title)`.
- Main-window bounds already have normalization and display clamping helpers,
  but detached-window placement is not isolated or tested.

## Architecture

Use a helper-first design.

### Renderer Drag Intent

`useDragManager` tracks the latest pointer screen coordinates during a drag. On
drop to `__detach__`, it calls the existing detach callback with optional
metadata containing the last `screenX` and `screenY`. Cleanup remains centralized
in the drag manager and always clears:

- `.is-dragging` on the dock root
- root and pane drop overlays
- drag ghost state
- reattach target overlay through `reattachCancel`
- detached-window merge highlight through `highlightDetachedWindow(false)`

The drag manager still treats overlay IPC as best-effort.

### Renderer Detach Payload

`App.tsx` keeps ownership of content serialization. `DetachPayload` gains only
an optional `requestedWindowBounds` field:

```ts
requestedWindowBounds?: {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

Pointer detaches provide this field. Context-menu and older callers omit it and
therefore keep the previous default placement behavior.

Add a small renderer helper, for example
`src/renderer/dock/detachBounds.ts`, that converts a drop point plus remembered
size into requested bounds. It should:

- use remembered detached width/height when available
- fall back to `960x680`
- keep size above the existing detached minimum, `480x320`
- place the top-left near the drop point with a small offset so the new window
  appears at the pointer without fully hiding it under the cursor

### Main Detached Placement

Add a small main-process helper, for example
`src/main/detachedWindowPlacement.ts`, that is independent from Electron globals
except for display work-area data passed into it. It resolves final bounds from:

- optional requested bounds
- remembered detached bounds from the current runtime session
- default `960x680`
- minimum `480x320`
- matching display work area

`createDetachedWindow(title, options?)` applies the resolved bounds to
`BrowserWindow`. The main process remembers the last usable detached bounds when
a detached window moves or resizes. It does not persist those bounds to disk.

## Data Flow

1. User drags a dock tab outside the app.
2. The drag manager records the latest pointer `screenX/screenY`.
3. On pointer up over `__detach__`, the drag manager calls the detach callback
   with the payload and drop screen point.
4. `App.tsx` serializes the content and computes
   `DetachPayload.requestedWindowBounds`.
5. `window:detach-tab` receives the payload.
6. The main process clamps requested bounds to the display work area and creates
   the detached window there.
7. The detached window consumes the existing payload through
   `window:get-detach-payload`.
8. When any detached window is moved or resized, the main process records its
   latest usable width/height for the next pointer detach.

## Transfer Error Handling

Transfer operations close the source content only after the target operation
succeeds.

- `detachTab(detachData)` resolves before `engine.closeContent(contentId)`.
- `reattachDrop(detachData)` resolves before `engine.closeContent(contentId)`.
- `mergeTabToDetached(detachData, targetWindowId)` resolves before
  `engine.closeContent(contentId)`.
- If an IPC operation rejects, the source content remains open and the status
  area shows the failure.

Terminal tabs need special care because the current flow releases the terminal
host before transfer. The implementation should move terminal release as late as
possible. If a terminal must be released before IPC completion, the failure path
must restore or re-adopt the source terminal before leaving the tab open.

## Compatibility

- `DetachPayload.requestedWindowBounds` is optional.
- Existing IPC channel names stay the same.
- Existing context-menu detach behavior keeps default placement.
- Existing detached-window reattach and merge payload consumers continue to read
  the same content fields.
- The Capability Registry mapping does not need new paths unless a new IPC
  channel becomes necessary during implementation.

## Testing

Add focused unit tests around extracted helpers instead of testing the whole
Electron drag flow.

- `src/renderer/dock/detachBounds.test.ts`
  - drop point plus remembered size yields requested bounds
  - missing remembered size falls back to `960x680`
  - invalid or too-small remembered size is normalized to safe dimensions

- `src/main/detachedWindowPlacement.test.ts`
  - requested bounds outside the work area are clamped
  - multi-display work areas choose the display nearest the drop point
  - remembered bounds contribute size without forcing stale position
  - missing requested bounds preserves default placement semantics

- `src/renderer/dock/detachTransfer.test.ts`
  - successful detach closes source content
  - failed detach leaves source content open
  - failed reattach and merge leave source content open

## Verification

Run the narrowest checks while iterating:

```powershell
node --import tsx --test src/renderer/dock/detachBounds.test.ts
node --import tsx --test src/main/detachedWindowPlacement.test.ts
node --import tsx --test src/renderer/dock/detachTransfer.test.ts
```

Before completion, run:

```powershell
npm run typecheck
npm run build
npm run docs:capabilities:audit
```

If implementation changes CR mappings or adds IPC channels, also inspect the
generated capability audit output and confirm no missing registry paths,
coverage paths, or undispatched callable methods were introduced.

## Open Decisions Resolved

- Scope: implement the full document scope in one pass.
- Approach: use helper-first extraction rather than inline patching or a new
  main-process drag session.
- Visual companion: available for diagrams if later needed, but current design
  decisions are textual and code-bound.
