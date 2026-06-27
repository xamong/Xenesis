# 2026-06-27 OpenClaw Hermes Batched Gap Map

## Purpose

- One-time external documentation refresh for the active Xenesis Desk
  Connection Center goal.
- Do not re-browse these docs per implementation slice. Use this note,
  `handoff.md`, repo code, and tests as the working gap map until a deliberate
  future batch refresh is needed.

## Sources Checked

- OpenClaw channels index: https://docs.openclaw.ai/channels
- OpenClaw channel concepts and setup pages:
  - https://docs.openclaw.ai/channels/telegram
  - https://docs.openclaw.ai/channels/slack
  - https://docs.openclaw.ai/channels/discord
  - https://docs.openclaw.ai/channels/whatsapp
  - https://docs.openclaw.ai/channels/google-chat
  - https://docs.openclaw.ai/channels/channel-routing
  - https://docs.openclaw.ai/channels/access-groups
  - https://docs.openclaw.ai/channels/troubleshooting
- Hermes user stories and setup docs:
  - https://hermes-agent.nousresearch.com/docs/user-stories
  - https://hermes-agent.nousresearch.com/docs/getting-started/quick-start
  - https://hermes-agent.nousresearch.com/docs/integrations/

## External Pattern Summary

- OpenClaw treats channels as first-class external ingress/egress surfaces with
  per-channel setup, pairing, routing, access controls, and troubleshooting.
- Implemented/common channel families include Telegram, Slack, Discord, WhatsApp,
  Google Chat, and related enterprise or mobile messengers.
- Channel setup must stay constrained by pairing readiness, allowlists/access
  groups, route binding, and loop-protection before remote prompts are trusted.
- Hermes-style user stories emphasize first-run setup, tool/provider
  integrations, task-oriented workflows, and guided setup documentation rather
  than raw provider-specific commands.

## Current Xenesis Coverage Observed

- `src/shared/xenesisConnections.ts` already models:
  - Implemented messengers: `telegram`, `slack`, `discord`, `webhook`.
  - Planned messengers including `whatsapp`, `signal`, `microsoft-teams`,
    `google-chat`, `imessage`, `matrix`, `irc`, `mattermost`, `nextcloud-talk`,
    `nostr`, `raft`, `tlon`, `rocket-chat`, `twitch`, `line`, `wechat`,
    `qqbot`, `feishu`, `lark`, `dingding`, `zalo`, `email`, `sms`,
    `home-assistant`, and `ntfy`.
  - Read/open CR surfaces for messenger views, channel routing, safety, access
    groups, pairing, user stories, and profile draft review.
- Before the planned messenger target slice,
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
  resolved natural-language messenger targets only for `telegram`, `slack`,
  `discord`, and `webhook`.

## Gap Map

- Planned messenger cards existed in the Connection Center but were not
  reachable through natural-language target names such as WhatsApp, Signal,
  Microsoft Teams, or Google Chat before the planned messenger target slice.
- This blocks the user's preferred flow: ask Xenesis Agent in natural language
  to open or inspect internal Desk setup/readiness views for external messengers.
- Safe next slice: expand the Agent natural-language target resolver for planned
  messenger view/status use cases without enabling delivery, gateway lifecycle
  actions, credential writes, or profile mutations.

## Next Implementation Candidate

- Implemented in the planned messenger target slice:
  - `왓츠앱 setup 열어줘` ->
    `xd.xenesis.messengers.views.open` with `id=whatsapp`.
  - `구글 챗 setup 상태 보여줘` ->
    `xd.xenesis.messengers.views.status` with `id=google-chat`.
  - `마이크로소프트 팀즈 설정 열어줘` ->
    `xd.xenesis.messengers.views.open` with `id=microsoft-teams`.
- Also added a natural target alias for `signal`.
- Scope boundary: view/status only. Do not use this slice to route pairing,
  access group, profile draft, test send, gateway lifecycle, or remote prompt
  execution for planned messengers unless their CR argument schema is verified
  separately.

## Planned Messenger Channel Guard Slice

- Added an implemented-channel guard in the Agent natural-language planner.
- Planned messenger prompts such as `구글 챗 라우팅 상태 보여줘` and
  `왓츠앱 안전 상태 보여줘` now fall back to
  `xd.xenesis.messengers.views.status` instead of emitting implemented-channel
  only paths such as `xd.xenesis.channels.routing.status` or
  `xd.xenesis.channels.safety.status`.
