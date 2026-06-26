$ErrorActionPreference = 'Stop'

$repoMirror = Join-Path (Get-Location) 'docs\obsidian'
$externalVault = 'C:\Users\great\Documents\Obsidian Vault'
$targets = @($repoMirror, $externalVault)
$date = '2026-06-26'

function Join-RelPath([string]$root, [string]$rel) {
  $path = $root
  foreach ($part in ($rel -split '/')) {
    if ($part.Length -gt 0) { $path = Join-Path $path $part }
  }
  return $path
}

function YamlList([string]$name, [string[]]$items) {
  if (-not $items -or $items.Count -eq 0) { return '' }
  $lines = @($name + ':')
  foreach ($item in $items) {
    $safe = $item.Replace('"', '\"')
    $lines += "  - `"$safe`""
  }
  return ($lines -join "`n")
}

function Lines([string[]]$items) {
  return ($items -join "`n")
}

function Frontmatter(
  [string]$type,
  [string]$risk = 'medium',
  [string]$policy = 'proposal_only',
  [string]$status = 'active',
  [string]$confidence = 'high',
  [string]$extra = ''
) {
  $extra = $extra.Replace('`n', "`n")
  $lines = @(
    '---',
    "type: $type",
    'repo: xenesis-desk',
    "status: $status",
    "risk: $risk",
    "ai_edit_policy: $policy",
    'ai_generated: false',
    'reviewed: true',
    "confidence: $confidence",
    "last_reviewed: $date"
  )
  if ($extra.Trim().Length -gt 0) { $lines += $extra.TrimEnd() }
  $lines += '---'
  return ($lines -join "`n")
}

function SimpleNote(
  [string]$type,
  [string]$risk,
  [string]$policy,
  [string]$title,
  [string]$purpose,
  [string]$extra = '',
  [string[]]$links = @('- Depends on [[Graph Schema]]')
) {
  $front = Frontmatter $type $risk $policy 'active' 'high' $extra
  $linkText = $links -join [Environment]::NewLine
  $text = @"
$front

# $title

## Purpose

$purpose

## Graph Links

$linkText
"@
  return $text
}

function ModuleNote(
  [string]$name,
  [string[]]$depends,
  [string[]]$verified,
  [string[]]$decided,
  [string[]]$touches,
  [string]$purpose
) {
  $extra = @(
    (YamlList 'depends_on' $depends),
    (YamlList 'verified_by' $verified),
    (YamlList 'decided_by' $decided),
    (YamlList 'risk_of' @('[[High Risk Areas]]')),
    (YamlList 'touches' $touches)
  ) | Where-Object { $_ -and $_.Trim().Length -gt 0 }
  $links = @()
  foreach ($item in $depends) { $links += "- Depends on $item" }
  foreach ($item in $verified) { $links += "- Verified by $item" }
  foreach ($item in $decided) { $links += "- Decided by $item" }
  $links += '- Risk appears in [[High Risk Areas]]'
  foreach ($item in $touches) { $links += "- Touches ``$item``" }
  $extraText = $extra -join "`n"
  return SimpleNote -type 'module' -risk 'high' -policy 'proposal_only' -title $name -purpose $purpose -extra $extraText -links $links
}

$files = [ordered]@{}

$files['Xenesis-desk.md'] = @"
$(Frontmatter 'index' 'medium' 'direct_edit_allowed' 'active' 'high' (Lines @('depends_on:', '  - "[[AI Agent Rules]]"', '  - "[[Graph Schema]]"', '  - "[[Source of Truth Map]]"')))

# Xenesis-desk

This is the AI-readable Obsidian knowledge graph entrypoint for Xenesis Desk.
It is a context and navigation layer, not the executable source of truth.

## Read First

1. [[AI Agent Rules]]
2. [[Graph Schema]]
3. [[Review Policy]]
4. [[Source of Truth Map]]
5. [[Module Index]]
6. [[High Risk Areas]]
7. [[Verification Map]]

## Core Graph Areas

- [[Repo Overview]]
- [[Capability Registry Architecture]]
- [[MCP Bridge Architecture]]
- [[Xenesis Agent Runtime]]
- [[Approval Flow]]
- [[Provider Model]]

## High-Value Modules

- [[module-capability-registry]]
- [[module-mcp-bridge]]
- [[module-xenesis-agent-pane]]
- [[module-provider-runtime]]
- [[module-approval-system]]

## API, Data, And Decisions

- [[capability-index]]
- [[mcp-tool-index]]
- [[ipc-surface-index]]
- [[http-bridge-index]]
- [[data-action-inbox]]
- [[data-provider-profile]]
- [[data-capability-approvals]]
- [[ADR-001-cr-first-control-plane]]
- [[ADR-002-approval-records-not-chat-text]]
- [[ADR-003-provider-selection-by-user-settings]]

## Graph Links

- Depends on [[AI Agent Rules]]
- Depends on [[Graph Schema]]
- Depends on [[Source of Truth Map]]
"@

$files['Xenesis-desk/00_System/AI Agent Rules.md'] = @"
$(Frontmatter 'system' 'high' 'direct_edit_allowed' 'active' 'high' (Lines @('depends_on:', '  - "[[Graph Schema]]"', '  - "[[Review Policy]]"', '  - "[[Source of Truth Map]]"')))

# AI Agent Rules

## Operating Rule

Agents use this vault as navigation, design intent, risk context, and handoff
memory. The repo remains the executable source of truth.

## Required Reading Order

1. Repo `AGENTS.md`
2. [[Xenesis-desk]]
3. [[AI Agent Rules]]
4. [[Graph Schema]]
5. [[Review Policy]]
6. [[Source of Truth Map]]
7. Relevant index notes under `_Indexes`
8. Relevant module, architecture, capability, data, test, ADR, risk, task, and handoff notes
9. Actual repo source files and tests

## Write Rules

- Read widely.
- Write directly only to `80_AI/Working Notes`, `80_AI/Review`, `80_AI/Outputs`, and `70_Tasks` by default.
- Treat canonical architecture, module, API, data, test, and ADR notes as proposal-first.
- If Obsidian and repo source disagree, trust the repo and record the mismatch in `handoff.md` and [[AI Review Queue]].

## Graph Links

- Depends on [[Graph Schema]]
- Depends on [[Review Policy]]
- Depends on [[Source of Truth Map]]
"@

$files['Xenesis-desk/00_System/Graph Schema.md'] = @"
$(Frontmatter 'system' 'high' 'direct_edit_allowed' 'active' 'high' (Lines @('depends_on:', '  - "[[AI Agent Rules]]"', '  - "[[Review Policy]]"', 'verified_by:', '  - "[[Verification Map]]"')))

# Graph Schema

## Purpose

Folders store notes by type. YAML properties and Obsidian wikilinks create the graph.

## Note Types

- `system`
- `repo-overview`
- `architecture`
- `module`
- `capability`
- `api`
- `data-store`
- `test`
- `adr`
- `task`
- `agent-handoff`
- `review`
- `risk`
- `index`
- `template`

## Common Properties

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

## Relation Properties

```yaml
depends_on:
implements:
verified_by:
decided_by:
touches:
handoff_for:
risk_of:
supersedes:
exposes:
called_by:
reads:
writes:
owned_by:
blocked_by:
```

Repeat meaningful YAML relations in a `## Graph Links` section.

## Graph Links

- Depends on [[AI Agent Rules]]
- Depends on [[Review Policy]]
- Verified by [[Verification Map]]
"@

$files['Xenesis-desk/00_System/Review Policy.md'] = @"
$(Frontmatter 'system' 'high' 'direct_edit_allowed' 'active' 'high' 'depends_on:`n  - "[[Graph Schema]]"')

# Review Policy

## Default Model

The default model is read-wide / write-review-only.

## Direct Write Areas

- `80_AI/Working Notes`
- `80_AI/Review`
- `80_AI/Outputs`
- `70_Tasks`

## Proposal-First Areas

- `20_Architecture`
- `30_Modules`
- `40_APIs`
- `50_Data`
- `60_Tests`
- `90_ADR`

## AI-Generated Defaults

```yaml
ai_generated: true
reviewed: false
confidence: low
status: draft
```

## Graph Links

- Depends on [[Graph Schema]]
- Reviewed through [[AI Review Queue]]
"@

$files['Xenesis-desk/00_System/Repo Reading Order.md'] = SimpleNote 'system' 'medium' 'direct_edit_allowed' 'Repo Reading Order' 'Defines the orientation order before CR, Agent, provider, approval, terminal, browser, or architecture work.' 'depends_on:`n  - "[[AI Agent Rules]]"`nverified_by:`n  - "[[Verification Map]]"' @('- Depends on [[AI Agent Rules]]', '- Verified by [[Verification Map]]')
$files['Xenesis-desk/00_System/Definition of Done.md'] = SimpleNote 'system' 'medium' 'direct_edit_allowed' 'Definition of Done' 'Defines completion evidence for Obsidian-guided Xenesis work.' 'depends_on:`n  - "[[Verification Map]]"' @('- Depends on [[Verification Map]]')
$files['Xenesis-desk/00_System/Glossary.md'] = SimpleNote 'system' 'low' 'direct_edit_allowed' 'Glossary' 'Defines shared terms for CR, MCP bridge, provider runtime, approval records, action inbox, and XCON/Gowoori surfaces.'
$files['Xenesis-desk/00_System/Coding Conventions.md'] = SimpleNote 'system' 'medium' 'direct_edit_allowed' 'Coding Conventions' 'Records scoped patch, CR-first, verification, and source-of-truth conventions.' 'depends_on:`n  - "[[Source of Truth Map]]"' @('- Depends on [[Source of Truth Map]]')
$files['Xenesis-desk/00_System/Template Index.md'] = SimpleNote 'system' 'medium' 'direct_edit_allowed' 'Template Index' 'Lists reusable templates for canonical and review notes.' 'depends_on:`n  - "[[Graph Schema]]"' @('- Depends on [[Graph Schema]]', '- Uses [[module-template]]', '- Uses [[architecture-template]]', '- Uses [[capability-template]]', '- Uses [[data-store-template]]', '- Uses [[adr-template]]', '- Uses [[task-template]]', '- Uses [[agent-handoff-template]]')

$files['Xenesis-desk/10_Repo Map/Source of Truth Map.md'] = @"
$(Frontmatter 'repo-overview' 'high' 'proposal_only' 'active' 'high' (Lines @('depends_on:', '  - "[[Repo Overview]]"', '  - "[[Graph Schema]]"', 'verified_by:', '  - "[[Verification Gates]]"')))

# Source of Truth Map

## Priority Order

1. Git repo source files, tests, generated CR docs, and verification commands
2. Repo-local Obsidian mirror at `docs/obsidian`
3. External Obsidian app mirror at `C:\Users\great\Documents\Obsidian Vault`
4. Agent working notes and handoff notes

## Key Repo Paths

| Area | Source |
|---|---|
| CR source | `src/shared/deskBridgeCapabilities.ts` |
| CR guide | `docs/capability-registry.md` |
| MCP server | `mcp/xenesis-desk-mcp-server.mjs` |
| Agent pane | `src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx` |
| Provider runtime | `packages/xenesis-agent-core/src/embeddedRuntime.ts`, `packages/xenesis/src/providers` |
| Approval records | `src/main/capabilityActionApproval.mjs`, `src/main/mcpActionInbox.mjs` |

If notes and repo source disagree, trust the repo and record the mismatch in
`handoff.md` and [[AI Review Queue]].

## Graph Links

- Depends on [[Repo Overview]]
- Depends on [[Graph Schema]]
- Verified by [[Verification Gates]]
"@

$files['Xenesis-desk/10_Repo Map/Repo Overview.md'] = SimpleNote 'repo-overview' 'high' 'proposal_only' 'Repo Overview' 'High-level map for the Xenesis Desk repo as represented by this Obsidian graph.' 'depends_on:`n  - "[[Source of Truth Map]]"`nverified_by:`n  - "[[Verification Map]]"' @('- Depends on [[Source of Truth Map]]', '- Verified by [[Verification Map]]', '- Includes [[module-capability-registry]]', '- Includes [[module-xenesis-agent-pane]]')
$files['Xenesis-desk/10_Repo Map/Directory Map.md'] = SimpleNote 'repo-overview' 'medium' 'proposal_only' 'Directory Map' 'Maps major repo folders to graph areas without copying source files.' 'depends_on:`n  - "[[Source of Truth Map]]"' @('- Depends on [[Source of Truth Map]]')
$files['Xenesis-desk/10_Repo Map/Verification Gates.md'] = SimpleNote 'test' 'high' 'proposal_only' 'Verification Gates' 'Lists verification commands for CR, Agent, provider, approval, and public-release work.' 'verified_by:`n  - "[[Verification Map]]"' @('- Verified by [[Verification Map]]')
$files['Xenesis-desk/10_Repo Map/Runtime Flow.md'] = SimpleNote 'architecture' 'high' 'proposal_only' 'Runtime Flow' 'Graph-level prompt to provider runtime to CR to approval to action to verification flow.' 'depends_on:`n  - "[[module-xenesis-agent-pane]]"`n  - "[[module-capability-registry]]"' @('- Depends on [[module-xenesis-agent-pane]]', '- Depends on [[module-capability-registry]]')
$files['Xenesis-desk/10_Repo Map/Entrypoints.md'] = SimpleNote 'repo-overview' 'medium' 'proposal_only' 'Entrypoints' 'Entry surfaces represented by this graph: CR, MCP, provider runtime, Agent pane, approval system, and verification commands.' 'depends_on:`n  - "[[Source of Truth Map]]"' @('- Depends on [[Source of Truth Map]]', '- See [[CR Surface Index]]')
$files['Xenesis-desk/10_Repo Map/Build and Deploy.md'] = SimpleNote 'repo-overview' 'medium' 'proposal_only' 'Build and Deploy' 'Build and public-release verification paths at graph level.' 'verified_by:`n  - "[[Verification Map]]"' @('- Verified by [[Verification Map]]')
$files['Xenesis-desk/10_Repo Map/Test Strategy.md'] = SimpleNote 'test' 'high' 'proposal_only' 'Test Strategy' 'Connects high-risk module notes to focused tests and verification gates.' 'verified_by:`n  - "[[Verification Map]]"' @('- Verified by [[Verification Map]]', '- Covers [[test-capability-audit]]', '- Covers [[test-live-agent-pane]]', '- Covers [[test-provider-smoke]]')

$files['Xenesis-desk/20_Architecture/Capability Registry Architecture.md'] = SimpleNote 'architecture' 'high' 'proposal_only' 'Capability Registry Architecture' 'The CR is the graph center for controllable Desk behavior. Typed tools and UI shortcuts must map back to CR behavior.' 'depends_on:`n  - "[[module-capability-registry]]"`nverified_by:`n  - "[[test-capability-audit]]"`ndecided_by:`n  - "[[ADR-001-cr-first-control-plane]]"' @('- Depends on [[module-capability-registry]]', '- Verified by [[test-capability-audit]]', '- Decided by [[ADR-001-cr-first-control-plane]]')
$files['Xenesis-desk/20_Architecture/MCP Bridge Architecture.md'] = SimpleNote 'architecture' 'high' 'proposal_only' 'MCP Bridge Architecture' 'Maps external MCP and provider tool access back to the same CR-first control surface.' 'depends_on:`n  - "[[module-mcp-bridge]]"`n  - "[[module-capability-registry]]"' @('- Depends on [[module-mcp-bridge]]', '- Depends on [[module-capability-registry]]', '- See [[mcp-tool-index]]')
$files['Xenesis-desk/20_Architecture/Xenesis Agent Runtime.md'] = SimpleNote 'architecture' 'high' 'proposal_only' 'Xenesis Agent Runtime' 'Describes how the native Agent pane, provider runtime, CR caller, approval system, and work log relate.' 'depends_on:`n  - "[[module-xenesis-agent-pane]]"`n  - "[[module-provider-runtime]]"`n  - "[[module-approval-system]]"' @('- Depends on [[module-xenesis-agent-pane]]', '- Depends on [[module-provider-runtime]]', '- Depends on [[module-approval-system]]')
$files['Xenesis-desk/20_Architecture/Approval Flow.md'] = SimpleNote 'architecture' 'high' 'proposal_only' 'Approval Flow' 'Approval-required actions create real approval records. Chat text alone is not approval evidence.' 'depends_on:`n  - "[[module-approval-system]]"`ndecided_by:`n  - "[[ADR-002-approval-records-not-chat-text]]"' @('- Depends on [[module-approval-system]]', '- Decided by [[ADR-002-approval-records-not-chat-text]]')
$files['Xenesis-desk/20_Architecture/Provider Model.md'] = SimpleNote 'architecture' 'high' 'proposal_only' 'Provider Model' 'Provider identity comes from user settings/profile. Local CLI selection remains separate from provider identity.' 'depends_on:`n  - "[[module-provider-runtime]]"`ndecided_by:`n  - "[[ADR-003-provider-selection-by-user-settings]]"' @('- Depends on [[module-provider-runtime]]', '- Decided by [[ADR-003-provider-selection-by-user-settings]]')

$files['Xenesis-desk/30_Modules/module-capability-registry.md'] = ModuleNote 'module-capability-registry' @('[[Source of Truth Map]]') @('[[test-capability-audit]]', '[[Verification Gates]]') @('[[ADR-001-cr-first-control-plane]]') @('src/shared/deskBridgeCapabilities.ts', 'docs/capability-registry.md') 'Owns the stable `xd.*` Desk control contract, capability metadata, dispatch mapping, approval policy, and CR audit expectations.'
$files['Xenesis-desk/30_Modules/module-mcp-bridge.md'] = ModuleNote 'module-mcp-bridge' @('[[module-capability-registry]]') @('[[test-capability-audit]]') @('[[ADR-001-cr-first-control-plane]]') @('mcp/xenesis-desk-mcp-server.mjs') 'Exposes Desk control and context to external agents through MCP while preserving CR-first behavior.'
$files['Xenesis-desk/30_Modules/module-xenesis-agent-pane.md'] = ModuleNote 'module-xenesis-agent-pane' @('[[module-provider-runtime]]', '[[module-approval-system]]') @('[[test-live-agent-pane]]') @('[[ADR-002-approval-records-not-chat-text]]') @('src/renderer/extensions/xenesis-desk.core-tools/panes/XenesisAgentPane.tsx') 'Native agent surface where user prompts, provider runtime results, work logs, approval UI, and Desk actions meet.'
$files['Xenesis-desk/30_Modules/module-provider-runtime.md'] = ModuleNote 'module-provider-runtime' @('[[module-capability-registry]]') @('[[test-provider-smoke]]') @('[[ADR-003-provider-selection-by-user-settings]]') @('packages/xenesis-agent-core/src/embeddedRuntime.ts', 'packages/xenesis/src/providers') 'Selects and runs the configured reasoning provider while keeping local CLI choice separate from provider identity.'
$files['Xenesis-desk/30_Modules/module-approval-system.md'] = ModuleNote 'module-approval-system' @('[[module-capability-registry]]') @('[[test-live-agent-pane]]') @('[[ADR-002-approval-records-not-chat-text]]') @('src/main/capabilityActionApproval.mjs', 'src/main/mcpActionInbox.mjs', 'src/preload/index.ts') 'Creates and resolves real approval records for actions that cross risk or workspace boundaries.'

$files['Xenesis-desk/40_APIs/capability-index.md'] = SimpleNote 'capability' 'high' 'proposal_only' 'capability-index' 'Indexes the Capability Registry surface and points agents to source-of-truth repo files.' 'implements:`n  - "[[module-capability-registry]]"`nverified_by:`n  - "[[test-capability-audit]]"`ntouches:`n  - "src/shared/deskBridgeCapabilities.ts"`n  - "docs/capability-registry-list.md"' @('- Implements [[module-capability-registry]]', '- Verified by [[test-capability-audit]]', '- Touches `src/shared/deskBridgeCapabilities.ts`', '- Touches `docs/capability-registry-list.md`')
$files['Xenesis-desk/40_APIs/mcp-tool-index.md'] = SimpleNote 'api' 'high' 'proposal_only' 'mcp-tool-index' 'Indexes MCP tool exposure for Xenesis Desk and maps it back to CR behavior.' 'depends_on:`n  - "[[module-mcp-bridge]]"`nverified_by:`n  - "[[test-capability-audit]]"`ntouches:`n  - "mcp/xenesis-desk-mcp-server.mjs"' @('- Depends on [[module-mcp-bridge]]', '- Verified by [[test-capability-audit]]', '- Touches `mcp/xenesis-desk-mcp-server.mjs`')
$files['Xenesis-desk/40_APIs/ipc-surface-index.md'] = SimpleNote 'api' 'high' 'proposal_only' 'ipc-surface-index' 'Indexes Electron main/preload IPC boundaries relevant to Desk control.' 'depends_on:`n  - "[[module-capability-registry]]"`ntouches:`n  - "src/main/index.ts"`n  - "src/preload/index.ts"' @('- Depends on [[module-capability-registry]]', '- Touches `src/main/index.ts`', '- Touches `src/preload/index.ts`')
$files['Xenesis-desk/40_APIs/http-bridge-index.md'] = SimpleNote 'api' 'high' 'proposal_only' 'http-bridge-index' 'Indexes HTTP bridge surfaces that external tools use to reach Desk behavior.' 'depends_on:`n  - "[[module-mcp-bridge]]"`ntouches:`n  - "mcp/xenesis-desk-mcp-server.mjs"`n  - "src/main/index.ts"' @('- Depends on [[module-mcp-bridge]]', '- Touches `mcp/xenesis-desk-mcp-server.mjs`', '- Touches `src/main/index.ts`')

$dataSpecs = @(
  @{Name='data-xenis-home'; Touch=@('src/main/xenisHome.mjs')},
  @{Name='data-action-inbox'; Touch=@('src/main/mcpActionInbox.mjs')},
  @{Name='data-provider-profile'; Touch=@('packages/xenesis/src/config/profiles.ts', 'src/main/index.ts')},
  @{Name='data-session-logs'; Touch=@('packages/xenesis/src/sessions')},
  @{Name='data-capability-approvals'; Touch=@('src/main/capabilityActionApproval.mjs', 'src/main/index.ts')}
)
foreach ($d in $dataSpecs) {
  $extra = @(
    (YamlList 'reads' @('[[module-provider-runtime]]')),
    (YamlList 'writes' @('[[module-approval-system]]')),
    (YamlList 'verified_by' @('[[Verification Map]]')),
    (YamlList 'touches' $d.Touch)
  ) -join "`n"
  $links = @('- Read by [[module-provider-runtime]]', '- Written by [[module-approval-system]]', '- Verified by [[Verification Map]]') + ($d.Touch | ForEach-Object { "- Touches ``$_``" })
  $files["Xenesis-desk/50_Data/$($d.Name).md"] = SimpleNote 'data-store' 'high' 'proposal_only' $d.Name 'Describes what state is stored and which Desk behavior depends on it.' $extra $links
}

$files['Xenesis-desk/60_Tests/Test Map.md'] = SimpleNote 'test' 'high' 'proposal_only' 'Test Map' 'Connects graph modules to focused verification commands and live checks.' 'depends_on:`n  - "[[Verification Map]]"' @('- Depends on [[Verification Map]]')
$files['Xenesis-desk/60_Tests/test-capability-audit.md'] = SimpleNote 'test' 'high' 'proposal_only' 'test-capability-audit' 'Verifies CR coverage, registry paths, dispatcher wiring, and generated capability documentation.' 'verified_by:`n  - "[[Verification Map]]"`ntouches:`n  - "scripts/capabilityCoverageAudit.mjs"' @('- Verified by [[Verification Map]]', '- Touches `scripts/capabilityCoverageAudit.mjs`')
$files['Xenesis-desk/60_Tests/test-live-agent-pane.md'] = SimpleNote 'test' 'high' 'proposal_only' 'test-live-agent-pane' 'Represents live Electron Agent pane verification for CR, approval, provider, and Desk-control behavior.' 'verified_by:`n  - "[[Verification Map]]"' @('- Verified by [[Verification Map]]', '- Covers [[module-xenesis-agent-pane]]', '- Covers [[module-approval-system]]')
$files['Xenesis-desk/60_Tests/test-provider-smoke.md'] = SimpleNote 'test' 'high' 'proposal_only' 'test-provider-smoke' 'Verifies provider runtime configuration, credentials, and provider selection behavior.' 'verified_by:`n  - "[[Verification Map]]"' @('- Verified by [[Verification Map]]', '- Covers [[module-provider-runtime]]')
$files['Xenesis-desk/60_Tests/Critical Regression Tests.md'] = SimpleNote 'test' 'high' 'proposal_only' 'Critical Regression Tests' 'Lists the highest-value regression areas for CR, provider, approval, and live Agent pane behavior.' 'depends_on:`n  - "[[High Risk Areas]]"' @('- Depends on [[High Risk Areas]]', '- See [[test-capability-audit]]', '- See [[test-live-agent-pane]]', '- See [[test-provider-smoke]]')

$files['Xenesis-desk/70_Tasks/Open Tasks.md'] = SimpleNote 'task' 'medium' 'direct_edit_allowed' 'Open Tasks' 'Tracks open graph maintenance work that has not become a code task.' 'touches:`n  - "[[AI Review Queue]]"`n  - "[[Review Queue]]"' @('- Touches [[AI Review Queue]]', '- Touches [[Review Queue]]')
$files['Xenesis-desk/70_Tasks/Refactor Candidates.md'] = SimpleNote 'task' 'medium' 'direct_edit_allowed' 'Refactor Candidates' 'Tracks future graph and repo refactor candidates discovered during agent work.' 'depends_on:`n  - "[[Review Policy]]"' @('- Depends on [[Review Policy]]')
$files['Xenesis-desk/70_Tasks/Review Queue.md'] = SimpleNote 'task' 'medium' 'direct_edit_allowed' 'Review Queue' 'Tracks human-review queue items for graph changes, stale notes, and AI-generated outputs.' 'depends_on:`n  - "[[AI Review Queue]]"' @('- Depends on [[AI Review Queue]]')

$files['Xenesis-desk/80_AI/Working Notes/Restore Obsidian Vault - 2026-06-26.md'] = @"
---
type: agent-handoff
repo: xenesis-desk
status: active
risk: medium
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-26
handoff_for:
  - "[[Graph Schema]]"
touches:
  - "docs/obsidian"
  - "C:\Users\great\Documents\Obsidian Vault"
---

# Restore Obsidian Vault - 2026-06-26

## Summary

The original external Obsidian files were absent from disk and not found in the
Recycle Bin. This vault was reconstructed from the surviving graph design,
implementation plan, and handoff evidence.

## Graph Links

- Handoff for [[Graph Schema]]
- Touches [[Source of Truth Map]]
"@
$files['Xenesis-desk/80_AI/Review/README.md'] = SimpleNote 'review' 'medium' 'direct_edit_allowed' 'AI Review Folder' 'Holds AI-generated or proposal notes that need human review before canonical promotion.' 'depends_on:`n  - "[[Review Policy]]"' @('- Depends on [[Review Policy]]')
$files['Xenesis-desk/80_AI/Outputs/README.md'] = SimpleNote 'review' 'medium' 'direct_edit_allowed' 'AI Outputs Folder' 'Holds draft AI outputs. These are not canonical until reviewed.' 'depends_on:`n  - "[[Review Policy]]"' @('- Depends on [[Review Policy]]')

$files['Xenesis-desk/90_ADR/ADR-001-cr-first-control-plane.md'] = @"
$(Frontmatter 'adr' 'high' 'proposal_only' 'accepted' 'high' (Lines @('date: 2026-06-26', 'touches:', '  - "[[module-capability-registry]]"', 'verified_by:', '  - "[[test-capability-audit]]"')))

# ADR-001 CR-first control plane

## Context

Desk operations, automation, and agent-to-Desk control need one stable contract.

## Decision

The Capability Registry is the source of truth for controllable Desk behavior.
Typed tools and UI shortcuts are wrappers that must map back to CR behavior.

## Consequences

- CR coverage is a release gate.
- New control surfaces require a registry decision.
- Agents should discover and call CR paths before using ad hoc paths.

## Graph Links

- Decides [[module-capability-registry]]
- Verified by [[test-capability-audit]]
"@
$files['Xenesis-desk/90_ADR/ADR-002-approval-records-not-chat-text.md'] = @"
$(Frontmatter 'adr' 'high' 'proposal_only' 'accepted' 'high' (Lines @('date: 2026-06-26', 'touches:', '  - "[[module-approval-system]]"', '  - "[[module-xenesis-agent-pane]]"', 'verified_by:', '  - "[[test-live-agent-pane]]"')))

# ADR-002 approval records not chat text

## Context

Approval-required actions need durable evidence that can be audited and resolved
by Desk UI, not simulated by assistant prose.

## Decision

Approval-required actions must create real approval records and normal
Agent-pane text must not expose raw approval internals.

## Consequences

- Chat text is not approval evidence.
- Action Inbox is an audit/backstop surface.
- The primary approval UX is an inline approval card in the Agent pane.

## Graph Links

- Decides [[module-approval-system]]
- Decides [[module-xenesis-agent-pane]]
- Verified by [[test-live-agent-pane]]
"@
$files['Xenesis-desk/90_ADR/ADR-003-provider-selection-by-user-settings.md'] = @"
$(Frontmatter 'adr' 'high' 'proposal_only' 'accepted' 'high' (Lines @('date: 2026-06-26', 'touches:', '  - "[[module-provider-runtime]]"', 'verified_by:', '  - "[[test-provider-smoke]]"')))

# ADR-003 provider selection by user settings

## Context

Provider selection must reflect user settings/profile and must not silently fall
back to a hardcoded provider.

## Decision

Provider selection comes from user settings/profile; local CLI selection is
separate from provider identity.

## Consequences

- BYOK is one provider mode, not the provider system itself.
- Missing credentials should produce honest credential errors.
- Local CLI selection and provider enum must stay orthogonal.

## Graph Links

- Decides [[module-provider-runtime]]
- Verified by [[test-provider-smoke]]
"@

$files['Xenesis-desk/_Indexes/Module Index.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'Module Index' 'Lists canonical notes with `type: module`.' 'depends_on:`n  - "[[Graph Schema]]"' @('- Depends on [[Graph Schema]]', '- [[module-capability-registry]]', '- [[module-mcp-bridge]]', '- [[module-xenesis-agent-pane]]', '- [[module-provider-runtime]]', '- [[module-approval-system]]')
$files['Xenesis-desk/_Indexes/High Risk Areas.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'High Risk Areas' 'Lists notes with `risk: high`.' 'depends_on:`n  - "[[Graph Schema]]"' @('- Depends on [[Graph Schema]]', '- Includes [[module-capability-registry]]', '- Includes [[module-mcp-bridge]]', '- Includes [[module-xenesis-agent-pane]]', '- Includes [[module-provider-runtime]]', '- Includes [[module-approval-system]]', '- Includes [[Approval Flow]]', '- Includes [[Provider Model]]')
$files['Xenesis-desk/_Indexes/CR Surface Index.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'CR Surface Index' 'Lists capability and API notes that represent public Desk control surfaces.' 'depends_on:`n  - "[[Capability Registry Architecture]]"' @('- Depends on [[Capability Registry Architecture]]', '- Includes [[capability-index]]', '- Includes [[mcp-tool-index]]', '- Includes [[ipc-surface-index]]', '- Includes [[http-bridge-index]]')
$files['Xenesis-desk/_Indexes/AI Review Queue.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'AI Review Queue' 'Lists notes with `reviewed: false` or `ai_generated: true`.' 'depends_on:`n  - "[[Review Policy]]"' @('- Depends on [[Review Policy]]', '- Watches `80_AI/Review`', '- Watches `80_AI/Outputs`', '- Watches `80_AI/Working Notes`')
$files['Xenesis-desk/_Indexes/Outdated Notes.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'Outdated Notes' 'Lists notes whose `last_reviewed` needs refresh after source code changes.' 'depends_on:`n  - "[[Source of Truth Map]]"' @('- Depends on [[Source of Truth Map]]')
$files['Xenesis-desk/_Indexes/Open Tasks.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'Open Tasks Index' 'Lists canonical task notes with `status: open` or `status: active`.' 'depends_on:`n  - "[[Review Policy]]"' @('- Depends on [[Review Policy]]', '- Includes [[Open Tasks]]', '- Includes [[Refactor Candidates]]', '- Includes [[Review Queue]]')
$files['Xenesis-desk/_Indexes/ADR Index.md'] = SimpleNote 'index' 'medium' 'direct_edit_allowed' 'ADR Index' 'Lists architecture decisions and their affected modules.' 'depends_on:`n  - "[[Graph Schema]]"' @('- Depends on [[Graph Schema]]', '- Includes [[ADR-001-cr-first-control-plane]]', '- Includes [[ADR-002-approval-records-not-chat-text]]', '- Includes [[ADR-003-provider-selection-by-user-settings]]')
$files['Xenesis-desk/_Indexes/Verification Map.md'] = @"
$(Frontmatter 'index' 'medium' 'direct_edit_allowed' 'active' 'high' 'depends_on:`n  - "[[Verification Gates]]"')

# Verification Map

## Filter Intent

Map graph areas to repo verification commands.

## Commands

| Area | Command |
|---|---|
| Root typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| CR audit | `npm run docs:capabilities:audit` |
| Xenesis tests | `npm --prefix packages/xenesis test` |
| Xenesis typecheck | `npm --prefix packages/xenesis run typecheck` |
| Xenesis build | `npm --prefix packages/xenesis run build` |
| Provider smoke | `npm --prefix packages/xenesis run provider:smoke` |
| Public release | `npm run check:public-release` |
| Live Agent pane | Electron app + natural-language Desk-control prompt |

## Graph Links

- Depends on [[Verification Gates]]
"@

$templateNames = @('module-template','architecture-template','capability-template','data-store-template','adr-template','task-template','agent-handoff-template')
foreach ($t in $templateNames) {
  $typeName = if ($t -eq 'architecture-template') { 'architecture' } elseif ($t -eq 'capability-template') { 'capability' } elseif ($t -eq 'data-store-template') { 'data-store' } elseif ($t -eq 'adr-template') { 'adr' } elseif ($t -eq 'task-template') { 'task' } elseif ($t -eq 'agent-handoff-template') { 'agent-handoff' } else { 'module' }
  $files["Xenesis-desk/_Templates/$t.md"] = @"
$(Frontmatter 'template' 'low' 'direct_edit_allowed')

# $t

~~~markdown
---
type: $typeName
repo: xenesis-desk
status: active
risk: medium
ai_edit_policy: proposal_only
ai_generated: false
reviewed: true
confidence: high
last_reviewed: 2026-06-26
depends_on: []
verified_by: []
touches: []
---

# note-name

## Purpose

Describe the note purpose.

## Graph Links

- Depends on [[Repo Overview]]
~~~
"@
}

foreach ($target in $targets) {
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  foreach ($entry in $files.GetEnumerator()) {
    $full = Join-RelPath $target $entry.Key
    $dir = Split-Path -Parent $full
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    Set-Content -LiteralPath $full -Value ($entry.Value.TrimStart("`r", "`n")) -Encoding UTF8
  }
}

[pscustomobject]@{
  RepoMirror = $repoMirror
  ExternalVault = $externalVault
  FilesWrittenPerTarget = $files.Count
}
