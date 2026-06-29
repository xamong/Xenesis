---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
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
- `docs/obsidian/Xenesis-desk/20_Architecture/Reference Adoption Map.md`
- `docs/obsidian/Xenesis-desk/80_AI/Working Notes/`
- `scripts/restore-obsidian-vault.ps1`

## Acceptance

- Obsidian graph links from index to final goal, slice specs, reference adoption
  map, module owners, CR surface, and verification map are complete.
- CR audit counters are all 0 after final implementation slices.
- Generated CR docs are current if CR surfaces changed.
- `handoff.md` records all commands, live prompt markers, exact results, known
  gaps, and final next step.
- Any public-release known infra gap is stated concretely rather than hidden.
- External Obsidian mirror is restored only after repo-local vault is current.

## Verification

```powershell
npm run docs:capabilities:audit
rg -n "Missing registered paths|Missing dispatched coverage paths|Undispatched static callable methods|Dispatcher paths missing from tree" docs\capability-registry-audit.md
npm run typecheck
npm --prefix packages/xenesis run typecheck
npm run build
npm run smoke:xenesis:connection-center -- --json
npm run smoke:xenesis:review-request-approval -- --json
git diff --check
```

Run when release packaging is in scope:

```powershell
npm run check:public-release
```

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