- Planned messenger profile prompts such as `구글 챗 프로필 초안 열어줘` now
  open the internal messenger view rather than `xd.xenesis.channels.profileDrafts.open`.
- Planned messenger profile review prompts such as `왓츠앱 프로필 검토 요청해줘`
  now record a generic setup request through
  `xd.xenesis.connections.setupRequests.request` rather than using channel
  profile draft review paths that only accept implemented channels.
- Pairing and user-story natural routing remains available for planned
  messengers because those CR schemas accept planned messenger IDs.

## Planned Messenger Alias Coverage Slice

- Expanded Agent natural-language target aliases for the remaining planned
  messenger cards already modeled in `src/shared/xenesisConnections.ts`:
  iMessage, Matrix, IRC, Mattermost, Nextcloud Talk, Nostr, Raft, Tlon,
  Synology Chat, Twitch, LINE, WeChat, QQ Bot, Feishu/Lark, Yuanbao, Zalo,
  Email, SMS, Home Assistant, and ntfy.
- Prompts such as `아이메시지 setup 열어줘`, `LINE setup 열어줘`,
  `이메일 setup 열어줘`, `홈 어시스턴트 setup 열어줘`, and `ntfy setup 열어줘`
  now open the internal planned messenger view through
  `xd.xenesis.messengers.views.open`.
- Planned messenger readbacks such as `ntfy setup 상태 보여줘`,
  `라크 사용자 스토리 상태 보여줘`, and `SMS 페어링 상태 보여줘` now route
  to existing safe CR read paths without enabling delivery.
- Planned messenger profile review prompts such as
  `Zalo 프로필 검토 요청해줘` remain generic setup-request records through
  `xd.xenesis.connections.setupRequests.request`, not implemented-channel
  profile draft requests.

## Tool Alias Coverage Slice

- Expanded Agent natural-language target aliases for existing external tool
  cards, without adding new CR nodes or executing installs/OAuth/tool calls.
- Google Workspace now also matches Google Drive, Google Docs/독스, and
  workspace wording so prompts such as `구글 드라이브 setup 열어줘`,
  `Google Drive OAuth 상태 보여줘`, `구글 독스 액션 정책 상태 보여줘`, and
  `구글 드라이브 OAuth 검토 요청해줘` route to the existing Google Workspace
  tool view, OAuth draft, and action catalog CR paths.
- Fetch now matches web page fetch wording such as
  `웹페이지 가져오기 설치 계획 열어줘`.
- Filesystem now matches spaced Korean and workspace-file wording such as
  `파일 시스템 connector 열어줘`.

## Planned Enterprise Messenger Catalog Slice

- Added planned-only Connection Center cards for Rocket.Chat and
  DingTalk/Dingding, closing the mismatch between the cached channel gap map and
  the actual `PLANNED_MESSENGERS` source list.
- The new cards inherit existing planned messenger internals: safe messenger
  views, pairing metadata, user-story planning, setup request templates,
  diagnostics, and no delivery/profile mutation actions.
- Agent natural-language prompts such as `로켓챗 setup 열어줘` and
  `딩딩 setup 상태 보여줘` now route to existing
  `xd.xenesis.messengers.views.open` / `xd.xenesis.messengers.views.status`
  paths.
- `Feishu / Lark` remains a combined card with Lark aliases; this slice does
  not create a duplicate Lark ID.

## Guide Doc Surfaces Slice

- Added repo-local manual guide surfaces for the cached OpenClaw/Hermes gap map
  without re-browsing external docs:
  - `docs/manual/10-openclaw-channel-setup.md`
  - `docs/manual/11-external-tool-integrations.md`
- Added `openclaw-channel-setup` and `external-tool-integrations` to the
  Connection Center guide catalog with read/open metadata, validation paths,
  user-story templates, and explicit safety boundaries.
