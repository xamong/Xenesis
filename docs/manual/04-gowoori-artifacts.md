# Gowoori and Artifacts

Gowoori is the AI-to-UI rendering layer in Xenesis Desk. It turns structured content into inspectable, repairable, and exportable UI artifacts.

## Artifact Layers

| Layer | Purpose |
|---|---|
| Fixture | Sample or bound data used to render a preview. |
| Chain | A structured sequence of generation or transformation steps. |
| Sketch | A visual or layout-oriented artifact description. |
| Workflow | A runnable operational flow. |

XCON Markdown can carry these layers in a document-friendly format.

## Gowoori Pane

The Gowoori pane previews generated artifacts and renders supported formats.

Common uses:

- Preview XCON Markdown.
- Inspect generated UI output.
- Compare repaired output with source content.
- Open artifact details from the Artifact Library.

## GowooriChat

GowooriChat is the chat-oriented artifact workflow. It is used when an agent or user wants to create or refine an artifact through conversation.

Typical flow:

1. User provides intent or content.
2. Agent creates structured artifact content.
3. Gowoori validates the artifact.
4. User or agent repairs issues.
5. The artifact is previewed, exported, or stored.

## Artifact Target

Generated artifacts can open in:

- Gowoori preview.
- Artifact Library.
- Document editor.
- Workflow runner.
- Demo Lab preview.

If the artifact is not visible, check the open document tabs and Artifact Library metadata.

## Artifact Library

The Artifact Library stores metadata and actions for generated or imported artifacts.

Typical metadata:

- Name.
- Type.
- Source.
- Validation state.
- Last modified time.
- Related workflow or prompt.

Typical actions:

- Open.
- Preview.
- Validate.
- Repair.
- Export.
- Copy structured content.

## Validation and Repair

Validation checks whether an artifact matches the expected structure. Repair attempts to produce a valid artifact from partial or broken content.

The most useful flow is:

1. Validate the current artifact.
2. Read the exact validation errors.
3. Repair only the invalid sections.
4. Validate again before exporting or using the artifact in a workflow.

## MCP Tools

Common MCP-facing tools include:

- `xenesis_desk_validate_xcon_markdown`
- `xenesis_desk_create_xcon_markdown_from_content`
- `xenesis_desk_export_xcon_pdf`

Tool availability depends on the running bridge, permission level, and app state.

## Demo Lab

Demo Lab uses artifacts to show scripted or repeatable product flows. It can load presets, render artifact output, and help verify visual or workflow behavior.

Use Demo Lab when the goal is a repeatable presentation or smoke test rather than one-off editing.

## XCON Markdown

XCON Markdown is the main text format for shareable artifact documents. It is easier to review than raw JSON and can be validated by the app.

## Agent Guidance

When answering Gowoori questions:

- Ask whether the user wants preview, validation, repair, export, or storage.
- Name the artifact destination.
- Use validation errors as the source of truth.
- Do not treat a missing preview as a generation failure until Artifact Library and open tabs have been checked.
