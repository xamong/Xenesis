---
type: agent-handoff
repo: xenesis-desk
status: draft
risk: high
ai_edit_policy: direct_edit_allowed
ai_generated: true
reviewed: false
confidence: medium
last_reviewed: 2026-06-29
depends_on:
  - "[[Final Goal]]"
  - "[[Source of Truth Map]]"
  - "[[Capability Registry Architecture]]"
  - "[[Xenesis Agent Runtime]]"
  - "[[Provider Model]]"
  - "[[Approval Flow]]"
touches:
  - "handoff.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-final-goal-slice-spec-index.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-reference-driven-final-goal-slices.md"
  - "docs/obsidian/Xenesis-desk/80_AI/Working Notes/2026-06-29-slice-1-live-cr-baseline-plan.md"
---

# Final Goal Overall Spec

## 목적

이 spec은 Xenesis Desk의 남은 최종 목표 작업을 시작하기 전에 고정하는
상위 계약이다. 이후의 모든 slice plan과 구현은 이 문서의 범위, 완료
조건, 검증 방식, 금지 조건을 만족해야 한다.

핵심 목표는 Xenesis Desk를 에이전트가 실제 데스크톱 워크벤치처럼 사용할
수 있는 CR-first 제품으로 완성하는 것이다. 사용자는 자연어로 목표를 말하고,
선택된 provider가 Desk Capability Registry를 통해 파일, 터미널, 브라우저,
설정, 외부 도구, 외부 메신저, 승인 기록, 진단 표면을 조작하거나 읽을 수
있어야 한다.

## Source Of Truth

실행 가능한 진실은 Git repo의 코드, 테스트, 생성된 CR 문서, 검증 명령이다.
Obsidian vault는 탐색과 설계 의도, 리스크, handoff를 위한 지식그래프이다.

참조 우선순위:

1. Repo source, tests, generated CR docs, live smoke output.
2. `docs/obsidian` repo-local vault.
3. `F:\agent-anal\analysis` OpenClaw/Hermes reference analysis.
4. `F:\agent-anal\openclaw-main` and `F:\agent-anal\hermes-agent-main` original source.

외부 웹 검색은 이 spec 범위의 기본 작업이 아니다. 최신 외부 서비스 정책,
OAuth 화면, vendor API 변화가 구현을 막을 때만 사용자가 명시적으로 요청한
경우에 한해 별도 기록 후 수행한다.

## Product End State

사용자가 기대하는 최종 상태:

- Agent pane에서 자연어로 "provider 상태 확인", "Notion 연결 준비",
  "Google Calendar OAuth 준비", "Telegram/Discord 채널 연결", "현재 설정
  문제 진단" 같은 작업을 요청할 수 있다.
- Provider는 사용자 설정 또는 active `~/.xenis` profile에 의해 선택된다.
  hardcoded provider fallback이나 keyed provider의 silent fallback은 없다.
- 외부 툴과 외부 메신저 연결은 Settings > Xenesis Agent > Connections에서
  상태, 요구 credential, readback, 승인 경계, blocked action, guide, workflow
  preview를 볼 수 있다.
- 승인 필요한 동작은 채팅 텍스트가 아니라 실제 CR approval/action inbox
  record를 생성하고 Agent pane inline approval card로 해결된다.
- 모든 중요한 작업은 CR path, status readback, live evidence, handoff,
  Obsidian note 중 하나 이상으로 추적된다.
- Obsidian 지식그래프만 읽어도 "무엇이 목표인지", "어떤 module이 owner인지",
  "어떤 CR path가 관련되는지", "무엇을 검증해야 하는지"를 알 수 있다.

## Non-Goals

이번 최종 목표 spec에 포함하지 않는 것:

- Deterministic natural-language keyword router, intent catalog, prompt
  heuristic router 재도입.
- Provider별 one-off CR implementation.
- Slash command 또는 fenced `xenesis-desk-action` smoke를 자연어 reasoning
  검증으로 포장하는 것.
