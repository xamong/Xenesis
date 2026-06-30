# XD Blaster Menu Port Design

## Objective

Port the usable XD Blaster entry point from
`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.core-tools\panes\XdBlasterPane.tsx`
into this repository without regressing existing `mini` branch behavior.

## Current State

The core XD Blaster runtime is already present in this repository:

- `src/renderer/extensions/xenesis-desk.core-tools/panes/XdBlasterPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xdBlasterModel.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xdBlasterModel.test.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisActivityBlaster.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisActivityBlaster.test.ts`

Direct no-index comparisons against the source repo showed no content
differences for `XdBlasterPane.tsx`, `xdBlasterModel.ts`, or
`xenesisActivityBlaster.ts` beyond line-ending warnings.

The current repository also already exposes the command/tool/CR paths:

- Extension command: `xenesis-desk.core-tools.openXdBlaster`
- Extension tool: `xenesis-desk.core-tools.xd-blaster`
- Capability Registry path: `xd.tools.core.xdBlaster.open`

The remaining gap is the shared application menu model. The source repo exposes
XD Blaster in the Tools group between Network Monitor and Audit Log, while this
repo's `src/shared/appMenuModel.ts` omits that item.

## Scope

Implement only the missing menu-model surface:

- Add `xenesis-desk.core-tools.openXdBlaster` to the Tools group in
  `src/shared/appMenuModel.ts`.
- Update `src/shared/appMenuModel.test.ts` so the operator-panel grouping and
  native-menu collection assert XD Blaster visibility.

Do not bulk-copy the source repo `xenesis-desk.core-tools` directory. That
directory contains unrelated differences for Agent Sessions, App Control Lab,
Stash naming, and Memory Dashboard behavior. Pulling those changes as a batch
would mix unrelated feature ports and risk undoing behavior that already exists
on this branch.

## User Flow

After implementation, users can open XD Blaster through the same Tools menu
taxonomy as other operator panels:

1. Open the application menu.
2. Navigate to Tools.
3. Choose XD Blaster.
4. Desk dispatches `xenesis-desk.core-tools.openXdBlaster`, which opens
   `xenesis-desk.core-tools.xd-blaster` through the already registered
   renderer extension path.

CR callers can continue using `xd.tools.core.xdBlaster.open`; this design does
not change the CR contract.

## Testing

Use TDD:

1. Add a failing expectation in `src/shared/appMenuModel.test.ts` that
   `xenesis-desk.core-tools.openXdBlaster` appears in the Tools operator-panel
   group and native menu items.
2. Run:
   `node --import tsx --test src/shared/appMenuModel.test.ts`
   and confirm the test fails because XD Blaster is not in the resolved Tools
   group.
3. Add the missing menu item to `src/shared/appMenuModel.ts`.
4. Re-run:
   `node --import tsx --test src/shared/appMenuModel.test.ts`
5. Run the XD Blaster focused tests:
   `node --import tsx --test src/renderer/extensions/xenesis-desk.core-tools/panes/xdBlasterModel.test.ts src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisActivityBlaster.test.ts`
6. Run broader verification:
   `npm run typecheck`
   and, if CR-related files remain untouched as expected, no CR audit is needed
   for this narrow menu exposure. If CR files change, run
   `npm run docs:capabilities:audit`.

## Risks

- The existing menu tests encode ordering, so the implementation must preserve
  the intended operator-panel order.
- The source repo's broader `core-tools` diff is not safe to copy wholesale
  because it contains unrelated feature and naming changes.
- This change proves menu discoverability and type safety; it does not replace a
  live Electron smoke test of manually opening the pane.
