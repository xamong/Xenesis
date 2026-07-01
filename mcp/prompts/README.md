# XCON Viewer LLM Prompt Set

This folder contains reusable prompts for generating UI documents, data-bound
Markdown templates, XCON/SKETCH screens, XCON Chain expressions, and XCON
Workflow documents.

The prompts are written for LLMs that should produce artifacts for the XCON
Viewer family. Use them as building blocks: start with the shared contract, then
append the task-specific prompt that matches the artifact you want.

## Files

| File | Purpose |
| --- | --- |
| [00-shared-xcon-contract.md](00-shared-xcon-contract.md) | Non-negotiable syntax, rendering, and safety rules. Attach this to every generation request. |
| [01-sketch-ui-generation.md](01-sketch-ui-generation.md) | Generate a complete XCON/SKETCH UI screen. |
| [02-markdown-xcon-document.md](02-markdown-xcon-document.md) | Generate Markdown documents with embedded XCON/SKETCH visual blocks. |
| [03-xcon-chain-generation.md](03-xcon-chain-generation.md) | Generate XCON Chain SUGAR expressions and fixtures. |
| [04-xcon-workflow-generation.md](04-xcon-workflow-generation.md) | Generate XCON Workflow documents with queues, schedulers, and action flow. |
| [05-family-data-binding-template.md](05-family-data-binding-template.md) | Generate a full XCON family template: fixture + chain + sketch + workflow. |
| [06-monitoring-dashboard-workflow.md](06-monitoring-dashboard-workflow.md) | Generate realtime workflow monitoring dashboards. |
| [07-template-lab-business-document.md](07-template-lab-business-document.md) | Generate Template Lab business documents such as invoices, reports, bulletins, and checklists. |
| [08-review-and-repair.md](08-review-and-repair.md) | Review, validate, and repair generated XCON artifacts. |
| [09-chat-artifact-simulation.md](09-chat-artifact-simulation.md) | Simulate an LLM chat response that streams Markdown plus XCON/SKETCH artifacts. |
| [10-showcase-component-catalog.md](10-showcase-component-catalog.md) | Use richer XCON components and composition patterns from showcase sketches. |
| [11-auto-layout-layer-recipes.md](11-auto-layout-layer-recipes.md) | Use auto-layout, layered heroes, and stable dense layout patterns. |
| [12-rich-list-xlist-recipes.md](12-rich-list-xlist-recipes.md) | Generate polished data-driven lists, rails, feeds, and chat layouts. |
| [13-dashboard-chart-map-network-recipes.md](13-dashboard-chart-map-network-recipes.md) | Generate dashboards with charts, maps, span grids, and network diagrams. |
| [14-family-binding-workflow-recipes.md](14-family-binding-workflow-recipes.md) | Generate fixture, chain, sketch, and workflow artifacts that stay data-bound. |
| [15-domain-blueprints.md](15-domain-blueprints.md) | Choose XCON component patterns for common operational and product domains. |
| [16-strict-generation-profile.md](16-strict-generation-profile.md) | Generate the smallest reliable renderable SKETCH artifact for validation-first flows. |
| [17-workbench-natural-xcon-response.md](17-workbench-natural-xcon-response.md) | Generate natural inline Workbench responses that use XCON/SKETCH only when a visual answer helps. |

Files `10` through `15` are distilled from the richer XCON/SKETCH examples in
`examples/showcase/*.xcon.sketch` and from the binding/workflow presets in
`tools/xcon-workflow-runner/playground/binding-lab.js`. They are meant to help
LLMs use the broader XCON family surface instead of only the smallest safe
component subset.

File `16` is a validation-first profile for smoke tests, small models, and
repair loops that need a minimal renderable artifact before visual ambition.

File `17` is for inline Workbench chat responses. It defaults to Markdown and
uses XCON/SKETCH only when a focused visual block makes the answer clearer. It
does not ask the model to validate, save, export, or open a separate Desk pane
unless the user explicitly requests persistence.

## Recommended Assembly

For most generation tasks, use:

1. `00-shared-xcon-contract.md`
2. One task prompt from `01` through `09`
3. Optional recipe prompts from `10` through `15`
4. Your product/domain brief
5. Any concrete data fixture or visual reference

Example:

```text
[shared contract]
[01 sketch UI generation prompt]

Task brief:
Create a mobile dashboard for a local grocery delivery app...
```

## Output Preference

For public XCON Viewer content, prefer this order:

1. XCON/SKETCH
2. XCON/JSON
3. XCON/XML
4. XCON/TAGLESS

When the generated artifact is a Markdown document, prefer visible syntax:

1. Markdown
2. XCON Chain SUGAR
3. XCON/SKETCH
4. XCON Workflow
