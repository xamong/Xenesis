# Shared XCON Generation Contract

Use this contract with every XCON Viewer generation prompt.

## Role

You are generating artifacts for the XCON Viewer family. Your output must be
valid, renderable, and practical. Do not invent component types, action types,
or syntax that is not shown in this prompt.

## Format Priority

Prefer these formats in this order:

1. XCON/SKETCH
2. XCON/JSON
3. XCON/XML
4. XCON/TAGLESS

For Markdown documents, visible syntax should be:

1. Markdown
2. XCON Chain SUGAR
3. XCON/SKETCH
4. XCON Workflow

## XCON/SKETCH Hard Rules

- Every renderable `xcon-sketch` fence must start with `screen`.
- Do not put partial component snippets in an `xcon-sketch` fence.
- If you need to show a partial snippet, use a plain `code` fence.
- Root screen must always include width and height.
- Screen dimensions must use compact `WIDTHxHEIGHT` syntax.
- Use `screen "Name" 390x240 bg @surface` or `screen 390x240 bg @surface`.
- Do not write `screen "Name" size 390 240`; the `size W H` form is invalid.
- All visual components must have stable dimensions using `at x y width height`.
- Do not rely on implicit sizing for primary layout.
- Nested components use parent-local coordinates. A child inside a `panel`,
  `list` template cell, or another component starts at `0 0` inside that
  parent, not at the screen origin.
- Do not add the parent panel's screen x/y offset to child coordinates.
- For nested children, child x/y must fit inside the parent width/height unless
  the task explicitly asks for a clipped or overflow effect.
- Use color tokens such as `@surface`, `@surface2`, `@surface3`, `@ink`,
  `@ink-2`, `@ink-3`, `@border`, and `@accent` when possible.
- External images must use `https://...`.
- Viewer examples must not use executable host-only behavior unless the task is
  explicitly about Workflow or Chain.

Valid screen example:

```xcon-sketch
screen "Example Card" 360x220 bg @surface
  title: label "XCON/SKETCH" at 24 24 312 36
    color @ink
    font
      size 24
      weight 800
    align center

  cta: button "Render Preview" at 72 142 216 44
    bg @accent
    color white
    radius 12
```

Valid nested coordinate example:

```xcon-sketch
screen "Nested Card" 360x220 bg @surface
  card: panel at 32 32 296 156
    bg @surface2
    radius 18
    title: label "Local child coords" at 20 18 220 28
      color @ink
      font
        size 18
        weight 800
    cta: button "Open" at 20 92 120 40
      bg @accent
      color white
```

In the example above, do not write `title` at `52 50`. The `card` already
starts at screen position `32 32`, so child coordinates are local to the card.

## Component Guidance

Prefer these public-safe component types:

- `panel`
- `label`
- `button`
- `textField`
- `image`
- `shape`
- `banner`
- `list`
- `spanGrid`
- `chart`
- `dataViz`
- `networkDiagram`
- `map`
- `badge`
- `alert`
- `progressBar`
- `tabs`
- `select`
- `switch`
- `slider`
- `rating`
- `qrCode`

Do not invent convenience component types. For example, do not use `bulletList`,
`timeline`, `kpiCard`, or `chartCard` unless that exact type is explicitly
introduced in the prompt or component catalog. Use Markdown bullets outside
SKETCH, or use `label` rows, a valid `list`, or `spanGrid` inside SKETCH.

## Semantic Data Component Selection

Prefer semantic data components over hand-built label layouts whenever the
content has structure. Do not emulate tables, charts, maps, or relationship
diagrams with labels when an XCON component exists for that job.

- Use `spanGrid` for table-like rankings, schedules, inventories, comparison
  rows, standings, ledgers, checklists, and dense records.
- Use `chart` for comparative values, trends, distributions, forecasts,
  scorecards, rankings, and numeric summaries that benefit from scale.
- Use `dataViz` for advanced visualizations that need a specialized layout:
  treemap, sankey, sunburst, chord, forceGraph, or plot.
- Use `map` for geographic, route, regional, weather, venue, facility, or
  location-aware reports.
- Use `networkDiagram` for dependencies, flows, topology, handoffs, ownership,
  influence, lineage, or incident blast-radius views.
- Use `panel`, `label`, and `shape` to frame and annotate the semantic data
  components, not as replacements for them.

Do not generate removed or unsafe components such as:

- `webView`
- `frame`
- `import`
- `fileUpload`
- `filePicker`
- `imagePicker`
- `signaturePad`
- `bulletList`
- `timeline`
- `kpiCard`
- `chartCard`
- custom components

## List Contract

Lists must include both data and a cell layout.

Use:

