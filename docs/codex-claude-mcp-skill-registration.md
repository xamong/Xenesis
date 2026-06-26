# Codex / Claude MCP and Skill Registration

이 문서는 Xenesis Desk 리뉴얼 이후 Codex, Claude, Cursor 같은 외부 LLM 클라이언트에 Xenesis Desk MCP와 Skill을 다시 등록하는 절차를 정리합니다.

등록 후 가장 빠른 동작 검증은 이 문서의 `등록 후 smoke 테스트` 절차를 기준으로 합니다. 공개 저장소에서는 DEV bridge `3848`, capability inventory, read-only call을 `node scripts/xd.mjs --dev ...` 명령으로 확인합니다.

## 기준 경로

Xenesis Desk 루트:

```powershell
<XENESIS_DESK_ROOT>
```

MCP 서버:

```powershell
<XENESIS_DESK_ROOT>\mcp\xenesis-desk-mcp-server.mjs
```

개발 앱 홈:

```powershell
%USERPROFILE%\.xenis-dev
```

개발 브릿지 상태 파일:

```powershell
%USERPROFILE%\.xenis-dev\mcp\bridge.json
```

개발 브릿지 URL:

```text
http://127.0.0.1:3848
```

릴리즈 앱은 보통 `http://127.0.0.1:3847`을 사용합니다. 개발 테스트에서는 반드시 `3848` 또는 `.xenis-dev` 상태 파일을 사용해야 합니다.

## 1. 개발 앱 실행

MCP 서버는 Xenesis Desk 앱이 실행 중일 때 `bridge.json`을 읽어 CR과 UI 제어를 수행합니다. 먼저 개발 앱을 실행합니다.

```powershell
cd "<XENESIS_DESK_ROOT>"
npm run dev
```

별도 PowerShell 창에서 실행하려면:

```powershell
$deskRoot = "<XENESIS_DESK_ROOT>"
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", "cd `"$deskRoot`"; npm run dev"
```

브릿지 상태 확인:

```powershell
$statePath = "$env:USERPROFILE\.xenis-dev\mcp\bridge.json"
Test-Path $statePath
Get-Content -Raw $statePath
```

기대 조건:

- `bridgeUrl`이 `http://127.0.0.1:3848`이다.
- `serverPath`가 `xenesis-desk\mcp\xenesis-desk-mcp-server.mjs`를 가리킨다.
- `bridgeToken`이 존재한다.

추가 확인:

```powershell
cd "<XENESIS_DESK_ROOT>"
node scripts\xd.mjs --dev call xd.app.status
```

기대 조건:

- `app.packaged`가 `false`다.
- bridge state path가 `.xenis-dev\mcp\bridge.json`이다.

## 2. Codex MCP 등록

Codex는 `codex mcp add` 또는 `%USERPROFILE%\.codex\config.toml` 편집 방식으로 MCP 서버를 등록할 수 있습니다.

### CLI로 등록

```powershell
codex mcp add xenesis-dev --env XENIS_HOME=%USERPROFILE%\.xenis-dev -- node "<XENESIS_DESK_ROOT>\mcp\xenesis-desk-mcp-server.mjs"
```

확인:

```powershell
codex mcp list
```

Codex TUI나 앱에서는 `/mcp`로 현재 연결된 MCP 서버를 확인합니다.

### config.toml로 등록

파일:

```powershell
%USERPROFILE%\.codex\config.toml
```

추가:

```toml
[mcp_servers.xenesis_dev]
enabled = true
command = "node"
args = ["<XENESIS_DESK_ROOT>\\mcp\\xenesis-desk-mcp-server.mjs"]

[mcp_servers.xenesis_dev.env]
XENIS_HOME = "<XENIS_DEV_HOME>"
```

Codex를 재시작하거나 새 세션을 열어야 반영됩니다.

## 3. Claude MCP 등록

Claude Desktop 기준 설정 파일:

```powershell
%APPDATA%\Claude\claude_desktop_config.json
```

