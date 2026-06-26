# Xenesis Bot Hermes Release Checklist

이 체크리스트는 Windows Xenesis Desk 릴리스 앱과 WSL2 Hermes 설치본을 함께 검증할 때 사용한다. 목표는 Hermes core 파일을 수정하지 않고 `xenesis_desk_gateway` 일반 플러그인과 `xenesis_desk_bot` platform plugin만으로 연동이 끝까지 동작하는지 확인하는 것이다.

## 1. 릴리스 산출물 확인

- [ ] Xenesis Desk 패키지 앱을 새 빌드로 설치하거나 교체한다.
- [ ] 실행 중인 Xenesis Desk 앱을 완전히 종료했다가 다시 연다.
- [ ] `%USERPROFILE%\.xenis\mcp\bridge.json`의 `bridgeToken`과 `bridgeUrl`이 새로 갱신됐는지 확인한다.
- [ ] 패키지 리소스 `app.asar` 안에 Bot UI와 bridge 코드가 들어갔는지 확인한다.

로컬 `release\win-unpacked` 산출물을 운영 폴더로 교체할 때는 먼저 dry-run으로 실행 중인 설치본을 감지한다. `replace-release-win-unpacked.ps1`는 실행 중인 Xenesis Desk 프로세스를 종료하지 않으며, 설치 경로가 아직 실행 중이면 실제 교체를 거부한다.

```powershell
cd "<XENESIS_DESK_ROOT>"
pwsh -NoProfile -File scripts/replace-release-win-unpacked.ps1 -DryRun

# Xenesis Desk를 외부에서 완전히 종료한 뒤에만 실행한다.
pwsh -NoProfile -File scripts/replace-release-win-unpacked.ps1 -StartApp
```

통과 기준:

- `-DryRun` 결과가 `blocked: false` 또는 `runningProcessCount: 0`이다.
- 실제 교체 시 기존 설치 폴더가 `xenesis-desk-backups` 아래로 이동된다.
- 복사 실패 시 가능한 범위에서 rollback이 적용된다.
- `-StartApp`을 붙이면 교체 후 새 Xenesis Desk가 시작된다.

```powershell
rg -a -n "xenesis-artifacts|artifactFocusCommand|xdbot-artifact-actions|Copy path|visual-cockpit" `
  "<XENESIS_DESK_ROOT>\release\win-unpacked\resources\app.asar"
```

통과 기준:

- `hidden artifact marker` 파서인 `xenesis-artifacts`가 있다.
- `Open`, `Focus`, `Reveal`, `Copy path` artifact 버튼 코드가 있다.
- Xenesis Desk Bot 요청 metadata에 `visual-cockpit`이 있다.

## 2. 패키지 renderer trace smoke

릴리스 앱을 교체한 뒤 Bot XCON/SKETCH 렌더링과 `/renderer-performance-trace` summary가 실제 패키지 앱에서 동작하는지 확인한다. 이 스크립트는 Xenesis Desk를 시작하거나 종료하지 않고 현재 실행 중인 bridge만 호출한다.

기본 운영 앱을 검증할 때:

```powershell
cd "<XENESIS_DESK_ROOT>"
pwsh -NoProfile -File scripts/verify-release-trace-smoke.ps1 `
  -BridgeStatePath "$env:USERPROFILE\.xenis\mcp\bridge.json" `
  -RequirePackaged
```

격리된 `XENIS_HOME`으로 패키지 smoke 앱을 띄운 경우에는 해당 home의 bridge state를 직접 지정한다.

```powershell
pwsh -NoProfile -File scripts/verify-release-trace-smoke.ps1 `
  -BridgeStatePath "<ISOLATED_XENIS_HOME>\mcp\bridge.json" `
  -RequirePackaged
