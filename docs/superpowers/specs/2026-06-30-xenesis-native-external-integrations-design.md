# Xenesis Native External Integrations Design

Date: 2026-06-30
Status: design pending user review

## Objective

Xenesis should directly implement a native external integration layer for the
services and tools represented across OpenClaw and Hermes Agent. OpenClaw and
Hermes are reference implementations and import sources only. They must not be
runtime dependencies for Xenesis external tools.

The first-run onboarding flow should be able to finish initial setup for:

- agent provider/runtime selection,
- external services such as Google, Notion, Linear, GitHub, Slack, search,
  browser, media, memory, channel, and local platform integrations,
- MCP server setup and probes,
- OAuth/API key/service-account credentials,
- doctor/readiness checks,
- action approval boundaries.

Hermes Agent should be removed from the agent provider surface. If any Hermes
compatibility remains, it is a legacy bridge or import source, not a reasoning
provider.

## Non-Goals

- Do not embed OpenClaw or Hermes plugin runtimes.
- Do not execute arbitrary imported plugin code from OpenClaw or Hermes.
- Do not silently copy or reveal secrets while importing existing configs.
- Do not mark natural-language integration behavior as fully verified.
- Do not make every discovered integration executable in one slice. Xenesis can
  expose native setup/doctor/readiness first, then add execution adapters by
  category.
- Do not collapse external-service integrations into AI reasoning providers.
  Model provider setup remains in the existing AI provider/profile system.

## Core Decision

Use a Xenesis-native `ExternalIntegrationRegistry`.

The registry is authored in Xenesis source and contains native definitions for
supported external integrations. OpenClaw and Hermes contribute:

- support-scope reference,
- setup UX examples,
- credential and OAuth patterns,
- MCP manifest examples,
- import mapping hints.

They do not contribute runtime registries, plugin loading, or tool execution.

## Integration Definition

Each integration definition should be explicit enough to drive Connection
Center, onboarding, doctor, MCP setup, import previews, and action policy.

Recommended shape:

```ts
type ExternalIntegrationDefinition = {
  id: string;
  label: string;
  vendor?: string;
  category:
    | 'productivity'
    | 'communication'
    | 'channel'
    | 'web-search'
    | 'browser'
    | 'mcp'
    | 'media'
    | 'memory'
    | 'smart-home'
    | 'local-platform'
    | 'developer'
    | 'data';
  maturity: 'native-ready' | 'setup-ready' | 'probe-only' | 'planned';
  platforms: Array<'macos' | 'windows' | 'linux' | 'all'>;
  runtimeRoutes: Array<
    | { kind: 'mcp'; serverName: string; transport: 'stdio' | 'http' | 'sse' }
    | { kind: 'oauth-api'; provider: string; scopes: string[] }
    | { kind: 'api-key-api'; envVars: string[] }
    | { kind: 'service-account'; files: string[]; envVars: string[] }
    | { kind: 'local-cli'; commands: string[] }
    | { kind: 'browser-session'; browser: 'chrome' | 'system' }
    | { kind: 'platform-gateway'; envVars: string[] }
    | { kind: 'macos-automation'; permissions: string[] }
  >;
  credentials: ExternalCredentialRequirement[];
  setupSteps: ExternalSetupStep[];
  doctorChecks: ExternalDoctorCheck[];
  mcp?: ExternalMcpDefinition;
  oauth?: ExternalOAuthDefinition;
  actionPolicy: ExternalActionPolicy;
  importMappings: ExternalImportMapping[];
  evidence: ExternalReadinessEvidence[];
};
```

The concrete implementation can refine the type names, but these fields are the
contract the UI and CR should depend on.

## Storage

Non-secret integration state should live in Xenesis settings or a dedicated
`XENIS_HOME` integration state file. Secrets and OAuth tokens should live in the
Xenesis secret vault or integration token store with redacted readbacks.

Recommended layout:

- settings: selected integrations, enabled routes, tool filters, non-secret
  endpoints, onboarding skip reasons,
- secret vault: API keys, client secrets, access tokens, refresh tokens,
- `XENIS_HOME/integrations/<id>/`: provider-owned token files, OAuth state, and
  generated local config fragments where a file-based API requires it,
