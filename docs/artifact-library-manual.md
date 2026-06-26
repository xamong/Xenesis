# Xenesis Desk Artifact Library 상세 매뉴얼

이 문서는 Xenesis Desk의 Artifact Library와 관련된 아티팩트 흐름을 상세히 설명합니다. 사용자 매뉴얼의 요약 설명보다 한 단계 더 구체적으로, 어떤 기능인지, 무엇을 할 수 있는지, 어떤 제한이 있는지, AI Workbench와 Hermes Timeline에서 어떻게 이어지는지를 정리합니다.

## 1. Artifact Library란?

Artifact Library는 Xenesis Bot, Hermes gateway, AI Workbench, 캡처 기능, XCON/SKETCH/워크플로우 도구가 만들어 낸 산출물을 한 곳에서 확인하는 패널입니다.

Xenesis Desk에서 artifact는 단순한 파일 목록이 아니라 다음 정보를 함께 가진 작업 산출물입니다.

| 항목 | 설명 |
|---|---|
| label | 화면에 표시되는 artifact 이름입니다. |
| kind/typeLabel | Markdown, XCON, Pane capture, Screenshot, Trace, workflow 같은 artifact 종류입니다. |
| filePath | 실제 파일이 저장된 경로입니다. 파일이 없거나 접근할 수 없으면 preview, reveal, validate 일부 기능이 제한됩니다. |
| sessionId/messageId | 어떤 Xenesis Bot 세션과 메시지에서 만들어졌는지 추적하는 값입니다. |
| open/focus command | Bot이나 Xenesis Desk bridge를 통해 artifact를 열거나 관련 메시지로 이동할 때 사용하는 명령 정보입니다. |
| metadata | 생성 시각, 원본 메시지, hidden artifact marker, 검증에 필요한 보조 정보입니다. |

Artifact Library는 생성된 파일을 대신 저장하는 저장소가 아니라, 이미 생성된 파일과 Bot 메시지 metadata를 모아 탐색, 검토, 검증, 비교, 복구 요청으로 연결하는 작업 허브입니다.

## 2. 어디서 열 수 있나?

Artifact Library는 다음 경로에서 열 수 있습니다.

| 위치 | 동작 |
|---|---|
| 도구 메뉴 | `Artifact Library` 항목을 선택합니다. |
| 커맨드 팔레트 | `Ctrl+K`를 누른 뒤 `Artifact Library`를 검색합니다. |
| Xenesis Bot starter action | Bot 입력창 위의 `Artifact Library` 버튼을 누릅니다. |
| AI Workbench | AI Workbench에서 artifact 맥락이 필요한 경우 Artifact Library로 이동해 세부 artifact를 확인합니다. |

Artifact Library를 열면 현재 Xenesis Desk bridge snapshot과 Xenesis Bot 세션에서 수집 가능한 artifact 목록을 다시 읽습니다. 필요하면 `Refresh`로 목록을 수동 갱신할 수 있습니다.

## 3. 지원 artifact 종류

Artifact Library는 모든 artifact를 같은 방식으로 다루지 않습니다. 파일 종류에 따라 미리보기, 검증, 비교 가능 여부가 다릅니다.

| 종류 | 예시 | 할 수 있는 작업 |
|---|---|---|
| Pane capture | 활성 pane 캡처 이미지 | 썸네일, Quick Preview, Show Preview, Send to Agent, Open, Focus, Reveal, Copy path |
| Screenshot | 전체 화면이나 영역 캡처 이미지 | 썸네일, Quick Preview, Show Preview, Send to Agent, Open, Focus, Reveal, Copy path |
| Trace | 실행 로그, 터미널 trace, workflow trace | 읽기 전용 preview, Send to Agent, Open, Focus, Reveal, Copy path |
| Markdown | Bot이 생성한 `.md` 문서 | 읽기 전용 preview, Validate, Repair, Compare Selected, Send to Agent |
| XCON | `.xcon`, `.xcon.sketch`, XCON markdown | 읽기 전용 preview, Validate, Repair, Compare Selected, Send to Agent |
| workflow | XCON workflow/SKETCH workflow 산출물 | 읽기 전용 preview, Validate, Repair, Compare Selected, Send to Agent |
| 기타 파일 | 위 범주로 분류되지 않은 파일 | Open, Focus, Reveal, Copy path 중심으로 사용합니다. |

