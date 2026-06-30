# Natural Settings Category Routing

## Objective

Route visible Settings category prompts such as `AI 모델 설정 열어줘`, `외부 앱 설정 열어줘`, `Connectors 설정 열어줘`, and `작업공간 설정 열어줘` through CR `xd.panes.settings.open` with concrete category args.

## Implementation

- Moved Settings category metadata into `src/shared/xenesisSettingsCatalog.mjs`.
- Kept `src/renderer/panes/settingsCatalog.mjs` as a compatibility re-export for existing Settings UI imports.
- Added Settings category natural aliases to the shared catalog.
- Generated `XENESIS_NATURAL_SETTINGS_CATEGORY_TARGETS` from `VISIBLE_SETTINGS_CATEGORIES`.
- Added `deskSettingsCategoryOpenPlanFromNaturalText` after Connection Center/provider/tool routing and before generic Settings open routing.
- Kept `워크스페이스` owned by the Google Workspace tool target; app workspace Settings uses `작업공간` aliases to avoid routing ambiguity.

## Verification

- `node --test src\renderer\panes\settingsCatalog.test.mjs` passed 2/2.
- `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed 6/6.
- `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts` passed 45/45.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed and regenerated `docs/capability-registry-audit.md`.
- CR audit summary: missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0.
- `npm run smoke:xenesis:natural-desk-routing` passed 198/198.
- Changed-file `npx biome check ... --max-diagnostics 80` passed.
- `git diff --check` passed; Git only reported existing LF/CRLF normalization warnings.

## Safety

- No OAuth, MCP install, external messenger send, external tool mutation, workspace mutation, or provider runtime behavior was changed.
- Specialized Connection Center routes remain higher priority than Settings category routing.
