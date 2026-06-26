# Xenesis Desk Agent/CR Handoff

Updated: 2026-06-26

This handoff follows the documentation contract in the backup workspace
`E:\xenesis-desk-backup\AGENTS.md` (Documentation section): create/update root
`handoff.md` before the first code edit and after each material design decision,
code change, failed/passed verification, or known-gap finding. Each entry records
current objective, touched files, commands run, exact verification result, known
gaps, and the next intended step. A handoff update is NOT completion evidence;
completion still needs tests / CR audit / live smoke.

---

## 2026-06-26 - Obsidian vault disappearance investigation and restore

### Current objective

Investigate why the Xenesis Desk Obsidian notes disappeared and restore the
vault notes from surviving repo-local graph design and implementation plan
artifacts.

### Evidence gathered

- `C:\Users\great\Documents\Obsidian Vault` currently contains only
  `.obsidian`; `Xenesis-desk.md` and the `Xenesis-desk` note folder are absent.
- `docs/obsidian` does not exist in the repo before restore.
- Windows Recycle Bin search did not find the missing Xenesis Obsidian notes.
- Repo-wide and targeted filesystem searches did not find original
  `Xenesis-desk.md`, `module-capability-registry.md`, `Graph Schema.md`, or
  related restored note names.
- Remaining recovery sources are
  `docs/superpowers/specs/2026-06-26-obsidian-knowledge-graph-design.md`,
  `docs/superpowers/plans/2026-06-26-obsidian-knowledge-graph.md`, and this
  `handoff.md`.

### Restore plan

- Recreate the external Obsidian vault notes under
  `C:\Users\great\Documents\Obsidian Vault`.
- Create a repo-local durable mirror under `docs/obsidian` so the vault can be
  restored again if the external Obsidian folder is emptied.
- Update `AGENTS.md` so agents read the repo-local mirror first and treat the
  external vault as the Obsidian app mirror.

### Restore result

- Added `scripts/restore-obsidian-vault.ps1`.
- Recreated the repo-local durable mirror at `docs/obsidian`.
- Recreated the external Obsidian app mirror at
  `C:\Users\great\Documents\Obsidian Vault`.
- Updated `AGENTS.md` to read `docs/obsidian/Xenesis-desk.md` first and treat
  the external vault as a regenerable convenience mirror.
- Fixed the restore script's frontmatter newline normalization after verification
  found literal `` `n`` sequences in generated YAML.

### Exact verification result

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\restore-obsidian-vault.ps1`
  wrote 65 Markdown files per target.
- `docs/obsidian`: exists, 65 Markdown files, `Xenesis-desk.md` exists,
  `Xenesis-desk` folder exists.
- `C:\Users\great\Documents\Obsidian Vault`: exists, 65 Markdown files,
  `Xenesis-desk.md` exists, `Xenesis-desk` folder exists.
- Relative Markdown path comparison between the repo mirror and external mirror:
  no differences.
- SHA256 content comparison between matching repo/external Markdown files:
  no differences.
- Placeholder/escape scan for `` `n``, `TBD`, `TODO`, `fill in`, and
  `placeholder`: no matches.
- Required note scan for `type:`, `repo: xenesis-desk`,
  `last_reviewed: 2026-06-26`, and `## Graph Links`: no missing rows.

### Known gaps

- The original deleted files are not recoverable byte-for-byte from disk.
- The restore is reconstructed from the approved graph design, implementation
  plan, and recorded handoff evidence.

---

## 2026-06-26 - Codex agent-provider wiring + repeated sandbox-setup investigation

### Current objective

Make the Desk Agent reason via **Codex** according to the user's provider
setting (not a hardcoded default), and stop the abnormal repeated
`codex-windows-sandbox-setup`. Plan agreed with user: **A then B**.

- **A.** Fix the provider-setting wiring so the active `~/.xenis` profile's
  provider actually flows to the agent runtime; live-verify in the real Electron
  app that the agent reasons via codex (currently it falls back to
  `openai/gpt-4o`).
- **B.** Verify the persistent `codex app-server --stdio` path starts and accepts
  a turn with the user's ChatGPT-login codex (no `OPENAI_API_KEY`). If it does,
  preferring `codex-app-server` eliminates the repeated sandbox-setup at the root.

### Background analysis (verified this session)

**1) Why `codex-windows-sandbox-setup` repeats — structural, not a bug.**
- Target `src/main/index.ts` has NO timer-spawned codex (spawn calls are for
  pty / worker / internal-server / xamong only).
- Preflight runner uses `codex --version` (cliProvider.ts:352); localCli probe
  uses `codex --version` (localCliAgents.mjs:170). Neither launches a sandbox.
- The setup is codex's own per-process Windows sandbox init, triggered by every
  one-shot `codex exec`. It repeated because live smoke tests invoked
  `--provider=codex` once per run/turn. The user's `~/.codex/config.toml` has
  `[windows] sandbox = "elevated"`, making each setup heavier.
- Target provider already mitigates: `--sandbox read-only` (overrides elevated)
  + `--skip-git-repo-check` (cliProvider.ts:2186), and re-applies
  `-c sandbox=...` on `codex exec resume` (cliProvider.ts:645-656).

**2) Backup's "codex call + reduced latency" — already present in target.**
- Diffed `packages/xenesis/src/providers/cliProvider.ts` backup vs target
  (CR/whitespace-normalized): **functionally identical**. Only real difference is
  one attachment-summary import/use (`userContentWithAttachmentSummary` from
  `./multimodal.js`).
- The persistent `codex app-server --stdio` path (`CodexAppServerProvider`,
  thread/start, turn/start) is **line-for-line identical** in both (754 vs 757).
- Backup-only codex files in `src/main`: `agentArtifactProviderExecutors.ts` +
  `agentArtifactAutomation.ts`. Reading the former: it is a **stateless one-shot**
  artifact-benchmark generator (`codex exec --skip-git-repo-check --sandbox
  read-only -`, generates xcon-sketch markdown). No persistence/caching — NOT a
  latency mechanism the target lacks.

**3) The real latency lever (confirmed by backup AGENTS.md + handoff).**
- `E:\xenesis-desk-backup\AGENTS.md` Provider Policy (lines 60-66): *"Non-BYOK
  Codex runtime should use `codex-app-server` first so Desk Agent turns reuse a
  persistent `codex app-server --stdio` process/thread. `codex-cli` is the
  one-shot fallback path when app-server startup fails or is explicitly
  selected."*
- `E:\xenesis-desk-backup\handoff.md` evidence: line 882-883 "after 60s the run
  fell back from `codex app-server --stdio` to `codex exec`"; line 4559-4561
  `codex-app-server` -> `persistentSession=true`,
  `processModel="persistent-process"` (sandbox once); line 5015-5016 codex-cli
  -> `processModel="process-per-turn"`, `persistentSession=false` (sandbox each
  turn = the repeated setup).
- Conclusion: latency reduction = **use `codex-app-server` (persistent-process)**
  instead of falling back to `codex-cli` (process-per-turn). The backup proves
  app-server runs with **non-BYOK ChatGPT-login codex**
  (`persistentSession=true`, `transport="app-server"`), contradicting the
  earlier-session assumption that app-server needs `OPENAI_API_KEY`. That
  "Missing credentials OPENAI_API_KEY" was the **openai provider**, since the
  agent was resolving to `openai/gpt-4o`. -> Earlier change defaulting
  `codex-app-server` -> `codex-cli` is suspect and must be re-validated in B.

### Touched files (uncommitted, from earlier in this effort)

Provider-setting unification (hermes/openclaw model: single `aiProvider.provider`
source, `'auto'` credential-scan default, no silent override, codex selectable,
localCli kept orthogonal):
- `src/main/xenesisService.mjs` - `buildXenesisProviderRuntimeOptions` reads
  `aiProvider.provider`; added `resolveAutoProvider(env)` (scans
  `~/.codex/auth.json` -> codex-cli, `~/.claude/.credentials.json` -> claude-cli,
  then env keys); keyed provider no longer silently falls back to codex.
- `src/shared/types.ts` - `AiProviderKind` += `'auto'`, codex/claude kinds.
- `src/main/index.ts` - `AI_PROVIDER_KINDS` set; `DEFAULT_AI_PROVIDER_SETTINGS`
  `provider:'auto', model:''`.
- `src/renderer/App.tsx`, `src/renderer/panes/SettingsPane.tsx`,
  `src/renderer/extensions/.../XamongCodeChatPane.tsx` - provider lists +
  `'auto'`, default provider `'auto'`.
- `packages/xenesis-agent-core/src/embeddedRuntime.ts` - `deskProviderNames` +=
  `codex-app-server`, `claude-interactive`.

### Commands run / evidence

- `diff --strip-trailing-cr -b` backup vs target cliProvider.ts -> only the
  attachment-summary delta.
- Grep confirmed: target has NO `agentArtifactProviderExecutors.ts`; backup has
  it + `agentArtifactAutomation.ts`. Target has `xenesisService.mjs` +
  `providerIntegrationInstaller.mjs` (different architecture).
- Process check: 0 codex/electron/sandbox processes live now (residual node
  processes are unrelated, started 06-10..06-25).