```

릴리스 앱 교체 전후 trace를 직접 확인해야 할 때만 `-KeepTraceOn`을 붙인다. 일반 검증에서는 스크립트가 종료 시 trace를 끈다.

통과 기준:

- 스크립트 JSON 결과의 `ok`가 `true`다.
- `summary`에 `xdbot/message-rendered`가 있다.
- `summary`에 `markdown-xcon/markdown-rendered`가 있다.
- `summary`에 `markdown-xcon/xcon-block-render`가 있다.
- `bridgeUrl`은 검증 대상 bridge를 가리킨다. 격리 smoke 앱이면 `-BridgeStatePath`가 격리 `XENIS_HOME` 아래 파일이어야 한다.

## 3. WSL2 Hermes 플러그인 동기화

WSL2 Hermes 기본 대상 경로는 현재 운영 기준으로 `<HERMES_ROOT>`이다. 다른 checkout을 쓰면 이 값을 실제 Hermes root로 바꾼다.

```powershell
cd "<XENESIS_DESK_ROOT>"
node scripts/syncHermesPlugins.mjs --target "<HERMES_ROOT_WSL_UNC>" --dry-run
node scripts/syncHermesPlugins.mjs --target "<HERMES_ROOT_WSL_UNC>"
```

복사 대상:

- `plugins/xenesis_desk_gateway`
- `plugins/platforms/xenesis_desk_bot`

통과 기준:

```bash
cd <HERMES_ROOT>
venv/bin/hermes plugins list | grep xenesis_desk_gateway
venv/bin/python -m py_compile \
  plugins/platforms/xenesis_desk_bot/adapter.py \
  plugins/xenesis_desk_gateway/__init__.py \
  plugins/xenesis_desk_gateway/schemas.py \
  plugins/xenesis_desk_gateway/constants.py
```

- `hermes plugins list`에서 `xenesis_desk_gateway`가 enabled다.
- `xenesis_desk_bot`은 `hermes plugins enable xenesis_desk_bot` 대상이 아니다. gateway platform plugin으로 로드돼야 한다.
- `py_compile`이 실패하지 않는다.

## 4. WSL2 네트워크와 토큰

WSL2에서 Windows Xenesis Desk bridge로 접근할 때 `127.0.0.1`을 그대로 믿지 않는다. 현재 환경의 Windows host 예시는 `172.22.64.1`이다.

```bash
WIN_HOST_IP=$(awk '/nameserver/{print $2; exit}' /etc/resolv.conf)
STATE="/mnt/c/Users/<user>/.xenis/mcp/bridge.json"
TOKEN=$(python3 -c "import json; print(json.load(open('$STATE'))['bridgeToken'])")

export XENIS_MCP_STATE_FILE="$STATE"
export XENIS_MCP_BRIDGE_URL="http://$WIN_HOST_IP:3847"
export XENIS_MCP_BRIDGE_TOKEN="$TOKEN"
```

통과 기준:

```bash
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$XENIS_MCP_BRIDGE_URL/state"
```

- 응답에 `"ok": true`가 있다.
- `app.version`이 새 Xenesis Desk 릴리스 버전이다.
- `bridgeToken`을 로그나 문서에 남기지 않는다.

WSL2에서 bridge가 닫혀 있으면 Windows portproxy를 확인한다.

```powershell
netsh interface portproxy show v4tov4
```

필요한 proxy:

- `172.22.64.1:3847 -> 127.0.0.1:3847`
- `172.22.64.1:3859 -> 127.0.0.1:3859`

## 5. Gateway 재시작과 플랫폼 연결

플러그인을 동기화한 뒤에는 Hermes gateway를 재시작한다. 실행 중인 gateway는 이전 plugin copy를 계속 사용할 수 있다.

```bash
cd <HERMES_ROOT>
venv/bin/hermes gateway restart
# 또는 실행형 환경이면 기존 gateway run 프로세스를 종료한 뒤 다시 실행
venv/bin/hermes gateway run
```

통과 기준:

```bash
tail -n 120 ~/.hermes/logs/gateway.log
```

- `xenesis_desk_bot connected`가 보인다.
- `Gateway running with 2 platform(s)` 또는 운영 설정에 맞는 platform 수가 보인다.
- `XENIS_BOT_INPUT_URL`은 `http://127.0.0.1:3859/message` 계열이다.
- `XENIS_BOT_ALLOWED_USERS`는 `xenesis`를 포함한다.

## 6. Bot 입력과 visual cockpit E2E

Xenesis Desk Bot에서 `Dashboard` starter action을 누르거나 같은 payload를 listener로 보낸다.

```powershell
$body = @{
  sessionId = "xenesis-bot"
  text = "Create a dashboard-workflow XCON artifact from the current Xenesis Desk context."
  userId = "xenesis"
  userName = "Xenesis Desk"
  xenesis_desk = @{
    surface = "bot"
    mode = "visual-cockpit"
    artifactFormats = @("markdown", "xcon", "xcon-sketch")
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:3859/message" `
  -ContentType "application/json" `
  -Body $body
```

통과 기준:

- gateway log에 `platform=xenesis_desk_bot` inbound message가 보인다.
- 메시지가 `visual-cockpit` 요청으로 rewrite된다.
- 위험 작업이 있으면 Bot에 approval card가 뜬다.
- `/approve once` 승인 뒤 작업이 계속된다.
- `%USERPROFILE%\.xenis\exports\dashboards\xenesis-visual-cockpit.md` 같은 Markdown artifact가 생성된다.
- Xenesis Desk bridge diagnostics에 `MCP created XCON Markdown from content`와 `MCP opened file`이 남는다.

