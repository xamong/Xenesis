# Xenesis Desk MCP Prompt Quality Matrix

이 문서는 Xenesis Desk MCP prompt가 실제 LLM 생성에 충분한지 확인하기 위한 대표 시나리오 기준표입니다. `mcp/prompts/README.md`는 prompt 파일 구조의 기준이고, 이 문서는 품질 점검과 회귀 방지를 위한 기준입니다.

## Automated Guardrails

자동 테스트는 LLM을 호출하지 않습니다. 대신 `xenesis_desk_get_xcon_prompt`가 대표 시나리오별로 필요한 prompt 섹션을 조립하는지 확인합니다.

현재 자동 검증 범위:

| Kind | Task | Brief | 반드시 포함되어야 하는 내용 |
|------|------|-------|-----------------------------|
| `strict-sketch` | `status-card` | Create a compact production status card. | strict profile, exactly one `xcon-sketch` fence, no outer Markdown fence |
| `markdown-xcon` | `dashboard` | Create an operations dashboard report with a chart and table. | Markdown document prompt, Domain Blueprint, dashboard/chart/map/network recipes, family binding recipes |
| `dashboard-workflow` | `workflow-monitor` | Create a workflow runner monitoring dashboard. | XCON Workflow, `workqueue`, `scheduler`, chart guidance |
| `family-template` | `data-bound-template` | Create a living stock brief with fixture, chain, and sketch. | XCON family data-binding template, family binding workflow recipes, fixture-first refresh rules |
| `chat-artifact` | `bot-response` | Create a chat answer that streams a small artifact. | chat artifact shape, streaming answer style, `xcon-sketch` output |

자동 테스트가 확인하지 않는 것:

- LLM이 실제로 올바른 XCON을 생성했는지
- 생성물이 Xenesis Desk 화면에서 충분히 보기 좋은지
- 업무 도메인에 맞는 정보 밀도와 레이블을 골랐는지

이 부분은 아래 Manual LLM Evaluation으로 확인합니다.

## Manual LLM Evaluation

실제 LLM 품질 점검은 아래 순서로 수행합니다.

1. `xenesis_desk_get_xcon_prompt`로 해당 kind의 prompt를 가져옵니다.
2. LLM에 prompt와 대표 brief를 전달합니다.
3. LLM 출력 Markdown을 `xenesis_desk_validate_xcon_markdown`으로 검증합니다.
4. 통과하면 `xenesis_desk_create_xcon_markdown_from_content`로 저장하고 Xenesis Desk에서 엽니다.
5. 아래 scorecard로 결과를 평가합니다.

### Scorecard

| 항목 | 통과 기준 |
|------|-----------|
| Fence 계약 | 필요한 fence가 있고, 불필요한 outer `markdown` fence가 없습니다. |
| Parser 통과 | `xenesis_desk_validate_xcon_markdown`이 성공합니다. |
| 화면 완결성 | 첫 화면에서 제목, 핵심 지표, 보조 정보, 다음 행동이 보입니다. |
| Bounds 안정성 | 주요 텍스트와 component가 겹치지 않고 화면 밖으로 나가지 않습니다. |
| Component 적합성 | 표는 `spanGrid`, 추이는 `chart`, 상태는 label/badge/panel 계열을 사용합니다. |
| 과잉 생성 방지 | 사용자가 요청하지 않은 chain/workflow/fixture를 추가하지 않습니다. |
| 저장/열기 의도 | 사용자가 열기를 원할 때만 `openInDesk`를 사용합니다. |

## Representative Checks

### strict-sketch / status-card

목표:

- 작은 모델도 안정적으로 렌더링 가능한 화면을 만듭니다.
- Markdown heading 하나와 `xcon-sketch` fence 하나만 반환합니다.

주의:

- showcase recipe나 dashboard recipe를 붙이지 않습니다.
- 고급 component보다 `panel`, `label`, `button`, `chart`, `spanGrid`처럼 검증된 component를 우선합니다.

### markdown-xcon / dashboard

목표:

- Markdown 보고서 안에 대시보드 SKETCH를 포함합니다.
- 운영자가 바로 읽을 수 있는 요약, KPI, chart, table을 포함합니다.

주의:

- 문서형 출력이므로 화면만 던지지 않습니다.
- 대시보드 task에서는 Domain Blueprint와 dashboard/chart/map/network recipe가 함께 들어와야 합니다.

### dashboard-workflow / workflow-monitor

목표:

- 워크플로우 의미와 화면 구성을 함께 표현합니다.
- queue, scheduler, branch, monitoring 상태를 사람이 이해할 수 있게 만듭니다.

주의:

- workflow만 만들지 말고, 사용자가 dashboard를 요청했다면 시각화 guidance도 유지합니다.
- 실행 가능한 action type을 벗어나지 않습니다.

### family-template / data-bound-template

목표:

- fixture, Chain alias, Markdown narrative, SKETCH layout을 하나의 living document로 묶습니다.
- 이후 갱신은 layout 재생성이 아니라 fixture refresh로 처리합니다.

주의:

- `xcon-chain-fixture`와 Chain alias의 관계를 명확히 둡니다.
- 기존 SKETCH를 재생성하지 말고 fixture만 갱신하는 규칙을 유지합니다.

### chat-artifact / bot-response

목표:

- 채팅 응답처럼 자연스럽게 읽히면서 작은 artifact가 함께 렌더링됩니다.
- Xenesis Bot이나 Hermes Gateway 스트림에서 바로 보여줄 수 있는 출력 형태를 만듭니다.

주의:

- 내부 구현 로그를 노출하지 않습니다.
- 말로 충분한 답변에는 과도한 dashboard를 만들지 않습니다.

## When To Revisit Prompts

아래 문제가 반복되면 prompt 파일을 조정합니다.

- fence 누락이나 outer `markdown` fence가 반복됩니다.
- `screen` 선언이 없거나 첫 줄이 아닌 경우가 반복됩니다.
- 존재하지 않는 component type이나 prop을 자주 만듭니다.
- chart/table/map 같은 고가치 component를 써야 할 요청에서 단순 label만 만듭니다.
- data-bound 문서에서 매번 layout을 다시 생성합니다.
- Bot 응답에서 구현 로그, JSON-RPC, 내부 tool 이름을 사용자에게 노출합니다.