- Launched background workflow `codex-provider-wiring-probe`
  (run `wf_1d04587a-142`) to map exact `~/.xenis` settings + runtime
  resolution chain + build pipeline + resolver logic, with adversarial verify,
  before the expensive Electron launch.

### Known gaps / boundaries

- Live app still resolves agent to `openai/gpt-4o` (verify dumps showed
  "프로바이더 openai", "Missing credentials OPENAI_API_KEY"). Root cause to pin:
  active `~/.xenis` profile's `settings.provider` not set to codex/auto AND/OR
  build not picking up uncommitted edits. (Workflow in progress.)
- Whether the running Electron (launched via playwright
  `_electron.launch({args:['.'], NODE_ENV:'production'})`) executes the
  uncommitted TS/MJS edits or needs a build first — unconfirmed (workflow).
- Whether `codex app-server --stdio` works with the user's ChatGPT-login codex
  (no API key) in THIS target — to be tested in B.
- Target previously had NO `AGENTS.md` / `handoff.md` / `CLAUDE.md`. NOW CREATED
  in the target working folder per user direction:
  - `AGENTS.md` - operating contract adapted from backup; verification gates
    corrected to THIS repo's real scripts (root `typecheck`/`lint`/`build`,
    `npm --prefix packages/xenesis test|typecheck|run build|run provider:smoke`,
    `docs:capabilities:audit`, `check:public-release`). Marked KNOWN INFRA GAP:
    backup's `crDevBridge*` live smoke harness + generated audit docs are NOT in
    this repo; live verification is via ad-hoc Playwright `_electron.launch`.
  - `handoff.md` - this file.
  - Target verification infra confirmed present: CR tools (`desk_call_capability`
    in 8 src files), vitest tests, biome lint, capabilityCoverageAudit.mjs.
    Confirmed MISSING: `docs/capability-registry-audit.md`,
    `docs/xenesis-agent-cr-mapping-audit.md`, `scripts/crDevBridgeSmoke.mjs`,
    `scripts/mcpBridge.test.mjs`.

### Next intended step

1. Consume workflow `wf_1d04587a-142` results (settings field to edit, build
   commands needed, clobber risks, confirm signals).
2. Plan A: set the correct `~/.xenis` field (active profile
   `settings.provider`) to the user's choice ('auto' or 'codex-cli'), rebuild if
   required, launch Electron, drive a Desk-control prompt, confirm the footer
   provider + work-log show codex (not openai).
3. Plan B: validate persistent `codex app-server --stdio` with ChatGPT-login;
   if viable, prefer `codex-app-server` to remove repeated sandbox-setup.
4. Decide AGENTS.md port scope with the user.

### Update - workflow wf_1d04587a-142 results (adversarially verified)

- `C:/Users/great/.xenis/settings.json` active profile = "default";
  BOTH top-level `aiProvider.provider` AND active profile `settings.provider`
  are ALREADY `"auto"`. model/apiKey/baseUrl empty.
- Resolver: `buildXenesisProviderRuntimeOptions` reads `aiProvider.provider`;
  `"auto"` -> `resolveAutoProvider` scans `~/.codex/auth.json` FIRST ->
  returns `codex-cli` (no API key needed). Mock fully removed; keyed providers
  never silently overridden. So `auto` -> `codex-cli` on this machine.
- BUILD: `out/main/index.js` (Electron main entry) is CURRENT, not stale.
  Verified directly: `resolveAutoProvider` (2 hits) + codex auth.json scan
  (4 hits) are compiled in; out/ mtime 06-25 23:59 > src 23:51/23:53. The
  haiku "build pipeline" agent's "stale, rebuild needed" was WRONG — it
  conflated `packages/xenesis/dist` (standalone lib, NOT on the embedded
  resolver path) with `out/` (the Electron app). NO rebuild needed for provider
  selection.
- Renderer does NOT clobber: `providerRuntime` appears in the renderer only at
  `xenesisAgentStatusBar.ts:103-104` to DISPLAY `status.providerRuntime.provider`
  (footer '프로바이더') — it does NOT send a per-run provider override. The
  `provider:'openai', model:'gpt-4o'` at `XamongCodeChatPane.tsx:377-385` is the
  DEFAULT_AI of the separate XamongCode external api-server chat (127.0.0.1:3337),
  NOT the embedded Xenesis Agent run path.
- Therefore the earlier live "프로바이더 openai / 모델 gpt-4o" was a STALE result
  from before the provider-setting changes (old `DEFAULT_AI_PROVIDER_SETTINGS`
  was `openai/gpt-4o`). Current state should already resolve to codex-cli.
- DECISION: keep `'auto'` (user's stated preference; already set; resolves to
  codex-cli here). The verifier recommended explicit `'codex-cli'` for
  determinism (auto is fragile if an API-key env var appears), noted as an
  option. No settings edit + no rebuild strictly required — proceed straight to
  live verification.
- CONFIRM SIGNALS for the live run: footer '프로바이더' = `codex-cli` (not
  openai/mock/unknown); transcript shows literal
  `codex exec --skip-git-repo-check --sandbox read-only -`. NOTE: the string
  `codex-windows-sandbox-setup` does NOT exist in this codebase (0 hits) — it is
  codex's own per-process Windows sandbox init, expected once per one-shot
  `codex exec`; do not treat a single occurrence as abnormal.

### Next intended step (revised)

Run ONE controlled live verification (not a loop, to avoid repeated codex
sandbox-setup the user flagged): launch the real Electron app, read the footer
provider (expect codex-cli), send one natural-language Desk-control prompt,
wait for the codex turn, capture screenshots + transcript, confirm codex
actually executed. Then report; if confirmed, move to Plan B (app-server).

### RESULT - Plan A CONFIRMED (2026-06-26, live Electron run)

Evidence: scratchpad `lc-poll-04.png` (~80s into the run).
- Prompt sent: "이 작업 폴더가 어떤 프로젝트인지 한국어 한 문장으로만 알려줘."
- Agent answer (real codex reasoning, not an error):
  "이 작업 폴더는 Xenesis Desk의 공개 릴리스 계열 데스크톱/에이전트 제어
  프로젝트입니다." -> correct project description.
- Footer: 프로바이더 = `codex-cli` (shown "프로바이더 c..."), 모델 = `default`
  (empty model, NOT gpt-4o), 작업시간 ~1m, status Working/streaming.
- No "Missing credentials" / no gateway_error. Work log: tool_policy_snapshot
  INFO + RUNNING Run. ARTIFACT PROVIDER selector independently = "Codex CLI".
- CONCLUSION: with settings `provider:"auto"` -> resolveAutoProvider ->
  `codex-cli`, the embedded Desk Agent reasons via REAL codex (one-shot
  `codex exec`). The provider-setting wiring works end-to-end. No mock, no
  hardcode, no openai fallback.

### WHY `codex-windows-sandbox-setup` keeps appearing (definitive)

- The active provider resolves to `codex-cli` = the ONE-SHOT path =
  `processModel=process-per-turn`. Each agent turn spawns a fresh `codex exec`
  process, and codex runs its own Windows sandbox init per process. The user's
  `~/.codex/config.toml` has `[windows] sandbox = "elevated"`, so each setup is
  heavy/visible. `--sandbox read-only` overrides the mode but codex still
  initializes a sandbox per process.
- So: every prompt / every live test launch = one `codex exec` = one
  sandbox-setup. The repeated appearances were each live-verify run, not a leak
  or a loop. (All electron/codex processes killed after; 0 remain.)
- THE FIX = Plan B: use `codex-app-server` (persistent `codex app-server
  --stdio`, `processModel=persistent-process`) so the sandbox is set up ONCE and
  the process/thread is reused across turns. This is exactly the backup
  AGENTS.md Provider Policy. Alternative/auxiliary: change the codex config so
  the Windows sandbox setup is lighter (the elevated mode is the heavy part).

### Next intended step (revised again)

Plan B: validate `codex app-server --stdio` starts and accepts a turn with the
user's ChatGPT-login codex (no API key). If viable, make `codex-app-server` the
preferred non-BYOK codex runtime so repeated sandbox-setup stops. Validate
WITHOUT repeatedly launching one-shot codex (use a single app-server probe), to
respect the user's "stop the repeated sandbox setup" concern.

### RESULT - Plan B app-server VALIDATED + wired (2026-06-26)

Standalone probe (scratchpad/appserver-probe.js, ONE `codex app-server --stdio`
spawn, NDJSON JSON-RPC: initialize -> initialized -> thread/start -> turn/start):
- initialize OK at 196ms; userAgent `xenesis/0.142.1`, codexHome
  `C:\Users\great\.codex` -> authenticated via ChatGPT login, NO OPENAI_API_KEY
  (the env var was explicitly deleted in the probe). `rpcError: none`,
  `stderr: none`.
