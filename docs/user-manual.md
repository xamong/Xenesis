# Xenesis Desk 사용자 매뉴얼

이 문서는 Xenesis Desk를 처음 실행하는 사용자가 폴더 열기, 터미널 실행, 파일 미리보기, 원격 파일 작업, 워크스페이스 저장, MCP/Bot 연동까지 자연스럽게 사용할 수 있도록 작성한 사용 설명서입니다.

제품명은 설치 파일과 앱 내부에서는 `Xenesis Desk`로 표시될 수 있고, 이 문서에서는 짧게 `Xenesis Desk`라고 부릅니다.

## 1. Xenesis Desk란?

Xenesis Desk는 개발 작업에 자주 필요한 기능을 한 화면에 모아 둔 데스크톱 작업대입니다.

- 로컬 파일 탐색과 즐겨찾기
- PowerShell, CMD, PowerShell 7, WSL 터미널
- SSH, TELNET 원격 터미널
- FTP, FTPS, SFTP 원격 파일 탐색과 전송
- Markdown, Mermaid, XCON/SKETCH, 코드, 이미지, PDF, DOCX, XLSX, PPTX 미리보기
- 도킹 레이아웃 저장과 복원
- 워크스페이스 파일 저장
- 확장 기능 관리
- MCP와 Xenesis Bot을 통한 외부 에이전트 연동
- 진단/로그 센터

처음에는 폴더 하나를 열고, 터미널을 하나 실행하고, 파일을 더블클릭해 보는 것부터 시작하면 됩니다.

## 2. 처음 시작

### 2.1 앱을 처음 실행하면

처음 실행 시 `Xenesis Desk 시작` 온보딩 탭이 열립니다. 온보딩은 기본 Desk 사용법을 익히는 `학습` 모드와 데모 영상 제작에 쓰는 `데모` 모드를 제공합니다.

온보딩은 우선 순수 Desk 기본 기능만 다룹니다. AI Provider, Xenesis Agent, MCP, Gateway, Bot 연동은 이후 AI/Automation Track에서 별도로 다룹니다.

온보딩에서 차례대로 확인하는 작업은 다음과 같습니다.

| 버튼 | 용도 |
|---|---|
| 샘플 준비 / 폴더 선택 | 파일 탐색기의 시작 폴더와 새 터미널의 기본 작업 폴더를 정합니다. |
| 터미널 열기 | 기본 셸로 터미널 탭을 엽니다. |
| 파일 열기 | 로컬 파일을 선택해서 적절한 뷰어로 엽니다. |
| 바둑판 정렬 | 열린 패인과 탭을 보기 좋게 정리합니다. |
| Command Center 열기 | 선택한 터미널로 명령을 보내는 화면을 확인합니다. |
| 워크스페이스 설정 / 진단 열기 | 설정과 앱, 터미널, 원격 파일, 확장 로그를 확인합니다. |
| 워크스페이스 저장 / 열기 | 현재 작업 구성을 저장하고 다시 불러옵니다. |

데모용 샘플 워크스페이스는 온보딩 탭을 여는 것만으로 자동 생성되지 않습니다. `샘플 준비`를 눌렀을 때만 `XENIS_HOME/onboarding/basic-desk` 아래에 생성되고, 같은 버튼 흐름에서 현재 작업 폴더로 설정됩니다. 필요하면 `샘플 초기화`로 해당 샘플만 삭제한 뒤 다시 만들 수 있습니다.

`데모 실행`은 각 단계의 화면 캡처와 설명을 `XENIS_HOME/onboarding-runs` 아래에 저장합니다. 온보딩 화면 안에서 최신 데모 결과의 단계별 캡처와 설명을 바로 확인할 수 있고, `최근 데모 결과 열기`로 실행 폴더를 열 수 있습니다. CR 브릿지 기반 온보딩 route 테스트는 `XENIS_HOME/mcp/cr-smoke/cr-onboarding-demo-route.json` 결과, `XENIS_HOME/mcp/cr-smoke/cr-onboarding-demo-route.md` 스토리보드, `XENIS_HOME/mcp/cr-smoke/cr-onboarding-demo-route.xcon.md` Demo Lab 프리셋을 갱신하며, 온보딩 화면의 `CR 데모 route 스토리보드`에서 최신 JSON, 스토리보드 문서, Demo Lab 프리셋, 실행 폴더, 장면 캡처를 바로 열 수 있습니다. 첫 실행 데모 전체 흐름은 `npm run demo:cr:first-run -- --json-output=dev`로 실행하며, Basic Desk 온보딩, Xenesis Agent 상태 확인, Gowoori 아티팩트 생성, 최종 캡처 handoff를 `XENIS_HOME/mcp/cr-smoke/cr-first-run-viral-demo-route.json`에 저장합니다. 더 이상 필요 없으면 `데모 결과 정리`로 저장된 데모 결과를 삭제할 수 있습니다.

온보딩이 더 이상 필요 없으면 `다시 보지 않기`를 누르면 됩니다. 다시 보고 싶을 때는 상단 `도구` 메뉴에서 온보딩을 열 수 있습니다.

### 2.2 가장 기본적인 사용 순서

1. 상단 툴바의 파일 탐색기 버튼을 눌러 왼쪽 탐색기를 표시합니다.
2. 왼쪽 파일 탐색기에서 폴더 버튼을 눌러 작업 폴더를 선택합니다.
3. 상단 `터미널` 드롭다운에서 PowerShell, CMD, pwsh, WSL 중 하나를 실행합니다.
4. 파일 탐색기에서 파일을 더블클릭합니다.
5. 중앙 도킹 영역에 열린 탭에서 내용을 확인하거나 편집합니다.
6. 작업 상태를 보관하려면 상단 우측의 `WS+`로 워크스페이스를 저장합니다.

### 2.3 기본 저장 위치

Xenesis Desk는 사용자 데이터와 생성물을 앱 실행 폴더가 아니라 Xenesis Desk 홈 아래에 저장합니다.

기본 홈 위치:

```text
%USERPROFILE%\.xenis
```

`XENIS_HOME` 환경 변수를 설정하면 해당 경로를 Xenesis Desk 홈으로 사용합니다.

주요 하위 폴더:

| 폴더 | 용도 |
|---|---|
| `captures` | 화면 캡처 이미지 |
| `exports` | MCP, Bot, 설정 내보내기 등 생성 파일 |
| `workspaces` | 워크스페이스 저장/열기 기본 위치 |
| `mcp` | MCP bridge state와 관련 설정 |
| `xenesis` | Xenesis Agent 세션, artifact, 보고서, 메모리 상태 |
| `extensions` | 사용자 확장 기본 위치 |

## 3. 화면 구성

Xenesis Desk는 VS Code처럼 여러 탭과 패널을 도킹해서 쓰는 구조입니다.

### 3.1 상단 툴바

상단 툴바에는 자주 쓰는 기능이 있습니다.

| 영역 | 설명 |
|---|---|
| 파일 탐색기 토글 | 왼쪽 파일 탐색 영역을 보이거나 숨깁니다. |
| 터미널 | 로컬 셸, SSH, TELNET 프로필을 선택해 새 터미널 탭을 엽니다. |
| 브라우저 | 내장 브라우저 탭을 엽니다. |
| 파일 열기 | 로컬 파일을 직접 선택해서 엽니다. |
| 도구 | 확장 명령, Xenesis Bot, 온보딩, 진단/로그 센터, 설정 등을 엽니다. |
| 창 크기/위치 | 미리 저장한 창 크기와 위치 프리셋을 적용합니다. |
| 탭 정렬 | 열린 탭을 가로, 세로, 바둑판 형태로 정렬하거나 합칩니다. |
| 글꼴 크기 | 터미널과 일부 뷰어의 기본 글꼴 크기를 조정합니다. |
| 테마 | 라이트/다크 테마를 전환합니다. |
| 레이아웃 저장/불러오기/초기화 | 현재 도킹 배치를 저장, 복원, 초기화합니다. |
| WS+ / WS | 워크스페이스 저장과 최근 워크스페이스 열기를 수행합니다. |
| 커맨드 팔레트 | 명령을 검색해서 실행합니다. 기본 단축키는 `Ctrl+K`입니다. |
| 설정 | 전체 설정 화면을 엽니다. |

### 3.2 명령 입력 바

툴바 아래에는 터미널 명령 입력 바가 있습니다.

- 활성 터미널이 있으면 입력한 명령을 해당 터미널로 보냅니다.
- `Enter`로 전송합니다.
- 위/아래 방향키로 최근 명령 이력을 탐색합니다.
- 단축 명령을 등록해 자주 쓰는 명령을 빠르게 보낼 수 있습니다.

### 3.3 왼쪽 영역

왼쪽 영역은 탭으로 나뉩니다.

| 탭 | 설명 |
|---|---|
| 즐겨찾기 | 자주 여는 파일, 폴더, 탭을 모아 둡니다. |
| 캡처 | 화면 영역 캡처 결과를 확인합니다. 탭 헤더의 캡처 아이콘 버튼으로 바로 캡처할 수 있습니다. |
| FTP | FTP, FTPS, SFTP 원격 파일 탐색기를 표시합니다. |

로컬 파일 탐색기는 기본 작업 흐름의 중심이므로 항상 왼쪽 영역에서 사용할 수 있습니다.

### 3.4 중앙 도킹 영역

중앙 영역에는 파일, 터미널, 브라우저, 설정, Xenesis Bot, 확장 패널 등이 탭으로 열립니다.

탭은 드래그해서 위치를 바꿀 수 있고, 필요한 경우 다른 도킹 영역이나 플로팅 창으로 분리할 수 있습니다.

## 4. 도킹과 레이아웃

### 4.1 탭 이동

열린 탭을 드래그하면 다른 위치로 이동할 수 있습니다.

- 중앙 문서 영역으로 이동
- 왼쪽, 오른쪽, 위, 아래 패널로 이동
- 다른 탭 그룹과 합치기
- 플로팅 창으로 분리

작업 중 화면이 복잡해졌다면 상단 우측의 레이아웃 초기화 버튼으로 기본 배치에 가깝게 되돌릴 수 있습니다.

### 4.2 레이아웃 저장과 불러오기

상단 우측의 레이아웃 버튼은 현재 도킹 배치만 저장합니다.

| 버튼 | 용도 |
|---|---|
| 레이아웃 저장 | 현재 탭 배치와 패널 상태를 저장합니다. |
| 레이아웃 불러오기 | 저장된 도킹 배치를 복원합니다. |
| 레이아웃 초기화 | 도킹 상태를 초기화합니다. |