`mcpServers`에 다음 항목을 추가합니다. 기존 `mcpServers`가 있으면 덮어쓰지 말고 `"xenesis-dev"`만 병합합니다.

```json
{
  "mcpServers": {
    "xenesis-dev": {
      "command": "node",
      "args": [
        "<XENESIS_DESK_ROOT>\\mcp\\xenesis-desk-mcp-server.mjs"
      ],
      "env": {
        "XENIS_HOME": "<XENIS_DEV_HOME>"
      }
    }
  }
}
```

저장 후 Claude를 완전히 종료했다가 다시 실행합니다.

Claude Code가 별도 설정을 사용하는 경우에도 같은 `mcpServers` 블록을 Claude Code MCP 설정에 추가합니다. 로컬 환경에서는 다음 경로도 확인 대상입니다.

```powershell
%USERPROFILE%\.claude\settings.json
```

## 4. Cursor MCP 등록

Cursor 로컬 MCP 설정 파일:

```powershell
%USERPROFILE%\.cursor\mcp.json
```

추가:

```json
{
  "mcpServers": {
    "xenesis-dev": {
      "command": "node",
      "args": [
        "<XENESIS_DESK_ROOT>\\mcp\\xenesis-desk-mcp-server.mjs"
      ],
      "env": {
        "XENIS_HOME": "<XENIS_DEV_HOME>"
      }
    }
  }
}
```

기존 항목이 있으면 동일하게 병합합니다.

## 5. Codex Skill 등록

Xenesis Desk MCP는 prompt pack과 CR 도구를 노출하지만, LLM이 언제 어떤 도구를 써야 하는지는 Skill로 알려주는 것이 안정적입니다.

추천 위치:

```powershell
%USERPROFILE%\.codex\skills\xenesis-desk\SKILL.md
```

예시:

```markdown
---
name: xenesis-desk
description: Use when controlling Xenesis Desk, generating XCON/SKETCH artifacts, using Gowoori, Xenesis Agent, Capability Registry, MCP prompt packs, or validating/rendering XCON documents.
---

# Xenesis Desk

Use the `xenesis-dev` MCP server when available.

## XCON/SKETCH generation

1. Call `xenesis_desk_get_xcon_prompt` with the appropriate kind.
2. Generate Markdown with fenced `xcon-sketch` blocks.
3. Validate with `xenesis_desk_validate_xcon_markdown`.
4. Save/open with `xenesis_desk_create_xcon_markdown_from_content`.

## Desk control

1. Call `xenesis_desk_state`.
2. Call `xenesis_desk_capabilities` to inspect Capability Registry paths.
3. Call `xenesis_desk_capability` before invoking a CR path.
4. Call `xenesis_desk_call_capability` to control Xenesis Desk.

## Development bridge

For development work, use:

`XENIS_HOME=%USERPROFILE%\.xenis-dev`

The expected bridge is:

`http://127.0.0.1:3848`

