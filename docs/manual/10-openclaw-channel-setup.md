# OpenClaw-Style Channel Setup

This page maps OpenClaw-style channel setup concepts into the current Xenesis
Desk Connection Center. It is a repo-local guide for agents and operators. The
source of truth remains the code, Capability Registry paths, settings state, and
verification commands.

## Operating Model

Xenesis Desk treats external messengers as setup/readiness cards first. A card
can describe channel routing, access controls, pairing requirements,
troubleshooting signals, and user-story workflows before a runtime adapter is
available.

The implemented runtime channel set is:

- `telegram`
- `slack`
- `discord`
- `webhook`

The shared read model must keep that implemented set exact. These implemented
messengers expose channel template, setup plan, profile draft, routing, safety,
access-group, pairing, runtime readiness, user-story, and messenger-view
surfaces. Routing/session metadata is explicit state, including route binding,
session scope, fail-closed access groups, pairing state, runtime readiness,
read paths, control paths, and approval boundaries. It is not prompt keyword
routing.

Planned messenger cards, including WhatsApp, Signal, Microsoft Teams, Google
Chat, iMessage, Matrix, IRC, Mattermost, Nextcloud Talk, Nostr, Raft, Tlon,
Synology Chat, Twitch, LINE, WeChat, QQ Bot, Feishu/Lark, Yuanbao, Zalo, Email,
SMS, Home Assistant, ntfy, Rocket.Chat, and DingTalk/Dingding are planning
surfaces only until their adapters, credentials, allowlists, diagnostics, and
live verification exist.

Planned messengers such as `signal`, `google-chat`, and `zalo` remain
review/read surfaces only. They must not expose
`xd.xenesis.channels.profileDrafts.apply`,
`xd.xenesis.profiles.testChannel`, `xd.xenesis.profiles.updateChannels`,
`xd.xenesis.gateway.start`, or `xd.xenesis.gateway.restart`.

## Setup Order

1. Read the full Connection Center state with `xd.xenesis.connections.status`.
2. Read gateway status with `xd.xenesis.gateway.status`.
3. Inspect the channel setup plan with `xd.xenesis.channels.setupPlans.status`.
4. Open the channel setup plan with `xd.xenesis.channels.setupPlans.open`.
5. Open the messenger card with `xd.xenesis.messengers.views.open`.
6. Inspect the messenger setup view with `xd.xenesis.messengers.views.status`.
7. For implemented channels, inspect routing, safety, access groups, pairing,
   and runtime readiness readbacks.
8. For planned channels, inspect runtime readiness as a review-only adapter
   boundary before any delivery planning.
9. Record setup requests, runtime-readiness reviews, or profile draft review items only when the operator
   explicitly asks for review.
10. Run delivery tests only through the existing channel test paths after
   gateway and allowlist readiness are verified.

## CR Readbacks

Use these paths for channel setup and review:

- `xd.xenesis.messengers.views.status`
- `xd.xenesis.messengers.views.open`
- `xd.xenesis.channels.setupPlans.status`
- `xd.xenesis.channels.setupPlans.open`
- `xd.xenesis.channels.routing.status`
- `xd.xenesis.channels.safety.status`
- `xd.xenesis.channels.accessGroups.status`
- `xd.xenesis.channels.pairing.status`
- `xd.xenesis.channels.runtime.status`
- `xd.xenesis.channels.runtime.open`
- `xd.xenesis.channels.userStories.status`
- `xd.xenesis.channels.userStories.open`
- `xd.xenesis.connections.diagnostics.status`
- `xd.xenesis.connections.diagnostics.open`

Channel runtime-readiness review uses:

- `xd.xenesis.channels.runtime.request`

Implemented channel profile draft review uses:

- `xd.xenesis.channels.profileDrafts.status`
- `xd.xenesis.channels.profileDrafts.open`
- `xd.xenesis.channels.profileDrafts.request`

Channel setup plans collect messenger view, routing, safety, access group,
pairing, runtime-readiness, user-story, profile-draft, diagnostic, and
setup-request readbacks into one ordered plan. They are review-only
orchestration metadata. They do not start gateways, pair accounts or devices,
send messages, store credentials, mutate channel profiles, or bypass approval.
Implemented channels may reference the existing approval-gated profile
apply/test paths; planned channels remain review-only and do not expose
apply/test steps.
Settings can preview the same ordered plan through
`xd.automation.workflow.preview`. That preview contains only setup-plan
`read` and `open` steps; runtime requests, profile draft requests/applies, and
test-send paths stay as explicit separate CR actions. Setup preview does not
store secrets, mutate profile settings, start gateways, pair accounts or
devices, or send messages.

The guide catalog also exposes the concrete `connect-telegram` user-story
workflow guide. It opens this manual and focuses only read/open channel setup
surfaces:

- `xd.xenesis.gateway.status`
- `xd.xenesis.messengers.views.status`
- `xd.xenesis.channels.setupPlans.status`
- `xd.xenesis.channels.routing.status`
- `xd.xenesis.channels.safety.status`
- `xd.xenesis.channels.accessGroups.status`
- `xd.xenesis.channels.pairing.status`
- `xd.xenesis.channels.runtime.status`
- `xd.xenesis.channels.userStories.status`
- `xd.xenesis.channels.profileDrafts.status`

