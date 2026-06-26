# Xenesis Desk MCP XCON Repair Loop

이 문서는 LLM이나 Hermes Gateway가 생성한 Markdown/XCON/SKETCH artifact가 `xenesis_desk_validate_xcon_markdown` 검증에 실패했을 때의 복구 순서를 정리합니다. 기준 prompt 문서는 `docs/mcp-prompt-usage.md`, 대표 품질 기준은 `docs/mcp-prompt-quality-matrix.md`입니다.

## Repair Tool Order

기본 순서는 아래와 같습니다.

1. `xenesis_desk_get_xcon_prompt`로 원래 작업에 맞는 prompt kind를 가져옵니다.
2. LLM이 Markdown과 XCON/SKETCH artifact를 생성합니다.
3. `xenesis_desk_validate_xcon_markdown`으로 검증합니다.
4. 실패하면 아래 Validation Failure Taxonomy에 따라 repair prompt를 고릅니다.
5. 수정된 Markdown을 다시 `xenesis_desk_validate_xcon_markdown`으로 검증합니다.
6. 통과한 뒤에만 `xenesis_desk_create_xcon_markdown_from_content`로 저장합니다.

저장은 repair loop의 마지막 단계입니다. 검증 실패 상태의 Markdown을 저장하면 Bot artifact action, Artifact Library, Markdown pane preview가 같은 실패를 반복해서 보여주게 됩니다.

## Validation Failure Taxonomy

| ID | Validator signal | Meaning | Recovery action |
|----|------------------|---------|-----------------|
| `missing-fence` | `No xcon-sketch fences were found.` | Markdown만 있고 렌더링 가능한 SKETCH artifact가 없습니다. | Regenerate with `strict-sketch` when the user expected a visual artifact. If the user only asked for prose, keep it as normal Markdown and do not save it as an XCON artifact. |
| `empty-fence` | `Fence 1: xcon-sketch fence is empty.` | fence는 있지만 내부가 비어 있습니다. 스트리밍 중간 조각이거나 모델이 내용을 생략한 상태입니다. | Ask the model to refill the fence from the original brief. Do not invent unrelated layout during repair. |
| `missing-screen` | `Fence 1: xcon-sketch fence must start with screen.` | SKETCH snippet이 root `screen` 없이 partial component로 시작합니다. | Wrap the snippet in a valid `screen` when the snippet is meant to render. If it is documentation only, convert the block to a normal `code` fence. |
| `parser-failure` | `Fence 1: <parser error>` | `screen`은 있지만 SKETCH syntax, bounds, JSON prop, component prop 중 하나가 parser를 통과하지 못했습니다. | Use `review-repair` with the validator error text and original artifact. Preserve intent, simplify risky component use, then validate again. |

## Prompt Selection

Use `strict-sketch` when:

- the first output had no renderable fence;
- the model repeatedly emits outer `markdown` fences;
- a small smoke artifact is enough;
- the target model is small or unstable.

Use `review-repair` when:

- there is already useful content to preserve;
- a fence exists but starts with a partial component;
- parser failure gives a concrete line or token issue;
- the visual intent is correct but syntax or component use is invalid.

Use the original kind again when:

- the failure is caused by a missing section, not bad syntax;
- the request needs `markdown-xcon`, `dashboard-workflow`, `family-template`, or `chat-artifact` behavior that would be lost by simplifying to `strict-sketch`.

## Repair Prompt Payload

When calling `xenesis_desk_get_xcon_prompt` for repair, pass:

- `kind: "review-repair"` for preserving and fixing an existing artifact;
- `task: "validation-failure"` or a more specific task such as `missing-screen`;
- `brief` containing the validator output and the user's original intent.

Example brief:

```text
Repair this Markdown + XCON/SKETCH artifact.
Validator error:
Fence 1: xcon-sketch fence must start with screen.
Original user intent:
Create a compact deployment readiness card.
Preserve the visible content and return the complete repaired Markdown only.
```

## Bot And Hermes Flow

In Xenesis Bot/Hermes mode:

1. Bot starter action or `/xd prompt` chooses the generation profile.
2. Hermes calls the prompt tool and asks the LLM for Markdown.
3. Before saving, Hermes or the MCP wrapper calls `xenesis_desk_validate_xcon_markdown`.
4. On failure, Hermes sends a repair request using the taxonomy above.
5. If repair succeeds, Hermes saves with `xenesis_desk_create_xcon_markdown_from_content`.
6. If repair still fails, Bot should show the validation error and avoid creating a misleading artifact card.

Approval is not needed for validation itself. Saving/opening can still require the normal action approval policy depending on the Hermes gateway configuration.

## Examples

### missing-fence

Input:

````markdown
# Release status

Everything is ready.
````

Repair:

- If a visual artifact was expected, Regenerate with `strict-sketch`.
- If prose was expected, keep it as normal Markdown and skip XCON save/open.

### empty-fence

Input:

````markdown
```xcon-sketch

```
````

Repair:

- Ask the model to refill the fence from the original brief.
- Keep exactly one complete `xcon-sketch` fence for `strict-sketch` flows.

### missing-screen

Input:

````markdown
```xcon-sketch
title: label "Hello" at 20 20 120 24
```
````

Repair:

- Wrap the snippet in a valid `screen`.
- Or convert it to a `code` fence if it is a documentation snippet.

### parser-failure

Input:

````markdown
```xcon-sketch
screen "Broken" 320x180 bg #ffffff
  title: label "Hello" at bad
```
````

Repair:

- Use `review-repair`.
- Include the exact validator error.
- Simplify invalid bounds, component props, or JSON props.
- Validate again before saving.

## Stop Conditions

Stop the automatic loop and show the error to the user when:

- the same validator error repeats after two repair attempts;
- the artifact requires missing runtime data or files;
- the repair would change the user's intent;
- the generated content asks to run terminal commands or edit files unrelated to the artifact.
