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

## Channel Safety Access Pairing Open + Planner Catalog Reduction

- Added CR open/focus paths for the existing channel setup read models:
  - `xd.xenesis.channels.safety.open`
  - `xd.xenesis.channels.accessGroups.open`
  - `xd.xenesis.channels.pairing.open`
- Natural-language examples now preserve the requested setup sub-surface:
  - `텔레그램 안전 열어줘` -> `xd.xenesis.channels.safety.open`
  - `슬랙 access group 열어줘` -> `xd.xenesis.channels.accessGroups.open`
  - `Signal 페어링 열어줘` -> `xd.xenesis.channels.pairing.open`
- Scope boundary: open/focus only. This does not mutate channel settings,
  update allowlists, pair accounts, send test messages, start the gateway, store
  secrets, create Action Inbox items, or bypass approvals.
- Planner cleanup: moved the large built-in tool/view/connection/provider alias
  catalogs out of
  `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentDeskControl.ts`
  into `src/shared/xenesisNaturalLanguageCatalog.ts`.
- Prompt cleanup: the Agent control prompt no longer maintains a static direct
  CR path inventory in the planner file. Its direct-path summary is derived from
  CR paths referenced in the prompt and validated against
  `listDeskBridgeCapabilities()`.
- Regression coverage: `xenesisAgentDeskControl.test.ts` now includes a
  source-level test that blocks reintroducing the old inline target catalog and
  static direct-path dump patterns.
- Verification:
  - Focused Agent/CR tests passed: `npx tsx --test
    src\shared\xenesisConnectionCapabilities.test.ts
    src\shared\xenesisConnections.test.ts
    src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    -> 95/95.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - No external web refresh was used for this slice.

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
- Added matching detailed external-messenger catalog opens for broad messenger
  setup work:
  - `외부 메신저 라우팅 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 메신저 안전 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 메신저 접근 그룹 전체 열어줘` -> `xd.panes.settings.open` with
    the Xenesis Agent Connection Center selected.
  - `외부 메신저 페어링 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
  - `외부 메신저 사용자 스토리 전체 열어줘` -> `xd.panes.settings.open`
    with the Xenesis Agent Connection Center selected.
  - `외부 메신저 view 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected.
- `외부 메신저 setup 전체 열어줘` still uses the generic external-messenger
  catalog open, while routing/safety/access-group/pairing/user-story/view opens
  preserve their detailed catalog intent in the Agent action id and reason.
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

## Planned Messenger Profile Drafts Slice

- Planned external messenger cards now expose review-only channel profile draft
  templates in the Connection Center data model, including Signal, WhatsApp,
  Google Chat, and Zalo.
- `xd.xenesis.channels.profileDrafts.status/open/request` now accept planned
  messenger ids in addition to implemented Telegram, Slack, Discord, and
  webhook ids.
- Xenesis Agent deterministic natural-language routing now sends planned
  messenger profile/draft prompts to channel profile draft CR paths:
  - `Signal channel profile draft 열어줘` ->
    `xd.xenesis.channels.profileDrafts.open` with `channel=signal`.
  - `Signal channel profile draft 상태 보여줘` ->
    `xd.xenesis.channels.profileDrafts.status` with `channel=signal`.
  - `왓츠앱 프로필 검토 요청해줘` ->
    `xd.xenesis.channels.profileDrafts.request` with `channel=whatsapp`.
  - `Zalo 프로필 검토 요청해줘` ->
    `xd.xenesis.channels.profileDrafts.request` with `channel=zalo`.
- Scope boundary: planned messenger profile drafts are review-only. This slice
  did not widen `XenesisProfileChannelName`, `XenesisGatewayChannelName`,
  profile mutation, channel tests, gateway adapters, credential writes,
  delivery actions, allowlist mutation, or approval bypasses.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Tool Connector Open CR Slice

- Added a connector-specific CR open path for external tool connector cards:
  `xd.xenesis.tools.connectors.open`.
- Connector metadata now advertises `xd.xenesis.tools.connectors.open` in
  `toolConnector.controlPaths`, alongside the existing internal tool view and
  generic Connection Center open paths.
- Xenesis Agent deterministic natural-language routing now preserves connector
  intent for focused and aggregate opens:
  - `노션 connector 열어줘` ->
    `xd.xenesis.tools.connectors.open` with `id=notion`.
  - `파일 시스템 connector 열어줘` ->
    `xd.xenesis.tools.connectors.open` with `id=filesystem`.
  - `외부 툴 connector 전체 열어줘` -> `xd.panes.settings.open` with the
    Xenesis Agent Connection Center selected, using a connector-specific action
    id and reason.
- Scope boundary: this slice only opens internal Desk connector surfaces. It did
  not install MCP servers, write MCP config, complete OAuth, store tokens,
  execute provider tools, mutate settings, change external systems, create
  Action Inbox items, add credentials, or bypass approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local code, and tests.

## Tool Setup Open CR Slice

- Added a setup-specific CR open path for external tool setup cards:
  `xd.xenesis.tools.setup.open`.
- Xenesis Agent deterministic natural-language routing now preserves setup/config
  intent for focused external tool opens:
  - `구글 캘린더 setup 열어줘` -> `xd.xenesis.tools.setup.open` with
    `id=google-calendar`.
  - `구글 드라이브 setup 열어줘` -> `xd.xenesis.tools.setup.open` with
    `id=google-workspace`.
- Explicit tool view/화면 prompts still route to `xd.xenesis.tools.views.open`;
  connector prompts still route to `xd.xenesis.tools.connectors.open`.
- Scope boundary: this slice only opens internal Desk setup surfaces. It did not
  install MCP servers, write MCP config, complete OAuth, store tokens, execute
  provider tools, mutate settings, change external systems, create Action Inbox
  items, add credentials, or bypass approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Provider Setup Open CR Slice

- Added a setup-specific CR open path for AI provider setup cards:
  `xd.xenesis.providers.setup.open`.
- Xenesis Agent deterministic natural-language routing now preserves setup/config
  intent for focused provider opens:
  - `AI provider setup 열어줘` -> `xd.xenesis.providers.setup.open` with
    `provider=auto`.
  - `codex app-server provider setup 열어줘` ->
    `xd.xenesis.providers.setup.open` with `provider=codex-app-server`.
  - `LM Studio provider setup 열어줘` -> `xd.xenesis.providers.setup.open`
    with `provider=lmstudio`.
- Explicit provider view/화면 prompts still route to
  `xd.xenesis.providers.views.open`; profile/draft prompts still route to
  `xd.xenesis.providers.profileDrafts.open`.
- Scope boundary: this slice only opens internal Desk provider setup surfaces.
  It did not mutate provider settings, store credentials, switch local CLI
  selection, run provider prompts, create Action Inbox items, or bypass
  approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Channel Routing Open CR Slice

- Added a routing-specific CR open path for implemented external messenger
  channels: `xd.xenesis.channels.routing.open`.
- Xenesis Agent deterministic natural-language routing now preserves focused
  channel routing intent:
  - `텔레그램 routing 열어줘` -> `xd.xenesis.channels.routing.open` with
    `channel=telegram`.
  - `슬랙 라우팅 열어줘` -> `xd.xenesis.channels.routing.open` with
    `channel=slack`.
- Planned messenger routing opens still use the generic messenger view until
  routing read/open models are widened to planned channels.
- Scope boundary: this slice only opens internal Desk channel routing surfaces.
  It did not mutate channel settings, update access groups, send test messages,
  start the gateway, store secrets, create Action Inbox items, or bypass
  approvals.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Tool Install Plan Request CR Slice

- Added a review-only CR request path for external tool install plans:
  `xd.xenesis.tools.installPlans.request`.
- The install-plan group now has the same read/open/request shape as other
  reviewable setup surfaces:
  - `xd.xenesis.tools.installPlans.status`
  - `xd.xenesis.tools.installPlans.open`
  - `xd.xenesis.tools.installPlans.request`
- Main-process handling records a local Action Inbox item for the selected
  tool's install-plan review and returns the existing install-plan status item.
- Xenesis Agent deterministic routing now preserves install-plan review intent:
  - `노션 설치 계획 검토 요청해줘` ->
    `xd.xenesis.tools.installPlans.request` with `id=notion`.
- The Agent control prompt now lists
  `xd.xenesis.tools.installPlans.request` and explicitly states tool install
  plans are review-only.
- Scope boundary: this slice does not execute installs, write MCP config,
  complete OAuth, store tokens, execute provider tools, mutate settings, mutate
  external systems, or bypass approvals. It only records a local review item.
- Verification:
  - Focused capability and Agent tests passed.
  - Related 95-test slice passed.
  - Root typecheck passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - Public-release check still fails on the known missing
    `.github/workflows/ci.yml` infra gap.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Planned Messenger Channel Guards CR Slice

- Added planned messenger routing, safety, and access-group guard metadata to
  the existing Connection Center model.
- `xd.xenesis.channels.routing.status/open`,
  `xd.xenesis.channels.safety.status/open`, and
  `xd.xenesis.channels.accessGroups.status/open` now accept planned messenger
  ids instead of implemented-only channel ids.
- Planned guard metadata is read/open only:
  - route binding uses `<channel>.plannedRoute`
  - access group binding uses `plannedAllowedRoutes`
  - delivery features explicitly include `delivery-disabled`
  - safety boundaries state planned channel delivery remains disabled
- Xenesis Agent deterministic routing now preserves planned messenger guard
  intent:
  - `구글 챗 라우팅 상태 보여줘` ->
    `xd.xenesis.channels.routing.status` with `channel=google-chat`.
  - `왓츠앱 안전 상태 보여줘` ->
    `xd.xenesis.channels.safety.status` with `channel=whatsapp`.
  - `마이크로소프트 팀즈 access group 열어줘` ->
    `xd.xenesis.channels.accessGroups.open` with
    `channel=microsoft-teams`.
- The messenger id catalog was also aligned with planned cards by adding the
  previously missing `rocket-chat` and `dingding` ids to the CR/main validator
  lists.
- Scope boundary: this slice does not enable gateway delivery, send/test
  messages, write profiles, update allowlists, store credentials, execute
  pairing, start gateways, call external APIs, or bypass approvals.
- Verification:
  - Related 96-test slice passed.
  - Scoped Biome check exited 0 with existing warnings only.
  - Root typecheck passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - Public-release check was not rerun for this slice; same-session known gap is
    missing `.github/workflows/ci.yml`.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Provider Routing Open CR Slice

- Added a routing-specific CR open path for AI provider route/retry/fallback
  and credential-pool cards: `xd.xenesis.providers.routing.open`.
- The provider routing group now has read/open parity:
  - `xd.xenesis.providers.routing.status`
  - `xd.xenesis.providers.routing.open`
- Main-process handling focuses the existing provider routing Connection Center
  card and returns the same routing read model as status. It accepts either an
  active provider id such as `codex-app-server` or a provider-card id such as
  `provider-codex-app-server`; omitted provider opens the routing catalog card.
- Xenesis Agent deterministic routing now preserves provider routing open
  intent:
  - `AI provider routing 전체 열어줘` ->
    `xd.xenesis.providers.routing.open` with `ensureVisible=true`.
  - `codex app-server provider routing 열어줘` ->
    `xd.xenesis.providers.routing.open` with `provider=codex-app-server`.
- Added explicit provider-open intent gating so names such as `OpenAI` do not
  turn status/readback prompts into open actions.
- Scope boundary: this slice only opens internal Desk provider routing
  surfaces. It does not mutate provider settings, change active provider,
  switch local CLI, write credentials, edit fallback chains, run provider
  prompts, create Action Inbox items, or bypass approvals.
- Verification:
  - RED tests failed for missing `xd.xenesis.providers.routing.open` registry
    coverage and generic settings fallback routing.
  - Related 96-test slice passed.
  - Focused provider capability test passed after the test typing fix.
  - Scoped Biome check exited 0 with existing warnings only.
  - Root typecheck passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - Full `npm run lint` still fails on existing repo-wide Biome diagnostics and
    line-ending/format issues outside this slice.
  - Public-release check still fails on the known missing
    `.github/workflows/ci.yml` infra gap.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Agent Hint Registry Inventory Slice

- Reduced hardcoded CR path inventory inside
  `xenesisAgentDeskControl.ts` for the Agent control prompt hint.
- The hint now discovers Connection Center callable CR paths from the Capability
  Registry using safe prefixes:
  - `xd.xenesis.connections`
  - `xd.xenesis.onboarding`
  - `xd.xenesis.guides`
  - `xd.xenesis.providers`
  - `xd.xenesis.tools`
  - `xd.xenesis.channels`
  - `xd.xenesis.messengers`
- Provider, tool, and channel prompt-hint bullets now describe behavior classes
  and safety boundaries instead of manually listing every path in the planner
  file.
- Existing high-value CR path assertions still pass because the generated hint
  includes the registry-discovered path list.
- Scope boundary: prompt hint inventory only. This slice does not change
  deterministic natural-language routing, CR dispatcher behavior, provider/tool
  settings, Action Inbox behavior, OAuth, credentials, external calls, or Desk
  mutations.
- Verification:
  - RED tests failed first because the source still contained exhaustive inline
    provider path list text and the hint lacked the registry-discovered line.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - Scoped Biome check exited 0 for the touched Agent control files.
  - Root typecheck passed.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Tool Catalog CR Opens Slice

- External-tool aggregate open prompts now use tool-specific CR open paths
  instead of the generic Settings fallback:
  - `외부 툴 connector 전체 열어줘` -> `xd.xenesis.tools.connectors.open`
  - `외부 툴 setup 전체 열어줘` -> `xd.xenesis.tools.setup.open`
  - `외부 툴 view 전체 열어줘` -> `xd.xenesis.tools.views.open`
  - `외부 툴 설치 계획 전체 열어줘` ->
    `xd.xenesis.tools.installPlans.open`
  - `외부 툴 OAuth 전체 열어줘` ->
    `xd.xenesis.tools.oauthDrafts.open`
  - `외부 툴 MCP 설치 초안 전체 열어줘` ->
    `xd.xenesis.tools.mcpInstallDrafts.open`
  - `외부 툴 액션 정책 전체 열어줘` ->
    `xd.xenesis.tools.actions.open`
  - `외부 툴 사용자 스토리 전체 열어줘` ->
    `xd.xenesis.tools.userStories.open`
- The corresponding tool CR open schemas now allow catalog opens without a
  focused `id`. Focused `id/tool/name` opens remain supported and still focus
  the owning card.
- Main-process tool open handlers share one catalog-open helper that opens
  Settings > Xenesis Agent > Connections without a focus id when the caller asks
  for the whole catalog, and returns the relevant read model.
- Scope boundary: open/read internal Desk surfaces only. This slice does not
  install MCP servers, write MCP config, complete OAuth, store tokens, execute
  provider tools, mutate settings, mutate external systems, or bypass
  approvals.
- Verification:
  - RED tests failed first for required `id` schemas and generic Settings
    fallback routing.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 97/97 tests.
  - Touched-file Biome check exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - Full repo lint and public-release checks still fail on known existing
    repo-wide Biome diagnostics and missing `.github/workflows/ci.yml`.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Provider Catalog CR Opens Slice

- Provider aggregate open prompts now use provider-specific CR open paths
  instead of the generic Settings fallback:
  - `AI provider setup 전체 열어줘` -> `xd.xenesis.providers.setup.open`
  - `AI provider view 전체 열어줘` -> `xd.xenesis.providers.views.open`
  - `AI provider profile draft 전체 열어줘` ->
    `xd.xenesis.providers.profileDrafts.open`
- The corresponding provider CR open schemas now allow catalog opens without a
  focused `provider`. Focused `provider/id/name` opens remain supported.
- Main-process provider setup/view/profile-draft open handlers share one
  catalog-open helper that opens Settings > Xenesis Agent > Connections without
  a focus id for catalog opens and focuses the provider/card when a selector is
  supplied.
- Scope boundary: open/read internal Desk provider surfaces only. This slice
  does not mutate provider settings, credentials, model selection, runtime
  routing, fallback chains, local CLI selection, Action Inbox records, or
  provider prompt runs.
- Verification:
  - RED tests failed first for required `provider` schemas and generic Settings
    fallback routing.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 98/98 tests.
  - Touched-file Biome check exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Messenger Catalog CR Opens Slice

- External messenger/channel aggregate open prompts now use channel/messenger
  CR open paths instead of the generic Settings fallback:
  - `외부 메신저 setup 전체 열어줘` ->
    `xd.xenesis.messengers.views.open`
  - `외부 메신저 라우팅 전체 열어줘` ->
    `xd.xenesis.channels.routing.open`
  - `외부 메신저 안전 전체 열어줘` ->
    `xd.xenesis.channels.safety.open`
  - `외부 메신저 접근 그룹 전체 열어줘` ->
    `xd.xenesis.channels.accessGroups.open`
  - `외부 메신저 페어링 전체 열어줘` ->
    `xd.xenesis.channels.pairing.open`
  - `외부 메신저 사용자 스토리 전체 열어줘` ->
    `xd.xenesis.channels.userStories.open`
  - `외부 메신저 view 전체 열어줘` ->
    `xd.xenesis.messengers.views.open`
  - `외부 메신저 프로필 초안 전체 열어줘` ->
    `xd.xenesis.channels.profileDrafts.open`
- The corresponding CR open schemas now allow catalog opens without focused
  `channel`/`id` selectors. Focused channel/id opens remain supported.
- Main-process messenger/channel open handlers share one catalog helper that
  opens Settings > Xenesis Agent > Connections without a focus id for catalog
  opens and focuses the channel/card when a selector is supplied.
- Scope boundary: open/read internal Desk messenger surfaces only. This slice
  does not send external messages, mutate channel credentials, change
  allowlists, approve Action Inbox records, or run messenger/provider prompts.
- Verification:
  - RED tests failed first for required `channel`/`id` schemas and generic
    Settings fallback routing.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 99/99 tests.
  - Touched-file Biome check exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed after fixing the new helper option type.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Guide Diagnostic Catalog CR Opens Slice

- Guide, diagnostic runbook, and setup-request aggregate open prompts now use
  CR open paths instead of the generic Settings fallback:
  - `연결 진단 전체 열어줘` ->
    `xd.xenesis.connections.diagnostics.open`
  - `설정 요청 전체 열어줘` ->
    `xd.xenesis.connections.setupRequests.open`
  - `가이드 전체 열어줘` -> `xd.xenesis.guides.open`
  - `guide catalog 열어줘` -> `xd.xenesis.guides.open`
- `xd.xenesis.guides.open` now allows catalog opens without a focused `id`.
- Diagnostic/setup-request catalog opens use a separate optional connection
  catalog-open schema so the generic focused `xd.xenesis.connections.open`
  contract still requires an `id`.
- Main-process guide, diagnostic, and setup-request open handlers now open
  Settings > Xenesis Agent > Connections without `focusConnectionId` for catalog
  calls and focus a card when a selector is supplied.
- Scope boundary: open/read internal Desk surfaces only. This slice does not
  create setup request Action Inbox records, open external docs, execute
  installs, mutate credentials, or run provider/tool/messenger prompts.
- Verification:
  - RED tests failed first for required `id` schemas and generic Settings
    fallback routing.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Touched-file Biome check exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Broad Provider/Tool Catalog CR Opens Slice

- Broad provider/tool aggregate open prompts now use setup catalog CR open paths
  instead of the generic Settings fallback:
  - `AI provider 전체 열어줘` -> `xd.xenesis.providers.setup.open`
  - `외부 툴 전체 열어줘` -> `xd.xenesis.tools.setup.open`
- This is planner-only because provider/tool selector-less setup catalog opens
  already existed from earlier CR catalog slices.
- Scope boundary: this slice does not change provider/tool schemas,
  main-process handlers, provider settings, tool credentials, OAuth, install
  plans, Action Inbox records, or runtime provider/tool behavior.
- Verification:
  - RED planner test failed first because `AI provider 전체 열어줘` still routed
    to `xd.panes.settings.open`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Touched-file Biome check passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Onboarding Catalog CR Open Slice

- Broad onboarding checklist open prompts now use the onboarding CR open path
  instead of the generic Settings fallback:
  - `온보딩 전체 열어줘` -> `xd.xenesis.onboarding.open`
  - `초기 설정 체크리스트 열어줘` -> `xd.xenesis.onboarding.open`
- `xd.xenesis.onboarding.open` now supports selector-less catalog opens. A
  focused `id` still opens a specific onboarding checklist step.
- Main-process onboarding open handling now opens Settings > Xenesis Agent >
  Connections without `focusConnectionId` for catalog calls and returns all
  onboarding checklist items.
- Scope boundary: this slice does not run onboarding steps, prepare/reset
  sample workspaces, create demo-route artifacts, mutate provider/tool/messenger
  settings, or bypass approvals.
- Verification:
  - RED tests failed first because broad onboarding prompts still routed to
    `xd.panes.settings.open` and onboarding open schema still required `id`.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 67/67 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Touched-file Biome check exited 0 with existing warnings/infos only.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Connection Center Catalog CR Open Slice

- Broad Connection Center open prompts now use the connection CR open path
  instead of direct Settings args:
  - `연결 센터 열어줘` -> `xd.xenesis.connections.open`
- `xd.xenesis.connections.open` now supports selector-less catalog opens. A
  focused `id` or `connectionId` still opens a specific Connection Center card.
- Shared CR dispatch now calls `openBuiltinPane` with Settings > Xenesis Agent >
  Connections and only includes `focusConnectionId` when a selector is supplied.
- Scope boundary: this slice does not mutate settings, credentials, OAuth,
  installs, setup requests, onboarding steps, or provider/tool/messenger runtime
  behavior.
- Verification:
  - RED tests failed first because broad Connection Center prompts still routed
    to `xd.panes.settings.open`, connections open schema still required `id`,
    and selector-less dispatch still returned a missing-id error.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 67/67 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Touched-file Biome check exited 0 with existing warnings only.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Imperative Setup Review Requests Slice

- Natural setup imperatives now route to existing review-only CR request paths
  instead of falling through or implying direct execution:
  - `노션 연결해줘` -> `xd.xenesis.connections.setupRequests.request`
  - `노션 MCP 설치해줘` -> `xd.xenesis.tools.mcpInstallDrafts.request`
  - `구글 캘린더 OAuth 인증해줘` -> `xd.xenesis.tools.oauthDrafts.request`
  - `AI provider 설정해줘` -> `xd.xenesis.providers.profileDrafts.request`
- The planner still preserves explicit open/readback prompts, so `열어줘` and
  status/show requests continue to use open/status CR paths.
- Workspace path binding now runs before connection review routing so
  `Xenesis workspace ... 설정해줘` remains `xd.xenesis.workspace.set` instead
  of matching the Google Workspace tool alias.
- Scope boundary: this slice does not execute installs, complete OAuth, write
  MCP config, store credentials/tokens, mutate provider settings, send
  messages, call external APIs, or bypass approvals.
- Verification:
  - RED planner test failed first because imperative setup wording without
    `요청/request/등록` was not routed to review-only CR paths.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Touched-file Biome check passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Onboarding Natural Catalog Refactor Slice

- Removed the inline onboarding step natural-language target catalog from
  `xenesisAgentDeskControl.ts`.
- Added shared `XENESIS_NATURAL_ONBOARDING_STEP_TARGETS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`, alongside the existing
  provider/tool/messenger/view natural-language catalogs.
- The planner now resolves onboarding steps through
  `findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_ONBOARDING_STEP_TARGETS)`.
- Added a source-level guard so the planner must reference the shared catalog
  and cannot reintroduce the local `const steps` onboarding target list.
- Scope boundary: this slice preserves existing onboarding CR open/status
  behavior. It does not add new onboarding steps, change CR schemas, execute
  setup actions, browse external docs, or change guide selection logic.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_ONBOARDING_STEP_TARGETS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Guide Natural Catalog Refactor Slice

- Removed guide target alias/precedence hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added shared `XENESIS_NATURAL_GUIDE_TARGETS`,
  `XenesisNaturalGuideTarget`, and `findXenesisNaturalGuideTarget` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- The shared guide resolver now owns:
  - direct alias matches for Agent user stories, external tool integrations,
    OpenClaw-style channel setup, CR/MCP/gateway/bots, and the onboarding
    fallback guide;
  - grouped match rules for phrases like tool/channel integrations;
  - blockers so ambiguous Hermes wording still selects user stories unless
    tool/channel integration wording is also present.
- The planner now only checks guide context (`가이드`, `guide`, `문서`,
  `playbook`) and delegates guide selection to the shared resolver.
- Added a source-level guard so guide target IDs and branch data cannot be
  reintroduced inside the planner file.
- Scope boundary: this slice preserves existing guide CR open/status behavior
  and does not add guide IDs, mutate CR schemas, execute setup actions, browse
  external docs, or change onboarding behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `findXenesisNaturalGuideTarget`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Intent Vocabulary Refactor Slice

- Removed the large inline action/open intent word lists from
  `xenesisAgentDeskControl.ts`.
- Added shared `XENESIS_NATURAL_EXPLICIT_OPEN_WORDS` and
  `XENESIS_NATURAL_ACTION_INTENT_WORDS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- The planner now keeps the regex checks and route ordering, but consumes named
  shared vocabulary constants for natural action/open intent detection.
