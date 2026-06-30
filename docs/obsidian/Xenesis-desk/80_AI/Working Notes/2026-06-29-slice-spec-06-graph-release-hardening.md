---
type: task
repo: xenesis-desk
aliases:
  - Slice Spec 06 Graph Release Hardening
status: active
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: low
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal Overall Spec]]"
  - "[[Final Goal Slice Spec Index]]"
  - "[[Source of Truth Map]]"
  - "[[Verification Map]]"
verified_by:
  - "[[Verification Map]]"
---

# Slice Spec 06 Graph Release Hardening

## Goal

Close the final-goal work by reconciling Obsidian graph notes, generated CR
docs, handoff, release checks, and live evidence into one auditable final state.

## Scope

- Obsidian index and working-note links.
- Reference adoption map updates after implemented slices.
- Generated capability docs and CR audit counters.
- Public-release known gap reporting.
- Final handoff with exact commands and live prompt markers.
- Optional external Obsidian mirror restore when repo-local graph is current.

## Reference Intake

- `docs/obsidian/Xenesis-desk/00_System/Final Goal.md`
- `docs/obsidian/Xenesis-desk/00_System/Graph Schema.md`
- `docs/obsidian/Xenesis-desk/00_System/Review Policy.md`
- `docs/obsidian/Xenesis-desk/10_Repo Map/Source of Truth Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`
- All slice specs under `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-spec-*.md`.

## Candidate Files

- `handoff.md`
- `docs/capability-registry-audit.md`
- `docs/capability-registry-list.md`
- `docs/obsidian/Xenesis-desk.md`
- `docs/obsidian/Xenesis-desk/_Indexes/Verification Map.md`
- `docs/obsidian/Xenesis-desk/_Indexes/CR Surface Index.md`
- `docs/obsidian/Xenesis-desk/_Indexes/High Risk Areas.md`
- `docs/obsidian/Xenesis-desk/_Indexes/Open Tasks.md`
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-adoption-map-proposal.md`
- `docs/obsidian/Xenesis-desk/20_Architecture/Reference Adoption Map.md` (promotion target only after approval/verification)
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/`
- `scripts/assertCapabilityAuditZero.mjs`
- `scripts/obsidianGraphCheck.mjs`
- `scripts/restore-obsidian-vault.ps1`

## Acceptance

- Obsidian graph links from index to final goal, slice specs, reference adoption
  proposal or promoted map, module owners, CR surface, and verification map are
  complete.
- Graph validation fails on unresolved required wikilinks, missing slice index
  discoverability, or missing handoff/live-evidence markers.
- CR audit assertion fails unless all four gap counters are exactly 0 after
  final implementation slices.
- Generated CR docs are current if CR surfaces changed.
- `handoff.md` records all commands, live prompt markers, exact results, known
  gaps, final next step, footer/work-log provider, generic CR/MCP tool-call
  evidence, and readback/approval evidence.
- Any public-release known infra gap is stated concretely rather than hidden.
- `npm run lint` and `npm run check:public-release` are mandatory final gates;
  accepted infra gaps must be recorded with exact command output and dates.
- External Obsidian mirror is restored only after repo-local vault is current.

## Verification

```powershell
npm run docs:capabilities:audit
node scripts\assertCapabilityAuditZero.mjs
npm run docs:obsidian:check
npm run typecheck
npm run lint
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run typecheck
npm run build
node .\scripts\xenesisConnectionCenterLiveSmoke.mjs --json
node .\scripts\xenesisReviewRequestApprovalLiveSmoke.mjs --json
npm run check:public-release
git diff --check
```

Live Electron Agent-pane natural-language proof is mandatory for final signoff.
If no repeatable script exists yet, `handoff.md` must record the exact prompt,
driver/manual marker, footer/work-log provider, generic CR/MCP tool-call
evidence, and CR readback/approval evidence.

If the known missing `.github/workflows/ci.yml` gap remains, record the exact
failure rather than treating it as a product failure.

## Slice 06 Implementation Evidence

- Added `.github/workflows/ci.yml` with `npm ci`, `npm run typecheck`,
  `npm run check:docs-public`, and `npm run check:public-release` so the
  existing public release checker has a real CI workflow to inspect.
- Split public documentation safety from the repo-local Obsidian knowledge
  graph. Public docs checks now exclude `docs/obsidian`; the Obsidian vault is
  validated by `npm run docs:obsidian:check`.
