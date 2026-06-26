# Xenesis Desk Final-Goal Obsidian Knowledge Graph Design

## Goal

Upgrade the Xenesis Desk Obsidian vault into a usable knowledge graph for both
agents and humans. The graph should explain the current codebase and also record
the codebase's directional final goal.

The central idea is:

Xenesis Desk is a CR-first control plane for agent workbench behavior. Agents may
use the Desk as a workbench for files, terminals, browser surfaces, panes, and
automation, but every meaningful Desk action should converge on the Capability
Registry as the discoverable, callable, approvable, and verifiable control
surface.

The graph is not a complete encyclopedia of every code path. Phase 1 is complete
when an agent or human can follow the vault to understand the final goal, find
the Agent-control source areas, identify high-risk CR/MCP surfaces, and choose
the relevant verification path before editing the repo.

## User Decisions

- Canonical vault notes stay in English.
- Add the final-goal note at `00_System/Final Goal.md`.
- The final-goal note combines product vision and technical goals.
- The tone emphasizes CR-first control plane over generic workbench language.
- The final-goal note is directional guidance, not an absolute rule.
- Phase 1 includes existing-note normalization and core Agent-control expansion.
- Canonical notes may be edited directly for this approved scope.
- CR/MCP mapping is the most detailed area in Phase 1.
- CR/MCP mapping uses category notes by default and individual notes only for
  high-risk paths.
- Repo-local vault edits should be mirrored into the external Obsidian vault.

## Source Locations

Primary edit target:

```text
docs/obsidian/Xenesis-desk
```

External mirror target:

```text
C:\Users\great\Documents\Obsidian Vault\Xenesis-desk
```

Root index files:

```text
docs/obsidian/Xenesis-desk.md
C:\Users\great\Documents\Obsidian Vault\Xenesis-desk.md
```

The repo-local vault remains the canonical project-side source. The external
Obsidian vault is a working mirror that should match after the Phase 1 update.

## Graph Shape

`00_System/Final Goal.md` becomes the graph hub for directional intent.

The root index and operating notes should link to it:

- `Xenesis-desk.md`
- `00_System/AI Agent Rules.md`
- `10_Repo Map/Source of Truth Map.md`
- `10_Repo Map/Repo Overview.md`

Core module, architecture, API, data, and test notes should describe how they
support the final goal. Use `depends_on` or `implements` where appropriate, and
repeat important relationships in `## Graph Links`.

The graph should stay navigable:

- Index notes are entrypoints.
- Module notes explain ownership and source files.
- Architecture notes explain runtime/control flow.
- API notes map external or callable surfaces.
- Data notes explain persisted state and read/write responsibility.
- Test notes map verification commands and live checks.

## Phase 1 Note Scope

Phase 1 should directly extend the Agent-control graph, especially:

- `00_System/Final Goal.md`
- `00_System/AI Agent Rules.md`
- `10_Repo Map/Source of Truth Map.md`
- `10_Repo Map/Repo Overview.md`
- `20_Architecture/Capability Registry Architecture.md`
- `20_Architecture/MCP Bridge Architecture.md`
- `20_Architecture/Xenesis Agent Runtime.md`
- `20_Architecture/Approval Flow.md`
- `20_Architecture/Provider Model.md`
- `30_Modules/module-capability-registry.md`
- `30_Modules/module-mcp-bridge.md`
- `30_Modules/module-xenesis-agent-pane.md`
- `30_Modules/module-provider-runtime.md`
- `30_Modules/module-approval-system.md`
- `40_APIs/capability-index.md`
- `40_APIs/mcp-tool-index.md`
- `50_Data/data-action-inbox.md`
- `50_Data/data-capability-approvals.md`
- `50_Data/data-provider-profile.md`
- `60_Tests/test-capability-audit.md`
- `60_Tests/test-live-agent-pane.md`
- `60_Tests/test-provider-smoke.md`
- Core `_Indexes` notes

Each expanded core note should include, where relevant:

- Purpose
- Role in Final Goal
- Source Files
- Control Flow or Data Flow
- Callable Surface, for CR/MCP notes
- Risks
- Verification
- Graph Links

The intended depth is practical code-map depth. A reader should be able to act
without hunting blindly, but the vault should not paste source files or duplicate
all implementation details.

## CR/MCP Mapping Policy

CR/MCP is the most detailed Phase 1 area.

Primary source files:

```text
src/shared/deskBridgeCapabilities.ts
mcp/xenesis-desk-mcp-server.mjs
scripts/capabilityCoverageAudit.mjs
docs/capability-registry.md
```

The base structure:

- `40_APIs/capability-index.md` is the CR entrypoint.
- `40_APIs/mcp-tool-index.md` maps MCP tools back to CR behavior.
- Category-level notes cover namespace/group behavior.
- Individual path notes exist only for high-risk paths.

Use individual path notes for CR paths that meet one or more high-risk criteria:

- `permission: write`, `execute`, or `danger`
- approval-required behavior such as `approval: when-external` or `always`
- workspace boundary crossing
- file writes, restores, deletes, or external opens
- terminal or process execution/control
- approval/action-inbox creation or resolution
- provider/agent paths that perform real Desk control

Do not create one note for every CR path in Phase 1. Instead, category notes and
tables should cover the broad surface, while high-risk paths receive separate
notes or clearly marked candidate rows.

## Normalization Policy

Existing notes should be normalized without large rename sweeps unless needed.

Normalize:

- frontmatter shape and relation fields
- broken Markdown formatting
- stale or missing graph links
- thin notes that lack source files, risks, or verification
- index notes that do not explain their filter intent

Avoid:

- pasting whole source files into Obsidian
- bulk-generating many unreviewed notes
- adding automation scripts in Phase 1
- treating Obsidian as more authoritative than repo source and tests

If a note and repo source disagree, trust the repo and record the mismatch in the
appropriate working or review note.

## Sync Workflow

1. Edit the repo-local vault under `docs/obsidian/Xenesis-desk`.
2. Mirror changed files to `C:\Users\great\Documents\Obsidian Vault\Xenesis-desk`.
3. Update root index files on both sides if their links or reading order change.
4. Compare repo-local and external mirror by relative path and content hash.
5. Record the exact comparison result in `handoff.md`.

The root `Xenesis-desk.md` files may differ by byte hash if only BOM or line
endings differ. For Phase 1, prefer making them byte-identical unless Obsidian
rewrites the external file.

## Verification

Documentation-only Phase 1 verification should check:

- expected files exist
- root reading order links to `Final Goal`
- core notes have frontmatter and `## Graph Links`
- key repo paths referenced by core notes exist
- CR/MCP source paths exist
- test notes point to real verification commands
- repo-local and external vault mirrors match by relative path and hash

Runtime tests are not required for this documentation-only design. If a later
implementation adds scripts or changes CR/Agent/provider/approval code, use the
repo gates from `AGENTS.md`.

## Completion Criteria

Phase 1 is complete when:

- `00_System/Final Goal.md` exists and is linked from the vault root/read order.
- The Agent-control graph has usable module, architecture, API, data, and test
  notes.
- CR/MCP has category-level coverage and high-risk path handling.
- A reader can find source files, runtime/control flow, risks, and verification
  commands from the vault.
- Canonical notes remain English.
- Repo-local and external Obsidian mirrors are synchronized.
- The work is sufficient for an agent to prepare for CR/Agent/provider/approval
  work without starting from raw code search alone.

## Non-Goals

- No code implementation in this phase.
- No new automation scripts in this phase.
- No complete per-capability note explosion.
- No claim that Obsidian is the executable source of truth.
- No public-release runtime verification for documentation-only edits.
