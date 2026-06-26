```xcon-demo
demo "Chat stream weather card"
mode "chat-stream"
autoplay false
stream.sketchDelay 760
workflow.run false
scene.1.id "stream"
scene.1.title "Stream LLM answer"
scene.1.caption "Source appears as a live Markdown plus SKETCH response."
scene.1.action "stream"
scene.1.duration 700
scene.1.focus "source"
scene.2.id "render"
scene.2.title "Render card"
scene.2.caption "The partial SKETCH block becomes a stable weather artifact."
scene.2.action "render"
scene.2.duration 900
scene.2.focus "stage"
scene.2.actions [{"type":"caption","text":"The partial source has resolved into a stable XCON/SKETCH card."},{"type":"focus","target":"stage"},{"type":"render"},{"type":"wait","duration":450}]
```

# Seoul morning brief

The assistant responds as Markdown plus XCON/SKETCH. The card can render before the full response finishes.

```xcon-chain-fixture
{
  "record": {
    "city": "Seoul",
    "temperature": 24,
    "condition": "Clear",
    "summary": "Light breeze, low rain risk, and a good commute window.",
    "updatedAt": "07:40",
    "metrics": { "revenue": 24, "growth": 2, "health": 91 },
    "channels": [
      { "name": "08:00", "revenue": 22 },
      { "name": "11:00", "revenue": 25 },
      { "name": "14:00", "revenue": 28 },
      { "name": "18:00", "revenue": 24 }
    ]
  }
}
```

```xcon-chain as tempLabel
= record.temperature | concat "C"
```

```xcon-chain as chartData
= record.chartData
```

```xcon-sketch
screen "Weather Answer" 720x420 bg #eff6ff
  card: panel at 24 24 672 368
    bg #ffffff
    radius 28
    border
      visible true
      color #d8e0ea
    city: label "$record.city" at 36 34 180 32
      color #0f172a
      font
        size 28
        weight 800
    temp: label "$tempLabel" at 502 32 110 48
      color #2563eb
      align right
      font
        size 44
        weight 800
    condition: label "$record.condition" at 36 78 180 22
      color #2563eb
      font
        size 16
        weight 800
    summary: label "$record.summary" at 36 112 420 42
      color #475569
      font
        size 15
        weight 600
    chart: chart at 36 190 430 150
      chartType "line"
      chartData $chartData
    badge: label "Updated $record.updatedAt" at 500 306 112 28
      bg #e0f2fe
      color #075985
      align center
      radius 14
      font
        size 12
        weight 800
```
