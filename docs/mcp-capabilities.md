# Xenesis Desk MCP 기능 정리

기준: 현재 `mcp/xenesis-desk-mcp-server.mjs`의 `tools/list`, `resources/list`, `prompts/list` 응답.

Xenesis Desk MCP는 CLI 에이전트가 Xenesis Desk 앱을 제어하고, XCON/SKETCH 문서를 생성/검증/열람하며, 터미널/확장/브라우저 자동화를 실행할 수 있게 해주는 로컬 MCP stdio 서버입니다.

Capability Registry의 상세 운영 기준은 `docs/capability-registry.md`를 기준으로 합니다. 자동 생성 inventory는 `docs/capability-registry-list.md`를 기준으로 공개하고, audit 산출물은 로컬 개발 검증용으로 보관합니다. 새 Xenesis Desk 기능은 MCP 도구나 bridge route로 직접 추가하기 전에 먼저 registry path, dispatcher, IPC/HTTP/command/context/preload API coverage metadata, renderer 메뉴/툴바/app-shell coverage metadata, 승인 정책을 갖춰야 합니다.

개발 버전 Xenesis Desk를 다른 Codex/Claude에서 테스트할 때는 `3848` 개발 브릿지를 사용합니다. 외부 MCP 설정과 직접 HTTP 확인은 로컬 개발용 capability bridge smoke runbook을 기준으로 할 수 있지만, 공개 저장소에서 바로 실행 가능한 빠른 검증은 Xenesis Desk 루트(`<XENESIS_DESK_ROOT>`)에서 `node scripts/xd.mjs --dev state`, `node scripts/xd.mjs --dev capabilities`, `node scripts/xd.mjs --dev call xd.app.status`를 사용하는 것입니다. CLI 단축 명령은 릴리즈 브릿지 환경 변수 상속을 피하기 위해 `node scripts/xd.mjs --dev ...` 또는 `XENIS_TARGET=dev`를 우선 사용합니다.

외부 LLM이나 CI가 full CR smoke 결과를 파일로 주고받을 때는 개발 홈의 `%USERPROFILE%\.xenis-dev\mcp\cr-smoke`를 표준 handoff 폴더로 사용합니다. Maintainer-only full smoke runners가 있는 개발 환경에서는 모드에 따라 `cr-full-plan.json`, `cr-full-dry-run.json`, `cr-full-result.json` 중 하나를 이 폴더에 저장합니다. 공개 package script는 이 ignored smoke runner에 의존하지 않습니다.

## 구조

- MCP 서버: `mcp/xenesis-desk-mcp-server.mjs`
- Playwright worker: `mcp/playwright-worker.mjs`
- Electron bridge: `http://127.0.0.1:<port>`
- Bridge 상태 파일: `XENIS_HOME/mcp/bridge.json`
- 기본 사용자 홈: `XENIS_HOME`, 없으면 `${HOME}/.xenis`
- 개발 브릿지: `XENIS_HOME=%USERPROFILE%\.xenis-dev`일 때 보통 `http://127.0.0.1:3848`

MCP 서버는 stdio JSON-RPC 요청을 받고, 파일 작성이나 검증처럼 자체 처리 가능한 작업은 직접 수행합니다. 실행 중인 Xenesis Desk 앱과 연결해야 하는 작업은 localhost bridge로 전달합니다.

## XCON/SKETCH 문서 기능

`xenesis_desk_get_xcon_prompt`

- XCON/SKETCH 생성용 프롬프트 가이드를 반환합니다.
- `kind` 값으로 `sketch-ui`, `strict-sketch`, `markdown-xcon`, `dashboard-workflow`, `family-template`, `review-repair`, `chat-artifact`, `chain`, `workflow`, `template-lab`을 선택할 수 있습니다.
- MCP prompt를 직접 지원하지 않는 클라이언트에서 생성 지침을 가져올 때 사용합니다.

`xenesis_desk_validate_xcon_markdown`

- Markdown 안의 `xcon-sketch` fence를 검증합니다.
- 최소 하나의 fence 존재 여부, `screen` 시작 여부, `@xcon-viewer/core` 파서 통과 여부를 확인합니다.

`xenesis_desk_create_xcon_markdown_from_content`

- 완성된 Markdown 내용을 파일로 저장합니다.
- XCON/SKETCH fence를 검증한 뒤, 옵션에 따라 Xenesis Desk에서 엽니다.
- `workspaceDir` 또는 alias인 `outDir`로 출력 폴더를 지정할 수 있습니다.
- 출력 폴더 기본값은 `XENIS_HOME/exports`이며, 상대 경로는 이 exports 폴더 아래로 해석됩니다.
- `placement`, `streaming`, `openInDesk`를 지원합니다.

`xenesis_desk_create_xcon_markdown`

