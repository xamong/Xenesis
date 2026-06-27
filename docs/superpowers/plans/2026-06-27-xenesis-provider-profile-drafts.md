# Xenesis Provider Profile Drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Desk-native, CR-first provider profile draft surface so AI provider setup can be reviewed from Xenesis Desk before any provider setting mutation or secret storage is attempted.

**Architecture:** Extend the provider Connection Center card with `providerProfileDraft` metadata derived from the active provider setup and routing models. Register `xd.xenesis.providers.profileDrafts.status/open/request`; the request path records a local Action Inbox review item and never changes provider settings, model settings, fallback chains, credentials, or local CLI selection.

**Tech Stack:** TypeScript, Node test runner via `npx tsx --test`, Electron main-process CR adapter, React SettingsPane, Biome, Capability Registry audit.

---

### Task 1: Shared Provider Profile Draft Model And Renderer Helpers

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/xenesisConnections.test.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.ts`
- Modify: `src/renderer/panes/xenesisConnectionCenter.test.ts`

- [x] **Step 1: Write failing shared tests**

Add tests that expect provider cards to expose `providerProfileDraft` with:
- `draftStatus`
- `actionInboxKind: "xenesis-provider-profile-draft"`
- profile fields for provider, model, auth mode, credential, endpoint, runtime profile, fallback policy, and local CLI boundary
- missing required fields when a keyed provider has no API key or model
- guardrails for approval mode, provider retries, fallback policy, and local CLI boundary
- read paths including `xd.xenesis.providers.profileDrafts.status`
- control paths including `xd.xenesis.providers.profileDrafts.open` and `xd.xenesis.providers.profileDrafts.request`
- blocked actions for changing provider/model/fallbacks, storing credentials, switching local CLI, and running provider prompts
- safety boundaries stating that provider profile drafts are review-only and never return secret values.

Use concrete assertions:
- `codex-app-server` is ready with credential state `not-required`.
- `openai` with an empty API key reports `missing-required-field` and includes `apiKey` in `missingRequiredFields`.

- [x] **Step 2: Write failing renderer helper tests**

Add tests for:
- `formatXenesisProviderProfileDraftSummary(draft)`
- `buildXenesisProviderProfileDraftRequest(item)`

Expected request path:

```ts
{
  path: 'xd.xenesis.providers.profileDrafts.request',
  args: { provider: item.providerProfileDraft.provider },
  source: 'xenesis',
  approved: true,
}
```

- [x] **Step 3: Verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: fail because `providerProfileDraft`, formatter, and request builder do not exist.

Actual: failed as expected with missing `providerProfileDraft` metadata and missing renderer helper exports.

- [x] **Step 4: Implement minimal shared model**

Add exported types for:
- `XenesisConnectionProviderProfileDraftStatus`
- `XenesisConnectionProviderProfileDraftFieldValueState`
- `XenesisConnectionProviderProfileDraftField`
- `XenesisConnectionProviderProfileDraftGuardrails`
- `XenesisConnectionProviderProfileDraftTemplate`

Attach `providerProfileDraft` to the provider card using existing provider setup and routing metadata. Keep values as field states and env names only; do not include API keys, bridge tokens, request payloads, or provider output.

- [x] **Step 5: Implement renderer helpers**

Add formatter and request builder in `xenesisConnectionCenter.ts`, and re-export types through `src/shared/types.ts`.

- [x] **Step 6: Verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts
```

Expected: all tests pass.

Actual: passed with 64/64 tests.

### Task 2: CR Registration, Main Adapter, Settings UI, And Agent Hint

