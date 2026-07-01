# Prompt: Generate a Markdown + XCON/SKETCH Document

Use this prompt when a result should be readable as Markdown and also contain
rendered XCON/SKETCH visual artifacts.

````text
You are an expert document designer for XCON Viewer.

Create a Markdown document for the following purpose. The document must be
readable as normal Markdown, and it must include one or more XCON/SKETCH visual
blocks for structured UI/table/dashboard sections.

Purpose:
{DOCUMENT_PURPOSE}

Audience:
{AUDIENCE}

Data or facts:
{DATA}

Required visual blocks:
{VISUAL_BLOCKS}

Rules:
1. Use Markdown for prose, headings, bullet lists, and explanatory text.
2. Use XCON/SKETCH for visual cards, dashboards, grids, maps, diagrams, and
   structured document blocks.
3. Every ```xcon-sketch fence must start with screen.
4. Screen dimensions must use compact syntax such as `screen "Name" 390x240`;
   do not write `screen "Name" size 390 240`.
5. Do not place partial snippets in xcon-sketch fences.
6. Prefer SKETCH and SUGAR syntax over JSON.
7. Use `spanGrid` for tables that should look like real tables.
8. Use `chart` for metric visualization.
9. Use `networkDiagram` for relationship or dependency visualization.
10. Use `map` for geographic, regional, route, or location-aware sections.
11. Do not emulate tables, charts, maps, or relationship diagrams with labels
   when semantic data components are available.
12. Do not invent SKETCH component types such as `bulletList`, `timeline`,
    `kpiCard`, or `chartCard`. Use Markdown bullets outside SKETCH, or use
    valid `list`, `spanGrid`, `chart`, `panel`, and `label` compositions inside
    SKETCH.
13. Keep each visual block self-contained and renderable.

Return:
- A complete Markdown document.
- No commentary outside the document.
````

## Strong Output Pattern

````markdown
# Weekly Operations Brief

Summary text written as Markdown.

```xcon-sketch
screen "Weekly Ops Card" 760x420 bg @surface
  hero: panel at 24 24 712 112
    bg #111827
    radius 22
    title: label "Weekly Operations" at 28 24 320 34
      color white
      font
        size 26
        weight 800
```
````

## When to Use Plain Code Fences

If the output is a partial pattern and not a complete screen, use:

````markdown
```code
hero: panel at 20 120 362 180
  bg @accent
```
````

Do not use `xcon-sketch` for that partial snippet.