- `backgroundColor`, usually the same color as the surrounding surface.
- `direction` or `orientation`.
- `itemSize` with width and height.
- `separator` with size and color.
- `separator.color` should usually match the list `backgroundColor`.
- `dataTemplate` with `template.tabledata`.
- `templates.cell` containing a named child layout such as `card`, `row`, or
  `item`. Do not put the component directly as `templates.cell.type`.

Correct list pattern:

```xcon-sketch
screen "List Example" 402x360 bg @surface
  productList: list at 20 32 362 250
    backgroundColor @surface
    direction "vertical"
    itemSize
      width 362
      height 96
    separator
      size 12
      color @surface
    dataTemplate {"type":"template","template":{"tabledata":[{"title":"Studio chair","price":"$89","image":"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80"}]}}
    templates {"cell":{"card":{"type":"panel","pos":[0,0,362,96],"backgroundColor":"@surface2","border":{"visible":true,"color":"@border","radius":18},"components":{"componentsOrder":"thumb,title,price","thumb":{"type":"image","src":"{{item.image}}","pos":[12,12,72,72],"objectFit":"cover","border":{"visible":false,"radius":14}},"title":{"type":"label","text":"{{item.title}}","pos":[96,20,180,22],"color":"@ink","font":{"size":16,"weight":800}},"price":{"type":"label","text":"{{item.price}}","pos":[96,52,100,20],"color":"@accent","font":{"size":14,"weight":700}}}},"itemSize":{"width":362,"height":96}}}
```

## SpanGrid Contract

Use `spanGrid` when the output is table-like or spreadsheet-like. It should be
read-only unless the task explicitly asks for editing.

```xcon-sketch
screen "SpanGrid Example" 420x260 bg @surface
  grid: spanGrid at 20 32 380 180
    backgroundColor @surface
    readonly true
    data [["Team","Owner","Status"],["Sales","Mina","Ready"],["Ops","Ari","Launch"]]
    columns [{"id":"team","title":"Team","width":140},{"id":"owner","title":"Owner","width":110},{"id":"status","title":"Status","width":110}]
```

## DataViz Contract

Use `dataViz` when the answer needs an advanced visualization beyond a standard
chart or relationship graph.

Known `vizType` values:

- `vizType "treemap"` for nested allocation, portfolio share, storage usage, or
  category weight.
- `vizType "sankey"` for flow volume, conversion paths, pipeline handoffs, or
  source-to-destination movement.
- `vizType "sunburst"` for hierarchical breakdowns and radial composition.
- `vizType "chord"` for module-to-module, team-to-team, or category interaction
  matrices.
- `vizType "forceGraph"` for lightweight relationship exploration when a full
  `networkDiagram` is not necessary.
- `vizType "plot"` for Observable Plot style bar, line, dot, and grid-backed
  analytical charts.

Keep the `data` JSON compact and shaped for the selected `vizType`.

```xcon-sketch
screen "Flow Example" 760x460 bg @surface
  flow: dataViz at 24 80 700 320
    vizType "sankey"
    data {"nodes":[{"id":"input","label":"Input"},{"id":"process","label":"Process"},{"id":"output","label":"Output"}],"links":[{"source":"input","target":"process","value":18},{"source":"process","target":"output","value":12}]}
```

## Markdown + Chain + Sketch Contract

Use `xcon-chain` fences to derive aliases from fixture data:

````markdown
```xcon-chain as revenueTotal
= record.metrics.revenue | format "$#,###"
```

```xcon-sketch
screen "Revenue Card" 360x160 bg @surface
  total: label "$revenueTotal" at 24 48 220 44
    color @accent
    font
      size 36
      weight 800
```
````

Use `xcon-chain-fixture` for inline fixture data:

````markdown
```xcon-chain-fixture
{
  "record": {
    "metrics": { "revenue": 1284000 }
  }
}
```
````

## Workflow Contract

Use `xcon-workflow` for action-flow documents. Workflows may use actions such as
`note`, `callApi`, `workqueue`, and `scheduler`.

Workflow should either:

- update a fixture, then let Chain and SKETCH re-render, or
- drive a named monitoring screen intentionally.

Do not mix both patterns unless the user asks for a hybrid demo.

## Final Self-Check

Before returning, verify:

- Every `xcon-sketch` fence starts with `screen`.
- Root screen has explicit width and height.
- Root screen dimensions use compact `WIDTHxHEIGHT` syntax, not `size W H`.
- Nested children use parent-local coordinates and fit within their parent
  bounds.
- Lists have `dataTemplate` and named `templates.cell` layout.
- Tables use `spanGrid` when table-like.
- Semantic data components are used when the data supports them.
- Unsupported components are absent.
- Chain aliases used as `$alias` are declared before use.
- Workflow steps have clear dependencies via `after`.
- The output is complete and does not include placeholder TODOs.
