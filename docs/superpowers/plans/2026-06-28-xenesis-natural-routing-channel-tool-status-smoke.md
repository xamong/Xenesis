# Xenesis Natural Routing Channel And Tool Status Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Broaden the repeatable natural Desk routing live smoke to cover the remaining OpenClaw/Hermes external tool and channel catalog status surfaces.

**Architecture:** Add smoke cases only for existing deterministic natural-language catalog routes. The prompts use aggregate catalog wording that the current planner already requires, and the live smoke continues to verify Agent-pane submission through CR paths.

**Tech Stack:** Node script tests through `tsx`, Playwright Electron live smoke through `npm run smoke:xenesis:natural-desk-routing`, Biome, root TypeScript typecheck.

---

### Task 1: RED Prompt Catalog Expectations

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`

- [x] **Step 1: Add expected prompt cases**

Add these prompt cases to `NATURAL_DESK_ROUTING_LIVE_SMOKE_PROMPTS` expectations:

```js
{
  id: 'tool-mcp-install-drafts-status',
  prompt: '외부 툴 MCP 설치 초안 전체 상태 보여줘',
  expectedPath: 'xd.xenesis.tools.mcpInstallDrafts.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'tool-action-policy-status',
  prompt: '외부 툴 action policy catalog 상태 보여줘',
  expectedPath: 'xd.xenesis.tools.actions.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'channel-safety-status',
  prompt: '외부 채널 safety catalog 상태 보여줘',
  expectedPath: 'xd.xenesis.channels.safety.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'channel-access-groups-status',
  prompt: '외부 채널 access groups catalog 상태 보여줘',
  expectedPath: 'xd.xenesis.channels.accessGroups.status',
  expectedVisibleText: 'Desk action completed',
}
```

```js
{
  id: 'channel-pairing-status',
  prompt: '외부 채널 pairing catalog 상태 보여줘',
  expectedPath: 'xd.xenesis.channels.pairing.status',
  expectedVisibleText: 'Desk action completed',
}
```

Also add plan text assertions for each prompt and each path.

- [x] **Step 2: Run test to verify RED**

Run:

```powershell
npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: FAIL because the live smoke script still exports the older prompt catalog.

### Task 2: Implement Live Smoke Prompt Catalog

**Files:**
- Modify: `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`

- [x] **Step 1: Add the same five prompt cases**

Add the exact same five prompt cases in the matching order as the test.

- [x] **Step 2: Run focused GREEN**

Run:

```powershell
npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs
```

Expected: PASS.

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

Expected: live smoke passes all checks, typecheck exits 0, and diff check exits 0 with at most LF-to-CRLF warnings.

- [x] **Step 3: Update docs and commit**

Record exact verification results in `handoff.md` and the Obsidian working note, mark this plan checklist complete, then commit:

```powershell
git add scripts\xenesisNaturalDeskRoutingLiveSmoke.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs "docs\obsidian\Xenesis-desk\80_AI\Working Notes\2026-06-27-openclaw-hermes-batched-gap-map.md"
git add -f docs\superpowers\plans\2026-06-28-xenesis-natural-routing-channel-tool-status-smoke.md
git commit -m "test: smoke xenesis channel tool status routing"
```
