# Xenesis MCP Tool Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the existing Xenesis recommended MCP server templates in the Connection Center and CR-readable connection status so users can copy concrete setup snippets for Fetch, Filesystem, GitHub, Notion, and Linear without pretending unsupported Google integrations are installed.

**Architecture:** Reuse `packages/xenesis/src/extensions/recommendedMcpServers.ts` as the source of truth. Enrich `XenesisConnectionItem` with a compact `mcpTemplate` read model containing transport, required env, default tools, and copy-ready JSON/TOML snippets. Keep `xd.xenesis.connections.status` as the only read path and render template details in Settings.

**Tech Stack:** TypeScript shared models, Node `tsx --test`, React SettingsPane, CSS.

---

### Task 1: Shared MCP Template Contract

**Files:**
- Modify: `src/shared/xenesisConnections.ts`
- Test: `src/shared/xenesisConnections.test.ts`

- [x] **Step 1: Write failing tests**

Assert Notion exposes an `mcpTemplate` with server name, required env, package command, JSON snippet, and Codex TOML snippet. Assert Google Calendar remains planned with no template.

- [x] **Step 2: Run RED**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: FAIL until the template contract exists.

- [x] **Step 3: Implement shared contract**

Import the recommended MCP server catalog and map supported tool cards to copy-safe template summaries.

- [x] **Step 4: Run GREEN**

Run: `npx tsx --test src\shared\xenesisConnections.test.ts`
Expected: PASS.

### Task 2: Settings UI Template Display

**Files:**
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/styles.css`

- [x] **Step 1: Render template metadata**

Show server name, transport, required env/default tools, and config snippets on tool connection cards.

- [x] **Step 2: Verify focused formatting**

Run Biome on touched UI/shared files.

### Task 3: Docs And Verification

**Files:**
- Modify: `docs/manual/09-onboarding-connections.md`
- Modify: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-27-xenesis-connection-center.md`
- Modify: `handoff.md`

- [x] **Step 1: Update docs**

Document that recommended MCP tool cards now include copy-ready templates and that Google tools remain planned.

- [x] **Step 2: Verify**

Run targeted tests, typecheck, CR audit, build, and a live Connection Center smoke.

- [x] **Step 3: Commit**

Commit with message `feat: add xenesis mcp tool templates`.
