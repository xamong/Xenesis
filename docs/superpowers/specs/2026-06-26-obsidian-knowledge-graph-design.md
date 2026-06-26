# Xenesis Desk Obsidian Knowledge Graph Design

## Goal

Build the Xenesis Desk Obsidian vault as an AI-readable knowledge graph, not as a
plain documentation folder. The primary goal is an agent operations graph: an
agent should be able to follow notes and properties to find relevant context,
risk areas, allowed write behavior, and verification paths before touching the
repo. The secondary goal is an architecture graph for humans and agents to
understand Capability Registry, MCP, Agent, provider, approval, data, test, and
ADR relationships.

## Scope

This design applies to the companion Obsidian vault:

`C:\Users\great\Documents\Obsidian Vault\Xenesis-desk`

The executable source of truth remains:

`E:\xenesis-original\xenesis-desk`

The first implementation phase should upgrade the existing Phase 1 vault notes
into a structured graph. It should not bulk-generate a large note set before the
schema, templates, review policy, and indexes are stable.

## Strategy

Use a schema-first rollout:

1. Define the graph schema.
2. Define note-type templates.
3. Define Markdown index views.
4. Upgrade the existing Phase 1 notes to the schema.
5. Add a curated seed graph for high-value CR/Agent areas.
6. Add automation later for extraction and review-queue generation.

Automation is a later expansion, not the starting point. Generated notes must
enter a review workflow before becoming canonical graph nodes.

## Knowledge Graph Model

Folders are stable storage locations by note type. The graph is created through
YAML properties plus Obsidian wikilinks in note bodies.

### Note Types

The initial schema supports these values:

```yaml
type:
  - system
  - repo-overview
  - architecture
  - module
  - capability
  - api
  - data-store
  - test
  - adr
  - task
  - agent-handoff
  - review
  - risk
  - index
  - template
```

### Common Properties

All canonical notes should use these fields where applicable:

```yaml
repo: xenesis-desk
status: active
risk: low | medium | high
ai_edit_policy: read_only | proposal_only | direct_edit_allowed
ai_generated: false
reviewed: true
confidence: high | medium | low
last_reviewed: 2026-06-26
```

### Relation Properties

Relations should be stored in YAML and repeated in a `## Graph Links` section so
both Bases-style views and human graph reading work.

Core relations:

```yaml
depends_on:
implements:
verified_by:
decided_by:
touches:
handoff_for:
risk_of:
supersedes:
```

Optional domain relations:

```yaml
exposes:
called_by:
reads:
writes:
owned_by:
blocked_by:
```

Use only the relations that are meaningful for the note type. For example,
module notes usually need `depends_on`, `verified_by`, `risk_of`, and `touches`;
capability notes usually need `implements`, `called_by`, and `verified_by`;
data-store notes usually need `reads` and `writes`.

### Naming

Prefer stable kebab-case names for canonical notes:

```text
module-capability-registry.md
arch-agent-runtime-flow.md
capability-xd-terminals-run.md
api-mcp-xenesis-desk-call-capability.md
data-action-inbox.md
test-capability-audit.md
ADR-001-cr-first-control-plane.md
risk-approval-bypass.md
```

Existing Phase 1 title-style notes should be upgraded gradually. Do not do a
large rename sweep until links and aliases are accounted for.

## Vault Structure

The target structure is:

```text
Xenesis-desk/
  00_System/
  10_Repo Map/
  20_Architecture/
  30_Modules/
  40_APIs/
  50_Data/
  60_Tests/
  70_Tasks/
  80_AI/
    Working Notes/
    Review/
    Outputs/
  90_ADR/
  _Indexes/
  _Templates/
```

Phase 2A should create the missing directories and seed these system notes:

- `00_System/Graph Schema.md`
- `00_System/Review Policy.md`
- `00_System/Template Index.md`
- `10_Repo Map/Source of Truth Map.md`

It should also create templates under `_Templates` and Markdown index notes
under `_Indexes`.

## Index Views

Start with Markdown index notes instead of `.base` files. Markdown is stable,
agent-readable, and easy to inspect. `.base` views can be added later once the
schema proves stable.

Initial indexes:

- `Module Index`
- `High Risk Areas`
- `CR Surface Index`
- `AI Review Queue`
- `Outdated Notes`
- `Open Tasks`
- `ADR Index`
- `Verification Map`

Each index should explain its filter intent in plain Markdown and list the seed
notes that currently belong there. Later automation may regenerate or augment
these indexes.

## Agent Workflow

Agents should read in this order:

1. Repo `AGENTS.md`
2. Vault root `Xenesis-desk.md`
3. `00_System/AI Agent Rules.md`
4. `00_System/Graph Schema.md`
5. `10_Repo Map/Repo Overview.md`
6. `_Indexes/*`
7. Relevant module, architecture, capability, data, test, ADR, risk, and handoff
   notes
8. Actual repo source files
9. Actual tests and verification commands

If Obsidian and the repo disagree, the repo wins. Record the mismatch in
`handoff.md` for active work and in `80_AI/Review` for graph maintenance.

## Write Policy

The default model is read-wide / write-review-only.

Agents may write directly to:

```text
80_AI/Working Notes/
80_AI/Review/
80_AI/Outputs/
70_Tasks/
```

Canonical areas are proposal-only by default:

```text
20_Architecture/
30_Modules/
40_APIs/
50_Data/
60_Tests/
90_ADR/
```

Allowed direct canonical edits are limited to:

- Updating `last_reviewed`
- Fixing obvious repo path typos
- Creating a new canonical note when the user explicitly approved that scope
- Applying an approved implementation plan

AI-generated notes should default to:

```yaml
ai_generated: true
reviewed: false
confidence: low
status: draft
```

Reviewed canonical notes should use:

```yaml
ai_generated: false
reviewed: true
confidence: high
status: active
```

## Automation Roadmap

Automation begins only after Phase 2A and curated seed notes are stable.

Candidate scripts:

```text
scripts/generate-obsidian-code-map.ts
scripts/extract-cr-capabilities.ts
scripts/extract-mcp-tools.ts
scripts/extract-ipc-surface.ts
scripts/extract-test-map.ts
scripts/check-obsidian-links.ts
```

Generated notes or index entries should use:

```yaml
generated: true
ai_generated: true
reviewed: false
confidence: low
source: repo-scan
```

Generated output should go to `80_AI/Review` or a generated review folder until
a human accepts it into the canonical graph.

## Verification

Documentation-only graph work should verify:

- Expected directories exist.
- Expected notes exist.
- Required common properties exist on seed canonical notes.
- `## Graph Links` sections exist where relations are present.
- Key repo paths referenced by seed notes exist.
- Root index and AI rules link to the new graph schema and review policy.
- `AGENTS.md` describes the vault reading and write policy.

Runtime tests are not required for documentation-only vault graph changes. Code
automation added later must have focused verification and should use existing
repo gates when it touches CR, Agent, provider, or approval behavior.

## Completion Criteria

The work is complete when an agent can receive a CR/Agent/provider/approval
task, follow the Obsidian graph to relevant module, architecture, capability,
data, test, ADR, risk, and handoff context, determine whether it may write
directly or must create a review proposal, and identify the relevant repo
verification path before editing source code.