`*.xcon.sketch`는 Xenesis Desk 작업 흐름에서 텍스트 기반 XCON/SKETCH artifact로 취급합니다. 일반 바이너리 이미지처럼 읽는 것이 아니라, 텍스트 preview와 XCON 검증 흐름에 연결하는 것이 기본 의도입니다.

## 4. 목록에서 확인하는 정보

Artifact Library의 각 행은 artifact를 빠르게 식별하고 후속 작업을 실행할 수 있도록 구성되어 있습니다.

| 영역 | 설명 |
|---|---|
| 체크박스 | 여러 artifact를 선택해 bundle 전송이나 비교에 사용합니다. |
| 썸네일 | Pane capture, Screenshot처럼 이미지 preview가 가능한 artifact의 축소 이미지입니다. |
| 종류 배지 | `Pane capture`, `Screenshot`, `Trace`, `Markdown`, `XCON`, `workflow` 같은 종류를 표시합니다. |
| health badge | 최근 검증 상태를 `OK`, `Needs review`, `Not validated`, `Missing file` 중 하나로 표시합니다. |
| 제목 | artifact label입니다. 파일 경로나 메시지 제목에서 추출됩니다. |
| metadata 줄 | artifact kind, sessionId, messageId를 표시합니다. |
| filePath | 실제 파일 경로입니다. Reveal, Copy path, Open 동작의 기준이 됩니다. |
| 행 버튼 | `Show Preview`, `Send to Agent`, `Open`, `More`가 표시됩니다. |

상단의 `Type` 필터와 검색 입력을 함께 사용하면 목록이 많을 때 필요한 artifact만 좁혀볼 수 있습니다.

정렬은 `Newest`, `Type`, `Session` 중 선택할 수 있습니다.

| 정렬 | 설명 |
|---|---|
| Newest | 생성 시각이 최신인 artifact를 먼저 보여줍니다. 최근 Bot 결과를 확인할 때 적합합니다. |
| Type | Pane capture, Screenshot, Markdown, XCON, workflow 같은 종류별로 묶어 봅니다. 같은 종류끼리 비교하거나 검증할 때 적합합니다. |
| Session | Bot sessionId 기준으로 묶어 봅니다. 여러 세션에서 비슷한 artifact가 만들어졌을 때 출처별로 확인할 수 있습니다. |

## 5. 기본 작업 흐름

### 5.1 Show Preview와 Quick Preview

`Show Preview`를 누르면 선택한 artifact가 `Quick Preview` 영역에 표시됩니다.

Quick Preview는 다음 방식으로 동작합니다.

| artifact | preview 방식 |
|---|---|
| Pane capture/Screenshot | 이미지로 표시합니다. 화면 잘림, 레이아웃 깨짐, 렌더링 누락을 육안으로 확인할 수 있습니다. |
| Markdown | Markdown/XCON renderer를 사용해 읽기 전용으로 표시합니다. |
| XCON/workflow/Trace | 코드 또는 텍스트 preview로 읽기 전용 표시합니다. |
| 미지원 파일 | preview가 제한되며 Open 또는 Reveal 중심으로 확인합니다. |

Quick Preview는 파일을 수정하지 않습니다. 내용 확인, Bot 전송, 검증 시작을 위한 읽기 전용 확인 영역입니다.

### 5.1.1 Artifact Details

`Artifact Details`는 Quick Preview보다 큰 상세 확인 영역입니다. 목록 행의 `Show Details` 또는 Quick Preview의 `Show Details`로 열 수 있습니다.

Artifact Details에서 확인할 수 있는 정보:

| 영역 | 설명 |
|---|---|
| metadata | Type, Kind, Session, Message, Created, File, Open, Focus 값을 표 형태로 확인합니다. |
| Preview | 이미지 artifact는 큰 preview로 확인합니다. 텍스트 artifact는 `Show Preview`로 Quick Preview에 읽어옵니다. |
| Fit/Actual | 이미지 preview를 화면에 맞춰 보거나 실제 크기 기준으로 확인합니다. |
| Validation | 해당 artifact의 최근 Validation Results만 모아 봅니다. |
| Provenance | `xenesis-artifact-provenance` payload를 바로 확인합니다. |
| Timeline | 해당 artifact에 대한 Preview, Validate, Repair loop, Open 같은 최근 action만 모아 봅니다. |