레이아웃은 화면 배치 중심입니다. 프로젝트 폴더, 터미널/FTP 프로필, 창 프리셋까지 함께 저장하려면 워크스페이스를 사용합니다.

## 5. 파일 탐색기

### 5.1 폴더 선택

왼쪽 파일 탐색기에서 폴더 선택 버튼을 누르면 작업 루트 폴더를 지정할 수 있습니다.

작업 루트 폴더는 다음 기능에 영향을 줍니다.

- 파일 탐색기의 시작 위치
- 새 터미널의 기본 작업 폴더
- 워크스페이스 저장 시 기본 프로젝트 이름

### 5.2 파일 열기

파일을 더블클릭하면 확장자에 맞는 패널로 열립니다.

| 파일 종류 | 열리는 패널 |
|---|---|
| `.md`, `.markdown` | Markdown 뷰어/편집기 |
| `.mmd` | Mermaid 뷰어 |
| `.xcon`, `.xconj`, `.xcon.json`, `.xcon.xml`, `.xcon-workflow`, `.workflow` 등 | XCON 뷰어 또는 코드 편집기 |
| `.js`, `.ts`, `.json`, `.html`, `.css`, `.py` 등 | 코드 편집기 |
| `.png`, `.jpg`, `.gif`, `.webp`, `.svg` 등 | 이미지 뷰어 |
| `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.hwp` 등 | 문서 미리보기 |
| 그 외 바이너리 | 헥스 뷰어 |

### 5.3 우클릭 메뉴

파일이나 폴더에서 우클릭하면 다음 작업을 할 수 있습니다.

- 열기
- 루트 폴더로 설정
- 터미널에서 열기
- Windows 탐색기에서 보기
- 경로 복사
- 즐겨찾기에 추가

### 5.4 드래그 앤 드롭

로컬 파일 탐색기의 파일을 터미널로 드래그하면 파일 경로가 터미널에 입력됩니다.

로컬 파일을 원격 파일 탭으로 드래그하면 업로드 전송 큐에 추가됩니다.

## 6. 파일 보기와 편집

### 6.1 코드 편집기

코드 편집기는 CodeMirror 기반입니다.

지원하는 주요 기능:

- 구문 강조
- 줄 번호
- 검색
- 복사
- 읽기 전용 전환
- `Ctrl+S` 저장
- 새로고침으로 디스크 내용 다시 읽기

로컬 파일은 저장 시 로컬 디스크에 저장됩니다.

원격 파일을 코드 편집기로 열었다면 저장 시 해당 FTP, FTPS, SFTP 서버로 다시 업로드됩니다. 저장 가능한 원격 파일은 임시 다운로드 후 편집되는 방식이며, 저장 버튼 또는 `Ctrl+S`를 누르면 원격 저장을 시도합니다.

### 6.2 Markdown 뷰어

Markdown 뷰어는 일반 Markdown뿐 아니라 개발 문서에 필요한 렌더링 기능을 포함합니다.

지원 기능:

- GitHub Flavored Markdown
- 표, 체크박스 목록
- KaTeX 수식
- Mermaid 코드 펜스
- XCON/SKETCH 코드 펜스
- 데이터 바인딩 fixture
- 편집 후 저장

Markdown 파일도 로컬 파일이면 로컬 저장, 원격 파일이면 원격 저장이 됩니다.

### 6.3 Markdown의 XCON/SKETCH 코드 펜스

Markdown 안에서 XCON/SKETCH UI를 바로 렌더링할 수 있습니다.

기본 예:

````markdown
```xcon-sketch
screen 960x540 bg #f8fafc
title: label "Operations Dashboard" at 32,32 size 360x36
```
````

표시 방식을 바꾸고 싶으면 `mode`를 사용합니다.

````markdown
```xcon-sketch mode view
...
```

```xcon-sketch mode code
...
```

```xcon-sketch mode both
...
```
````

| mode | 동작 |
|---|---|
| `view` | 렌더링된 UI만 보여줍니다. 기본값입니다. |
| `code` | 코드 펜스로만 보여줍니다. |
| `both` | 렌더링된 UI와 코드를 함께 보여줍니다. |

`mode=both`처럼 등호 형식도 사용할 수 있습니다.

### 6.4 Markdown 데이터 바인딩

Markdown 문서 안에서 fixture 데이터를 정의하거나 외부 JSON 파일을 지정해서 문서에 값을 바인딩할 수 있습니다.

인라인 fixture 예:

````markdown
```xcon-chain-fixture
{
  "project": {
    "name": "Xenesis Desk",
    "status": "Ready"
  }
}
```

# $project.name

현재 상태: $project.status
````

외부 JSON 경로를 쓸 때는 fixture 펜스의 인자에 파일 경로를 지정합니다. 작업 파일 기준 상대 경로나 절대 경로를 사용할 수 있습니다.

````markdown
```xcon-chain-fixture ./fixtures/project.json
```

# $project.name
````

원격 Markdown 파일에서 상대 경로 fixture를 사용할 때는 원격 파일의 위치를 기준으로 읽기를 시도합니다. 실패하면 Markdown 패널에 진단 메시지가 표시됩니다.

### 6.5 Mermaid

Markdown 안의 `mermaid` 코드 펜스는 다이어그램으로 렌더링됩니다.

별도의 `.mmd` 파일을 열면 Mermaid 전용 뷰어로 열립니다.

### 6.6 문서 미리보기

문서 미리보기는 읽기 전용입니다.

| 형식 | 상태 |
|---|---|
| PDF | 지원 |
| DOCX | 지원 |
| DOC | 미지원 안내 표시 |
| XLS, XLSX, XLSM, XLSB | 지원 |
| PPTX | 지원 |
| PPT | 미지원 안내 표시 |
| HWP | 실험적 지원. 파일 구조나 폰트에 따라 실패할 수 있습니다. |
| HWPX | 현재 미지원 안내 표시 |

문서 미리보기에서 저장은 하지 않습니다. 편집이 필요한 텍스트성 파일은 코드 편집기나 Markdown 편집기로 열어야 합니다.

## 7. 터미널

### 7.1 로컬 터미널 열기

상단 `터미널` 드롭다운에서 로컬 셸을 선택하면 새 터미널 탭이 열립니다.

지원 셸:

- PowerShell
- CMD
- PowerShell 7 (`pwsh`)
- WSL

설치되어 있지 않은 셸은 사용할 수 없는 상태로 표시될 수 있습니다.

### 7.2 기본 작업 폴더

설정의 `일반` 또는 `AI 프로바이더`/로컬 CLI 영역에서 기본 작업 폴더와 새 터미널 환경을 지정할 수 있습니다.

파일 탐색기에서 폴더를 선택하거나 폴더를 터미널로 열면 해당 경로가 새 터미널의 시작 위치가 됩니다.

### 7.3 터미널 관리

`설정 > 터미널 관리`에서 로컬 셸, SSH, TELNET 프로필을 관리합니다.

로컬 셸 프로필에서 설정할 수 있는 값:

| 항목 | 설명 |
|---|---|
| 표시 이름 | 터미널 메뉴에 표시될 이름입니다. |
| 그룹 | 상단 터미널 메뉴의 하위 메뉴로 묶을 그룹입니다. |
| 셸 종류 | PowerShell, CMD, pwsh, WSL 중 선택합니다. |
| CLI 환경 | Codex, Claude Code, Gemini 등 로컬 CLI 환경을 선택합니다. Hermes는 `설정 > AI 프로바이더 > Hermes Plug-in`에서 별도로 관리합니다. |
| 시작 경로 | 터미널이 처음 열릴 폴더입니다. |
| 시작 환경 변수 | 선택한 셸과 CLI에 맞는 환경 변수를 입력합니다. |
| 시작 명령 | 터미널이 열린 뒤 자동 실행할 명령입니다. |

SSH/TELNET 프로필에서 설정할 수 있는 값:

| 항목 | 설명 |
|---|---|
| 프로토콜 | SSH 또는 TELNET |
| 호스트/포트 | 접속 대상 주소와 포트 |
| 사용자명 | 로그인 사용자 |
| 비밀번호 | 로컬 앱 설정 또는 비밀정보 저장소에 저장할 수 있습니다. |
| 개인 키 파일 | SSH 키 인증을 쓸 때 지정합니다. |
| 키 패스프레이즈 | 개인 키 암호가 있을 때 입력합니다. |
| 연결 후 명령 | 접속 후 실행할 명령입니다. |

그룹을 만들면 상단 터미널 메뉴에 그룹별 하위 메뉴가 만들어집니다. 그룹이 없으면 프로필이 바로 표시됩니다.

### 7.4 CLI 환경과 시작 명령의 차이

CLI 환경은 터미널을 시작하기 전에 준비하는 환경입니다.

예:

- Codex CLI를 PATH에 추가
- OpenAI API 키와 모델 환경 변수 주입
- Xenesis Desk MCP 설정 경로 주입

시작 명령은 터미널이 열린 뒤 실제로 입력되는 명령입니다.

예:

```powershell
codex
npm run dev
python app.py
```

즉, CLI 환경은 준비 단계이고, 시작 명령은 실행 단계입니다.

### 7.5 환경 변수 placeholder

로컬 셸 프로필에서 CLI 환경을 선택하면 시작 환경 변수 입력칸에 해당 CLI에 맞는 예시가 표시됩니다.

셸별로 환경 변수 문법이 다릅니다.

| 셸 | 예시 |
|---|---|
| PowerShell / pwsh | `$env:OPENAI_API_KEY="..."` |
| CMD | `set OPENAI_API_KEY=...` |
| WSL | `export OPENAI_API_KEY="..."` |

저장 시 Xenesis Desk가 설정을 터미널 환경으로 변환해 주입합니다.

### 7.6 터미널 세션 복원

`설정 > 워크스페이스`에서 워크스페이스나 레이아웃을 불러올 때 터미널을 다시 연결할지 선택할 수 있습니다.

옵션:

- 로컬 셸 탭 재연결
- SSH 탭 재연결
- TELNET 탭 재연결
- 복원 시 시작 명령 실행
- 복원 시 마지막 명령 재실행

원격 서버에 자동 접속하거나 명령이 자동 실행될 수 있으므로 SSH/TELNET 복원 옵션은 필요한 경우에만 켜는 것이 좋습니다.

### 7.7 터미널 묶음 명령

