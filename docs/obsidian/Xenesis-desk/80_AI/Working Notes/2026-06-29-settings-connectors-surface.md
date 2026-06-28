# 2026-06-29 Settings Connectors Surface

## Objective

Expose the top-level Settings `connectors` category as a CR-backed Xenesis external connectors surface instead of a placeholder.

## Implemented

- Added `renderConnectors` in `src/renderer/panes/SettingsPane.tsx`.
- Reads tool and messenger items from `xenesisConnectionsStatus.sections.tools.items` and `xenesisConnectionsStatus.sections.messengers.items`.
- Shows summary metrics for ready/planned connectors, tool connectors, OAuth drafts, setup plans, action policies, messenger views, messenger profile drafts, and channel setup plans.
- Reuses existing `renderXenesisConnectionItem` cards, so actions stay on existing CR request/open/readback builders.
- Added English/Korean copy for external tool and external messenger sections.

## Verification

- RED: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed 53/54 before messenger support because Settings `connectors` did not read messenger items.
- GREEN: `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed 54/54.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed and generated 779 nodes / 689 coverage path references.
- CR audit gap check: missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0.
- `npm run smoke:xenesis:natural-desk-routing` passed 186/186.
- Changed-file Biome check passed.
- `git diff --check` passed with line-ending warnings only.

## Safety

No OAuth login, MCP install execution, provider tool execution, messenger send, provider runtime change, credential write, token write, Action Inbox semantic change, or external-system mutation was added.
