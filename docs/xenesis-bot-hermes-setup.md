# Xenesis Bot Hermes Setup

이 문서는 Xenesis Bot을 Hermes Gateway와 연결해 사용하는 설정 및 실행 절차를 정리한다. Xenesis Bot은 Hermes나 다른 LLM 스트림 생산자가 보내는 Markdown 응답을 Xenesis Desk 안의 Bot 패널에 표시하고, Markdown 안의 `xcon`, `xcon-sketch` fence를 실시간으로 렌더링한다.

## 구성 개요

Xenesis Bot에는 방향이 다른 HTTP 경로가 두 개 있다.

| 방향 | 담당 프로세스 | 기본 URL | 용도 |
|---|---|---:|---|
| Hermes -> Xenesis Desk | Xenesis Desk Electron MCP bridge | `http://127.0.0.1:3847` | assistant 메시지, stream, final, status를 Xenesis Bot 패널로 전달 |
| Xenesis Desk -> Hermes | Hermes `xenesis_desk_bot` listener | `http://127.0.0.1:3859/message` | Xenesis Bot 입력창의 user 메시지를 Hermes Gateway로 전달 |

중요한 점은 `XENIS_MCP_BRIDGE_URL`과 `XENIS_BOT_INPUT_URL`을 섞으면 안 된다는 것이다.

```powershell
# 맞음: Hermes가 Xenesis Desk로 응답을 보내는 bridge
$env:XENIS_MCP_BRIDGE_URL="http://127.0.0.1:3847"

# 맞음: Xenesis Desk 입력창이 Hermes로 메시지를 보내는 listener
$env:XENIS_BOT_INPUT_URL="http://127.0.0.1:3859/message"
```

`XENIS_MCP_BRIDGE_URL`을 `http://127.0.0.1:3859` 또는 `http://127.0.0.1:3859/message`로 설정하면 Hermes가 `/bot/message`를 잘못된 서버에 호출하므로 `HTTP Error 404: Not Found`가 난다.

## Xenesis Desk 쪽 준비

### 1. Xenesis Desk 실행

개발 실행:

```powershell
cd "<XENESIS_DESK_ROOT>"
npm run dev
```

패키지/릴리스 앱은 일반 Windows 앱처럼 실행한다.

Xenesis Desk bridge 기본 포트는 다음과 같다.

| 실행 방식 | 기본 bridge |
|---|---|
| 패키지/릴리스 | `http://127.0.0.1:3847` |
| `npm run dev` | `http://127.0.0.1:3848` |

단, 선호 포트가 이미 사용 중이면 Xenesis Desk가 사용 가능한 다른 포트로 바인딩한다. 실제 URL과 token은 항상 bridge state 파일에 기록된다.

기본 state 파일:

```text
%USERPROFILE%\.xenis\mcp\bridge.json
```

`XENIS_HOME`을 설정했다면:

```text
%XENIS_HOME%\mcp\bridge.json
```

### 2. Bot 화면 열기

Xenesis Desk에서 수동으로 열 수 있다.

1. 상단 `도구` 버튼 클릭
2. `Xenesis Bot` 선택

또는 `Ctrl+K` 커맨드 팔레트에서 `Xenesis Bot`을 검색해 실행한다.

Hermes가 `/bot/session`, `/bot/message`, `/bot/stream`, `/bot/final` 이벤트를 보내면 Xenesis Desk가 Bot 패널을 자동으로 열거나 기존 패널에 포커스한다.

### 3. 최신 main process로 재시작

Bot bridge endpoint는 Electron main process에 있다. 다음 증상이 있으면 Xenesis Desk 앱 자체를 재시작해야 한다.

```text
HTTP Error 404: Not Found
```

Extension reload만으로는 `/bot/message` 같은 bridge endpoint가 갱신되지 않는다.

## Hermes 쪽 준비

### 1. Hermes Gateway 실행 가능 상태 확인

