```xcon-demo
format "xcon-demo-preset/v1"
demo "Typing writer card"
mode "typing-demo"
autoplay false
stream.speed "guided"
workflow.run false
scene.1.id "prompt"
scene.1.title "Type prompt"
scene.1.caption "Start with an empty stream and type the user request."
scene.1.action "typeText"
scene.1.duration 1400
scene.1.focus "source"
scene.1.actions [{"type":"caption","text":"The response begins as real typed Markdown, not an instant render.","duration":220},{"type":"focus","target":"source","duration":180},{"type":"typeText","target":"stream","text":"User asks: Create a compact release-room update for the product team.\\n\\n","clear":true,"duration":1400}]
scene.2.id "markdown"
scene.2.title "Write Markdown"
scene.2.caption "Append the assistant's Markdown response one sentence at a time."
scene.2.action "typeText"
scene.2.duration 1800
scene.2.focus "source"
scene.2.actions [{"type":"typeText","target":"stream","text":"# Release room update\\n\\nThe launch room is ready. QA has cleared the smoke tests, documentation is staged, and support can begin the handoff.\\n\\n- Release confidence: high\\n- Open blockers: none\\n- Next checkpoint: 16:30 KST\\n","append":true,"duration":1800}]
scene.3.id "sketch"
scene.3.title "Type SKETCH"
scene.3.caption "The XCON/SKETCH block is typed into the stream and then rendered as an artifact."
scene.3.action "typeText"
scene.3.duration 2600
scene.3.focus "stage"
scene.3.actions [{"type":"typeText","target":"stream","text":"\\n```xcon-sketch\\nscreen \\\"Typed Release Card\\\" 720x420 bg #eef2ff\\n  card: panel at 28 28 664 364\\n    bg #ffffff\\n    radius 28\\n    border\\n      visible true\\n      color #dbe4f0\\n    badge: label \\\"TYPED LIVE\\\" at 36 34 112 26\\n      bg #dbeafe\\n      color #1d4ed8\\n      align center\\n      radius 13\\n      font\\n        size 12\\n        weight 800\\n    title: label \\\"Release room update\\\" at 36 78 330 38\\n      color #0f172a\\n      font\\n        size 30\\n        weight 800\\n    body: label \\\"QA cleared smoke tests. Docs are staged. Support can begin the handoff.\\\" at 36 126 440 56\\n      color #475569\\n      font\\n        size 16\\n        weight 600\\n    metric1: panel at 36 210 180 92\\n      bg #eff6ff\\n      radius 18\\n      label1: label \\\"Confidence\\\" at 18 16 120 18\\n        color #64748b\\n        font\\n          size 13\\n          weight 700\\n      value1: label \\\"High\\\" at 18 42 120 30\\n        color #2563eb\\n        font\\n          size 28\\n          weight 800\\n    metric2: panel at 236 210 180 92\\n      bg #f0fdf4\\n      radius 18\\n      label2: label \\\"Blockers\\\" at 18 16 120 18\\n        color #64748b\\n        font\\n          size 13\\n          weight 700\\n      value2: label \\\"0\\\" at 18 42 120 30\\n        color #16a34a\\n        font\\n          size 30\\n          weight 800\\n    next: label \\\"Next checkpoint 16:30 KST\\\" at 456 240 170 24\\n      color #0f172a\\n      font\\n        size 15\\n        weight 800\\n```","append":true,"duration":2600},{"type":"render","target":"artifact","duration":500}]
scene.4.id "handoff"
scene.4.title "Finish note"
scene.4.caption "Append the closing handoff after the rendered card is visible."
scene.4.action "typeText"
scene.4.duration 1200
scene.4.focus "source"
scene.4.actions [{"type":"typeText","target":"stream","text":"\\n\\nFinal handoff: publish the release note after the checkpoint owner confirms the build tag.","append":true,"duration":1200},{"type":"cursorMove","target":"preview","value":{"x":612,"y":80},"duration":420},{"type":"wait","duration":360}]
```

# Release room update

The launch room is ready. QA has cleared the smoke tests, documentation is staged, and support can begin the handoff.

- Release confidence: high
- Open blockers: none
- Next checkpoint: 16:30 KST

```xcon-sketch
screen "Typed Release Card" 720x420 bg #eef2ff
  card: panel at 28 28 664 364
    bg #ffffff
    radius 28
    border
      visible true
      color #dbe4f0
    badge: label "TYPED LIVE" at 36 34 112 26
      bg #dbeafe
      color #1d4ed8
      align center
      radius 13
      font
        size 12
        weight 800
    title: label "Release room update" at 36 78 330 38
      color #0f172a
      font
        size 30
        weight 800
    body: label "QA cleared smoke tests. Docs are staged. Support can begin the handoff." at 36 126 440 56
      color #475569
      font
        size 16
        weight 600
    metric1: panel at 36 210 180 92
      bg #eff6ff
      radius 18
      label1: label "Confidence" at 18 16 120 18
        color #64748b
        font
          size 13
          weight 700
      value1: label "High" at 18 42 120 30
        color #2563eb
        font
          size 28
          weight 800
    metric2: panel at 236 210 180 92
      bg #f0fdf4
      radius 18
      label2: label "Blockers" at 18 16 120 18
        color #64748b
        font
          size 13
          weight 700
      value2: label "0" at 18 42 120 30
        color #16a34a
        font
          size 30
          weight 800
    next: label "Next checkpoint 16:30 KST" at 456 240 170 24
      color #0f172a
      font
        size 15
        weight 800
```

Final handoff: publish the release note after the checkpoint owner confirms the build tag.