- Agent natural-language guide prompts such as
  `오픈클로 채널 가이드 파일 열어줘`,
  `외부 도구 통합 가이드 상태 보여줘`, and
  `구글 드라이브 통합 guide file 열어줘` now route through existing
  `xd.xenesis.guides.open` / `xd.xenesis.guides.status` paths.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, MCP installs, OAuth completion, provider tool execution,
  gateway lifecycle actions, channel delivery, settings mutation, credential
  storage, or approval bypasses.

## Guide Id Parity Slice

- Fixed guide catalog id parity for the repo-local OpenClaw/Hermes guide cards:
  - `openclaw-channel-setup`
  - `external-tool-integrations`
- These guide cards already existed in `XENESIS_CONNECTION_GUIDES`, and the
  Agent natural-language planner already emitted those ids for prompts such as:
  - `오픈클로 채널 가이드 파일 열어줘`
  - `외부 도구 통합 가이드 상태 보여줘`
- The CR schema and main-process guide allowlist now accept those ids for:
  - `xd.xenesis.guides.status`
  - `xd.xenesis.guides.open`
- Scope boundary: this slice did not add guides, mutate guide contents, change
  dispatcher paths, install MCP servers, complete OAuth, enable messenger
  delivery, start the gateway, or bypass approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Guide Aggregate Catalog Slice

- Added deterministic Xenesis Agent natural-language routing for broad guide
  catalog prompts that do not name one guide:
  - `가이드 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis Agent
    Connection Center selected.
  - `guide catalog 열어줘` -> `xd.panes.settings.open` with the Xenesis Agent
    Connection Center selected.
  - `가이드 전체 상태 보여줘` -> `xd.xenesis.guides.status` with `{}`.
  - `guide catalog 상태 보여줘` -> `xd.xenesis.guides.status` with `{}`.
- Specific guide prompts such as `온보딩 가이드 열어줘` and
  `외부 도구 통합 가이드 상태 보여줘` still route to the focused guide id.
- Scope boundary: this slice did not create guide files, mutate guide content,
  install MCP servers, complete OAuth, start gateways, send messages, change
  providers, add CR nodes, change dispatcher branches, or bypass approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Provider Alias Coverage Slice

- Expanded Xenesis Agent natural-language provider target resolution for the
  AI providers already modeled by Settings and provider CR schemas:
  `claude-interactive`, `azure`, `groq`, `deepseek`, `qwen`, `lmstudio`,
  `together`, and `fireworks`.
- Provider prompts such as `LM Studio provider setup 열어줘`,
  `Azure OpenAI provider routing 상태 보여줘`,
  `Qwen provider profile draft 열어줘`, and
  `Claude interactive provider profile 검토 요청해줘` now route through existing
  `xd.xenesis.providers.views.open`,
  `xd.xenesis.providers.routing.status`,
  `xd.xenesis.providers.profileDrafts.open`, and
  `xd.xenesis.providers.profileDrafts.request` paths.
- Capability tests now assert that all Settings `AiProviderKind` values are
  accepted by the provider setup, routing, view, and profile-draft schemas.
- Scope boundary: this slice did not add provider mutation paths, credential
  writes, local CLI switching, provider prompt execution, fallback rewrites,
  dispatcher branches, renderer adapters, or approval bypasses.

## Local CLI MCP Readbacks Slice

- Added deterministic Xenesis Agent natural-language readbacks for existing
  local CLI and MCP CR paths without re-browsing external docs:
  - `로컬 CLI 스캔해줘` -> `xd.localCli.scan`.
  - `MCP 설정 상태 보여줘` -> `xd.mcp.settings.status`.
  - `MCP 브리지 상태 보여줘` -> `xd.mcp.bridge.status`.
- Added the same CR paths to the Agent control prompt hint so Agent-pane runs
  prefer read-only local state inspection before any install/config guidance.
- Preserved target-specific MCP install draft routing: prompts such as
  `노션 MCP 설치 초안 열어줘` still route to
  `xd.xenesis.tools.mcpInstallDrafts.open`.
- Scope boundary: this slice did not install MCP servers, write MCP config,
  run shell commands, mutate settings, change local CLI selection, start
  gateway processes, execute provider tools, add CR nodes, change dispatcher
  branches, write credentials, or bypass approvals.

## Gateway Read/Open Slice

- Added deterministic Xenesis Agent natural-language routing for existing
  runtime gateway read/open CR paths:
  - `게이트웨이 상태 보여줘` -> `xd.xenesis.gateway.status`.
  - `Xenesis gateway dashboard 열어줘` ->
    `xd.xenesis.gateway.openDashboard`.
- Preserved onboarding checklist routing: `게이트웨이 온보딩 상태 보여줘`
  remains `xd.xenesis.onboarding.status` with `id=gateway`.
- Added the same CR paths to the Agent control prompt hint with an explicit
  boundary that gateway start/stop/restart require separate user intent and
  approval handling.
- Scope boundary: this slice did not start, stop, restart, configure, or
  install the gateway; did not run provider prompts; did not change workspaces,
  write credentials, enable messenger delivery, add CR nodes, change dispatcher
  branches, or bypass approvals.

## Onboarding Aggregate Natural Language Slice

- Added deterministic Xenesis Agent natural-language routing for broad
  onboarding and initial-setup prompts that do not name a specific checklist
  step:
  - `온보딩 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis Agent
    Connection Center selected.
  - `초기 설정 체크리스트 열어줘` -> `xd.panes.settings.open` with the Xenesis
    Agent Connection Center selected.
  - `초기 설정 전체 상태 보여줘` -> `xd.xenesis.onboarding.status` with `{}`.
  - `초기 설정 체크리스트 확인해줘` -> `xd.xenesis.onboarding.status` with `{}`.