터미널 묶음 명령은 Command Center의 `묶음 명령` 버튼에서 여는 반복 명령 목록입니다. Wave Terminal의 Block처럼 도킹 창 자체를 뜻하는 용어가 아니라, Xenesis Desk 안에서는 여러 줄 명령과 실행 컨텍스트를 함께 저장해 다시 실행하는 명령 묶음을 의미합니다. 단축 명령과 별도로 명령, 작업 폴더, 터미널 종류, 실행 횟수 같은 실행 컨텍스트를 함께 저장할 때 사용합니다.

기본 사용 흐름:

1. 명령 입력 바에 저장할 명령을 입력합니다.
2. `묶음 명령`을 누릅니다.
3. `현재 명령 저장`을 눌러 현재 명령을 묶음 명령으로 저장합니다.
4. 저장된 묶음 명령에서 필요한 동작을 선택합니다.

`현재 명령 저장`은 아직 전송하지 않은 명령 입력 바의 내용을 저장합니다. 이미 Xenesis Desk에서 활성 터미널로 보낸 명령을 저장하려면 `마지막 전송 저장`을 사용합니다. `마지막 전송 저장`은 터미널 안에 직접 타이핑한 명령이 아니라, Xenesis Desk의 명령 입력 바, 묶음 명령, 워크플로우 실행처럼 Xenesis Desk API를 통해 활성 터미널로 전송된 마지막 명령을 묶음 명령으로 저장합니다.

명령 이력 드롭다운에서도 각 이력 항목 오른쪽의 `묶음 저장` 버튼을 눌러 해당 명령을 바로 묶음 명령으로 저장할 수 있습니다. 이전 명령을 다시 입력창에 불러오지 않고 반복 작업으로 승격할 때 사용합니다.

묶음 명령 버튼:

| 버튼 | 설명 |
|---|---|
| 실행 | 저장된 명령을 활성 터미널로 즉시 보냅니다. |
| 불러오기 | 저장된 명령을 명령 입력 바에 불러와 수정할 수 있게 합니다. |
| 편집 | 라벨, 명령, 그룹, 작업 폴더, 터미널 종류를 수정합니다. |
| 복제 | 기존 묶음 명령을 복제해 비슷한 명령을 빠르게 만들 수 있게 합니다. |
| 삭제 | 필요 없는 묶음 명령을 삭제합니다. |

묶음 명령이 많을 때는 `묶음 명령 검색` 입력칸에 명령, 라벨, 그룹, 작업 폴더, 터미널 종류 일부를 입력해 목록을 좁힐 수 있습니다. 목록은 묶음 명령의 `그룹` 값이 있으면 그 값으로 묶이고, 그룹이 없으면 PowerShell, WSL, SSH 같은 터미널 종류 기준으로 묶입니다.

검색 입력 옆의 정렬 선택에서 `최근순`, `실행 횟수`, `이름`을 고를 수 있습니다. `최근순`은 최근 저장 또는 실행 시각 기준, `실행 횟수`는 실행 횟수 기준, `이름`은 라벨 이름 기준으로 목록을 정렬합니다. 실행 이력이 있는 묶음 명령은 상단 `최근 실행` 섹션에도 최대 5개까지 표시됩니다. 최근 실행 섹션은 같은 검색 필터를 따르며, 실행 횟수가 0인 묶음 명령은 표시하지 않습니다.

저장된 묶음 명령을 수정하려면 `편집`을 누릅니다. 펼쳐진 편집 영역에서 라벨, 명령, 그룹, 작업 폴더, 터미널 종류를 수정한 뒤 `저장`으로 저장하거나 `취소`로 취소합니다. 명령이 비어 있으면 저장되지 않습니다.

묶음 명령만 다른 PC나 워크스페이스로 옮기려면 `묶음 명령` 드롭다운 상단의 `내보내기`와 `가져오기`를 사용합니다. `내보내기`는 현재 터미널 묶음 명령 목록을 `xenesis-terminal-work-blocks` 형식의 JSON 파일로 내보내기 합니다. `가져오기`는 같은 형식의 JSON 파일을 가져오기 한 뒤 현재 목록에 병합합니다.

가져오기 규칙:

| 규칙 | 설명 |
|---|---|
| 같은 ID | 가져온 묶음 명령의 ID가 현재 목록에 이미 있으면 가져온 내용으로 갱신합니다. 이렇게 해야 `terminal-work-block:<묶음명령-id>`에 연결된 키보드 단축키를 유지할 수 있습니다. |
| 새 ID | 현재 목록에 없는 ID는 새 묶음 명령으로 추가합니다. |
| 잘못된 항목 | 명령이 비어 있거나 묶음 명령 형식이 아닌 항목은 건너뜁니다. |
| 최대 개수 | 최종 목록은 내부 제한인 `MAX_WORK_BLOCKS`를 넘지 않도록 잘립니다. |

가져오기 파일 선택을 취소하거나 유효한 묶음 명령이 없으면 현재 목록은 변경되지 않습니다. 전체 앱 설정, 비밀 값, 터미널 프로필까지 함께 옮길 때는 `설정 > 백업` 기능을 사용하고, 반복 명령 묶음만 옮길 때는 터미널 묶음 명령 내보내기/가져오기를 사용하는 것이 적합합니다.

묶음 명령은 커맨드 팔레트에서도 실행할 수 있습니다. `Ctrl+K`를 누른 뒤 `터미널 묶음 명령`, 묶음 명령 라벨, 그룹, 명령 일부, 작업 폴더 일부를 검색하면 저장된 묶음 명령이 표시됩니다. 내부 명령 ID는 호환성을 위해 `terminal-work-block:<묶음명령-id>` 형식을 유지하며, 이 ID를 기준으로 키보드 단축키 설정과 연결됩니다.

묶음 명령은 반복 작업 단위로 보관하는 용도입니다. 아주 짧고 범용적인 명령은 단축 명령에 두고, 특정 폴더나 터미널 컨텍스트와 함께 관리해야 하는 명령은 터미널 묶음 명령에 저장하는 방식이 적합합니다.

## 8. 원격 파일

### 8.1 원격 파일 프로필 만들기

`설정 > 원격 파일`에서 원격 파일 프로필을 추가합니다.

추가 버튼은 다음 순서로 표시됩니다.

1. SFTP
2. FTP
3. FTPS

프로필에서 설정할 수 있는 값:

| 항목 | 설명 |
|---|---|
| 표시 이름 | FTP 탭과 메뉴에 표시될 이름입니다. |
| 그룹 | 프로필을 묶는 그룹입니다. |
| 프로토콜 | SFTP, FTP, FTPS 중 하나입니다. |
| 호스트/포트 | 서버 주소와 포트입니다. |
| 사용자명 | 로그인 사용자입니다. |
| 비밀번호 | 로컬 앱에 저장할 수 있습니다. |
| 개인 키 파일 | SFTP 키 인증에 사용합니다. |
| 키 패스프레이즈 | 개인 키 암호입니다. |
| 시작 경로 | 처음 열 원격 폴더입니다. |
| 인코딩 | 원격 목록과 텍스트 파일 읽기/저장에 사용할 문자 인코딩입니다. |

인코딩 기본값은 UTF-8입니다. 오래된 국내 FTP 서버에서는 EUC-KR 또는 CP949가 필요한 경우가 많습니다. Xenesis Desk는 `iconv-lite`를 사용해 EUC-KR/CP949 경로와 텍스트 파일 처리를 보완합니다.

### 8.2 원격 파일 탐색

왼쪽 영역의 `FTP` 탭에서 원격 파일을 탐색합니다.

할 수 있는 작업:

- 프로필 선택
- 상위 폴더 이동
- 새로고침
- 업로드
- 새 폴더 만들기
- 이름 변경
- 삭제
- 파일 더블클릭으로 열기

원격 파일을 더블클릭하면 파일 종류에 맞는 패널이 열립니다.

FTP 탭은 선택한 프로필과 현재 원격 폴더를 유지합니다. 즐겨찾기나 캡처 탭으로 잠시 이동했다가 돌아와도 원격 파일 목록과 전송 큐 상태가 유지됩니다.

원격 파일 목록은 전송 큐와 분리되어 스크롤됩니다. 목록이 길어도 전송 큐는 하단에 고정되고, 전송 항목이 없으면 큐 영역은 표시되지 않습니다.

### 8.3 원격 파일 저장

원격 파일을 코드 편집기, Markdown 편집기, Mermaid 편집기로 열고 저장하면 원격 서버로 다시 저장됩니다.

문서 미리보기, 이미지 뷰어, 헥스 뷰어처럼 읽기 전용인 화면에서는 저장하지 않습니다.

원격 저장이 실패하면 편집기 상태 메시지나 진단/로그 센터에서 오류를 확인합니다.

### 8.4 로컬과 원격 간 드래그 전송

로컬 파일 탐색기와 원격 파일 탭 사이에서 파일을 드래그 앤 드롭할 수 있습니다.

- 로컬 파일을 원격 파일 목록에 드롭하면 업로드됩니다.
- 원격 파일을 로컬 파일 탐색기에 드롭하면 다운로드됩니다.
- 폴더 전송은 아직 제한될 수 있으므로 파일 단위 전송을 권장합니다.

### 8.5 전송 큐

원격 파일 탭 하단에는 전송 큐가 표시됩니다.

전송 큐에서 확인할 수 있는 정보:

- 업로드/다운로드 방향
- 파일명
- 대기, 전송 중, 완료, 실패, 취소됨 상태
- 진행률
- 실패 메시지

사용 가능한 작업:

- 실패 또는 취소된 항목 재시도
- 대기 또는 전송 중인 항목 취소
- 완료된 항목 지우기
- 덮어쓰기 정책 선택

덮어쓰기 정책:

| 정책 | 동작 |
|---|---|
| 덮어쓰기 | 같은 이름이 있으면 새 파일로 덮어씁니다. |
| 건너뛰기 | 같은 이름이 있으면 전송하지 않습니다. |

## 9. 화면 캡처

화면 영역 캡처는 기본 기능입니다.

실행 방법:

- 왼쪽 `캡처` 탭 헤더의 캡처 아이콘 버튼

사용 순서:

1. 캡처 버튼을 누릅니다.
2. 화면에 캡처 오버레이가 나타납니다.
3. 드래그해서 영역을 선택합니다.
4. 선택 영역이 이미지로 저장됩니다.
5. 왼쪽 `캡처` 탭에서 결과를 확인합니다.