- Added a source-level guard so the action intent list cannot be reintroduced
  inline in the planner file.
- Scope boundary: this slice preserves existing action detection behavior. It
  does not add or remove intent words, reorder natural-language routes, change
  CR paths, browse external docs, or change execution/approval behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_ACTION_INTENT_WORDS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Layout Vocabulary Refactor Slice

- Removed deterministic layout/window vocabulary lists from
  `xenesisAgentDeskControl.ts`.
- Added shared layout target catalogs to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_PLACEMENT_TARGETS`
  - `XENESIS_NATURAL_DOCK_SIDE_TARGETS`
  - `XENESIS_NATURAL_DOCK_WINDOW_STATE_TARGETS`
  - `XENESIS_NATURAL_ARRANGE_MODE_TARGETS`
  - `XENESIS_NATURAL_WINDOW_SIZE_PRESET_TARGETS`
- The planner now resolves placement, dock side, dock window state, arrange
  mode, and window-size preset through `findXenesisNaturalWordsTarget`.
- Added a source-level guard so representative layout word arrays cannot be
  reintroduced inline in the planner file.
- Scope boundary: this slice preserves existing placement, dock, arrange, and
  window-size behavior. It does not reorder natural-language routes, change CR
  paths, browse external docs, or alter execution/approval behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_PLACEMENT_TARGETS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Context Vocabulary Refactor Slice

- Removed deterministic guide/onboarding/catalog context word lists from
  `xenesisAgentDeskControl.ts`.
- Added shared context constants to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_GUIDE_CONTEXT_WORDS`
  - `XENESIS_NATURAL_GUIDE_FILE_OPEN_WORDS`
  - `XENESIS_NATURAL_ONBOARDING_CONTEXT_WORDS`
  - `XENESIS_NATURAL_CONNECTION_READBACK_INTENT_WORDS`
  - `XENESIS_NATURAL_EXTERNAL_TOOL_CATALOG_CONTEXT_WORDS`
  - `XENESIS_NATURAL_EXTERNAL_MESSENGER_CATALOG_CONTEXT_WORDS`
  - `XENESIS_NATURAL_AGGREGATE_CATALOG_CONTEXT_WORDS`
- The planner now consumes named shared context constants for guide detection,
  repo-local guide file opens, onboarding checklist prompts, Connection Center
  readbacks, external tool/messenger catalog prompts, and aggregate catalog
  prompts.
- Added source-level guards so representative context arrays cannot be
  reintroduced inline in the planner file.
- Scope boundary: this slice preserves existing route order, CR paths, and
  approval/execution behavior. It does not add or remove vocabulary, browse
  external docs, or change catalog semantics.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_GUIDE_CONTEXT_WORDS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Category Vocabulary Refactor Slice

- Removed repeated Xenesis Agent setup/surface/category word lists from
  `xenesisAgentDeskControl.ts`.
- Added shared category constants to
  `src/shared/xenesisNaturalLanguageCatalog.ts` for connection diagnostics,
  setup requests, review requests, setup imperatives, profile drafts,
  provider profiles, connectors, MCP install drafts, OAuth drafts, views,
  install plans, setup/config, action policy, user stories, routing fallback,
  channel safety/access/pairing, and messenger view fallbacks.
- The planner now consumes named shared vocabulary constants for provider,
  tool, messenger, review-request, and Connection Center category routing.
- Added source-level guards so representative inline category arrays cannot be
  reintroduced into the planner.
- Scope boundary: this slice preserves route order, CR paths, action ids,
  args, and approval/execution behavior. It does not browse external docs,
  change CR schemas, execute installs/OAuth/setup actions, or mutate settings.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_CONNECTION_DIAGNOSTIC_CONTEXT_WORDS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - `npx biome check ... --write --max-diagnostics 40` fixed import ordering
    after the first scoped Biome check reported two organizeImports issues.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Runtime Vocabulary Refactor Slice

- Removed repeated Xenesis runtime/local CLI/MCP/gateway/profile/run/session/
  workspace word lists from `xenesisAgentDeskControl.ts`.
- Added shared runtime constants to
  `src/shared/xenesisNaturalLanguageCatalog.ts` for readback words, open/show
  words, local CLI scan/status, MCP bridge/settings, gateway dashboard/status,
  Xenesis runtime status targets, Agent events/status/submit, reports/tasks/
  agents inventory, operational diagnostics, profile inventory, run start/
  cancel, session reset, and workspace binding.
- The planner now consumes named shared vocabulary constants for those runtime
  and setup-adjacent surfaces while preserving route order and CR action
  construction.
- Added source-level guards so representative runtime arrays cannot be
  reintroduced into the planner.
- Scope boundary: this slice preserves route order, CR paths, action ids,
  args, quoted-text/path extraction, and approval/execution behavior. It does
  not browse external docs, execute runs, mutate workspaces, or start/stop
  gateway processes.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_RUNTIME_READBACK_WORDS`.
  - The first GREEN planner run surfaced a missing production import for
    `XENESIS_NATURAL_REPORT_CONTEXT_WORDS`; adding that import resolved the
    runtime inventory tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - First scoped Biome check failed on unused test imports/import ordering;
    adding representative constant value assertions and running
    `npx biome check ... --write --max-diagnostics 40` fixed 2 files.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - CR audit passed with missing registered paths 0, missing dispatched
    coverage paths 0, undispatched static callable methods 0, and dispatcher
    paths missing from tree 0.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Generic Desk Action Descriptor Refactor Slice

- Removed generic Desk `naturalAction(...)` id/path/reason descriptors from
  `xenesisAgentDeskControl.ts`.
- Added shared action descriptor catalog data to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XenesisNaturalDeskActionDescriptor`
  - `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_DEFAULT_TERMINAL_SHELL`
  - `XENESIS_NATURAL_DEFAULT_TERMINAL_COMMAND`
  - `XENESIS_NATURAL_TERMINAL_ID_PREFIX`
  - `XENESIS_NATURAL_VIEW_OPEN_PATH`
- The planner now uses `naturalCatalogAction()` for generic Desk routes while
  preserving route order, visible plan text, CR paths, action ids, args,
  placement defaults, terminal defaults, extracted paths/commands, and approval
  behavior.
- Added source-level guards so representative inline generic Desk action
  descriptors cannot be reintroduced into the planner.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_DESK_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - First `npm run typecheck` failed because `let action =
    DESK_ACTIONS.dockCloseActive` inferred a too-narrow literal descriptor
    type; annotating it as `XenesisNaturalDeskActionDescriptor` fixed the root
    cause.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - Final related test run
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Prompt Hint Catalog Refactor Slice

- Removed static Xenesis Desk control prompt hint strings, example
  `xenesis-desk-action` blocks, and Connection Center hint prefixes from
  `xenesisAgentDeskControl.ts`.
- Added shared prompt hint constants to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_DESK_CONTROL_HINT_CONNECTION_CENTER_PREFIXES`
  - `XENESIS_DESK_CONTROL_PROMPT_HINT_CONNECTION_CENTER_DISCOVERY_PREFIX`
  - `XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES`
  - `XENESIS_DESK_CONTROL_PROMPT_HINT_AFTER_DISCOVERY_LINES`
- The planner now assembles the hint from shared constants plus live
  Capability Registry path summaries, preserving existing rendered hint
  content and dynamic CR discovery behavior.
- Added source-level guards so representative prompt text and the old inline
  prefix array cannot be reintroduced into the planner.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_DESK_CONTROL_PROMPT_HINT_BEFORE_DISCOVERY_LINES`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Generic Desk Vocabulary Refactor Slice

- Removed remaining generic Desk-control word lists from
  `xenesisAgentDeskControl.ts`.
- Added shared generic constants to
  `src/shared/xenesisNaturalLanguageCatalog.ts` for generic open/open-or-show
  command words, Connection Center catalog opens, Settings/diagnostics/core
  capability opens, capture/list, pane focus/close scopes, pane/window sizing,
  file open/read/list, Explorer controls, favorites, terminal run/list/multi,
  dock arrange/merge/list, artifact target, app status, and view-open fallback.
- The planner now consumes named shared vocabulary constants for those generic
  Desk surfaces while preserving existing route order, CR paths, action ids,
  args, placement defaults, count/path/command extraction, and approval
  behavior.
- Added source-level guards so representative generic inline arrays cannot be
  reintroduced into the planner.
- Scope boundary: this slice does not add external integrations, browse
  external docs, mutate settings/credentials, change CR schemas, or execute
  terminal/file/explorer side effects beyond existing planned CR actions.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    fixed import ordering after the first scoped Biome check reported one
    organizeImports issue.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `rg -n "hasAny\(value, \[|hasAny\(intentValue, \[" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches.
  - `git diff --check` exited 0 with line-ending warnings only.
  - Final related test run
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Xenesis Runtime Action Descriptor Refactor Slice

- Removed runtime/local CLI/MCP/gateway action id, CR path, and reason
  descriptors from `xenesisAgentDeskControl.ts`.
- Added `XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts` for local CLI scan, MCP
  bridge/settings status, gateway dashboard/status, Agent pane
  status/events/submit, runtime status, reports/tasks/agents/profiles lists,
  diagnostics, run start/cancel, session reset, and workspace set.
- The planner now uses `naturalCatalogAction(RUNTIME_ACTIONS.*)` for those
  runtime routes while preserving route conditions, args, visible plan text,
  CR paths, action ids, reason strings, quoted text/path extraction, and
  approval behavior.
- Added source-level guards so representative runtime descriptors such as
  `natural-local-cli-scan`, `natural-xenesis-status`, and
  `xd.xenesis.runs.start` cannot be reintroduced directly into the planner.
- Scope boundary: this slice did not move Connection Center provider/tool/
  messenger/onboarding/guide descriptors and did not browse external docs or
  mutate runtime/provider/settings state.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_RUNTIME_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed one organizeImports issue.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests after the import-order fix.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Guide/Onboarding Action Descriptor Refactor Slice

- Removed guide and onboarding natural-language action id, CR path, and reason
  descriptors from `xenesisAgentDeskControl.ts`.
- Added `XenesisNaturalDeskActionTemplateDescriptor`,
  `XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS`, and
  `XENESIS_NATURAL_ONBOARDING_ACTION_DESCRIPTORS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- The planner now uses `naturalTemplateAction(...)` for dynamic guide and
  onboarding step ids/reasons, and `naturalCatalogAction(...)` for the
  onboarding center open descriptor.
