---
type: task
repo: xenesis-desk
aliases:
  - Reference Adoption Map Proposal
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
  - "[[Review Policy]]"
  - "[[Source of Truth Map]]"
---

# Reference Adoption Map Proposal

This is the proposal-stage reference adoption map for the final-goal slices.
It is not the executable source of truth, and it is not yet the canonical
`20_Architecture/Reference Adoption Map.md`.

Promote this into `20_Architecture` only after the relevant implementation
slice is verified or explicitly approved.

## Required Record Shape

| Field | Required content |
|---|---|
| Reference analysis | Exact analysis note path under `F:\agent-anal\analysis`. |
| Original source checked | Exact source files under `F:\agent-anal\openclaw-main` or `F:\agent-anal\hermes-agent-main`. |
| Borrowed pattern | Behavior or verification idea being adapted. |
| Xenesis adaptation | CR path, renderer surface, provider/runtime boundary, approval model, and readback. |
| Rejected behavior | Anything not ported, especially prompt keyword routing or chat-only approval. |
| Verification | Focused tests, CR audit, live smoke, or manual live prompt evidence. |

## Slice Records

### Slice 01: Live CR Baseline

| Field | Record |
|---|---|
| Reference analysis | `F:\agent-anal\analysis\_xenesis-gap-shared-context.md`; `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md`; `F:\agent-anal\analysis\openclaw-main\12-channels-routing.md`; `F:\agent-anal\analysis\hermes-agent-main\08-channels-ui.md` |
| Original source checked | `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`; `F:\agent-anal\openclaw-main\src\routing\session-key.ts`; `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`; `F:\agent-anal\hermes-agent-main\tui_gateway\server.py`; `F:\agent-anal\hermes-agent-main\tui_gateway\ws.py`; `F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs` |
| Borrowed pattern | Stable explicit proof surfaces, session/readback evidence, and audit-backed routing coverage. |
| Xenesis adaptation | Use CR calls `xd.xenesis.connections.open`, `xd.testing.connectionCenter.snapshot`, `xd.testing.xenesisAgent.submitPrompt`, and `xd.mcp.actionInbox.list`; require exact `reference-baseline:*` checks and Action Inbox readback. |
| Rejected behavior | Prompt keyword routing, hidden provider fallbacks, provider-specific CR shortcuts, chat-only approval text, and treating fenced action smoke as provider NL tool-selection proof. |
| Verification | `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`; `node --test scripts\xenesisReviewRequestApprovalLiveSmoke.test.mjs`; `node --test src\main\capabilityActionApproval.test.mjs`; `node --test src\main\mcpActionInbox.test.mjs`; `npm run docs:capabilities:audit`; `node scripts\assertCapabilityAuditZero.mjs`; live smoke commands recorded in `handoff.md`. |

### Slice 02: Provider Onboarding

| Field | Record |
|---|---|
| Reference analysis | `F:\agent-anal\analysis\hermes-agent-main\03-llm-provider-abstraction.md`; `F:\agent-anal\analysis\openclaw-main\05-provider-extensions.md`; `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md` |
| Original source checked | Hermes provider abstraction/runtime footer/config notes and OpenClaw provider registration/plugin-boundary notes from `F:\agent-anal`; exact source paths remain in [[Slice Spec 02 Provider Onboarding]]. |
| Borrowed pattern | Declarative provider identity, runtime/provider metadata readback, adapter boundary separation, credential scan/auth mode surfaced as data, and explicit provider readiness checks. |
| Xenesis adaptation | Desk/provider status and Connection Center readbacks expose requested/resolved provider, source, auth mode, credential state/source, process model, diagnostics, and local CLI boundary. Package core/CLI/connect paths use the provider resolution contract before constructing providers. |
| Rejected behavior | Deterministic natural-language routing, mock reasoning provider, silent provider fallback, raw secret exposure, and provider-specific CR implementations. |
| Verification | `node --test src\main\xenesisService.test.mjs`; `npx tsx --test src\shared\xenesisConnections.test.ts`; `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts`; `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`; `npx tsx --test packages\xenesis-agent-core\src\embeddedAgentRuntime.test.ts`; `npm --prefix packages/xenesis exec vitest run src/providers/runtimeProviderResolution.test.ts tests/s3s4/providerFactoryWiring.test.ts tests/s3s4/connectProviderReadiness.test.ts`; `node --test scripts\xenesisProviderOnboardingLiveSmoke.test.mjs`; final gates pending in `handoff.md`. |

### Slice 03: External Tools MCP/OAuth

| Field | Record |
|---|---|
| Reference analysis | `F:\agent-anal\analysis\openclaw-main\06-mcp-integration.md`; `F:\agent-anal\analysis\hermes-agent-main\07-mcp-integration.md`; `F:\agent-anal\analysis\xenesis-gaps-vs-references.ko.md` |
| Original source checked | `F:\agent-anal\hermes-agent-main\tools\mcp_tool.py`; `F:\agent-anal\hermes-agent-main\tools\mcp_oauth.py`; `F:\agent-anal\hermes-agent-main\tools\mcp_oauth_manager.py`; `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-runtime.ts`; `F:\agent-anal\openclaw-main\src\agents\agent-bundle-mcp-materialize.ts`; `F:\agent-anal\openclaw-main\src\agents\mcp-transport.ts`; `F:\agent-anal\openclaw-main\src\agents\mcp-oauth.ts`; `F:\agent-anal\openclaw-main\src\agents\mcp-config-shared.ts`; `F:\agent-anal\openclaw-main\src\agents\codex-mcp-config.ts` |
| Borrowed pattern | External tool readiness is explicit data: MCP template/materialization metadata, OAuth readiness/setup state, credential references, scopes, token-store ownership, runtime readbacks, and action-policy boundaries. |
| Xenesis adaptation | Connection Center/CR readbacks expose Notion MCP readiness, Google Calendar OAuth setup packet and runtime readiness, Linear MCP OAuth readiness, setup-plan/user-story workflow previews, and approval-gated apply paths. Tool profile apply delegates only through ready MCP install draft apply. |
| Rejected behavior | Starting OAuth during setup readback, storing tokens, writing MCP config from setup packet/runtime/status paths, executing provider tools, leaking secret literal values, local natural-language routing, and side-effectful workflow preview steps. |
| Verification | Focused evidence passed: `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs`; `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`. Broad evidence passed: CR audit/audit-zero, root and package typecheck, root build, Connection Center live smoke 14/14, provider onboarding live smoke 9/9, package tests/build/provider smoke. Residual repo-level gaps: existing Biome lint debt and missing `.github\workflows\ci.yml` for public-release check. |

- Slice 04: pending implementation evidence.
- Slice 05: pending implementation evidence.
- Slice 06: pending final graph/release evidence.

## Graph Links

- Depends on [[Final Goal Overall Spec]]
- Depends on [[Final Goal Slice Spec Index]]
- Depends on [[Review Policy]]
- Depends on [[Source of Truth Map]]
