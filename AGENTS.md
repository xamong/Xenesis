# Xenesis Desk Agent Operating Contract

This repository is CR-first. The Capability Registry is the source of truth for
Desk operations, automation, and agent-to-Desk control. This file is the
operating contract for agent work in `E:\xenesis-original\xenesis-desk` (the
public-release lineage). It is adapted from the backup workspace contract
(`E:\xenesis-desk-backup\AGENTS.md`); verification gates below reflect THIS
repo's actual scripts, and known infra gaps are marked explicitly.

## Prime Directive

- Prefer Xenesis Desk Capability Registry paths for Desk behavior before ad hoc
  shell commands, renderer shortcuts, or provider-specific code paths.
- Treat CR coverage as a release gate: registered paths, dispatcher wiring, and
  any live verification must stay aligned.
- Do not report CR work as complete unless missing registry paths, missing
  dispatched coverage paths, and undispatched static callable methods are all 0.
- Do not claim "100%" for natural language behavior. State the exact verified
  scope and the commands or live Agent pane prompts that passed.
- Do not hardcode behavior and present it as agent reasoning. The deterministic
  natural-language intent catalog is hardcoded routing, not the model deciding.

## Desk Capability Flow

- Discover with `desk_capabilities` or `xenesis_desk_capabilities`.
- Inspect uncertain paths with `desk_capability` or `xenesis_desk_capability`.
- Execute callable paths through the generic CR caller: `desk_call_capability`
  in embedded Xenesis, or `xenesis_desk_call_capability` through the MCP server.
- Verify Desk control calls by reading state, active context, diagnostics,
  captures, approval records, open content, or another CR read path.
- Keep typed Desk tools as convenience wrappers only. They must map back to CR
  behavior, not bypass it.

## Approval Policy

- Never synthesize chat-only approval text such as "approval request:" and treat
  that as done.
- For approval-required Desk actions, call the CR path with `approved=false` so
  Desk creates a real approval record.
- For external local workspaces, use `xd.services.xenesis.setWorkspace` or
  `xd.xenesis.workspace.set` with `approved=false`.
- If a tool reports an outside-workspace boundary or
  `CreateProcessAsUserW failed: 1312`, request/open the workspace through the CR
  approval flow instead of stopping at a plain error explanation.
- If a Xenesis Agent pane run result contains `approvalRequired=true` with an
  `actionInboxItem`, the pane should render an inline approval card in the Agent
  chat (`이번만 승인`, `항상 승인`, `거절`) that resolves the request directly.
  Action Inbox is an audit/backstop surface, not the primary approval path.
- In normal Agent-pane responses, describe approval stops in user-facing product
  language only (e.g. `파일 트리에서 E:\Workspace\plane을 열려면 데스크 승인이
  필요합니다.`). Do not print `actionInboxItem.id`, internal CR paths, raw args,
  `approvalRequired`, or `actionInboxItem` unless the user explicitly asks for
  diagnostics.

## Provider Policy

- The provider used for agent reasoning is chosen by the user's setting, not a
  hardcoded default. Read the active `~/.xenis` profile's provider; do not
  silently override it. `'auto'` resolves by credential scan
  (`~/.codex/auth.json` -> codex, `~/.claude/.credentials.json` -> claude, then
  env keys). BYOK is just one provider among codex/claude/etc.
- Do not build separate one-off CR implementations for every provider. The
  stable abstraction is the generic CR caller; provider adapters only ensure a
  provider runtime can reach that caller.
- Keep `localCli` selection (which installed CLI agent) orthogonal to the
  provider enum. Do not collapse one into the other.
- Non-BYOK Codex (ChatGPT login, no `OPENAI_API_KEY`) reaches Desk CR through the
  Xenesis Desk MCP server: `xenesis_desk_capabilities`,
  `xenesis_desk_capability`, `xenesis_desk_call_capability`.
- Non-BYOK Codex runtime should use `codex-app-server` first so Desk Agent turns
  reuse a persistent `codex app-server --stdio` process/thread
  (`processModel=persistent-process`, sandbox set up once). `codex-cli` is the
  one-shot fallback (`process-per-turn`) used when app-server startup fails or is
  explicitly selected; it re-runs the Windows sandbox setup every turn, so a
  repeated `codex-windows-sandbox-setup` means the app-server path is not being
  used.
- Mock provider is removed from the agent reasoning path. Do not reintroduce a
  silent fallback to mock or to codex for a keyed provider with no key (return an
  honest credential error instead).
- Do not reveal bridge tokens or provider secrets in logs, docs, or summaries.

## Agent Pane Behavior

- Agent pane prompts mentioning `xd.*`, `xenesis_desk_*`, `approvalRequired`,
  `actionInboxItem`, CR, MCP, or Capability Registry are agent/Desk control
  prompts, not visual artifact prompts. Route them through the Xenesis runtime
  provider path so Codex (or another provider) can call CR tools.
- Keep `/provider <name>` and provider selection persistent enough that a new
  Agent pane does not silently fall back to a different provider for runtime
  verification.
