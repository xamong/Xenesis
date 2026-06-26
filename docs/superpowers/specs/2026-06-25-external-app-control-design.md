# External App Control Design

Date: 2026-06-25
Status: Approved for implementation planning

> **Harvest note (codex trunk):** Implemented via the explicit `xd.apps.*`
> capability surface. The pre-LLM keyword/alias router
> (`resolveExternalAppProfileIdFromText`) was intentionally **not** harvested;
> the agent maps natural-language requests to an explicit `appId` in-model,
> consistent with this design's goal of "explicit Desk capabilities instead of
> ad hoc natural language routing."

## Goal

Xenesis Desk should let Xenesis Agent launch and control external desktop
applications through explicit Desk capabilities instead of ad hoc natural
language routing. The long-term goal is full external GUI control, but the
first implementation should focus on a stable Windows-visible-control baseline.

The first validated scenario is Notepad:

1. Open Notepad.
2. Find and focus its window.
3. Move or resize the window.
4. Type text into it.
5. Send a basic hotkey.
6. Report status.
7. Close the app or window.

## Scope

### First Implementation

- Windows only.
- Visible control only. Xenesis moves and focuses the real user-visible window.
- Registered app profiles by default.
- Arbitrary executable paths are allowed only behind strong approval.
- Notepad is the built-in verification profile.
- Expose the feature through Settings, Capability Registry, CR commands, and
  Xenesis Agent natural language.

### Out Of Scope For First Implementation

- macOS support.
- OCR.
- Image-based clicking.
- Coordinate mouse automation.
- UI Automation tree traversal.
- Browser DOM automation beyond existing Playwright browser capabilities.
- Background/off-screen app control.
- Full app-specific workflow automation.

These are intentionally deferred so the first layer can establish safe process,
window, and keyboard control contracts.

## Architecture

External app control is exposed as a new `xd.apps.*` capability family.
Xenesis Agent should not call platform automation directly. It should resolve
the user's request into an external app action plan, pass that plan through
approval, execute it through the Desk bridge, and summarize observed results.

```text
Xenesis Agent
  -> intent planner
  -> xd.apps capability
  -> approval gate
  -> Windows app-control adapter
  -> process/window operation
  -> observed result
  -> Xenesis Agent summary
```

This keeps natural-language interpretation separate from process/window
automation and allows future macOS or richer Windows adapters without changing
the public capability contract.

## Capability Contract

The first capability set should be small and explicit:

```text
xd.apps.launch   appId | path | args | cwd | placement?
xd.apps.find     appId | processName | titleContains
xd.apps.focus    appId | windowId
xd.apps.resize   appId | windowId | x | y | width | height
xd.apps.typeText appId | windowId | text
xd.apps.hotkey   appId | windowId | keys
xd.apps.close    appId | windowId | mode
xd.apps.status   appId?
```

All commands should return a structured Desk action result. A successful result
should include enough context for the agent and user to understand what changed:

- app profile ID or executable path
- process ID when available
- window ID or handle when available
- window title when available
- bounds when relevant
- foreground/focus status when relevant
- approval level used
- warnings or partial failures

## Approval Policy

External app control affects the user's real desktop and must always be routed
through the Desk approval model.

Approval levels:

```text
low
  Registered app status/find/focus/resize.

medium
  Registered app launch/typeText/hotkey/close.

high
  Arbitrary executable path launch.
  Admin/elevated execution.
  Shell or URL scheme execution.
  Large text input.
```

The agent should continue the same request after approval. It should not ask the
user to manually copy `/xd call` commands unless the automatic approval flow is
unavailable or failed.

## App Profiles

External apps are represented by local profiles. Built-in profiles may be
tracked in source when they contain no user-specific paths. User-created
profiles are local settings and must not leak into Git-tracked files or docs.

Initial profile model:

```ts
type ExternalAppProfile = {
  id: string
  label: string
  platform: 'windows'
  executable: string
  defaultArgs?: string[]
  defaultCwd?: string
  allowedActions: Array<
    'launch' | 'focus' | 'resize' | 'typeText' | 'hotkey' | 'close'
  >
  approvalLevel: 'low' | 'medium' | 'high'
}
```

The first built-in profile is:

```text
id: notepad
label: Notepad
platform: windows
executable: notepad.exe
allowedActions: launch, focus, resize, typeText, hotkey, close
approvalLevel: medium
```

## Module Boundaries

The implementation should keep platform-specific code away from the agent UI.

```text
src/main/appControl/
  appControlTypes.ts
  appProfileStore.ts
  windowsAppControl.ts

src/renderer/deskBridge/
  xd.apps.* capability registration

src/renderer/settings/
  External app profile management UI

src/renderer/extensions/xenesis-desk.core-tools/
  Xenesis Agent intent -> xd.apps.* action plan integration
```

The Windows adapter is responsible for process/window work. The renderer bridge
is responsible for capability registration and approval metadata. Xenesis Agent
is responsible for intent planning, calling capabilities, and explaining the
result.

## User Experience

The primary user experience is natural language:

```text
메모장을 열어줘
메모장에 "hello xenesis"를 입력해줘
메모장을 왼쪽 위 800x600으로 배치해줘
현재 열린 외부 앱 상태를 보여줘
메모장을 닫아줘
```

Expected behavior:

- Xenesis Agent plans a Desk action instead of giving manual instructions.
- Approval appears when required.
- After approval, execution continues in the same conversation.
- The final response summarizes the actual Desk action result.
- Fallback `/xd call` guidance appears only when automatic control cannot
  proceed.

Settings should include an external app profile section where users can view,
add, disable, and remove profiles. The first UI can be compact, but it must make
approval risk visible and avoid writing user paths into repository files.

## Testing Strategy

### Unit Tests

- Profile validation.
- Approval level classification.
- Intent-to-`xd.apps.*` plan mapping.
- Capability input validation.

### Integration Tests

- `xd.apps.launch` opens Notepad.
- `xd.apps.status` reports the launched app/window.
- `xd.apps.focus` focuses the window.
- `xd.apps.resize` changes window bounds.
- `xd.apps.typeText` inputs text.
- `xd.apps.hotkey` sends a basic key combination.
- `xd.apps.close` closes the app/window.
- High-risk arbitrary path launches require high approval.

### Manual/Demo Verification

Create a clear demo that shows Xenesis Agent controlling Notepad through Desk:

1. User asks Xenesis to open Notepad.
2. Approval is shown if required.
3. Notepad opens visibly.
4. Xenesis resizes/focuses it.
5. Xenesis types a short message.
6. Xenesis reports status.
7. Xenesis closes it.

## Success Criteria

The feature is ready for the next iteration when:

- Notepad can be controlled through both CR and Xenesis Agent natural language.
- Every external app action is represented as a structured Desk action result.
- Approval behavior is predictable and test-covered.
- Registered profiles and arbitrary paths have different approval levels.
- User-specific executable paths are stored only in local settings.
- The architecture can accept future macOS, OCR, image-click, or UI Automation
  adapters without changing the `xd.apps.*` public contract.
