# Xenesis Connections and Onboarding Design

Date: 2026-06-27
Status: Approved for implementation planning

## Goal

Xenesis Desk should make the Xenesis Agent setup path visible, actionable, and
controllable from inside the Desk. A user should not need to piece together AI
provider setup, local CLI integration, MCP tool servers, gateway state, external
messenger configuration, and guide docs from separate settings panels.

The full product direction is broad: OpenClaw-style channel coverage, Hermes-like
provider and integration onboarding, external tool connections such as Google,
Calendar, Notion, and GitHub, and Desk-native views for each connection. The
first implementation should establish the control-plane shape that can support
that direction without pretending that every channel runtime exists immediately.

The first implementation is a CR-first Connection Center.

## User Decisions

- Work happens in the isolated worktree.
- The first implementation should maximize movement toward the full onboarding
  and connection goal.
- Prefer Desk-native views over external setup instructions alone.
- Connection status and actions should be controllable through the Capability
  Registry.
- The current Xenesis final goal remains the architectural anchor:
  user-facing behavior should converge on CR-discoverable, approvable, auditable,
  and verifiable paths.

## External References

The design is informed by:

- OpenClaw channels and channel subpages: channel list, access groups, channel
  routing, bot loop protection, troubleshooting, provider/model setup, tools,
  and gateway security.
- Hermes user stories and subpages: quickstart, provider selection, messaging
  gateway, sessions, MCP/tool integrations, CLI commands, and integration
  categories.

These references guide the desired product shape. Xenesis Desk remains the
source of truth for implementation details and CR behavior.

## Existing Xenesis Surface

The current codebase already has useful pieces:

- Xenesis Agent runtime and provider settings.
- Gateway lifecycle controls in Settings.
- External bot settings for Telegram, Slack, Discord, and webhook.
- Runtime diagnostics for those four channels.
- CR paths for gateway lifecycle:
  `xd.xenesis.gateway.status`, `start`, `stop`, `restart`,
  and `openDashboard`.
- CR paths for profile channel configuration and test sends:
  `xd.xenesis.profiles.updateChannels` and
  `xd.xenesis.profiles.testChannel`.
- MCP status through `xd.mcp.settings.status`.
- Recommended MCP server templates for fetch, filesystem, GitHub, Notion, and
  Linear.
- Provider integration installer primitives for Codex, Claude, Cursor, and
  Hermes assets.

The missing product layer is not only more adapters. It is a unified setup model
that tells the user what is connected, what is missing, what can be configured
now, and which CR-backed action will change state.

## Scope

### First Implementation

Create a Connection Center inside Xenesis Desk Settings.

It should show:

- AI provider readiness.
- Local CLI and provider integration readiness.
- MCP bridge readiness.
- Recommended MCP tool connections.
- Xenesis gateway readiness.
- External messenger readiness for Telegram, Slack, Discord, and webhook.
- Guide links for setup, troubleshooting, and security concepts.

It should expose the same status through a CR read path so Xenesis Agent and
external MCP clients can inspect setup state without scraping renderer UI.

The first implementation may reuse existing save/test actions for external bot
channels instead of adding new send paths.

### Explicit First-Slice Tool Catalog

The Connection Center should include at least:

- Fetch
- Filesystem
- GitHub
- Notion
- Linear
- Google Workspace
- Google Calendar

For existing recommended MCP templates, use the current repo templates. For new
Google entries, add only templates that are backed by verified package or remote
MCP information. If a template cannot be verified during implementation, show it
as a planned/manual connection instead of installing an unverified command.

### Explicit First-Slice Messenger Catalog

The Connection Center should include:

- Telegram
- Slack
- Discord
- Webhook

These are actionable because the runtime and tests already exist. Other
OpenClaw-like channels should appear only as future/planned entries unless this
implementation adds real runtime adapters and tests for them.

### Out Of Scope For First Implementation

- Implementing every OpenClaw channel runtime.
- OAuth token storage for every third-party service.
- A full account marketplace.
- Background Calendar polling or event-triggered workflow execution unless a
  verified MCP server already provides it.
- Natural-language claims that all external tools are usable before status and
  tests prove it.

## Architecture

The architecture has four layers:

```text
Settings Connection Center
  -> shared connection status model
  -> Electron main status aggregator
  -> CR path: xd.xenesis.connections.status
  -> existing CR actions for gateway, profiles, provider integration, and MCP
```

The status model should be shared by renderer and main-process code. It should
describe each connection as a structured item:

```ts
type XenesisConnectionKind =
  | 'provider'
  | 'local-cli'
  | 'mcp'
  | 'gateway'
  | 'tool'
  | 'messenger'
  | 'guide'

type XenesisConnectionStatus =
  | 'ready'
  | 'needs-setup'
  | 'disabled'
  | 'blocked'
  | 'planned'
  | 'unknown'

type XenesisConnectionItem = {
  id: string
  kind: XenesisConnectionKind
  label: string
  status: XenesisConnectionStatus
  summary: string
  requiredEnv?: string[]
  missingEnv?: string[]
  crActions?: string[]
  settingsTarget?: string
  guidePath?: string
  warnings?: string[]
}
```

The exact type names may change to match local conventions, but the model should
stay structured and serializable. Renderer code should not infer critical
readiness by parsing human text.

## Capability Registry Contract

Add a read path:

```text
xd.xenesis.connections.status
```

It returns:

- overall readiness counts
- provider section
- local CLI/provider integration section
- MCP bridge section
- tool catalog section
- gateway section
- messenger section
- guide/doc section
- warnings and known gaps

The first path is read-only. It should not require approval. Mutating actions
remain on existing CR paths:

- `xd.xenesis.gateway.start`
- `xd.xenesis.gateway.stop`
- `xd.xenesis.gateway.restart`
- `xd.xenesis.gateway.openDashboard`
- `xd.xenesis.profiles.updateChannels`
- `xd.xenesis.profiles.testChannel`
- provider integration install actions
- existing settings save/export/import paths

If implementation adds direct install or configure actions for MCP templates,
those actions must be separate CR write/control paths with explicit approval
policy and dispatcher coverage.

## Settings Experience

The Connection Center should be operational, not a marketing page.

Layout:

- Compact readiness summary at the top.
- Sections for Provider, MCP and Tools, Gateway, Messengers, and Guides.
- Each connection appears as a compact row or card with status, missing
  requirements, and available actions.
- Existing detailed channel forms can remain in the current External Bots tab,
  but the Connection Center should deep-link or switch to that area when a user
  needs to edit channel settings.

The screen should answer:

- Is the agent usable?
- Which provider is active?
- Can external agents reach Desk CR through MCP?
- Is the gateway running?
- Which messenger channels are ready to deliver?
- Which tool integrations are configured or missing credentials?
- Which guide explains the next setup step?

## OpenClaw Concepts To Surface

OpenClaw's channel pages imply several useful setup concepts. Xenesis should
surface these as guidance and status, not as copied implementation details:

- Access control: allowed chat/channel/guild IDs for messenger channels.
- Channel routing: which inbound channel/session a response will target.
- Bot loop protection: warnings when a bot/webhook may receive its own output.
- Troubleshooting ladder: status, missing environment variables, token checks,
  gateway reachability, and test send.
- Gateway security: authentication, local tokens, and safe exposure warnings.

The first implementation should attach these concepts to guide docs and status
warnings where the current runtime already has data.

## Hermes Concepts To Surface

Hermes docs emphasize a cohesive first-run path:

- choose provider
- verify first chat
- verify sessions
- connect messaging gateway
- add MCP/tool integrations
- use CLI/setup commands when needed

Xenesis should adapt this into Desk-native setup:

- provider readiness appears before gateway/tool setup
- first chat readiness is distinct from external messenger readiness
- MCP tool connection status is visible without editing config files manually
- guide docs explain the same path in product terms

## Documentation

Add a manual page:

```text
docs/manual/09-onboarding-connections.md
```

Update:

```text
docs/manual/README.md
```

The page should cover:

- first-run setup order
- AI provider setup
- local CLI/provider integration
- MCP bridge and recommended tools
- Google/Calendar/Notion/GitHub/Linear connection expectations
- gateway setup
- Telegram/Slack/Discord/webhook setup
- access control and routing guidance
- troubleshooting ladder
- CR paths that agents can use to inspect or control setup

The docs should be honest about planned entries. If a service has a catalog row
but no runtime adapter, the docs must say so.

## Obsidian Update

After implementation starts, add or update a working note under:

```text
docs/obsidian/Xenesis-desk/80_AI/Working Notes
```

The note should link the Connection Center work back to:

- `[[Final Goal]]`
- `[[Capability Registry Architecture]]`
- `[[Xenesis Agent Runtime]]`
- `[[MCP Bridge Architecture]]`
- `[[Provider Model]]`

Canonical module and architecture notes remain proposal-first unless a later
change explicitly updates them.

## Error Handling

The Connection Center should distinguish:

- not installed
- disabled
- missing environment variables
- missing credentials
- gateway stopped
- gateway running but channel blocked
- runtime error
- planned/not implemented
- unknown due to status read failure

Errors should be shown as actionable status, not thrown into the UI as raw stack
traces. Secret values must not appear in status, logs, docs, or CR responses.

## Testing Strategy

### Unit Tests

- Connection status aggregation from mocked provider/MCP/gateway/profile state.
- Recommended MCP catalog classification.
- Messenger readiness classification for enabled/disabled/missing-env/runtime
  states.
- CR result shape for `xd.xenesis.connections.status`.

### Type and Audit

- `npm run typecheck`
- `npm run docs:capabilities:audit`

The existing baseline typecheck failure in
`packages/xenesis-agent-core/src/embeddedAgentRuntime.test.ts` must be fixed or
otherwise accounted for before claiming a clean typecheck.

### Package Checks

If `packages/xenesis` templates or gateway types change:

- `npm --prefix packages/xenesis test`
- `npm --prefix packages/xenesis run typecheck`
- `npm --prefix packages/xenesis run build`

### Live Verification

For CR/Agent-facing completion, launch Electron and prove at least one
natural-language Agent pane prompt can inspect setup state through the CR-backed
connection status path. The prompt should be natural language, not a raw CR path
unless diagnostics are explicitly requested.

## Success Criteria

The first implementation is complete when:

- Settings exposes a Connection Center that summarizes provider, MCP, tool,
  gateway, messenger, and guide readiness.
- A CR read path returns the same structured setup state.
- Existing gateway and messenger actions are reachable from the Connection
  Center without duplicating behavior outside CR-backed paths.
- Tool catalog entries include current recommended MCP servers plus honest
  Google/Calendar handling.
- Manual docs explain setup and troubleshooting.
- `handoff.md` records design decisions, touched files, commands, verification
  output, known gaps, and next steps.
- The relevant verification gates pass or any remaining baseline failure is
  explicitly identified as pre-existing and not caused by this work.

## Non-Goals

- No unsupported claim that every OpenClaw channel is implemented.
- No fake provider or credential fallback.
- No chat-only approval text for mutating setup actions.
- No secret leakage in CR responses or docs.
- No copy-pasted source files in Obsidian notes.