- 외부 서비스 실제 토큰 발급, 실제 Google/Notion/Telegram 계정 mutation을
  테스트 기본값으로 요구하는 것.
- OpenClaw/Hermes 코드를 그대로 복사해 Xenesis 구조를 우회하는 것.
- 대규모 범용 agent gap 전체 해결. 이미지 블록, semantic memory, hook SDK,
  remote sandbox 같은 큰 레퍼런스 갭은 현재 Desk setup/control goal을 직접
  막을 때만 별도 slice로 승격한다.

## System Principles

- CR-first: Desk behavior는 CR discovery, inspect, generic call, dispatcher,
  approval, audit, readback으로 연결된다.
- Provider-selected: reasoning provider는 user settings/profile이 정한다.
- Natural-language honest: 자연어는 provider가 처리한다. 로컬 deterministic
  fast path는 slash commands와 explicit fenced `xenesis-desk-action`만 허용한다.
- Approval-real: approval-required action은 `approved=false` CR call로 실제
  approval record를 만든다.
- Reference-adapted: OpenClaw/Hermes의 패턴은 source 확인 후 Xenesis 구조에
  맞게 차용한다.
- Evidence-before-claim: 완료 주장은 focused tests, CR audit, typecheck,
  build, live Agent/Connection smoke 중 관련 gate가 통과한 범위로만 한다.

## Functional Requirements

### FR-01 CR Coverage And Baseline

CR registry, dispatcher, generated audit docs, smoke scripts가 서로 어긋나지
않아야 한다.

Acceptance:

- `npm run docs:capabilities:audit` passes.
- Audit counters are all 0:
  `Missing registered paths`, `Missing dispatched coverage paths`,
  `Undispatched static callable methods`, `Dispatcher paths missing from tree`.
- Any typed wrapper used for convenience maps back to CR behavior.
- Live smoke reports exact check ids rather than vague success text.

### FR-02 Provider Setup And First-Run Onboarding

Provider setup must be visible and reviewable before the first Agent task.

Acceptance:

- Active provider, model, auth mode, credential state, runtime profile,
  fallback policy, and local CLI boundary are exposed through CR-backed
  status/readback.
- Settings UI exposes provider profile draft and setup plan as reviewable
  surfaces.
- Keyed provider without credentials returns honest credential error rather
  than silent fallback.
- Non-BYOK Codex path prefers `codex-app-server` persistent process and uses
  `codex-cli` only as explicit or startup-failure fallback.
- Live Agent verification records footer/work-log provider evidence before
  claiming provider CR behavior.

### FR-03 External Tool Connections

External tools such as Notion, Google Calendar, Linear, and future MCP-backed
tools must be represented as CR-backed connection items.

Acceptance:

- Each tool has connection status, setup plan, connector status, runtime
  readiness, profile draft or OAuth draft, safety boundaries, blocked actions,
  readback paths, and control paths.
- Notion env-token MCP path does not expose token values and blocks provider
  tool execution until runtime readback is ready.
- Google Calendar OAuth path exposes review-only setup packet, credential refs,
  scopes, token-store readiness, and blocked OAuth actions.
- OAuth/setup packets never complete OAuth, store tokens, write MCP config, or
  execute provider tools during readback or preview.
- CR workflow preview for tool setup and user stories is read/open only.

### FR-04 External Messenger And Channel Control

External messenger channels must use stable profiles, route bindings, access
groups, runtime readiness, and approval-gated test-send or setup actions.

Acceptance:

- Telegram/Discord or equivalent implemented channels expose channel setup plan,
  profile draft, routing, safety, access group, pairing, runtime readiness, and
  user-story surfaces.
- Route/session behavior borrows OpenClaw-style stable session key and allowlist
  ideas, adapted into Xenesis `xd.xenesis.channels.*` CR surfaces.
- Test-send and profile apply paths are approval-gated and sanitized.
- No natural-language keyword router decides message target. Provider reasoning
  must call CR/MCP tools or use explicit structured paths.

### FR-05 Approval And Action Inbox

