# Plugin MCP Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the non-package Plugin/MCP/Docs parity slice from the sibling `xenesis-desk` repo without editing `packages/xenesis`.

**Architecture:** Add XCON/SKETCH plugin assets under `providers/xenesis/plugins/xcon-sketch`, package them as provider assets, and let the provider integration installer copy/enable them in the user's Xenesis home. Extend the Desk MCP prompt registry with a `workbench-response` profile and bring the sibling Playwright worker input-action behavior under focused tests.

**Tech Stack:** Node ESM, `node:test`, Electron builder package resources, Desk MCP prompt files, provider integration installer.

---

## Scope

- Do not edit `packages/xenesis`.
- Do not wholesale copy public docs into root docs if they contain local paths.
- Keep plugin MCP access through the existing Desk MCP server.
- Keep validation optional for inline Workbench responses; validate/save only on explicit artifact persistence requests.

## Files

- Create: `providers/xenesis/plugins/xcon-sketch/xenesis.plugin.json`
- Create: `providers/xenesis/plugins/xcon-sketch/skills/xcon-sketch/SKILL.md`
- Create: `mcp/prompts/17-workbench-natural-xcon-response.md`
- Create: `mcp/playwright-worker-input-actions.test.mjs`
- Create: `mcp/playwright-worker-source.test.mjs`
- Modify: `mcp/prompts/README.md`
- Modify: `mcp/xenesis-desk-mcp-server.mjs`
- Modify: `mcp/playwright-worker.mjs`
- Modify: `package.json`
- Modify: `scripts/publicReleaseCheck.mjs`
- Modify: `src/main/providerIntegrationInstaller.mjs`
- Modify: `src/main/providerIntegrationInstaller.d.mts`
- Modify: `src/main/providerIntegrationInstaller.test.mjs`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/panes/settingsCatalog.test.mjs`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `providers/shared/skills/xd/SKILL.md.template`
- Modify: `handoff.md`

---

### Task 1: Record Slice Start

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Add a new top-level handoff entry**

Add an entry headed `2026-07-01 Plugin MCP Docs Port` with the current objective, files to touch, commands run, known gaps, and next intended step.

- [ ] **Step 2: Verify no placeholder text**

Run this placeholder scan with the pattern provided by the repository agent:

```powershell
rg -n $env:XENESIS_PLACEHOLDER_SCAN docs/superpowers/plans/2026-07-01-plugin-mcp-docs.md
```

Expected: no matches.

---

### Task 2: Add RED Tests

**Files:**
- Create: `mcp/playwright-worker-input-actions.test.mjs`
- Create: `mcp/playwright-worker-source.test.mjs`
- Modify: `src/main/providerIntegrationInstaller.test.mjs`

- [ ] **Step 1: Add worker action tests**

Create the sibling-derived worker tests that exercise `data:` URL support, coordinate click/type/key/drag actions, navigation actions, action screenshot output, and final URL/title result fields.

- [ ] **Step 2: Add provider installer tests**

Add tests proving:

```js
assert.match(renderXenesisDeskSkill(), /workbench-response/);
assert.equal(typeof installer.installXenesisNativePlugins, 'function');
```

and a temp-dir install test that verifies `xenesis.plugin.json` token replacement and `plugins.json` enabled state.

- [ ] **Step 3: Run focused RED tests**

Run:

```powershell
node --test mcp/playwright-worker-source.test.mjs mcp/playwright-worker-input-actions.test.mjs src/main/providerIntegrationInstaller.test.mjs
```

Expected before implementation: failure on missing worker action support and missing `installXenesisNativePlugins`.

---

### Task 3: Port Plugin Assets And Installer

**Files:**
- Create: `providers/xenesis/plugins/xcon-sketch/xenesis.plugin.json`
- Create: `providers/xenesis/plugins/xcon-sketch/skills/xcon-sketch/SKILL.md`
- Modify: `src/main/providerIntegrationInstaller.mjs`
- Modify: `src/main/providerIntegrationInstaller.d.mts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/panes/settingsCatalog.test.mjs`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `providers/shared/skills/xd/SKILL.md.template`
- Modify: `package.json`
- Modify: `scripts/publicReleaseCheck.mjs`

- [ ] **Step 1: Add plugin assets**

Add the `xcon-sketch` plugin manifest with `{{XENESIS_DESK_MCP_SERVER}}` and `{{XENIS_HOME}}` tokens, plus the skill file that tells providers to fetch MCP prompts before generating XCON/SKETCH.

- [ ] **Step 2: Add installer model**

Add `XENESIS_NATIVE_PLUGIN_ITEMS`, `resolveXenesisNativePluginPlan`, manifest token replacement, `writeEnabledPluginState`, and `installXenesisNativePlugins`. Extend `getProviderIntegrationStatus` with a `xenesis` section containing `assetAvailable`, `rootConfigured`, `pluginsInstalled`, and per-item `enabled`.

- [ ] **Step 3: Wire main/preload/settings install surface**

Add `installXenesisPlugins()` to the preload API, main IPC handler, shared types, and SettingsPane local CLI integration section. Add i18n keys for the status card and install result messages.

- [ ] **Step 4: Package plugin resources**

Add `providers/xenesis/plugins/xcon-sketch` to `build.extraResources` as `provider-assets/xenesis/plugins/xcon-sketch`, excluding cache, bytecode, and test files.

- [ ] **Step 5: Guard public release packaging**

Update `scripts/publicReleaseCheck.mjs` so provider assets must include the XCON/SKETCH plugin in packaged releases and must still exclude generated or test files.

- [ ] **Step 6: Run provider installer tests**

Run:

```powershell
node --test src/main/providerIntegrationInstaller.test.mjs
```

Expected: all tests pass.

---

### Task 4: Port Workbench MCP Prompt

**Files:**
- Create: `mcp/prompts/17-workbench-natural-xcon-response.md`
- Modify: `mcp/prompts/README.md`
- Modify: `mcp/xenesis-desk-mcp-server.mjs`

- [ ] **Step 1: Add prompt file**

Add `17-workbench-natural-xcon-response.md` from the sibling source. Keep the inline-only validation policy and explicit persistence policy.

- [ ] **Step 2: Register prompt resource and template**

Add `workbench-natural-xcon-response` to `promptFiles`, add `xcon.workbench-response` to `promptTemplates`, add `workbench-response` to the `kind` enum, and map it in `promptFilesForKind`.

- [ ] **Step 3: Adjust output rule**

Change the assembled prompt output rule so inline chat and Workbench responses do not instruct providers to validate/save unless the user explicitly asks for saving, exporting, opening, or validating.

- [ ] **Step 4: Run MCP prompt smoke**

Run:

```powershell
@'
import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['mcp/xenesis-desk-mcp-server.mjs'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
let out = '';
child.stdout.on('data', chunk => {
  out += String(chunk);
  if (out.includes('"id":2')) child.kill();
});
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'xenesis_desk_get_xcon_prompt', arguments: { kind: 'workbench-response', brief: 'compare agents' } } }) + '\n');
child.on('close', () => {
  if (!out.includes('Workbench Natural XCON Response')) process.exit(1);
  if (!out.includes('do not call validation tools')) process.exit(1);
  console.log('workbench-response prompt smoke passed');
});
'@ | node
```

Expected: `workbench-response prompt smoke passed`.

---

### Task 5: Port Playwright Worker Actions

**Files:**
- Modify: `mcp/playwright-worker.mjs`

- [ ] **Step 1: Add URL support**

Allow `data:` URLs and `about:blank`; keep `allowedHosts` limited to `http:` and `https:` URLs.

- [ ] **Step 2: Add coordinate and keyboard actions**

Add helpers for normalized points, drag points, mouse button normalization, bounded integer parsing, hotkey arrays, and actions for coordinate `click`, `move`, `mouseDown`, `mouseUp`, `dragAndDrop`, `type`, `keyDown`, `keyUp`, `hotkey`, `scroll`, `navigate`, `goBack`, and `goForward`.

- [ ] **Step 3: Return final page metadata**

Include `finalUrl: page.url()` and `title: await page.title().catch(() => '')` in `runActions`.

- [ ] **Step 4: Run focused worker tests**

Run:

```powershell
node --test mcp/playwright-worker-source.test.mjs mcp/playwright-worker-input-actions.test.mjs
```

Expected: all tests pass.

---

### Task 6: Verify Slice

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test mcp/playwright-worker-source.test.mjs mcp/playwright-worker-input-actions.test.mjs src/main/providerIntegrationInstaller.test.mjs
```

