---
type: agent-handoff
repo: xenesis-desk
status: verified
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: high
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Capability Registry Architecture]]"
  - "[[module-capability-registry]]"
touches:
  - "src/shared/xenesisConnections.ts"
  - "src/shared/deskBridgeCapabilities.ts"
  - "src/main/index.ts"
  - "src/renderer/panes/xenesisConnectionCenter.ts"
  - "src/renderer/panes/SettingsPane.tsx"
  - "docs/capability-registry-list.md"
  - "docs/capability-registry-audit.md"
---

# Tool Profile Draft Apply Delegation

## Objective

Add an approval-gated CR apply path for ready external tool profile drafts,
without adding provider-specific routing or new OAuth/token/provider-tool
execution.

## Scope Boundary

- New path: `xd.xenesis.tools.profileDrafts.apply`.
- Only ready tool profile drafts can expose the path.
- The path delegates to the existing ready
  `xd.xenesis.tools.mcpInstallDrafts.apply` implementation.
- Missing-env tools and planned OAuth tools remain review-only.
- The path does not complete OAuth, store credentials, store tokens, run shell
  commands, execute provider tools, or mutate external systems.
- The path does not add natural-language routing, deterministic intent
  catalogs, keyword matching, or prompt heuristics.

## Implementation Notes

- Shared read model exposes profile-draft apply only when the owning
  `mcpInstallDraft` is also ready and already exposes
  `xd.xenesis.tools.mcpInstallDrafts.apply`.
- Capability Registry metadata uses `permission: write` and
  `approval: when-external`.
- Main adapter validates profile draft readiness first, then delegates to MCP
  install draft apply and returns `delegatedPath` in readback.
- Settings renders a profile-draft apply button only when the CR control path is
  present.

## Verification Plan

- `npx tsx --test src\shared\xenesisConnections.test.ts`
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
- `npm run typecheck`
- `npm --prefix packages/xenesis run typecheck`
- `npm run docs:capabilities:audit`
- `git diff --check`

## Verification Result

- `npx tsx --test src\shared\xenesisConnections.test.ts` passed 45/45.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
  45/45.
- `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed
  72/72.
- `npm run typecheck` passed.
- `npm --prefix packages/xenesis run typecheck` passed.
- `npm run docs:capabilities` regenerated the capability registry list.
- `npm run docs:capabilities:audit` passed with 801 nodes and 689 coverage path
  references; missing registered paths, missing dispatched coverage paths,
  undispatched static callable methods, and dispatcher paths missing from tree
  are all 0.
- `npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke` passed
  8/8 and kept the no-hardcoded tool profile draft CR path guard.
- `npm --prefix packages/xenesis test` passed 81 files / 372 tests.
- `npm run build` passed.
- `git diff --check` exited 0 with LF/CRLF normalization warnings only.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Capability Registry Architecture]]
- Touches [[module-capability-registry]]