Never store the bridge token directly in long-lived config. Let the MCP server read `.xenis-dev\mcp\bridge.json`.
```

등록 후 Codex에서 다음 중 하나를 수행합니다.

- 새 Codex 세션 시작
- `/skills`로 skill 확인
- 앱/IDE에서는 command menu에서 `Force Reload Skills`

## 6. Claude Skill 등록

Claude 쪽도 동일한 Skill 내용을 둘 수 있습니다.

추천 위치:

```powershell
%USERPROFILE%\.claude\skills\xenesis-desk\SKILL.md
```

Claude 환경이 `skills` 폴더를 자동 인식하지 않는 경우에는 fallback으로 Xenesis Desk 루트나 관련 프로젝트 루트에 `CLAUDE.md`를 두고 같은 운영 규칙을 넣습니다.

## 7. 등록 후 MCP 도구 확인

MCP 등록 후 외부 LLM에서 다음 도구가 보이면 정상입니다.

- `xenesis_desk_state`
- `xenesis_desk_capabilities`
- `xenesis_desk_capability`
- `xenesis_desk_call_capability`
- `xenesis_desk_get_xcon_prompt`
- `xenesis_desk_validate_xcon_markdown`
- `xenesis_desk_create_xcon_markdown_from_content`
- `xenesis_desk_open_file`
- `xenesis_desk_terminal_list`
- `xenesis_desk_terminal_run`
- `xenesis_desk_terminal_tail`
- `xenesis_desk_subagent_start`
- `xenesis_desk_subagent_list`
- `xenesis_desk_subagent_tail`
- `xenesis_desk_subagent_stop`
- `xenesis_desk_playwright_snapshot`
- `xenesis_desk_playwright_run`

서브에이전트 작업을 사용자가 Desk에서 직접 보고 싶어 하는 경우에는 일반 background subagent 대신 `xenesis_desk_subagent_start`를 사용합니다. 가능하면 `xenesis_desk_active_context`로 현재 터미널을 확인한 뒤 `parentTermId`를 넘기고, 진행 확인은 `xenesis_desk_subagent_tail`로 합니다.

Codex/Claude Code의 native subagent는 시작 후 Xenesis Desk 터미널로 리다이렉트할 수 없으므로 관측용으로만 취급합니다. native subagent hook 이벤트를 Xenesis Desk diagnostics에 남기려면 `scripts/xenesisDeskSubagentHook.mjs`를 hook observer로 연결합니다.

## 8. 등록 후 smoke 테스트

개발 앱이 켜진 상태에서:

```powershell
cd "<XENESIS_DESK_ROOT>"
node scripts/xd.mjs --dev state
node scripts/xd.mjs --dev capabilities
node scripts/xd.mjs --dev call xd.app.status
```

위 명령은 공개 저장소에 포함된 `xd` helper만 사용해 개발 브릿지 상태, capability inventory, read-only capability call을 확인합니다.

유지보수자 전용 개발 환경에서는 ignored smoke runner가 더 깊은 Gowoori E2E, layout, matrix, full handoff 검증을 수행할 수 있습니다. 이 runner들은 GitHub 공개 npm script 표면에 포함하지 않으며, 외부 LLM이 결과 파일을 받아야 할 때는 표준 handoff 폴더 `%USERPROFILE%\.xenis-dev\mcp\cr-smoke` 아래에 `cr-full-plan.json`, `cr-full-dry-run.json`, `cr-full-result.json`, `cr-acceptance-result.json` 같은 결과 파일을 남기는 방식으로 운영합니다.

등록 직후 다른 Codex/Claude가 표준 handoff를 제대로 읽을 수 있는지 확인하려면 공개 helper로 읽기 전용 경로를 먼저 확인합니다.

```powershell
cd "<XENESIS_DESK_ROOT>"
node scripts/xd.mjs --dev capabilities
node scripts/xd.mjs --dev call xd.app.status
```

유지보수자 전용 개발 환경에서는 ignored smoke runner가 plan/dry-run JSON을 만들고, 결과 요약을 표준 handoff 폴더에 저장할 수 있습니다. 이 runner들은 공개 npm script 표면에 포함하지 않습니다.

대표 확인 파일:

```powershell
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\cr-external-llm-handoff.json
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\cr-full-plan.json
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\cr-full-dry-run.json
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\cr-full-result.json
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\cr-acceptance-result.json
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\mcp-external-llm-cr-flow.json
```

`cr-external-llm-handoff.json`의 `ok`가 `true`이면 MCP 등록 문서와 CR handoff를 따라갈 준비가 된 상태입니다. live UI를 제어하는 깊은 E2E 검증은 ignored smoke runner 또는 실제 MCP client에서 `xenesis_desk_capabilities`, `xenesis_desk_capability`, `xenesis_desk_call_capability` 순서로 수행합니다.

## 9. 외부 LLM에게 줄 표준 지시문

다른 Codex, Claude, Cursor Agent에게 다음 내용을 전달하면 됩니다.

```text
Xenesis Desk 개발 버전을 MCP와 CR로 제어해.
작업 루트는 <XENESIS_DESK_ROOT> 이고, 개발 브릿지는 %USERPROFILE%\.xenis-dev\mcp\bridge.json 또는 http://127.0.0.1:3848 을 사용해.
release 브릿지 3847을 쓰면 안 된다.