설치된 Hermes를 쓰는 경우:

```powershell
hermes gateway run
```

서비스 방식으로 돌릴 때는 기존 Hermes 명령을 사용한다.

```powershell
hermes gateway start
hermes gateway status
hermes gateway restart
```

Hermes checkout에서 직접 실행해야 하고 `hermes.exe`가 아직 없다면 해당 Hermes repo에서 editable install을 한다.

```powershell
cd "<Hermes repo root>"
.\.venv\Scripts\python.exe -m pip install -e .
.\.venv\Scripts\hermes.exe gateway run
```

### 2. Hermes 플러그인 동기화

Xenesis Desk + Hermes 연계 코드는 Hermes core를 수정하지 않고 플러그인으로 배포한다. 실제 Hermes 설치본 또는 WSL2 안의 별도 Hermes checkout에 반영할 때는 Xenesis Desk 저장소에서 동기화 스크립트를 실행한다.

먼저 dry-run으로 대상 경로를 확인한다.

```powershell
cd "<XENESIS_DESK_ROOT>"
node scripts/syncHermesPlugins.mjs --target "<Hermes repo root>" --dry-run
```

대상 Hermes root가 맞으면 실제 복사를 실행한다.

```powershell
node scripts/syncHermesPlugins.mjs --target "<Hermes repo root>"
```

복사 대상:

| 플러그인 | 복사 위치 |
|---|---|
| `xenesis_desk_gateway` | `<Hermes repo root>/plugins/xenesis_desk_gateway` |
| `xenesis_desk_bot` | `<Hermes repo root>/plugins/platforms/xenesis_desk_bot` |

소스 Hermes draft가 기본 위치가 아니면 `--source "<Hermes source root>"`를 함께 넘긴다. 스크립트는 대상 plugin 디렉터리를 교체하므로 `<Hermes repo root>`를 정확히 지정해야 한다. 동기화 후에는 `hermes gateway restart` 또는 실행 중인 gateway 재시작이 필요하다.

### 3. Xenesis Bot 플랫폼 켜기

`xenesis_desk_bot`은 Hermes general plugin 명령으로 켜는 대상이 아니라 Gateway platform plugin이다. 다음 환경변수 중 하나로 활성화된다.

```powershell
$env:XENIS_BOT_ENABLED="true"
```

또는 bridge URL을 명시해도 활성화 조건이 충족된다.

```powershell
$env:XENIS_MCP_BRIDGE_URL="http://127.0.0.1:3847"
```

`xenesis_desk_gateway`는 별도 일반 플러그인이다. Hermes Plug-in, Telegram, Discord 쪽에서 `/xd status`, `/xd run`, `/xd xcon` 같은 명령을 쓰거나, Xenesis Bot 입력을 visual cockpit 요청으로 바꿔 XCON/SKETCH artifact 흐름을 유도하려면 별도로 켠다.

```powershell
hermes plugins enable xenesis_desk_gateway
```

이 플러그인이 켜져 있으면 Xenesis Bot에서 들어온 일반 메시지는 Hermes 쪽 `pre_gateway_dispatch` hook을 거쳐 현재 Desk context, `xenesis_desk_mobile_get_xcon_prompt`, XCON Markdown validation, artifact save/open 도구를 우선 활용하는 요청으로 rewrite된다. Hermes core 수정 없이 플러그인만으로 동작하는 흐름이다.

XCON/SKETCH artifact 생성 흐름은 MCP prompt 문서와 같은 기준을 따른다. 기준 문서는 `docs/mcp-prompt-usage.md`, 대표 시나리오별 품질 점검 기준은 `docs/mcp-prompt-quality-matrix.md`이다.

권장 흐름:

1. `/xd prompt [kind] [brief]` 또는 Bot starter action으로 작업에 맞는 prompt kind를 고른다.
2. Hermes가 Xenesis Desk MCP의 `xenesis_desk_get_xcon_prompt`를 사용해 생성 지침을 가져온다. Hermes mobile wrapper가 있는 환경에서는 `xenesis_desk_mobile_get_xcon_prompt`가 같은 목적의 경로로 사용될 수 있다.
3. LLM이 Markdown과 `xcon-sketch` fence를 생성하고 Bot은 스트리밍 중 렌더링을 갱신한다.
4. 저장 전 `xenesis_desk_validate_xcon_markdown`으로 fence와 SKETCH parser 통과 여부를 확인한다.
5. 통과하면 `xenesis_desk_create_xcon_markdown_from_content`로 저장하고, 필요 시 Xenesis Desk에서 연다.

`/xd xcon`은 간단한 artifact 요청에는 바로 사용할 수 있지만, 재현성과 품질이 중요한 생성은 위의 prompt 조회, 생성, 검증, 저장 순서를 우선한다. 작은 모델이나 자동 수리 루프는 `strict-sketch`부터 시작하고, 검증 실패 결과를 고칠 때는 `review-repair` prompt를 사용한다. 실패 유형별 repair loop는 `docs/mcp-xcon-repair-loop.md`를 따른다.

Xenesis Bot 화면의 starter action은 같은 listener로 메시지를 보낸다. `Current Desk`는 `xenesis_desk_active_context` 같은 MCP 컨텍스트 도구를 먼저 쓰도록 요청하고, `Active Terminal`은 활성 터미널을 찾은 뒤 `xenesis_desk_terminal_tail`로 최근 출력을 읽게 한다. `Safe File Write`는 파일 변경 전에 `xenesis_desk_preview_text_file_write`로 diff를 확인하고, 사용자 승인 후 `xenesis_desk_apply_text_file_write`로 백업과 함께 적용하며, 문제가 있으면 `xenesis_desk_restore_text_file_backup`으로 복원하는 흐름을 안내한다. 기본 백업 위치는 `XENIS_HOME/bot-backups` 아래 날짜별 폴더다.

기존 `Context`, `Dashboard`, `Sketch`, `Repair` starter action도 유지된다. `Context`는 `/xd mobile` 명령이고, 나머지는 dashboard-workflow, xcon-sketch, review-repair artifact 요청으로 들어가 `xenesis_desk_gateway` rewrite와 도구 호출 흐름을 그대로 사용한다.

터미널 탭의 컨텍스트 메뉴에서는 `Send selection to Xenesis Bot`, `Send recent output to Xenesis Bot`으로 선택 영역이나 최근 200줄을 Bot에 보낼 수 있다. 열린 파일 탭의 컨텍스트 메뉴에서는 `Send to Xenesis Bot`으로 로컬/원격 파일 참조를 Bot에 보낼 수 있다. 파일 참조는 즉시 쓰기 작업이 아니며, 로컬 텍스트 파일 수정은 preview/apply/restore MCP 도구 흐름을 거쳐야 한다.

Hermes `xenesis_desk_bot` platform plugin은 메시지 metadata의 `artifacts`를 bridge payload로 전달한다. Xenesis Bot은 이를 artifact action 버튼으로 표시한다. 각 artifact는 `Open`, `Focus`, `Reveal`, `Copy path` 버튼을 제공하며, 파일 경로가 있는 `Open`/`Focus` action은 기존 listener로 `/xd open "<path>"` 또는 artifact command를 보내 `xenesis_desk_gateway` open-file 경로를 재사용한다.

`xenesis_desk_gateway`는 XCON 생성 도구 결과를 `post_tool_call` hook에서 세션별로 기억하고, Xenesis Bot 플랫폼의 최종 응답에는 `transform_llm_output` hook으로 hidden artifact marker를 붙인다. Xenesis Desk bridge는 이 marker를 content에서 제거한 뒤 artifact action metadata로 변환하므로 Hermes core metadata hook 없이도 Bot 버튼이 생성된다.