Approval-required behavior must create and resolve actual approval records.

Acceptance:

- `approved=false` on approval-required CR paths creates a real approval record.
- Agent pane renders inline approval controls for the current chat context.
- Action Inbox remains an audit/backstop surface, not the primary user path.
- Normal user-facing responses do not leak `actionInboxItem.id`, raw CR args,
  raw approval payloads, or internal session keys unless diagnostics are
  explicitly requested.
- Live approval smoke proves pending, approved, and review-item readback.

### FR-06 User Stories, Guides, And Workflow Preview

Guides and user-story contracts must bridge user intent to CR-backed workflows
without executing unsafe actions.

Acceptance:

- Manual docs cover onboarding, OpenClaw channel setup, external tool
  integrations, and Agent user stories.
- User-story contracts expose open path, readback paths, approval boundaries,
  completion evidence, safety boundary, and workflow preview metadata.
- Workflow preview steps are read/open only and use `approved=false`.
- Preview does not run provider tools, send messages, mutate external systems,
  store tokens, write MCP config, or bypass approvals.

### FR-07 Obsidian Knowledge Graph

The repo-local Obsidian graph must represent the final goal, module ownership,
CR surface, verification map, high-risk areas, reference adoption, and active
handoffs.

Acceptance:

- `docs/obsidian/Xenesis-desk.md` links to final goal, source of truth,
  architecture, module, CR surface, verification, and task notes.
- Working notes link this overall spec, slice plans, reference adoption map,
  and implementation handoffs.
- Canonical architecture/module notes are updated only when a plan is approved
  or the change has been verified.
- If Obsidian and code disagree, code wins and the mismatch is recorded in
  `handoff.md` or a working note.

## Reference Adoption Requirements

Each implementation slice must include a reference adoption record:

| Field | Required content |
|---|---|
| Reference analysis | Exact analysis note path under `F:\agent-anal\analysis`, such as `F:\agent-anal\analysis\openclaw-main\12-channels-routing.md`. |
| Original source checked | Exact source files under `F:\agent-anal\openclaw-main` or `F:\agent-anal\hermes-agent-main`. |
| Borrowed pattern | Behavior or verification idea being adapted. |
| Xenesis adaptation | CR path, renderer surface, provider/runtime boundary, approval model, and readback. |
| Rejected behavior | Anything not ported, especially prompt keyword routing or chat-only approval. |
| Verification | Focused tests, CR audit, live smoke, or manual live prompt evidence. |

Initial source anchors:

- OpenClaw channels:
  `F:\agent-anal\openclaw-main\src\routing\resolve-route.ts`,
  `F:\agent-anal\openclaw-main\src\routing\session-key.ts`,
  `F:\agent-anal\openclaw-main\src\channels\allowlist-match.ts`,
  `F:\agent-anal\openclaw-main\extensions\telegram\src\conversation-route.ts`.
- Hermes gateway/UI:
  `F:\agent-anal\hermes-agent-main\tui_gateway\server.py`,
  `F:\agent-anal\hermes-agent-main\tui_gateway\ws.py`,
  `F:\agent-anal\hermes-agent-main\apps\desktop\electron\main.cjs`.
- MCP/provider references are selected per slice from:
  `F:\agent-anal\analysis\openclaw-main\06-mcp-integration.md`,
  `F:\agent-anal\analysis\openclaw-main\05-provider-extensions.md`,
  `F:\agent-anal\analysis\hermes-agent-main\07-mcp-integration.md`,
  `F:\agent-anal\analysis\hermes-agent-main\03-llm-provider-abstraction.md`.

## Verification Contract

Use the narrowest relevant checks first, then broaden before the slice commit.

Baseline CR and connection checks:

```powershell
npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts
npx tsx --test src\shared\xenesisConnections.test.ts
npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts
npm run docs:capabilities:audit
```

Provider/runtime checks:

```powershell
npm --prefix packages/xenesis exec vitest run src/providers/cliProvider.deskMcp.test.ts src/core/AgentRuntimeFactory.modeMessages.test.ts src/core/AgentRunPipeline.noHeuristicRouting.test.ts
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
npm --prefix packages/xenesis run typecheck
```

