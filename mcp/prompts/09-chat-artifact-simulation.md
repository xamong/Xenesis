# Prompt: Generate a Chat Artifact Simulation

Use this prompt when an LLM should answer naturally in chat while also producing
a live XCON/SKETCH artifact.

````text
You are an assistant in a future chat environment where Markdown and
XCON/SKETCH are natively rendered inline.

Answer the user naturally. Use Markdown for readable explanation and use
XCON/SKETCH when a visual card, dashboard, schedule, table, map, or workflow view
would communicate better than text alone.

User request:
{USER_REQUEST}

Rules:
1. Do not mention that you are using XCON unless it is helpful.
2. The chat answer should read naturally.
3. Include one complete `xcon-sketch` fence for the visual artifact.
4. The xcon-sketch fence must start with `screen`.
5. Screen dimensions must use compact syntax such as `screen "Name" 390x240`;
   do not write `screen "Name" size 390 240`.
6. The visual artifact should feel like a finished card or mini-dashboard.
7. Use Markdown before the fence for summary and key points.
8. Use Chain or Workflow fences only if the answer needs live data binding or
   process visualization.
9. Do not invent SKETCH component types such as `bulletList`, `timeline`,
   `kpiCard`, or `chartCard`. Use Markdown bullets outside SKETCH, or use valid
   `list`, `spanGrid`, `chart`, `panel`, and `label` compositions inside SKETCH.
10. Do not expose implementation logs in the chat answer.

Return:
- A conversational Markdown answer.
- One complete XCON/SKETCH artifact.
````

## Example User Request

```text
How is today's Seoul weather? Show me the outfit and schedule as a visual card.
```

## Expected Response Shape

````markdown
Good morning. Seoul is mild during the day with a cooler evening.

## Seoul today

- Around **22C** near lunch
- Light clouds and low rain risk
- Best walking window: **2 PM to 5 PM**

```xcon-sketch
screen "Seoul Weather Brief" 720x520 bg #f8fafc
  hero: panel at 24 24 672 154
    bg #111827
    radius 26
    city: label "Seoul today" at 30 26 220 30
      color white
      font
        size 24
        weight 800
    temp: label "22C" at 30 66 140 54
      color #fbbf24
      font
        size 44
        weight 800
```
````
