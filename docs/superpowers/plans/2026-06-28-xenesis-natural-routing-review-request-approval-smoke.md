# Xenesis Natural Routing Review Request Approval Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broaden the repeatable natural Desk routing live smoke to prove review/request natural prompts stop at the Agent-pane approval card instead of silently executing setup, OAuth, install, provider, or messenger mutations.

**Architecture:** Add smoke cases only for existing deterministic natural-language request routes that are already covered by `xenesisAgentDeskControl.test.ts`. These smoke cases expect the CR request path and the visible `Desk action approval required` approval-card text; they do not click approval and therefore do not create Action Inbox records or mutate settings.

**Tech Stack:** Node `tsx` tests, Playwright Electron live smoke through `npm run smoke:xenesis:natural-desk-routing`, Biome, root TypeScript typecheck.

---

### Task 1: RED Request Prompt Expectations

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

- [x] **Step 1: Add review/request prompt cases**

Add these prompt cases to the expected `NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS` array near the matching provider/tool/channel surfaces:

```js
{
  id: 'connection-setup-request-approval',
  prompt: '노션 연결해줘',
  expectedPath: 'xd.xenesis.connections.setupRequests.request',
  expectedVisibleText: 'Desk action approval required',
}
```

```js
{
  id: 'tool-mcp-install-draft-request-approval',
  prompt: '노션 MCP 설치해줘',
  expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.request',
  expectedVisibleText: 'Desk action approval required',
}
```

```js
{
  id: 'tool-install-plan-request-approval',
  prompt: '노션 설치 계획 검토 요청해줘',
  expectedPath: 'xd.xenesis.tools.installPlans.request',
  expectedVisibleText: 'Desk action approval required',
}
```

```js
{
  id: 'tool-oauth-draft-request-approval',
  prompt: '구글 캘린더 OAuth 인증해줘',
  expectedPath: 'xd.xenesis.tools.oauthDrafts.request',
  expectedVisibleText: 'Desk action approval required',
}
```

```js
{
  id: 'tool-action-policy-request-approval',
  prompt: '리니어 액션 정책 검토 요청해줘',
  expectedPath: 'xd.xenesis.tools.actions.request',
  expectedVisibleText: 'Desk action approval required',
}
```

```js
{
  id: 'channel-profile-draft-request-approval',
  prompt: '텔레그램 채널 프로필 검토 요청해줘',
  expectedPath: 'xd.xenesis.channels.profileDrafts.request',
  expectedVisibleText: 'Desk action approval required',
}
```

```js
{
  id: 'provider-profile-draft-request-approval',
  prompt: 'AI provider 설정해줘',
  expectedPath: 'xd.xenesis.providers.profileDrafts.request',
  expectedVisibleText: 'Desk action approval required',
}
```

Also add plan text assertions for every added prompt and expected path. Add an assertion that the plan includes `Desk action approval required` so the approval-card expectation is explicit.

- [x] **Step 2: Run test to verify RED**

Run:

```powershell
npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: FAIL because the live smoke script still exports the older 41-prompt catalog while the test expects the expanded 48-prompt request approval catalog.

### Task 2: Implement Live Smoke Prompt Catalog

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`

- [x] **Step 1: Add the same seven request prompt cases**

Add the exact same seven prompt cases in the same order as the test expectation.

- [x] **Step 2: Run focused GREEN**

Run:

```powershell
npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: PASS with 4/4 tests.

### Task 3: Verify, Document, Commit

**Files:**
- Modify: `handoff.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-openclaw-hermes-batched-gap-map.md`

- [x] **Step 1: Format/check scripts**

Run:

```powershell
npx biome format --write scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
npx biome check scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs --max-diagnostics 80
```

Expected: focused test passes 4/4, Biome exits 0.

- [x] **Step 2: Run live smoke and broader checks**

Run:

```powershell
npm run smoke:xenesis:natural-desk-routing
npm run typecheck
git diff --check
```

Expected: live smoke passes 144/144 checks, typecheck exits 0, and diff check exits 0 with at most LF-to-CRLF warnings.

- [x] **Step 3: Update docs and commit**

Record exact verification results in `handoff.md` and the Obsidian working note, mark this plan checklist complete, then commit:

```powershell
git add scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs "docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f docs\superpowers\plans\2026-06-28-xenesis-natural-routing-review-request-approval-smoke.md
git commit -m "test: smoke xenesis review request approvals"
```
