# Provider Desk MCP Prompt Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a repeatable provider-package smoke proving natural Desk-control prompts reach the provider with Desk CR MCP discovery/call instructions, without reintroducing deterministic natural-language routing.

**Architecture:** Build the package, instantiate `CodexCliProvider` with a fake CLI runner, configure Desk MCP through `XENIS_MCP_STATE_FILE` and `XENIS_MCP_SERVER_PATH`, submit a Korean natural Desk-control prompt, and assert the provider stdin includes the prompt plus CR MCP tool guidance. The smoke does not call Desk actions or route natural language itself.

**Tech Stack:** Node ESM scripts, `node:test`, Xenesis provider package.

---

### Task 1: Add RED Script Test

**Files:**
- Create: `packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a node test that runs the new package script:

```js
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptDir);

test('provider Desk MCP prompt smoke proves natural prompt reaches provider with CR tools', () => {
  const result = spawnSync('npm', ['run', 'provider:desk-mcp-prompt-smoke', '--silent'], {
    cwd: packageRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 120000,
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  assert.equal(result.status, 0, output);
  const report = JSON.parse(result.stdout.trim());
  assert.equal(report.ok, true);
  assert.equal(report.summary.failed, 0);
  assert(report.checks.some((check) => check.id === 'stdin-natural-prompt' && check.ok));
  assert(report.checks.some((check) => check.id === 'stdin-cr-mcp-tools' && check.ok));
  assert(report.checks.some((check) => check.id === 'metadata-mcp-configured' && check.ok));
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
node --test packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.test.mjs
```

Expected: FAIL because `provider:desk-mcp-prompt-smoke` does not exist yet.

### Task 2: Implement Provider Prompt Smoke

**Files:**
- Create: `packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.mjs`
- Modify: `packages/xenesis/package.json`

- [ ] **Step 1: Add package script**

Add:

```json
"provider:desk-mcp-prompt-smoke": "npm run build && node scripts/provider-desk-mcp-prompt-smoke.mjs"
```

- [ ] **Step 2: Add smoke implementation**

The script should import `CodexCliProvider` from `../dist/providers/cliProvider.js`, run it with a fake runner, and check:

- stdin contains the Korean natural prompt.
- stdin contains `xenesis_dev.xenesis_desk_capabilities`, `xenesis_dev.xenesis_desk_capability`, and `xenesis_dev.xenesis_desk_call_capability`.
- stdin does not contain `Capability family intent catalog:` or `xenesis-desk-action`.
- captured args configure the `xenesis_dev` MCP server.
- response metadata has `cli.xenesisDeskMcpConfigured === true`.

- [ ] **Step 3: Run GREEN**

Run:

```bash
node --test packages/xenesis/scripts/provider-desk-mcp-prompt-smoke.test.mjs
```

Expected: PASS.

### Task 3: Verify Package And Repo

**Files:**
- Modify: `handoff.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-provider-desk-mcp-prompt-smoke.md`

- [ ] **Step 1: Run smoke directly**

Run:

```bash
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
```

Expected: JSON report with `ok: true`.

- [ ] **Step 2: Run package and root checks**

Run:

```bash
npm --prefix packages/xenesis run typecheck
npm --prefix packages/xenesis test
npm run typecheck
```

Expected: PASS.