### Prompt pipeline smoke

XCON/SKETCH 생성 품질은 `docs/mcp-prompt-usage.md`와 `docs/mcp-prompt-quality-matrix.md`의 기준을 따른다. 릴리스 검증에서는 visual cockpit E2E와 별도로 prompt pipeline도 확인한다.

권장 요청:

```text
/xd prompt strict-sketch Create a compact release status card for Xenesis Desk.
/xd xcon Create a dashboard-workflow artifact from the current Desk context.
```

통과 기준:

- Hermes 또는 MCP 로그에서 `xenesis_desk_get_xcon_prompt` 호출 흐름이 확인된다.
- 생성된 Markdown은 저장 전에 `xenesis_desk_validate_xcon_markdown`으로 검증된다.
- 검증이 통과한 artifact는 `xenesis_desk_create_xcon_markdown_from_content`로 저장된다.
- 작은 smoke artifact는 `strict-sketch` 기준을 통과한다.
- 검증 실패가 있으면 `docs/mcp-xcon-repair-loop.md` 기준에 따라 `review-repair` 또는 `strict-sketch`로 수리 요청을 보낸다.
- Bot 화면에는 hidden artifact marker가 노출되지 않고 artifact action만 표시된다.

## 7. Artifact action 확인

Bot 응답 아래 artifact card를 확인한다.

- [ ] `Open` 버튼이 있다.
- [ ] `Focus` 버튼이 있다.
- [ ] `Reveal` 버튼이 있다.
- [ ] `Copy path` 버튼이 있다.
- [ ] hidden artifact marker가 화면 본문에 노출되지 않는다.

서버 측 smoke:

```powershell
$artifactPath = "$env:USERPROFILE\.xenis\exports\dashboards\xenesis-visual-cockpit.md"
$body = @{
  sessionId = "xenesis-bot"
  text = "/xd open `"$artifactPath`""
  userId = "xenesis"
  userName = "Xenesis Desk"
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:3859/message" `
  -ContentType "application/json" `
  -Body $body
```

통과 기준:

- bridge `/state`의 `openFiles`에 `xenesis-visual-cockpit.md`가 있다.
- `Reveal`은 Windows 탐색기에서 파일 위치를 연다.
- `Copy path` 후 붙여넣기 값이 실제 artifact 경로다.

## 8. 로그 증거

릴리스 검증 기록에는 값 자체보다 통과 증거를 남긴다.

- [ ] `hermes plugins list`에서 `xenesis_desk_gateway enabled`
- [ ] `py_compile_ok`
- [ ] `verify-release-trace-smoke.ps1` 결과 `ok: true`
- [ ] trace summary `xdbot/message-rendered`
- [ ] trace summary `markdown-xcon/markdown-rendered`
- [ ] trace summary `markdown-xcon/xcon-block-render`
- [ ] WSL2 bridge `/state` 응답 `ok: true`
- [ ] `xenesis_desk_bot connected`
- [ ] `MCP Bot event: status`
- [ ] `MCP Bot event: message`
- [ ] `MCP created XCON Markdown from content`
- [ ] `MCP opened file: xenesis-visual-cockpit.md`
- [ ] Bot UI에서 artifact action 4개 확인

남기지 말아야 할 것:

- `XENIS_MCP_BRIDGE_TOKEN` 실제 값
- Telegram/API token
- 사용자 개인 경로가 외부 공유 문서에 필요한 수준을 넘는 상세값

## 9. Rollback

문제가 있으면 먼저 Hermes core를 되돌리지 않는다. 이 연동은 plugin copy와 Xenesis Desk 패키지 산출물로 분리되어 있다.

1. Hermes gateway를 중지한다.
2. WSL2 Hermes의 `plugins/xenesis_desk_gateway`와 `plugins/platforms/xenesis_desk_bot`을 이전 릴리스 플러그인 백업으로 되돌린다.
3. Xenesis Desk 앱을 이전 릴리스로 교체한다.
4. `%USERPROFILE%\.xenis\mcp\bridge.json`이 새 앱 실행 후 다시 생성됐는지 확인한다.
5. gateway를 다시 시작하고 `/xd status`, `/xd mobile`, `/xd open "<known file>"`만 먼저 검증한다.

rollback 뒤에도 `3859/message`가 응답하지 않으면 gateway platform 설정을 확인하고, `3847/state`가 실패하면 portproxy와 bridge token을 먼저 확인한다.