**Files:**
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `src/shared/xenesisConnectionCapabilities.test.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
- Modify: `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.test.ts`

- [x] **Step 1: Write failing CR tests**

Add a test that expects:
- `xd.xenesis.providers.profileDrafts.status` as read/never
- `xd.xenesis.providers.profileDrafts.open` as control/never, required `["provider"]`
- `xd.xenesis.providers.profileDrafts.request` as write/when-external, required `["provider"]`
- dispatch to `getXenesisProviderProfileDraftsStatus`, `openXenesisProviderProfileDraft`, and `requestXenesisProviderProfileDraft`

- [x] **Step 2: Write failing Agent hint test**

Expect the Desk-control prompt hint to list the three new CR paths and state that provider profile drafts are review-only and do not mutate provider settings, store credentials, switch local CLI, or run provider prompts.

- [x] **Step 3: Verify RED**

Run:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: fail because paths and hint do not exist.

Actual: failed as expected on missing provider profile draft CR registration and missing Agent prompt-hint paths.

- [x] **Step 4: Implement CR schemas and dispatch**

Add provider draft-style schemas and dispatch branches under `xd.xenesis.providers.profileDrafts`.

- [x] **Step 5: Implement main-process handlers**

Add:
- `getXenesisProviderProfileDraftsStatus`
- `openXenesisProviderProfileDraft`
- `requestXenesisProviderProfileDraft`

The request handler must call `recordMcpActionInboxRequest` with kind `xenesis-provider-profile-draft`, approval session key `xenesis-provider-profile-draft:<provider>`, and a description containing field states, missing required fields, guardrails, diagnostics, blocked actions, and safety boundaries only.

- [x] **Step 6: Render Settings card**

Render a section with `data-xenesis-provider-profile-draft="<provider>"`, summary, fields, missing fields, guardrails, read/control paths, diagnostics, blocked actions, and safety boundaries. Add a request button.

- [x] **Step 7: Verify GREEN**

Run:

```powershell
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
```

Expected: all focused tests pass.

Actual: passed with 110/110 focused tests.

### Task 3: Documentation, Audit, Live Verification, Commit

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document that provider profile drafts are review-only policy surfaces. They do not mutate provider selection, model selection, fallback chains, credentials, local CLI selection, or run provider prompts.

- [x] **Step 2: Run verification**

Run:

```powershell
npx biome format --write <touched TS/TSX files>
npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts
npx biome check <touched TS/TSX files> --max-diagnostics 80
npm run typecheck
npm --prefix packages/xenesis run typecheck
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run build
npm run docs:capabilities:audit
npm run build
npm run check:public-release
```

Expected: public-release may keep failing only for the known `.github/workflows/ci.yml` gap; scoped touched-file Biome should have no errors.

Actual:
- `npx biome format --write ...` formatted 13 files and fixed 1 file.
- Focused `npx tsx --test ...` passed with 110/110 tests after implementation and again after import organization.
- `npx biome check ... --max-diagnostics 80` exited 0 after safe import organization; existing warnings/infos remain in `src/main/index.ts` and `src/shared/deskBridgeCapabilities.ts`.
- `npm run typecheck` passed.
- `npm --prefix packages/xenesis run typecheck` passed.
- `npm --prefix packages/xenesis test` passed with 79 files / 367 tests.
- `npm --prefix packages/xenesis run build` passed.
- `npm run docs:capabilities:audit` passed. Counters: registered nodes 750, callable methods 456, subscribable events 54, coverage path references 689, dispatcher paths 436, missing registered paths 0, missing dispatched coverage paths 0, undispatched static callable methods 0, dispatcher paths missing from tree 0. Generated `docs/capability-registry-audit.md` was removed after recording.
- `npm run build` passed.
- `npm run check:public-release` failed only for the known missing `.github/workflows/ci.yml` gap.

- [x] **Step 3: Live smoke**

Use Electron `_electron.launch` to verify:
- direct `xd.xenesis.providers.profileDrafts.status` for `codex-app-server` returns a ready draft
- direct `xd.xenesis.providers.profileDrafts.status` for `openai` with missing credentials returns `missing-required-field` in a controlled fixture or test
- approved `xd.xenesis.providers.profileDrafts.request` for the active provider creates Action Inbox key `xenesis-provider-profile-draft:<provider>`
- Settings DOM has `[data-xenesis-provider-profile-draft="<provider>"]`
- Agent-pane CR prompt for status returns `Desk action completed`

Actual: package-root `_electron.launch({ args: ['.'] })` smoke passed for active provider `auto`: direct status returned `ready`, request created `xenesis-provider-profile-draft:auto`, open rendered `[data-xenesis-provider-profile-draft="auto"]`, and Agent-pane fenced CR prompt matched `Desk action completed`. The first attempted smoke using `out/main/index.js` directly failed because `app.getAppPath()` did not point at the repo root and extension commands were empty; package-root launch matched the actual app path and registered 37 extension commands including Xenesis Agent.

- [x] **Step 4: Commit**

Stage touched files and force-add this ignored plan file:

```powershell
git add <touched files>
git add -f docs/superpowers/plans/2026-06-27-xenesis-provider-profile-drafts.md
git commit -m "feat: add xenesis provider profile drafts"
```