캡처 탭에서는 캡처 목록 새로고침, 개별 확인, 전체 삭제를 할 수 있습니다.

캡처 저장 폴더 기본값은 `XENIS_HOME/captures`입니다. `설정 > 일반`의 캡처 저장 폴더를 비워 두면 이 기본값을 사용합니다.

다중 모니터에서는 모니터별 오버레이 창이 각 디스플레이 bounds와 같은 위치/크기로 생성됩니다. 전체 화면 독점 모드가 아니라 화면 위에 올라오는 오버레이 방식이므로, 모니터 DPI 배율이 다른 환경에서도 선택 영역과 저장 영역이 같은 기준을 쓰도록 맞춰져 있습니다.

다중 모니터 환경에서 오버레이가 정상적으로 보이지 않거나 캡처가 실패하면 진단/로그 센터에서 `main`, `renderer`, `system` 로그를 함께 확인합니다.

## 10. 창 크기/위치

상단 `창 크기/위치` 메뉴에서 앱 창 크기와 위치 프리셋을 적용할 수 있습니다.

기본 프리셋 예:

- HD
- FHD
- QHD
- UHD
- 16:9 계열
- 4:3 계열

`설정 > 창 크기/위치`에서 프리셋을 추가하거나 수정합니다.

설정 항목:

| 항목 | 설명 |
|---|---|
| 표시 이름 | 메뉴에 표시될 이름입니다. |
| 그룹 | 메뉴에서 묶을 그룹입니다. |
| 너비/높이 | 적용할 창 크기입니다. |
| 크기 적용 후 위치도 이동 | 켜면 크기와 위치를 함께 적용합니다. 끄면 현재 위치를 유지하고 크기만 바꿉니다. |
| 좌표 기준 | 현재 모니터 작업 영역 기준 또는 전체 화면 좌표를 선택합니다. |
| 위치 X/Y | 이동할 좌표입니다. |
| 화면 밖 이동 허용 | 필요한 경우 화면 밖 좌표도 허용합니다. |

설정 화면이 열린 상태에서 앱 창을 직접 이동하거나 크기를 바꾸면 선택된 프리셋에 현재 값이 반영될 수 있습니다. 변경 후 저장 버튼을 눌러야 상단 메뉴에 유지됩니다.

## 11. 워크스페이스

워크스페이스는 프로젝트 작업 상태를 하나의 파일로 저장하는 기능입니다.

상단 `WS+` 버튼으로 현재 상태를 저장하고, `WS` 드롭다운에서 다시 열 수 있습니다.

워크스페이스 파일 확장자는 다음과 같습니다.

```text
.xcon-desk-workspace.json
```

워크스페이스에 포함되는 주요 정보:

- 작업 폴더
- 도킹 레이아웃
- 열린 탭 정보
- 터미널 탭 스냅샷
- FTP/SFTP 프로필 목록
- 창 크기/위치 프리셋
- 기본 CLI 환경
- 워크스페이스 이름

`설정 > 워크스페이스`에서 시작 시 마지막 워크스페이스를 자동 복원할지 선택할 수 있습니다.

워크스페이스와 레이아웃 저장의 차이:

| 기능 | 저장 대상 |
|---|---|
| 레이아웃 저장 | 도킹 화면 배치 중심 |
| 워크스페이스 저장 | 프로젝트 폴더, 레이아웃, 터미널/FTP 설정, 창 프리셋까지 포함 |

프로젝트 단위로 작업 환경을 다시 열고 싶다면 워크스페이스를 사용합니다.

## 12. 확장

Xenesis Desk는 확장 기능을 지원합니다.

확장 종류:

| 종류 | 설명 |
|---|---|
| 공개 확장 | GitHub 공개판에 포함해도 되는 확장입니다. |
| 내부 확장 | 내부 개발용 기능입니다. 공개 릴리스에서는 제외할 수 있습니다. |
| 사용자 확장 | 사용자가 지정한 확장 폴더에서 불러오는 확장입니다. |

`설정 > 확장`에서 다음을 확인할 수 있습니다.

- 확장 이름과 설명
- 버전
- 출처
- 경로
- 진입 파일
- 등록된 명령
- 권한
- 로드 로그
- 오류

확장에서 선언할 수 있는 권한:

- 명령 등록
- 파일 읽기
- 파일 쓰기
- 설정 읽기
- 설정 쓰기
- 도구 열기
- 패널 열기

확장 로드에 실패하면 `재시도` 버튼을 누를 수 있습니다. 확장 명령은 도구 메뉴와 커맨드 팔레트에 표시될 수 있습니다.

내부 개발용 확장은 폴더를 제외하면 앱에서 자동으로 사라지도록 구성되어 있습니다. 공개판을 만들 때 내부 확장 폴더를 GitHub에 올리지 않아도 기본 기능은 동작해야 합니다.

공개 릴리스에는 공개 샘플 확장과 `Xenesis Bot`을 여는 release-safe 확장 shim이 포함됩니다. 따라서 내부 core-tools 전체를 포함하지 않는 릴리스에서도 도구 메뉴와 커맨드 팔레트에서 `Xenesis Bot` 명령은 유지됩니다.

## 13. MCP

MCP는 Codex, Claude Code, Hermes 같은 외부 CLI 에이전트가 Xenesis Desk 기능을 호출할 수 있게 하는 연결 기능입니다.

현재 제공되는 대표 MCP 기능:

- XCON/SKETCH 생성 프롬프트 제공
- XCON/SKETCH Markdown 검증
- XCON/SKETCH Markdown 파일 생성
- LLM이 생성한 Markdown 내용을 그대로 저장하고 Xenesis Desk에서 열기
- 생성된 파일을 Xenesis Desk에서 열기
- 기존 로컬 파일을 Xenesis Desk에서 열기
- 터미널 미리보기, 실행, 목록, 출력 tail 확인
- 현재 열린 파일, 패널, 활성 컨텍스트, 컨텍스트 액션 조회
- 커맨드 팔레트와 확장 명령 실행
- Playwright 스크린샷/액션 실행과 trace 저장
- Xenesis Bot 메시지/스트림 전달

예를 들어 외부 에이전트에서 다음처럼 요청할 수 있습니다.

```text
XCON/SKETCH로 운영 대시보드를 만들고 Xenesis Desk에서 열어줘.
```

그러면 에이전트가 Xenesis Desk MCP 서버의 프롬프트 리소스를 참고하거나 `xenesis_desk_get_xcon_prompt`를 호출해 XCON/SKETCH 작성 규칙을 받은 뒤, Markdown을 생성하고 `xenesis_desk_validate_xcon_markdown`으로 검증한 다음 `xenesis_desk_create_xcon_markdown_from_content`로 저장해 Xenesis Desk에서 열 수 있습니다.

단순 예제나 빠른 대시보드는 기존 `xenesis_desk_create_xcon_markdown` 도구로도 바로 생성할 수 있습니다. 더 정교한 결과가 필요하면 프롬프트 조회, 생성, 검증, 저장 순서를 사용하는 것이 좋습니다.

상세한 prompt kind 선택 기준과 strict 검증 흐름은 `docs/mcp-prompt-usage.md`를 참고합니다. 대표 시나리오별 품질 점검 기준은 `docs/mcp-prompt-quality-matrix.md`에 정리되어 있습니다. 검증 실패 유형별 복구 순서는 `docs/mcp-xcon-repair-loop.md`를 따릅니다.

XCON/SKETCH Markdown 생성 도구의 출력 폴더 기본값은 `XENIS_HOME/exports`입니다. `workspaceDir` 또는 alias인 `outDir`에 상대 경로를 넘기면 현재 작업 폴더가 아니라 이 exports 폴더 아래로 저장됩니다. Playwright 스크린샷/trace 도구는 `outDir`을 생략하면 `XENIS_HOME/captures`를 쓰고, `outDir`에 상대 경로를 지정하면 `XENIS_HOME/exports` 아래로 저장합니다.

Hermes Plug-in의 `/xd xcon` 또는 `xenesis_desk_gateway` fallback 경로도 같은 규칙을 사용합니다. 실제 Hermes가 WSL2 안에서 실행 중이면 WSL2에 설치된 실제 플러그인 복사본도 이 규칙을 포함한 버전이어야 하며, 변경 후 gateway를 재시작해야 합니다.

MCP 관련 파일:

```text
mcp/xenesis-desk-mcp-server.mjs
mcp/prompts/*.md
docs/mcp-integration.md
```

### 13.1 Xenesis Agent

Xenesis Desk에는 built-in AI agent runtime인 `Xenesis Agent`가 포함됩니다.

Xenesis Agent는 현재 워크스페이스를 살펴보고, 작업을 계획하고, agent task를 실행하고, 설정된 provider를 사용하고, MCP tools를 호출하고, artifact를 만들고, session history를 `XENIS_HOME/xenesis` 아래에 유지할 수 있습니다.

Xenesis Desk가 계속 소유하는 영역은 multi-terminal workspace, 도킹, 파일 탐색과 편집, 화면 캡처, XCON/SKETCH 렌더링, extension pane입니다. Xenesis Agent는 이 작업대를 대신하지 않고, Xenesis Desk 안에서 필요한 컨텍스트와 도구를 호출하는 local agent runtime입니다.

Xenesis Agent의 기본 경로는 Desk 내부 embedded runtime입니다. Telegram, Slack, Discord 같은 외부 채널이나 gateway dashboard가 필요할 때만 Xenesis Desk가 managed gateway sidecar를 시작합니다. gateway는 기본적으로 `127.0.0.1`에 bind하고 app-session token을 사용합니다. 파일 쓰기, shell command, Xenesis Desk control action은 현재 approval mode의 적용을 받습니다.

Runtime state의 기본 위치:

| 경로 | 용도 |
|---|---|
| `XENIS_HOME/xenesis/sessions` | agent session history |
| `XENIS_HOME/xenesis/artifacts` | 생성 artifact |
| `XENIS_HOME/xenesis/reports` | 작업 보고서와 요약 |
| `XENIS_HOME/xenesis/memory.json` | local memory state |

### 13.2 MCP bridge와 환경 변수

Xenesis Desk 앱은 외부 MCP 서버와 Hermes plugin이 앱을 제어할 수 있도록 로컬 bridge를 엽니다.

기본 bridge:

| 실행 방식 | 기본 URL |
|---|---|
| 패키지/릴리스 | `http://127.0.0.1:3847` |
| 개발 실행 | `http://127.0.0.1:3848` |