filePath가 없는 artifact는 `File path missing`으로 표시됩니다. 이 경우 Open, Reveal, preview, compare, validation 일부 기능이 제한될 수 있습니다.

### 5.2 Send to Agent

`Send to Agent`은 현재 artifact 하나를 Xenesis Bot에 컨텍스트로 전달합니다. Bot에는 `xenesis-artifact-context` fenced block이 포함된 메시지가 전달됩니다.

이 기능은 다음 상황에 적합합니다.

| 상황 | 사용 예 |
|---|---|
| 이미지 레이아웃 점검 | Pane capture 또는 Screenshot을 Bot에 보내 잘림, 겹침, 렌더링 문제를 분석하게 합니다. |
| XCON 검토 | 생성된 XCON artifact를 Bot에 보내 구조와 검증 방향을 설명하게 합니다. |
| Markdown 검토 | 생성된 문서의 누락, 흐름, 표현을 점검하게 합니다. |
| workflow 검토 | workflow artifact를 Bot에 보내 분기, 파라미터, 실행 순서를 점검하게 합니다. |

### 5.3 여러 artifact 선택과 Send Bundle to Agent

목록 왼쪽의 체크박스로 여러 artifact를 선택하면 선택 바가 표시됩니다. 여기서 `Send Bundle to Agent`을 누르면 선택된 artifact 목록이 `xenesis-artifact-bundle` fenced block으로 Bot에 전달됩니다.

Bundle 전송은 여러 산출물을 함께 검토해야 할 때 사용합니다.

예:

- XCON 파일과 캡처 이미지를 같이 보내 렌더링 결과와 원본 구조를 비교합니다.
- validation 실패 artifact와 관련 trace를 같이 보내 원인을 분석합니다.
- Markdown dashboard와 workflow artifact를 같이 보내 생성 의도와 결과를 검토합니다.

Bundle payload에는 `artifact-bundle-mode` marker가 포함됩니다. AI Workbench의 Context Bundle도 같은 marker를 사용해 Bot이 bundle 목적을 구분할 수 있게 합니다.

AI Workbench에서는 `Suggested artifacts`, `Bundle Preview`, `Send Selected Bundle` 흐름으로 bundle 전송 전에 포함될 artifact를 확인할 수 있습니다. 아무 artifact도 직접 선택하지 않으면 현재 bundle mode에 맞는 추천 artifact가 사용되고, 체크박스를 조정하면 사용자가 고른 artifact만 `xenesis-artifact-bundle`로 전달됩니다.

### 5.3.1 Artifact Review Packs

선택한 artifact 묶음을 반복해서 검토해야 하면 `Artifact Review Packs` 영역을 사용합니다.

기본 흐름:

1. 목록에서 함께 검토할 artifact를 선택합니다.
2. 필요하면 review pack 이름을 입력합니다.
3. `Save Review Pack`을 눌러 선택 묶음을 저장합니다.
4. 이후 같은 패널에서 `Send Pack to Bot`을 눌러 저장된 묶음을 다시 Bot에 전달합니다.

Review Pack은 선택 당시의 artifact metadata를 `xenesis-artifact-review-pack` fenced block으로 보냅니다. payload에는 `artifact-bundle-mode` marker가 포함되어 Bot이 일반 artifact bundle과 같은 계열의 검토 맥락으로 이해할 수 있습니다.

저장된 Review Pack은 localStorage의 `xenesis-artifact-review-packs` 키에 보관됩니다. 이 값은 로컬 UI 편의 정보이며 artifact 원본 파일이나 Bot 세션 메시지를 변경하지 않습니다.

### 5.4 Open, Focus, Reveal, Copy path

Artifact Library는 파일과 Bot 메시지를 오가는 작업을 빠르게 하기 위해 기본 이동 동작을 제공합니다.

| 동작 | 설명 |
|---|---|
| Open | artifact 파일이나 관련 화면을 Xenesis Desk에서 엽니다. |
| Focus | artifact를 만든 Bot 메시지나 관련 context로 이동합니다. |
| Reveal | filePath가 있는 artifact를 파일 탐색기 위치에서 보여줍니다. |
| Copy path | filePath를 클립보드에 복사합니다. UI의 `More` 메뉴에서는 짧게 `Copy`로 표시될 수 있습니다. |

