# Agent User Stories

This page turns Hermes-style task stories into Xenesis Desk operating stories.
The goal is not to make the agent guess hidden state. Each story maps a user
intent to Capability Registry readbacks, Settings surfaces, approval requests,
and completion evidence.

Use this page with:

- [09-onboarding-connections.md](09-onboarding-connections.md) for the first-run
  setup order.
- [10-openclaw-channel-setup.md](10-openclaw-channel-setup.md) for external
  messenger channels.
- [11-external-tool-integrations.md](11-external-tool-integrations.md) for MCP,
  OAuth, connector, and external tool setup.

## Story Contract

A story is complete only when it names the CR read path, the surface to open,
the approval boundary, and the verification signal.

| Field | Requirement |
|---|---|
| User intent | The natural-language task the operator or remote user asks for. |
| Readback first | The CR status path that proves current state before action. |
| Open surface | The CR open path that focuses the Settings card, guide, or pane. |
| Approval boundary | Any request/apply/send path that needs explicit Desk approval. |
| Completion evidence | A readback, diagnostic, work-log entry, open file, or Action Inbox record. |

Do not treat a story as implemented because a guide exists. The executable truth
is the CR path and its verification result.

`xd.xenesis.tools.userStories.status` and
`xd.xenesis.channels.userStories.status` now include a `storyContract` object on
each returned user-story template. The contract repeats the executable fields in
machine-readable form:

- `readbackPaths`: CR status paths to inspect before acting.
- `openPath` and `openArgs`: the CR open surface for the story.
- `approvalBoundaries`: request/apply/send paths that require explicit Desk
  approval.
- `completionEvidence`: readbacks, diagnostics, work-log, open-file, or Action
  Inbox signals that can prove progress.
- `safetyBoundary`: the non-mutation boundary for the story contract itself.
- `workflowPreview`: a read/open-only payload for
  `xd.automation.workflow.preview` and `xd.automation.workflow.run` review. Its
  steps inspect the contract readbacks and then open the story Settings surface
  with `ensureVisible=true`.

The workflow preview payload is not a write plan. It must not include
approval-boundary paths such as draft apply, tool action request, channel test,
send, create, update, or delete paths. Running the preview as a workflow is a
separate approval-gated Desk action and still obeys the CR workflow runner's
path restrictions.

Settings user-story cards expose this as a workflow preview action. The button
calls `xd.automation.workflow.preview` with the contract's workflow input so the
operator can validate the CR read/open sequence before deciding whether to run
or save any workflow. Settings also records the last Connection Center CR action
result, so a preview call leaves a visible path/status/step-count summary
instead of disappearing after the button click.

Provider-driven Desk control uses the same contract when a user asks for a
workflow preview, for example `Notion user story workflow preview`. The provider
must discover and call `xd.automation.workflow.preview` with read/open-only
steps cloned from the Connection Center catalog, not call provider tools,
channel tests, sends, request, or apply paths. Do not implement this with a
local deterministic natural-language or keyword catalog.

## Provider Stories

### First chat readiness

User intent: "Set up Xenesis Agent so it can answer a first prompt."

Read first:

- `xd.xenesis.connections.status`
- `xd.xenesis.providers.setup.status`
- `xd.xenesis.providers.routing.status`
- `xd.xenesis.providers.views.status`

Open or focus:

- `xd.xenesis.connections.open`
- `xd.xenesis.providers.views.open`
- `xd.xenesis.providers.setupPlans.open`

Approval boundary:

- `xd.xenesis.providers.profileDrafts.request`
- `xd.xenesis.providers.profileDrafts.apply`

Completion evidence:

- Provider setup reports configured credentials or an honest missing-credential
  state.
- Provider routing reports the active provider and model chosen from the user's
  profile.
- The Agent pane answer shows the intended provider in the footer or work log
  during live verification.

### Provider routing inspection

User intent: "Show me which provider and fallback path the Agent will use."

Read first:

- `xd.xenesis.providers.routing.status`
- `xd.xenesis.providers.setup.status`

Open or focus:

- `xd.xenesis.providers.routing.open`
- `xd.xenesis.providers.views.open`

Safety boundary:

- This story reads route metadata only. It does not switch providers, change
  local CLI selection, mutate fallback chains, or expose API keys.

## External Tool Stories

### Connect a planned tool

User intent: "Connect Notion, Google Calendar, Google Workspace, Linear, GitHub,
Fetch, or Filesystem as an external tool."

Read first:

- `xd.xenesis.tools.views.status`
- `xd.xenesis.tools.setupPlans.status`
- `xd.xenesis.tools.profileDrafts.status`
- `xd.xenesis.tools.mcpInstallDrafts.status`
- `xd.xenesis.tools.connectors.status`
- `xd.xenesis.tools.userStories.status`

