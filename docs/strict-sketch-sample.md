# Strict SKETCH Golden Sample

This sample is the small golden artifact for the `strict-sketch` prompt profile.
It should remain simple enough for automated validation while still proving that
the generated screen is useful inside Xenesis Desk.

```xcon-sketch
screen "Strict Operations Status" 720x480 bg #f8fafc
  shell: panel at 24 24 672 432
    bg #ffffff
    radius 20
    border
      visible true
      color #d8e0ea

  eyebrow: label "STRICT PROFILE" at 52 52 170 18
    color #2563eb
    font
      size 12
      weight 800

  title: label "Operations Status" at 52 78 320 34
    color #0f172a
    font
      size 28
      weight 800

  statusBadge: label "READY" at 540 58 104 30
    bg #dcfce7
    color #166534
    radius 15
    align center
    font
      size 12
      weight 800

  summary: label "All required checks are visible, bounded, and parseable." at 52 124 480 22
    color #475569
    font
      size 14
      weight 600

  metricOne: panel at 52 176 180 96
    bg #eff6ff
    radius 16
    metricOneLabel: label "Health" at 18 16 120 18
      color #1d4ed8
      font
        size 12
        weight 800
    metricOneValue: label "99.98%" at 18 42 120 32
      color #1d4ed8
      font
        size 28
        weight 800

  metricTwo: panel at 252 176 108 96
    bg #ecfdf5
    radius 16
    metricTwoLabel: label "Alerts" at 16 16 72 18
      color #047857
      font
        size 12
        weight 800
    metricTwoValue: label "0" at 16 42 72 32
      color #047857
      font
        size 28
        weight 800

  chartPanel: panel at 380 176 264 150
    bg #f8fafc
    radius 16
    border
      visible true
      color #e2e8f0
    chartTitle: label "Queue trend" at 18 14 160 20
      color #0f172a
      font
        size 14
        weight 800
    queueTrend: chart at 18 44 228 82
      chartType "line"
      chartData {"labels":["09:00","10:00","11:00","12:00"],"datasets":[{"label":"Queue","data":[18,14,9,6],"borderColor":"#2563eb","backgroundColor":"rgba(37,99,235,0.10)","tension":0.35}]}

  nextStep: panel at 52 344 592 76
    bg #0f172a
    radius 16
    nextLabel: label "Next step" at 18 16 110 18
      color #93c5fd
      font
        size 12
        weight 800
    nextText: label "Validate the Markdown fence, then save the file through the MCP content tool." at 18 42 470 20
      color #ffffff
      font
        size 13
        weight 600
```