- Specific checklist prompts such as `게이트웨이 온보딩 열어줘` still use
  `xd.xenesis.onboarding.open` with the focused step id.
- Scope boundary: this slice did not mutate onboarding state, install tools,
  complete OAuth, store tokens, start gateways, send messages, change provider
  profiles, add CR nodes, change dispatcher branches, or bypass approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Runtime Inventory Readbacks Slice

- Added deterministic Xenesis Agent natural-language routing for existing
  read-only runtime inventory CR paths:
  - `Xenesis 운영 진단 보여줘` -> `xd.xenesis.diagnostics`.
  - `Xenesis 리포트 목록 보여줘` -> `xd.xenesis.reports.list`.
  - `Xenesis 태스크 목록 보여줘` -> `xd.xenesis.tasks.list`.
  - `Xenesis Agent 목록 보여줘` -> `xd.xenesis.agents.list`.
- Added the same CR paths to the Agent control prompt hint so the Agent prefers
  runtime inspection before prompt submission, run start, profile changes, or
  other stateful operations.
- Scope boundary: this slice did not submit prompts, start runs, install or use
  profiles, mutate provider settings, write credentials, send messages, add CR
  nodes, change dispatcher branches, or bypass approvals.

## Profile List Readback Slice

- Added deterministic Xenesis Agent natural-language routing for the existing
  read-only Xenesis profile inventory CR path:
  - `Xenesis profile 목록 보여줘` -> `xd.xenesis.profiles.list`.
  - `제네시스 active profile 확인해줘` -> `xd.xenesis.profiles.list`.
- Added the same CR path to the Agent control prompt hint so Agent-pane runs
  inspect installed/active profiles before profile installation, activation,
  channel updates, or channel test messages.
- Scope boundary: this slice did not install profiles, switch active profiles,
  update channel settings, send profile test messages, mutate provider
  settings, write credentials, add CR nodes, change dispatcher branches, or
  bypass approvals.

## Runtime Control Actions Slice

- Added deterministic Xenesis Agent natural-language routing for existing
  explicit runtime control CR paths:
  - `Xenesis runtime run 취소해줘` -> `xd.xenesis.runs.cancel`.
  - `제네시스 세션 초기화해줘` -> `xd.xenesis.sessions.reset`.
- Added the same CR paths to the Agent control prompt hint so Agent-pane runs
  can request active-run cancellation or active-session reset through CR instead
  of chat-only instructions.
- Scope boundary: this slice did not start runs, submit prompts, switch or
  install profiles, mutate provider settings, write credentials, send messages,
  start/stop/restart gateways, add CR nodes, change dispatcher branches, or
  bypass approvals. Both natural actions keep `approved=false` so CR approval
  policy remains authoritative.

## Workspace Set Routing Slice

