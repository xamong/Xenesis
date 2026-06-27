# External Tool Integrations

This page maps Hermes-style external tool integration workflows into the current
Xenesis Desk Connection Center. It is a repo-local guide for agents and
operators. The executable source of truth remains the code, Capability Registry
paths, settings state, and verification commands.

## Operating Model

External tools are modeled as setup/readiness cards before they are used by an
agent. A card can expose MCP install plans, connector readiness, OAuth drafts,
action policies, user-story workflows, diagnostic runbooks, and setup request
templates.

The current tool catalog includes Fetch, Filesystem, GitHub, Notion, Linear,
Google Workspace, and Google Calendar. Planned Google tools stay visibly
planned until a verified OAuth and MCP setup exists.

## Setup Order

1. Read the full Connection Center state with `xd.xenesis.connections.status`.
2. Verify provider setup and routing before tool execution.
3. Inspect the tool setup view with `xd.xenesis.tools.views.status`.
4. Inspect MCP connector readiness and install plans before changing config.
5. Inspect OAuth drafts before Google Workspace or Calendar setup.
6. Inspect action policies before allowing provider tool execution.
7. Record setup requests only when the operator explicitly asks for review.

## CR Readbacks

Use these paths for external tool setup and review:

- `xd.xenesis.tools.views.status`
- `xd.xenesis.tools.views.open`
- `xd.xenesis.tools.setup.status`
- `xd.xenesis.tools.connectors.status`
- `xd.xenesis.tools.installPlans.status`
- `xd.xenesis.tools.installPlans.open`
- `xd.xenesis.tools.mcpInstallDrafts.status`
- `xd.xenesis.tools.mcpInstallDrafts.open`
- `xd.xenesis.tools.mcpInstallDrafts.request`
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
- `노션 connector 열어줘`
- `구글 캘린더 OAuth 상태 보여줘`
- `리니어 액션 정책 상태 보여줘`
- `웹페이지 가져오기 설치 계획 열어줘`
