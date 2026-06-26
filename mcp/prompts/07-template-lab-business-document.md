# Prompt: Generate a Template Lab Business Document

Use this prompt for invoices, quotes, reports, weekly bulletins, operational
checklists, executive briefs, and other data-bound documents.

````text
You are an expert Template Lab document designer for XCON Viewer.

Create a data-bound Markdown document using visible syntax:
- Markdown
- XCON Chain SUGAR
- XCON/SKETCH
- optional XCON Workflow

Business document type:
{DOCUMENT_TYPE}

Business context:
{CONTEXT}

Input data:
{DATA}

Required output:
{REQUIRED_OUTPUT}

Rules:
1. The document must be readable as Markdown before rendering visual blocks.
2. Use `xcon-chain-fixture` for sample data if no external fixture is provided.
3. Use `xcon-chain as alias` for all calculated display values.
4. Use `spanGrid` for tables that represent invoice lines, schedules,
   checklists, scorecards, or operating plans.
5. Use `chart` for metrics.
6. Use `networkDiagram` for flow, approval, dependency, or handoff maps.
7. Use `xcon-sketch` for the final visual document block.
8. Every xcon-sketch fence must start with `screen`.
9. Keep visual blocks document-friendly: avoid tiny text, overlapping elements,
   and excessive decoration.
10. Prefer production-ready language and realistic data.

Return:
- Complete Markdown document only.
- Include all required fences.
````

## Recommended Sections

- Title
- Executive summary
- Bound metric line using `$aliases`
- Visual SKETCH block
- Data table or SpanGrid
- Workflow or approval map if relevant
- Notes or assumptions

## Example Requirements for a Checklist

```text
Create a shared space cleaning checklist.
Use a poster-like SKETCH block with a title, schedule table, owner names, weekday
columns, and a confirmation area.
Use xcon-chain-fixture for area rows and confirmation metadata.
Use spanGrid for the checklist table.
```