- Preserved route order, visible plan text, CR paths, action ids, args,
  labels, open-file behavior, and approval behavior.
- Added source-level guards so representative guide/onboarding descriptors are
  not reintroduced directly into the planner.
- Scope boundary: this slice did not move provider/tool/messenger/connection
  catalog descriptors and did not browse external docs or mutate settings,
  credentials, gateway, runtime, or external systems.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_GUIDE_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 2 files.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed one organizeImports issue.
  - Re-running the scoped Biome check passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests after the import-order fix.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Aggregate Status Action Descriptor Refactor Slice

- Removed static aggregate status/readback catalog action descriptors from
  `xenesisAgentDeskControl.ts`.
- Added shared descriptor maps to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_ACTION_DESCRIPTORS`
- The planner now routes static tool/messenger/provider/broad connection
  aggregate status requests through `naturalCatalogAction(...)` while
  preserving route order, CR paths, action ids, args, reason strings, and
  visible plan text.
- Added source-level guards so representative aggregate status descriptors are
  not reintroduced directly into the planner.
- Scope boundary: this slice did not move target-specific provider/tool/
  messenger descriptors, review request descriptors, open catalog descriptors,
  core tool descriptors, or any runtime mutation behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed two organizeImports issues.
  - Re-running the scoped Biome check passed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests after the import-order fix.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no web browsing. This update used the cached
  gap map, repo-local Obsidian graph, source code, and tests.

## Target Status Action Descriptor Refactor Slice

- Removed target-specific provider/tool/messenger/connection status action
  descriptor templates from `xenesisAgentDeskControl.ts`.
- Added shared template descriptor maps to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_ACTION_DESCRIPTORS`
- The planner now uses `naturalTemplateAction(...)` for provider-specific
  routing/view/profile/setup status and target-specific connection diagnostic,
  setup-request, tool MCP/OAuth/user-story/action/install/setup/connector/view,
  channel routing/safety/access/pairing/user-story/profile, and messenger view
  status routes.
- Preserved route order, conditions, CR paths, action ids, args, labels,
  fallback diagnostics behavior, reason strings, visible plan text, and
  approval behavior.
- Added source-level guards so representative target-specific status
  descriptors are not reintroduced directly into the planner.
- Scope boundary: this slice did not move review request descriptors, open
  catalog descriptors, core tool open descriptors, or non-status target
  operations.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_PROVIDER_STATUS_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with line-ending warnings only.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Review Request Action Descriptor Refactor Slice

- Removed review/setup request action descriptor templates from
  `xenesisAgentDeskControl.ts`.
- Added `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- The planner now uses `naturalTemplateAction(...)` for provider profile draft,
  tool install plan, tool MCP install draft, tool OAuth draft, tool action
  policy, channel profile draft, and generic connection setup request routing.
- Preserved route order, intent checks, CR paths, action ids, args, reason
  strings, visible plan text, and approval behavior.
- Scope boundary: this slice did not move open catalog descriptors, provider
  open descriptors, core tool open descriptors, or runtime mutation behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_REVIEW_REQUEST_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Provider Open Action Descriptor Refactor Slice

- Removed provider-specific open action descriptor templates from
  `xenesisAgentDeskControl.ts`.
- Added `XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- The planner now uses `naturalTemplateAction(...)` for provider routing,
  profile draft, view, and setup open routes.
- Preserved provider target detection, route order, open-intent checks, CR
  paths, action ids, args, reason strings, `ensureVisible=true`, visible plan
  text, and approval behavior.
- Scope boundary: this slice did not move aggregate open catalog descriptors,
  target-specific tool/messenger open descriptors, core tool open descriptors,
  or runtime mutation behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_PROVIDER_OPEN_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Aggregate Open Action Descriptor Refactor Slice

- Removed static guide/provider/tool/messenger/connection catalog-open action
  descriptor templates from `xenesisAgentDeskControl.ts`.
