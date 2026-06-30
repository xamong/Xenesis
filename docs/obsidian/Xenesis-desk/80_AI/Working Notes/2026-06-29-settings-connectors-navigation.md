# 2026-06-29 Settings Connectors Navigation

## Objective

Make the Settings `connectors` surface directly reachable from the Settings sidebar now that it renders CR-backed external connector cards.

## Implemented

- Added `src/renderer/panes/settingsCatalog.test.mjs`.
- Required `connectors` to be in `VISIBLE_SETTINGS_CATEGORIES`.
- Moved `connectors` next to `external-apps` in `src/renderer/panes/settingsCatalog.mjs`.
- Removed `hiddenInSettingsPane: true` from the `connectors` category.
- Updated English/Korean category descriptions to describe external tool and messenger connections.

## Verification

- RED: `node --test src\renderer\panes\settingsCatalog.test.mjs` failed 0/1 while `connectors.hiddenInSettingsPane` was still `true`.
- GREEN: `node --test src\renderer\panes\settingsCatalog.test.mjs` passed 1/1.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed 54/54.
- `npm run typecheck` passed.
- Changed-file Biome check passed.
- `npm run docs:capabilities:audit` passed and generated 779 nodes / 689 coverage path references.
- CR audit gap check: missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0.
- `npm run smoke:xenesis:natural-desk-routing` passed 186/186.
- `git diff --check` passed with line-ending warnings only.

## Safety

No CR schemas, connection action builders, provider runtime selection, OAuth flow, MCP install execution, messenger delivery, credential writes, token writes, or external-system mutations changed.
