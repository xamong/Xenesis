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

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Provider Model]]
- Relates to [[2026-06-27-xenesis-connection-center]]