승인이 필요한 Hermes 작업은 Bot 메시지에 approval card로 표시된다. card의 승인 버튼은 `/approve once`, 거부 버튼은 `/deny`를 Xenesis Bot listener로 보내며, Hermes core가 아니라 기존 gateway approval queue와 `xenesis_desk_bot` platform plugin metadata 전달만 사용한다.

`xenesis_desk_bot` platform plugin은 `send_exec_approval`을 구현해 Hermes gateway의 rich approval 경로를 우선 사용한다. 이 경우 fallback text-send 대신 명령, 사유, approval card metadata가 하나의 Bot 메시지로 bridge에 전달된다.

Hermes 진행 상태는 `send_or_update_status`를 구현한 `xenesis_desk_bot` platform plugin이 `/bot/status`로 전달한다. Xenesis Desk는 이를 Bot status line에 반영하므로 진행 상태가 transcript 메시지로 누적되지 않는다.

Xenesis Bot 자체를 위해 `hermes plugins enable xenesis_desk_bot`을 실행하지 않는다.

### 4. bridge URL과 token 설정

권장 방식은 Xenesis Desk를 먼저 실행하고, Hermes가 Xenesis Desk bridge state 파일을 읽게 두는 것이다. 기본 state 파일 위치를 그대로 쓰면 보통 별도 설정 없이 동작한다.

명시적으로 설정할 때:

```powershell
$env:XENIS_MCP_BRIDGE_URL="http://127.0.0.1:3847"
$env:XENIS_MCP_BRIDGE_TOKEN="<bridge-token>"
```

개발 실행 중이면 실제 bridge가 `3848`일 수 있다.

```powershell
$env:XENIS_MCP_BRIDGE_URL="http://127.0.0.1:3848"
```

state 파일을 직접 지정할 수도 있다.

```powershell
$env:XENIS_MCP_STATE_FILE="$env:USERPROFILE\.xenis\mcp\bridge.json"
```

### 5. Xenesis Bot 입력 listener 설정

Hermes `xenesis_desk_bot` 플랫폼은 Xenesis Bot 패널에서 보낸 user 메시지를 받기 위해 loopback HTTP listener를 연다.

기본값:

```powershell
$env:XENIS_BOT_LISTEN_HOST="127.0.0.1"
$env:XENIS_BOT_LISTEN_PORT="3859"
$env:XENIS_BOT_INPUT_URL="http://127.0.0.1:3859/message"
```

`XENIS_BOT_INPUT_URL`은 Hermes가 Xenesis Desk로 보낼 session payload에 포함된다. Xenesis Bot 패널의 입력창은 이 URL로 POST한다.

### 6. user allow-list 설정

Xenesis Bot 패널은 기본 user id로 `xenesis`를 보낸다.

현재 플러그인은 `XENIS_BOT_ALLOWED_USERS`가 비어 있고 `XENIS_BOT_ALLOW_ALL_USERS`도 false이면 기본으로 `xenesis`를 허용한다. 운영 환경에서 명시하고 싶으면 다음처럼 설정한다.

```powershell
$env:XENIS_BOT_ALLOWED_USERS="xenesis"
```

여러 사용자를 허용하려면 comma-separated 형식으로 쓴다.

```powershell
$env:XENIS_BOT_ALLOWED_USERS="xenesis,operator"
```

완전 개방:

```powershell
$env:XENIS_BOT_ALLOW_ALL_USERS="true"
```

## 보안/운영 체크리스트

