# External Tool Integrations

This page maps Hermes-style external tool integration workflows into the current
Xenesis Desk Connection Center. It is a repo-local guide for agents and
operators. The executable source of truth remains the code, Capability Registry
paths, settings state, and verification commands.

## Operating Model

External tools are modeled as setup/readiness cards before they are used by an
agent. A card can expose MCP install plans, connector readiness, OAuth drafts,
generic tool runtime readiness, MCP OAuth runtime readiness, OAuth runtime
readiness, tool profile drafts, action policies, user-story workflows,
diagnostic runbooks, setup plans, and setup request templates.

The current tool catalog includes Fetch, Filesystem, GitHub, Notion, Linear,
Google Workspace, and Google Calendar. Planned Google tools stay visibly
planned until a verified OAuth and MCP setup exists.

## Setup Order

1. Read the full Connection Center state with `xd.xenesis.connections.status`.
2. Verify provider setup and routing before tool execution.
3. Inspect the tool setup plan with `xd.xenesis.tools.setupPlans.status`.
4. Inspect the tool setup view with `xd.xenesis.tools.views.status`.
5. Inspect the tool profile draft with `xd.xenesis.tools.profileDrafts.status`.
6. Inspect MCP connector readiness and install plans before changing config.
7. Inspect generic tool runtime readiness before provider tool execution.
8. Inspect MCP OAuth runtime readiness before OAuth-capable MCP tool setup.
9. Inspect Google OAuth runtime readiness before any OAuth callback or token
   storage work.
10. Inspect OAuth drafts before Google Workspace or Calendar setup.
11. Inspect action policies before allowing provider tool execution.
12. Record setup requests only when the operator explicitly asks for review.

## CR Readbacks

Use these paths for external tool setup and review:

- `xd.xenesis.tools.views.status`
- `xd.xenesis.tools.views.open`
- `xd.xenesis.tools.setupPlans.status`
- `xd.xenesis.tools.setupPlans.open`
- `xd.xenesis.tools.setup.status`
- `xd.xenesis.tools.profileDrafts.status`
- `xd.xenesis.tools.profileDrafts.open`
- `xd.xenesis.tools.profileDrafts.request`
- `xd.xenesis.tools.profileDrafts.apply`
- `xd.xenesis.tools.connectors.status`
- `xd.xenesis.tools.runtime.status`
- `xd.xenesis.tools.runtime.open`
- `xd.xenesis.tools.runtime.request`
- `xd.xenesis.tools.installPlans.status`
- `xd.xenesis.tools.installPlans.open`
- `xd.xenesis.tools.mcpInstallDrafts.status`
- `xd.xenesis.tools.mcpInstallDrafts.open`
- `xd.xenesis.tools.mcpInstallDrafts.request`
- `xd.xenesis.tools.mcpOAuth.status`
- `xd.xenesis.tools.mcpOAuth.open`
- `xd.xenesis.tools.mcpOAuth.request`
- `xd.xenesis.tools.oauthDrafts.status`
- `xd.xenesis.tools.oauthDrafts.open`
- `xd.xenesis.tools.oauthDrafts.request`
- `xd.xenesis.tools.oauthRuntime.status`
- `xd.xenesis.tools.oauthRuntime.open`
- `xd.xenesis.tools.oauthRuntime.request`
- `xd.xenesis.tools.actions.status`
- `xd.xenesis.tools.actions.open`
- `xd.xenesis.tools.actions.request`
- `xd.xenesis.tools.userStories.status`
- `xd.xenesis.tools.userStories.open`
- `xd.xenesis.connections.diagnostics.status`

Tool profile drafts summarize the selected tool id, setup status, profile
fields, credential readiness, MCP server/config readiness, runtime readbacks,
OAuth scopes when applicable, missing required fields, review steps,
diagnostics, blocked actions, and safety boundaries. Missing-env and planned
OAuth drafts are review-only: they do not install MCP servers, write MCP config,
complete OAuth, store tokens or credentials, execute provider tools, or mutate
external systems. Ready tool profile drafts may expose
`xd.xenesis.tools.profileDrafts.apply`; that approval-gated path delegates only
to the ready `xd.xenesis.tools.mcpInstallDrafts.apply` path, so the actual
mutation remains the existing local MCP config write with backups and redacted
readback.

