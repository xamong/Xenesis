# Provider Desk Natural Intent Catalog Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the unused provider-package deterministic Desk natural intent catalog so natural Desk control is handled by provider reasoning through CR discovery/call tools, not by a bundled intent table.

**Architecture:** Keep `deskMcpSystemMessage` as a short CR/MCP usage contract that tells providers to discover `xd.*` paths on demand. Delete the standalone `deskNaturalIntentCatalog.ts` file and its public barrel export. Add a source guard in the existing provider MCP prompt test so the catalog cannot be reintroduced unnoticed.

**Tech Stack:** TypeScript, Vitest, Node `fs` source guards, Xenesis provider package.

---

### Task 1: Add Provider Catalog Removal Guard

**Files:**
- Modify: `packages/xenesis/src/providers/cliProvider.deskMcp.test.ts`

- [ ] **Step 1: Write the failing test**

Add Node source reads and a test that requires the provider package to not ship or export `deskNaturalIntentCatalog.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { deskMcpSystemMessage } from "./cliProvider.js";

const providersDir = dirname(fileURLToPath(import.meta.url));

describe("deskMcpSystemMessage lean", () => {
  it("does not ship or export a deterministic Desk natural intent catalog", () => {
    expect(existsSync(join(providersDir, "deskNaturalIntentCatalog.ts"))).toBe(false);
    expect(readFileSync(join(providersDir, "index.ts"), "utf8")).not.toContain("deskNaturalIntentCatalog");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts
```

Expected: FAIL because `packages/xenesis/src/providers/deskNaturalIntentCatalog.ts` still exists and `providers/index.ts` still exports it.

### Task 2: Remove Catalog Implementation And Export

**Files:**
- Delete: `packages/xenesis/src/providers/deskNaturalIntentCatalog.ts`
- Modify: `packages/xenesis/src/providers/index.ts`

- [ ] **Step 1: Delete the unused catalog file**

Remove `packages/xenesis/src/providers/deskNaturalIntentCatalog.ts`.

- [ ] **Step 2: Remove the barrel export**

Delete this line from `packages/xenesis/src/providers/index.ts`:

```ts
export * from "./deskNaturalIntentCatalog.js";
```

- [ ] **Step 3: Run focused test to verify it passes**

Run:

```bash
npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts
```

Expected: PASS.

### Task 3: Verify Package And Repo Signals

**Files:**
- Modify: `handoff.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-provider-desk-natural-intent-catalog-removal.md`

- [ ] **Step 1: Run package typecheck**

Run:

```bash
npm --prefix packages/xenesis run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run root typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run CR audit**

Run:

```bash
npm run docs:capabilities:audit
```

Expected: PASS and CR audit counters remain 0.

- [ ] **Step 4: Run source guard scan**

Run:

```bash
rg -n "deskNaturalIntentCatalog|DESK_NATURAL_INTENT|formatDeskNaturalIntentCatalog|Capability family intent catalog|sampleUserRequests" packages/xenesis/src src scripts package.json
```

Expected: no matches except the guarding test if included intentionally in the scan scope.
