# Xenesis Natural Routing Aggregate Open Status Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broaden the repeatable natural Desk routing live smoke from focused guide/story/status coverage into a wider provider, external tool, and external messenger aggregate open/status coverage set.

**Architecture:** Add smoke cases only for existing deterministic natural-language planner routes that are already covered by `xenesisAgentDeskControl.test.ts`. This is a smoke-script/test-only slice: no planner, CR schema, dispatcher, provider runtime, OAuth/install execution, messenger delivery, or approval behavior changes.

**Tech Stack:** Node `tsx` tests, Playwright Electron live smoke through `npm run smoke:xenesis:natural-desk-routing`, Biome, root TypeScript typecheck.

---

### Task 1: RED Prompt Catalog Expectations

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

- [x] **Step 1: Add provider aggregate prompt expectations**

Add these prompt cases to the expected `NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS` array near existing provider prompts:

```js
{
  id: 'provider-routing-catalog-open',
  prompt: 'AI provider routing 전체 열어줘',
  expectedPath: 'xd.xenesis.providers.routing.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'provider-view-catalog-open',
  prompt: 'AI provider view 전체 열어줘',
  expectedPath: 'xd.xenesis.providers.views.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'provider-setup-status',
  prompt: 'AI provider setup 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.providers.setup.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'provider-routing-status',
  prompt: 'AI provider routing 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.providers.routing.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'provider-view-status',
  prompt: 'AI provider view 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.providers.views.status',
  expectedVisibleText: 'Desk action completed',
}
```

- [x] **Step 2: Add tool aggregate prompt expectations**

Add these prompt cases near existing external tool prompts:

```js
{
  id: 'tool-connectors-status',
  prompt: '외부 툴 connector 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.tools.connectors.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-setup-catalog-open',
  prompt: '외부 툴 setup 전체 열어줘',
  expectedPath: 'xd.xenesis.tools.setup.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-setup-status',
  prompt: '외부 툴 setup 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.tools.setup.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-view-catalog-open',
  prompt: '외부 툴 view 전체 열어줘',
  expectedPath: 'xd.xenesis.tools.views.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-view-status',
  prompt: '외부 툴 view 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.tools.views.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-mcp-install-drafts-open',
  prompt: '외부 툴 MCP 설치 초안 전체 열어줘',
  expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-action-policy-open',
  prompt: '외부 툴 액션 정책 전체 열어줘',
  expectedPath: 'xd.xenesis.tools.actions.open',
  expectedVisibleText: 'Desk action completed',
}
```

- [x] **Step 3: Add messenger/channel aggregate prompt expectations**

Add these prompt cases near existing channel/messenger prompts:

```js
{
  id: 'channel-routing-catalog-open',
  prompt: '외부 메신저 라우팅 전체 열어줘',
  expectedPath: 'xd.xenesis.channels.routing.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'channel-safety-catalog-open',
  prompt: '외부 메신저 안전 전체 열어줘',
  expectedPath: 'xd.xenesis.channels.safety.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'channel-access-groups-catalog-open',
  prompt: '외부 메신저 접근 그룹 전체 열어줘',
  expectedPath: 'xd.xenesis.channels.accessGroups.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'channel-pairing-catalog-open',
  prompt: '외부 메신저 페어링 전체 열어줘',
  expectedPath: 'xd.xenesis.channels.pairing.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'messenger-view-catalog-open',
  prompt: '외부 메신저 view 전체 열어줘',
  expectedPath: 'xd.xenesis.messengers.views.open',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'messenger-view-status',
  prompt: '외부 메신저 setup 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.messengers.views.status',
  expectedVisibleText: 'Desk action completed',
}
```

Also add plan text assertions for every added prompt and expected path.

- [x] **Step 4: Run test to verify RED**

Run:

```powershell
npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: FAIL because the live smoke script still exports the older 23-prompt catalog while the test expects the expanded 41-prompt catalog.

### Task 2: Implement Live Smoke Prompt Catalog

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`

- [x] **Step 1: Add the same eighteen prompt cases**

Add the exact same provider, tool, channel, and messenger prompt cases in the same order as the test expectation.

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

Expected: live smoke passes 123/123 checks, typecheck exits 0, and diff check exits 0 with at most LF-to-CRLF warnings.

- [x] **Step 3: Update docs and commit**

Record exact verification results in `handoff.md` and the Obsidian working note, mark this plan checklist complete, then commit:

```powershell
git add scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs "docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f docs\superpowers\plans\2026-06-28-xenesis-natural-routing-aggregate-open-status-smoke.md
git commit -m "test: smoke xenesis aggregate routing surfaces"
```