`connect-telegram` does not call channel profile apply, gateway lifecycle,
pairing creation, or `xd.xenesis.profiles.testChannel`. Those remain separate
approval-gated CR actions after readback evidence is ready.

Channel runtime readiness records adapter support, runtime status, gateway
requirement, readiness checks, read/control paths, diagnostics, blocked actions,
and safety boundaries. Implemented channels still require gateway, pairing,
allowlist, profile, and approval readbacks before delivery. Planned channels
report `planned-adapter` and remain review-only until a real adapter and live
verification exist.

Channel profile draft readbacks include review steps for credential readiness,
access/allowlist bindings, delivery guardrails, and pairing/readback checks.
The Settings Connection Center card renders these as `Review steps` with the
expected state, required fields, read/control paths, diagnostics, and safety
boundary for each phase.

Planned messenger profile review prompts should stay on the generic setup
request path:

- `xd.xenesis.connections.setupRequests.request`

## Safety Boundaries

This guide does not enable delivery, create channel adapters, start the gateway,
send messages, mutate allowlists, write profile settings, store secrets, or
bypass approvals. Planned messengers remain internal Desk setup/readiness views
until runtime support is implemented and verified.

## Slice 04 Task 1 Verification

- RED: `npx tsx --test src\shared\xenesisConnections.test.ts` failed as
  expected with 49 passed / 2 failed / 51 total before the shared aliases and
  setup-preview boundary text existed.
- GREEN: `npx tsx --test src\shared\xenesisConnections.test.ts` passed with
  51 passed / 0 failed / 51 total after the minimal shared read-model update.

## Slice 04 Implementation Evidence

Slice 04 extends the setup/readiness model into guarded channel controls and
verification harnesses. The shipped implementation remains CR-first and
approval-gated:

- Connection Center apply/test requests are available only for implemented
  messenger channels with ready drafts. They use the existing CR paths
  `xd.xenesis.channels.profileDrafts.apply` and
  `xd.xenesis.profiles.testChannel` with `approved=false`.
- Planned messenger channels stay review-only. They may expose runtime
  readiness review via `xd.xenesis.channels.runtime.request`, but must not
  expose delivery, profile mutation, gateway start/restart, or test-send paths.
- `xd.xenesis.profiles.install` uses the profile install schema
  `template/name/activate`; stale `config/makeActive` profile-install shapes
  are not part of the channel setup contract.
- Shared dispatcher tests prove read/open/request paths do not call profile
  apply, profile update, test-send, or gateway mutation helpers.
- Channel test-send errors are sanitized through
  `src/main/xenesisChannelSafety.ts`; tokens, webhook URLs, and raw target
  identifiers are redacted before user-facing output.
- `scripts/xenesisChannelApprovalLiveSmoke.mjs` covers pending and approved
  approval flows for webhook profile apply and test-send against a local
  loopback endpoint. It scrubs Telegram, Slack, Discord, webhook, and default
  channel delivery environment variables and uses only
  `XENESIS_SLICE04_WEBHOOK_URL` for the loopback target.
- `scripts/xenesisConnectionCenterLiveSmoke.mjs` includes Slice 04 snapshot
  baselines for implemented messenger cards, Telegram route/session metadata,
  Telegram access/pairing readiness, planned-channel boundaries, and
  test-send approval surfaces.
- `scripts/xenesisChannelNaturalLanguageLiveSmoke.mjs` uses a Korean natural
  prompt and requires provider raw CR/MCP evidence for Telegram-scoped
  `xd.xenesis.channels.routing.status` and
  `xd.xenesis.channels.runtime.status`. This proves the exact readback scope
  only; it is not a claim that all natural-language channel behavior is model
  reasoning.
- Final Slice 04 natural-language live evidence passed after a fresh build:
  `node .\scripts\xenesisChannelNaturalLanguageLiveSmoke.mjs --json` passed
  17/17 with provider `codex-app-server`, process model `persistent-process`,
  raw CR/MCP channel readback evidence present, deterministic recovery absent,
  provider web search absent, shell/command fallback absent, no profile
  mutation, and no test-send/delivery.

Live smoke scripts must be run only after a fresh `npm run build`, because the
Electron smoke harness uses built app artifacts.

## Natural Agent Prompts

Useful prompts should route through guide or messenger view CR paths, for
example:

- `오픈클로 채널 가이드 파일 열어줘`
- `왓츠앱 setup 상태 보여줘`
- `구글 챗 페어링 상태 보여줘`
- `구글 챗 runtime 상태 보여줘`
- `텔레그램 channel runtime 열어줘`
- `왓츠앱 runtime 검토 요청해줘`
- `외부 메신저 설정 플랜 전체 상태 보여줘`
- `텔레그램 채널 설정 플랜 열어줘`
- `텔레그램 채널 안전 상태 보여줘`
- `디스코드 access group 상태 보여줘`
