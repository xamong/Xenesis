---
type: task
repo: xenesis-desk
aliases:
  - Slice Spec 06 Graph Release Hardening
status: draft
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
npm run typecheck
npm run lint
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run typecheck
npm run build
npm run smoke:xenesis:connection-center -- --json
npm run smoke:xenesis:review-request-approval -- --json
npm run check:public-release
git diff --check
```

Live Electron Agent-pane natural-language proof is mandatory for final signoff.
If no repeatable script exists yet, `handoff.md` must record the exact prompt,
driver/manual marker, footer/work-log provider, generic CR/MCP tool-call
evidence, and CR readback/approval evidence.

If the known missing `.github/workflows/ci.yml` gap remains, record the exact
failure rather than treating it as a product failure.

## Out Of Scope

- New product features.
- Canonical architecture rewrites unrelated to implemented slices.
- Force-updating external Obsidian mirror before repo-local graph is correct.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Source of Truth Map]]
- Depends on [[Verification Map]]
- Verified by [[Verification Map]]
