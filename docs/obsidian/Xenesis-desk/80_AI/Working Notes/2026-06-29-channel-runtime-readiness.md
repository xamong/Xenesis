# 2026-06-29 Channel Runtime Readiness

## Objective

Make external messenger channel runtime readiness a first-class Connection
Center and Capability Registry surface for implemented and planned channels,
without starting gateways, pairing accounts, mutating profiles, storing
credentials, or sending messages.

## Added Surface

- Shared read model: `channelRuntime`
- Detail focus: `channel-runtime`
- Messenger view section: `runtime`
- CR paths:
  - `xd.xenesis.channels.runtime.status`
  - `xd.xenesis.channels.runtime.open`
  - `xd.xenesis.channels.runtime.request`
- Action Inbox kind: `xenesis-channel-runtime-readiness`

## Runtime Readiness Fields

- Runtime support: `implemented` or `planned-adapter`
- Runtime status: `ready`, `needs-setup`, `unknown`, or `planned-adapter`
- Adapter id, channel id, and display name
- Gateway requirement
- Readiness checks
- CR read/control paths
- Diagnostics
- Blocked actions
- Safety boundaries

## Safety Boundary

Runtime readiness is a review/read/open surface. It does not start gateways,
create adapters, pair accounts or devices, mutate channel profiles, update
allowlists, store secrets, send messages, or bypass approvals.

Implemented channels still require gateway, allowlist, pairing, profile, and
approval readbacks before delivery. Planned channels report `planned-adapter`
and remain review-only until a real adapter and live verification exist.

## Natural Prompts

- `구글 챗 runtime 상태 보여줘`
- `텔레그램 channel runtime 열어줘`
- `왓츠앱 runtime 검토 요청해줘`

These route to the channel runtime status/open/request CR paths. Generic
messenger setup prompts remain on messenger view or setup-plan paths.

## Graph Links

- Touches [[module-capability-registry]]
- Touches [[module-xenesis-agent-pane]]
- Touches [[module-provider-runtime]]
- Relates to [[Capability Registry Architecture]]
- Relates to [[Approval Flow]]

## Verification

- RED before implementation:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - 194 tests executed, 181 passed, 13 failed as expected.
- GREEN after implementation:
  - `npx tsx --test src\shared\xenesisConnections.test.ts src\shared\xenesisConnectionCapabilities.test.ts src\renderer\panes\xenesisConnectionCenter.test.ts src\renderer\extensions\xenesis-desk.core-tools\panes\xenesisAgentDeskControl.test.ts`
  - 194/194 passed.
- Broad final checks:
  - `npm run docs:capabilities:audit` passed; audit summary is 792 nodes and
    689 coverage path references.
  - CR audit counters are all 0: missing registered paths, missing dispatched
    coverage paths, undispatched static callable methods, and dispatcher paths
    missing from tree.
  - `npm run build` passed.
  - `npm run smoke:xenesis:natural-desk-routing` passed 246/246.
  - Formatter-only Biome check passed on changed source/script files after
    formatting three touched files.
  - `npm run typecheck` passed after formatting.
  - `git diff --check` passed with LF/CRLF normalization warnings only.
  - `npm run check:public-release` remains blocked by missing
    `.github/workflows/ci.yml` in this worktree.

## Next Step

Review final diff/status and commit the channel runtime readiness slice.