- The user drives the agent with natural language. Test with natural-language
  requests, not slash commands / function names / raw CR names.

## Verification Gates (this repo)

Run the narrowest relevant checks first, then broaden when CR surfaces changed.

- Root typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Xenesis package tests: `npm --prefix packages/xenesis test` (vitest); scope to
  specific files when iterating.
- Xenesis package typecheck: `npm --prefix packages/xenesis run typecheck`
- Xenesis package build (dist for the `file:` dep): `npm --prefix packages/xenesis run build`
- CR audit: `npm run docs:capabilities:audit`
- Provider smoke: `npm --prefix packages/xenesis run provider:smoke`
- Public-release safety: `npm run check:public-release`
- Live Agent run: launch the actual Electron app and drive a natural-language
  Desk-control prompt; confirm the footer provider + work-log show the intended
  provider (e.g. codex, not openai).

KNOWN INFRA GAP: the backup's `crDevBridge*` live Agent-pane smoke harness
(`scripts/crDevBridgeSmoke.mjs`, `scripts/mcpBridge.test.mjs`, etc.) and the
generated audit docs (`docs/capability-registry-audit.md`,
`docs/xenesis-agent-cr-mapping-audit.md`) are NOT present in this repo. Until
ported, live verification is done via an ad-hoc Playwright `_electron.launch`
driver. For Agent/CR changes, at least one live Agent-pane prompt must prove the
provider actually called the MCP/CR tool, not just that a package test passed.

## Documentation

- For multi-step Agent, CR, provider, approval, workspace, terminal, or browser
  work, create or update root `handoff.md` before the first code edit when
  possible, and update it again after each material design decision, code change,
  failed verification, passed verification, or known-gap finding.
- `handoff.md` must include: current objective, touched files, commands run,
  exact verification result, known gaps, and the next intended step.
- A handoff update is NOT completion evidence. Completion still needs the
  relevant tests, CR audit, and live evidence.
- Record exact commands and live prompt markers that passed.

## Obsidian Code Knowledge Vault

This repo has a repo-local Obsidian knowledge graph mirror at:

`docs/obsidian`

The repo-local vault index note is:

`docs/obsidian/Xenesis-desk.md`

An external Obsidian app vault may also mirror this content, under a
`Xenesis-desk` vault folder (its index note is `Xenesis-desk.md`). That
location is per-machine — it is set when the vault is restored and is not
recorded here. Treat `docs/obsidian` as the canonical path; the external
app vault is only a convenience copy.

The vault is an AI-readable context layer, not the source of truth. Use it to
understand structure, design intent, risk areas, module ownership, ADRs, and
prior agent handoffs before changing code.

If the external Obsidian app mirror is missing or stale, restore it from the
repo-local mirror with `scripts/restore-obsidian-vault.ps1`.

For multi-step Agent, CR, provider, approval, workspace, terminal, browser, or
architecture work:

1. Read this `AGENTS.md`.
2. Read the repo-local Obsidian index: `docs/obsidian/Xenesis-desk.md`.
3. Read `00_System/AI Agent Rules.md`.
4. Read `00_System/Graph Schema.md`.
5. Read `00_System/Review Policy.md`.
6. Read `10_Repo Map/Source of Truth Map.md`.
7. Read relevant notes in `_Indexes/`.
8. Read `10_Repo Map/Repo Overview.md`.
9. Read the relevant module notes under `30_Modules/`.
10. Read relevant architecture notes under `20_Architecture/`.
11. Then inspect the actual repo code and tests.

For graph-aware work, also read:

- `00_System/Graph Schema.md`
- `00_System/Review Policy.md`
- `10_Repo Map/Source of Truth Map.md`
- `_Indexes/`

Source-of-truth rules:

- Git repo code, tests, generated CR docs, and verification commands are the
  executable truth.
- Repo-local Obsidian notes are navigation, intent, and handoff context.
- The external Obsidian app mirror is a convenience copy and can be regenerated
  from `docs/obsidian`.
- If Obsidian and repo code disagree, trust the repo and record the mismatch in
  `handoff.md` or an Obsidian working note.

Update policy:

- Do not paste whole source files into Obsidian.
- Link to repo paths instead.
- Treat canonical vault notes as proposal-first unless a concrete
  implementation plan has been approved.
- Direct vault writes are limited to `80_AI/Working Notes`, `80_AI/Review`,
  `80_AI/Outputs`, and `70_Tasks` by default.
- After material CR/Agent/provider/approval changes, update the relevant
  Obsidian module or handoff note when practical.
- `handoff.md` remains the required repo-local work log for active multi-step
  changes.

## Working Rules

- Read relevant files before patching.
- Analyze before changing; do not blindly copy from the backup. Port intent,
  verify it fits this repo's architecture.
- Keep patches scoped to the CR/Agent behavior being changed.
- Do not revert unrelated user or generated changes.
- Prefer repeatable smoke scripts over manual claims.
- In Korean conversations, answer the user in Korean unless they ask otherwise.