- `prompt`를 기반으로 기본 XCON/SKETCH Markdown 문서를 생성합니다.
- `mode`는 `view`, `code`, `both` 중 하나입니다.
- `workspaceDir` 또는 alias인 `outDir`로 출력 폴더를 지정할 수 있습니다.
- 출력 폴더 기본값은 `XENIS_HOME/exports`이며, 상대 경로는 이 exports 폴더 아래로 해석됩니다.
- 생성 후 Xenesis Desk에서 열 수 있습니다.

`xenesis_desk_open_file`

- 기존 로컬 파일을 Xenesis Desk에서 엽니다.
- `filePath`는 절대 경로여야 합니다.
- `placement`와 streaming render 옵션을 지원합니다.

## Desk 상태와 컨텍스트

## Capability Registry

`xenesis_desk_capabilities`

- Xenesis Desk Capability Registry 전체 트리를 반환합니다.
- `xd.app`, `xd.files`, `xd.terminals`, `xd.capture`, `xd.gowoori`, `xd.events` 같은 그룹과 하위 method/event 노드를 확인할 수 있습니다.
- 외부 에이전트가 직접 호출 가능한 기능 목록을 발견할 때 사용합니다.

`xenesis_desk_capability`

- 특정 capability path의 상세 정보를 반환합니다.
- method/event/group 종류, 설명, callable/readable/subscribable 상태, args schema, access level을 확인할 수 있습니다.

`xenesis_desk_call_capability`

- 등록된 method capability를 호출합니다.
- `read` 작업은 바로 실행될 수 있고, `control`, `write`, `execute`, `danger` 작업은 승인 흐름을 거칩니다.
- 승인 필요 시 action inbox에 replay 가능한 capability approval 요청이 생성됩니다.

Registry 자체의 유지보수 규칙, MCP 서버 `callBridge('/...')` endpoint, Electron main bridge HTTP route, command palette, extension command, context action, IPC/preload API, renderer event/menu/toolbar/app-shell coverage metadata, 테스트 기준은 `docs/capability-registry.md`를 참고합니다.

`xenesis_desk_state`

- 실행 중인 Xenesis Desk bridge 상태 요약을 읽습니다.
- terminal, panel, open file, diagnostics 개수를 포함합니다.

`xenesis_desk_active_context`

- 현재 활성 pane, content, file, panel, terminal 컨텍스트를 읽습니다.
- 에이전트가 현재 사용자가 보고 있는 대상을 기준으로 작업할 때 사용합니다.

`xenesis_desk_context_actions`

- 현재 활성 컨텍스트에서 실행 가능한 Xenesis Desk action 목록을 반환합니다.
- action별 command, target, 승인 필요 여부를 확인할 수 있습니다.

`xenesis_desk_list_panels`

- Xenesis Desk bridge가 알고 있는 extension panel 목록을 반환합니다.

`xenesis_desk_list_open_files`

- MCP bridge를 통해 열린 파일 목록을 반환합니다.

`xenesis_desk_recent_diagnostics`

- 최근 진단 로그를 redacted 형태로 반환합니다.
- `limit`으로 반환 개수를 조정할 수 있습니다.

## 터미널 제어

`xenesis_desk_terminal_preview`

- 터미널 명령을 실행하지 않고 shell, cwd, command 해석 결과를 미리 봅니다.

`xenesis_desk_terminal_run`

- Xenesis Desk의 보이는 터미널 탭에서 명령을 실행합니다.
- `shell`은 `powershell`, `cmd`, `pwsh`, `wsl`을 지원합니다.
- `cwd`, `id`, `cols`, `rows`를 지정할 수 있습니다.

`xenesis_desk_terminal_tail`

- 실행 중인 터미널 세션의 최근 출력을 읽습니다.
- `maxBytes`로 출력 크기를 제한할 수 있습니다.

`xenesis_desk_terminal_stop`

- 지정한 터미널 세션을 중지합니다.

`xenesis_desk_terminal_list`

- 현재 Xenesis Desk가 알고 있는 터미널 세션 목록을 반환합니다.

`xenesis_desk_terminal_image_show`

- 로컬 이미지 파일 경로나 URL을 현재 Xenesis Desk 터미널에 인라인으로 렌더링합니다.
- `termId`를 생략하면 활성 터미널을 우선 사용하고, 활성 터미널이 없으면 첫 번째 알려진 터미널을 사용합니다.
- `width`, `height`, `preserveAspectRatio`, `filename` 옵션을 지원합니다.

`xenesis_desk_terminal_image_show_base64`

- base64 이미지 데이터를 현재 Xenesis Desk 터미널에 인라인으로 렌더링합니다.
- 첨부 이미지나 생성된 이미지 바이트를 터미널 안에 바로 보여줄 때 사용합니다.
- `termId`, `width`, `height`, `preserveAspectRatio`, `filename` 옵션을 지원합니다.