- thread/start OK ~5.6s (thread id + session jsonl; `modelProvider:"openai"` =
  codex's internal model via the ChatGPT subscription, NOT an API key).
  turn/start ACK OK. No "Missing credentials".
- KEY TIMING: the ~5.6s startup gap (initialize 196ms -> thread 5619ms) is where
  the one-time Windows sandbox setup + codex MCP-server startup happen. On a
  PERSISTENT app-server this is paid ONCE; later turns reuse the thread (only
  turn/start) with NO repeated sandbox-setup. This is the documented latency win.
- CONCLUSION: codex-app-server works with the user's non-BYOK ChatGPT login. The
  earlier-session "codex-app-server needs OPENAI_API_KEY" was a MISDIAGNOSIS
  (that error was the openai provider).

Wiring change (TDD):
- Added `src/main/xenesisService.test.mjs` (node:test): auto + Codex login ->
  `codex-app-server`; explicit codex-cli respected; explicit codex-app-server
  passthrough; keyed provider not silently switched. Ran RED (1 fail / 3 pass).
- Changed `src/main/xenesisService.mjs` resolveAutoProvider ~line 285: codex
  auth.json present -> return `'codex-app-server'` (was `'codex-cli'`).
  CodexAppServerProvider auto-falls-back to one-shot codex-cli if app-server
  startup fails, so this is safe.
- Re-ran test GREEN (4/4).
- `node --test src/main/xenesisService.test.mjs` -> 4 pass.

Build note / KNOWN GAP:
- `npm run build` (= `tsc --noEmit` + electron-vite build) FAILS at the typecheck
  step on a PRE-EXISTING, unrelated error:
  `packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts(10,46): TS2352`
  — the test literal cast to `DeskEmbeddedPromptResult` is missing a now-required
  `surface` property. That test file is NOT modified by me (git shows only
  `embeddedRuntime.ts` M, and my edit there only adds provider names to
  `deskProviderNames`, unrelated to `EmbeddedPromptResult.surface`). It is a
  test-only file (not bundled into the app) from the in-progress merge.
- To make the resolver change live without touching unrelated merge code, built
  the app via `npx electron-vite build` directly (esbuild transpile, no
  typecheck). out/main/index.js is regenerated with the codex-app-server
  resolver. (The typecheck gap is left for the merge owner to resolve.)

### Next intended step (Plan B confirmation)

After the electron-vite build completes: ONE controlled Electron run with TWO
sequential prompts in the SAME session, to prove (a) the agent now reasons via
`codex-app-server` (footer 프로바이더 = codex-app-server), and (b) sandbox-setup
happens on the FIRST turn only, not the second (persistent reuse). That is the
user's actual goal: codex agent + CR with no repeated sandbox-setup.

### Update - electron-vite build OK + scope expansion (2026-06-26)

- `npx electron-vite build` succeeded (✓ 16.20s). out/main/index.js now contains
  `auth.json"))) return "codex-app-server"` -> resolver change is LIVE.
- User raised the bar for the live test: not a 2-prompt smoke, but a LONGER
  session proving the agent can CONTROL both Xenesis Desk features (CR) AND agent
  features via natural language, reasoning through codex-app-server.
- User also asked for a full analysis of the XENESIS AGENT PROMPT structure,
  compared across 4 reference repos:
  - MAIN  = E:/test_git/xenesis-desk-main/xenesis-desk-main (hardening overlay)
  - XDESK = E:/xenesis-desk (another checkout)
  - BACKUP= E:/xenesis-desk-backup (agent-upgrade workspace)
  - FINAL = E:/xenesis-final/xenesis-desk (public-release base)
  All 5 (incl. TARGET) share packages/xenesis/src/core/prompt/{index,
  PromptComposer, PromptSectionRegistry, Section13PromptPack, PromptCacheBoundary,
  ExternalContentPolicy, PromptAudit}.ts plus the provider prompt layer in
  cliProvider.ts (deskMcpSystemMessage, providerVisibleOutputContractMessage,
  providerTurnMessages, formatDeskNaturalIntentCatalogForPrompt).
- TWO background workflows launched:
  - wf w5l29t2jb: design the natural-language Desk-control + agent-feature test
    plan (one persistent codex-app-server session).
  - wf wjmrr1z5i: map + cross-repo diff the agent prompt architecture, assess
    whether TARGET's prompt is complete/correct for the final+main lineage.

### Next intended step

Consume both workflow results. Then: (a) build a single-session Playwright
driver from the test plan (launch once, drive the NL control scenarios, handle
inline approval cards, capture per-scenario evidence) and run it ONCE; (b)
report the agent-prompt structure + divergence findings, flag any prompt gap in
the target.

### RESULT - live control session turn 1 (2026-06-26) + new problem found

Ran the 12-turn control driver (scratchpad/control-session.js). Stopped after
turn 1 (user flagged sandbox-setup again). Turn 1 findings:
- GOOD: footer shows 프로바이더 = `codex-app-server`, 모델 = `default`,
  런타임 = Embedded. The `auto -> codex-app-server` wiring IS live in the real
  app; the persistent app-server spawned.
- PROBLEM 1: turn 1 ran 2m30s and HIT the 150s driver timeout while still
  "Working". okRowsDelta = 0 -> ZERO successful Desk CR tool calls. The agent's
  visible text said it was "로컬 설정 파일을 먼저 보고 있습니다" (reading local
  config files first) -> it was using codex's NATIVE file/shell exploration, NOT
  the Desk CR MCP tools (xd.*). So it neither controlled Desk nor finished.
- PROBLEM 2 (user's question "또 뜬다 sandbox setup; 한번 설치하면 되나?"):
  `codex-windows-sandbox-setup` is codex CLI's OWN Windows sandbox prep, driven
  by the user's `~/.codex/config.toml` `[windows] sandbox = "elevated"`. It is
  NOT a Xenesis component and NOT a one-time install — codex re-runs it whenever
  it executes a command in its (elevated) sandbox. It repeats now because the
  agent keeps issuing native sandboxed file/shell commands (Problem 1) instead
  of CR MCP calls. With app-server it should be ~once; native-command churn
  re-triggers it.

The earlier prompt-analysis workflow (wf wjmrr1z5i) FAILED (StructuredOutput
schema too complex). Relaunched a simpler, focused investigation:
- wf w2s913gl0 (flat schemas): (1) does the system prompt instruct CR-tool usage
  for codex-app-server; (2) is the Desk MCP bridge actually wired/connected for a
  codex-app-server run (the crux of native-vs-CR); (3) codex sandbox config +
  lighter options; (4) light cross-repo prompt diff (target vs MAIN/BACKUP/FINAL)
  to flag missing CR-usage hardening.

User direction: investigate BOTH (CR-wiring root cause AND codex sandbox config),
report cause + fix proposals, apply fixes only after approval; redo the prompt
analysis first.

### Next intended step (revised)

Consume wf w2s913gl0. Report ranked root cause(s) for native-vs-CR + the
sandbox-setup link, with concrete fix proposals (mark codex-config vs repo-code),
and the target-vs-MAIN prompt gap. Get approval before editing.

### ROOT CAUSE CONFIRMED (2026-06-26, verified directly, not just via agents)

WHY the codex-app-server agent used native file tools (0 CR calls): an env var
NAME mismatch leaves the Desk MCP unconfigured for the EMBEDDED codex run.

- The embedded run's env sets `XENESIS_HOME` (createDeskEmbeddedEnv
  embeddedRuntime.ts:138 `XENESIS_HOME: input.xenesisHome`; xenesisService.mjs
  launchEnv:455 also `XENESIS_HOME`). It does NOT set `XENIS_HOME`,
  `XENIS_MCP_STATE_FILE`, or `XENIS_MCP_SERVER_PATH`.
- The codex provider's `resolveDeskMcpConfig` (cliProvider.ts:595-605) reads
  `XENIS_MCP_STATE_FILE` OR derives from `XENIS_HOME` (line 598, NO 'E'), and
  `XENIS_MCP_SERVER_PATH` (599). All three are unset on the embedded env ->
  config undefined -> codexAppServerArgs `{configured:false}` (756-761) ->
  `codexDeskMcpConfigured=false` (1610). That single flag = (a) NO
  `-c mcp_servers.xenesis_dev.*` spawned into `codex app-server --stdio` (agent
  has NO Desk CR tools) AND (b) `deskMcpSystemMessage` NOT injected
  (providerTurnMessages 831-833) -> no CR tools + no CR instruction -> native
  codex file/shell tools -> 0 CR calls in 2.5min + repeated sandbox-setup
  (native sandboxed commands).
- ALL the pieces already exist: `mcp/xenesis-desk-mcp-server.mjs` is present;
  `~/.xenis/mcp/bridge.json` IS written at runtime with the correct
  `serverPath: ...\mcp\xenesis-desk-mcp-server.mjs` + bridgeUrl + bridgeToken.
  `src/main/localCliAgents.mjs` applyMcpEnv (255-300) sets
  XENIS_MCP_SERVER_PATH + XENIS_MCP_STATE_FILE correctly for the localCli path.
  The EMBEDDED codex path simply never sets them (or the XENIS_HOME alias).
- Consistency note: cliProvider.ts:446, 1574, 1824 already read
  `env.XENESIS_HOME ?? env.XENIS_HOME`; only resolveDeskMcpConfig (597-605) reads
  `XENIS_HOME` alone. That is the gap.

Prompt gap: NONE. The CR-usage hardening (forbid native apply_patch/shell/file
writes; route through xenesis_desk_call_capability) EXISTS and is strong in
deskMcpSystemMessage (cliProvider.ts:787-806); it is just gated behind
deskMcpConfigured=true, so it never reached the model in the broken run.

FIX (proposed, pending approval):
- FIX #1 (core, xenesis pkg, cliProvider.ts:597-605): make resolveDeskMcpConfig
  accept `XENESIS_HOME` as a fallback for `XENIS_HOME` (both the stateFilePath
  derivation at 598 and xenisHome at 605), matching the 446/1574/1824 pattern.
  Since the embedded env already has XENESIS_HOME=~/.xenis and bridge.json
  already exists with serverPath, this alone flips configured -> true, spawns the
  Desk CR MCP tools, and injects the CR instruction. Fixes both codex-app-server
  and codex-cli fallback. VERIFIED to work in principle (bridge.json + server
  file already present).
- FIX #2 (optional, observability): log when codex-app-server is selected but
  configured=false.
- FIX #3 (optional, codex-config, user machine): lower [windows] sandbox from
  'elevated' to 'workspace-write' to cut per-process setup cost.
- FIX #4 (optional, prompt): always-on 'do not claim native-file success for
  Desk tasks' line in providerVisibleOutputContractMessage as a misconfig net.

### DEEP VERIFICATION (2026-06-26, "수정 전 더 확인") — caught a gotcha

Verified end-to-end before touching code:
- Bridge HTTP server: started at app init `startMcpBridgeServer()` (index.ts:18138),
  listens on port 3847 (MCP_BRIDGE_PORT). Up during agent runs.
- bridge.json: written by the app (index.ts:4836-4851) at
  `getMcpBridgeStateFilePath()` with bridgeUrl + bridgeToken + serverPath.
  Confirmed present at runtime: C:/Users/great/.xenis/mcp/bridge.json with
  serverPath = ...\mcp\xenesis-desk-mcp-server.mjs.
- MCP server file present: mcp/xenesis-desk-mcp-server.mjs.
- readServerPathFromBridgeState (cliProvider.ts:482) parses bridge.json.serverPath.
- XENESIS_CODEX_MCP_AUTO_CONFIG default = ON (resolveDeskMcpConfig only disables
  on the literal string 'false', cliProvider.ts:596).
- Embedded env flow: embeddedXenesisOptions (index.ts:14031) sets
  env:{...process.env, ...providerRuntime.env} (14050) + bridgeUrl/bridgeToken
  (14055-14056) + xenesisHome (14035). embeddedAgentRuntime.ts:231 passes
  this.options.env as baseEnv -> createDeskEmbeddedEnv (embeddedRuntime.ts:136)
  spreads baseEnv first, preserving anything added at 14050. So a value added to
  embeddedXenesisOptions.env REACHES the provider env.

GOTCHA CAUGHT (this is why Option A would have FAILED): `resolveXenesisStateHome`
(xenesisService.mjs:79) returns `path.join(xenisHome, 'xenesis')`, so
XENESIS_HOME = ~/.xenis/XENESIS (a 'xenesis' SUBDIR). But getMcpDir() (and thus
bridge.json) is ~/.xenis/mcp. So deriving the state file from XENESIS_HOME would
give ~/.xenis/xenesis/mcp/bridge.json — WRONG, does not exist. The original
FIX #1 (make resolveDeskMcpConfig accept XENESIS_HOME) would NOT work here.

CORRECTED FIX (single file, surgical): in embeddedXenesisOptions (index.ts:14050),
when mcpBridgeReady, add to the env object:
  XENIS_MCP_STATE_FILE: getMcpBridgeStateFilePath(),
  XENIS_MCP_SERVER_PATH: getMcpServerScriptPath(),
This uses the EXACT functions the app + localCli path already use (3655-3657),
so resolveDeskMcpConfig (cliProvider.ts:597-600) finds XENIS_MCP_STATE_FILE ->
serverPath from bridge.json -> configured=true -> codex app-server spawned WITH
the Desk CR MCP tools AND deskMcpSystemMessage injected. Fixes codex-app-server
and codex-cli fallback. Gated on mcpBridgeReady so it only applies when the
bridge is actually up.

### FIX APPLIED + new blocker found (2026-06-26)

Applied the corrected fix at index.ts embeddedXenesisOptions (~14049): when
mcpBridgeReady, env now sets `XENIS_MCP_STATE_FILE: getMcpBridgeStateFilePath()`
and `XENIS_MCP_SERVER_PATH: getMcpServerScriptPath()`. Built via electron-vite
(out/main/index.js contains XENIS_MCP_STATE_FILE x4). 

Live verify (scratchpad/cr-verify.js, single prompt "지금 데스크 상태랑 어떤
프로바이더로 동작 중인지 한 문장으로 알려줘"):
- provider = codex-app-server, nativeExploration = FALSE (the fix WORKED at the
  wiring level: the agent no longer falls back to native codex file exploration
  the way it did pre-fix). 
- BUT new failure: "Provider 'codex-app-server' stream idle for 60000ms" ->
  gateway_error. crToolCalls = 0. The run produced NO stream events for 60s.
- Source of the 60s: AgentRunner.ts:506 `STREAM_IDLE_MS = XENESIS_STREAM_IDLE_MS
  ?? 60000` — a watchdog that aborts a provider stream with no events for 60s.
- Interpretation: with Desk MCP now CONFIGURED, codex app-server produces no
  stream event for 60s (pre-fix it streamed native reasoning, so no idle). So
  codex is blocked BEFORE first output. Two candidate causes:
  1. Cold-start latency: app-server + the xenesis_dev MCP server (heavy imports:
     @xcon-viewer/core, playwright-worker) + codex's own CUA MCP servers + the
     now-injected large Desk system prompt (deskMcpSystemMessage + full
     formatDeskNaturalIntentCatalogForPrompt) push first-token > 60s.
     -> raising XENESIS_STREAM_IDLE_MS would let it complete.
  2. Approval/handshake hang: codexDeskMcpArgs sets
     `default_tools_approval_mode='approve'` + per-tool `approval_mode='approve'`
     (cliProvider.ts:688-691). If codex headless waits for an approval the
     app-server client never answers, it hangs forever (timeout-independent).
     Note: docs/codex-claude-mcp-skill-registration.md (100-118) shows the
     INTENDED manual config WITHOUT approval_mode/enabled_tools — the runtime
     adds them, so 'approve' may differ from codex's default and cause the wait.

DECISIVE EXPERIMENT (cheap, 1 launch): set XENESIS_STREAM_IDLE_MS=240000 via the
driver launch env and re-run the single prompt.
- If it COMPLETES with CR calls -> cause #1 (latency); fix = ship a higher
  codex+MCP idle default and/or speed MCP startup.
- If it still produces zero events for ~4min -> cause #2 (approval hang); fix =
  correct approval_mode / handle codex approval requests in the app-server client.

### DECISIVE EXPERIMENT RESULT — CR control WORKS (cause = cold-start latency)

Re-ran cr-verify.js with XENESIS_STREAM_IDLE_MS=240000. Result:
- Run COMPLETED (work-log row "Run completed" is-ok) after ~237s. provider =
  codex-app-server, nativeExploration = false, status Ready (no error).
- Agent answer: "파일 탐색기는 열려 있지만 현재 가리키는 경로는 비어
  있습니다." — this is the REAL Desk explorer state (currently 폴더 없음 / no
  folder selected). The agent could only know this via a CR read.
- Work log shows "3 events · 1 tools" => 1 Desk CR tool was actually invoked.
  (cr-verify's crToolCalls regex read 0 only because the summarized work-log row
  text is "Run completed"/"tool_policy_snapshot", not the raw tool name; the
  "1 tools" badge + the correct Desk-state answer confirm a real CR call.)
- Poll timeline: working=true with ZERO new stream events from t=0 to ~233s,
  then completed at ~237s. So codex app-server emitted no streaming delta for
  ~4min, then returned the full result at once.

CONCLUSION: the MCP env fix is CORRECT and the agent now reasons via
codex-app-server AND controls Desk through CR (real state readback, no native
file exploration). Root of the earlier failure = CAUSE #1: first-turn cold start
(Electron + app-server boot + the user's CUA/computer-use MCP servers + the
xenesis_dev MCP server heavy imports + the large injected Desk system prompt +
intent catalog + codex reasoning + CR round-trip) exceeds the default 60s
STREAM_IDLE_MS watchdog (AgentRunner.ts:506), which aborted the run before it
could finish. NOT an approval hang.

REMAINING WORK = performance/robustness, two parts:
- (a) Raise the stream-idle watchdog for codex+MCP so the cold-start turn is not
  killed at 60s. Options: set XENESIS_STREAM_IDLE_MS in the embedded env
  (index.ts:14049 area, alongside the MCP vars) to e.g. 180000-300000, or raise
  the AgentRunner default. Minimal change to make it reliably work.
- (b) Reduce the ~4min cold start (real UX problem). Candidates: warm up the
  app-server + MCP servers when the Agent pane opens (not on first prompt);
  scope codex to only the xenesis_dev MCP server for embedded runs so it does
  not also boot the user's CUA/computer-use servers each turn; or trim the
  injected intent-catalog size. Subsequent turns should already be faster (same
  persistent thread + already-started MCP servers) — needs confirming.

### (a) APPLIED + (b) cold-start analysis (2026-06-26)

(a) idle-watchdog raise: index.ts embeddedXenesisOptions env now sets
XENESIS_STREAM_IDLE_MS = process.env ?? '300000' when mcpBridgeReady. Built.

(b) cold-start root analysis (wf wyldyap7r). The ~4min is FIRST-TURN-ONLY (the
codex app-server process is cached in codexAppServerSessions cliProvider.ts:1571
and stays alive; 2nd same-session turn skips initialize/startThread/MCP boot).
Ranked contributors:
1. User ~/.codex/config.toml MCP servers (CUA/computer-use notify hook +
   cua_node) boot alongside xenesis_dev on process spawn. codex loads config.toml
   in FULL; the injected -c mcp_servers.xenesis_dev args MERGE (never replace),
   so all user servers also start. Biggest term. First-turn only.
2. Lazy initialize()+startThread() on first turn — no warmup
   (runAppServerTurn cliProvider.ts:1737/1742). First-turn only.
3. ~26KB system prompt (intent catalog ~24KB, deskNaturalIntentCatalog) injected
   every turn via providerTurnMessages. Small share; recurs each turn.
4. Stream-idle watchdog — already mitigated by the 300000 override; keep it.

Reduction options (keep CR working):
- WARMUP (repo-code, recommended, no user-config change): add
  scheduleCodexAppServerWarmup(~1500ms) in src/main/index.ts after
  scheduleTerminalWarmup (~18164), modeled on the terminalWarmup pattern
  (terminalWarmupScheduled + setTimeout().unref() + recordDiagnosticLog at
  index.ts:3705-3711). Background-runs initialize()+startThread() so the first
  user prompt only pays startTurn(). Front-loads the one-time cold start to app
  launch (invisible).
- MCP ISOLATION (repo-code, bigger win, needs codex-flag check): make embedded
  codex boot ONLY xenesis_dev (not the user's CUA servers). Either inject
  -c mcp_servers.<name>.enabled=false for known user servers, or a minimal
  config — but a minimal CODEX_HOME breaks auth (auth.json lives in the real
  CODEX_HOME), so this needs care/verification.
- PROMPT TRIM (repo-code): context-filter the intent catalog (~30-40% smaller).
  Helps every turn, small.
- CONFIG (user machine, optional): user disables CUA/computer-use in
  ~/.codex/config.toml — biggest single reducer but affects their standalone
  codex computer-use; their choice, not ours to set.

### REAL BOTTLENECK FOUND — reasoning effort, NOT cold start (2026-06-26)

2-turn test (two-turn.js) result OVERTURNED the cold-start theory:
- turn1 = 183s, turn2 = 179s -> speedup 1.0x. BOTH turns ~3min. So it is NOT a
  one-time cold start; it is a PER-TURN cost.
- Both turns made real CR calls with correct answers (turn1: full Desk status;
  turn2: "현재 열려 있는 브라우저 탭은 0개입니다"). firstWorkLogChange ~2.6s
  (run starts fast) but completion ~180s with no intermediate stream events.
- ROOT CAUSE: the user's ~/.codex/config.toml sets
  `model = "gpt-5.5"`, `model_reasoning_effort = "xhigh"`. Every codex turn does
  MAX reasoning even for a trivial CR status query -> ~180s/turn. Warmup / MCP
  isolation / persistent reuse do NOT help (the cost is per-turn generation, not
  startup). The cold-start analysis assumed turn 2 would be fast; the 2-turn test
  disproved it.

FIX APPLIED (index.ts embeddedXenesisOptions env, codex providers only): inject
`XENESIS_CODEX_APP_SERVER_ARGS = 'app-server --stdio -c model_reasoning_effort=medium'`
and `XENESIS_CODEX_CLI_ARGS = 'exec --skip-git-repo-check --sandbox read-only -c
model_reasoning_effort=medium -'` (both respect an explicit env override). This
overrides the effort to 'medium' for EMBEDDED Desk runs only (the user's
standalone codex keeps xhigh). Pure index.ts change -> electron-vite build (the
env is read by cliProvider at runtime; cliProvider is NOT bundled into out/main,
but it reads process.env which index.ts populates, so no package build needed).
Knob: set XENESIS_CODEX_APP_SERVER_ARGS / XENESIS_CODEX_CLI_ARGS to tune effort
(low = fastest, high = smartest).

Other (b) levers de-prioritized (still valid, smaller): warmup (front-loads the
small startup cost), MCP isolation (the user CUA servers boot once per process,
not per turn), prompt trim (26KB catalog, helps every turn a little).

### REASONING LADDER CONFIRMED — definitive (2026-06-26)

Single-prompt timing, changing ONLY model_reasoning_effort (same prompt, env
override via XENESIS_CODEX_APP_SERVER_ARGS, no rebuild between low/medium):
- xhigh (user default): ~180s, multi-line step narration.
- medium: 80s, 1-line narration.
- low: 52s, CLEAN final answer, NO narration ("데스크는 실행 중이고 창 1개가
  열려 있으며, 현재 프로바이더는 codex-app-server입니다."), 1 CR tool, correct.
=> Reasoning effort is DEFINITIVELY the dominant per-turn cost AND the cause of
the verbose step narration. Lower effort = faster + cleaner (better contract
adherence). Residual ~52s floor at low = codex model latency + CR round-trip +
26KB prompt; reducible later via prompt trim / faster model.

AUTO-MODE FEASIBILITY (grounded in code):
- The run request carries `mode` (chat/plan/work) — embeddedRuntime.ts:163
  (mode: input.request.mode || 'work'). This is a per-task complexity signal the
  user already sets in the pane.
- Per-run providerRuntime override exists (DeskProviderRuntimeOverride: provider/
  model/env, embeddedRuntime.ts:36-45) and merges into the run env, so effort is
  plumbable per request.
- There is NO deterministic pre-codex intent classifier (the intent catalog is
  injected INTO the codex prompt; codex routes). So content-based auto would need
  a new lightweight classifier; the clean approach is MODE-based.
- RECOMMENDED AUTO DESIGN: map agent mode -> effort. chat = low (fast/clean for
  simple status/control), plan = medium, work = high (thorough for complex
  multi-step). Wire in index.ts embeddedXenesisOptions: pick the effort in
  XENESIS_CODEX_APP_SERVER_ARGS/CLI_ARGS based on the run's mode (or a
  Settings/pane knob auto|low|medium|high defaulting to auto=mode-based).

Current shipped default (from prior edit): medium for all embedded codex runs.
Could switch to mode-based auto.

### AUTO MODE IMPLEMENTED — mode-based Codex reasoning effort (2026-06-26)

User approved mode-based auto reasoning. Also wants the intermediate reasoning
process SHOWN to the user (currently it streams then gets replaced by the final
answer) — DEFERRED to a later UI/UX discussion (user: "일단 auto로 바꾸고 이후에
논의해보자").

Implemented (TDD):
- NEW src/main/codexReasoning.mjs (+ .d.mts, + .test.mjs, 6/6 green):
  reasoningEffortForMode(mode): chat->low, plan->medium, work->high, default
  medium. codexReasoningRunArgs(effort): builds XENESIS_CODEX_APP_SERVER_ARGS
  ('app-server --stdio -c model_reasoning_effort=<e>') + XENESIS_CODEX_CLI_ARGS
  ('exec --skip-git-repo-check --sandbox read-only -c model_reasoning_effort=<e>
  -', stdin '-' kept last).
- src/main/index.ts:
  - XenesisRunProviderRuntimeOverride += `env?: NodeJS.ProcessEnv`.
  - import codexReasoning helpers (.mjs, matching the repo convention).
  - normalizeXenesisRunRequest: after computing `mode` + base providerRuntime,
    inject the mode-based reasoning env into providerRuntime.env (skipped when the
    user explicitly set process.env.XENESIS_CODEX_APP_SERVER_ARGS). Per-run env
    flows: run() -> mergeDeskProviderRuntimeOptions(base, override) ->
    createDeskEmbeddedEnv spreads providerRuntime.env AFTER baseEnv, so the
    per-run mode effort WINS over the service-level medium fallback.
  - The earlier service-level XENESIS_CODEX_APP_SERVER_ARGS/CLI_ARGS=medium in
    embeddedXenesisOptions is KEPT as a fallback (for any run path that bypasses
    normalizeXenesisRunRequest); per-run mode-based overrides it for Agent pane
    runs.
- Knob hierarchy: explicit process.env.XENESIS_CODEX_APP_SERVER_ARGS (user) >
  per-run mode-based > service-level medium fallback.

Built via electron-vite (be056mawm).

### Next intended step

Verify chat-mode prompt resolves to low (fast ~52s, clean) via the auto path,
confirm CR call still happens. (work=high already characterized at ~180s in the
ladder.) Then the deferred discussion: show the intermediate reasoning/progress
to the user in the pane (UI/UX) instead of replacing it with the final answer.

(NOTE: the mode-based reasoning code above was later REMOVED per user direction —
the agent now inherits the user's ~/.codex/config.toml. See the "Desk-features
merge" section below for the current line of work.)

---

## Desk-features merge — bringing main's features into the target (base = target)

User goal: target codebase is the base; analyze the 4 ref repos (test_git/main,
xenesis-desk, backup, final), discuss what/how to port BEFORE applying. Methodology:
one approved unit at a time; "잘 병합해야돼 — 대체가 아니야" (merge carefully, do NOT
replace existing CR).

### Gap analysis (read-only) + a correction
- Target already has the RICHEST renderer (342 ts(x) vs main 336 / backup 234 /
  final 85 / checkout 204) + 3 extension modules. final's renderer is an older
  structure.
- The IPC-channel diff first suggested target ⊂ main (~45 "missing"), but that was a
  GREP ARTIFACT: target registers many `mcp:*` handlers with the channel name on the
  line AFTER `ipcMain.handle(`, which a single-line regex missed. Verified directly:
  target ALREADY has mcp:capability-call, mcp:action-inbox-(list/resolve),
  mcp:bot-session-save, safe-file:(apply/preview) + mcpActionInbox.mjs /
  capabilityActionApproval.mjs / safeFileEdit.ts. The CR/approval/safe-file pipeline
  already exists in the target.

### Decision: bring "승인 CR" (option A), merge into the EXISTING Card A
Genuinely missing vs main: (1) standing "항상 승인" backend; (2) the "항상 승인" UI
button (target card had only 승인 후 실행 / 취소). Chosen: merge into the existing
in-process Card A (xd-xenesis-desk-action-card), NOT add main's separate inbox-backed
Card B (would duplicate the approval card).

### Unit 1 — standing-approval backend (DONE, builds clean)
- capabilityActionApproval.mjs: + `import crypto` + `createCapabilityApprovalAllowKey`
  (verbatim from main); .d.mts: + its type decl.
- shared/types.ts: McpBridgeActionInboxResolveRequest += scope?:'once'|'always',
  createdAt?; McpBridgeCapabilityCallResult += approvalResolution?; new
  McpBridgeCapabilityApprovalRememberEntry/...Result; McpBridgeApi +=
  rememberCapabilityApprovals().
- main/index.ts: import createCapabilityApprovalAllowKey; mcpCapabilityApprovalAllowKeys
  Set; getMcpCapabilityApprovalsStorePath + CAPABILITY_SCOPED_APPROVAL_PATHS +
  capabilityApprovalAllowKey + isMcpCapabilityApprovalRemembered + persist/load +
  rememberMcpCapabilityApproval(item) + rememberMcpCapabilityApprovalForCall(p,a,s);
  resolveCapabilityActionInboxRequest threads scope==='always' → remember;
  callMcpBridgeCapabilityFromRequest adds isMcp...Remembered pre-check +
  approvalResolution; loadPersistedMcpCapabilityApprovals() at startup. ALL ADDITIVE
  (existing once-approval untouched). Key includes source; scoped paths drop args.

### Unit 2 — "항상 승인" button on Card A (DONE, builds clean)
- New IPC mcp:capability-approval-remember (handler +
  rememberMcpCapabilityApprovalsFromRequest, defaults source 'xenesis').
- Preload mcpBridgeApi.rememberCapabilityApprovals(entries).
- XenesisAgentPane.tsx: import getDeskBridgeApi; handler
  approveAlwaysPendingDeskActionMessage(messageId) → persists each pending action
  {path,args,source:'xenesis'} then runs the normal approve; 3rd button "항상 승인"
  (data-xenesis-agent-desk-action-approve-always) between 승인 후 실행 and 취소.
- WHY source 'xenesis': the un-approved desk-action client is
  createDeskBridgeFacade('xenesis') (XenesisAgentPane.tsx:192). On a later turn the
  SAME action runs un-approved through that source first, so the remembered allow-key
  (path,args,'xenesis') must match to auto-clear the gate. Semantics match main:
  per-exact-args except CAPABILITY_SCOPED_APPROVAL_PATHS (navigate/selectPath).

### Unit 3 — browser-control (DEFERRED, user choice)
mcp:browser-action-result is the result-leg of a full embedded-webview control
feature. Target has xd.panes.browser.open + xd.playwright.* but the browser toolbar
(back/forward/navigate) is renderer-internal only (not CR-drivable). A useful port
needs CR caps + adapter dispatch + main↔renderer correlation
(sendMcpBrowserActionToRenderer / pendingMcpBrowserActions / mcp:browser-action(+
result)) + renderer runBrowserPaneAction. Own unit AFTER the approval-CR test.

### Unit 4 — live test
Deterministic via the natural-language Desk planner (runs before any LLM, codex-free;
short-circuits at XenesisAgentPane.tsx:2006-2009). scratchpad/approval-cr-test.js:
prompt "터미널에서 echo … 실행" → xd.terminals.run (approval-gated for source
'xenesis') → Card A pending → assert 3 buttons → click 항상 승인 → assert
capability-approvals.json gains an xd.terminals.run key → re-send SAME prompt →
assert NO pending card (auto-approved) → regression: a DIFFERENT command via 승인 후
실행 (once) adds NO standing key. Result: scratchpad/approval-cr-result.json.
capability-approvals.json at ~/.xenis/mcp/ (XENIS_HOME unset).
GOTCHA: kill any stale Electron/mission-repl/codex/MCP instances first (single-
instance lock) — a leftover prior-session app makes Playwright _electron.launch fail
with "Process failed to launch" (debugger attaches then ws disconnects 1006).

---

## Obsidian Code Knowledge Vault bootstrap — Phase 1 CR/Agent context (2026-06-26)

### Current objective

Create the first AI-readable Obsidian context layer for this public-release
`xenesis-desk` repo, focused on Capability Registry, MCP bridge, Xenesis Agent,
provider runtime, and approval flow. The final target is a full Code Knowledge
Vault, but this first pass should be immediately useful for CR/Agent work and
safe to expand.

### Touched files

- Planned repo edit: `AGENTS.md` — add Obsidian companion-vault reading rules.
- Planned Obsidian vault root:
  `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk`
- Planned Obsidian index update:
  `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk.md`

### Commands run

- `Get-Content -Raw AGENTS.md`
- `Get-Content -Tail 120 handoff.md`
- `Get-Content -Raw package.json`
- `Get-Content -Raw README.md`
- `Get-Content -Raw docs\capability-registry.md`
- `Get-Content -Raw docs\manual\README.md`
- `Get-Content -Raw docs\manual\03-xenesis-agent.md`
- `Get-Content -Raw packages\xenesis\README.md`
- `rg --files docs packages src mcp server scripts | Select-Object -First 180`
- `rg -n "Capability Registry|desk_capabilities|xenesis_desk|approvalRequired|provider|app-server" docs src packages mcp scripts -g "*.md" -g "*.ts" -g "*.tsx" -g "*.mjs" | Select-Object -First 140`
- `rg -n "callDeskBridgeCapability|approvalRequired|actionInboxItem|providerRuntime|createDeskBridgeFacade|deskNaturalIntentCatalog|rememberCapabilityApprovals" src packages mcp -g "*.ts" -g "*.tsx" -g "*.mjs" | Select-Object -First 200`

### Exact verification result

- Obsidian app config was found at `%APPDATA%\obsidian\obsidian.json`.
- Active vault path is `C:\Users\great\Documents\Obsidian Vault`.
- Existing Xenesis note is `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk.md`.
- That note is currently empty.
- No `.obsidian` directory exists inside `E:\xenesis-original\xenesis-desk`.
- Current repo worktree already has unrelated modified files; do not revert them.

### Known gaps

- No live Desk/Agent verification is needed for this documentation-only bootstrap.
- No Obsidian MCP or REST integration is wired yet; this pass writes Markdown
  files directly into the local vault.
- Phase 2 still needs API/data/task/ADR expansion after the CR/Agent seed notes
  are in place.

### Next intended step

Add the AGENTS.md companion-vault rules, create the Phase 1 vault folders and
notes, then verify the expected files exist and include the intended links.

### Progress update after implementation

Implemented:

- Added `AGENTS.md` section `Obsidian Code Knowledge Vault`.
- Created Phase 1 vault folder:
  `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk`
- Updated root vault index:
  `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk.md`
- Created 18 Phase 1 notes under:
  `00_System`, `10_Repo Map`, `20_Architecture`, `30_Modules`, `60_Tests`,
  and `80_AI`.

Verification commands run:

- `Get-ChildItem -Path 'C:\Users\great\Documents\Obsidian Vault\Xenesis-desk' -Recurse -File | Sort-Object FullName | ForEach-Object { $_.FullName }`
- `Select-String -Path 'C:\Users\great\Documents\Obsidian Vault\Xenesis-desk.md' -Pattern '\[\[AI Agent Rules\]\]|\[\[Repo Overview\]\]|\[\[module-capability-registry\]\]'`
- `Select-String -Path AGENTS.md -Pattern 'Obsidian Code Knowledge Vault|C:\\Users\\great\\Documents\\Obsidian Vault\\Xenesis-desk|Source-of-truth rules' -Context 0,2`
- `git diff -- AGENTS.md handoff.md`

Exact verification result:

- The vault contains the expected Phase 1 note files.
- `Xenesis-desk.md` contains links to `[[AI Agent Rules]]`,
  `[[Repo Overview]]`, and `[[module-capability-registry]]`.
- `AGENTS.md` contains the companion vault path and source-of-truth rules.
- No runtime tests were run because this pass changed documentation and local
  Obsidian Markdown only.

Next intended step:

Phase 2 can add `40_APIs`, `50_Data`, `70_Tasks`, `90_ADR`, and Bases-friendly
index views after the user confirms the next expansion slice.

### Brainstorming design update — Obsidian graph schema (2026-06-26)

User clarified that the vault must be a real Obsidian knowledge graph, not just
documentation. Brainstorming skill was invoked explicitly and the implementation
work was paused until design approval.

Approved design decisions:

- Primary objective: Agent operations graph.
- Secondary objective: architecture knowledge graph.
- Rollout strategy: Schema-first now, automation expansion later.
- Folder model: type-based folders; graph relationships live in Properties and
  Obsidian wikilinks.
- Write model: read-wide / write-review-only.
- Relation model: broad relation schema with note-type-specific required usage.
- View model: Markdown index notes first; `.base` views later after schema
  stabilization.
- Automation model: generated notes go to review with `reviewed: false` and
  low confidence until promoted.

Created design spec:

- `docs/superpowers/specs/2026-06-26-obsidian-knowledge-graph-design.md`

Self-review result:

- Placeholder scan found no `TBD`, `TODO`, `fill in`, or similar unresolved
  markers.
- Scope is focused on the knowledge graph design and explicitly defers
  automation implementation.
- No runtime tests were run because this is a design/spec update.

### Implementation plan update — Obsidian graph Phase 2A (2026-06-26)

User approved the design spec and asked to proceed. The writing-plans skill was
used to create the Phase 2A implementation plan.

Created plan:

- `docs/superpowers/plans/2026-06-26-obsidian-knowledge-graph.md`

Plan scope:

- Create graph governance notes.
- Create note templates.
- Upgrade Phase 1 notes with schema properties and `## Graph Links`.
- Add curated `40_APIs`, `50_Data`, `70_Tasks`, and `90_ADR` seed notes.
- Add Markdown index notes.
- Update vault root, AI rules, repo reading order, `AGENTS.md`, and this
  handoff.
- Verify file counts, required properties, selected repo paths, unresolved
  markers, and repo diff.

Self-review result:

- Placeholder scan found no forbidden unresolved markers in the plan.
- The plan maps approved spec requirements to concrete implementation tasks.
- Automation scripts are explicitly deferred from Phase 2A.

## Obsidian Knowledge Graph Phase 2A implementation (2026-06-26)

### Current objective

Implement the approved schema-first Obsidian knowledge graph foundation for
`C:\Users\great\Documents\Obsidian Vault\Xenesis-desk`.

### Touched files

- Planned repo updates: `AGENTS.md`, `handoff.md`
- Planned vault updates: `00_System`, `10_Repo Map`, `40_APIs`, `50_Data`,
  `70_Tasks`, `90_ADR`, `_Indexes`, `_Templates`
- Task 1 repo update: `handoff.md`
- Task 1 vault directories created: `40_APIs`, `50_Data`, `70_Tasks`,
  `80_AI\Review`, `80_AI\Outputs`, `90_ADR`, `_Indexes`, `_Templates`
- Task 2 vault notes created: `00_System\Graph Schema.md`,
  `00_System\Review Policy.md`, `00_System\Template Index.md`,
  `10_Repo Map\Source of Truth Map.md`
- Task 3 vault templates created: seven notes under `_Templates`

### Verification plan

- Confirm expected directories exist.
- Confirm expected notes exist.
- Confirm required properties on seed canonical notes.
- Confirm `## Graph Links` sections exist where relation properties are present.
- Confirm selected repo path references exist.
- Confirm `AGENTS.md` references the graph schema and write policy.

### Known gaps

- No `.base` views in Phase 2A.
- No automated repo extraction scripts in Phase 2A.

### Task 1 progress result

Commands run / equivalent actions:

- Updated `handoff.md` with the Phase 2A implementation start section.
- Created requested vault directories with PowerShell `New-Item -ItemType Directory
  -Force` under
  `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk`.
- Verified the requested vault directories with PowerShell `Test-Path
  -PathType Container`.
- Checked the requested target directories for files with PowerShell
  `Get-ChildItem -File -Recurse`.

Exact verification result:

| Directory | Exists |
|---|---|
| `40_APIs` | `True` |
| `50_Data` | `True` |
| `70_Tasks` | `True` |
| `80_AI\Review` | `True` |
| `80_AI\Outputs` | `True` |
| `90_ADR` | `True` |
| `_Indexes` | `True` |
| `_Templates` | `True` |

Checked target directories for markdown notes/files:

- `CheckedDirectories = 8`
- `FilesFoundInCheckedDirectories = 0`

Next intended step:

- Task 2 system governance notes.

### Task 2 progress result

Created graph governance notes:

- `00_System\Graph Schema.md`
- `00_System\Review Policy.md`
- `00_System\Template Index.md`
- `10_Repo Map\Source of Truth Map.md`

Review result:

- Initial quality review found stale/future links and an incomplete type list.
- Fixed schema vocabulary and existing-note links.
- Final spec review: `PASS`.
- Final quality review: `PASS`.

Next intended step:

- Task 3 templates.

### Task 3 progress result

Created templates:

- `_Templates\module-template.md`
- `_Templates\architecture-template.md`
- `_Templates\capability-template.md`
- `_Templates\data-store-template.md`
- `_Templates\adr-template.md`
- `_Templates\task-template.md`
- `_Templates\agent-handoff-template.md`

Review result:

- Spec review: `PASS`.
- Initial quality review: `FAIL` because sample YAML relation arrays did not
  match `## Graph Links`, `adr-template.md` used schema-undefined `decides:`,
  and sample links referenced non-existing notes.
- Fixed template relation arrays, ADR vocabulary, and dangling sample links.
- Final quality re-review: `PASS`.

Verification:

- `_Templates` contains exactly 7 Markdown files.
- Required top-level template frontmatter remains present on all seven.
- `rg` found no `decides:`, `[[Verification Map]]`, or
  `[[test-capability-audit]]` in `_Templates`.

Next intended step:

- Task 4 upgrade Phase 1 notes with schema properties and graph links.

---

## 2026-06-26 — Unit 3 browser-control port + pre-LLM prompt-heuristic purge

### Unit 3 — embedded-browser-pane CONTROL ported from main (DONE, build+typecheck green)
Additive port (kept target's xd.panes.browser.open + xd.playwright.*). Mirrors the
target's existing `mcp:dock-action` two-way round-trip. Files:
- types.ts: McpBridgeBrowserActionPayload/Result; McpBridgeApi += onBrowserAction +
  reportBrowserActionResult.
- main/index.ts: pendingMcpBrowserActions map; sanitizeMcpBrowserAction/Request/Result
  (reuse sanitizeMcpDockActionText); sendMcpBrowserActionToRenderer (uses
  MCP_DOCK_ACTION_TIMEOUT_MS); ipcMain.handle('mcp:browser-action-result'); adapter
  `browserAction`; browser type import.
- deskBridgeCapabilities.ts: DeskBridgeCapabilityAdapter += browserAction?; xd.panes.
  browser.{navigate,back,forward,reload,stop,state,textSnapshot,domSnapshot,
  elementAction} method nodes; dispatch branches via browserActionArgs. (Also fixed a
  PRE-EXISTING type error: added runTerminalAndWait? to the adapter interface — the
  earlier runTerminalAndWait port never declared it; surfaced once typecheck ran.)
- preload/index.ts: onBrowserAction + reportBrowserActionResult (model on onDockAction).
- renderer BrowserPane.tsx: BrowserPaneController + browserPaneControllers map +
  runBrowserPaneAction; contentId prop; executeJavaScript on the webview ref; controller
  useEffect with textSnapshot/domSnapshot/elementAction injected scripts.
- DockPaneView.tsx: pass contentId={content.id} to BrowserPane.
- App.tsx: handleMcpBrowserAction (resolveBrowserContentId over engine.contents/panes/
  activePaneId) + onBrowserAction listener effect; runBrowserPaneAction import.
NOT ported (heuristic): routeSimpleWebUiAutomationThroughVisibleBrowser, list/current.
Plan source: workflow wf_7b570584-a20.

### Pre-LLM prompt-heuristic purge (user: "저장/만들어 키워드 하드코딩 휴리스틱 싹 걸러내")
ROOT CAUSE of the bible-test "개판": the bible prompt was hijacked by
`isXenesisMarkdownSaveRequest` (저장/만들/생성 keywords) → requestMarkdownSave →
markdown export to exports/, codex NEVER ran (6.5s). XenesisAgentPane.tsx is NOT
agent-added — it's committed (a566906 Initial public release) and comes from MAIN, not
final (final has no such file). Workflow wf_2dc5178f-79b mapped the full interceptor
chain in `runTerminalInput` (3562) + `runPrompt`.
REMOVED (keyword/intent HIJACKERS that bypassed the LLM): markdown-save (R2),
control-demo/visible-subagent-work/visible-subagents-demo routers (R3-R5), Gowoori-CR
router (R6), natural-language Desk planner planXenesisDeskNaturalLanguageActions (R7 in
runTerminalInput + R9 re-run in runPrompt), artifact router (R8), the preferAgentPrompt
gate (R1); pruned 9 now-dead imports; deleted dead in-file shouldRouteXenesisInputToGowooriCr.
KEPT: empty-input guard, pending-approval confirmations (gated), slash commands,
agent-emitted ```xenesis-desk-action fenced-block executor, final fallthrough → codex.
RESULT: natural-language prompts now go to codex by default; Desk control survives via
buildXenesisDeskControlPromptHint + deskNaturalIntentCatalog (codex emits the CR block,
the kept executor runs it). Build ✓ (electron-vite 12.74s), typecheck = 1 pre-existing
error only. The matcher fns (isXenesisMarkdownSaveRequest etc.) remain in their files
(have tests) but are no longer called; requestMarkdownSave/IC-1 left inert (low-risk).

### Next intended step
User runs the live bible test themselves on this build (heuristic-free). Verify a
natural prompt now reaches codex and that Desk control works via model-emitted
xenesis-desk-action blocks.

---

## 2026-06-26 — Approval-structure cleanup (risk-based; user: "모든 작업에 승인 받을 필요 없어")

Problem: agent Desk actions run as source 'xenesis' (non-internal); the `method()`
default `approval: permission === 'read' ? 'never' : 'when-external'` meant EVERY
control/write/execute/danger capability prompted — i.e. every UI action prompted.

Audit (deskBridgeCapabilities.ts): permission enum = read|control|write|execute|danger.
- control (55) = UI/view/lifecycle only: ui.edit/font/theme/view, panes/tools.open,
  explorer show/hide, layout, capture start/cancel, browser nav, terminal open/resize/
  stop, service/gateway start/stop/restart. NO fs/exec.
- write/execute/danger = the risky set: saveText/writeFileBase64/remoteFiles.write/
  mkdir/rename/settings.save/favorites/meta.codes (write); terminals.run+runMany
  (execute, VERIFIED 6053/6087), terminals.write, xenesis.runs.start, meta.query.run
  (execute); processes.kill, remoteFiles.delete, capture.deleteAll (danger).

Change (user picked "read+control auto"): default approval is now
`permission === 'read' || permission === 'control' ? 'never' : 'when-external'` in THREE
places — `method()` (2703) and both dynamic node creators
`createTerminalDynamicCapabilityNode` (8390) + `createDockDynamicCapabilityNode` (8411).
Result: read+control auto-approve; write/execute/danger still require approval (and the
user can "항상 승인" each one once via Unit 1/2). Explicit per-node `{approval:'never'}`
overrides unaffected; no `approval:'always'` nodes exist. Build ✓ (electron-vite 13.17s),
typecheck = 1 pre-existing error only.

## 2026-06-26 — Base-of-record move to new repo + messaging-queue fix (branch `uno`)

### Big-picture state since the last entry
- **Base of record changed.** The codex-backed agent work (former local `trunk`,
  = session-wip 0512bd5) is now the trunk of record. origin/main (the public
  `xamong/xenesis-desk`) was a ONE-TIME harvest source, then disconnected.
- **Selective harvest of origin/main's 23 commits onto the codex trunk** (full
  audit → units → per-unit approval), 11 commits, every unit vetted for hardcoded
  heuristics + agent pollution: external app control U1-U6 (xd.apps.* drives
  Windows GUI apps by explicit appId), U13 robust TUI launch, U7+U8 terminal
  attach selector (+ Python mirror U9), U18 XD-Blaster (de-entangled — observational
  instrumentation only, ZERO keyword routers), U16 unified scrollback TUI
  (reimplemented). Skipped on principle: U15 (entangled w/ removed heuristics),
  U17 keyword routers, U19 test-churn, U20 stale docs. Plus a separate commit
  restoring docs/obsidian (66-note vault).
- **New repo.** Squashed the whole trunk to a single `initial commit` (history
  erased) and force-pushed to **git@github.com:xamong/Xenesis.git** main.
  Removed `.github/workflows/ci.yml` (its `npm run typecheck` step failed on the
  known baseline error embeddedAgentRuntime.test.ts TS2352). Auth: this machine's
  default SSH key is GitHub user `uno2ai` (no write to xamong/Xenesis); a TEMP
  `~/.ssh/id_ed25519_xamong` key + `github-xamong` host alias was created, origin =
  `git@github-xamong:xamong/Xenesis.git`. Commit identity now reverted to
  uno <uno@xamong.com>.
- **Active branch `uno`** (from the clean initial commit). Backups kept locally:
  `trunk` (full history), `session-wip`, `reconcile`, `merge/xenesis-final-main`.

### Current objective: messaging queue / agent context
User: "메시징 큐가 문제" + "Claude code codex와 같이 동작하도록" (a Claude-Code-style
type-ahead queue, with codex as the backend). Approved behavior: "자동 순차 실행".

### Root cause (systematic-debugging Phase 1 — FOUND)
There is **no prompt message queue.** `runPrompt` (XenesisAgentPane.tsx:1857) guards
`if (running) → append "Xenesis is already running. Use /cancel to stop the active
run." + return`. A prompt submitted while a run is active (or in the gap before
`running` clears) is **rejected, not queued.**
- Evidence: 6-turn context-retention E2E — T3 hit "already running"; a later stale
  response appeared. BUT **context retention itself is correct** (T4 recalled all 6
  facts in order; T6 reasoned "2글자 × 7 = 14"). So the defect is the queue, not
  context loss.
- Guard layers: runtime `embeddedAgentRuntime.ts:210` (`activeController` serializes,
  cleared in finally — OK) + renderer guards @1875/2085/2336/2450/2629. running:true
  @1885/1941/2102/2343/2465; running:false @1518/1930/2066/2321/2440; cancelActiveRun
  @1508; xenesisApi.run @1966.

### Design decision (user-approved): auto-sequential queue, Claude-Code style
Submit-while-running → ENQUEUE (don't reject); on run completion → auto-dequeue +
run next (FIFO); multiple → in order. Cancel does NOT clear the queue but does NOT
auto-fire the next. Input clears on submit (type-ahead). Detailed design via
background workflow `w3vi7d649` (3 parallel maps + synthesis) — pending; will
extract a pure testable `xenesisPromptQueue` module + wire it.

### Known gaps / deferred (separate tasks)
- codex/agent cold-start latency (~2.5min on the first tool-call turn).
- Agent pane UI improvements.
- xd.apps E2E: codex DOES discover + call the tool (1 tool), but the execute-approval
  gate blocked the actual launch in the headless run (codex phrased it "desktop apps
  blocked"); needs interactive-approval verification.

### Next intended step
Consume the design from w3vi7d649; implement TDD (pure queue module + test → wire
into XenesisAgentPane enqueue/drain + queued-item UI → build/typecheck) → live-verify
fast multi-turn sends queue instead of erroring.

### Implementation progress (message queue — DONE, build green; live-verify running)
Implemented the Claude-Code-style auto-sequential prompt queue. Files:
- NEW `panes/xenesisPromptQueue.ts` — PURE module: `makeQueuedPrompt` (snapshots
  input/attachments-copy/routingOptions/mode), `enqueueQueuedPrompt`/`dequeueQueuedPrompt`/
  `peekQueuedPrompt`/`removeQueuedPrompt`/`replaceQueuedPrompt`, and `decideDrain` (pure
  busy-edge decision: drains on prevBusy→!nextBusy with a non-empty, non-suppressed queue;
  consumes the suppress flag once). NEW `xenesisPromptQueue.test.ts` (node:test, 11/11 pass).
- `xenesisAgentTypes.ts` — exported `XenesisAgentPromptRoutingOptions` (moved out of the pane)
  + `QueuedPrompt`; added `promptQueue: QueuedPrompt[]` to XenesisAgentState. (queueStatus/
  queueId message fields were considered then reverted — see design choice below.)
- `xenesisAgentState.ts` — initial + persisted-reset `promptQueue: []` (never rehydrated);
  exported `isXenesisAgentBusy(state) = running||loading||streaming`.
- `XenesisAgentPane.tsx` — ENQUEUE gate at the single chokepoint `runTerminalInput` (after the
  approval-intent shortcuts, before slash/runPrompt dispatch): if busy → snapshot + push to
  promptQueue + return (input already clears, type-ahead). DRAIN via a store subscriber
  (busy true→false edge → queueMicrotask → dequeue head → re-invoke runTerminalInput with the
  snapshot, incl. modeOverride so the queued turn keeps its enqueue-time mode). cancelActiveRun
  sets suppressNextDrainRef so cancel preserves the queue but does not auto-fire next. Pending
  queue rendered above the input from state.promptQueue (reuses the desk-action card; 취소 removes).
- `styles.css` — `.xd-xenesis-prompt-queue` (blue-tinted pending cards).

Design choice: render queued items from `state.promptQueue` as dedicated pending cards (NOT
transcript messages), because `runPrompt` itself appends the user message on run — a transcript
queued message would duplicate on drain. So queueStatus/queueId on XenesisChatMessage were
reverted (YAGNI).

Verification: tsc baseline 1 (only the pre-existing embeddedAgentRuntime.test TS2352);
electron-vite ✓; queue unit tests 11/11. The bridge/registry test fixture got `promptQueue: []`.
**Live-verify PASSED** (Playwright _electron, task `blyx4qn1w`): fired 3 prompts ~1.5s apart —
while turn 1 ran, turns 2 & 3 appeared as "대기 중" pending cards (not rejected), then drained
FIFO; responses 2 / 4 / 6 all returned in order; the "already running" error was ABSENT.

### Next
Committed the 7 queue files + this handoff entry on branch `uno`. Deferred items remaining:
codex/agent cold-start latency (~2.5min first tool-call turn), agent pane UI. Watch:
subagents/builds occasionally re-touch AGENTS.md / docs/obsidian — always stage commits with
explicit file lists, never `git add -A`.
