# App Control Lab And Extended Apps Slice Design

## Priority

Order 3 in the non-package parity roadmap.

## Goal

Upgrade external desktop app control by porting the sibling platform adapter
structure, extended app actions, and App Control Lab UI while preserving the
current repo's existing external app and input-control behavior.

## Source Surface

Sibling files to evaluate and adapt:

- `src/main/appControl/appControlAdapter.ts`
- `src/main/appControl/createPlatformAppControlAdapter.ts`
- `src/main/appControl/unsupportedAppControl.ts`
- `src/main/appControl/windowsControlHost.ts`
- `src/main/appControl/windowsAppControl.ts`
- `src/main/appControl/macosControlHost.ts`
- `src/main/appControl/macosAppControl.ts`
- Matching app-control tests.
- `src/renderer/extensions/xenesis-desk.core-tools/panes/AppControlLabPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/appControlLabModel.ts`
- Matching App Control Lab tests.

Current repo files that must stay aligned:

- `src/shared/externalAppControl.ts`
- `src/shared/externalAppCapabilities.test.ts`
- `src/main/appControl/appControlService.ts`
- `src/main/appControl/windowsAppControl.ts`
- `src/main/inputControl/inputControlService.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/types.ts`
- `src/shared/appMenuModel.ts`
- `src/main/extensions/extensionHost.ts`

## Architecture

The shared external app model remains the public contract. Main process app
control becomes adapter-based:

- Windows host client for richer UI Automation and input actions.
- macOS host client or graceful unsupported adapter.
- Unsupported adapter for platforms without native helper support.

The App Control Lab is a renderer tool surface for manual inspection and
debugging. It must call CR paths, not direct host internals.

## CR Surface

Existing paths remain:

- `xd.apps.status`
- `xd.apps.find`
- `xd.apps.launch`
- `xd.apps.focus`
- `xd.apps.resize`
- `xd.apps.typeText`
- `xd.apps.hotkey`
- `xd.apps.click`
- `xd.apps.doubleClick`
- `xd.apps.rightClick`
- `xd.apps.move`
- `xd.apps.screenshot`
- `xd.apps.close`

Additional sibling paths to port:

- `xd.apps.inspect`
- `xd.apps.elementFromPoint`
- `xd.apps.tree`
- `xd.apps.highlight`
- `xd.apps.captureElement`
- `xd.apps.tripleClick`
- `xd.apps.middleClick`
- `xd.apps.mouseDown`
- `xd.apps.mouseUp`
- `xd.apps.dragAndDrop`
- `xd.tools.core.appControlLab.open`

## Error Handling

- Registered app profiles remain preferred over arbitrary executable paths.
- Read/observation actions should not require approval unless they cross an
  external boundary policy already defined by the app-control model.
- Write/control/execute actions keep `when-external` approval behavior.
- Unsupported platform results must be structured and visible in the lab UI.

## Tests

Focused tests:

- Shared external app tests.
- App control service and adapter tests.
- App Control Lab model tests.
- Input-control regression tests.
- CR registration and dispatch tests.

Broader gates:

- `npm test`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- Notepad live smoke on Windows when the host environment allows it.

## Non-Goals

- Do not change `packages/xenesis`.
- Do not bypass the Capability Registry from the lab UI.
- Do not make arbitrary executable launch the default path.
