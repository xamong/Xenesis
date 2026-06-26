```xcon-demo
demo "GridEditor canvas mode"
mode "canvas-demo"
autoplay false
stream.speed "guided"
workflow.run true
workflow.replayEvents true
scene.1.id "brief"
scene.1.title "Draft request"
scene.1.caption "Type the generated brief into the stream panel before rendering."
scene.1.action "typeText"
scene.1.duration 1300
scene.1.transition "fade"
scene.1.transitionDuration 180
scene.1.focus "source"
scene.1.actions [{"type":"caption","text":"The LLM starts drafting a GridEditor-style canvas workflow.","fadeIn":100,"fadeOut":140},{"type":"focus","target":"source"},{"type":"typeText","target":"stream","text":"User asks: \"Turn this selected canvas node into an editable grid.\"\n\nThe assistant answers with Markdown, XCON/SKETCH, Chain fixture data,\nand a workflow script. Demo actions simulate the cursor, clicks,\ncell typing, callouts, and workflow replay.","duration":1300,"clear":true,"easing":"linear"},{"type":"wait","duration":280}]
scene.2.id "select-node"
scene.2.title "Select node"
scene.2.caption "Move the cursor onto the canvas and select the target frame."
scene.2.action "cursorMove"
scene.2.duration 1700
scene.2.transition "slide"
scene.2.transitionDuration 220
scene.2.focus "stage"
scene.2.actions [{"type":"render","duration":500},{"type":"focus","target":"stage"},{"type":"cursorMove","target":"xcon","value":{"x":437,"y":271},"label":"Select target node","duration":520,"easing":"smooth"},{"type":"cursorClick","target":"xcon","value":{"x":437,"y":271},"duration":360,"easing":"snap"},{"type":"highlight","target":"xcon","value":{"x":272,"y":152,"width":330,"height":238},"text":"Selected canvas node","duration":820,"hold":160,"fadeIn":120,"fadeOut":220},{"type":"callout","target":"xcon","value":{"x":520,"y":120},"text":"One selected node becomes the editable grid target.","duration":900,"hold":180,"fadeIn":120,"fadeOut":180}]
scene.3.id "edit-grid"
scene.3.title "Edit grid"
scene.3.caption "Open the editor window, select a cell, and type the new value."
scene.3.action "typeText"
scene.3.duration 2100
scene.3.transition "zoom"
scene.3.transitionDuration 180
scene.3.focus "stage"
scene.3.actions [{"type":"cursorMove","target":"xcon","value":{"x":795,"y":308},"label":"Open editor","duration":420,"easing":"smooth"},{"type":"cursorClick","target":"xcon","value":{"x":795,"y":308},"duration":320,"easing":"snap"},{"type":"highlight","target":"xcon","value":{"x":718,"y":128,"width":144,"height":214},"text":"GridEditor plugin panel","duration":620,"hold":120,"fadeIn":100,"fadeOut":160},{"type":"cursorMove","target":"xcon","value":{"x":792,"y":214},"label":"Edit status cell","duration":420,"easing":"smooth"},{"type":"cursorClick","target":"xcon","value":{"x":792,"y":214},"duration":300,"easing":"snap"},{"type":"typeText","target":"stream","text":"\n\nCell r2/c2 changed to: In Review","duration":760,"append":true,"easing":"linear"},{"type":"setFixture","path":"record.editor.cellValue","value":"In Review","duration":260},{"type":"setFixture","path":"record.gridData.2.1","value":"In Review","duration":260},{"type":"render","duration":520}]
scene.4.id "generate"
scene.4.title "Generate in place"
scene.4.caption "Run the workflow and show the synchronized generated grid."
scene.4.action "workflow"
scene.4.duration 1600
scene.4.transition "fade"
scene.4.transitionDuration 180
scene.4.focus "runtime"
scene.4.actions [{"type":"callout","target":"xcon","value":{"x":642,"y":466},"text":"Generate writes the edited grid back into the canvas.","duration":700,"hold":120,"fadeIn":120,"fadeOut":180},{"type":"cursorMove","target":"xcon","value":{"x":795,"y":308},"label":"Generate","duration":420,"easing":"smooth"},{"type":"cursorClick","target":"xcon","value":{"x":795,"y":308},"duration":320,"easing":"snap"},{"type":"workflow","duration":1250},{"type":"highlight","target":"xcon","value":{"x":295,"y":414,"width":330,"height":122},"text":"Generated in place","duration":900,"hold":240,"fadeIn":140,"fadeOut":260}]
```

# GridEditor canvas mode demo

This preset demonstrates the demo-action contract: cursor movement, click pulse,
typing simulation, callouts, highlights, fixture binding, and workflow replay.

```xcon-chain-fixture
{
  "record": {
    "workflow": {
      "status": "Waiting for canvas edit",
      "statusColor": "#facc15",
      "percent": 0,
      "percentLabel": "0%",
      "fillWidth": 0,
      "lastEvent": "No runtime event yet."
    },
    "editor": {
      "cellValue": "Queued",
      "selectedNode": "Promo table frame",
      "mode": "Canvas"
    },
    "gridData": [
      ["Task", "Status", "Owner"],
      ["Product", "Done", "AI"],
      ["Plugin", "Queued", "Viewer"],
      ["Canvas", "Ready", "Desk"]
    ]
  }
}
```