`xenesis_desk_terminal_xcon_image_show`

- XCON/SKETCH markup을 PNG로 렌더링한 뒤 현재 Xenesis Desk 터미널에 인라인으로 표시합니다.
- `syntax`, `theme`, `title`, `viewportWidth`, `width`, `height` 옵션을 지원합니다.

## Desk-visible subagent 터미널

Codex, Claude, Gemini, Xenesis 또는 custom runner로 위임한 작업을 사용자가 Xenesis Desk에서 직접 보고 싶을 때는 일반 background subagent가 아니라 Desk-visible subagent 도구를 사용합니다. 이 도구들은 내부 작업을 숨기지 않고 별도 터미널 탭으로 열어 진행 로그를 확인할 수 있게 합니다.

`xenesis_desk_subagent_start`

- `task`를 받아 별도 Xenesis Desk 터미널 탭에서 서브에이전트 작업을 시작합니다.
- `agent`는 `codex`, `claude`, `gemini`, `xenesis`, `custom`을 지원하며 기본값은 `codex`입니다.
- `command`를 지정하지 않으면 agent별 기본 명령을 사용합니다. 예: `codex exec <task>`, `claude -p <task>`, `gemini -p <task>`, `xenesis run <task>`.
- `parentTermId`를 넘기면 부모 터미널과 서브에이전트 터미널의 관계를 metadata로 보존합니다.
- `title`, `cwd`, `shell`, `id`, `cols`, `rows`를 지정할 수 있습니다.

`xenesis_desk_subagent_list`

- Xenesis Desk가 알고 있는 터미널 세션을 조회해서 Desk-visible subagent 터미널을 찾을 때 사용합니다.

`xenesis_desk_subagent_tail`

- Desk-visible subagent 터미널의 최근 출력을 읽습니다.
- 일반 `xenesis_desk_terminal_tail`과 같은 tail route를 사용하지만, subagent 작업 흐름을 명확히 하기 위한 전용 alias입니다.

`xenesis_desk_subagent_stop`

- Desk-visible subagent 터미널을 중지합니다.
- 사용자가 취소를 요청했거나 작업이 명확히 멈춘 경우에만 사용합니다.

권장 흐름:

1. `xenesis_desk_active_context`로 현재 터미널/pane 컨텍스트를 확인합니다.
2. `xenesis_desk_subagent_start`에 `task`, 필요한 `agent`, 가능하면 `parentTermId`와 짧은 `title`을 넘깁니다.
3. `xenesis_desk_subagent_list` 또는 `xenesis_desk_subagent_tail`로 진행 상황을 확인합니다.
4. 완료 후 부모 세션에서 결과를 요약합니다.

## Command Palette와 확장

`xenesis_desk_command_palette`

- 실행 중인 Xenesis Desk 앱이 노출하는 command palette 명령을 검색/나열합니다.
- `query`와 `includeDisabled`를 지원합니다.

`xenesis_desk_run_command_palette`

- command palette 명령을 실행하고, 결과 UI action을 Xenesis Desk로 전달합니다.
- extension panel을 여는 명령은 `panelPlacement`로 위치를 지정할 수 있습니다.

`xenesis_desk_list_extension_commands`

- 등록된 extension command 목록을 반환합니다.
- `includeDisabled`로 비활성 명령 포함 여부를 제어합니다.

`xenesis_desk_run_extension_command`

- 등록된 extension command를 실행하고 UI action을 Xenesis Desk에 dispatch합니다.
- `panelPlacement`를 지원합니다.

## Playwright 브라우저 자동화

Playwright 실행은 MCP 서버 내부가 아니라 `mcp/playwright-worker.mjs` 별도 Node 프로세스에서 수행됩니다. 브라우저 설치는 `npm run playwright:install`로 준비합니다.

`xenesis_desk_playwright_snapshot`

- URL을 열고 스크린샷을 저장합니다.
- http/https URL만 허용합니다.
- `selector`가 있으면 특정 요소만 캡처합니다.
- `outDir` 기본값은 `XENIS_HOME/captures`입니다. `outDir`에 상대 경로를 넘기면 `XENIS_HOME/exports` 아래로 해석됩니다.
- `format`, `quality`, `width`, `height`, `timeoutMs`, `fullPage`, `headless`, `allowedHosts`를 지원합니다.
- `openInDesk: true`면 결과 이미지를 Xenesis Desk에서 엽니다.

`xenesis_desk_playwright_run`

- URL을 열고 순서 있는 브라우저 action을 실행합니다.
- 지원 action type은 `click`, `fill`, `press`, `waitForSelector`, `waitForTimeout`, `screenshot`입니다.
- 실행 후 `screenshot: true`로 최종 스크린샷을 저장할 수 있습니다.
- `trace: true`로 Playwright `trace.zip`을 저장할 수 있습니다.
- `outDir` 기본값은 `XENIS_HOME/captures`입니다. `outDir`에 상대 경로를 넘기면 `XENIS_HOME/exports` 아래로 해석됩니다.
- `openInDesk: true`면 첫 번째 screenshot artifact를 Xenesis Desk에서 엽니다.