해당 포트가 이미 사용 중이면 다른 포트가 선택될 수 있습니다. 실제 URL과 token은 항상 state 파일에서 확인합니다.

기본 state 파일:

```text
%USERPROFILE%\.xenis\mcp\bridge.json
```

`XENIS_HOME`을 설정했다면:

```text
%XENIS_HOME%\mcp\bridge.json
```

로컬 셸 프로필에서 CLI 환경을 선택하고 터미널 환경 자동 설정이 켜져 있으면 새 터미널에 Xenesis Desk MCP 관련 환경 변수가 주입됩니다.

대표 환경 변수:

- `XENIS_HOME`
- `XENIS_MCP_SERVER_COMMAND`
- `XENIS_MCP_SERVER_PATH`
- `XENIS_MCP_BRIDGE_URL`
- `XENIS_MCP_BRIDGE_TOKEN`
- `XENIS_MCP_STATE_FILE`
- `XENIS_MCP_CONFIG_FILE`
- `XENIS_MCP_CONFIG_SNIPPET`

WSL2에서 Hermes나 다른 CLI를 실행하는 경우 Windows Xenesis Desk와 WSL2의 `127.0.0.1`이 항상 같은 의미는 아닙니다. 이때는 `XENIS_MCP_BRIDGE_URL`에 WSL2에서 Windows host로 접근 가능한 주소를 넣고, Windows 방화벽과 loopback 접근 정책을 함께 확인합니다.

MCP에서 파일을 열거나 XCON/SKETCH Markdown을 만들 때 열리는 위치를 지정할 수 있습니다. 예를 들어 `xenesis_desk_create_xcon_markdown` 또는 `xenesis_desk_open_file`에 `placement: "right"`를 넘기면 현재 활성 패인의 오른쪽에 파일이 도킹됩니다.

확장 명령으로 열리는 패널은 `xenesis_desk_run_extension_command`에 `panelPlacement: "right"`를 넘기면 같은 방식으로 도킹됩니다.

가능한 위치 값은 `tab`, `left`, `right`, `top`, `bottom`입니다.

MCP 기능을 배포판에서 제외하려면 `mcp/` 폴더를 제외하면 됩니다. 이 경우 Xenesis Desk는 MCP 서버가 없는 것으로 판단하고 MCP 환경 변수 주입도 하지 않습니다. 현재 릴리스 구성은 `mcp/**/*`를 포함하고, 내부 개발용 확장은 제외하되 release-safe `Xenesis Bot` 명령 shim은 포함합니다.

### 13.3 Hermes `/xd` gateway 플러그인

Hermes Plug-in, Telegram, Discord 쪽에서 `/xd status`, `/xd run`, `/xd xcon`, `/xd prompt`, `/xd files`, `/xd panels` 같은 명령을 쓰려면 Hermes 일반 플러그인 `xenesis_desk_gateway`를 켭니다.

```powershell
hermes plugins enable xenesis_desk_gateway
```

실제 Hermes 설치본이나 WSL2 안의 Hermes에 플러그인 변경을 반영할 때는 Xenesis Desk 저장소에서 다음 동기화 스크립트를 사용합니다. 이 스크립트는 Hermes core 파일을 수정하지 않고 `xenesis_desk_gateway` 일반 플러그인과 `xenesis_desk_bot` platform plugin 디렉터리만 복사합니다.

```powershell
node scripts/syncHermesPlugins.mjs --target "<Hermes repo root>" --dry-run
node scripts/syncHermesPlugins.mjs --target "<Hermes repo root>"
```

이 플러그인은 Xenesis Desk bridge 또는 Xenesis Desk MCP 서버를 통해 터미널, 파일, XCON, 패널, 확장 명령을 실행합니다. `xenesis_desk_mobile_get_xcon_prompt`와 `/xd prompt [kind] [brief]`는 Xenesis Desk MCP의 XCON/SKETCH 생성 지침을 Hermes에 전달해 dashboard, workflow, Markdown artifact를 만들 때 사용합니다. 터미널 실행, XCON 파일 생성, 확장 명령 실행처럼 영향이 있는 작업은 gateway 승인 또는 action token 흐름을 거칩니다. action token은 `ACTION_TOKEN_TTL_SECONDS` 기준 600초 동안 유효하고, 사용됐거나 만료된 token은 다시 실행할 수 없습니다.

### 13.4 Xenesis Bot

Xenesis Bot은 Hermes gateway나 다른 LLM 스트림 생산자가 보내는 Markdown 응답을 Xenesis Desk 안의 채팅 패널에 표시합니다. 응답 안에 `xcon`, `xcon-sketch`, `sketch` 코드 펜스가 있으면 스트리밍 중에도 XCON/SKETCH 렌더링을 갱신합니다.

`xenesis_desk_gateway` 플러그인이 켜진 Hermes에 연결되어 있으면 Xenesis Bot의 일반 메시지는 visual cockpit 요청으로 표시되어 Hermes가 현재 Desk context, XCON prompt, Markdown validation, artifact save/open 도구를 우선 활용할 수 있습니다. 이 동작은 Hermes core가 아니라 `xenesis_desk_gateway` plugin hook에서 처리됩니다.

Bot을 통해 XCON/SKETCH artifact를 만들 때도 `/xd prompt`, `/xd xcon`, `xenesis_desk_get_xcon_prompt`, `xenesis_desk_validate_xcon_markdown`, `xenesis_desk_create_xcon_markdown_from_content` 순서가 기준입니다. 작은 smoke artifact는 `strict-sketch`, 생성물 수리는 `review-repair` 기준을 사용합니다. Hermes 연결과 WSL2 실행 순서는 `docs/xenesis-bot-hermes-setup.md`를 참고합니다.

Bot 입력창 위에는 `AI Workbench`, `Artifact Library`, `Pane Visual Context`, `Terminal Inspector`, `Process Viewer`, `Remote Sync Planner`, `Run Task Panel`, `Safe File Edit Center`, `Current Desk`, `Active Terminal`, `Safe File Write`, `Context`, `Dashboard`, `Sketch`, `Repair` starter action 버튼이 있습니다. `Current Desk`는 `xenesis_desk_active_context` 같은 MCP 컨텍스트 도구를 먼저 쓰도록 요청하고, `Active Terminal`은 활성 터미널을 찾아 최근 출력을 읽게 합니다. `Pane Visual Context`는 AI Workbench를 열어 활성 pane의 캡처 이미지를 Agent에 보낼 수 있게 합니다. `Safe File Edit Center`는 로컬 텍스트 파일의 diff preview, 백업 후 적용, 최근 백업 복원을 GUI에서 확인하는 패널을 엽니다. `Safe File Write`는 파일 변경 전에 `xenesis_desk_preview_text_file_write`로 diff를 확인하고, 승인 후 `xenesis_desk_apply_text_file_write`로 백업과 함께 적용하며, 문제가 있으면 `xenesis_desk_restore_text_file_backup`으로 복원하는 Bot 작업 흐름을 안내합니다. 기본 백업 위치는 `XENIS_HOME/bot-backups` 아래 날짜별 폴더입니다.

터미널 탭에서 우클릭하면 `Send selection to Xenesis Agent`과 `Send recent output to Xenesis Agent`을 사용할 수 있습니다. 선택 영역은 그대로 Bot 메시지의 `terminal-output` 컨텍스트로 전달되고, 최근 출력은 마지막 200줄을 전달합니다. 원격 SSH/TELNET 터미널이면 Bot 메시지 안에 재연결 전 사용자 확인이 필요하다는 안내도 함께 들어갑니다.

열린 파일 탭에서 우클릭하면 파일 경로가 있는 탭에 `Send to Xenesis Agent` 항목이 표시됩니다. 이 항목은 파일 내용을 바로 덮어쓰지 않고 로컬/원격 파일 참조만 Bot에 전달합니다. Bot이나 외부 에이전트가 로컬 텍스트 파일을 수정해야 할 때는 위의 preview/apply/restore MCP 도구를 사용해야 합니다.

`Context`는 `/xd mobile`을 보내 현재 Desk 상태를 요약하고, `Dashboard`, `Sketch`, `Repair` 버튼은 dashboard-workflow, xcon-sketch, review-repair 흐름을 기존 visual cockpit 메시지 경로로 보냅니다.

Hermes가 Bot 메시지 metadata에 `artifacts`를 포함하면 Xenesis Bot은 메시지 아래에 artifact action 버튼을 표시합니다. 각 artifact에는 `Open`, `Focus`, `Reveal`, `Copy path` 버튼이 표시됩니다. `Open`과 `Focus`는 기존 Bot 입력 listener로 `/xd open "<path>"` 또는 artifact command를 보내고, `Reveal`은 Windows 탐색기에서 파일 위치를 열며, `Copy path`는 경로를 클립보드에 복사합니다. 이 흐름은 Hermes core 수정 없이 `xenesis_desk_gateway` 플러그인의 open-file 경로를 재사용합니다.

`xenesis_desk_gateway` 플러그인은 XCON 생성 도구 결과를 `post_tool_call` hook에서 기억하고, Xenesis Bot 최종 응답에는 `transform_llm_output` hook으로 hidden artifact marker를 붙입니다. Xenesis Desk bridge는 이 marker를 화면에 표시하지 않고 artifact action metadata로 변환합니다.

Hermes가 터미널 실행, XCON 저장, 확장 명령 실행처럼 승인이 필요한 작업을 요청하면 Xenesis Bot 메시지 안에 approval card가 표시됩니다. 승인 버튼은 `/approve once`, 거부 버튼은 `/deny`를 같은 Bot 입력 경로로 보내므로 Hermes gateway의 기존 승인 큐를 그대로 사용합니다.

Xenesis Bot platform plugin은 `send_exec_approval`을 구현하므로 Hermes gateway는 fallback text-send보다 rich approval 경로를 우선 사용합니다. 이 경로에서는 명령, 사유, approval card metadata가 하나의 Bot 메시지로 전달됩니다.

Hermes 진행 상태는 `send_or_update_status` 경로로 Xenesis Bot의 status line에 갱신됩니다. 도구 진행, 모델 전환, 승인 대기 같은 짧은 상태는 대화 메시지로 계속 쌓이지 않고 Bot 헤더의 상태 텍스트로 바뀝니다.

Bot 화면을 여는 방법:

1. 상단 `도구` 버튼을 누릅니다.
2. `Xenesis Bot`을 선택합니다.

또는 `Ctrl+K` 커맨드 팔레트에서 `Xenesis Bot`을 검색해 실행합니다.