먼저 xenesis_desk_state 또는 xd.app.status를 호출해서 bridgeUrl이 3848이고 packaged:false인지 확인해.
CR path를 모르면 xenesis_desk_capabilities로 찾고, 호출 전 xenesis_desk_capability로 schema와 approval을 확인해.

Gowoori 테스트는 다음 순서로 해:
1. xd.window.sizer.applyPreset으로 qhd 적용.
2. xd.views.open kind=gowoori placement=tab.
3. 열린 Gowoori pane을 xd.dock.artifactTarget.set으로 artifact target 지정.
4. xd.views.open kind=gowooriChat placement=right.
5. xd.gowoori.chat.run에 autoApply:true로 요청 전송.
6. xd.capture.activePane preferArtifactPane:true로 결과 캡처.
7. xd.capture.list와 xd.capture.thumbnail로 렌더링이 비어 있지 않은지 확인.
8. 대시보드/보고서 요청이면 생성 source에 chart, spanGrid, map 같은 요청 rich component가 실제로 들어갔는지 확인.
```

CLI만 쓸 수 있는 에이전트에게는 다음을 전달합니다.

```text
터미널에서 <XENESIS_DESK_ROOT> 로 이동해.
모든 xd CLI 호출에 --dev를 붙여.
node scripts\xd.mjs --dev call xd.app.status 로 개발 브릿지 3848과 packaged:false를 확인해.
그 다음 node scripts\xd.mjs --dev window-size qhd, node scripts\xd.mjs --dev view gowoori tab, node scripts\xd.mjs --dev view gowooriChat right 순서로 실행해.
필요한 paneId/contentId는 node scripts\xd.mjs --dev panes 로 확인해.
```

## 10. Mock 시나리오 (데모/발표용)

mock provider에는 18개 도메인별 시나리오가 내장되어 있습니다. LLM 호출 없이 키워드 매칭으로 사실적인 대시보드를 즉시 반환합니다. 발표/데모/오프라인 환경에서 안정적으로 동작합니다.

키워드 자동 매칭 예시:

| 프롬프트 | 결과 |
|---|---|
| "서버 장애 상황판" | Server-03 긴급 장애 대시보드 |
| "매출 보여줘" | Q2 2026 매출 현황 대시보드 |
| "발표 자료 만들어줘" | 월간 경영 리뷰 |
| "오늘 뭐 해야 돼" | 오늘의 우선순위 대시보드 |
| "환자 바이탈" | 3병실 환자 바이탈 모니터링 |
| "개표 현황" | 개표 현황 실시간 |

강제 선택: `[mock:noc]`, `[mock:sales]`, `[mock:medical]` 등 18개 ID 지원.

전체 목록과 CLI 예시는 로컬 개발용 CR control runbook을 기준으로 유지합니다.

## 11. 주의사항

- bridge token을 장기 설정 파일에 직접 저장하지 않습니다.
- MCP 설정에는 `XENIS_HOME` 또는 `XENIS_MCP_STATE_FILE`만 둡니다.
- 개발 테스트에서는 release bridge `3847`을 사용하지 않습니다.
- CLI 자동화에서는 `--dev`를 붙입니다.
- CR 호출 전에는 가능한 한 `describe/capability`로 schema와 approval 요구사항을 확인합니다.
- `control`, `write`, `execute`, `danger` 계열 capability는 승인 흐름이 필요할 수 있습니다.

## 12. 관련 문서

- `docs/mcp-integration.md`
- `docs/mcp-prompt-usage.md`
- `docs/mcp-capabilities.md`
- `docs/capability-registry.md`
- `docs/capability-registry-list.md`
- 로컬 개발용 CR control runbook
- 로컬 개발용 capability bridge smoke runbook

## 13. 현재 로컬 등록 상태

2026-06-17 기준으로 이 개발 장비에는 아래 항목이 실제 등록되어 있습니다.

### Codex

등록 명령:

```powershell
codex mcp add xenesis-dev --env XENIS_HOME=%USERPROFILE%\.xenis-dev -- node "<XENESIS_DESK_ROOT>\mcp\xenesis-desk-mcp-server.mjs"
```

확인 명령:

```powershell
codex mcp list
codex mcp get xenesis-dev
```

확인 결과:

- `xenesis-dev`가 enabled 상태로 표시됩니다.
- command는 `node`입니다.
- args는 `<XENESIS_DESK_ROOT>\mcp\xenesis-desk-mcp-server.mjs`입니다.
- env에는 `XENIS_HOME=%USERPROFILE%\.xenis-dev`가 설정되어 있습니다.
- Codex 설정 파일의 TOML key는 `mcp_servers.xenesis_dev` 형태로 저장되지만, CLI 표시명과 조회명은 `xenesis-dev`입니다.

Skill 파일:

```powershell
%USERPROFILE%\.codex\skills\xenesis-desk\SKILL.md
```

### Claude Code

등록 명령:

```powershell
claude mcp add -s user xenesis-dev -e XENIS_HOME=%USERPROFILE%\.xenis-dev -- node "<XENESIS_DESK_ROOT>\mcp\xenesis-desk-mcp-server.mjs"
```

확인 명령:

```powershell
claude mcp list
```

확인 결과:

- `xenesis-dev`가 connected 상태로 표시됩니다.
- Claude Code user scope 설정은 `%USERPROFILE%\.claude.json`에 저장됩니다.
- `%USERPROFILE%\.claude\settings.json`에도 같은 MCP server block이 병합되어 있습니다. Claude Code CLI는 `.claude.json`을 우선 확인합니다.

Skill 파일:

```powershell
%USERPROFILE%\.claude\skills\xenesis-desk\SKILL.md
```

### Cursor

설정 파일:

```powershell
%USERPROFILE%\.cursor\mcp.json
```

현재 등록 항목:

```json
{
  "mcpServers": {
    "xenesis-dev": {
      "command": "node",
      "args": [
        "<XENESIS_DESK_ROOT>\\mcp\\xenesis-desk-mcp-server.mjs"
      ],
      "env": {
        "XENIS_HOME": "<XENIS_DEV_HOME>"
      }
    }
  }
}
```

기존 `xv-desk` 항목은 Xenesis Desk 리뉴얼 후 경로와 이름이 맞지 않아 `xenesis-dev`로 교체했습니다.

### 설정 백업

등록 전에 아래 백업을 생성했습니다.

```powershell
%USERPROFILE%\.codex\config.toml.bak-xenesis-20260617-011650
%USERPROFILE%\.claude\settings.json.bak-xenesis-20260617-011650
%USERPROFILE%\.cursor\mcp.json.bak-xenesis-20260617-011650
```

### 현재 검증 결과

DEV bridge:

```powershell
node scripts\xd.mjs --dev call xd.app.status
```

검증 결과:

- `bridgeUrl`은 `http://127.0.0.1:3848`입니다.
- bridge state path는 `%USERPROFILE%\.xenis-dev\mcp\bridge.json`입니다.
- `app.packaged`는 `false`입니다.

외부 LLM MCP flow:

```powershell
node scripts\xd.mjs --dev capabilities
node scripts\xd.mjs --dev call xd.app.status
```

검증 결과:

- `ok: true`
- `readyForExternalLlmMcp: true`
- MCP `tools/list` 결과 30+개
- CR capability count 650+ 범위
- `xd.window.sizer.applyPreset`으로 QHD 적용 성공
- `xd.views.open kind=gowoori placement=tab` 성공
- `xd.dock.artifactTarget.set` 성공
- `xd.views.open kind=gowooriChat placement=right` 성공
- `xd.gowoori.chat.run` 성공
- 생성 source marker: `chart`, `spanGrid`, `map`
- capture PNG bytes: `341438`
- thumbnail bytes: `2043`

결과 파일:

```powershell
%USERPROFILE%\.xenis-dev\mcp\cr-smoke\mcp-external-llm-cr-flow.json
```
