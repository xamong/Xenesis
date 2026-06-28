# External Tool Integrations

This page maps Hermes-style external tool integration workflows into the current
Xenesis Desk Connection Center. It is a repo-local guide for agents and
operators. The executable source of truth remains the code, Capability Registry
paths, settings state, and verification commands.

## Operating Model

External tools are modeled as setup/readiness cards before they are used by an
agent. A card can expose MCP install plans, connector readiness, OAuth drafts,
MCP OAuth runtime readiness, action policies, user-story workflows, diagnostic
runbooks, setup plans, and setup request templates.

The current tool catalog includes Fetch, Filesystem, GitHub, Notion, Linear,
Google Workspace, and Google Calendar. Planned Google tools stay visibly
planned until a verified OAuth and MCP setup exists.

## Setup Order

1. Read the full Connection Center state with `xd.xenesis.connections.status`.
2. Verify provider setup and routing before tool execution.
3. Inspect the tool setup plan with `xd.xenesis.tools.setupPlans.status`.
4. Inspect the tool setup view with `xd.xenesis.tools.views.status`.
5. Inspect MCP connector readiness and install plans before changing config.
6. Inspect MCP OAuth runtime readiness before OAuth-capable MCP tool setup.
7. Inspect OAuth drafts before Google Workspace or Calendar setup.
8. Inspect action policies before allowing provider tool execution.
9. Record setup requests only when the operator explicitly asks for review.

## CR Readbacks

Use these paths for external tool setup and review:

- `xd.xenesis.tools.views.status`
- `xd.xenesis.tools.views.open`
- `xd.xenesis.tools.setupPlans.status`
- `xd.xenesis.tools.setupPlans.open`
- `xd.xenesis.tools.setup.status`
- `xd.xenesis.tools.connectors.status`
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
- `xd.xenesis.tools.actions.status`
- `xd.xenesis.tools.actions.open`
- `xd.xenesis.tools.actions.request`
- `xd.xenesis.tools.userStories.status`
- `xd.xenesis.tools.userStories.open`
- `xd.xenesis.connections.diagnostics.status`

Google Workspace and Google Calendar OAuth draft readbacks include review steps
for OAuth app registration, scope review, token-store readiness, and readback
verification. The Settings Connection Center card renders these as
`Review steps` with expected state, required fields, read/control paths,
diagnostics, and safety boundary for each phase. These rows are planning and
review metadata only; they do not make the planned OAuth flow executable.

Linear exposes a review-only MCP OAuth readiness surface when its recommended
MCP template and tool connector metadata both declare OAuth. The readiness
readback includes server name, transport, scopes, credential reference names,
read/control paths, diagnostics, and blocked actions. It is meant to let an
agent or operator review whether the MCP client OAuth boundary is understood
before any runtime flow exists.

Setup-plan readbacks (`xd.xenesis.tools.setupPlans.status`) collect the ordered
CR paths for each tool into one reviewable packet. They connect the tool view,
setup metadata, connector readiness, install plan, MCP install draft, MCP OAuth
readiness, OAuth setup packet, action policy, user stories, diagnostics, and
setup request without executing any of those downstream mutations.

## Safety Boundaries

This guide does not install MCP servers, write MCP config, complete OAuth, store
tokens, execute provider tools, send email, update documents or tasks, mutate
calendar events, change settings, or bypass approvals. Mutating work remains on
explicit CR paths with the normal approval model.

## Natural Agent Prompts

Useful prompts should route through guide, tool view, draft, or request CR
paths, for example:

- `외부 도구 통합 가이드 상태 보여줘`
- `구글 드라이브 통합 guide file 열어줘`
- `외부 툴 설정 플랜 전체 상태 보여줘`
- `노션 외부 도구 설정 플랜 열어줘`
- `구글 캘린더 설정 플랜 상태 보여줘`
- `노션 connector 열어줘`
- `리니어 mcp oauth 상태 보여줘`
- `linear mcp oauth 열어줘`
- `리니어 mcp oauth 검토 요청해줘`
- `구글 캘린더 OAuth 상태 보여줘`
- `리니어 액션 정책 상태 보여줘`
- `웹페이지 가져오기 설치 계획 열어줘`