Xenesis Bot 연결에는 방향이 다른 URL 두 개가 있습니다.

| 방향 | 기본 URL | 용도 |
|---|---|---|
| Hermes -> Xenesis Desk | `http://127.0.0.1:3847` 또는 개발 실행 시 `http://127.0.0.1:3848` | Hermes가 assistant message, stream, final 이벤트를 Xenesis Desk bridge로 보냅니다. |
| Xenesis Desk -> Hermes | `http://127.0.0.1:3859/message` | Xenesis Bot 입력창의 user message를 Hermes `xenesis_desk_bot` listener로 보냅니다. |

중요한 환경 변수:

- `XENIS_BOT_ENABLED`
- `XENIS_BOT_INPUT_URL`
- `XENIS_BOT_LISTEN_HOST`
- `XENIS_BOT_LISTEN_PORT`
- `XENIS_BOT_ALLOWED_USERS`
- `XENIS_BOT_ALLOW_ALL_USERS`

운영 환경에서는 `XENIS_BOT_LISTEN_HOST=127.0.0.1`을 유지하고, `XENIS_MCP_BRIDGE_TOKEN`은 Xenesis Desk bridge state 파일이나 안전한 환경 변수로만 전달합니다. `XENIS_BOT_ALLOWED_USERS`는 필요한 user id만 명시하고, `XENIS_BOT_ALLOW_ALL_USERS=true`는 로컬 개발처럼 노출 범위가 확실한 경우에만 사용합니다.

`xenesis_desk_bot`은 Hermes general plugin으로 켜는 대상이 아니라 gateway platform plugin입니다. Xenesis Bot 자체를 위해 `hermes plugins enable xenesis_desk_bot`을 실행하지 않습니다. 대신 `XENIS_BOT_ENABLED=true` 또는 `XENIS_MCP_BRIDGE_URL` 설정으로 platform 활성화 조건을 맞춥니다.

`XENIS_MCP_BRIDGE_URL`을 `http://127.0.0.1:3859` 또는 `http://127.0.0.1:3859/message`로 설정하면 Hermes가 Xenesis Desk bridge가 아닌 Bot listener에 `/bot/message`를 보내게 되어 `HTTP Error 404: Not Found`가 발생합니다. `XENIS_MCP_BRIDGE_URL`은 Xenesis Desk bridge URL, `XENIS_BOT_INPUT_URL`은 Hermes listener URL로 구분합니다.

### 13.5 Xenesis Desk AI Workbench

`Xenesis Desk AI Workbench`는 Wave Terminal의 AI context 흐름을 Xenesis Desk 구조에 맞게 정리한 작업 패널입니다. 도구 메뉴 또는 `Ctrl+K` 커맨드 팔레트에서 `Xenesis Desk AI Workbench`를 열 수 있습니다.

AI Workbench에서 확인하는 정보:

- 현재 active pane과 content
- 열린 파일 수
- 터미널 수
- Bot artifact 수
- bridge 연결 상태

AI Workbench의 각 카드에서 `Send to Bot`을 누르면 Xenesis Bot으로 목적에 맞는 프롬프트가 전달됩니다. 지원하는 작업 축은 AI context cockpit, shell context tracking, xd CLI bridge, Artifact Library, pane visual context, remote durable-lite, explorer remote sync, process viewer, Terminal Inspector, safe file edit center, run task panel입니다.

`Context Bundle`은 현재 active pane, 열린 파일 수, 터미널 수, 최근 Bot artifact metadata, Command Center의 묶음 명령 요약을 `xenesis-ai-context-bundle` 블록으로 묶어 Xenesis Bot에 보냅니다. 작업을 이어가기 전에 AI가 현재 Desk 상태와 관련 산출물을 한 번에 파악해야 할 때 사용합니다. Bundle 모드는 `Light`, `Full`, `Artifact Review`, `Debug`, `Workflow Repair` 중 선택할 수 있습니다. `Light`는 현재 Desk와 최근 artifact만 간단히 전달하고, `Full`은 더 넓은 최근 artifact 목록을 포함합니다. `Artifact Review`는 생성물 검토와 수리 전 확인, `Debug`는 검증 실패와 진단 맥락, `Workflow Repair`는 XCON/SKETCH/workflow 수리 맥락에 맞춰 `artifact-bundle-mode` 정보를 payload에 포함합니다. 사용자가 선택한 Bundle 기본 모드는 로컬에 저장되어 다음에 AI Workbench를 열 때 복원됩니다.

`Create Workflow Draft`는 저장된 묶음 명령을 Workflow Runner 초안으로 변환합니다. 각 묶음 명령의 비어 있지 않은 줄은 Workflow Runner의 `command` 액션으로 만들어지고, Workflow Runner가 열리면 Designer 화면에서 바로 확인할 수 있습니다. 이 동작은 초안을 로드할 뿐이며 터미널 명령을 자동 실행하지 않습니다. 실행 전에는 대상 터미널, 순서, 파라미터를 Workflow Runner에서 검토해야 합니다.

`Artifact Library`는 Xenesis Bot 세션에 포함된 Markdown, XCON, Pane capture, Screenshot, Trace, workflow artifact를 모아 보여줍니다. 검색어와 종류 필터를 함께 사용해 artifact를 좁힐 수 있고, Pane capture와 Screenshot artifact는 목록 썸네일과 `Quick Preview` 영역으로 바로 확인할 수 있습니다. Markdown, XCON, workflow artifact는 읽기 전용 Quick Preview로 내용을 확인할 수 있습니다.

목록은 `Newest`, `Type`, `Session` 기준으로 정렬할 수 있고, 각 artifact는 `Artifact Details`에서 metadata, preview, validation, provenance, timeline을 한 번에 확인할 수 있습니다. 이미지 artifact는 상세 보기에서 `Fit`과 `Actual` 보기로 크기를 바꿔 확인합니다.

각 artifact는 자주 쓰는 `Show Preview`, `Show Details`, `Send to Bot`, `Open` 동작을 행에 바로 표시하고, `Validate`, `Repair`, `Preview repair plan`, `Provenance`, `Focus`, `Reveal`, `Copy path` 같은 보조 동작은 `More` 메뉴에 정리합니다. 행에는 최근 검증 상태를 나타내는 `OK`, `Needs review`, `Not validated`, `Missing file` health badge가 함께 표시됩니다. `Send to Bot`은 선택한 artifact 정보를 `xenesis-artifact-context` 블록으로 Xenesis Bot에 보내고, 여러 artifact를 선택한 뒤 `Send Bundle to Agent`을 누르면 `xenesis-artifact-bundle` 블록으로 묶어 보냅니다. 선택한 묶음을 반복 검토해야 하면 `Save Review Pack`으로 `Artifact Review Packs`에 저장하고, 이후 `Send Pack to Bot`으로 `xenesis-artifact-review-pack` 블록을 다시 전달할 수 있습니다. Markdown, XCON, workflow artifact 2개 이상을 선택하면 `Line diff` 또는 `Structural diff` 모드로 `Compare Selected`를 실행해 `Artifact Compare` 패널에서 차이를 확인할 수 있습니다. 비교 결과에서는 `Copy diff`로 diff를 복사하거나 `Send compare to Agent`으로 비교 결과를 Bot에 보낼 수 있습니다. `Validate`는 가능한 경우 Xenesis Desk bridge의 `xenesis_desk_validate_xcon_markdown` 검증 경로를 사용하고, 직접 검증할 수 없으면 Bot에 검증 요청을 보내며, 결과는 `Validation Results` 패널에 쌓입니다. 검증 결과는 localStorage의 `xenesis-artifact-validation-results`에 저장되어 패널을 다시 열어도 health badge와 최근 결과를 복원합니다. 검증 결과 카드에서는 `Open artifact`, `Revalidate`, `Repair with Agent`, `Preview repair plan`, `Open Safe File Edit Center`로 바로 후속 작업을 실행할 수 있습니다. `Open Safe File Edit Center`는 artifact filePath를 handoff해서 해당 텍스트 파일을 Safe File Edit Center에 바로 로드합니다. `Preview repair plan`은 `xenesis-artifact-repair-loop` 블록으로 validation detail과 `xenesis_desk_preview_text_file_write`, `xenesis_desk_apply_text_file_write`, `xenesis_desk_restore_text_file_backup` 안전 흐름을 Bot에 전달합니다. `Provenance`는 session/message id, 생성 시각, 파일 경로, open/focus command를 보여줍니다. `Timeline`은 Preview, Send, Bundle, Validate, Repair, Repair loop, Open, Focus, Reveal, Copy, Compare 같은 최근 artifact action을 기록해 Bot 세션과 파일 검토 흐름을 되짚을 때 사용합니다. 이 artifact action은 Hermes Timeline의 `Artifact actions` 필터에서도 확인할 수 있고, 최근 action은 localStorage의 `xenesis-artifact-timeline-events`에 저장됩니다.

AI Workbench에서는 Context Bundle 모드에 맞춰 `Suggested artifacts`를 추천하고, `Bundle Preview`에서 Bot에 전달될 목록을 확인한 뒤 `Send Selected Bundle`로 선택한 artifact만 보낼 수 있습니다.

Artifact Library의 상세 기능, payload 종류, 검증/비교/수리 흐름, AI Workbench Context Bundle 연계는 [Artifact Library 상세 매뉴얼](artifact-library-manual.md)에 별도로 정리되어 있습니다.

`Pane Visual Context` 카드의 `Capture Pane`은 현재 Xenesis Desk에서 선택된 artifact target pane을 우선 캡처하고, 없으면 활성 pane을 캡처합니다. 캡처 이미지를 Agent 메시지의 `xenesis-pane-visual-context` 블록과 함께 보내므로, AI가 레이아웃 겹침, 잘린 텍스트, 렌더링 오류를 화면 기준으로 판단할 수 있습니다. 캡처 파일은 일반 화면 캡처와 같은 `XENIS_HOME/captures` 폴더에 저장됩니다.

`Terminal Inspector`는 bridge가 보고한 터미널 탭을 모아 보여주고, 선택한 터미널의 최근 출력 분석이나 다음 명령 준비 요청을 Xenesis Bot으로 보낼 수 있게 합니다.

`Process Viewer`는 로컬 OS의 프로세스 목록을 읽기 전용으로 보여줍니다. PID, 부모 PID, 이름, 메모리, 실행 명령을 필터링할 수 있고, 특정 프로세스의 상태를 `Send to Bot`으로 Xenesis Bot에 전달할 수 있습니다. `Terminate`는 즉시 실행되지 않고 확인 대화상자를 거친 뒤 non-force 종료 요청만 보냅니다.