- backups: any write to external CLI/MCP config creates a timestamped backup.

Read paths must expose presence, age, scopes, expiry, and diagnostic status, but
never raw secret values.

## CR Surface

The new integration layer should be CR-first. Existing `xd.xenesis.tools.*`
paths can remain as compatibility aliases while the native surface is added.

Recommended native paths:

- `xd.xenesis.integrations.catalog.status`
- `xd.xenesis.integrations.status`
- `xd.xenesis.integrations.setupPlans.status`
- `xd.xenesis.integrations.setupPlans.open`
- `xd.xenesis.integrations.credentials.status`
- `xd.xenesis.integrations.credentials.request`
- `xd.xenesis.integrations.credentials.apply`
- `xd.xenesis.integrations.oauth.status`
- `xd.xenesis.integrations.oauth.start`
- `xd.xenesis.integrations.oauth.exchange`
- `xd.xenesis.integrations.oauth.revoke`
- `xd.xenesis.integrations.mcp.status`
- `xd.xenesis.integrations.mcp.probe`
- `xd.xenesis.integrations.doctor.status`
- `xd.xenesis.integrations.import.preview`
- `xd.xenesis.integrations.import.apply`
- `xd.xenesis.integrations.actions.status`
- `xd.xenesis.integrations.actions.request`

Write, token, OAuth exchange, config mutation, action execution, and external
workspace writes must be approval-gated. Status, catalog, setup preview, and
doctor readbacks are read-only.

## Onboarding Flow

First-run onboarding becomes the setup cockpit, not a product tour.

Recommended steps:

1. Choose agent provider/runtime.
2. Choose setup source:
   - fresh Xenesis setup,
   - import Hermes Agent config,
   - import OpenClaw config,
   - import existing MCP client config,
   - combine imports with manual setup.
3. Select required and optional integrations.
4. Configure credentials:
   - API key,
   - OAuth,
   - service account,
   - local CLI,
   - platform permissions,
   - MCP remote login.
5. Run MCP probes and tool list discovery.
6. Review action policies for mutating tools.
7. Run integration doctor.
8. Finish only when selected required integrations are ready, or explicitly
   skipped with a stored reason.

Terminal opening, file opening, Command Center, and pane arrangement are not
onboarding completion steps.

## Supported Integration Scope

Xenesis should implement native definitions for the external tool scope exposed
by OpenClaw and Hermes Agent, grouped by capability rather than by source repo.

Initial native scope:

- Productivity and developer: GitHub, Notion, Google Workspace, Gmail, Google
  Calendar, Google Drive, Docs, Sheets, Airtable, Linear, n8n.
- Communication and channels: Slack, Discord, Telegram, Google Chat, Microsoft
  Teams, LINE, Matrix, Mattermost, WhatsApp, email/IMAP/SMTP, iMessage.
- Web, search, and browser: Brave Search, Tavily, Exa, Firecrawl, Parallel,
  Browserbase, browser-use, Maps/OpenStreetMap.
- MCP catalog: Linear MCP, n8n MCP, Unreal Engine MCP, and user-defined MCP
  servers.
- Media and creative: FAL image/video, Krea, OpenAI image generation, xAI media
  routes where supported by configured APIs.
- Memory and knowledge: Mem0, Supermemory, Hindsight, local memory providers,
  Obsidian.
- Smart home and local platform: Home Assistant, Spotify, Apple Notes, Apple
  Reminders, Find My, local macOS automation.

Model providers from OpenClaw or Hermes are not external tools in this design.
They can inform the AI provider catalog separately, but Hermes Agent itself is
not an agent provider.

## Direct Adapters

Native integration definitions should connect to direct Xenesis adapters.

Adapter categories:

- `McpAdapter`: config rendering, probe, tool list discovery, tool filtering,
  OAuth status, and connection diagnostics.
- `OAuthAdapter`: staged OAuth setup, client secret capture, auth URL, code
  exchange, refresh, revoke, and token presence readback.
- `ApiKeyAdapter`: API key entry/import, redacted status, optional lightweight
  authenticated probe.
- `ServiceAccountAdapter`: service account JSON/file validation, scope/project
  checks, and redacted state.