Expected: all tests pass.

- [ ] **Step 2: Run docs/public checks**

Run:

```powershell
npm run check:docs-public
npm run check:public-release
```

Expected: both pass.

- [ ] **Step 3: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: TypeScript exits with code 0.

- [ ] **Step 4: Update handoff**

Record touched files, exact command outcomes, known gaps, and next intended step.

- [ ] **Step 5: Commit and update PR**

Run:

```powershell
git status --short
git add handoff.md docs/superpowers/plans/2026-07-01-plugin-mcp-docs.md providers/xenesis/plugins/xcon-sketch providers/shared/skills/xd/SKILL.md.template mcp/prompts/17-workbench-natural-xcon-response.md mcp/prompts/README.md mcp/xenesis-desk-mcp-server.mjs mcp/playwright-worker.mjs mcp/playwright-worker-input-actions.test.mjs mcp/playwright-worker-source.test.mjs src/main/providerIntegrationInstaller.mjs src/main/providerIntegrationInstaller.d.mts src/main/providerIntegrationInstaller.test.mjs src/main/index.ts src/preload/index.ts src/shared/types.ts src/renderer/panes/SettingsPane.tsx src/renderer/panes/settingsCatalog.test.mjs src/renderer/i18n/en.ts src/renderer/i18n/ko.ts scripts/publicReleaseCheck.mjs package.json
git commit -m "Port Plugin MCP docs assets"
git push origin mini
gh pr view 13 --web
```

Expected: commit succeeds, push updates `origin/mini`, and existing PR #13 contains the new commit.

---

## Self Review

- Spec coverage: plugin assets, MCP prompt/test, provider installer packaging, docs/public checks, and Playwright worker input action parity are covered.
- Hard exclusion: no task edits `packages/xenesis`.
- Placeholder scan: this file must produce no matches for the placeholder command in Task 1.
