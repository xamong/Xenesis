# Xenesis Desk MCP Prompt Usage Guide

이 문서는 LLM이나 Hermes 같은 에이전트가 Xenesis Desk MCP 프롬프트를 실제로 사용할 때의 기준입니다. 프롬프트 파일의 원본 설명은 `mcp/prompts/README.md`가 기준이고, 이 문서는 호출 순서와 운영 관점을 정리합니다.

## 핵심 원칙

- 먼저 프롬프트를 고르고, 그 다음 생성하고, 반드시 검증한 뒤 저장합니다.
- `xcon-sketch` fence는 Markdown 안에서 실제 렌더링되는 계약이므로, 보기 좋은 설명보다 파서 통과와 화면 완결성을 우선합니다.
- 작은 모델이나 자동 수리 루프에서는 `strict-sketch`를 먼저 사용합니다.
- 완성된 Markdown을 저장할 때는 `xenesis_desk_create_xcon_markdown_from_content`를 사용합니다. 이 도구는 저장 전에 `xcon-sketch` fence를 검증합니다.

## 도구 기반 기본 흐름

MCP 클라이언트가 `prompts/get`을 직접 지원하지 않는 경우에는 아래 순서를 사용합니다.

1. `xenesis_desk_get_xcon_prompt`로 작업에 맞는 prompt `kind`를 가져옵니다.
2. LLM이 반환받은 지침과 사용자 요청을 기준으로 Markdown 또는 SKETCH를 생성합니다.
3. `xenesis_desk_validate_xcon_markdown`으로 생성 Markdown을 검증합니다.
4. 검증이 통과하면 `xenesis_desk_create_xcon_markdown_from_content`로 저장하고 필요 시 Xenesis Desk에서 엽니다.
5. 검증이 실패하면 `review-repair` 또는 `strict-sketch` 지침으로 내용을 단순화한 뒤 다시 검증합니다.

## Prompt Kind 선택 기준

| Kind | 사용할 때 | 기본 성격 |
|------|-----------|-----------|
| `sketch-ui` | 앱 화면, 대시보드, UI mockup을 크게 구성할 때 | 시각 품질 우선 |
| `strict-sketch` | 첫 생성부터 렌더링 성공률이 중요할 때 | 검증 안정성 우선 |
| `markdown-xcon` | 설명 문서 안에 XCON/SKETCH 시각 블록을 넣을 때 | 문서 + 시각화 |
| `dashboard-workflow` | 대시보드 화면과 워크플로우 의미를 함께 만들 때 | 운영/흐름 표현 |
| `family-template` | fixture, chain, Markdown, SKETCH를 함께 묶을 때 | 데이터 바인딩 문서 |
| `review-repair` | 생성된 Markdown 또는 SKETCH를 검토하고 고칠 때 | 수리/축소 |
| `chat-artifact` | Bot 응답처럼 Markdown 스트림 중 artifact를 렌더링할 때 | 대화형 출력 |
| `chain` | XCON Chain alias, fixture, 계산식을 작성할 때 | 데이터 변환 |
| `workflow` | XCON Workflow action, branch, scheduler를 작성할 때 | 실행 흐름 |
| `template-lab` | 데이터 갱신형 업무 문서 템플릿을 만들 때 | 문서 자동화 |

## MCP Prompt Template

`prompts/list`를 지원하는 클라이언트는 아래 template을 직접 사용할 수 있습니다.

- `xcon.sketch-ui`
- `xcon.strict-sketch`
- `xcon.markdown-document`
- `xcon.dashboard-workflow`
- `xcon.family-template`
- `xcon.review-repair`
- `xcon.chat-artifact`

`chain`, `workflow`, `template-lab`은 MCP prompt template이 아니라 `xenesis_desk_get_xcon_prompt`의 `kind` 값으로 조립해서 사용하는 프로필입니다.

## Strict SKETCH 운영 절차

`strict-sketch`는 LLM이 XCON을 잘 만들 수 있는지 확인하는 기준점입니다. 복잡한 화면 생성 전에 먼저 이 프로필로 작은 화면을 통과시키면, 프롬프트와 검증 파이프라인의 문제를 빨리 찾을 수 있습니다.

권장 절차:

1. `xenesis_desk_get_xcon_prompt`에 `kind: "strict-sketch"`를 지정합니다.
2. LLM에게 Markdown heading 하나와 `xcon-sketch` fence 하나만 반환하게 합니다.
3. `xenesis_desk_validate_xcon_markdown`으로 fence 개수와 SKETCH 파싱을 확인합니다.
4. 통과하면 `xenesis_desk_create_xcon_markdown_from_content`로 저장합니다.
5. 실패하면 unsupported component, 누락된 `screen`, 닫히지 않은 fence, bounds 누락 여부를 먼저 고칩니다.

검증 기준 샘플은 `docs/strict-sketch-sample.md`입니다. 이 파일은 테스트에서 직접 파싱되므로, strict 프로필의 최소 렌더링 계약을 깨뜨리면 테스트가 실패해야 합니다.

## 품질 점검 기준

대표 시나리오별 prompt 품질 기준은 `docs/mcp-prompt-quality-matrix.md`를 따릅니다. 이 matrix는 자동 테스트로 확인하는 prompt 조립 조건과, 실제 LLM 출력물을 사람이 점검할 때 볼 항목을 분리해서 정리합니다.

## 저장 경로와 열기

`xenesis_desk_create_xcon_markdown_from_content`와 `xenesis_desk_create_xcon_markdown`은 `workspaceDir` 또는 `outDir`을 받을 수 있습니다.

- 절대 경로는 그대로 사용합니다.
- 상대 경로는 `XENIS_HOME/exports` 아래로 해석합니다.
- `openInDesk`는 사용자가 실제로 Xenesis Desk에서 열기를 원할 때만 `true`로 지정합니다.
- `placement`는 `tab`, `left`, `right`, `top`, `bottom` 중 하나를 사용합니다.

## 실패 시 우선 점검 항목

검증 실패 유형별 repair loop는 `docs/mcp-xcon-repair-loop.md`를 따릅니다. 특히 `No xcon-sketch fences were found.`, `xcon-sketch fence is empty.`, `xcon-sketch fence must start with screen.`, parser failure는 서로 다른 복구 경로를 사용합니다.

- Markdown 전체가 또 다른 ```markdown fence로 감싸져 있지 않은지 확인합니다.
- `xcon-sketch` fence가 하나 이상 있고, strict 작업에서는 정확히 하나만 있는지 확인합니다.
- fence 내부 첫 줄이 완전한 `screen` 선언인지 확인합니다.
- 모든 component가 `at x y width height` bounds를 갖는지 확인합니다.
- prompt 00의 compact safe set 또는 prompt 10의 showcase component catalog 밖의 타입을 만들지 않았는지 확인합니다.
- 차트나 표처럼 JSON을 받는 prop은 따옴표와 괄호가 닫혀 있는지 확인합니다.

## 현행화 체크

프롬프트 파일을 추가, 삭제, 이름 변경할 때는 아래를 함께 확인합니다.

- `mcp/xenesis-desk-mcp-server.mjs`의 `promptFiles`, `promptTemplates`, `promptFilesForKind()`
- `mcp/prompts/README.md`
- `docs/mcp-integration.md`
- `docs/mcp-capabilities.md`
- `scripts/mcpBridge.test.mjs`