- `LocalCliAdapter`: command presence, version probe, config path detection, and
  safe setup instructions.
- `ChannelAdapter`: platform env, allowed user/channel policy, inbound/outbound
  readiness, and webhook/socket/pubsub diagnostics.
- `MacOSAutomationAdapter`: app availability, permissions, command presence, and
  user-facing permission instructions.

Each adapter returns structured readiness evidence and doctor findings. It does
not return raw secrets.

## Importers

Hermes and OpenClaw imports are migration tools into the native Xenesis model.

`HermesConfigImporter` should scan:

- `~/.hermes/config.yaml`,
- `~/.hermes/.env`,
- `~/.hermes/auth.json` or provider auth stores where applicable,
- `~/.hermes/mcp-tokens`,
- configured `mcp_servers`,
- plugin platform env requirements,
- skill credential files such as Google token/client secret files.

`OpenClawConfigImporter` should scan:

- OpenClaw config files,
- configured plugins and channels,
- plugin config sections,
- MCP server registry/config,
- credential references and env var names,
- doctor-compatible findings where available.

Import flow:

1. Scan source without mutating Xenesis.
2. Produce a redacted preview.
3. Map source entries to native integration ids.
4. Ask approval before copying secrets, linking files, or writing config.
5. Apply selected mappings.
6. Run Xenesis doctor and MCP probes.

Importers must never execute arbitrary source plugin code.

## Hermes Provider Removal

Hermes should be removed from provider switching and user-facing provider lists.

Expected cleanup:

- remove `/provider hermes` wording from Xenesis Agent surfaces,
- remove Hermes from Gowoori artifact provider choices unless a legacy bridge is
  explicitly retained,
- remove or revise CR enums that treat Hermes as a provider,
- hide or rename Settings "Hermes plugin bridge" as legacy/import
  compatibility,
- remove Hermes plugin `extraResources` from production packaging once no
  feature depends on installing those plugins,
- keep `providers/shared/skills/xd` because it supports local CLI agents such
  as Codex and Claude.

If a Hermes bridge is retained temporarily, it should not appear in the agent
provider selector and should be labeled as legacy compatibility.

## Error Handling

All setup and runtime evidence should be structured:

- `ready`
- `needs-credentials`
- `needs-oauth`
- `needs-mcp-probe`
- `unsupported-platform`
- `configured-but-unverified`
- `failed`
- `skipped`

Doctor findings should follow an OpenClaw-inspired shape:

```ts
type ExternalDoctorFinding = {
  checkId: string;
  integrationId: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  fixHint?: string;
  path?: string;
  crPath?: string;
  evidence?: Record<string, unknown>;
};
```

## Testing

Minimum verification for implementation slices:

- registry normalization unit tests,
- import preview fixtures for Hermes and OpenClaw configs,
- secret redaction tests,
- OAuth staged-flow tests with mocked token exchange,
- MCP config render/probe tests with mock servers,
- onboarding completion tests for ready, skipped, and failed integrations,
- CR coverage audit,
- provider-surface tests proving Hermes is not selectable as an agent provider,
- root typecheck and build,
- live Agent pane smoke for at least one natural-language integration setup or
  doctor prompt when CR/Agent behavior changes.

No CI test should require real Google, Notion, Slack, or Linear credentials.

## Rollout

Recommended implementation order:

1. Add native registry types and read-only catalog/status CR paths.
2. Move existing Xenesis external tool cards to registry-derived readbacks.
3. Add doctor findings and readiness evidence.
4. Add MCP config/probe surface.
5. Add import preview/apply for Hermes and OpenClaw with redacted fixtures.
6. Wire onboarding to selected integrations and doctor gates.
7. Add Google staged OAuth, then Notion/GitHub/Linear setup.
8. Add channel and browser/search adapters.
9. Remove Hermes provider surfaces and demote/remove Hermes bridge packaging.

## Spec Self-Review

- Placeholder scan: no placeholder requirements remain.
- Consistency check: OpenClaw and Hermes are reference/import sources only, and
  all runtime behavior is Xenesis-native.
- Scope check: this is too large for one implementation slice, so rollout is
  explicitly phased.
- Ambiguity check: model providers are excluded from this external integration
  design and stay in the AI provider/profile system.