- Added shared aggregate open descriptor maps to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_ACTION_DESCRIPTORS`
  - `XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_ACTION_DESCRIPTORS`
- The planner now uses `naturalCatalogAction(...)` for guide catalog, provider
  aggregate catalog, tool aggregate catalog, messenger aggregate catalog,
  connection diagnostic catalog, setup-request catalog, and Connection Center
  open routes.
- Preserved aggregate context checks, route order, CR paths, action ids, args,
  reason strings, `ensureVisible=true`, visible plan text, and approval
  behavior.
- Scope boundary: this slice did not move target-specific tool/messenger
  open descriptors, core tool open descriptors, or runtime mutation behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference the
    aggregate open descriptor maps.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx biome check --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    fixed one import-order issue after the first check failed.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests after the import-order fix.
  - Re-running scoped `npx biome check ... --max-diagnostics 40` passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Target Open Action Descriptor Refactor Slice

- Removed target-specific connection/tool/messenger open action descriptor
  templates from `xenesisAgentDeskControl.ts`.
- Added `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`.
- The planner now uses `naturalTemplateAction(...)` for target-specific
  connection diagnostic, setup request, tool OAuth/MCP/user-story/action/
  install/connector/setup/view, channel user-story/profile/routing/safety/
  access/pairing, messenger view, and generic connection-card open routes.
- Preserved target detection, route order, target-kind checks, Google OAuth
  guard, CR paths, action ids, args (`id` vs `channel`), reason strings,
  `ensureVisible=true`, visible plan text, and approval behavior.
- Scope boundary: this slice did not move core tool open descriptors or runtime
  mutation behavior.
- Verification:
  - RED planner test failed first because the planner did not yet reference
    `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_ACTION_DESCRIPTORS`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Dynamic Open Action Wrapper Refactor Slice

- Removed the final direct `naturalAction(...)` call sites outside the generic
  helper layer in `xenesisAgentDeskControl.ts`.
- Added named dynamic wrappers for the two remaining non-static descriptor
  cases:
  - core tool target opens resolved from `XENESIS_NATURAL_CORE_TOOL_TARGETS`
  - view target opens resolved from `XENESIS_NATURAL_VIEW_TARGETS`
- Preserved core tool target matching, view target matching, placement behavior,
  CR paths, action ids, args, reason strings, visible plan text, and approval
  behavior.
- Scope boundary: refactor only. This did not change natural-language behavior,
  CR coverage, provider/tool/messenger setup semantics, or live Agent-pane
  execution.
- Verification:
  - RED planner source guard failed first because the named wrappers were not
    present and direct dynamic `naturalAction(...)` call sites remained.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 2 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Plan Visible Text Catalog Refactor Slice

- Removed inline `naturalPlan('...')` and `naturalPlan(\`...\`)` visible-text
  literals from `xenesisAgentDeskControl.ts`.
- Added `XENESIS_NATURAL_PLAN_VISIBLE_TEXT` to
  `src/shared/xenesisNaturalLanguageCatalog.ts`, including the dynamic
  window-size preset visible-text formatter.
- The planner now uses a local `PLAN_TEXT` alias for user-facing plan response
  text while preserving the existing route order, matching logic, CR paths,
  action args, text values, and approval behavior.
- Scope boundary: refactor only. This did not change natural-language routing,
  provider/tool/messenger setup semantics, or live Agent-pane execution.
- Verification:
  - RED planner source guard failed first because
    `XENESIS_NATURAL_PLAN_VISIBLE_TEXT` was not referenced and inline
    `naturalPlan('...')` calls remained.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Initial scoped Biome check failed on import ordering, then
    `npx biome check --write ... --max-diagnostics 40` fixed 1 file and the
    rerun passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Natural Extraction Pattern Catalog Refactor Slice

- Removed representative natural-language extraction regex hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added `XENESIS_NATURAL_EXTRACTION_PATTERNS` to
  `src/shared/xenesisNaturalLanguageCatalog.ts` for normalized whitespace,
  first-integer extraction, quoted text extraction, Windows/Unix local path
  extraction, trailing path punctuation cleanup, filter query cleanup, and
  terminal command cleanup.
- The planner now uses a local `EXTRACTION_PATTERNS` alias for those extraction
  patterns while preserving route order, extracted args, visible text, CR paths,
  and approval behavior.
- Scope boundary: refactor only. This did not move Desk action fence parsing,
  result-summary formatting, natural-language route conditions, or live
  Agent-pane execution.
- Verification:
  - RED planner source guard failed first because
    `XENESIS_NATURAL_EXTRACTION_PATTERNS` was not referenced and extraction
    regexes still lived directly in the planner.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Initial scoped Biome check failed on import ordering, then
    `npx biome check --write ... --max-diagnostics 40` fixed 1 file and the
    rerun passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Desk Action Protocol Catalog Refactor Slice

- Removed representative Desk action DSL/parser/result-message hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added shared protocol catalogs to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_DESK_ACTION_PROTOCOL`
  - `XENESIS_DESK_ACTION_PROTOCOL_PATTERNS`
  - `XENESIS_DESK_ACTION_PROTOCOL_TEXT`
  - `XENESIS_DESK_ACTION_RESULT_SUMMARY_PATHS`
- The planner now consumes those catalogs for action block parsing, path-prefix
  validation, parse error text, approval-required detection, pending/completed
  user messages, execution summary text, result-summary CR path matching, and
  useful direct CR path prompt suffix rendering.
- Scope boundary: refactor only. This did not change natural-language route
  matching, CR execution behavior, approval policy, or live Agent-pane
  execution.
- Verification:
  - RED planner source guard failed first because
    `XENESIS_DESK_ACTION_PROTOCOL_PATTERNS` was not referenced and protocol
    literals still lived directly in the planner.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Natural Intent Sentinel Catalog Refactor Slice

- Removed remaining natural-intent sentinel hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added shared natural-intent catalog exports to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_INTENT_PATTERNS`
  - `XENESIS_NATURAL_PROVIDER_AUTO_TARGET`
  - `XENESIS_NATURAL_CORE_TOOL_OPEN_REASON`
- The planner now consumes shared references for the English explicit-open
  regex, provider `auto` fallback target, and dynamic core tool open reason
  formatter.
- Scope boundary: refactor only. This preserved explicit open detection,
  provider fallback behavior, core tool CR paths/action ids/args/reason text,
  route order, approval behavior, and live Agent-pane execution assumptions.
- Verification:
  - RED planner source guard failed first because
    `XENESIS_NATURAL_INTENT_PATTERNS` was not referenced and natural-intent
    sentinel literals still lived directly in the planner.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Desk Action Result Summary Catalog Refactor Slice

- Removed remaining Desk action result-summary key/label hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added shared result-summary catalogs to
  `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS`
  - `XENESIS_DESK_ACTION_RESULT_SUMMARY_TEXT`
- The planner now consumes shared references for file-list keys, readable-title
  keys, capture/bounds/workflow keys, renderer message fallback keys, workflow
  metric labels, dimension/file-list/workflow formatting, and compact empty JSON
  sentinels.
- Scope boundary: refactor only. This preserved Desk action execution,
  approval handling, direct CR path matching, result-summary output, and
  natural-language route matching.
- Verification:
  - RED planner source guard failed first because
    `XENESIS_DESK_ACTION_RESULT_SUMMARY_KEYS` was not referenced and
    result-summary keys/labels still lived directly in the planner.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Desk Action Args Catalog Refactor Slice

- Removed representative Desk action argument-shape hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added shared arg catalogs to `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS`
  - `XENESIS_NATURAL_DESK_ACTION_ARGS`
- The planner now consumes shared arg builders for default placement/window
  state, placement args, active-pane args, dock sizing and arranging, file path,
  filter query, explorer path, window preset id, terminal run and multi-run
  defaults, and view-kind placement.
- Scope boundary: refactor only. This preserved planner route order, generated
  CR paths, argument object shapes, default placement, terminal defaults,
  approval behavior, and result summaries.
- Verification:
  - RED planner source guard failed first because
    `XENESIS_NATURAL_DESK_ACTION_ARG_DEFAULTS` was not referenced and
    representative CR arg shapes still lived directly in the planner.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed after `npx biome check --write src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    sorted the new test imports.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Connection Target Sentinel Catalog Refactor Slice

- Removed connection-target kind/id sentinel hardcoding from
  `xenesisAgentDeskControl.ts`.
- Added shared target helpers to `src/shared/xenesisNaturalLanguageCatalog.ts`:
  - `XENESIS_NATURAL_PLANNED_GOOGLE_TOOL_IDS`
  - `isXenesisNaturalConnectionToolTarget`
  - `isXenesisNaturalConnectionMessengerTarget`
  - `isXenesisNaturalPlannedGoogleToolTarget`
- The planner now consumes shared helpers for tool/messenger target branching
  and planned Google tool OAuth routing in readback, review-request, and
  open-routing branches.
- Scope boundary: refactor only. This preserved target matching,
  provider/tool/channel routing order, generated CR paths, args, and
  review/open/readback behavior.
- Verification:
  - RED planner source guard failed first because
    `isXenesisNaturalConnectionToolTarget` was not referenced and target
    kind/id sentinels still lived directly in the planner.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed after reducing the new helper test examples to
    the helper input shape.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Connection Action Args Catalog Refactor Slice

- Removed representative connection/open/review/runtime action arg-shape
  hardcoding from `xenesisAgentDeskControl.ts`.
- Extended `XENESIS_NATURAL_DESK_ACTION_ARGS` in
  `src/shared/xenesisNaturalLanguageCatalog.ts` with builders for:
  - `ensureVisible`, target id, visible target id, tool, channel, visible
    channel, provider, visible provider, guide open-file args, agent id, agent
    submit, prompt, and workspace path.
- The planner now consumes shared arg builders in guide, onboarding, Connection
  Center readback/open, review request, provider open, and runtime control
  branches.
- Scope boundary: refactor only. This preserved generated CR paths, target
  matching, route order, exact arg object shapes, approval behavior, and result
  summaries.
- Verification:
  - RED planner source guard failed first because `ensureVisible: true` and
    related connection/open/review arg shapes still lived directly in the
    planner.
  - Initial GREEN run exposed a regression: guide open/file args lost the
    existing guide `id`. The builder was corrected to preserve
    `{ id, ensureVisible, openFile? }`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after correction.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used the cached gap
  map, repo-local Obsidian graph, source code, and tests.

## Desk Action Protocol Record/Format Catalog Refactor Slice

- Removed representative Desk action protocol record-key and message-format
  hardcoding from `xenesisAgentDeskControl.ts`.
- Extended `src/shared/xenesisNaturalLanguageCatalog.ts` with:
  - `XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS` for `actions`, `path`, `id`,
    `reason`, `args`, and `approved`.
  - `XENESIS_DESK_ACTION_PROTOCOL_FORMAT` for default Desk action ids, action
    bullets, result bullets, line joins, compact JSON length/overflow, blank
    lines, separators, and path separator normalization.
  - protocol patterns for visible text cleanup and Windows path separator
    normalization.
- The Desk control source now consumes shared protocol key/format catalogs in
  action JSON parsing, visible-text cleanup, pending/completed user messages,
  compact result summaries, basename extraction, and CR path summary joins.
- Scope boundary: refactor only. This preserved action parse output, approval
  behavior, user-facing pending/completed messages, result summaries, prompt
  hint content, and CR routing.
- Verification:
  - RED planner/control source guard failed first because
    `XENESIS_DESK_ACTION_PROTOCOL_RECORD_KEYS` was not yet referenced by
    `xenesisAgentDeskControl.ts`.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests after implementation and again after formatting.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Initial biome check failed only on import ordering in
    `xenesisAgentDeskControl.test.ts`; import order was fixed.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Natural Empty Action Args Refactor Slice

- Removed representative planner-local empty arg object literals from
  `xenesisAgentDeskControl.ts`.
- `naturalCatalogAction` now defaults to
  `XENESIS_NATURAL_DESK_ACTION_ARGS.empty()`, so empty-arg CR actions call
  `naturalCatalogAction(descriptor)` instead of
  `naturalCatalogAction(descriptor, {})`.
- Replaced aggregate status/readback, runtime status/control, and generic Desk
  planner empty-arg calls.
- Scope boundary: refactor only. This preserved action ids, paths, reasons,
  empty arg object shape, route order, parse behavior, approval behavior, and
  user-facing text.
- Verification:
  - RED source guard failed first on existing `naturalCatalogAction(..., {})`
    calls.
  - `rg -n "naturalCatalogAction\([^)]*, \{\}\)" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Desk Action State/Phase Catalog Refactor Slice

- Removed representative Desk action approval/execution/activity phase sentinel
  literals from `xenesisAgentDeskControl.ts`.
- Extended `src/shared/xenesisNaturalLanguageCatalog.ts` with:
  - `XENESIS_DESK_ACTION_ACTIVITY_PHASES`
  - `XENESIS_DESK_ACTION_APPROVAL_STATE`
  - `XENESIS_DESK_ACTION_EXECUTION_STATUS`
  - derived `XenesisDeskActionActivityPhase`
- The Desk control source now consumes shared state/phase catalogs for pending
  approval action creation, approval helper output, executor ok normalization,
  failed execution results, and activity reports.
- Scope boundary: refactor only. This preserved action request state, execution
  result state, activity reporting phases, approval helpers, route order, parse
  behavior, approval behavior, and user-facing text.
- Verification:
  - RED source guard failed first because
    `XENESIS_DESK_ACTION_ACTIVITY_PHASES` was not yet referenced by
    `xenesisAgentDeskControl.ts`.
  - `rg -n "approved: (false|true)|phase: '(start|success|failure|approval-required)'|'approval-required'|ok: false|ok: callResult\.ok !== false" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - Initial biome check failed only on type import ordering in
    `xenesisAgentDeskControl.ts`; import order was fixed.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Natural Parser Defaults Catalog Refactor Slice

- Removed representative natural parser text/default numeric sentinel literals
  from `xenesisAgentDeskControl.ts`.
- Extended `src/shared/xenesisNaturalLanguageCatalog.ts` with:
  - `XENESIS_NATURAL_TEXT_DEFAULTS` for empty text, first item index, Unicode
    normalization form, and word separator.
  - `XENESIS_NATURAL_NUMERIC_LIMITS` for first-integer, dock-size, and
    terminal-count bounds.
- The Desk control source now consumes shared parser defaults for normalization,
  whitespace replacement, quoted text extraction, path cleanup, filter query
  tokenization, terminal command cleanup, dock-size bounds, and terminal-count
  bounds.
- Scope boundary: refactor only. This preserved normalization, extraction,
  route order, generated CR paths, and action args.
- Verification:
  - RED source guard failed first because `XENESIS_NATURAL_TEXT_DEFAULTS` was
    not yet referenced by `xenesisAgentDeskControl.ts`.
  - Typecheck initially failed because default numeric literal values narrowed
    `extractFirstInteger`'s `min/max` parameters; the parameters were explicitly
    typed as `number`.
  - `rg -n "normalize\('NFKC'\)|replace\(EXTRACTION_PATTERNS\.normalizedWhitespace, ' '\)|split\(' '\)|extractFirstInteger\(value, 120, 4096\)|extractFirstInteger\(value, 1, 50\)" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npm run typecheck` passed after the numeric parameter annotation fix.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Desk Action Runtime Result Key/Type Catalog Refactor Slice

- Removed representative runtime value-type and execution result key sentinels
  from `xenesisAgentDeskControl.ts`.
- Extended `src/shared/xenesisNaturalLanguageCatalog.ts` with:
  - `XENESIS_DESK_ACTION_VALUE_TYPE_NAMES` for `object`, `string`, and
    `number`.
  - `XENESIS_DESK_ACTION_CALL_RESULT_KEYS` for `ok`, `result`, `error`,
    `approvalRequired`, `permission`, `approval`, and `source`.
  - `isXenesisDeskActionValueType` and `isXenesisDeskActionRecordValue` typed
    helpers, because TypeScript does not narrow `unknown` when `typeof` is
    compared against object-property catalog values.
- The Desk control source now consumes shared value/type key catalogs in action
  JSON normalization, executor call result normalization, approval-required
  detection, record conversion, result summaries, and pending/completed message
  helpers.
- Scope boundary: refactor only. This preserved parse output, executor result
  shape, approval-required detection, pending/completed messages, result
  summaries, route order, generated CR paths, and action args.
- Verification:
  - RED source guard failed first because
    `XENESIS_DESK_ACTION_VALUE_TYPE_NAMES` was not yet referenced by
    `xenesisAgentDeskControl.ts`.
  - `rg -n "typeof [^;\n]+ === 'object'|typeof [^;\n]+ === 'string'|typeof [^;\n]+ === 'number'|typeof [^;\n]+ !== 'object'|callResult\.(ok|result|error|approvalRequired|permission|approval|source)|value\.result|result\.approvalRequired" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed after Biome sorted the new test imports.
  - `npm run typecheck` passed after adding the shared typed helper functions.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Desk Action Empty Text Sentinel Refactor Slice

- Removed representative runtime empty-string sentinel literals from
  `xenesisAgentDeskControl.ts`.
- The Desk control source now uses:
  - `NATURAL_TEXT_DEFAULTS.empty` for natural plan and prompt input empty
    fallbacks.
  - `DESK_ACTION_PROTOCOL_FORMAT.emptyText` for Desk action parser,
    visible-text removal, result summary, pending message default, and CR path
    punctuation replacement empty fallbacks.
- Scope boundary: refactor only. This preserved natural plan output, Desk action
  JSON parsing, visible-text cleanup, result summaries, pending/completed
  messages, route order, generated CR paths, and action args.
- Verification:
  - RED source guard failed first on remaining `return ''`, `|| ''`, `: ''`,
    `= ''`, and `, ''` runtime empty-string patterns.
  - Typecheck initially failed because `leadText =
    DESK_ACTION_PROTOCOL_FORMAT.emptyText` narrowed the parameter to the literal
    `""` type; adding `leadText: string` restored the existing API surface.
  - `rg -n "(?:return|=|\|\||:|,\s*)\s*''" src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed after the `leadText: string` annotation.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Layout Type/CR Separator Catalog Refactor Slice

- Removed the remaining local layout/navigation type-union literals and CR path
  dot separator literals from `xenesisAgentDeskControl.ts`.
- Extended `src/shared/xenesisNaturalLanguageCatalog.ts` with:
  - `XENESIS_DESK_ACTION_PROTOCOL_FORMAT.capabilityPathSeparator`.
  - `XENESIS_DESK_ACTION_PROTOCOL_FORMAT.sentenceTerminator`.
  - Derived id types from target catalogs:
    `XenesisNaturalPlacementId`, `XenesisNaturalDockSideId`,
    `XenesisNaturalDockWindowStateId`, and `XenesisNaturalArrangeModeId`.
- Changed the placement, dock side, dock window state, and arrange mode target
  arrays to `as const satisfies readonly XenesisNaturalWordsTarget[]` so ids
  remain literal while preserving the shared target contract.
- Scope boundary: refactor only. This preserved placement, dock side, window
  state, arrange mode detection, CR path prefix matching, prompt hint text,
  route order, generated CR paths, and action args.
- Verification:
  - RED source guard failed first on the local `XenesisDeskPlacement` literal
    union.
  - `rg -n "type XenesisDesk(Placement|DockSide|WindowState|ArrangeMode) = '|\$\{prefix\}\.|\)\}\." src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts`
    returned no matches after implementation.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 100/100 tests.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 40`
    passed after Biome sorted the new type imports.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- Known gap: live Electron Agent-pane smoke was not run for this refactor-only
  slice.
- External documentation handling: no browsing. This update used cached
  repo-local context, source code, and tests.

## Onboarding Guided Setup Slice

- Added Desk-native guided onboarding metadata to
  `src/shared/xenesisConnections.ts` through
  `XenesisConnectionOnboardingGuidedStep`.
- Each onboarding checklist item now exposes concrete guided steps with:
  - `kind`: `read`, `open`, or `control`.
  - `crPath`: the CR path to inspect/open/invoke.
  - `expectedState`, `verifyWith`, and `safetyBoundary`.
- Covered onboarding phases:
  - First chat/provider setup:
    `xd.xenesis.providers.setup.status`, `xd.panes.settings.open`.
  - Local CLI and MCP:
    `xd.mcp.settings.status`, `xd.xenesis.providers.setup.status`,
    `xd.panes.settings.open`.
  - Recommended tools:
    `xd.xenesis.tools.setup.status`,
    `xd.xenesis.tools.connectors.status`,
    `xd.xenesis.tools.installPlans.open`,
    `xd.xenesis.tools.userStories.open`.
  - Gateway:
    `xd.xenesis.gateway.status`, `xd.xenesis.status`,
    `xd.panes.settings.open`, `xd.xenesis.gateway.start`.
  - Messenger routing:
    `xd.xenesis.channels.routing.status`,
    `xd.xenesis.channels.safety.status`,
    `xd.xenesis.channels.accessGroups.status`,
    `xd.xenesis.channels.pairing.status`,
    `xd.xenesis.profiles.updateChannels`.
  - End-to-end test:
    `xd.xenesis.gateway.status`,
    `xd.xenesis.channels.routing.status`,
    `xd.xenesis.profiles.testChannel`.
- Diagnostic runbooks and setup request templates now include guided step read
  paths, open/control paths, verification signals, and safety boundaries, so
  the data is visible in Desk review flows rather than only on the raw
  onboarding card.
- The Connection Center onboarding plan summary now includes guided step count
  through `formatXenesisOnboardingPlanSummary`.
- Scope boundary:
  - No MCP installs, OAuth completion, provider tool execution, settings
    mutation, or message delivery is performed by status/read surfaces.
  - Google Workspace and Google Calendar remain `planned-oauth`; this slice did
    not invent an unverified install template.
- Verification so far:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts` failed because
    `onboardingPlan.guidedSteps` was missing.
  - GREEN:
    `npx tsx --test src\shared\xenesisConnections.test.ts` passed with 33/33
    tests after implementation and propagation assertions.
  - Renderer RED:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
    because the onboarding summary did not include guided step count.
  - Renderer GREEN:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed
    with 35/35 tests.
  - Related:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `npm run lint` failed on existing repo-wide Biome/CRLF/sample diagnostics
    outside this slice; changed files passed scoped Biome.
- External documentation handling: no browsing. This used the cached gap map,
  source code, and tests.

## Tool OAuth Review Steps Slice

- Added review-only OAuth setup steps to Google planned OAuth tool drafts in
  `src/shared/xenesisConnections.ts` through
  `XenesisConnectionToolOAuthDraftReviewStep`.
- Covered review phases:
  - `oauth-app-registration`: OAuth client and redirect URI readiness before
    any OAuth flow exists.
  - `scope-review`: read-only scopes are reviewed and Google write scopes stay
    blocked until a verified template exists.
  - `token-store-readiness`: token storage remains planned until a selected MCP
    OAuth template owns the store.
  - `readback-verification`: read-only validation checks are identified before
    provider tool execution is enabled.
- Diagnostic runbooks and setup request templates now include OAuth review-step
  read paths, control paths, diagnostics, and safety boundaries.
- The Connection Center OAuth draft summary now includes review step count
  through `formatXenesisToolOAuthDraftSummary`.
- Scope boundary:
  - No Google MCP package selection, MCP install, OAuth completion, token
    storage, email send, document mutation, calendar event mutation, provider
    tool execution, or settings mutation.
  - Google Workspace and Google Calendar remain `planned-oauth`; this slice
    makes the review flow clearer without claiming runtime OAuth support.
- Verification:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed because OAuth `reviewSteps` and summary count were missing.
  - GREEN:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 68/68 tests.
  - Related:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root `npm run lint` was not rerun in this slice; previous run failed on
    existing repo-wide Biome/CRLF/sample diagnostics outside these changed
    files.
- External documentation handling: no browsing. This used the cached gap map,
  source code, and tests.

## Provider Profile Review Steps Slice

- Added review-only provider profile setup steps in
  `src/shared/xenesisConnections.ts` through
  `XenesisConnectionProviderProfileDraftReviewStep`.
- Covered review phases:
  - `provider-identity`: provider identity and auth mode are visible before
    settings changes.
  - `model-credential-readiness`: model and credential readiness are visible
    without returning provider secrets.
  - `runtime-routing`: runtime profile, fallback policy, retry policy, and
    credential pool state are visible without editing fallback chains.
  - `local-cli-boundary`: provider identity remains separate from installed
    local CLI selection.
- Diagnostic runbooks and setup request templates now include provider
  review-step read paths, control paths, diagnostics, and safety boundaries.
- The Connection Center provider profile draft summary now includes review step
  count through `formatXenesisProviderProfileDraftSummary`.
- Scope boundary:
  - No provider setting mutation, credential storage, model change, fallback
    edit, local CLI selection switch, provider prompt run, or approval bypass.
- Verification:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed because provider profile `reviewSteps` and summary count were
    missing.
  - GREEN:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 68/68 tests.
  - Related:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root `npm run lint` was not rerun in this slice; previous run failed on
    existing repo-wide Biome/CRLF/sample diagnostics outside these changed
    files.
- External documentation handling: no browsing. This used the cached gap map,
  source code, and tests.

## Channel Profile Review Steps Slice

- Added review-only external messenger channel profile setup steps in
  `src/shared/xenesisConnections.ts` through
  `XenesisConnectionChannelProfileDraftReviewStep`.
- Covered review phases:
  - `channel-credential-readiness`: token/auth/adapter readiness is visible
    before enabling a channel profile.
  - `access-allowlist-review`: allowlist and access group bindings are reviewed
    before remote channel use.
  - `delivery-guardrails`: approval mode, turn limit, token limit, and
    fail-closed behavior stay explicit before delivery is trusted.
  - `pairing-readback`: pairing/readback checks are identified before test
    sends or remote prompts.
- Diagnostic runbooks and setup request templates now include channel
  review-step read paths, control paths, diagnostics, and safety boundaries.
- The Connection Center channel profile draft summary now includes review step
  count through `formatXenesisChannelProfileDraftSummary`.
- Scope boundary:
  - No channel settings mutation, allowlist update, profile config write,
    planned adapter start, test message send, gateway lifecycle action, or
    approval bypass.
- Verification:
  - RED:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed because channel profile `reviewSteps` and summary count were
    missing.
  - GREEN:
    `npx tsx --test src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 68/68 tests.
  - Related:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 99/99 tests.
  - Scoped Biome:
    `npx biome check src\shared\xenesisConnections.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts --max-diagnostics 40`
    passed.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Root `npm run lint` was not rerun in this slice; previous run failed on
    existing repo-wide Biome/CRLF/sample diagnostics outside these changed
    files.
- External documentation handling: no browsing. This used the cached gap map,
  source code, and tests.

## Connection Center Review Detail UI Slice

- Added renderer detail formatting for:
  - onboarding guided setup steps,
  - provider profile draft review steps,
  - tool OAuth draft review steps,
  - external messenger channel profile review steps.
- `SettingsPane` now renders these detail rows inside Connection Center cards
  instead of exposing only aggregate counts. The rows include expected state,
  required fields where applicable, read/control paths, diagnostics, and safety
  boundaries.
- Added English/Korean labels for the new rows and re-exported the guided/review
  step types through `src/shared/types.ts`.
- Scope boundary:
  - Renderer presentation only. No CR schema/dispatcher changes, setup request
    behavior changes, provider/tool/channel mutations, OAuth completion,
    install execution, channel delivery, or approval bypass.
- Verification:
  - RED:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
    failed with 35/38 passing because the helper functions and SettingsPane
    detail rows were missing.
  - GREEN:
    `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 38/38 tests.
  - Related:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts src\shared\xenesisConnections.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts`
    passed with 102/102 tests.
  - Scoped Biome:
    `npx biome check src\shared\types.ts src\renderer\panes\SettingsPane.tsx src\renderer\panes\xenesisConnectionCenter.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\i18n\en.ts src\renderer\i18n\ko.ts --max-diagnostics 80`
    passed after `npx biome check --write ...` formatted/import-sorted 3 files.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with Registered nodes 763,
    Callable methods 468, Dispatcher paths 448, missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
- External documentation handling: no browsing. This used cached gap context,
  source code, and tests.

## Connection Center Guide Detail Docs Slice

- Updated repo-local guide docs so the manual layer matches the current
  Connection Center detail UI:
  - `docs/manual/09-onboarding-connections.md`
  - `docs/manual/10-openclaw-channel-setup.md`
  - `docs/manual/11-external-tool-integrations.md`
- The onboarding guide now explains that Settings cards render guided/review
  step rows with expected state, required fields where applicable,
  read/control paths, diagnostics, and safety boundaries.
- The channel guide now documents channel profile review-step phases:
  credential readiness, access/allowlist bindings, delivery guardrails, and
  pairing/readback checks.
- The external tool guide now documents Google Workspace/Calendar OAuth review
  steps and keeps planned OAuth boundaries explicit.
- Scope boundary:
  - Docs-only. No runtime code, CR schema/dispatcher, settings mutation,
    OAuth/install execution, channel delivery, or approval-policy changes.
- Verification:
  - `git diff --check` passed with only LF-to-CRLF warnings.
  - `npx biome check docs\manual\09-onboarding-connections.md docs\manual\10-openclaw-channel-setup.md docs\manual\11-external-tool-integrations.md --max-diagnostics 40`
    exited 1 because the repo Biome config ignores these Markdown paths and
    processed 0 files.
- External documentation handling: no browsing. This used cached gap context,
  current docs, and current code behavior.

## Connection Center Live Smoke Slice

- Added a repeatable live Electron smoke script:
  - `scripts/xenesisConnectionCenterLiveSmoke.mjs`
  - `scripts/xenesisConnectionCenterLiveSmoke.test.mjs`
  - package script `smoke:xenesis:connection-center`
- The smoke launches the built Electron app, waits for the app shell, opens
  Settings through CR path `xd.panes.settings.open`, then verifies Connection
  Center root/title plus onboarding guided steps, provider profile review
  steps, tool OAuth review steps, and channel profile review steps in the
  renderer.
- Root-cause note:
  - Calling the CR path before the app shell listener is ready can time out.
    The smoke now waits for `.btn-settings` before calling CR.
  - The live Electron layout attaches Connection Center text while the root
    element can report a zero-width bounding box, so the smoke checks attached
    selectors plus text rather than Playwright `visible`.
- Verification:
  - RED:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` first
    failed because the smoke module was missing, then failed again when the
    app-shell readiness constants were not exported.
  - GREEN:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed
    with 3/3 tests.
  - `npm run build` passed and rebuilt `out/`; Vite emitted existing warnings
    about browser `fs` externalization and dynamic import chunking.
  - `node scripts\xenesisConnectionCenterLiveSmoke.mjs --json` passed 6/6
    after rebuild.
  - `npm run smoke:xenesis:connection-center` passed 6/6.
  - `npx biome check scripts\xenesisConnectionCenterLiveSmoke.mjs scripts\xenesisConnectionCenterLiveSmoke.test.mjs --max-diagnostics 80`
    passed.
  - `git diff --check` exited 0 with the existing package.json LF-to-CRLF
    warning.
  - `npm run check:public-release` is blocked in this worktree because
    `.github/workflows/ci.yml` is missing.
- External documentation handling: no browsing. This used current repo code,
  cached gap context, and live Electron verification.

## Connection Center Testing Snapshot Slice

- Added development-only CR read path:
  `xd.testing.connectionCenter.snapshot`.
- The path reads the live Settings > Xenesis Agent > Connections renderer state
  from inside the Electron app, returning root/title/detail-row checks for:
  onboarding guided steps, provider profile review steps, tool OAuth review
  steps, and channel profile review steps.
- Added `timeoutMs` to make the snapshot wait for the Connection Center detail
  rows to render after CR-driven Settings open. Live diagnosis showed the
  immediate 0ms snapshot can still be in the `확인 중...` loading state, while
  the 250ms snapshot passes.
- Added the path to the Agent control prompt hint as a development smoke helper,
  not a user-facing setup/mutation path.
- Scope boundary:
  - `xd.testing` read helper only. No provider/tool/channel data model changes,
    setup request behavior changes, OAuth/install execution, settings mutation,
    channel delivery, or approval-policy change.
- Verification:
  - RED:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    when `xd.testing.connectionCenter.snapshot` and later its `timeoutMs`
    schema were missing.
  - GREEN:
    `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
    with 32/32 tests.
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 36/36 tests.
  - Scoped Biome for changed code/test files exited 0 with existing repo
    warnings/infos only.
  - `npm run typecheck` passed.
  - `npm run docs:capabilities:audit` passed with missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - `npm run build` passed and rebuilt `out/`; Vite emitted existing warnings
    about browser `fs` externalization and dynamic import chunking.
  - Live Electron CR verification passed: `xd.panes.settings.open` opened
    Connection Center, then `xd.testing.connectionCenter.snapshot` passed 6/6
    checks with `waitedMs=224` and `timedOut=false`.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - `npm run check:public-release` remains blocked in this worktree because
    `.github/workflows/ci.yml` is missing.
- External documentation handling: no browsing. This used current repo code,
  cached gap context, and live Electron verification.

## Connection Center CR Snapshot Smoke Integration Slice

- Updated the repeatable live smoke script so it uses the Desk CR snapshot path
  instead of duplicating renderer selector checks in Playwright:
  - open Settings through `xd.panes.settings.open`;
  - snapshot Connection Center through `xd.testing.connectionCenter.snapshot`;
  - normalize returned CR snapshot checks into the existing smoke report shape.
- The smoke still launches the built Electron app and waits for the app shell,
  but renderer verification is now owned by the CR path added in the previous
  slice.
- Scope boundary:
  - Smoke script/test only. No app UI, CR schema/dispatcher, data model,
    setup-request, provider/tool/channel mutation, OAuth/install execution, or
    approval-policy changes.
- Verification:
  - RED:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` failed
    because the smoke script did not yet export
    `CONNECTION_CENTER_LIVE_SMOKE_SNAPSHOT_REQUEST`.
  - GREEN:
    `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs` passed
    with 4/4 tests.
  - Scoped Biome passed for
    `scripts\xenesisConnectionCenterLiveSmoke.mjs` and
    `scripts\xenesisConnectionCenterLiveSmoke.test.mjs` after a formatter line
    wrap.
  - `npm run smoke:xenesis:connection-center` passed 6/6 through the CR open
    and CR snapshot paths.
  - Live Agent-pane CR verification passed: a fenced `xenesis-desk-actions`
    prompt submitted through `xd.testing.xenesisAgent.submitPrompt` ran
    `xd.panes.settings.open` followed by
    `xd.testing.connectionCenter.snapshot` and matched
    `Desk action completed` in the Agent pane.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
- External documentation handling: no browsing. This used current repo code,
  cached gap context, and live Electron verification.

## Action Inbox Natural Routing + Agent Wiring Slice

- Added deterministic Action Inbox natural-language coverage for review queues
  created by Connection Center setup/review request flows:
  - `액션 인박스 목록 보여줘` -> `xd.mcp.actionInbox.list`.
  - `Action Inbox 열어줘` -> `xd.tools.core.hermesActionInbox.open`.
- Root-cause finding:
  - `planXenesisDeskNaturalLanguageActions()` already carried many tested
    deterministic CR routes, but live `XenesisAgentPane` input did not call it.
  - Natural prompts fell through to the provider/mock path unless the prompt
    contained an explicit fenced `xenesis-desk-action` block.
- Implemented live wiring in `XenesisAgentPane.tsx`:
  - explicit fenced CR blocks still run first;
  - clear natural Desk plans run through the same Desk action executor before a
    provider run;
  - `bypassNaturalDeskRouting` remains honored for test/provider diagnostics.
- Added Action Inbox-specific visible plan text:
  `Action Inbox 목록을 조회합니다.`
- Scope boundary:
  - No Action Inbox storage changes, approval resolution changes,
    setup-request creation changes, provider/tool/channel mutations,
    OAuth/install execution, gateway lifecycle actions, or UI rendering changes.
- Verification:
  - RED:
    focused planner test failed because `액션 인박스 목록 보여줘` returned no
    CR action.
  - RED:
    source-level Agent-pane wiring test failed because `XenesisAgentPane.tsx`
    did not import/call `planXenesisDeskNaturalLanguageActions()`.
  - RED:
    visible-text test failed because Action Inbox list used generic local
    CLI/MCP text.
  - GREEN:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Lint/type/build:
    lint-only scoped Biome exited 0 with existing `XenesisAgentPane.tsx`
    warnings; `npm run typecheck` passed; `npm run build` passed.
  - CR audit:
    `npm run docs:capabilities:audit` passed with missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated audit file was
    removed afterward.
  - Live Agent-pane:
    `액션 인박스 목록 보여줘` rendered `Action Inbox 목록을 조회합니다.`,
    `Desk action completed`, and applied `xd.mcp.actionInbox.list`.
  - Live Agent-pane:
    `Action Inbox 열어줘` rendered `Desk action completed` and applied
    `xd.tools.core.hermesActionInbox.open`.
- External documentation handling: no browsing. This used cached gap context,
  current repo code, focused tests, CR audit, and live Electron verification.

## Natural Desk Routing Live Smoke Slice

- Added repeatable live Electron smoke coverage for Xenesis Agent natural
  Desk-routing behavior:
  - package script `smoke:xenesis:natural-desk-routing`;
  - script `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs`;
  - script test `scripts/xenesisNaturalDeskRoutingLiveSmoke.test.mjs`.
- The smoke opens Xenesis Agent through
  `xd.tools.core.xenesisAgent.open`, then submits natural prompts through
  `xd.testing.xenesisAgent.submitPrompt`:
  - `액션 인박스 목록 보여줘` must apply `xd.mcp.actionInbox.list` and show
    `Action Inbox 목록을 조회합니다.`;
  - `Action Inbox 열어줘` must apply
    `xd.tools.core.hermesActionInbox.open` and show `Desk action completed`.
- Scope boundary:
  - Smoke/test/package wiring only. No natural-language catalog changes,
    Action Inbox storage changes, approval behavior changes, provider runs,
    setup requests, CR registry/dispatcher changes, or UI rendering changes.
- Verification:
  - RED:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` failed
    with `ERR_MODULE_NOT_FOUND` before the smoke script existed.
  - GREEN:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    with 4/4 tests.
  - Scoped Biome passed for the new smoke script/test. Package JSON was checked
    with formatter and assist disabled to avoid unrelated existing CRLF churn.
  - `npm run smoke:xenesis:natural-desk-routing` passed 5/5.
  - `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 8/8 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with the existing `package.json` LF-to-CRLF
    warning only.
  - CR audit was not run because this slice did not change registry,
    dispatcher, or capability code.
- External documentation handling: no browsing. This used cached gap context,
  current repo code, and live Electron verification.

## Natural Setup Surface Live Smoke Expansion Slice

- Expanded the repeatable natural Desk routing live smoke beyond Action Inbox
  to cover the broader setup surfaces from the current goal:
  - `초기 설정 전체 상태 보여줘` -> `xd.xenesis.onboarding.status`;
  - `AI provider setup 전체 열어줘` ->
    `xd.xenesis.providers.setup.open`;
  - `노션 connector 열어줘` -> `xd.xenesis.tools.connectors.open`;
  - `구글 챗 라우팅 상태 보여줘` ->
    `xd.xenesis.channels.routing.status`;
  - `텔레그램 setup 열어줘` -> `xd.xenesis.messengers.views.open`;
  - Action Inbox list/open prompts remain covered.
- The smoke now reopens Xenesis Agent before each prompt through
  `xd.tools.core.xenesisAgent.open`, so prompts that open Settings or another
  Desk tool do not hide the next submit target.
- Scope boundary:
  - Smoke script/test only. No natural-language routing behavior changes,
    registry/dispatcher changes, setup request writes, provider/tool/messenger
    state mutation, credentials, OAuth/install execution, approval behavior, or
    UI rendering changes.
- Verification:
  - RED:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` failed
    because the smoke still listed only the two Action Inbox prompts.
  - GREEN:
    `node --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` passed
    with 4/4 tests.
  - Scoped Biome passed for the updated smoke script/test.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21.
  - `node --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed with 8/8 tests.
  - `npm run typecheck` passed.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - CR audit was not run because this slice did not change registry,
    dispatcher, or capability code.
- External documentation handling: no browsing. This used cached gap context,
  current planner behavior, and live Electron verification.

## Connection Target Status Rule Catalog Refactor Slice

- Reduced remaining hardcoded natural-language CR routing in
  `xenesisAgentDeskControl.ts` by moving connection target status selection
  into the shared natural-language catalog:
  - added `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES`;
  - planner now interprets target scope (`any`, `tool`, `messenger`,
    `planned-google-tool`) plus args kind (`targetId`, `tool`, `channel`);
  - the previous target-specific status if-chain was replaced by one rule
    loop.
- Behavior scope:
  - Existing prompt semantics and CR paths are preserved. The rule catalog keeps
    the same priority order for diagnostics, setup requests, MCP install
    drafts, planned Google OAuth drafts, tool user stories/action
    policy/install/setup/connector/view, messenger routing/safety/access
    groups/pairing/user stories/profile drafts/view, and diagnostics fallback.
- Scope boundary:
  - Refactor only. No registry/dispatcher changes, provider/tool/messenger data
    changes, setup request writes, credentials, OAuth/install execution,
    approval behavior, or UI rendering changes.
- Verification:
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed because the planner did not yet consume
    `XENESIS_NATURAL_CONNECTION_TARGET_STATUS_RULES`.
  - GREEN:
    the same focused planner test passed with 37/37 tests.
  - Scoped Biome passed for `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - `npm run typecheck` passed.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the live
    Agent pane.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - CR audit was not run because registry/dispatcher/capability code did not
    change.
- External documentation handling: no browsing. This used cached gap context,
  current repo code, focused tests, and live Electron verification.

## Connection Target Open Rule Catalog Refactor Slice

- Continued the hardcoding cleanup by moving connection target open routing out
  of `xenesisAgentDeskControl.ts` and into shared catalog data:
  - added `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES`;
  - extended target rule args kinds with `targetIdVisible` and `channelVisible`;
  - the planner now uses the same target scope + args kind interpreter for
    status and open rules.
- Behavior scope:
  - Existing open prompt semantics and CR paths are preserved. The rule catalog
    keeps the same priority order for diagnostics, setup requests, planned
    Google OAuth drafts, tool MCP/user-story/action-policy/install/connector/
    setup/view opens, messenger user-story/profile/routing/safety/access/
    pairing/view opens, and connection card fallback.
- Scope boundary:
  - Refactor only. No registry/dispatcher changes, provider/tool/messenger data
    changes, setup request writes, credentials, OAuth/install execution,
    approval behavior, or UI rendering changes.
- Verification:
  - RED:
    `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed because the planner did not yet consume
    `XENESIS_NATURAL_CONNECTION_TARGET_OPEN_RULES`.
  - GREEN:
    the same focused planner test passed with 37/37 tests.
  - Scoped Biome passed for `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - `npm run typecheck` passed.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the live
    Agent pane.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - CR audit was not run because registry/dispatcher/capability code did not
    change.
- External documentation handling: no browsing. This used cached gap context,
  current repo code, focused tests, and live Electron verification.

## Provider Target Rule Catalog Refactor Slice

- Moved provider-specific status/open routing out of
  `xenesisAgentDeskControl.ts` into shared natural-language catalog rule data.
- Added `XENESIS_NATURAL_PROVIDER_STATUS_RULES` and
  `XENESIS_NATURAL_PROVIDER_OPEN_RULES`; the planner now interprets these
  rules instead of branching directly on individual provider action
  descriptors.
- Behavior scope:
  - Existing provider prompt semantics and CR paths are preserved. Provider
    readbacks keep setup as the status fallback; provider opens keep explicit
    routing/profile-draft/view/setup context matching without a generic
    provider-open fallback.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, provider settings, credential
    handling, profile draft review writes, runtime execution, approval behavior,
    or UI rendering.
- Verification:
  - RED:
    focused planner test failed because the planner did not yet consume
    `XENESIS_NATURAL_PROVIDER_STATUS_RULES`.
  - GREEN:
    focused planner test passed with 37/37 tests.
  - Scoped Biome passed for the touched catalog, planner, and planner test
    files after one manual line wrap.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted existing browser `fs`
    externalization and dynamic import chunking warnings.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - CR audit was not run because registry/dispatcher/capability code did not
    change.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Provider Aggregate Rule Catalog Refactor Slice

- Moved broad provider catalog status/open selection
  out of `xenesisAgentDeskControl.ts` into shared catalog rule data.
- Added `XENESIS_NATURAL_PROVIDER_AGGREGATE_STATUS_RULES` and
  `XENESIS_NATURAL_PROVIDER_AGGREGATE_OPEN_RULES`; the planner now interprets
  these rules instead of branching directly on provider aggregate action
  descriptors.
- Behavior scope:
  - Existing broad provider catalog prompt semantics and CR paths are
    preserved. Status keeps setup as the aggregate fallback; open keeps the
    existing routing/setup/view/profile-draft priority and provider catalog
    fallback.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, provider settings, credential
    handling, profile draft review writes, runtime execution, approval behavior,
    or UI rendering.
- Verification:
  - RED:
    focused planner test failed because the planner still imported provider
    aggregate action descriptors directly.
  - GREEN:
    focused planner test passed with 37/37 tests.
  - Scoped Biome passed for the touched catalog, planner, and planner test
    files after removing one unused import and sorting type imports.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted existing browser `fs`
    externalization and dynamic import chunking warnings.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF warnings only.
  - CR audit was not run because registry/dispatcher/capability code did not
    change.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Tool Aggregate Rule Catalog Refactor Slice

- Started the next hardcoding cleanup slice for broad external-tool aggregate
  status/open selection.
- Intended change:
  - add shared `XENESIS_NATURAL_TOOL_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_TOOL_AGGREGATE_OPEN_RULES`;
  - have `xenesisAgentDeskControl.ts` interpret those rule arrays instead of
    branching directly on `TOOL_AGGREGATE_STATUS_ACTIONS.*` and
    `TOOL_AGGREGATE_OPEN_ACTIONS.*`;
  - keep existing CR paths and matching priority unchanged, including the MCP
    install draft rule requiring both MCP/install context and draft context.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, tool schemas, connector/OAuth/MCP
    install data, setup request writes, approval behavior, credentials, install
    execution, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing live smoke, and diff check
    before commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still references
    the tool aggregate action descriptors directly.
- Implementation:
  - Added tool aggregate status/open rule catalogs in
    `xenesisNaturalLanguageCatalog.ts`.
  - Extended catalog rules with optional required context word groups so the MCP
    install draft aggregate still requires both MCP/install wording and draft
    wording.
  - Replaced the broad external-tool status/open if-chains in
    `xenesisAgentDeskControl.ts` with shared rule interpretation.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - After unused planner import cleanup, the focused planner test temporarily
    failed on a stale source guard that still expected direct planner imports
    for connector/MCP/draft/setup vocabulary. The guard was updated to validate
    those terms through the shared rule catalogs instead.
  - Scoped Biome passed for `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - The focused planner regression passed again with 37/37 tests after the
    source-guard adjustment.
  - Initial `npm run typecheck` failed because the test accessed
    `requiredContextWordGroups` directly on the narrow `satisfies` rule union;
    the test now uses an `in` guard for that optional property.
  - Focused planner test and scoped Biome both passed again after the
    type-guard fix.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization and dynamic import chunking warnings.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - CR audit was not run because no registry, dispatcher, or capability code
    changed.
  - Static hardcoding check found no remaining tool aggregate action descriptor
    or `TOOL_AGGREGATE_*_ACTIONS` matches in `xenesisAgentDeskControl.ts`.
  - `git diff --check` exited 0 with LF-to-CRLF warnings for touched tracked
    files only.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Messenger Aggregate Rule Catalog Refactor Slice

- Started the next hardcoding cleanup slice for broad external-messenger
  aggregate status/open selection.
- Intended change:
  - add shared `XENESIS_NATURAL_MESSENGER_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_MESSENGER_AGGREGATE_OPEN_RULES`;
  - have `xenesisAgentDeskControl.ts` interpret those rule arrays instead of
    branching directly on `MESSENGER_AGGREGATE_STATUS_ACTIONS.*` and
    `MESSENGER_AGGREGATE_OPEN_ACTIONS.*`;
  - keep existing CR paths and matching priority unchanged: profile drafts,
    routing, safety, access groups, pairing, user stories, views, and open-only
    catalog fallback.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, messenger/channel schemas,
    routing/safety/access/pairing/profile data, setup request writes, approval
    behavior, credentials, external message execution, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing live smoke, and diff check
    before commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still references
    messenger aggregate action descriptors directly.
- Implementation:
  - Added messenger aggregate status/open rule catalogs in
    `xenesisNaturalLanguageCatalog.ts`.
  - Replaced the broad external-messenger status/open if-chains in
    `xenesisAgentDeskControl.ts` with shared rule interpretation.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - Removed unused planner imports for messenger aggregate vocabulary and
    updated source guards to validate those terms through shared rule catalogs.
  - Focused planner test and scoped Biome both passed after cleanup.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization and dynamic import chunking warnings.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - CR audit was not run because no registry, dispatcher, or capability code
    changed.
  - Static hardcoding check found no remaining messenger aggregate action
    descriptor or `MESSENGER_AGGREGATE_*_ACTIONS` matches in
    `xenesisAgentDeskControl.ts`.
  - `git diff --check` exited 0 with LF-to-CRLF warnings for touched tracked
    files only.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Connection Aggregate Rule Catalog Refactor Slice

- Started the next hardcoding cleanup slice for broad Connection Center
  aggregate status/open selection.
- Intended change:
  - add shared `XENESIS_NATURAL_CONNECTION_AGGREGATE_STATUS_RULES` and
    `XENESIS_NATURAL_CONNECTION_AGGREGATE_OPEN_RULES`;
  - have `xenesisAgentDeskControl.ts` interpret those staged rule arrays
    instead of branching directly on `CONNECTION_AGGREGATE_STATUS_ACTIONS.*`
    and `CONNECTION_AGGREGATE_OPEN_ACTIONS.*`;
  - preserve existing priority by giving rules a `stage` plus `matchKind`.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, guide/onboarding/diagnostic/
    setup-request/provider/tool/messenger data, approval behavior, credentials,
    execution, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing live smoke, and diff check
    before commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still imports and
    references the connection aggregate action descriptors directly.
- Implementation:
  - Added staged connection aggregate status/open rule catalogs in
    `xenesisNaturalLanguageCatalog.ts`.
  - Replaced the broad Connection Center aggregate status/open if-chains in
    `xenesisAgentDeskControl.ts` with shared `stage` plus `matchKind` rule
    interpretation.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file; focused planner test still passed
    with 37/37 tests afterward.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    exited 0 with no fixes applied.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Static hardcoding check found no remaining planner direct connection
    aggregate action descriptor or `CONNECTION_AGGREGATE_*_ACTIONS` matches in
    `xenesisAgentDeskControl.ts`.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Review Request Rule Catalog Refactor Slice

- Started the next hardcoding cleanup slice for Connection Center review/setup
  request action selection.
- Intended change:
  - add shared review request provider and target rule catalogs;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of
    branching directly on `REVIEW_REQUEST_ACTIONS.*`;
  - preserve current priority: provider profile draft, install plan, MCP install
    review, OAuth draft, action policy, channel profile draft, generic setup
    request fallback.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, provider/tool/channel request
    payloads, approval behavior, credentials, external execution, or UI
    rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing live smoke, and diff check
    before commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still imports and
    references review request action descriptors directly.
- Implementation:
  - Added review request provider and target rule catalogs in
    `xenesisNaturalLanguageCatalog.ts`.
  - Replaced direct review request if-chains in `xenesisAgentDeskControl.ts`
    with shared provider/connection-target rule interpretation.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file; focused planner test still passed
    with 37/37 tests afterward.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    failed with 1 unused-import error and 1 import-order warning in
    `xenesisAgentDeskControl.ts`.
  - After import cleanup, scoped Biome passed, but the focused planner test
    failed with 36/37 passing because the source guard still expected
    review-specific vocabulary such as `XENESIS_NATURAL_OAUTH_CONTEXT_WORDS`
    to remain in the planner file.
  - Updated the source guard so review-specific vocabulary is validated through
    shared rule catalogs instead of the planner source. Focused planner test
    then passed with 37/37 tests and scoped Biome exited 0 with no fixes
    applied.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Static hardcoding check found no remaining planner direct review request
    action descriptor or `REVIEW_REQUEST_ACTIONS.*` matches in
    `xenesisAgentDeskControl.ts`.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Runtime No-Arg Rule Catalog Refactor Slice

- Started the next hardcoding cleanup slice for no-arg Xenesis runtime
  catalog/readback/control action selection.
- Intended change:
  - add shared runtime support, gateway, inventory, profile inventory, and
    control rule catalogs;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of
    branching directly on no-arg `RUNTIME_ACTIONS.*`;
  - keep dynamic-arg paths (`agentId`, submit text, run prompt, workspace path)
    out of scope.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, approval behavior, credentials,
    execution, dynamic argument extraction, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing live smoke, and diff check
    before commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still branches
    directly on no-arg `RUNTIME_ACTIONS.*`.
- Implementation:
  - Added runtime support, gateway, inventory, profile inventory, and control
    rule catalogs in `xenesisNaturalLanguageCatalog.ts`.
  - Added `blockedContextWords` support to catalog rule interpretation so broad
    runtime status stays below specific reports/tasks/agents status targets.
  - Replaced no-arg runtime direct branches in `xenesisAgentDeskControl.ts`
    with shared rule interpretation.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file; focused planner test still passed
    with 37/37 tests afterward.
  - `npx biome check src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts --max-diagnostics 80`
    failed with planner unused imports and import-order findings after moving
    runtime vocabulary into shared rules.
  - After import cleanup and Biome safe fixes, scoped Biome passed, but the
    focused planner test failed with 36/37 passing because the source guard
    still expected local CLI/MCP/gateway/runtime inventory vocabulary to remain
    in the planner file.
  - Updated the source guard so no-arg runtime vocabulary is validated through
    shared rule catalogs instead of the planner source. Focused planner test
    then passed with 37/37 tests and scoped Biome exited 0 with no fixes
    applied.
  - `npm run typecheck` passed.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - Static hardcoding check found no remaining planner direct no-arg runtime
    `RUNTIME_ACTIONS.*` matches in `xenesisAgentDeskControl.ts` for local CLI
    scan, MCP bridge/settings, gateway, runtime inventory, profile inventory,
    run cancel, or session reset.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - Diff inspection confirmed tracked changes are limited to the Obsidian
    working note, `xenesisNaturalLanguageCatalog.ts`,
    `xenesisAgentDeskControl.ts`, and `xenesisAgentDeskControl.test.ts`.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Runtime Dynamic Rule Catalog Refactor Slice

- Started the next hardcoding cleanup slice for remaining runtime dynamic-arg
  action selection in the Agent natural-language planner.
- Intended change:
  - add shared `XENESIS_NATURAL_AGENT_READBACK_RULES`;
  - add shared agent submit, run start, and workspace set rule catalogs;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of
    branching directly on any runtime `RUNTIME_ACTIONS.*` alias;
  - keep quoted `agentId`, submit text, prompt, and workspace path extraction
    in the planner because those are dynamic argument extraction, not static
    action selection.
- Scope boundary:
  - Refactor only.
  - Do not change registry/dispatcher paths, approval behavior, credentials,
    execution, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing smoke, and diff check before
    commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still imports and
    references `XENESIS_NATURAL_AGENT_EVENT_CONTEXT_WORDS` and still branches
    directly on quoted-agent readback `RUNTIME_ACTIONS.*`.
  - After the user asked for larger slice cycles, the same focused planner test
    failed as expected with 36/37 passing after the source guard was broadened
    to require no runtime descriptor alias or runtime context-word
    action-selection imports in the planner.
- Implementation:
  - Added `XENESIS_NATURAL_AGENT_READBACK_RULES` in
    `xenesisNaturalLanguageCatalog.ts`.
  - Added shared agent submit, run start, and workspace set rule catalogs plus
    `XENESIS_NATURAL_RUNTIME_VISIBLE_PLAN_PATHS`.
  - Moved Xenesis/Agent/Profile/Run/Workspace preconditions into shared rules
    and removed the runtime descriptor alias from `xenesisAgentDeskControl.ts`.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files and fixed 1 file.
  - Re-running the focused planner test passed with 37/37 tests.
  - Initial scoped Biome failed with 2 import-order errors; `npx biome check
    --write` fixed 2 files.
  - Focused planner test then passed again with 37/37 tests, and scoped Biome
    exited 0 with no fixes applied.
  - `npm run typecheck` passed.
  - Static hardcoding check found no remaining planner runtime descriptor alias
    or runtime context-word action-selection imports in
    `xenesisAgentDeskControl.ts`.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Desk Core Rule Catalog Refactor Slice

- Started the next larger hardcoding cleanup slice for general Desk core
  read/open action selection.
- Intended change:
  - add shared rule catalogs for settings, diagnostics, Capability Explorer,
    capture list/active capture, file list/open/read, favorites, and app status;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of
    branching directly on the scoped `DESK_ACTIONS.*` descriptors and context
    words;
  - keep placement detection and optional file path extraction in the planner
    because those are dynamic argument extraction.
- Scope boundary:
  - Refactor only.
  - Do not change CR paths, registry/dispatcher paths, approval behavior,
    execution, terminal/explorer/dock layout routing, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing smoke, and diff check before
    commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner still imports and
    branches directly on Desk core context words such as
    `XENESIS_NATURAL_DESK_SETTINGS_CONTEXT_WORDS`.
- Implementation:
  - Added shared Desk pane-open, capture, file-list, file-path, and misc-read
    rule catalogs with fixed visible text.
  - Split the planner rule matcher so matched rules can produce either actions
    or complete plans.
  - Replaced the scoped Desk core direct branches with rule-plan
    interpretation while leaving placement and optional file path extraction in
    the planner.
- GREEN verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    passed with 37/37 tests.
  - `npx biome format --write src\shared\xenesisNaturalLanguageCatalog.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    formatted 3 files with no fixes applied.
  - Focused planner test passed again with 37/37 tests.
  - Initial scoped Biome exited 0 but reported one unused-import warning for
    `XENESIS_NATURAL_OPEN_OR_SHOW_MINIMAL_WORDS`; that import was removed.
  - Focused planner test then passed again with 37/37 tests, and scoped Biome
    exited 0 with no fixes applied.
  - `npm run typecheck` passed.
  - Static hardcoding check found no remaining planner direct Desk core scoped
    context-word imports or scoped `DESK_ACTIONS.*` descriptor matches for
    settings, diagnostics, Capability Explorer, capture, file list/open/read,
    favorites, or app status.
  - `npm run build` passed; Vite emitted the existing browser `fs`
    externalization warning for `hwp.js` and the existing dynamic/static import
    chunking warning for `deskBridge.ts`.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings for
    touched tracked files only.
  - CR audit was not run because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Desk Control Rule Catalog Refactor Slice

- Started the next larger hardcoding cleanup slice for remaining direct
  `DESK_ACTIONS.*` planner action selection.
- Intended change:
  - add shared rule catalogs for active dock focus/close, dock resize,
    window-size preset, explorer actions, terminal actions, dock arrange/merge,
    dock pane list, and artifact target set;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of using a
    local `DESK_ACTIONS` descriptor alias;
  - keep numeric/path/query/command extraction and placement/arrange/window-state
    detection in the planner.
- Scope boundary:
  - Refactor only.
  - Do not change CR paths, registry/dispatcher paths, approval behavior,
    execution, provider/runtime routing, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing smoke, and diff check before
    commit.
- RED verification:
  - Focused planner test failed as expected with 36/37 passing because the
    planner source still did not reference
    `XENESIS_NATURAL_ACTIVE_DOCK_FOCUS_RULES`.
- Implementation:
  - Added shared rule catalogs for active dock focus/close, dock resize,
    window-size preset, explorer, terminal, dock arrange/merge, pane list, and
    artifact-target action selection.
  - Removed the planner-local `DESK_ACTIONS` descriptor alias and interpreted
    those shared rules in `xenesisAgentDeskControl.ts`.
  - Preserved dynamic extraction, placement/arrange/window-state detection, CR
    paths, reasons, visible text, and approval behavior.
- Focused GREEN verification:
  - Focused planner test passed with 37/37 tests.
  - Scoped Biome exited 0 with no fixes applied after import cleanup.
  - Static hardcoding check found no remaining planner direct Desk action
    descriptor alias or moved Desk control context-word imports.
- Broad verification:
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings only.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - CR audit was skipped because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Guide/Onboarding Rule Catalog Refactor Slice

- Started a larger hardcoding cleanup slice for guide and onboarding action
  selection.
- Intended change:
  - add shared rule catalogs for guide open/status and onboarding center/step
    open/status;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of
    selecting `GUIDE_ACTIONS.*` / `ONBOARDING_ACTIONS.*` directly;
  - keep guide/step target lookup, open-file detection, and dynamic args in the
    planner.
- Scope boundary:
  - Refactor only.
  - Do not change CR paths, registry/dispatcher paths, approval behavior,
    execution, provider/tool/messenger routing, or UI rendering.
- Verification plan:
  - RED focused planner/source-guard test first;
  - GREEN focused planner test;
  - scoped Biome for catalog/planner/test files;
  - root typecheck, build, natural Desk routing smoke, and diff check before
    commit.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing because the planner source still did
    not reference `XENESIS_NATURAL_GUIDE_OPEN_RULES`.
- Implementation:
  - Added shared guide open/status and onboarding open/status rule catalogs.
  - Added generic planner context-rule matching and moved guide/onboarding
    descriptor selection behind those rule catalogs.
  - Preserved target lookup, open-file detection, args, CR paths, reasons,
    route order, and approval behavior.
- Focused GREEN verification:
  - Focused planner test passed with 37/37 tests.
  - Scoped Biome over the catalog/planner/test files exited 0 with no fixes
    applied after formatting.
  - Static hardcoding check found no remaining planner direct guide/onboarding
    descriptor aliases or direct onboarding context-word imports.
- Broad verification:
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings only.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Natural Context Predicate Catalog Refactor Slice

- Continued the larger hardcoding cleanup with planner predicate data.
- Intended change:
  - add a shared `XenesisNaturalContextRule` type;
  - move action/open intent, readback intent, external tool/messenger catalog
    context, provider profile context, review-request intent, guide file open,
    and connection aggregate match-kind context into shared catalog rules;
  - have `xenesisAgentDeskControl.ts` interpret those rules instead of directly
    importing the moved word arrays.
- Scope boundary:
  - Refactor only.
  - Preserve CR paths, action reasons, dynamic extraction, target lookup, route
    order, approval behavior, provider/tool/messenger behavior, and UI
    rendering.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The source guard first caught
    remaining planner use of `XENESIS_NATURAL_OPEN_OR_SHOW_WORDS`.
- Implementation:
  - Added shared context-rule exports and an aggregate match-kind rule map.
  - Replaced direct planner predicate branches with `naturalContextMatches(...)`.
  - Replaced the aggregate match-kind switch with the shared match-rule map.
- Focused GREEN verification:
  - Focused planner test passed with 37/37 tests.
  - Scoped Biome exited 0 with no fixes applied after import cleanup.
  - Static predicate hardcoding grep found no moved word-array references in
    `xenesisAgentDeskControl.ts`.
- Broad verification:
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings only.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog rule
    interpretation and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Natural Target Lookup Catalog Refactor Slice

- Continued with a larger hardcoding cleanup slice for planner target lookup
  ownership.
- Intended change:
  - keep natural target arrays in `xenesisNaturalLanguageCatalog.ts`;
  - add shared finder functions for placement, window-size preset, dock side,
    dock window state, arrange mode, core tool, view, connection, onboarding
    step, and provider targets;
  - have `xenesisAgentDeskControl.ts` call those finders instead of importing
    the target arrays and choosing lookup arrays directly.
- Scope boundary:
  - Refactor only.
  - Preserve target words, route order, CR paths, args, visible text, dynamic
    extraction, provider semantics, approval behavior, and UI behavior.
  - No CR schema, dispatcher, generated docs, provider runtime, or approval
    flow changes.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The source guard caught direct
    planner import/use of `XENESIS_NATURAL_ARRANGE_MODE_TARGETS`.
- Implementation:
  - Added shared target finder exports in `xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner direct
    `findXenesisNaturalWordsTarget(value, XENESIS_NATURAL_*_TARGETS)` call
    sites with specialized finder calls.
  - Updated source guards so the planner cannot re-import the moved target
    arrays.
- Verification:
  - Focused planner test passed with 37/37 tests.
  - Scoped Biome over the catalog/planner/test files exited 0 with no fixes
    applied.
  - Static grep found no remaining planner direct target-array lookup patterns.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings only.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog
    target lookup and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Natural Rule Matcher Catalog Refactor Slice

- Continued with a larger hardcoding cleanup slice for generic natural
  context-rule matching.
- Intended change:
  - move reusable text/context matching semantics into
    `xenesisNaturalLanguageCatalog.ts`;
  - remove planner-local `hasAny`, `naturalRuleMatches`,
    `naturalContextRuleFromNaturalText`, and `naturalContextMatches`;
  - have `xenesisAgentDeskControl.ts` call shared matcher helpers for catalog
    rule lookup, connection/provider target rules, guide/onboarding rules, and
    aggregate/open-intent checks.
- Scope boundary:
  - Refactor only.
  - Preserve route order, rule arrays, target data, CR paths, action args,
    dynamic extraction, visible text, provider behavior, approvals, and UI
    behavior.
  - No CR schema, dispatcher, generated docs, provider runtime, or approval
    flow changes.
- RED verification:
  - `npx tsx --test src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
    failed as expected with 36/37 passing. The source guard caught
    planner-local `function hasAny`.
- Implementation:
  - Added shared `xenesisNaturalTextHasAny`,
    `matchesXenesisNaturalContextRule`, `findXenesisNaturalContextRule`, and
    `matchesXenesisNaturalContextRules` exports.
  - Replaced planner-local matcher definitions and all planner call sites with
    the shared helpers.
  - Extended source guards so the planner cannot reintroduce the local matcher
    functions.
- Verification:
  - Focused planner test passed with 37/37 tests before and after formatting.
  - Scoped Biome over the catalog/planner/test files exited 0 with no fixes
    applied after formatting.
  - Static grep found no remaining planner-local matcher helper names.
  - `npm run typecheck` passed.
  - `npm run build` passed with existing Vite warnings only.
  - `npm run smoke:xenesis:natural-desk-routing` passed 21/21 through the
    built Electron app.
  - `git diff --check` exited 0 with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors shared
    natural-language matcher helpers and does not change registry, dispatcher,
    or capability coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Shared Connection ID Catalog Slice

- Continued the larger hardcoding cleanup by making
  `xenesisConnections.ts` own Xenesis connection ID catalogs used by CR schemas,
  main-process handlers, and capability tests.
- Intended change:
  - export provider, tool, OAuth-tool, implemented messenger, all messenger,
    guide, and onboarding-step IDs from the shared connection catalog;
  - replace duplicated ID arrays in `deskBridgeCapabilities.ts` and
    `main/index.ts` with shared aliases;
  - reuse the shared provider IDs in `xenesisConnectionCapabilities.test.ts`.
- Scope boundary:
  - Refactor ownership only.
  - Preserve CR paths, schemas, dispatch behavior, approval behavior, natural
    language routing, setup/open/request semantics, and UI rendering.
  - Do not change provider selection, OAuth, MCP installs, messenger delivery,
    or Action Inbox mutation behavior.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` failed
    as expected on the new source guard because `deskBridgeCapabilities.ts`
    still owned local Xenesis connection ID arrays.
- Implementation:
  - Added shared ID exports in `xenesisConnections.ts`.
  - Replaced duplicated CR schema and main-process allowlists with shared
    connection catalog exports.
  - Removed the local test provider ID catalog and added source guards against
    reintroducing local ownership.
- Verification:
  - Focused capability test passed with 33/33 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after formatting.
  - Scoped Biome exited 0 with existing warnings/infos only.
  - `npm run typecheck`, `npm run docs:capabilities:audit`,
    `npm run build`, `npm run smoke:xenesis:natural-desk-routing`, and
    `git diff --check` passed. `diff --check` reported LF-to-CRLF working-copy
    warnings only.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Natural Action Builder Catalog Refactor Slice

- Continued the larger hardcoding cleanup by moving natural-language action
  builder semantics from `xenesisAgentDeskControl.ts` into
  `xenesisNaturalLanguageCatalog.ts`.
- Intended change:
  - add a shared natural Desk action request type and shared builder helpers
    for descriptor/template/core-tool/view actions;
  - move `targetScope`, `argsKind`, onboarding args, and connection aggregate
    `stage` interpretation into shared catalog helper functions;
  - have the planner call shared builder/finder helpers instead of owning the
    rule interpretation logic directly.
- Scope boundary:
  - Refactor ownership only.
  - Preserve route order, CR paths, args payloads, approval state, action ids,
    action reasons, visible text, dynamic extraction, provider behavior,
    approvals, and UI behavior.
  - Do not change CR schemas, dispatcher coverage, generated docs, provider
    selection, OAuth/MCP install semantics, or Action Inbox mutation behavior.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard caught planner-local `function naturalCatalogAction`.
- Implementation:
  - Added shared action request/builders and rule-action helpers in
    `xenesisNaturalLanguageCatalog.ts`.
  - Replaced planner-local natural action builders and connection/provider/
    onboarding/aggregate interpretation helpers with shared catalog helpers.
  - Updated source guards so planner source cannot re-own these builder
    semantics.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after formatting.
  - Scoped Biome exited 0 with no diagnostics.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Natural Text Extraction Catalog Refactor Slice

- Continued the larger hardcoding cleanup by moving natural-language text
  extraction and detection helpers from `xenesisAgentDeskControl.ts` into
  `xenesisNaturalLanguageCatalog.ts`.
- Intended change:
  - catalog owns natural text normalization, placement/dock/window-size
    detection, first-integer/dock-size/terminal-count extraction, quoted text
    extraction, local path extraction, explorer filter query extraction, and
    terminal command extraction;
  - planner imports shared helpers and keeps only route ordering plus action
    assembly;
  - source guards prevent reintroducing planner-local extraction helpers,
    extraction patterns, numeric limits, and moved target finder ownership.
- Scope boundary:
  - Refactor ownership only.
  - Preserve route order, CR paths, args payloads, approval state, visible text,
    action ids/reasons, provider behavior, approvals, and UI behavior.
  - No CR schema, dispatcher, generated docs, provider runtime, OAuth/MCP
    install, messenger delivery, or Action Inbox mutation changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard caught planner-local
    `function normalizeNaturalLanguageText`.
- Implementation:
  - Added shared `normalizeXenesisNaturalLanguageText`,
    `detectXenesisNaturalPlacement`,
    `detectXenesisNaturalDockSide`,
    `detectXenesisNaturalDockWindowState`,
    `detectXenesisNaturalArrangeMode`,
    `detectXenesisNaturalWindowSizePreset`,
    `extractXenesisNaturalFirstInteger`,
    `extractXenesisNaturalDockSize`,
    `extractXenesisNaturalTerminalCount`,
    `stripXenesisNaturalQuotedText`,
    `extractXenesisNaturalQuotedTexts`,
    `extractXenesisNaturalQuotedText`,
    `extractXenesisNaturalLocalPath`,
    `extractXenesisNaturalFilterQuery`, and
    `extractXenesisNaturalTerminalCommand`.
  - Removed the matching planner-local helper implementations and replaced all
    call sites with shared catalog imports.
  - Updated source guards so extraction patterns and numeric limits are
    verified as catalog-owned.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after formatting.
  - Scoped Biome exited 0 with no diagnostics.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog text
    extraction helpers and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Desk Action Result Message Catalog Refactor Slice

- Continued the larger hardcoding cleanup by moving Desk action result-summary
  and pending/completed message helper ownership from
  `xenesisAgentDeskControl.ts` into `xenesisNaturalLanguageCatalog.ts`.
- Intended change:
  - catalog owns record coercion, compact JSON, basename/field readers,
    file-list/capture/bounds/workflow result summaries, generic result summary,
    pending message, completed message, and execution summary helpers;
  - planner keeps its existing public exports for compatibility but delegates
    to the shared catalog implementations;
  - source guards prevent reintroducing planner-local result/message helper
    implementations or planner-owned result-summary constants.
- Scope boundary:
  - Refactor ownership only.
  - Preserve Desk action parsing, direct execution, approval detection,
    pending action selection, output text, CR paths, result summaries, and UI
    behavior.
  - No natural-language route, CR schema, dispatcher, provider, approval, or
    Action Inbox mutation changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard caught planner-local `function describeDeskAction`.
- Implementation:
  - Added shared `asXenesisDeskActionRecord`,
    `compactXenesisDeskActionJson`, `basenameXenesisDeskActionValue`,
    record field readers, result summary helpers, and shared message builders.
  - Removed the matching planner-local summary helper block and made
    `buildXenesisDeskActionPendingMessage`,
    `buildXenesisDeskActionCompletedMessage`, and
    `summarizeXenesisDeskActionExecution` delegate to shared implementations.
  - Updated source guards so result-summary constants and helper functions are
    catalog-owned.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before formatting, after formatting, and after Biome
    import-order fix.
  - Scoped Biome check passed with no diagnostics after safe import-order fix.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog
    message summary helpers and does not change registry, dispatcher, or
    capability coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Desk Action Parser Catalog Refactor Slice

- Continued the larger hardcoding cleanup by moving Desk action block parser
  helper ownership from `xenesisAgentDeskControl.ts` into
  `xenesisNaturalLanguageCatalog.ts`.
- Intended change:
  - catalog owns action record normalization, action-array extraction from
    parsed JSON, visible chat cleanup, fenced/raw Desk action parsing, and
    direct-run detection;
  - planner keeps its existing public parser/direct-run exports for
    compatibility but delegates to shared catalog implementations;
  - source guards prevent reintroducing planner-local parser helper functions,
    record key ownership, value type guards, and parser-specific string
    literals.
- Scope boundary:
  - Refactor ownership only.
  - Preserve action block JSON parsing, visible chat cleanup, validation
    errors, default action ids, approval flag parsing, raw JSON payload
    handling, direct-run detection, execution behavior, output text, and UI
    behavior.
  - No natural-language route, CR schema, dispatcher, provider, approval,
    Action Inbox mutation, or live CR behavior changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard caught planner-local
    `function normalizeDeskActionRecord`.
- Implementation:
  - Added shared `XenesisDeskActionParseResult` and parser normalization
    result contracts.
  - Added shared `normalizeXenesisDeskActionRecord`,
    `xenesisDeskActionRecordsFromJson`,
    `normalizeXenesisDeskActionVisibleText`,
    `parseXenesisDeskActionBlocks`, and
    `shouldRunXenesisDeskActionsDirectly`.
  - Removed the matching planner-local parser helper block and made
    `parseXenesisDeskActionBlocks` and
    `shouldRunXenesisDeskActionsDirectly` delegate to shared implementations.
  - Updated source guards so parser record keys and value type guards are
    catalog-owned.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after formatting.
  - Scoped Biome check passed with no diagnostics.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog
    parser helpers and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Desk Action Approval Catalog Refactor Slice

- Continued the larger hardcoding cleanup by moving Desk action
  approval-required and pending/approve helper ownership from
  `xenesisAgentDeskControl.ts` into `xenesisNaturalLanguageCatalog.ts`.
- Intended change:
  - catalog owns approval-required detection from direct result flags, nested
    result flags, and approval-required error text;
  - catalog owns pending action extraction and approved-copy behavior;
  - planner keeps its existing public approval helper exports for
    compatibility but delegates to shared catalog implementations;
  - source guards prevent reintroducing planner-local approval helper
    implementation details or planner-owned approval state constants.
- Scope boundary:
  - Refactor ownership only.
  - Preserve approval-required detection, pending action selection,
    approved-copy behavior, execution behavior, output text, CR paths, and UI
    behavior.
  - No natural-language route, CR schema, dispatcher, provider, Action Inbox
    mutation, or live CR behavior changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard caught planner-local
    `XENESIS_DESK_ACTION_APPROVAL_STATE` ownership before the helper move.
- Implementation:
  - Added shared `XenesisDeskActionApprovalResultInput` and
    `xenesisDeskActionResultRecord`.
  - Added shared `isXenesisDeskActionApprovalRequiredResult`,
    `pendingXenesisDeskActionsFromResults`, and
    `approveXenesisDeskActions`.
  - Removed the matching planner-local helper implementations and made the
    planner public approval functions delegate to shared implementations.
  - Updated source guards so approval state constants and approval helper
    implementation patterns are catalog-owned.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after formatting.
  - Scoped Biome check passed with no diagnostics.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/catalog
    approval helpers and does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Desk Control Prompt Hint Catalog Refactor Slice

- Continued the larger hardcoding cleanup by moving Desk control prompt-hint
  capability discovery and CR path summary helper ownership from
  `xenesisAgentDeskControl.ts` into shared module
  `xenesisDeskControlPromptHint.ts`.
- Intended change:
  - shared prompt-hint module owns capability-prefix matching, Connection
    Center registry path summary, direct CR path summary, and full prompt-hint
    assembly;
  - planner keeps its existing public `buildXenesisDeskControlPromptHint`
    export for compatibility but delegates to the shared module;
  - source guards prevent reintroducing planner-local `listDeskBridgeCapabilities`
    dependency, prompt hint constants, protocol text/pattern usage, and
    prompt-hint helper functions.
- Scope boundary:
  - Refactor ownership only.
  - Preserve prompt hint text, discovered Connection Center CR path summary,
    useful direct CR path summary, capability filtering behavior, output text,
    CR paths, natural routing, execution behavior, and UI behavior.
  - No CR schema, dispatcher, provider, approval, Action Inbox mutation, or
    live CR behavior changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard caught planner-local `listDeskBridgeCapabilities`
    dependency before the helper move.
- Implementation:
  - Added `src/shared/xenesisDeskControlPromptHint.ts` with shared prompt-hint
    helpers and full prompt-hint assembly.
  - Removed the planner's direct `listDeskBridgeCapabilities` import and
    local prompt-hint helper implementations.
  - Made the planner public `buildXenesisDeskControlPromptHint` function
    delegate to the shared module.
  - Updated source guards so prompt hint lines and protocol text/pattern usage
    are no longer planner-owned.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after formatting.
  - Scoped Biome check passed with no diagnostics.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner/shared
    prompt-hint helper ownership and does not change registry, dispatcher, or
    capability coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Shared Natural Language Planner Refactor Slice

- Continued the larger hardcoding cleanup with a bigger slice by moving the
  Xenesis Agent natural-language planner helper graph from
  `xenesisAgentDeskControl.ts` into shared module
  `xenesisNaturalLanguagePlanner.ts`.
- Intended change:
  - shared planner owns intent gating, catalog rule plan construction,
    Connection Center open/readback routing, runtime readbacks/control,
    workspace binding routing, generic Desk routing order,
    terminal/explorer/layout route assembly, and empty-plan construction;
  - renderer control keeps the existing public
    `planXenesisDeskNaturalLanguageActions` export for compatibility but
    delegates to the shared planner;
  - source guards prevent reintroducing planner-local natural-language helper
    functions, natural rule imports, matcher/finder use, and route assembly in
    the renderer control file.
- Scope boundary:
  - Refactor ownership only.
  - Preserve route order, natural-language prompt outputs, CR paths, args,
    approval flags, visible text, parser/execution wrappers, and UI behavior.
  - No CR schema, dispatcher, provider, approval, Action Inbox mutation, or
    live CR behavior changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard failed on planner-local
    `function hasExplicitOpenIntent`.
- Implementation:
  - Added `src/shared/xenesisNaturalLanguagePlanner.ts`.
  - Moved the natural-language planner helper graph and full
    `planXenesisDeskNaturalLanguageActions` implementation into the shared
    planner.
  - Replaced the renderer implementation with a compatibility wrapper.
  - Updated source guards to read and validate the shared planner module.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests.
  - Scoped Biome check passed after a Biome organizeImports safe fix.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors planner ownership
    and does not change registry, dispatcher, or capability coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Shared Desk Action Runner Refactor Slice

- Continued the larger hardcoding cleanup by moving Desk action execution/run
  helper ownership from `xenesisAgentDeskControl.ts` into shared module
  `xenesisDeskActionRunner.ts`.
- Intended change:
  - shared runner owns action runner types, result collection, observational
    activity reporting, direct CR executor invocation, call-result key decoding,
    approval/success/failure phase selection, and thrown-error normalization;
  - renderer control keeps existing public exports as compatibility type aliases
    and a wrapper around the shared runner;
  - source guards prevent reintroducing runner-local execution-loop details and
    runner status/key constants in the renderer control file.
- Scope boundary:
  - Refactor ownership only.
  - Preserve executor call order, args, approval flags, call-result decoding,
    error normalization, activity phases, public exports, and UI behavior.
  - No CR schema, dispatcher, provider, approval, Action Inbox mutation,
    natural-language routing, or live CR behavior changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard failed on renderer-local
    `const results: XenesisDeskActionExecutionResult[] = []`.
- Implementation:
  - Added `src/shared/xenesisDeskActionRunner.ts`.
  - Moved the action execution loop and runner types into the shared runner.
  - Replaced the renderer implementation with compatibility aliases and a
    delegating `runXenesisDeskActions` wrapper.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after the Biome import-order fix.
  - Scoped Biome check passed after a safe organizeImports fix.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:natural-desk-routing`, and `git diff --check`
    passed. `build` reported existing Vite warnings only; `diff --check`
    reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors action runner
    ownership and does not change registry, dispatcher, or capability coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Renderer Desk Control Facade Collapse Slice

- Continued the hardcoding cleanup by collapsing
  `xenesisAgentDeskControl.ts` from a wrapper implementation file into a direct
  shared re-export facade.
- Intended change:
  - renderer control re-exports action runner types/functions from
    `xenesisDeskActionRunner.ts`;
  - re-exports prompt hint, parser/result/approval helpers, and natural planner
    functions from their shared modules;
  - removes facade-local `FromShared`/`FromCatalog` alias imports, type alias
    assignments, exported wrapper function bodies, and the
    `DESK_ACTION_PROTOCOL_FORMAT` alias.
- Scope boundary:
  - Refactor ownership only.
  - Preserve existing public import names used by Agent pane, activity blaster,
    Agent types, and tests.
  - No CR schema, dispatcher, provider, approval, Action Inbox mutation,
    natural-language routing, or live CR behavior changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 36/37 passing. The
    new source guard failed on facade-local `FromShared` alias imports.
- Implementation:
  - Replaced `xenesisAgentDeskControl.ts` with direct re-exports from shared
    runner, prompt hint, catalog, and planner modules.
  - Widened shared `XenesisDeskActionResultMessageInput` with optional
    execution-result metadata fields (`id`, `args`, `approved`,
    `approvalRequired`, `permission`, `approval`, `source`) so direct
    re-export keeps the old wrapper's accepted type surface.
- Verification:
  - Focused Agent Desk Control test passed with 37/37 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    103/103 tests before and after the catalog type adjustment.
  - Scoped Biome check passed with no diagnostics before and after the catalog
    type adjustment.
  - `npm run typecheck` failed once on the too-narrow shared message input type,
    then passed after widening the type.
  - `npm run build`, `npm run smoke:xenesis:natural-desk-routing`, and
    `git diff --check` passed. `build` reported existing Vite warnings only;
    `diff --check` reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only refactors facade ownership and
    widens a shared TypeScript input type; it does not change registry,
    dispatcher, or capability coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Connection Target Source-of-Truth Slice

- Continued the larger hardcoding cleanup by moving provider, external-tool,
  and external-messenger natural-language target ownership out of
  `xenesisNaturalLanguageCatalog.ts` and into the Connection Center source of
  truth in `src/shared/xenesisConnections.ts`.
- Intended change:
  - Connection Center data now exports natural target lists for provider IDs,
    external tool cards, and external messenger cards.
  - The natural-language catalog re-exports those targets instead of owning a
    second literal id/label/support-level list.
  - A new regression test verifies every Connection Center tool, messenger, and
    provider ID remains represented as a natural target, and checks setup-status
    routing across the full messenger ID list.
- Scope boundary:
  - Refactor/catalog-source alignment only.
  - No CR schema changes, dispatcher changes, OAuth/install behavior, provider
    runtime selection changes, messenger delivery, profile writes, or Action
    Inbox mutation changes.
- RED verification:
  - Focused Agent Desk Control test failed as expected with 37/38 passing. The
    new source guard failed because `xenesisNaturalLanguageCatalog.ts` still
    directly declared `XENESIS_NATURAL_CONNECTION_TARGETS`.
- Implementation:
  - Added `XENESIS_CONNECTION_NATURAL_CONNECTION_TARGETS` and
    `XENESIS_CONNECTION_NATURAL_PROVIDER_TARGETS` in
    `src/shared/xenesisConnections.ts`.
  - Replaced duplicated literal target arrays in
    `src/shared/xenesisNaturalLanguageCatalog.ts` with imports from the
    Connection Center catalog.
  - Widened the local target helper inputs to accept readonly alias arrays and
    pre-materialized implemented messenger definitions without a `status`
    field.
- Verification:
  - Focused Agent Desk Control test passed with 38/38 tests.
  - Capability, connection catalog, and Agent Desk Control tests passed with
    104/104 tests.
  - Scoped Biome check passed after a safe organizeImports fix.
  - `npm run typecheck` failed once on helper input typing, then passed after
    widening the helper types.
  - `npm run build`, `npm run smoke:xenesis:natural-desk-routing`, and
    `git diff --check` passed. `build` reported existing Vite warnings only;
    `diff --check` reported LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes catalog source
    ownership and tests; it does not change registry, dispatcher, or capability
    coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## CR-first Live Smoke Expansion Slice

- Continued the larger OpenClaw/Hermes verification cleanup by aligning the
  repeatable live smoke scripts with the current CR-first Connection Center and
  readback surfaces.
- Intended change:
  - `scripts/xenesisConnectionCenterLiveSmoke.mjs` should open Connection Center
    through `xd.xenesis.connections.open` instead of generic
    `xd.panes.settings.open` settings args.
  - `scripts/xenesisNaturalDeskRoutingLiveSmoke.mjs` should live-smoke natural
    prompts for Connection Center open, provider profile draft status, Google
    Calendar OAuth draft status, and channel profile draft status.
- Scope boundary:
  - Smoke script/test coverage only.
  - No registry schema changes, dispatcher changes, OAuth/install execution,
    provider runtime selection, messenger delivery, profile writes, or Action
    Inbox mutation behavior.
- RED verification:
  - `npx tsx --test scripts\xenesisConnectionCenterLiveSmoke.test.mjs
    scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs` failed as expected.
  - Failures proved the old smoke still used `xd.panes.settings.open`, and the
    natural routing prompt catalog lacked the four new read/open prompt cases.
- Implementation:
  - Updated the Connection Center live smoke open request to
    `xd.xenesis.connections.open` with `{ ensureVisible: true }`.
  - Added the four natural prompt cases to the routing live smoke catalog.
- Verification:
  - Focused smoke tests passed with 8/8 tests.
  - Scoped Biome format/check passed for the four changed smoke files.
  - `npm run smoke:xenesis:connection-center` passed 6/6.
  - `npm run smoke:xenesis:natural-desk-routing` passed 33/33.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes smoke scripts/tests;
    it does not change registry, dispatcher, or static callable coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Connection Center Settings Target Source-of-Truth Slice

- Continued the larger hardcoding cleanup by moving the Connection Center
  settings target out of duplicated CR open helpers and into
  `src/shared/xenesisConnections.ts`.
- Intended change:
  - `xenesisConnections.ts` owns `XENESIS_CONNECTION_CENTER_SETTINGS_ACTION`,
    `XENESIS_CONNECTION_CENTER_ROOT_SELECTOR`, and
    `buildXenesisConnectionCenterOpenArgs`.
  - `src/shared/deskBridgeCapabilities.ts` and `src/main/index.ts` use the
    shared builder for Connection Center renderer open args.
  - The development Connection Center snapshot helper gets its root selector
    from the shared constant instead of owning a duplicate selector literal.
- Scope boundary:
  - Refactor/source ownership only.
  - No CR path names, capability schemas, approval policy, renderer behavior,
    OAuth/install execution, provider runtime selection, messenger delivery,
    profile writes, or Action Inbox mutation behavior changed.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts
    src\shared\xenesisConnectionCapabilities.test.ts` failed as expected before
    implementation. The failures proved `deskBridgeCapabilities.ts` still owned
    the Connection Center section literal and the shared builder/constants did
    not exist yet.
- Implementation:
  - Added the shared Connection Center settings action, root selector, and open
    args builder.
  - Replaced repeated main/adapter renderer args across onboarding, setup
    request, diagnostics, tool, messenger, guide, and provider open helpers.
  - Updated the snapshot helper to inject the shared root selector into its
    renderer-side script config.
- Verification:
  - Focused shared connection/capability tests passed with 67/67 tests before
    and after formatting.
  - Scoped Biome format/check passed; check exited 0 with existing warnings in
    large main/shared files.
  - `npm run docs:capabilities:audit` passed with missing registered paths 0,
    missing dispatched coverage paths 0, undispatched static callable methods
    0, and dispatcher paths missing from tree 0. The generated untracked audit
    markdown was removed because this repo still treats generated audit docs as
    a known infra gap.
  - `npm run typecheck`, `npm run build`,
    `npm run smoke:xenesis:connection-center`, and
    `npm run smoke:xenesis:natural-desk-routing` passed. Build reported existing
    Vite warnings; `git diff --check` reported LF-to-CRLF warnings only.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Connection Settings Action Source-of-Truth Slice

- Continued the larger hardcoding cleanup by moving repeated
  `settingsAction` objects in `src/shared/xenesisConnections.ts` into shared
  constants.
- Intended change:
  - `xenesisConnections.ts` now owns provider default, local CLI MCP, gateway,
    and external-bot settings action constants.
  - Manual MCP tools, MCP bridge, local CLI items, provider/first-chat surfaces,
    gateway surfaces, messenger surfaces, and onboarding surfaces reference the
    constants instead of repeating `{ category, mode, section }` objects.
- Scope boundary:
  - Catalog source ownership only.
  - No status values, CR actions, setup plans, renderer behavior, provider
    runtime selection, messenger delivery, profile writes, or approval semantics
    changed.
- RED verification:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed as expected
    before implementation because the new provider settings action constant was
    undefined.
- Implementation:
  - Added shared settings action constants for provider defaults, local CLI MCP,
    gateway, and external bots.
  - Replaced all direct inline `settingsAction: { category: ... }` catalog
    objects with the constants.
  - Updated settingsAction assertions to reference the constants and added a
    source guard against reintroducing inline settingsAction objects.
- Verification:
  - `rg -n -F "settingsAction: { category:" src/shared/xenesisConnections.ts
    src/shared/xenesisConnections.test.ts` found no matches.
  - `npx tsx --test src\shared\xenesisConnections.test.ts` passed 35/35 before
    and after formatting.
  - Scoped Biome format/check passed.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit/live smoke were skipped because this slice only changes catalog
    source ownership and tests; it does not change registry, dispatcher, runtime
    behavior, or built renderer output.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Guide/User-Story Natural Live Smoke Expansion Slice

- Continued the larger OpenClaw/Hermes coverage pass by broadening the
  repeatable Agent-pane natural Desk routing live smoke from 11 prompt cases to
  18 prompt cases.
- Added live-smoked read/open surfaces for:
  - Hermes user-story guide open.
  - OpenClaw channel setup guide open.
  - Connection diagnostics catalog open.
  - Connection setup-request catalog status.
  - External tool user-story catalog status.
  - External tool install-plan catalog open.
  - External channel user-story catalog status.
- Scope boundary:
  - Smoke script/test coverage only.
  - No natural-language planner, CR schema, dispatcher, provider runtime,
    OAuth/install execution, messenger delivery, profile write, or Action Inbox
    mutation behavior changed.
- RED/GREEN:
  - Initial RED proved the live smoke script still exported the old 11-case
    prompt catalog while the test expected the expanded 18-case catalog.
  - First live smoke failed 46/54. Targeted Electron diagnostics showed four
    prompts did not satisfy existing aggregate catalog match rules and routed
    to `xd.xenesis.connections.status` or provider fallback text instead.
  - The four prompts were corrected to include catalog-qualified wording:
    `Connection diagnostics catalog 열어줘`,
    `Connection setup requests catalog 상태 보여줘`,
    `외부 툴 install plans catalog 열어줘`, and
    `외부 채널 user stories catalog 상태 보여줘`.
- Verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed 4/4 after the prompt catalog update and after the wording
    correction.
  - Scoped Biome format/check passed for the two smoke files.
  - `npm run smoke:xenesis:natural-desk-routing` passed 54/54.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes smoke scripts/tests;
    it does not change registry, dispatcher, or runtime coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## CR-First Detail ControlPaths Metadata Slice

- Continued the Connection Center source-of-truth cleanup by removing generic
  Settings fallback control paths from provider/tool/messenger detail metadata
  when a CR-specific detail open path already exists.
- Updated detail metadata for:
  - Tool views: `xd.xenesis.tools.views.open`.
  - Tool install plans: `xd.xenesis.tools.installPlans.open`.
  - Provider views: `xd.xenesis.providers.views.open`.
  - Messenger views: `xd.xenesis.messengers.views.open`, while preserving
    implemented channel profile/test CR paths.
- Scope boundary:
  - Metadata and tests only.
  - Explicit onboarding guided steps that open user-edited settings remain on
    `xd.panes.settings.open`.
  - No registry schema, dispatcher, natural-language routing, provider runtime,
    MCP config write, OAuth/install execution, messenger delivery, profile
    write, or approval behavior changed.
- RED/GREEN:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed 31/35 after
    the RED expectations because the four templates still advertised
    `xd.panes.settings.open`.
  - After the template update, the same focused test passed 35/35 before and
    after formatting.
- Verification:
  - Scoped Biome format/check passed for `src/shared/xenesisConnections.ts` and
    `src/shared/xenesisConnections.test.ts`.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes connection metadata
    and tests, not registry schemas or dispatcher coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## CR-First Review Draft ControlPaths Metadata Slice

- Continued the review-only metadata cleanup by removing generic Settings
  fallback control paths from OAuth draft and provider profile draft surfaces
  when CR-specific open/request paths already exist.
- Updated review metadata for:
  - Google Workspace/Calendar-style tool OAuth drafts:
    `xd.xenesis.tools.oauthDrafts.open`,
    `xd.xenesis.tools.oauthDrafts.request`, and
    `xd.xenesis.connections.open`.
  - AI provider profile drafts:
    `xd.xenesis.providers.profileDrafts.open`,
    `xd.xenesis.providers.profileDrafts.request`, and
    `xd.xenesis.connections.open`.
  - Provider profile draft `local-cli-boundary` review step, now using the
    profile draft open/request paths instead of generic Settings.
- Scope boundary:
  - Metadata and tests only.
  - Explicit onboarding guided steps that open user-edited provider/MCP/gateway
    settings remain on `xd.panes.settings.open`.
  - No registry schema, dispatcher, natural-language routing, provider
    credentials, OAuth execution, MCP config write, Action Inbox mutation,
    messenger delivery, profile write, or approval behavior changed.
- RED/GREEN:
  - `npx tsx --test src\shared\xenesisConnections.test.ts` failed 33/35 after
    the RED expectations because OAuth and provider profile draft aggregates
    still advertised `xd.panes.settings.open`.
  - After the metadata update, the same focused test passed 35/35 before and
    after formatting.
- Verification:
  - Scoped Biome format/check passed for `src/shared/xenesisConnections.ts` and
    `src/shared/xenesisConnections.test.ts`.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes connection metadata
    and tests, not registry schemas or dispatcher coverage.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Channel/Tool Status Natural Live Smoke Expansion Slice

- Continued the larger OpenClaw/Hermes coverage pass by broadening the
  repeatable Agent-pane natural Desk routing live smoke from 18 prompt cases to
  23 prompt cases.
- Added live-smoked read/status surfaces for:
  - External tool MCP install-draft catalog status:
    `xd.xenesis.tools.mcpInstallDrafts.status`.
  - External tool action-policy catalog status:
    `xd.xenesis.tools.actions.status`.
  - External channel safety catalog status:
    `xd.xenesis.channels.safety.status`.
  - External channel access-group catalog status:
    `xd.xenesis.channels.accessGroups.status`.
  - External channel pairing catalog status:
    `xd.xenesis.channels.pairing.status`.
- Scope boundary:
  - Smoke script/test coverage only.
  - No natural-language planner, CR schema, dispatcher, provider runtime,
    OAuth/install execution, messenger delivery, profile write, or Action Inbox
    mutation behavior changed.
- RED/GREEN:
  - Initial RED proved the live smoke script still exported the old 18-case
    prompt catalog while the test expected the expanded 23-case catalog.
  - First live smoke failed 67/69 because `외부 툴 MCP install draft catalog 상태
    보여줘` routed to `xd.xenesis.channels.profileDrafts.status`.
  - Root cause was prompt-wording collision: English `draft catalog` matched
    profile-draft readback routing before the intended MCP install-draft status
    route.
  - The MCP prompt was corrected to the existing deterministic Korean wording
    `외부 툴 MCP 설치 초안 전체 상태 보여줘`.
- Verification:
  - `npx tsx --test scripts\xenesisNaturalDeskRoutingLiveSmoke.test.mjs`
    passed 4/4 after the prompt catalog update and after the wording
    correction.
  - Scoped Biome format/check passed for the two smoke files.
  - `npm run smoke:xenesis:natural-desk-routing` passed 69/69.
  - `npm run typecheck` passed.
  - `git diff --check` passed with LF-to-CRLF working-copy warnings only.
  - CR audit was skipped because this slice only changes smoke scripts/tests;
    it does not change registry, dispatcher, runtime implementation, or shared
    route matching behavior.
- External documentation handling: no browsing. Use this cached note,
  `handoff.md`, source, and tests.

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Provider Model]]
- Relates to [[2026-06-27-xenesis-connection-center]]
