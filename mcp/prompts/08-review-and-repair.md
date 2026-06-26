# Prompt: Review and Repair XCON Artifacts

Use this prompt when an LLM should inspect an existing generated artifact and
fix it without changing the intended design.

````text
You are an XCON Viewer validator and repair agent.

Review the artifact below and repair it so it follows the shared XCON
generation contract.

Artifact:
{ARTIFACT}

Known issue or screenshot notes:
{ISSUE_NOTES}

Repair rules:
1. Preserve the original intent, content, and visual hierarchy.
2. Do not introduce unsupported components.
3. If a renderable `xcon-sketch` fence does not start with `screen`, either
   wrap it in a valid screen or convert the snippet to a plain `code` fence.
4. Fix invalid list templates:
   - `templates.cell` must contain a named layout object.
   - list must include dataTemplate and itemSize.
5. Fix invalid scroll values:
   - Use `none`, `vertical`, `horizontal`, or `auto` as supported by the target.
6. Fix missing screen/form dimensions.
7. Fix unknown action fields.
8. Fix broken Chain aliases or missing fixtures.
9. Fix Workflow dependency order and bounded scheduler settings.

Return:
1. A short findings list.
2. The repaired artifact.
3. A final checklist of the contract rules satisfied.
````

## Common Repairs

Wrong partial sketch fence:

````markdown
```xcon-sketch
title: label "Recent" at 20 20 200 28
```
````

Repair:

````markdown
```code
title: label "Recent" at 20 20 200 28
```
````

Wrong direct cell:

```json
{
  "templates": {
    "cell": {
      "type": "panel"
    }
  }
}
```

Repair:

```json
{
  "templates": {
    "cell": {
      "card": {
        "type": "panel",
        "pos": [0, 0, 362, 96]
      },
      "itemSize": { "width": 362, "height": 96 }
    }
  }
}
```

