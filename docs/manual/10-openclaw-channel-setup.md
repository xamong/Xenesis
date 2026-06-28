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

- Telegram
- Slack
- Discord
- Webhook

Planned messenger cards, including WhatsApp, Signal, Microsoft Teams, Google
Chat, iMessage, Matrix, IRC, Mattermost, Nextcloud Talk, Nostr, Raft, Tlon,
Synology Chat, Twitch, LINE, WeChat, QQ Bot, Feishu/Lark, Yuanbao, Zalo, Email,
SMS, Home Assistant, ntfy, Rocket.Chat, and DingTalk/Dingding are planning
surfaces only until their adapters, credentials, allowlists, diagnostics, and
live verification exist.

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