Build and broad checks:

```powershell
npm run typecheck
npm --prefix packages/xenesis test
npm --prefix packages/xenesis run build
npm run build
git diff --check
```

Live evidence checks:

```powershell
npm run smoke:xenesis:connection-center -- --json
npm run smoke:xenesis:review-request-approval -- --json
```

Natural-language provider CR proof requires an additional live Agent pane prompt
that records:

- exact prompt text,
- visible footer/work-log provider,
- evidence that the provider called `desk_call_capability` or
  `xenesis_desk_call_capability`,
- CR readback result or approval record,
- date and command/smoke marker.

## Slice Model

The implementation can use large slices, but each slice must have a concrete
internal spec before product code edits.

| Slice | Purpose | Exit criteria |
|---|---|---|
| 0. Overall spec | Lock this product/technical contract. | This note exists, downstream plans depend on it, handoff records the pivot. |
| 1. Live CR baseline and reference map | Prove current CR-backed surfaces and create reference adoption map. | Live smokes pass or exact known gap recorded; `[[Reference Adoption Map]]` drafted. |
| 2. Provider and onboarding | Finish first-run provider setup/readback/workflow preview. | Provider setup status and live provider evidence are verified. |
| 3. External tools and MCP/OAuth | Finish Notion/env-token and Google Calendar/OAuth review paths. | Tool status/readback/profile/OAuth drafts and preview paths verified. |
| 4. External messengers and channels | Finish channel setup/profile/routing/runtime/test-send surfaces. | Channel CR readback and approval-gated test-send verified. |
| 5. User stories and guides | Connect practical user workflows to guides and preview-only CR workflows. | Manual docs, user-story contracts, and preview tests pass. |
| 6. Graph and release hardening | Update Obsidian graph, audit docs, release checks, and handoff. | CR audit counters 0, graph links complete, live evidence recorded. |

The concrete per-slice scope contracts are indexed in
[[Final Goal Slice Spec Index]].

## Definition Of Done

A slice is done only when all relevant conditions are true:

- `handoff.md` has objective, touched files, commands, exact results, gaps, next
  step.
- Relevant Obsidian working note or canonical note is updated.
- Focused tests pass.
- CR audit passes with all gap counters 0 if CR surfaces changed.
- Typecheck passes for touched packages.
- Build passes when Electron live smoke or package dist is involved.
- Live smoke or manual live Agent prompt passes when Agent/CR/provider/approval
  behavior changed.
- Final summary states exactly what was verified and does not claim unverified
  natural-language behavior.

## Downstream Plans

The following documents are downstream of this spec and must be treated as draft
implementation plans until this overall spec is accepted:

- `docs/superpowers/plans/2026-06-29-xenesis-reference-driven-final-goal-slices.md`
- `docs/superpowers/plans/2026-06-29-slice-1-live-cr-baseline-reference-map.md`
- `[[Final Goal Slice Spec Index]]`
- `[[Slice Spec 01 Live CR Baseline]]`
- `[[Slice Spec 02 Provider Onboarding]]`
- `[[Slice Spec 03 External Tools MCP OAuth]]`
- `[[Slice Spec 04 Messenger Channels]]`
- `[[Slice Spec 05 User Stories Guides]]`
- `[[Slice Spec 06 Graph Release Hardening]]`
- `[[Reference-Driven Final Goal Slices]]`
- `[[Slice 1 Live CR Baseline Plan]]`

## Graph Links

- Depends on [[Final Goal]]
- Depends on [[Source of Truth Map]]
- Depends on [[Capability Registry Architecture]]
- Depends on [[Xenesis Agent Runtime]]
- Depends on [[Provider Model]]
- Depends on [[Approval Flow]]
- Guides [[Final Goal Slice Spec Index]]
- Guides [[Reference-Driven Final Goal Slices]]
- Guides [[Slice 1 Live CR Baseline Plan]]