- Added deterministic Xenesis Agent natural-language routing for the existing
  approval-gated Xenesis workspace binding CR path:
  - `Xenesis workspace를 "E:\Workspace\plane"로 설정해줘` ->
    `xd.xenesis.workspace.set` with `path=E:\Workspace\plane`.
  - `제네시스 워크스페이스를 "D:\Projects\desk app"로 바꿔줘` ->
    `xd.xenesis.workspace.set` with `path=D:\Projects\desk app`.
- Added the same CR path to the Agent control prompt hint so Agent-pane runs
  bind workspaces through CR instead of giving chat-only setup instructions.
- Scope boundary: this slice did not create directories, change git worktrees,
  start runs, mutate provider settings, write credentials, install profiles,
  send messages, add CR nodes, change dispatcher branches, or bypass approval
  policy. Natural actions keep `approved=false`, including outside-workspace
  paths.

## Connection Status Hint Slice

- Added the existing read-only Connection Center-wide status CR path to the
  Agent control prompt hint:
  - `xd.xenesis.connections.status`.
- Preserved the existing natural-language readback routing:
  - `Connection Center 전체 상태 보여줘` ->
    `xd.xenesis.connections.status`.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, installs, OAuth completion, provider tool execution,
  profile writes, gateway lifecycle actions, channel delivery, settings
  mutation, credential storage, or approval bypasses. It only made the
  all-connection readiness read path visible before targeted provider, tool,
  messenger, diagnostics, setup-request, onboarding, or guide actions.

## Connection Diagnostics and Setup Request Aggregate Slice

- Added deterministic Xenesis Agent natural-language routing for broad
  Connection Center diagnostic and setup-request catalog prompts:
  - `연결 진단 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis Agent
    Connection Center selected.
  - `설정 요청 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis Agent
    Connection Center selected.
  - `연결 진단 전체 상태 보여줘` ->
    `xd.xenesis.connections.diagnostics.status` with `{}`.
  - `Connection diagnostics 전체 상태 보여줘` ->
    `xd.xenesis.connections.diagnostics.status` with `{}`.
  - `설정 요청 전체 상태 보여줘` ->
    `xd.xenesis.connections.setupRequests.status` with `{}`.
  - `connection setup request 전체 상태 보여줘` ->
    `xd.xenesis.connections.setupRequests.status` with `{}`.
- Target-specific prompts such as `노션 연결 진단 보여줘` and
  `텔레그램 설정 요청 상태 보여줘` still route to focused CR paths with the
  owning connection id.
- Scope boundary: this slice did not record setup request reviews, create
  Action Inbox items, install MCP servers, complete OAuth, store tokens,
  execute provider tools, send messages, mutate settings, add CR nodes, or
  bypass approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Agent Status Events Slice

- Added deterministic Xenesis Agent natural-language routing for existing
  read-only Agent pane readback CR paths when the prompt includes a quoted
  agent id:
  - `Xenesis Agent "xenesis-agent" 상태 보여줘` ->
    `xd.xenesis.agents.status` with `agentId=xenesis-agent`.
  - `Xenesis Agent "xenesis-agent" 이벤트 보여줘` ->
    `xd.xenesis.agents.events` with `agentId=xenesis-agent`.
- Added the same CR paths to the Agent control prompt hint and useful direct
  CR path list so Agent-pane runs inspect quoted Agent pane state/events before
  prompt submission or runtime mutation.
- Scope boundary: this slice did not submit Agent messages, start runs, mutate
  provider settings, write credentials, change workspaces, install profiles,
  send messages, add CR nodes, change dispatcher branches, or bypass approvals.
  `xd.xenesis.agents.submit` remains out of scope.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Run Submit Routing Slice

- Added deterministic Xenesis Agent natural-language routing for existing
  execute CR paths only when executable text is quoted and intent is explicit:
  - `Xenesis runtime run "연결 상태를 요약해줘" 실행해줘` ->
    `xd.xenesis.runs.start` with `prompt=연결 상태를 요약해줘`.
  - `Xenesis Agent "xenesis-agent"에 "연결 상태 요약해줘" 보내줘` ->
    `xd.xenesis.agents.submit` with `agentId=xenesis-agent` and
    `text=연결 상태 요약해줘`.
- Intent detection strips quoted text before matching route keywords, so quoted
  prompt content such as `연결 상태` does not accidentally trigger Connection
  Center readbacks ahead of explicit runtime execution.