- 기본값처럼 `XENIS_BOT_LISTEN_HOST=127.0.0.1`을 유지한다. 외부 IP나 `0.0.0.0`에 바인딩해야 한다면 방화벽, reverse proxy, user allow-list를 먼저 설계한다.
- `XENIS_BOT_ALLOW_ALL_USERS=true`는 로컬 개발용 예외로만 사용한다. 운영 환경에서는 `XENIS_BOT_ALLOWED_USERS=xenesis`처럼 필요한 user id만 허용한다.
- `XENIS_MCP_BRIDGE_TOKEN`은 bridge state 파일이나 안전한 환경 변수에서만 읽게 하고, 로그/문서/저장소에 직접 기록하지 않는다.
- `XENIS_MCP_BRIDGE_URL`은 Hermes가 Xenesis Desk로 보내는 URL이고, `XENIS_BOT_INPUT_URL`은 Xenesis Desk가 Hermes로 보내는 URL이다. 두 값을 바꾸면 404 또는 무응답이 난다.
- `/xd context-actions`로 생성되는 action token은 `ACTION_TOKEN_TTL_SECONDS` 기준 600초 동안만 유효하고, 실행 중/사용 완료/만료 상태가 분리된다. 만료되면 `/xd context-actions`를 다시 호출한다.
- 플러그인을 동기화한 뒤에는 Hermes gateway를 재시작한다. 실행 중인 gateway는 이전 plugin copy를 계속 사용할 수 있다.

릴리즈 검증 때는 `docs/xenesis-bot-hermes-release-checklist.md`의 WSL2 E2E 체크리스트를 함께 수행한다.

## 권장 실행 순서

PowerShell 기준:

```powershell
# 1. Xenesis Desk 실행
cd "<XENESIS_DESK_ROOT>"
npm run dev
```

다른 터미널에서:

```powershell
# 2. Hermes 환경 설정
$env:XENIS_BOT_ENABLED="true"
$env:XENIS_MCP_BRIDGE_URL="http://127.0.0.1:3848"
$env:XENIS_BOT_INPUT_URL="http://127.0.0.1:3859/message"
$env:XENIS_BOT_ALLOWED_USERS="xenesis"

# bridge token이 필요한 경우
$env:XENIS_MCP_BRIDGE_TOKEN="<bridge-token>"

# 3. Hermes Gateway 실행
cd "<Hermes repo root>"
hermes gateway run
```

패키지 Xenesis Desk를 쓰면 `XENIS_MCP_BRIDGE_URL`은 보통 `http://127.0.0.1:3847`이다. 실제 값은 `%USERPROFILE%\.xenis\mcp\bridge.json`에서 확인한다.

## 동작 확인

1. Xenesis Desk에서 `도구` -> `Xenesis Bot`을 연다.
2. Hermes gateway 로그에 `xenesis_desk_bot` 플랫폼이 연결됐는지 확인한다.
3. Xenesis Bot 입력창에 메시지를 보낸다.
4. Hermes 응답이 Xenesis Bot 패널에 Markdown으로 표시되는지 확인한다.
5. 응답에 다음 같은 fence가 포함되면 실시간 렌더링되는지 확인한다.

````markdown
```xcon-sketch
screen "Demo" 320x180
  title: label "Hello Xenesis Bot" at 20 24 240 32
```
````

## 문제 해결

### `Unauthorized user: xenesis (Xenesis Desk) on xenesis_desk_bot`

Hermes Gateway가 Xenesis Bot 입력 사용자를 허용하지 않은 상태다.

해결:

```powershell
$env:XENIS_BOT_ALLOWED_USERS="xenesis"
```

또는:

```powershell
$env:XENIS_BOT_ALLOW_ALL_USERS="true"
```

환경변수 변경 후 Hermes gateway를 재시작한다.

### `HTTP Error 404: Not Found` during send

Hermes가 `/bot/message`, `/bot/stream`, `/bot/final`을 호출했는데 대상 서버가 그 endpoint를 모르는 상태다.

주요 원인:

- `XENIS_MCP_BRIDGE_URL`이 `3859` 또는 `/message`로 잘못 설정됨
- Xenesis Desk가 오래된 main process로 실행 중이라 `/bot/*` endpoint가 없음
- 개발 실행인데 bridge URL을 `3847`로 고정함

확인:

```powershell
echo $env:XENIS_MCP_BRIDGE_URL
echo $env:XENIS_BOT_INPUT_URL
```

정상 예시:

```text
XENIS_MCP_BRIDGE_URL = http://127.0.0.1:3847
XENIS_BOT_INPUT_URL  = http://127.0.0.1:3859/message
```

개발 실행이면 `XENIS_MCP_BRIDGE_URL`이 `http://127.0.0.1:3848`일 수 있다.

### Bot 패널이 도구/커맨드 팔레트에 없음

Xenesis Desk 앱이 최신 extension manifest를 읽지 않은 상태일 수 있다.

조치:

1. Xenesis Desk 앱 재시작
2. Extensions reload
3. `도구` 또는 `Ctrl+K`에서 `Xenesis Bot` 검색

### Xenesis Desk에서 보낸 메시지가 Hermes에 도착하지 않음

확인:

- Hermes gateway가 실행 중인지
- `XENIS_BOT_LISTEN_PORT`가 `3859`인지
- `XENIS_BOT_INPUT_URL`이 `http://127.0.0.1:3859/message`인지
- 다른 프로세스가 `3859` 포트를 점유하지 않았는지

### WSL2에서 Hermes를 실행하는 경우

Windows Xenesis Desk와 WSL2 Hermes의 `127.0.0.1`은 같은 네트워크 네임스페이스가 아닐 수 있다.

이 경우:

- `XENIS_MCP_BRIDGE_URL`에는 Windows host에서 접근 가능한 주소를 넣는다.
- `XENIS_BOT_INPUT_URL`에는 Xenesis Desk Windows renderer가 접근 가능한 Hermes listener 주소를 넣는다.
- Windows 방화벽과 loopback 접근 정책을 확인한다.

## 설정 키 요약

| 변수 | 기본값 | 설명 |
|---|---|---|
| `XENIS_BOT_ENABLED` | unset | `true`면 Hermes `xenesis_desk_bot` 플랫폼 활성화 |
| `XENIS_MCP_BRIDGE_URL` | `http://127.0.0.1:3847` 또는 state file | Hermes -> Xenesis Desk bridge URL |
| `XENIS_MCP_BRIDGE_TOKEN` | state file token | Xenesis Desk bridge bearer token |
| `XENIS_MCP_STATE_FILE` | `%USERPROFILE%\.xenis\mcp\bridge.json` | bridge URL/token을 읽을 state 파일 |
| `XENIS_BOT_INPUT_URL` | `http://127.0.0.1:3859/message` | Xenesis Bot 패널이 user message를 POST할 Hermes URL |
| `XENIS_BOT_LISTEN_HOST` | `127.0.0.1` | Hermes Bot listener bind host |
| `XENIS_BOT_LISTEN_PORT` | `3859` | Hermes Bot listener bind port |
| `XENIS_BOT_ALLOWED_USERS` | `xenesis` | inbound user id allow-list |
| `XENIS_BOT_ALLOW_ALL_USERS` | `false` | 모든 inbound user id 허용 |

## 관련 파일

- Xenesis Desk bridge endpoint: `src/main/index.ts`
- Xenesis Bot UI: `src/renderer/extensions/xenesis-desk.core-tools/panes/XenisBotPane.tsx`
- Xenesis Bot command manifest: `extensions/xenesis-desk.core-tools/plugin.json`
- Hermes plugin sync script: `scripts/syncHermesPlugins.mjs`
- Hermes release checklist: `docs/xenesis-bot-hermes-release-checklist.md`
- Hermes Bot platform plugin source: `providers/hermes/plugins/platforms/xenesis_desk_bot/adapter.py`
- Hermes Bot platform manifest source: `providers/hermes/plugins/platforms/xenesis_desk_bot/plugin.yaml`
- Hermes Xenesis Desk gateway plugin source: `providers/hermes/plugins/xenesis_desk_gateway/__init__.py`