- Added `scripts/obsidianGraphCheck.mjs` and
  `scripts/obsidianGraphCheck.test.mjs`.
- Graph check scope:
  - all repo-local Obsidian wikilinks resolve;
  - final goal, slice specs, reference adoption map, source-of-truth map,
    verification map, CR surface index, module index, high-risk index, and
    module owner notes are reachable from `docs/obsidian/Xenesis-desk.md`;
  - `handoff.md` includes final-goal CR audit, audit-zero, lint,
    public-release, and live provider CR/MCP evidence markers.
- Verification:
  - `node --test scripts\obsidianGraphCheck.test.mjs` -> passed 4/4.
  - `npm run docs:obsidian:check` -> passed; 147 notes and 733 wikilinks
    checked.
  - `node --test scripts\checkDocsPublicSafety.test.mjs scripts\publicReleaseCheck.test.mjs`
    -> passed 2/2.
  - `npm run check:public-release` -> passed after CI/public docs boundary and
    README/test-log cleanup.
  - `node --test scripts\xenesisChannelNaturalLanguageLiveSmoke.test.mjs`
    -> passed 28/28 after the channel natural-language smoke prompt was kept
    CR-only and the no-provider-`webSearch` regression was preserved.
  - `npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts`
    -> passed 3/3 after Codex app-server Desk MCP runs were hardened to disable
    user/global Codex `apps`, `plugins`, `tool_suggest`, and `multi_agent`
    surfaces.
  - `node .\scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs --json`
    -> initially failed 16/17 because provider raw stream contained a real
    Codex app-server `webSearch` item before the Desk CR MCP readback.
  - Running the same live smoke with `XENESIS_CODEX_APP_SERVER_ARGS='app-server
    --stdio --disable apps --disable plugins --disable tool_suggest --disable
    multi_agent'` passed 17/17, isolating the root cause to inherited
    app/plugin native tool surfaces rather than the CR caller.
  - Final default-path `node .\scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs
    --json` -> passed 17/17 with `providerNaturalLanguageToolSelectionProof=true`,
    footer provider `codex-app-server`, process model `persistent-process`,
    marker `channel-routing-readback-ok`, provider raw CR/MCP channel evidence,
    and no provider `webSearch`.
- Remaining at this point:
  - repo-wide `npm run lint` was rerun and still fails with known Biome debt:
    1119 errors, 415 warnings, 93 infos. Do not present Slice 06 as lint-clean.
  - final broad gates passed except lint: CR audit, audit-zero, Obsidian graph
    check, public-release, root typecheck, package tests, package typecheck,
    package build, root build, Connection Center live smoke 19/19, review
    approval live smoke 6/6, channel natural-language live smoke 17/17, and
    `git diff --check`.
  - adversarial review found two valid Slice 06 hardening gaps:
    top-level Codex app-server `webSearch` turn items could evade the
    no-provider-web-search check, and the Obsidian graph checker handoff
    markers were global substring checks instead of Slice 06 final evidence
    checks.
  - post-review fixes:
    `scripts\xenesisChannelNaturalLanguageLiveSmoke.test.mjs` now rejects
    top-level completed `webSearch` turn items, and
    `scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs` checks both
    `params.item.type` and top-level `record.type`;
    `scripts\obsidianGraphCheck.mjs` now scopes handoff validation to
    `## Current Slice 06 Graph Release Hardening` and requires semantic final
    evidence patterns.
  - post-review verification:
    `node --test scripts\xenesisChannelNaturalLanguageLiveSmoke.test.mjs`
    -> passed 29/29;
    `node --test scripts\obsidianGraphCheck.test.mjs` -> passed 5/5;
    `npm run docs:obsidian:check` -> passed, 147 notes / 733 wikilinks;
    latest `node .\scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs --json`
    -> passed 17/17 with provider CR/MCP evidence, recovery false, and no
    provider `webSearch`.
  - no universal natural-language coverage is claimed. Verified natural-language
    scope is the scripted Telegram channel readback prompt with provider raw
    CR/MCP evidence, footer provider `codex-app-server`, persistent process
    model, and no provider `webSearch`.

## Out Of Scope

- New product features.
- Canonical architecture rewrites unrelated to implemented slices.
- Force-updating external Obsidian mirror before repo-local graph is correct.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Source of Truth Map]]
- Depends on [[Verification Map]]
- Verified by [[Verification Map]]