예시 action:

```json
{
  "url": "http://127.0.0.1:3000",
  "actions": [
    { "type": "fill", "selector": "#email", "value": "user@example.com" },
    { "type": "press", "selector": "#email", "key": "Enter" },
    { "type": "waitForSelector", "selector": "#result", "state": "visible" }
  ],
  "screenshot": true,
  "trace": true
}
```

## Prompt Resources

MCP `resources/list`에서 다음 prompt resource를 제공합니다.

- `xenesis://prompts/shared-xcon-contract`
- `xenesis://prompts/sketch-ui-generation`
- `xenesis://prompts/markdown-xcon-document`
- `xenesis://prompts/xcon-chain-generation`
- `xenesis://prompts/xcon-workflow-generation`
- `xenesis://prompts/family-data-binding-template`
- `xenesis://prompts/monitoring-dashboard-workflow`
- `xenesis://prompts/template-lab-business-document`
- `xenesis://prompts/review-and-repair`
- `xenesis://prompts/chat-artifact-simulation`
- `xenesis://prompts/showcase-component-catalog`
- `xenesis://prompts/auto-layout-layer-recipes`
- `xenesis://prompts/rich-list-xlist-recipes`
- `xenesis://prompts/dashboard-chart-map-network-recipes`
- `xenesis://prompts/family-binding-workflow-recipes`
- `xenesis://prompts/domain-blueprints`
- `xenesis://prompts/strict-generation-profile`

## Prompt Templates

MCP `prompts/list`에서 다음 prompt template을 제공합니다.

- `xcon.sketch-ui`: 완성된 XCON/SKETCH UI 화면 생성
- `xcon.strict-sketch`: 검증 안정성을 우선하는 compact XCON/SKETCH 화면 생성
- `xcon.markdown-document`: Markdown 안에 XCON/SKETCH 시각 artifact 생성
- `xcon.dashboard-workflow`: 모니터링 또는 대시보드 workflow artifact 생성
- `xcon.family-template`: fixture, chain, sketch, workflow를 하나의 family template로 생성
- `xcon.review-repair`: 생성된 XCON Markdown 또는 SKETCH 검토/수리
- `xcon.chat-artifact`: 채팅 스타일 Markdown + XCON/SKETCH streaming artifact 생성

도구 기반 프롬프트 조립 흐름과 `strict-sketch` golden sample은 `docs/mcp-prompt-usage.md`를 참고합니다.

## 보안과 운영 메모

- Bridge는 localhost 전용이며 per-run token을 사용합니다.
- `xenesis_desk_open_file`은 존재하는 절대 경로만 엽니다.
- Playwright 도구는 http/https만 허용하며, `allowedHosts` allowlist를 사용할 수 있습니다.
- Playwright worker에는 timeout과 출력 크기 제한이 있습니다.
- 터미널 실행 도구는 실제 로컬 명령을 실행하므로, agent가 호출할 때 명령 내용과 cwd를 명확히 해야 합니다.
- trace와 screenshot artifact는 기본적으로 `XENIS_HOME/captures`에 저장됩니다.

## 권장 사용 흐름

1. XCON 문서 생성: `xenesis_desk_get_xcon_prompt` -> 모델 생성 -> `xenesis_desk_validate_xcon_markdown` -> `xenesis_desk_create_xcon_markdown_from_content`
2. 현재 Desk 상태 기반 작업: `xenesis_desk_active_context` -> `xenesis_desk_context_actions` -> 필요한 action 실행
3. 터미널 작업: `xenesis_desk_terminal_preview` -> `xenesis_desk_terminal_run` -> `xenesis_desk_terminal_tail` -> 필요 시 `xenesis_desk_terminal_stop`
4. 터미널 이미지 표시: 파일/URL은 `xenesis_desk_terminal_image_show`, base64는 `xenesis_desk_terminal_image_show_base64`, XCON/SKETCH는 `xenesis_desk_terminal_xcon_image_show`. `@xterm/addon-image` IIP 경로의 공식 이미지 입력은 PNG/JPEG/GIF입니다.
5. 보이는 서브에이전트 작업: `xenesis_desk_active_context` -> `xenesis_desk_subagent_start` -> `xenesis_desk_subagent_tail` -> 필요 시 `xenesis_desk_subagent_stop`
6. 웹 UI 확인: `xenesis_desk_playwright_run` 또는 `xenesis_desk_playwright_snapshot` -> screenshot/trace 확인 -> 필요 시 `xenesis_desk_open_file`
