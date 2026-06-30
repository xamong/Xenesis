# Provider Smoke Gateway Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `packages/xenesis` provider smoke authenticate its own gateway `/run` and `/run/stream` checks so the provider verification gate is not blocked by the gateway bearer-token requirement.

**Architecture:** The gateway already requires auth for non-public routes and can read a token through `--auth-token-env`. Provider smoke should create a local smoke token, pass it to the spawned gateway process through a dedicated env var, launch the gateway with `--auth-token-env`, and use the same token in `Authorization: Bearer ...` headers for `/run` and `/run/stream`.

**Tech Stack:** Node ESM scripts, `node:test`, `spawnSync`, Xenesis gateway CLI.

---

### Task 1: Add RED Smoke Regression Test

**Files:**
- Create: `packages/xenesis/scripts/provider-smoke-gateway-auth.test.mjs`

- [ ] **Step 1: Write the failing test**

Create a node test that runs provider smoke with the deterministic `mock` provider and a temporary `XENESIS_HOME`, then expects gateway run and stream checks to pass:

```js
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(scriptDir);
const providerSmokeScript = join(scriptDir, "provider-smoke.mjs");

test("provider smoke authenticates gateway run checks", () => {
  const xenesisHome = mkdtempSync(join(tmpdir(), "xenesis-provider-smoke-"));
  const result = spawnSync(process.execPath, [providerSmokeScript], {
    cwd: packageRoot,
    env: {
      ...process.env,
      XENESIS_PROVIDER: "mock",
      XENESIS_MODEL: "mock-model",
      XENESIS_HOME: xenesisHome
    },
    encoding: "utf8",
    timeout: 120000
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  try {
    assert.equal(result.status, 0, output);
    assert.match(output, /provider-smoke: gateway-run ok/);
    assert.match(output, /provider-smoke: gateway-stream ok/);
  } finally {
    rmSync(xenesisHome, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm --prefix packages/xenesis run build
node --test packages/xenesis/scripts/provider-smoke-gateway-auth.test.mjs
```

Expected: FAIL because current provider smoke posts to `/run` without gateway auth and receives `Unauthorized`.

### Task 2: Authenticate Provider Smoke Gateway Calls

**Files:**
- Modify: `packages/xenesis/scripts/provider-smoke.mjs`

- [ ] **Step 1: Add a dedicated smoke token**

Add:

```js
const gatewayTokenEnv = "XENESIS_PROVIDER_SMOKE_GATEWAY_TOKEN";
const gatewayToken = process.env[gatewayTokenEnv] || `provider-smoke-${reportId}`;
```

- [ ] **Step 2: Launch gateway with token env**

Add `--auth-token-env gatewayTokenEnv` to the spawned gateway args and pass the env object:

```js
env: {
  ...process.env,
  [gatewayTokenEnv]: gatewayToken
}
```

- [ ] **Step 3: Send bearer auth on gateway fetches**

Add `authorization: \`Bearer ${gatewayToken}\`` to `/run` and `/run/stream` request headers.

- [ ] **Step 4: Run RED test again**

Run:

```bash
node --test packages/xenesis/scripts/provider-smoke-gateway-auth.test.mjs
```

Expected: PASS.

### Task 3: Verify Provider Package

**Files:**
- Modify: `handoff.md`
- Create: `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-provider-smoke-gateway-auth.md`

- [ ] **Step 1: Run provider smoke with mock**

Run:

```bash
$env:XENESIS_PROVIDER = "mock"
npm --prefix packages/xenesis run provider:smoke
```

Expected: PASS 6/6.

- [ ] **Step 2: Run package tests and typecheck**

Run:

```bash
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run root typecheck and hygiene**

Run:

```bash
npm run typecheck
git diff --check
```

Expected: PASS.