- Natural execution actions keep `approved=false`; CR approval policy remains
  authoritative for `when-external` execute paths.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, provider mutation paths, credential writes, profile
  changes, workspace changes, external messenger delivery, or approval bypasses.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Xenesis Status Readback Slice

- Added deterministic Xenesis Agent natural-language routing for the existing
  read-only runtime status CR path:
  - `Xenesis 상태 보여줘` -> `xd.xenesis.status`.
- Added prompt hint guidance that `xd.xenesis.status` reads gateway, workspace,
  and active-run status before run starts, workspace changes, or runtime setup
  troubleshooting.
- The broad status route excludes provider, tool, messenger, onboarding, guide,
  gateway, profile, Agent, report, task, and connection-specific status targets
  so existing detailed CR paths remain preferred.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, execute paths, provider mutation paths, credential writes,
  profile changes, workspace changes, external messenger delivery, or approval
  bypasses.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Messenger Aggregate Readbacks Slice

- Added deterministic Xenesis Agent natural-language routing for broad external
  messenger/channel catalog status prompts that do not name a specific
  messenger:
  - `외부 메신저 라우팅 전체 상태 보여줘` ->
    `xd.xenesis.channels.routing.status`.
  - `외부 메신저 안전 전체 상태 보여줘` ->
    `xd.xenesis.channels.safety.status`.
  - `외부 메신저 접근 그룹 전체 상태 보여줘` ->
    `xd.xenesis.channels.accessGroups.status`.
  - `외부 메신저 페어링 전체 상태 보여줘` ->
    `xd.xenesis.channels.pairing.status`.
  - `외부 메신저 사용자 스토리 전체 상태 보여줘` ->
    `xd.xenesis.channels.userStories.status`.
  - `외부 메신저 프로필 초안 전체 상태 보여줘` ->
    `xd.xenesis.channels.profileDrafts.status`.
  - `channel profile draft 전체 상태 보여줘` ->
    `xd.xenesis.channels.profileDrafts.status`.
  - `외부 메신저 setup 전체 상태 보여줘` ->
    `xd.xenesis.messengers.views.status`.
- The aggregate branch runs after target-specific messenger/tool routing and
  before the generic Connection Center fallback, so prompts like `텔레그램
  페어링 상태 보여줘` keep returning Telegram-specific pairing readbacks.
- Broad profile-draft opens such as `외부 메신저 프로필 초안 전체 열어줘` and
  `channel profile draft 전체 열어줘` now focus the Xenesis Connection Center
  instead of using a focused profile-draft open path, because
  `xd.xenesis.channels.profileDrafts.open` requires one implemented channel.
- The English aggregate readback is checked before target resolution so the word
  `draft` does not accidentally match the planned `raft` messenger alias.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, gateway lifecycle actions, delivery sends, channel
  settings mutation, allowlist updates, credential storage, external-system
  mutation, or approval bypasses. All new routes are read-only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Access Group Synonyms Slice

- Added Korean access-group synonyms for external messenger readbacks:
  - `액세스 그룹`
  - `액세스그룹`
- Prompts such as `디스코드 액세스 그룹 상태 보여줘` now route to
  `xd.xenesis.channels.accessGroups.status` with `channel=discord`.
- Broad prompts such as `외부 메신저 액세스 그룹 전체 상태 보여줘` now route
  to `xd.xenesis.channels.accessGroups.status` with `{}`.
- Scope boundary: this slice only extends deterministic natural-language
  synonyms. It does not add CR nodes, mutate channel settings, update
  allowlists, store credentials, send messages, start the gateway, or bypass
  approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Aggregate Connection Center Opens Slice

- Added deterministic Xenesis Agent natural-language routing for broad
  provider/tool/messenger catalog open prompts that intentionally ask for all
  items:
  - `AI provider setup 전체 열어줘` ->
    `xd.panes.settings.open` with the Xenesis Agent Connection Center selected.
  - `외부 툴 connector 전체 열어줘` ->
    `xd.panes.settings.open` with the Xenesis Agent Connection Center selected.
  - `외부 메신저 setup 전체 열어줘` ->
    `xd.panes.settings.open` with the Xenesis Agent Connection Center selected.
