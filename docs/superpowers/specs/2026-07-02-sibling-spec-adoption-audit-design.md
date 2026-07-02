# Sibling Spec Adoption Audit Design

## Goal

Audit the sibling Xenesis Desk spec folder in chronological order and turn it
into an actionable adoption map for this repo. The output should say which
features are already adopted, which are partially adopted, which are missing,
and which should be deferred because they would downgrade this repo's stronger
AI Agent/runtime/provider behavior.

## Source Scope

Source folder:

`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\docs\superpowers\specs`

The audit covers these 20 files in filename/date order:

1. `2026-06-25-external-app-control-design.md`
2. `2026-06-26-channel-command-surface-design.md`
3. `2026-06-26-channel-rich-rendering-parity-design.md`
4. `2026-06-26-input-control-layer-design.md`
5. `2026-06-26-office-control-provider-design.md`
6. `2026-06-27-app-control-lab-design.md`
7. `2026-06-27-cr-xmdb-metadata-storage-design.md`
8. `2026-06-27-dock-tearoff-hardening-design.md`
9. `2026-06-27-macos-control-host-design.md`
10. `2026-06-27-meta-management-commercialization-design.md`
11. `2026-06-27-office-com-provider-design.md`
12. `2026-06-27-visible-subagent-plan-session-design.md`
13. `2026-06-27-windows-computer-use-elementref-design.md`
14. `2026-06-27-windows-computer-use-observation-design.md`
15. `2026-06-28-obsidian-vault-viewer-design.md`
16. `2026-06-29-agent-session-hub-design.md`
17. `2026-06-29-linux-core-support-design.md`
18. `2026-06-30-editable-surface-context-menu-design.md`
19. `2026-06-30-xenesis-terminal-subagents-design.md`
20. `2026-07-01-menu-explore-design.md`

## Adoption Policy

Use current repo code, tests, Capability Registry paths, renderer panes,
preload/main wiring, and verification scripts as the source of truth. Local
handoff notes and existing ignored specs can guide the search, but they are not
completion evidence.

Do not wholesale copy sibling folders. Port intent and confirm the fit with the
current architecture.

`packages/xenesis` is protected but not forbidden. It may be changed when the
missing work is UI or utility interaction behavior, such as external channel
menus, button rendering, rich message layout, command aliases, and other
Desk-facing interaction surfaces. It must not be changed to replace this repo's
stronger AI Agent reasoning, provider runtime, local CLI behavior, or provider
selection model.

## Classification Model

Each spec gets one status:

- `adopted`: current repo has matching source, tests, and user-visible or CR
  wiring for the spec's success criteria.
- `partial`: the main capability exists, but sibling has meaningful UI,
  verification, or edge-case behavior not yet present here.
- `missing`: no meaningful implementation exists in this repo.
- `deferred`: implementation is intentionally excluded because it is outside
  product scope, platform scope, or the protected AI Agent/runtime boundary.

Each row must include evidence:

- relevant current repo files,
- relevant sibling files if drift matters,
- CR paths or menu commands when applicable,
- focused tests or missing tests,
- next action.

## Initial Findings

Many specs are already adopted through earlier slice work:

- external app control, App Control Lab, Windows observation, element refs, and
  menu explore are represented by `xd.apps.*`, native helper wiring, and the
  App Control Lab pane.
- input control is represented by `xd.input.*` and the main input-control
  service.
- Office file, Windows COM, and macOS Apple Events support are represented by
  `xd.office.*`, native Office helper wiring, and settings support.
- dock tear-off hardening, Obsidian vault viewer, meta management, Agent
  Sessions, editable surface context menus, and Workbench subagents have current
  repo files and tests.

The highest-signal partial area is the channel package:

- `packages/xenesis/src/channels` differs materially from the sibling package.
- The differences are in command surface, Slack/Discord/Telegram action
  rendering, and channel message interaction behavior.
- This area is eligible for adoption because it is UI/utility interaction
  behavior, not pure AI Agent reasoning.

Other partial areas need exact row-by-row confirmation rather than immediate
copying:

- Agent Sessions has matching file coverage but sibling drift exists in adapter
  and index tests.
- Editable surface has matching implementation files, with test-only drift.
- macOS control host source appears aligned.
- Linux core support appears partially represented through build scripts and
  unsupported adapters, but needs packaging/documentation verification.

## Implementation Strategy

1. Create a chronological adoption audit document.
2. For each sibling spec, fill the classification row with code/test/CR
   evidence.
3. Select the smallest high-value `partial` or `missing` slice.
4. Write a dedicated implementation plan for that slice.
5. Implement with focused tests first where practical.
6. Run focused verification, then broader checks based on touched surfaces.
7. Record any deferred AI Agent/runtime changes explicitly instead of silently
   skipping them.

The first likely implementation slice is channel command/rich rendering parity
inside `packages/xenesis/src/channels`, constrained to command menu aliases,
platform button rendering, and message interaction behavior.

## Verification Plan

For audit-only changes:

- inspect git status,
- commit only the design/audit documentation,
- no runtime tests required beyond file validation.

For implementation slices:

- run focused package tests for touched channel, renderer, main, or shared
  files,
- run `npm run typecheck`,
- run `npm test` when shared behavior changes,
- run `npm --prefix packages/xenesis test` when `packages/xenesis` changes,
- run `npm --prefix packages/xenesis run typecheck` when package TypeScript
  changes,
- run `npm run docs:capabilities:audit` when CR paths change,
- run `npm run check:public-release` before PR unless blocked by known infra,
- use live Electron or channel smoke only when the slice affects live Desk
  control or external channel behavior.

## Boundaries

This design does not implement the missing features yet. It only defines the
adoption process and the rules for deciding what can be ported.

Do not include unrelated local generated files, server databases, or the prior
`@xcon-viewer` dependency update in this design commit.

## Self Review

- No placeholders remain.
- Scope is limited to audit and follow-on slice selection.
- `packages/xenesis` rules are explicit and match the user's clarification.
- Completion evidence requires code/tests/CR paths, not prior notes alone.