Open과 Focus는 artifact metadata에 command가 있어야 활성화됩니다. filePath가 없는 artifact는 Reveal과 Copy path가 비활성화됩니다.

### 5.5 More 메뉴

행 오른쪽의 `More` 메뉴에는 자주 쓰는 버튼보다 상대적으로 보조적인 작업이 정리되어 있습니다.

| 메뉴 | 설명 |
|---|---|
| Validate | artifact를 검증합니다. Markdown, XCON, workflow에서 특히 유용합니다. |
| Repair | artifact를 Bot에 보내 수리 요청을 시작합니다. |
| Provenance | artifact 생성 출처와 command 정보를 확인합니다. |
| Focus | 관련 메시지나 context로 이동합니다. |
| Reveal | 파일 위치를 엽니다. |
| Copy | 파일 경로를 복사합니다. |

## 6. Validation Results

`Validate`는 artifact가 유효한지 확인하고, 검증 결과를 `Validation Results` 패널에 쌓습니다.

검증은 가능한 경우 Xenesis Desk bridge의 검증 경로를 사용합니다. XCON/Markdown 계열 artifact는 `xenesis_desk_validate_xcon_markdown` 경로로 검증을 시도할 수 있습니다. 직접 검증할 수 없는 경우에는 Bot에 검증 요청을 보내는 fallback 흐름으로 전환됩니다.

Validation Results 카드에는 다음 정보가 표시됩니다.

| 항목 | 설명 |
|---|---|
| label | 검증한 artifact 이름입니다. |
| OK/Needs review | 검증 성공 여부입니다. |
| message/detail | 검증 메시지와 상세 오류입니다. |
| Open artifact | 해당 artifact를 바로 엽니다. |
| Revalidate | 같은 artifact를 다시 검증합니다. |
| Repair with Bot | 검증 결과를 바탕으로 Bot에 수리 요청을 보냅니다. |
| Preview repair plan | artifact, validation detail, safe edit 도구 목록을 `xenesis-artifact-repair-loop` payload로 Bot에 보냅니다. |
| Open Safe File Edit Center | Safe File Edit Center를 열어 diff preview, backup apply, restore 흐름으로 이어갑니다. |

`Repair with Bot`은 파일을 바로 덮어쓰는 기능이 아닙니다. Bot은 원인을 분석하고 최소 수정안을 제안해야 하며, 실제 파일 변경은 `preview/apply` 흐름처럼 사용자가 diff를 확인한 뒤 적용하는 절차를 따라야 합니다.

`Preview repair plan`은 수리 루프를 더 명시적으로 시작합니다. Bot에는 `xenesis_desk_preview_text_file_write`, `xenesis_desk_apply_text_file_write`, `xenesis_desk_restore_text_file_backup` 도구를 사용하라는 안전 지침과 validation 실패 정보가 함께 전달됩니다. 이 흐름은 “원인 분석 → 최소 수정안 → diff preview → 사용자 승인 → apply → revalidate” 순서를 전제로 합니다.

Validation Results는 localStorage의 `xenesis-artifact-validation-results` 키에 저장됩니다. Artifact Library를 다시 열어도 최근 검증 결과를 복원하고, 목록 행의 health badge도 이 저장된 결과를 기준으로 계산합니다. 같은 artifact를 찾을 때는 artifact id를 우선 사용하고, 세션이 달라져 id가 달라진 경우에는 filePath를 기준으로 다시 연결할 수 있습니다.

health badge의 의미:

| 상태 | 의미 |
|---|---|
| `OK` | 최근 검증이 성공했습니다. |
| `Needs review` | 최근 검증이 실패했거나 fallback 수리 검토가 필요합니다. |
| `Not validated` | filePath는 있지만 아직 검증 기록이 없습니다. |
| `Missing file` | artifact metadata에 filePath가 없어 local preview, compare, safe edit handoff가 제한됩니다. |

`Open Safe File Edit Center`는 artifact filePath를 `xenesis-safe-file-edit-handoff` 이벤트와 localStorage handoff로 전달합니다. Safe File Edit Center가 이미 열려 있으면 즉시 해당 파일을 로드하고, 새로 열리는 경우에는 저장된 handoff를 소비한 뒤 파일을 로드합니다.