Google Workspace and Google Calendar OAuth draft readbacks include review steps
for OAuth app registration, scope review, token-store readiness, and readback
verification. The Settings Connection Center card renders these as
`Review steps` with expected state, required fields, read/control paths,
diagnostics, and safety boundary for each phase. These rows are planning and
review metadata only; they do not make the planned OAuth flow executable.

Every external tool card also exposes generic tool runtime readiness through
`xd.xenesis.tools.runtime.status`, `xd.xenesis.tools.runtime.open`, and
`xd.xenesis.tools.runtime.request`. This readback is derived from connector,
install-plan, MCP/OAuth, action-policy, and user-story metadata, and shows
runtime support, auth mode, credential state, required/missing env names,
readback checks, diagnostics, blocked actions, and safety boundaries before any
provider tool execution. It is review-only: it does not execute provider tools,
install MCP servers, write MCP config, store credentials, complete OAuth, store
tokens, or mutate external systems.

Google Workspace and Google Calendar also expose review-only OAuth runtime
readiness. The runtime readback includes callback policy, callback URI
candidates, token-store owner, readback checks, diagnostics, blocked actions,
and safety boundaries. Use this before any OAuth callback or token storage work.
It is not an OAuth implementation: it does not start OAuth, host callback
servers, store tokens, write MCP config, execute provider tools, send email,
mutate documents, or mutate calendar events.

Linear exposes a review-only MCP OAuth readiness surface when its recommended
MCP template and tool connector metadata both declare OAuth. The readiness
readback includes server name, transport, scopes, credential reference names,
read/control paths, diagnostics, and blocked actions. It is meant to let an
agent or operator review whether the MCP client OAuth boundary is understood
before any runtime flow exists.

Setup-plan readbacks (`xd.xenesis.tools.setupPlans.status`) collect the ordered
CR paths for each tool into one reviewable packet. They connect the tool view,
setup metadata, tool profile draft, connector readiness, install plan, MCP
install draft, MCP OAuth readiness, generic tool runtime readiness, OAuth setup
packet, OAuth runtime readiness, action policy, user stories, diagnostics, and
setup request without executing any of those downstream mutations.
Settings can preview that setup plan through the existing
`xd.automation.workflow.preview` runner. The preview payload includes only
setup-plan `read` and `open` steps; OAuth draft requests, MCP install apply,
tool profile draft apply, runtime review requests, and action-policy review
requests remain explicit separate CR actions.

## Safety Boundaries

This guide does not install MCP servers, write MCP config, complete OAuth, store
tokens, execute provider tools, send email, update documents or tasks, mutate
calendar events, change settings, or bypass approvals. Mutating work remains on
explicit CR paths with the normal approval model.

## Provider CR Usage Examples

Provider turns may start from natural language, but the implementation must
discover, inspect, and call Capability Registry paths. Do not add a local
keyword or deterministic natural-language catalog for these examples:

- Check the external tool integration guide.
- Open the Google Drive integration guide file.
- Show all external tool setup plans.
- Open the Notion external tool setup plan.
- Show the Google Calendar setup plan.
- Open the Notion connector.
- Show Notion tool runtime status.
- Open the GitHub tool runtime surface.
- Request review for Google Calendar tool runtime readiness.
- Show Linear MCP OAuth readiness.
- Open Linear MCP OAuth readiness.
- Request review for Linear MCP OAuth readiness.
- Show Google Calendar OAuth draft status.
- Show Google Calendar OAuth runtime status.
- Open Google Workspace OAuth runtime readiness.
- Request review for Google Calendar OAuth runtime readiness.
- Show the Linear action policy.
- Open the Fetch install plan.
- Show the Notion tool profile draft.
- Open the Google Calendar tool profile draft.
- Request review for the Notion tool profile draft.
