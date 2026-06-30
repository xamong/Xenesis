# Xenesis Desk

GitHub 저장소: <https://github.com/xamong/xenesis-desk>

[English](README.md) | [GitHub 커뮤니티](#github-커뮤니티)

> AI 에이전트가 보고, 클릭하고, 입력하고, 터미널을 실행하고, 작업 중에 실시간 UI를 렌더링하는 데스크톱입니다.

대부분의 에이전트 제품은 채팅에서 멈춥니다. Xenesis Desk는 에이전트에게 작업대를 줍니다. 5구역 데스크톱, 터미널, 파일, 뷰어, 패널, 승인 UI, MCP 도구, 실시간 UI 렌더링을 한 화면에서 다룹니다. Claude, Codex, Gemini, Cursor, Copilot, Hermes 같은 외부 에이전트도 같은 Capability Registry를 통해 같은 Desk를 제어할 수 있습니다.

에이전트의 답변은 텍스트로 끝날 필요가 없습니다. **거울이(Gowoori)** 와 **XCON**을 통하면 답변이 차트, 테이블, 지도, 네트워크 다이어그램, 대시보드, 워크플로우 화면으로 실시간 렌더링됩니다.

## 무엇이 다른가

| 아이디어 | 의미 |
|---|---|
| 에이전트 작업대 | 에이전트가 단순 프롬프트 박스가 아니라 터미널, 파일, 패널, 뷰어, 앱 제어 권한을 갖습니다. |
| 공유 제어면 | MCP, provider skill, workflow, 내장 Xenesis runtime이 모두 같은 `xd.*` Capability Registry를 호출합니다. |
| UI가 되는 답변 | LLM 출력이 Markdown 텍스트나 정적 이미지가 아니라 XCON/Gowoori UI로 렌더링됩니다. |
| 원격 CLI 운용 | Codex, Claude Code 같은 터미널 에이전트를 gateway channel에서 감시하고 제어할 수 있습니다. |
| 데이터 바인딩 workflow | XCON fixture, chain, sketch, workflow action으로 생성된 대시보드가 데이터 변경을 따라 살아 움직입니다. |

## 먼저 해볼 것

1. `npm install`과 `npm run dev`로 개발 앱을 실행합니다.
2. `설정 > AI Provider`에서 로컬 CLI agent용 MCP/Skill 프로필을 설치합니다.
3. 외부 agent에게 MCP bridge 또는 `/xd` skill로 Desk 상태를 확인하게 합니다.
4. Gowoori/XCON Markdown을 생성해 채팅 안에서 대시보드가 UI로 렌더링되는지 확인합니다.

상태: **얼리 알파(Early alpha)** 입니다. Xenesis Desk는 실험, 데모, 통합 작업에는 이미 유용하지만 public API, 패키징 형태, provider 설치 흐름, UI workflow는 아직 빠르게 바뀌고 있습니다. 적극적인 커뮤니티 참여를 기대합니다. 직접 써보고, 깨뜨려 보고, issue를 열고, demo를 제안하고, 문서를 개선하고, provider integration을 추가해 주세요. **PR을 환영합니다**, 특히 재현 절차나 release-check coverage가 분명한 작고 집중된 PR을 선호합니다.

이 저장소는 데스크톱 셸, 내장 Xenesis sidecar runtime, MCP 브릿지, 샘플 확장, 선별된 provider 통합 자산을 함께 포함합니다.

---

## 핵심 아이디어

### 작업대를 가진 AI 에이전트

Xenesis는 사람을 위한 도구가 아닙니다 — 작업대를 가진 AI 에이전트입니다. 터미널, 파일 탐색기, 뷰어, 패널은 에이전트가 작업을 수행하기 위해 사용하는 도구입니다.

### 다른 에이전트와 공유하는 작업대

어떤 외부 AI 에이전트든 Capability Registry(현재 알파 기준 공개 650+개 노드, 390+개 호출 가능 메소드)를 통해 같은 Desk를 제어할 수 있습니다. MCP, HTTP 브릿지, 프로바이더 스킬로 연결하면 — Claude, Codex, Gemini, Cursor, Copilot, Hermes 모두 같은 프로토콜을 씁니다.

### AI가 텍스트가 아닌 UI로 응답

거울이(Gowoori)가 LLM 출력을 실제 렌더링되는 UI로 바꿉니다. AI가 마크다운에 `xcon-sketch` 펜스를 넣으면, 뷰어가 차트, 테이블, 지도, 대시보드를 렌더링합니다 — 응답이 완성되기 전에도 토큰이 도착하는 대로 실시간으로 스트리밍 렌더링됩니다.

### 데이터 바인딩 UI 자동화

XCON은 네 개 레이어로 관심사를 분리합니다:

| 레이어 | 펜스 | 역할 |
|---|---|---|
| **Fixture** | `` ```xcon-chain-fixture `` | 원본 데이터 (JSON) |
| **Chain** | `` ```xcon-chain as alias `` | 데이터 변환 (SUGAR 식) |
| **Sketch** | `` ```xcon-sketch `` | UI 레이아웃 (`$alias` 참조) |
| **Workflow** | `` ```xcon-workflow `` | 자동화 액션 |

fixture를 바꾸면 UI가 자동으로 갱신됩니다. AI가 대시보드를 한 번 설계하면, Desk가 살아 있게 유지합니다.

### 원격 CLI 제어

Xenesis Gateway + 터미널 스트림 필터로 스마트폰에서 Codex나 Claude Code를 조작할 수 있습니다. 스트림 필터가 CLI 크롬(진행 표시, 도구 호출, 내부 라인)을 걸러내고 의미 있는 내러티브만 추출합니다. 안전 레이어가 위험한 명령을 차단하고, LLM 엔진이 안전한 프롬프트에 자동 응답합니다.

### 필요할 때 즉시 생성되는 대시보드

미리 만들어 둔 대시보드가 필요 없습니다. 상황이 발생하면, AI가 그 맥락에 맞는 대시보드를 그 자리에서 생성합니다 — NOC에서, 회의실에서, 교실에서, 1인 스타트업에서. 대시보드는 자산이 아니라 에이전트의 응답입니다.

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 앱 셸 | Electron 41 |
| UI | React 19 + Vite 7 + electron-vite 5 + TypeScript 5.9 |
| 터미널 | @xterm/xterm 6 + @lydell/node-pty (ConPTY) |
| 코드 편집기 | CodeMirror 6 (react-codemirror) |
| 그리드 | SpanGrid (Canvas 기반 고성능 그리드) |
| XCON 렌더링 | @xcon-viewer/core + @xcon-viewer/viewer |
| 에이전트 런타임 | Xenesis (packages/xenesis) — 프로바이더, 도구, 워크플로우, 세션, 채널 |
| MCP | @modelcontextprotocol/sdk (stdio 서버 + HTTP 브릿지) |
| 내부 서버 | Node.js + Express + better-sqlite3 |
| 패키징 | electron-builder 26 (NSIS + portable) |

---

## 프로젝트 구조

```
xenesis-desk/
├── src/
│   ├── main/                        Electron 메인 프로세스
│   │   ├── index.ts                 PTY, IPC, MCP 브릿지, 서비스
│   │   └── automation/              터미널 자동화 엔진
│   │       ├── automationController.ts  스트림 감시 + 자동 입력
│   │       ├── streamFilters/       CLI별 필터 (codex, claude, gemini)
│   │       ├── llmEngine.ts         LLM 기반 안전 자동 응답
│   │       └── safety.ts            위험 명령 감지
│   ├── preload/                     Electron contextBridge
│   ├── shared/
│   │   ├── types.ts                 공유 IPC 타입
│   │   └── deskBridgeCapabilities.ts  Capability Registry (공개 650+개 노드)
│   └── renderer/
│       ├── App.tsx                  루트 컴포넌트
│       ├── dock/                    5구역 도킹 엔진
│       ├── terminal/                xterm 호스트 + 커맨드 스토어
│       ├── markdown/                스트리밍 XCON 마크다운 렌더러
│       ├── panes/                   내장 패널 (16종)
│       └── extensions/
│           ├── xenesis-desk.core-tools/    AI 채팅, Xenesis Agent, Bot,
│           │                               Capability Explorer, Hermes 패널
│           ├── xenesis-desk.data-tools/    메타 관리, 쿼리 분석기
│           └── xenesis-desk.workflow-runner/
│               ├── panes/           Workflow Runner, Demo Lab
│               └── gowoori/         AI→UI 파이프라인
│                   ├── agent/       의도 라우터, 프롬프트 팩,
│                   │                아티팩트 파이프라인, 검증,
│                   │                자동 수정, 수용 게이트
│                   ├── chat/        GowooriChat UI
│                   └── viewer/      아티팩트 프리뷰 + 글로벌 오버레이
├── packages/
│   ├── xenesis/                     Xenesis 에이전트 런타임
│   │   └── src/
│   │       ├── core/                AgentRunner (턴 루프), 파이프라인, 이벤트
│   │       ├── providers/           LLM 프로바이더 (OpenAI, Anthropic, CLI, mock)
│   │       ├── tools/               50+ 에이전트 도구 (파일, 셸, 브라우저,
│   │       │                        Desk 브릿지, 검색, 진단...)
│   │       ├── channels/            텔레그램, 디스코드, 슬랙, 웹훅 어댑터
│   │       ├── gateway/             HTTP 게이트웨이 서버 + 대시보드
│   │       ├── orchestration/       태스크 스케줄러, 워커, 에이전트 태스크
│   │       ├── workflows/           워크플로우 엔진 + 정책
│   │       ├── extensions/          메모리, 서브에이전트, 스킬, 플러그인, MCP
│   │       ├── sessions/            JSONL 세션 기록
│   │       └── evaluation/          역량 평가 + 피드백 루프
│   └── xenesis-agent-core/          Desk 임베디드 런타임 브릿지
├── extensions/                      샘플 확장 매니페스트 (plugin.json + main.js)
│   └── sample.*/                    개발자용 샘플 확장
├── mcp/
│   ├── xenesis-desk-mcp-server.mjs  MCP stdio 서버
│   ├── xenesis-desk-file-safety.mjs 안전한 파일 쓰기 (미리보기/적용/복원)
│   ├── playwright-worker.mjs        Playwright 스크린샷/액션 워커
│   └── prompts/                     XCON 생성 프롬프트 팩
├── providers/                       프로바이더 통합 자산
│   ├── shared/skills/xd/            스킬 템플릿 (소스 오브 트루스)
│   ├── claude/codex/cursor/...      생성된 스킬 파일 (11개 CLI 에이전트)
│   └── hermes/plugins/              Hermes 게이트웨이 + 봇 플러그인 (Python)
├── server/                          내장 SQLite API 서버
└── scripts/                         개발, 빌드, 릴리즈, registry 보조 스크립트
```

---

## 시작하기

### 요구사항

| 항목 | 요구사항 |
|---|---|
| OS | Windows 10 1809+ / Windows 11 / macOS / Linux |
| Node.js | 22.12 이상 |
| npm | 10 이상 |
| C++ 빌드 도구 | `better-sqlite3` 컴파일 시 필요 (Windows: Visual Studio Build Tools 2022) |

### 개발 환경 실행

```bash
npm install
npm run dev
```

플랫폼 스크립트를 사용하면 내부 SQLite 서버도 함께 시작됩니다:

```powershell
# Windows
npm run dev

# 스크립트가 npm install, 서버 설정,
# 네이티브 모듈 리빌드, electron-vite dev를 처리합니다.
```

### 빌드

```bash
npm run build                  # 타입 체크 + 프로덕션 빌드
npm run pack:win               # Windows 언패키지 빌드
npm run dist:win               # Windows 인스톨러 (NSIS + portable)
npm run dist:mac               # macOS 빌드 (dmg + zip)
npm run check:docs-public      # 공개 문서의 로컬 경로/토큰 패턴 검사
npm run check:public-release   # 공개 소스 경계 검사
npm run check:public-release:ci
```

---

## 문서 맵

| 주제 | 문서 |
|---|---|
| 전체 사용자 매뉴얼 | [docs/manual/README.md](docs/manual/README.md) |
| Agent와 CR/MCP | [docs/manual/03-xenesis-agent.md](docs/manual/03-xenesis-agent.md), [docs/manual/05-cr-mcp-gateway-bots.md](docs/manual/05-cr-mcp-gateway-bots.md) |
| Provider와 연결 설정 | [docs/manual/09-onboarding-connections.md](docs/manual/09-onboarding-connections.md), [docs/manual/11-external-tool-integrations.md](docs/manual/11-external-tool-integrations.md) |
| Messenger 채널 | [docs/manual/10-openclaw-channel-setup.md](docs/manual/10-openclaw-channel-setup.md) |
| Capability Registry 감사 | [docs/capability-registry-audit.md](docs/capability-registry-audit.md) |

## 스크립트 구성

커밋되는 `scripts/` 루트 스크립트는 앱 실행, 패키징, provider 동기화, capability 문서 생성, 공개 릴리즈 검사, 런타임 브릿지 helper 용도입니다. 유지보수자 전용 smoke test와 단계별 demo runner는 공개 npm script 표면에서 제외하므로, `package.json`은 ignored local test/demo 폴더에 의존하지 않아야 합니다.

---

## Capability Registry

Xenesis Desk의 모든 제어 가능한 기능은 `xd.terminals.run`, `xd.files.open`, `xd.capture.pane` 같은 안정적인 트리 경로로 노출됩니다.

이 레지스트리는 MCP 브릿지, 에이전트 도구, 워크플로우 러너, 승인 UI, CLI 단축키, 외부 에이전트가 공유하는 계약입니다.

```ts
// 역량 조회
await deskBridge.describe('xd.terminals.run');

// 역량 호출
await deskBridge.call('xd.terminals.run', {
  command: 'npm test',
  shell: 'powershell'
}, { approved: true });

// 역량 검색
await deskBridge.query({ kind: 'method', permission: 'read' });
```

최상위 네임스페이스에는 `xd.app`, `xd.workspace`, `xd.window`, `xd.dock`, `xd.terminals`, `xd.files`, `xd.fs`, `xd.remoteFiles`, `xd.extensions`, `xd.settings`, `xd.capture`, `xd.diagnostics`, `xd.mcp`, `xd.gowoori`, `xd.xenesis`, `xd.services`, `xd.automation`, `xd.artifacts`, `xd.playwright`, `xd.xcon`, `xd.audit`, `xd.control`, `xd.meta` 등이 포함됩니다.

---

## MCP 연동

번들된 MCP 서버는 외부 AI 에이전트에 Desk 제어 도구를 노출합니다:

```json
{
  "mcpServers": {
    "xenesis-desk": {
      "command": "node",
      "args": ["path/to/mcp/xenesis-desk-mcp-server.mjs"]
    }
  }
}
```

도구에는 `xenesis_desk_state`, `xenesis_desk_terminal_run`, `xenesis_desk_call_capability`, `xenesis_desk_playwright_snapshot`, `xenesis_desk_create_xcon_markdown` 등이 포함됩니다.

서버는 또한 XCON 생성 프롬프트를 MCP 리소스 및 프롬프트 템플릿으로 노출합니다.

---

## XCON Viewer 연동

어떤 LLM 프로바이더든 `@xcon-viewer/core`와 `@xcon-viewer/viewer`를 연결하면 채팅 UI에서 UI를 렌더링할 수 있습니다:

```js
import { parseBySyntax } from '@xcon-viewer/core';
import { render, viewerCss } from '@xcon-viewer/viewer';
```

마크다운 렌더러가 `xcon-sketch` 펜스를 만나면, 코드 블록 대신 실제 UI 컴포넌트로 렌더링합니다. 스트리밍 렌더링을 지원합니다 — 토큰이 도착하는 대로 UI가 점진적으로 조립됩니다.

---

## 프로바이더 스킬

`providers/` 폴더는 11개 CLI 에이전트와 Hermes 모바일 게이트웨이를 위한 Xenesis Desk 통합 자산을 담고 있습니다:

| 프로바이더 | 통합 방식 |
|---|---|
| Claude Code, Codex, Cursor, Gemini, GitHub Copilot, Kimi, OpenCode, Pi, Qoder, Qwen, Devin | 생성된 스킬 파일 (`/xd` 슬래시 커맨드) |
| Hermes | Python 플러그인 (`xenesis_desk_gateway` + `xenesis_desk_bot` 플랫폼 어댑터) |
| Xenesis Gateway E2E | Telegram, Discord, Slack, Xenesis Bot 흐름을 검증하는 로컬 브라우저 시뮬레이터 |

모든 프로바이더가 같은 Capability Registry를 통해 같은 Desk를 제어합니다.

## 설정 화면

Xenesis Desk는 기본 Desk agent 설정과 외부 provider 설정을 분리합니다:

- **설정 > Xenesis Agent**: 네이티브 Xenesis Agent runtime, managed gateway, 외부 bot channel, Gowoori agent tool 설정.
- **설정 > AI Provider**: Hermes Plug-in, Local CLI, BYOK provider profile. Phase 5 XamongCode 화면은 `XENIS_PHASE_5=true` 또는 대응 전역 설정이 켜진 경우에만 보입니다.

---

## 터미널 자동화

자동화 엔진은 터미널 출력 스트림을 감시하고 지능적인 자동 응답을 제공합니다:

- Codex, Claude Code, Gemini용 **스트림 필터**가 내부 진행 라인을 걸러내고 의미 있는 내러티브를 추출
- **안전 레이어**가 위험 패턴 차단 (`rm -rf`, `drop database`, 자격 증명 접근)
- **LLM 엔진**이 안전한 프롬프트에 자동 응답 (y/n 확인, 옵션 선택)
- 규칙 기반 자동화를 위한 **정규식 및 상태 머신 엔진**

Xenesis Gateway 및 채널 어댑터(텔레그램, 디스코드, 슬랙)와 결합하면 CLI 에이전트의 모바일 수준 원격 제어가 가능합니다. 외부 채널은 해당 대화방이 명시적으로 `/desk watch`를 실행한 뒤에만 터미널 스트림을 받습니다. 필터링되지 않은 stream mode는 noisy하거나 unsafe한 봇 전송을 피하기 위해 local/e2e 전용으로 유지합니다.

---

## 확장

확장은 2계층 아키텍처를 사용합니다:

- **메인 프로세스**: `plugin.json` 매니페스트 + `exports.activate(api)`를 가진 `main.js`로 커맨드 등록
- **렌더러 프로세스**: `RendererExtensionContribution`을 구현하는 `renderer.tsx`로 React 패널 UI

내장 확장:

| 확장 | 패널 |
|---|---|
| `xenesis-desk.core-tools` | Xenesis Agent, Xenesis Bot, AI Workbench, Artifact Library, Terminal Inspector, Process Viewer, Remote Sync Planner, Safe File Edit Center, Run Task Panel, Capability Explorer, Hermes 패널, Activity Timeline, Network Monitor, Audit Log, Agent Performance, XApp Preview, Phase 5 XamongCode (20개 command id, XamongCode는 기본 숨김) |
| `xenesis-desk.data-tools` | 메타 관리, 쿼리 분석기, SQLite 서버 설정 (4개 커맨드) |
| `xenesis-desk.workflow-runner` | Workflow Runner, Demo Lab Player/Maker, 거울이, GowooriChat, Alert Rules, Template Catalog, Artifact Versions (8개 커맨드) |

샘플 확장(`sample.*`)은 서드파티 개발자를 위한 확장 API 데모입니다.

---

## 보안

- 렌더러는 샌드박스에서 실행 (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`)
- 모든 IPC는 검증된 페이로드를 가진 `contextBridge`를 통과
- 외부 소스의 역량 호출은 `control`, `write`, `execute`, `danger` 작업에 대해 승인 필요
- 터미널 자동화는 자동 입력 전에 위험 명령 차단
- AI API 키와 bot token은 설정/Secret Vault 흐름으로 로컬 저장하거나 환경 변수 이름으로 참조합니다. secret 값은 profile에 직접 쓰지 않습니다.
- Content-Security-Policy: `script-src 'self'`

---

## GitHub 커뮤니티

- 기여 가이드: [CONTRIBUTING.md](CONTRIBUTING.md)
- 보안 정책: [SECURITY.md](SECURITY.md)
- 지원 경로: [SUPPORT.md](SUPPORT.md)
- 행동 강령: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 변경 기록: [CHANGELOG.md](CHANGELOG.md)
- Issues: <https://github.com/xamong/xenesis-desk/issues>
- Discussions: <https://github.com/xamong/xenesis-desk/discussions>

---

## 라이선스

[MIT](LICENSE)