## 7. Artifact Compare

`Compare Selected`는 선택된 text artifact 두 개를 비교합니다. Markdown, XCON, workflow처럼 텍스트로 읽을 수 있는 artifact에 적합합니다.

기본 흐름:

1. 목록에서 비교할 artifact 2개 이상을 선택합니다.
2. 비교 모드를 `Line diff` 또는 `Structural diff`로 선택합니다.
3. `Compare Selected`를 누릅니다.
4. `Artifact Compare` 패널에서 요약과 diff를 확인합니다.
5. 필요하면 `Copy diff`로 diff를 복사합니다.
6. 분석이 필요하면 `Send compare to Agent`으로 Bot에 비교 결과를 전달합니다.

비교 결과는 `xenesis-artifact-compare` payload로 Bot에 보낼 수 있습니다. 이때 양쪽 artifact label, filePath, diff summary가 함께 전달되어 Bot이 어떤 산출물끼리 비교했는지 알 수 있습니다.

`Line diff`는 파일 텍스트의 변경 줄을 빠르게 확인하는 용도입니다.

`Structural diff`는 XCON/workflow 텍스트에서 `action`, `id`, `type`, `command`, `name`, `label`, `mode`, `success`, `failure`, `catch`, `finally` 같은 구조 토큰을 추출해 비교합니다. 줄 번호나 JSON 포맷이 조금 달라져도 workflow 구조 변화가 있는지 확인하기 쉽습니다. 다만 전체 XCON AST 검증이나 workflow graph 실행 분석은 아니므로, 구조 diff가 같더라도 값/표현식/파라미터 차이는 별도로 preview와 validation으로 확인해야 합니다.

## 8. Provenance

`Provenance`는 artifact의 출처를 확인하는 영역입니다. provenance 정보는 `xenesis-artifact-provenance` fenced block 형태로 표시됩니다.

확인할 수 있는 정보:

| 정보 | 용도 |
|---|---|
| sessionId/messageId | 어떤 Bot 세션과 메시지에서 만들어졌는지 추적합니다. |
| filePath | 실제 파일 위치를 확인합니다. |
| label/type/kind | artifact의 표시 이름과 종류를 확인합니다. |
| open/focus command | 다시 열거나 메시지를 찾는 데 사용할 command를 확인합니다. |
| metadata | hidden artifact marker나 생성 관련 부가 정보를 확인합니다. |

Provenance는 여러 Bot 세션에서 비슷한 파일이 만들어졌을 때 어떤 artifact가 최신인지, 어떤 메시지에서 생성되었는지 추적하는 데 유용합니다.

## 9. Timeline과 Hermes Timeline 연계

Artifact Library 내부의 `Timeline`은 최근 artifact 작업을 기록합니다.

기록되는 동작:

- Preview
- Send
- Bundle
- Validate
- Repair
- Repair loop
- Open
- Focus
- Reveal
- Copy
- Compare
- Provenance

Artifact Library는 각 작업을 기록할 때 `xenesis-artifact-timeline-event` 브라우저 이벤트를 발생시킵니다. Hermes Timeline은 이 이벤트를 받아 `Artifact actions` 필터에서 확인할 수 있는 timeline item으로 표시합니다.

이 흐름의 의미:

| 위치 | 역할 |
|---|---|
| Artifact Library Timeline | 현재 Artifact Library 패널에서 최근 artifact 작업을 빠르게 확인합니다. |
| Hermes Timeline | Bot approval, artifact 생성, artifact action을 한 timeline에서 함께 검토합니다. |
| Artifact actions 필터 | Open, Validate, Compare 같은 사용자의 artifact 조작만 따로 모아봅니다. |

Artifact action timeline은 live event인 `xenesis-artifact-timeline-event`로 즉시 전달되고, 동시에 localStorage의 `xenesis-artifact-timeline-events` 키에도 저장됩니다. 따라서 Artifact Library와 Hermes Timeline은 최근 artifact action을 다시 열었을 때도 복원할 수 있습니다. 이 저장은 사용자 로컬 UI 히스토리이며, 프로젝트 파일이나 Bot 원본 세션을 변경하지 않습니다.

## 10. AI Workbench Context Bundle

AI Workbench의 `Context Bundle`은 현재 Xenesis Desk 상태와 최근 artifact metadata를 한 번에 Xenesis Bot으로 보내는 기능입니다.