`Remote Sync Planner`는 로컬 폴더와 FTP/FTPS/SFTP 원격 프로필의 특정 경로를 비교합니다. `로컬/원격 비교` 결과는 upload, download, same name, conflict, local-only, remote-only, directory 항목으로 표시됩니다. 이 패널은 계획과 검토용이며 원격 삭제, 로컬 파일 쓰기, 자동 덮어쓰기를 수행하지 않습니다. 필요한 경우 `Send plan to Bot`으로 비교 요약을 Xenesis Bot에 전달해 안전한 전송 순서를 검토합니다.

`Run Task Panel`은 PowerShell, CMD, pwsh, WSL 명령을 작업 단위로 실행하는 패널입니다. 명령을 실행하면 Xenesis Desk의 터미널 PTY를 사용해 one-off job을 만들고, 명령 뒤에 셸별 exit를 붙여 작업이 끝나면 종료 코드가 기록됩니다. 작업 상세 화면에서 출력, PID, 작업 폴더, 시작/종료 상태를 확인할 수 있고, `Rerun`으로 같은 명령을 다시 실행하거나 `Stop`으로 실행 중인 작업을 중단할 수 있습니다. `Save Log`는 명령, 종료 코드, 출력 transcript를 로그 파일로 저장하고, `Send to Bot`은 출력 tail을 Xenesis Bot으로 보내 후속 분석을 요청합니다.

`Safe File Edit Center`는 로컬 텍스트 파일을 열어 초안을 편집하고, 적용 전에 `diff preview`로 변경 줄을 확인하는 패널입니다. Artifact Library에서 열린 경우 handoff된 filePath를 즉시 읽어 편집 대상으로 설정합니다. `백업 후 적용`을 실행하면 변경이 있을 때 최근 백업이 만들어지고, 백업 경로는 패널에 남습니다. 문제가 있으면 같은 패널에서 `.bak` 경로를 지정해 `최근 백업 복원`을 실행할 수 있습니다. 바이너리 파일과 디렉터리는 대상에서 제외되며, Bot으로 보낼 때는 `xenesis_desk_preview_text_file_write`, `xenesis_desk_apply_text_file_write`, `xenesis_desk_restore_text_file_backup` 흐름을 함께 전달합니다.

터미널에서 Xenesis Desk를 직접 호출하려면 `scripts/xd.mjs`를 사용할 수 있습니다. Xenesis Desk 터미널에 MCP 환경 변수가 주입되어 있으면 별도 옵션 없이 동작합니다.

예:

```powershell
node scripts/xd.mjs state
node scripts/xd.mjs open "<workspace-path>\report.md"
node scripts/xd.mjs run --shell pwsh --cwd "<workspace-path>" -- npm test
node scripts/xd.mjs tail mcp-terminal-id 200
node scripts/xd.mjs trace on --clear
node scripts/xd.mjs trace capture --wait-ms 15000 -- "작은 XCON 카드 하나를 렌더링해줘."
node scripts/xd.mjs trace capture --until-final --max-wait-ms 300000 -- "긴 XCON/SKETCH 응답을 렌더링해줘."
node scripts/xd.mjs trace status
node scripts/xd.mjs ai "현재 Desk context로 대시보드 초안을 만들어줘."
```

셸 alias를 등록하면 짧게 사용할 수 있습니다.

```powershell
Set-Alias xd "<XENESIS_DESK_ROOT>\scripts\xd.mjs"
xd trace on xdbot markdown-xcon --clear
xd ai "열린 파일 기준으로 문제를 요약해줘."
xd trace capture --wait-ms 15000 -- "열린 파일 기준으로 XCON 요약을 만들어줘."
xd trace capture --until-final --poll-ms 1000 --max-wait-ms 300000 -- "긴 Hermes 응답을 XCON/SKETCH로 만들어줘."
xd trace status
```

`xd trace on`은 Xenesis Bot과 XCON/SKETCH 렌더링 성능 trace를 켭니다. Bot 응답이나 XCON/SKETCH 렌더링이 깜빡이거나 느릴 때 `xd trace on --clear`로 시작하고, 재현 뒤 `xd trace status`로 병목 후보 summary를 확인합니다. 확인이 끝나면 `xd trace off`로 끕니다.

`xd trace capture`는 trace를 켜고 초기화한 뒤 Xenesis Bot에 메시지를 보내고, 기본적으로 `--wait-ms` 시간만큼 기다린 뒤 summary를 읽고 trace를 끕니다. Hermes 응답처럼 완료 시점이 크게 흔들리는 작업은 `--until-final`을 사용합니다. 이 모드는 MCP bridge `/state`의 Bot session을 polling해서 새 assistant 메시지의 `streaming`이 끝날 때까지 기다리고, `--max-wait-ms`에 도달하면 timeout 상태와 함께 현재 trace를 반환합니다. 실행 중인 앱이 아직 `/state`에 Bot session을 포함하지 않는 경우에는 `bot-sessions.json` 저장 파일을 fallback으로 읽습니다. 기본 파일은 `XENIS_MCP_STATE_FILE` 옆의 `bot-sessions.json`이며, 필요하면 `XENIS_BOT_SESSIONS_FILE`로 직접 지정할 수 있습니다. `--poll-ms`로 polling 간격을 조정할 수 있습니다. `XENIS_BOT_INPUT_URL`이 있으면 실제 Bot 입력 URL로 보내고, 없으면 MCP bridge `/state` 또는 `bot-sessions.json`에서 최근 Bot session의 `botInputUrl`을 찾아 사용합니다. 그래도 찾지 못하면 MCP bridge의 `/bot/message` 이벤트로 Bot 화면에 메시지를 표시합니다. 기본 수집 scope는 `xdbot markdown-xcon`이며, 필요하면 `--scope "xdbot markdown-xcon all"`처럼 바꿀 수 있습니다. 긴 재현이 필요해 trace를 계속 켜둘 때만 `--keep-on`을 사용합니다.

Node 실행 alias가 맞지 않는 환경에서는 `node scripts/xd.mjs ...` 형태를 사용합니다. 주요 명령은 `xd ai`, `xd open`, `xd run`, `xd tail`, `xd trace`, `xd state`입니다.

## 14. 비밀정보

`설정 > 비밀정보`에서 SSH/FTP 비밀번호, 키 패스프레이즈, API 키 같은 값을 관리합니다.

저장 방식:

| 방식 | 설명 |
|---|---|
| 평문 로컬 저장 | 로컬 앱 설정에 그대로 저장합니다. 사용자가 로컬 저장을 선호할 때 단순하게 동작합니다. |
| OS 보호 저장 | 가능한 경우 Electron `safeStorage`를 사용해 OS 보호 저장을 시도합니다. 사용할 수 없으면 평문 저장으로 동작할 수 있습니다. |

비밀정보 화면에서는 실제 값은 표시하지 않고 항목 이름, 종류, 저장 방식, 갱신 시간만 보여줍니다.

전체 삭제 버튼으로 저장된 비밀정보를 지울 수 있습니다.

## 15. 설정

설정 화면은 상단 우측 설정 버튼 또는 `도구 > 설정`에서 열 수 있습니다.

주요 설정 카테고리:

| 카테고리 | 설명 |
|---|---|
| 일반 | 기본 경로와 화면 캡처 설정 |
| Xenesis Agent | 제니스 Agent, Gateway, 외부 봇 채널, 거울이 도구 설정 |
| AI 프로바이더 | Hermes Plug-in, 로컬 CLI, BYOK provider profile 설정, MCP 및 Skill 설치 |
| 언어 | 한국어/영어 등 인터페이스 언어 |
| 화면 모드 | 라이트/다크 테마와 터미널 글꼴 크기 |
| 자동화 | 터미널 자동화 규칙 |
| 키보드 단축키 | 기본 명령과 확장 명령 단축키 |
| 워크스페이스 | 자동 복원과 최근 워크스페이스 |
| 설정 백업 | 설정 내보내기와 가져오기 |
| 터미널 관리 | 로컬 셸, SSH, TELNET 프로필 |
| 원격 파일 | SFTP, FTP, FTPS 프로필 |
| 창 크기/위치 | 창 크기와 좌표 프리셋 |
| 확장 | 확장 상태, 권한, 로그 |
| 비밀정보 | 비밀번호와 API 키 저장 방식 |
| 정보 | 앱 버전, 런타임, 업데이트 |

설정을 변경한 뒤에는 하단 저장 버튼을 눌러야 유지됩니다.

`설정 > AI 프로바이더`에서는 Hermes Plug-in, 로컬 CLI, BYOK provider profile을 관리하고 `MCP 및 Skill 설치` 흐름으로 Codex CLI, Claude, Cursor 같은 외부 에이전트 설정을 준비할 수 있습니다. 배포판에서는 전체 개발용 providers 트리가 아니라 `provider-assets`에 포함된 런타임 자산을 사용합니다. 설치 작업은 적용 전 백업을 만들고, 사용자가 확인한 뒤 최종 저장 단계에서 설정 파일과 provider 자산을 반영합니다.

### 15.1 키보드 단축키

`설정 > 키보드 단축키`에서 기본 명령, 확장 명령, 터미널 묶음 명령에 단축키를 지정할 수 있습니다.

기본적으로 자주 쓰는 단축키:

| 단축키 | 기능 |
|---|---|
| `Ctrl+K` | 커맨드 팔레트 |
| `Ctrl+Shift+T` | 기본 셸 터미널 열기 |
| `Ctrl+S` | 편집기 저장 |
| `Ctrl+F` | 터미널/편집기 검색 |
| `Ctrl+Insert` | 터미널 선택 텍스트 복사 |
| `Shift+Insert` | 터미널 붙여넣기 |

같은 단축키가 여러 명령에 지정되면 먼저 등록된 명령만 실행될 수 있으므로 중복 경고를 확인합니다.

### 15.2 설정 백업

`설정 > 설정 백업`에서 현재 설정을 JSON 파일로 내보내거나 가져올 수 있습니다.

백업에는 원격 서버 프로필, 확장 설정, 워크스페이스 최근 목록, 비밀정보 참조 등이 포함될 수 있습니다. 가져오기 전에는 기존 설정이 자동 백업됩니다.

## 16. 진단/로그 센터

`도구 > 진단/로그 센터`에서 앱 문제를 확인할 수 있습니다.