Open or focus:

- `xd.xenesis.tools.views.open`
- `xd.xenesis.tools.setupPlans.open`
- `xd.xenesis.tools.profileDrafts.open`
- `xd.xenesis.tools.mcpInstallDrafts.open`
- `xd.xenesis.tools.userStories.open`

Approval boundary:

- `xd.xenesis.tools.mcpInstallDrafts.request`
- `xd.xenesis.tools.profileDrafts.request`
- `xd.xenesis.tools.profileDrafts.apply`
- `xd.xenesis.tools.mcpInstallDrafts.apply`
- `xd.xenesis.connections.setupRequests.request`
- `xd.xenesis.connections.setupRequests.apply`

Completion evidence:

- Draft status shows the selected tool id, transport, missing environment names,
  config target, diagnostics, and safety boundaries.
- Tool profile draft status shows profile fields, credential readiness, MCP
  server/config readiness, runtime readbacks, scopes when applicable, missing
  required fields, review steps, blocked actions, and review-only safety
  boundaries. Ready tool profile draft apply returns
  `delegatedPath: xd.xenesis.tools.mcpInstallDrafts.apply`; planned Google
  OAuth drafts and missing-env drafts do not expose the apply path.
- Action Inbox contains a local review item when setup is requested.
- No MCP config is written until an explicit approval-gated apply path is used.

### OAuth tool setup

User intent: "Prepare Google Workspace or Google Calendar OAuth."

Read first:

- `xd.xenesis.tools.oauthDrafts.status`
- `xd.xenesis.tools.oauthRuntime.status`
- `xd.xenesis.tools.actions.status`
- `xd.xenesis.tools.userStories.status`

Open or focus:

- `xd.xenesis.tools.oauthDrafts.open`
- `xd.xenesis.tools.oauthDrafts.setupPacket`
- `xd.xenesis.tools.oauthRuntime.open`
- `xd.xenesis.tools.actions.open`

Approval boundary:

- `xd.xenesis.tools.oauthDrafts.request`
- `xd.xenesis.tools.oauthRuntime.request`

Safety boundary:

- OAuth drafts do not complete OAuth, store tokens, send mail, edit documents,
  create calendar events, or mutate external systems.

### Tool action policy

User intent: "Let the provider use an external tool safely."

Read first:

- `xd.xenesis.tools.actions.status`
- `xd.xenesis.tools.connectors.status`
- `xd.xenesis.tools.userStories.status`

Open or focus:

- `xd.xenesis.tools.actions.open`
- `xd.xenesis.connections.diagnostics.open`

Approval boundary:

- `xd.xenesis.tools.actions.request`

Completion evidence:

- The action policy describes data scopes, approval posture, blocked actions,
  diagnostics, and safety boundaries before provider tool execution exists.

## Messenger Stories

### Open an implemented channel setup

User intent: "Set up Telegram, Slack, Discord, or Webhook for Agent messages."

Read first:

- `xd.xenesis.messengers.views.status`
- `xd.xenesis.channels.setupPlans.status`
- `xd.xenesis.channels.routing.status`
- `xd.xenesis.channels.safety.status`
- `xd.xenesis.channels.accessGroups.status`
- `xd.xenesis.channels.pairing.status`
- `xd.xenesis.channels.runtime.status`
- `xd.xenesis.channels.userStories.status`

Open or focus:

- `xd.xenesis.messengers.views.open`
- `xd.xenesis.channels.runtime.open`
- `xd.xenesis.channels.setupPlans.open`
- `xd.xenesis.channels.userStories.open`
- `xd.xenesis.connections.diagnostics.open`

Approval boundary:

- `xd.xenesis.channels.profileDrafts.request`
- `xd.xenesis.channels.runtime.request`
- `xd.xenesis.channels.profileDrafts.apply`
- `xd.xenesis.profiles.testChannel`

Completion evidence:

- Channel setup plan names the required settings, allowlist checks, pairing
  evidence, runtime readiness, route policy, and diagnostics.
- Test send remains approval-gated and should be verified with runtime
  readbacks, not chat-only text.

### Planned messenger readiness

User intent: "Prepare WhatsApp, Google Chat, Signal, Teams, Matrix, Email, or
another planned messenger."

Read first:

- `xd.xenesis.messengers.views.status`
- `xd.xenesis.channels.runtime.status`
- `xd.xenesis.channels.userStories.status`
- `xd.xenesis.channels.routing.status`
- `xd.xenesis.channels.safety.status`

Open or focus:

- `xd.xenesis.messengers.views.open`
- `xd.xenesis.channels.runtime.open`
- `xd.xenesis.channels.userStories.open`

Approval boundary:

- `xd.xenesis.channels.runtime.request`

Safety boundary:

- Planned messengers are readiness views and user-story templates only. They do
  not enable delivery, create adapters, send messages, write profiles, or
  mutate allowlists.

Completion evidence:

- Runtime readiness reports `planned-adapter`, adapter id, gateway requirement,
  readiness checks, blocked actions, and safety boundaries.
- Action Inbox contains a local runtime-readiness review item when review is
  requested.

## Desk Workflow Stories

### Drive Desk with CR, then verify

User intent: "Have the Agent operate Desk from natural language."

Read first:

- `xd.xenesis.connections.status`
- The specific CR status path for the target surface.

Open or control:

- Use the owning CR path, such as `xd.xenesis.guides.open`,
  `xd.xenesis.tools.views.open`, `xd.xenesis.channels.userStories.open`, or a
  non-Xenesis Desk path for panes, files, terminals, captures, or artifacts.

Approval boundary:

- Any action that mutates profiles, writes config, sends messages, executes
  terminal commands, or touches external systems must use the existing
  approval-gated path.

Completion evidence:

- A status readback, open content result, diagnostics result, capture result,
  Action Inbox record, or work-log entry proves the action happened.

### Review a setup request

User intent: "Create a local review item for a setup task."

Read first:

- `xd.xenesis.connections.setupRequests.status`
- `xd.xenesis.connections.diagnostics.status`

Open or request:

- `xd.xenesis.connections.setupRequests.open`
- `xd.xenesis.connections.setupRequests.request`

Completion evidence:

- The setup request status joins the latest matching Action Inbox item by
  approval session key.

## CR Usage Examples

When the provider receives requests like these, it must discover, inspect, and
call the named CR path instead of answering provider-only text or using a local
deterministic prompt catalog:

| Prompt | Expected CR path |
|---|---|
| Open the Hermes user stories guide | `xd.xenesis.guides.open` |
| Open the Hermes task scenarios guide file | `xd.xenesis.guides.open` |
| Show the Hermes task scenarios guide status | `xd.xenesis.guides.status` |
| Show external tool user stories | `xd.xenesis.tools.userStories.status` |
| Show channel user stories | `xd.xenesis.channels.userStories.status` |
| Open the Connection diagnostics catalog | `xd.xenesis.connections.diagnostics.open` |
| Show the Notion tool profile draft | `xd.xenesis.tools.profileDrafts.status` |
| Open the Google Calendar tool profile draft | `xd.xenesis.tools.profileDrafts.open` |
| Request review for the Notion tool profile draft | `xd.xenesis.tools.profileDrafts.request` |
| Apply a ready Notion tool profile draft | `xd.xenesis.tools.profileDrafts.apply` |

## Concrete Guide Workflows

`xd.xenesis.guides.status` includes concrete `user-story-workflow` guide cards
for the first operator flows:

| Guide id | Purpose |
|---|---|
| `first-provider-setup` | Read provider setup/routing/view/setup-plan state and open the matching Settings surfaces before a first Agent turn. |
| `connect-notion` | Read Notion MCP setup, connector, install draft, runtime, action-policy, and user-story state before provider tool use. |
| `prepare-google-calendar` | Read Google Calendar OAuth draft, OAuth runtime, MCP OAuth, setup plan, runtime, and user-story state before OAuth completion. |
| `connect-telegram` | Read gateway, messenger view, setup plan, routing, safety, access group, pairing, runtime, profile-draft, and user-story state before Telegram delivery. |
| `first-external-message-test` | Read gateway, routing, safety, runtime, user-story, and diagnostics evidence before any separate approval-gated channel test. |

These guide cards are not a natural-language intent catalog and not a workflow
runner. Their `controlPaths` are open paths only. The table-driven shared tests
now require every tool and messenger `storyContract.workflowPreview` step to
use `approved=false`, exclude request/apply/run/send/test paths, and strip
`runPath` from preview args.

## Safety Rules

- User stories are planning and routing artifacts until the owning CR path
  executes and verifies the work.
- Guide catalog reads do not install tools, complete OAuth, send messages, write
  provider profiles, or mutate channel settings.
- Planned integrations must stay visibly planned until a verified runtime
  adapter and approval path exist.
- Provider secrets, bridge tokens, OAuth tokens, and channel credentials must
  never be printed in docs, logs, summaries, or Agent responses.
- Do not implement user-story requests with deterministic local
  natural-language or keyword catalogs. Provider reasoning should discover,
  inspect, and call CR paths.