Context Bundle은 다음 정보를 묶습니다.

- active pane 제목과 종류
- 열린 파일 수
- 터미널 수
- 최근 artifact 목록
- Command Center의 묶음 명령 요약
- 선택한 bundle 목적
- `artifact-bundle-mode` marker

묶음 명령은 payload의 `commandBundleCount`와 `commandBundles`에 들어갑니다. 각 항목은 id, label, group, terminalKind, cwd, runCount, lineCount, 짧게 잘린 commandPreview만 포함합니다. 즉 Context Bundle은 AI나 Bot이 재사용 가능한 명령 후보를 이해하도록 돕는 맥락이며, 이 payload를 보냈다고 해서 명령이 자동 실행되지는 않습니다.

AI Workbench에는 Context Bundle 모드가 있습니다.

| 모드 | 용도 |
|---|---|
| Light | 현재 Desk 상태와 최근 artifact 일부만 간단히 전달합니다. 빠른 질문이나 방향 확인에 적합합니다. |
| Full | 더 넓은 최근 artifact 목록을 포함합니다. 여러 산출물을 함께 검토할 때 사용합니다. |
| Artifact Review | 생성물 검토, 누락 확인, 품질 점검에 맞춘 모드입니다. |
| Debug | 검증 실패, 렌더링 오류, 터미널 오류, bridge 문제를 진단할 때 사용합니다. |
| Workflow Repair | XCON/SKETCH/workflow artifact를 수리하거나 분기/파라미터 문제를 확인할 때 사용합니다. |

선택한 Bundle 모드는 localStorage에 저장됩니다. 다음에 AI Workbench를 열면 마지막으로 선택한 모드가 기본 모드로 복원됩니다. 이 값은 로컬 UI 편의 설정이며, 프로젝트 파일이나 공유 설정을 직접 변경하지 않습니다.

AI Workbench에는 별도의 artifact bundle 검토 영역도 있습니다.

| 영역 | 설명 |
|---|---|
| Suggested artifacts | 선택한 Bundle 모드에 맞춰 Xenesis Desk가 추천한 artifact 목록입니다. Workflow Repair 모드는 workflow, XCON, Markdown을 우선 포함하고, Debug 모드는 trace와 검증 관련 artifact를 우선 포함합니다. |
| Bundle Preview | Bot에 보낼 artifact label, type, filePath, source session/message를 텍스트로 미리 확인합니다. |
| Send Selected Bundle | 사용자가 체크한 artifact만 `xenesis-artifact-bundle`로 Bot에 보냅니다. 체크를 직접 바꾸지 않으면 추천 artifact 전체가 사용됩니다. |

`Create Workflow Draft`는 Command Center의 묶음 명령을 Workflow Runner 초안으로 넘기는 handoff입니다. AI Workbench는 `xenesis-workflow-runner-draft-handoff` 키와 같은 이름의 이벤트로 workflow SKETCH 초안을 전달하고, Workflow Runner는 이를 받아 Designer 탭에 로드합니다. 각 명령 줄은 `command` 액션으로 변환되며 `storeAs`는 `record.commandBundles.<actionId>` 형태로 잡힙니다. 이 흐름은 실행 전 검토용 초안을 만드는 기능이고, 초안 생성만으로 터미널 명령이 실행되지는 않습니다.

## 11. Bot에 전달되는 payload 종류

Artifact Library와 AI Workbench는 Bot이 산출물 맥락을 구조적으로 이해할 수 있도록 fenced block을 사용합니다.

| payload | 발생 위치 | 설명 |
|---|---|---|
| `xenesis-artifact-context` | Artifact Library의 `Send to Agent` | 단일 artifact를 Bot에 전달합니다. |
| `xenesis-artifact-bundle` | Artifact Library의 `Send Bundle to Agent` | 여러 artifact를 묶어 Bot에 전달합니다. |
| `xenesis-artifact-review-pack` | Artifact Review Packs의 `Send Pack to Bot` | 저장된 artifact 묶음을 재검토 단위로 Bot에 전달합니다. |
| `xenesis-artifact-compare` | Artifact Compare의 `Send compare to Agent` | 두 artifact의 diff 결과를 Bot에 전달합니다. |
| `xenesis-artifact-provenance` | Provenance, validation/repair prompt | artifact 출처와 명령 정보를 전달합니다. |
| `xenesis-artifact-repair-loop` | `Preview repair plan` | validation detail과 safe preview/apply/restore 도구 지침을 묶어 Bot에 전달합니다. |
| `xenesis-ai-context-bundle` | AI Workbench의 `Context Bundle` | Desk 상태와 최근 artifact를 함께 전달합니다. |