- This uses the existing internal Desk Connection Center as the aggregate
  catalog surface because focused provider/tool/messenger open CR paths require
  a specific provider, tool, or messenger id.
- Non-aggregate prompts remain target-specific:
  - `AI provider setup 열어줘` still opens the `auto` provider view.
  - `노션 connector 열어줘` still opens the Notion tool view.
  - `텔레그램 setup 열어줘` still opens the Telegram messenger view.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, MCP installs, OAuth completion, credential storage,
  gateway lifecycle actions, channel delivery, settings mutation, or approval
  bypasses.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Tool Aggregate Readbacks Slice

- Added deterministic Xenesis Agent natural-language routing for broad
  external-tool catalog status prompts that do not name a specific tool:
  - `외부 툴 connector 전체 상태 보여줘` ->
    `xd.xenesis.tools.connectors.status`.
  - `외부 툴 setup 전체 상태 보여줘` ->
    `xd.xenesis.tools.setup.status`.
  - `외부 툴 view 전체 상태 보여줘` ->
    `xd.xenesis.tools.views.status`.
  - `외부 툴 설치 계획 전체 상태 보여줘` ->
    `xd.xenesis.tools.installPlans.status`.
  - `외부 툴 OAuth 전체 상태 보여줘` ->
    `xd.xenesis.tools.oauthDrafts.status`.
  - `외부 툴 MCP 설치 초안 전체 상태 보여줘` ->
    `xd.xenesis.tools.mcpInstallDrafts.status`.
  - `외부 툴 액션 정책 전체 상태 보여줘` ->
    `xd.xenesis.tools.actions.status`.
  - `외부 툴 사용자 스토리 전체 상태 보여줘` ->
    `xd.xenesis.tools.userStories.status`.
- Added matching detailed external-tool catalog opens for broad tool setup
  work:
  - `외부 툴 setup 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 툴 view 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis
    Agent Connection Center selected.
  - `외부 툴 설치 계획 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 툴 OAuth 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis
    Agent Connection Center selected.
  - `외부 툴 MCP 설치 초안 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 툴 액션 정책 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 툴 사용자 스토리 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
- `외부 툴 connector 전체 열어줘` still uses the generic external-tool catalog
  open because there is no dedicated connector open surface, while
  setup/view/install-plan/OAuth/MCP/action/user-story opens preserve their
  detailed catalog intent in the Agent action id and reason.
- The aggregate branch runs after target-specific tool routing and before the
  generic Connection Center fallback, so prompts like `노션 connector 상태
  보여줘` keep returning Notion-specific connector readbacks.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, MCP installs, MCP config writes, OAuth completion, token
  storage, provider tool execution, external-system mutation, or approval
  bypasses. All new routes are read-only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Provider Aggregate Readbacks Slice

- Added deterministic Xenesis Agent natural-language routing for broad AI
  provider catalog status prompts that intentionally ask for all providers:
  - `AI provider setup 전체 상태 보여줘` ->
    `xd.xenesis.providers.setup.status`.
  - `AI provider routing 전체 상태 보여줘` ->
    `xd.xenesis.providers.routing.status`.
  - `AI provider view 전체 상태 보여줘` ->
    `xd.xenesis.providers.views.status`.
  - `AI provider profile draft 전체 상태 보여줘` ->
    `xd.xenesis.providers.profileDrafts.status`.
- Aggregate provider routing requires explicit aggregate wording such as
  `전체`, `all`, or `catalog`, so provider-specific prompts like
  `codex app-server provider routing 상태 보여줘` remain provider-specific.
- Added matching detailed provider catalog opens for broad provider setup work:
  - `AI provider routing 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `AI provider view 전체 열어줘` -> `xd.panes.settings.open` with the Xenesis
    Agent Connection Center selected.
  - `AI provider profile draft 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
- `AI provider setup 전체 열어줘` still uses the generic provider catalog open,
  while routing/view/profile-draft opens preserve their detailed catalog intent
  in the Agent action id and reason.
- Scope boundary: this slice did not add CR nodes, dispatcher branches,
  renderer adapters, provider setting mutations, credential storage, local CLI
  switching, provider prompt execution, or approval bypasses. All new routes
  are read-only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Provider Model]]
- Relates to [[2026-06-27-xenesis-connection-center]]
