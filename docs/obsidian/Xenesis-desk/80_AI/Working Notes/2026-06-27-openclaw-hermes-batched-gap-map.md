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

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Provider Model]]
- Relates to [[2026-06-27-xenesis-connection-center]]