```xcon-chain as gridData
= record.gridData
```

```xcon-workflow
workflow "GridEditor canvas replay"
  selectNode: note "selected target canvas node"

  editQueue: workqueue
    concurrency 1
    data [
      {"name":"Read node bounds"},
      {"name":"Map table cells"},
      {"name":"Generate canvas grid"}
    ]
    after selectNode
    actions [
      {"id":"editStep","type":"callApi","method":"POST","url":"/api/demo/grid-editor","parameter":{"step":"{{item.name}}"}}
    ]

  syncFrames: scheduler
    mode "interval"
    intervalMs 180
    iterations 3
    after editQueue
    actions [
      {"id":"syncCanvas","type":"callApi","method":"POST","url":"/api/demo/sync"}
    ]
```

```xcon-sketch
screen "GridEditor Canvas Demo" 880x560 bg #1a1a1f
  topbar: panel at 0 0 880 44
    bg #252529
    brand: label "Figma Canvas  /  GridEditor" at 22 13 240 20
      color #f8fafc
      font
        size 14
        weight 800
    mode: label "$record.editor.mode mode" at 642 12 120 20
      color #c4b5fd
      align right
      font
        size 12
        weight 800
    share: button "Share" at 790 10 56 26
      bg #5b5bd6
      color #ffffff
      radius 6

  leftPanel: panel at 0 44 160 516
    bg #f5f5f5
    title: label "Layers" at 18 18 80 18
      color #52525b
      font
        size 12
        weight 800
    frame: label "> Promo screen" at 18 50 150 20
      color #27272a
      font
        size 12
        weight 700
    node: label "  [Frame] Promo table" at 18 78 154 20
      color #4f46e5
      font
        size 12
        weight 800
    cell: label "    Row 2 / Status" at 18 106 132 18
      color #71717a
      font
        size 11
        weight 700

  canvas: panel at 160 44 540 516
    bg #303034
    artboard: panel at 120 70 330 270
      bg #ffffff
      radius 12
      title: label "Campaign board" at 28 24 180 24
        color #111827
        font
          size 22
          weight 800
      subtitle: label "Selected node: $record.editor.selectedNode" at 28 56 260 18
        color #64748b
        font
          size 12
          weight 700
      card1: panel at 28 92 120 82
        bg #ede9fe
        radius 16
        c1: label "Hero" at 18 18 80 18
          color #4c1d95
          font
            size 14
            weight 800
      card2: panel at 178 92 120 82
        bg #e0f2fe
        radius 16
        c2: label "Offer" at 18 18 80 18
          color #075985
          font
            size 14
            weight 800
      selectedTable: panel at 28 192 300 72
        bg #111827
        radius 10
        h1: label "Task" at 14 12 90 16
          color #93c5fd
          font
            size 11
            weight 800
        h2: label "Status" at 122 12 82 16
          color #93c5fd
          font
            size 11
            weight 800
        h3: label "Owner" at 218 12 62 16
          color #93c5fd
          font
            size 11
            weight 800
        row: label "Plugin    $record.editor.cellValue    Viewer" at 14 40 270 18
          color #ffffff
          font
            size 13
            weight 800
    selection: panel at 112 108 330 238
      bg transparent
      border
        visible true
        width 2
        color #60a5fa
        radius 14
    result: panel at 135 370 330 132
      bg #ffffff
      radius 16
      label: label "Generated in place" at 18 16 160 20
        color #111827
        font
          size 16
          weight 800
      grid: spanGrid at 18 46 300 76
        backgroundColor #ffffff
        readonly true
        columns [132, 112, 96]
        rows [24, 24, 24, 24]
        data $gridData

  inspector: panel at 700 44 180 516
    bg #f5f5f5
    title: label "GridEditor" at 18 18 120 22
      color #27272a
      font
        size 18
        weight 800
    hint: label "Edit selected node in context" at 18 48 148 18
      color #71717a
      font
        size 11
        weight 700
    editor: panel at 18 84 144 214
      bg #18181b
      radius 12
      eh: label "Editable cells" at 14 14 100 18
        color #ffffff
        font
          size 12
          weight 800
      cell1: label "Product      Done" at 14 48 126 20
        color #d4d4d8
        font
          size 11
          weight 700
      cell2: label "Plugin       $record.editor.cellValue" at 14 76 132 20
        color #ffffff
        bg #3730a3
        font
          size 11
          weight 800
      cell3: label "Canvas       Ready" at 14 104 126 20
        color #d4d4d8
        font
          size 11
          weight 700
      generate: button "Generate" at 18 164 118 32
        bg #e85d20
        color #ffffff
        radius 8
    status: label "$record.workflow.status" at 18 326 142 34
      color $record.workflow.statusColor
      font
        size 12
        weight 800
    rail: shape at 18 382 136 8
      bg #d4d4d8
      radius 4
    fill: shape at 18 382 $record.workflow.fillWidth 8
      bg #22c55e
      radius 4
    event: label "$record.workflow.lastEvent" at 18 406 142 36
      color #52525b
      font
        size 11
        weight 700
```