로그 소스:

- Main
- Renderer
- 확장
- 터미널
- 원격 파일
- 전송
- 시스템

사용 가능한 기능:

- 새로고침
- 수준별 필터
- 소스별 필터
- 검색
- 로그 내보내기
- 진단 번들 내보내기
- 로그 파일 위치 열기
- 로그 지우기

문제가 생겼을 때는 먼저 진단/로그 센터에서 오류 메시지를 확인합니다. 진단 번들은 원인을 확인하는 데 필요한 로그를 모아 저장하며, 비밀번호나 API 키처럼 보이는 값은 최대한 마스킹됩니다.

## 17. 업데이트

`설정 > 정보` 또는 업데이트 영역에서 앱 업데이트 채널을 선택하고 업데이트를 확인할 수 있습니다.

채널:

| 채널 | 용도 |
|---|---|
| Public Stable | 공개 안정판 |
| Internal Dev | 내부 개발판 |
| Nightly | 실험 빌드 |
| Local | 로컬 업데이트 서버 |

설치형 앱은 업데이트 다운로드 후 재시작 시 설치할 수 있습니다. Portable 버전은 자동 업데이트보다 새 Portable 파일을 직접 교체하는 방식을 권장합니다.

## 18. 자주 쓰는 작업 예시

### 18.1 프로젝트를 열고 터미널 실행

1. 파일 탐색기에서 폴더를 선택합니다.
2. 상단 `터미널`에서 PowerShell을 엽니다.
3. 명령 입력 바에 `npm install`을 입력하고 `Enter`를 누릅니다.
4. 이어서 `npm run dev`를 실행합니다.

### 18.2 원격 서버의 설정 파일 수정

1. `설정 > 원격 파일`에서 SFTP 프로필을 추가합니다.
2. 왼쪽 `FTP` 탭에서 프로필을 선택합니다.
3. 원격 폴더로 이동합니다.
4. `.json`, `.env`, `.conf` 같은 텍스트 파일을 더블클릭합니다.
5. 코드 편집기에서 수정합니다.
6. `Ctrl+S`로 저장합니다.
7. 저장 실패 시 진단/로그 센터의 원격 파일 로그를 확인합니다.

### 18.3 Markdown으로 대시보드 문서 작성

1. Markdown 파일을 엽니다.
2. `xcon-sketch` 또는 `xcon-sketch mode view` 코드 펜스를 작성합니다.
3. 미리보기에서 UI 렌더링을 확인합니다. 코드까지 함께 봐야 하면 `mode both`를 명시합니다.
4. 필요한 경우 `xcon-chain-fixture`로 데이터를 바인딩합니다.
5. 저장합니다.

### 18.4 현재 작업 환경 저장

1. 필요한 폴더, 터미널, FTP 프로필, 문서 탭을 열어 둡니다.
2. 상단 `WS+`를 누릅니다.
3. `.xcon-desk-workspace.json` 파일로 저장합니다.
4. 다음 실행 때 `WS` 드롭다운에서 해당 워크스페이스를 다시 엽니다.

## 19. 문제 해결

### 19.1 파일이 열리지 않습니다

확장자가 지원되는지 확인합니다.

- 텍스트 파일이면 코드 편집기로 열립니다.
- 큰 바이너리는 헥스 뷰어 제한에 걸릴 수 있습니다.
- DOC, PPT, HWPX는 현재 미지원 안내가 표시될 수 있습니다.
- HWP는 실험적 지원이라 파일에 따라 실패할 수 있습니다.

오류가 반복되면 진단/로그 센터에서 Renderer 로그를 확인합니다.

### 19.2 원격 파일 저장이 되지 않습니다

확인할 항목:

- 읽기 전용 미리보기 화면이 아닌지 확인합니다.
- 코드, Markdown, Mermaid 편집기로 열었는지 확인합니다.
- 서버 계정에 쓰기 권한이 있는지 확인합니다.
- FTP 인코딩이 서버와 맞는지 확인합니다.
- 연결이 끊어졌다면 파일을 새로 열고 다시 저장합니다.

### 19.3 FTP 파일명이 깨집니다

`설정 > 원격 파일`에서 해당 프로필의 인코딩을 확인합니다.

국내 구형 FTP 서버는 UTF-8이 아니라 EUC-KR 또는 CP949를 사용하는 경우가 많습니다. 파일명이 깨지면 EUC-KR, CP949 순서로 테스트합니다.

### 19.4 SSH 또는 TELNET 접속이 안 됩니다

확인할 항목:

- 호스트와 포트
- 방화벽
- 사용자명
- 비밀번호 또는 개인 키
- 키 패스프레이즈
- 연결 타임아웃

TELNET은 서버의 로그인 프롬프트 형식에 따라 자동 입력이 실패할 수 있습니다.

### 19.5 캡처 오버레이가 이상합니다

다중 모니터, 해상도, DPI 배율에 따라 오버레이 위치가 영향을 받을 수 있습니다.

확인할 항목:

- 앱 창이 어느 모니터에 있는지
- Windows 디스플레이 배율
- 캡처 직후 진단/로그 센터의 system/main 로그
- 그래픽 드라이버 상태

캡처 자체는 되었지만 선택 영역 표시가 이상하면 앱을 최신 버전으로 업데이트한 뒤 다시 확인합니다.

### 19.6 확장 명령이 보이지 않습니다

확인할 항목:

- `설정 > 확장`에서 확장이 켜져 있는지
- 확장 로드 오류가 있는지
- 확장이 명령을 등록했는지
- 명령이 도구 메뉴 또는 커맨드 팔레트 위치에 등록되어 있는지
- 내부 확장 폴더가 배포판에서 제외되었는지

로드 오류가 있으면 `재시도`를 누르고, 그래도 실패하면 진단/로그 센터의 확장 로그를 확인합니다.

### 19.7 MCP가 동작하지 않습니다

확인할 항목:

- `mcp/xenesis-desk-mcp-server.mjs` 파일이 있는지
- 앱이 실행 중인지
- `%USERPROFILE%\.xenis\mcp\bridge.json` 또는 `%XENIS_HOME%\mcp\bridge.json`에 현재 bridge URL과 token이 기록되어 있는지
- 로컬 CLI 터미널에 `XENIS_MCP_CONFIG_FILE` 또는 `XENIS_MCP_CONFIG_SNIPPET`이 주입되었는지
- WSL2 Hermes를 쓰는 경우 `XENIS_MCP_BRIDGE_URL`이 WSL2에서 Windows Xenesis Desk bridge로 접근 가능한 주소인지
- 외부 에이전트가 해당 MCP 설정을 읽고 있는지
- 진단/로그 센터에 MCP bridge 오류가 있는지

배포판에서 `mcp/` 폴더를 제외했다면 MCP 기능은 자동으로 비활성화됩니다. 일반 릴리스 구성은 `mcp/**/*`를 포함합니다.

### 19.8 워크스페이스 복원 후 터미널이 자동 접속되지 않습니다

`설정 > 워크스페이스`에서 터미널 복원 옵션을 확인합니다.

보안을 위해 SSH/TELNET 자동 재연결은 꺼져 있을 수 있습니다. 필요한 경우 해당 옵션을 켜고 워크스페이스를 다시 저장합니다.

### 19.9 Xenesis Bot이 보이지 않거나 응답하지 않습니다

Bot 명령이 `도구`와 커맨드 팔레트에 없다면 Xenesis Desk 앱이 최신 확장 manifest를 읽지 않은 상태일 수 있습니다.

확인할 항목:

- Xenesis Desk 앱을 재시작했는지
- `설정 > 확장`에서 확장 로드 오류가 없는지
- 공개 릴리스라면 release-safe `Xenesis Bot` shim이 포함된 빌드인지
- 커맨드 팔레트에서 `Xenesis Bot`으로 검색되는지

Hermes 로그에 다음 경고가 나오면 user allow-list 문제입니다.

```text
Unauthorized user: xenesis (Xenesis Desk) on xenesis_desk_bot
```

Hermes 환경에 `XENIS_BOT_ALLOWED_USERS=xenesis`를 설정하거나, 운영상 허용된다면 `XENIS_BOT_ALLOW_ALL_USERS=true`를 설정한 뒤 gateway를 재시작합니다.

Hermes 로그에 `HTTP Error 404: Not Found`가 나오면 URL을 먼저 확인합니다.

- `XENIS_MCP_BRIDGE_URL`: Xenesis Desk bridge. 보통 `http://127.0.0.1:3847`, 개발 실행은 `http://127.0.0.1:3848`
- `XENIS_BOT_INPUT_URL`: Hermes listener. 보통 `http://127.0.0.1:3859/message`

이 두 값을 서로 바꾸거나 `XENIS_MCP_BRIDGE_URL`에 `3859/message`를 넣으면 Bot send가 404로 실패합니다.

### 19.10 XCON 파일이 프로젝트 루트에 생성됩니다

XCON/SKETCH Markdown 생성 도구의 기본 출력은 `XENIS_HOME/exports`입니다. `workspaceDir` 또는 `outDir`에 상대 경로를 넘겨도 현재 작업 폴더가 아니라 exports 아래로 저장되어야 합니다.

프로젝트 루트에 계속 파일이 생기면 다음을 확인합니다.

- 실제 실행 중인 Hermes가 수정된 `xenesis_desk_gateway` 플러그인 복사본을 쓰는지
- Hermes gateway를 플러그인 업데이트 후 재시작했는지
- `XENIS_HOME`이 의도치 않게 프로젝트 루트로 설정되어 있지 않은지
- WSL2 Hermes에서 Windows 경로와 `/mnt/<drive>/...` 경로가 섞이지 않았는지
- 도구 호출 인자에 절대 `workspaceDir`가 프로젝트 루트로 들어가지 않는지

## 20. 권장 사용 습관

- 프로젝트마다 `.xcon-desk-workspace.json`을 하나씩 만들어 둡니다.
- 서버 접속 정보는 `설정 > 터미널 관리`와 `설정 > 원격 파일`에서 프로필로 관리합니다.
- 비밀번호와 API 키는 `설정 > 비밀정보`에서 저장 방식을 확인합니다.
- 원격 파일을 수정하기 전에는 전송 큐와 저장 상태 메시지를 확인합니다.
- 문제가 생기면 먼저 진단/로그 센터에서 원인을 확인합니다.
- 내부 개발용 확장은 공개 배포판에 포함하지 않고, 필요한 경우 사용자 확장으로 따로 관리합니다.