이 payload들은 Bot이 반드시 파일을 직접 읽었다는 뜻이 아닙니다. 파일 내용 검토가 필요하면 Bot이 filePath를 열거나, Xenesis Desk MCP/bridge 도구를 사용해 내용을 읽어야 합니다.

## 12. 대표 사용 시나리오

### 12.1 생성된 dashboard 검토

1. Artifact Library를 엽니다.
2. `Markdown` 또는 `XCON` 필터로 dashboard artifact를 찾습니다.
3. `Show Preview`로 렌더링 또는 텍스트를 확인합니다.
4. 문제가 보이면 `Send to Agent`으로 단일 artifact를 전달합니다.
5. 관련 Screenshot이 있으면 두 artifact를 선택해 `Send Bundle to Agent`으로 같이 전달합니다.

### 12.2 XCON validation 실패 수리

1. XCON 또는 workflow artifact에서 `Validate`를 누릅니다.
2. `Validation Results`에서 오류 메시지를 확인합니다.
3. `Repair with Bot`을 눌러 Bot에 수리 요청을 보냅니다.
4. 더 엄격한 수리 루프가 필요하면 `Preview repair plan`을 눌러 `xenesis-artifact-repair-loop` payload를 보냅니다.
5. Bot이 제안한 변경은 바로 덮어쓰지 말고 `preview/apply` 흐름으로 확인합니다.
6. 적용 후 `Revalidate`로 다시 검증합니다.

### 12.3 두 산출물 비교

1. 비교할 Markdown, XCON, workflow artifact 두 개를 선택합니다.
2. 단순 텍스트 차이는 `Line diff`, 분기/action/id 변화는 `Structural diff`를 선택합니다.
3. `Compare Selected`를 누릅니다.
4. `Artifact Compare`에서 summary와 diff를 확인합니다.
5. `Copy diff`로 공유하거나 `Send compare to Agent`으로 분석 요청을 보냅니다.

### 12.4 Review Pack으로 반복 검토

1. 관련 Markdown, XCON, Screenshot, Trace artifact를 선택합니다.
2. 이름을 입력하고 `Save Review Pack`을 누릅니다.
3. 같은 검토 묶음을 다시 Bot에 보내야 할 때 `Send Pack to Bot`을 누릅니다.
4. Bot은 `xenesis-artifact-review-pack` payload의 filePath와 source metadata를 기준으로 필요한 파일을 열어 검토합니다.

### 12.5 화면 캡처 기반 UI 점검

1. Pane capture 또는 Screenshot artifact를 찾습니다.
2. 썸네일 또는 `Show Preview`로 화면을 확인합니다.
3. `Send to Agent`으로 Bot에 이미지를 전달합니다.
4. Bot에는 레이아웃, clipped content, overlap, blank canvas, rendering 문제를 중심으로 확인하라는 맥락이 전달됩니다.

### 12.6 작업 흐름 추적

1. artifact를 preview, validate, compare, open 합니다.
2. Artifact Library의 `Timeline`에서 최근 작업을 확인합니다.
3. Hermes Timeline을 열고 `Artifact actions` 필터를 선택합니다.
4. Bot approval과 artifact action이 어떤 순서로 이어졌는지 확인합니다.

## 13. 안전 정책과 제한 사항

Artifact Library는 기본적으로 검토와 연결을 위한 패널입니다. 파일을 임의로 수정하거나 삭제하는 기능이 아닙니다.

중요한 제한:

| 제한 | 설명 |
|---|---|
| 읽기 전용 preview | Quick Preview는 내용을 보여줄 뿐 파일을 저장하거나 수정하지 않습니다. |
| filePath 의존 | Reveal, Copy path, 일부 Open 동작은 artifact에 filePath가 있어야 가능합니다. |
| 검증 fallback | bridge에서 직접 검증할 수 없으면 Bot 검증 요청으로 fallback될 수 있습니다. |
| line diff | `Line diff`는 의미 기반 비교가 아니라 텍스트 줄 기반 비교입니다. |
| structural diff | `Structural diff`는 구조 토큰 비교이며 전체 XCON AST나 workflow graph 실행 결과 비교가 아닙니다. |
| 로컬 timeline | `xenesis-artifact-timeline-event` 기반 action 기록은 현재 앱 window의 live event입니다. |
| localStorage | Context Bundle 기본 모드는 사용자 로컬 환경에 저장됩니다. |
| artifact action 저장 | 최근 artifact action은 localStorage의 `xenesis-artifact-timeline-events`에 저장됩니다. 이 값은 로컬 UI 히스토리입니다. |
| validation 저장 | 최근 validation 결과는 localStorage의 `xenesis-artifact-validation-results`에 저장됩니다. |
| review pack 저장 | Artifact Review Pack은 localStorage의 `xenesis-artifact-review-packs`에 저장됩니다. |
| 수리 요청 | `Repair with Bot`은 수리 제안을 요청하는 기능이며, 파일 변경은 별도의 preview/apply 확인 절차가 필요합니다. |

## 14. 문제 해결

| 증상 | 확인할 내용 |
|---|---|
| 목록이 비어 있음 | Xenesis Bot 세션에 artifact가 있는지, bridge snapshot이 갱신되었는지 확인하고 `Refresh`를 누릅니다. |
| 이미지 preview가 안 보임 | filePath가 실제로 존재하는지, 이미지 파일에 접근 가능한지 확인합니다. |
| Markdown/XCON preview가 깨짐 | 파일 인코딩과 내용이 텍스트인지 확인합니다. `.xcon.sketch`는 텍스트 artifact로 다룹니다. |
| Validate가 직접 실행되지 않음 | Xenesis Desk bridge와 `xenesis_desk_validate_xcon_markdown` 경로가 사용 가능한지 확인합니다. 직접 검증이 불가능하면 Bot fallback으로 전환됩니다. |
| Compare Selected가 비활성화됨 | 텍스트 artifact를 2개 이상 선택했는지 확인합니다. 이미지 artifact만 선택하면 비교할 수 없습니다. |
| Structural diff 결과가 기대보다 적음 | 구조 토큰 기반 비교이므로 파라미터 값이나 긴 표현식 차이는 line diff와 validation으로 함께 확인합니다. |
| Safe File Edit Center가 파일을 바로 열지 않음 | artifact에 filePath가 있는지 확인합니다. `Missing file` health badge가 있으면 handoff할 대상 경로가 없습니다. |
| Open/Focus가 비활성화됨 | artifact metadata에 open/focus command가 있는지 확인합니다. |
| Reveal/Copy가 비활성화됨 | artifact에 filePath가 있는지 확인합니다. |
| Hermes Timeline에서 안 보임 | Artifact Library에서 action을 실행한 뒤 Hermes Timeline의 `Artifact actions` 필터를 확인합니다. 이전 앱 실행의 local event는 복원되지 않을 수 있습니다. |

## 15. 권장 사용 기준

| 목적 | 권장 기능 |
|---|---|
| 단일 산출물 검토 | `Show Preview` 후 `Send to Agent` |
| 여러 산출물 종합 검토 | 여러 항목 선택 후 `Send Bundle to Agent` |
| 같은 묶음 반복 검토 | `Save Review Pack`, `Send Pack to Bot` |
| XCON/Markdown 오류 확인 | `Validate`와 `Validation Results` |
| 수리 요청 | `Repair with Bot` 후 preview/apply |
| 변경 차이 확인 | `Line diff` 또는 `Structural diff`로 `Compare Selected`, `Copy diff`, `Send compare to Agent` |
| 출처 확인 | `Provenance` |
| 최근 작업 흐름 확인 | Artifact Library `Timeline`과 Hermes Timeline `Artifact actions` |
| 전체 Desk 맥락 전달 | AI Workbench `Context Bundle` |

Artifact Library는 Xenesis Bot이 만든 결과를 사용자가 다시 찾고, 검토하고, Bot에게 정확한 맥락으로 넘기는 기능입니다. 파일 생성 자체보다 생성된 결과의 품질 확인, 검증, 비교, 복구 요청, 작업 이력 파악에 초점을 둡니다.
