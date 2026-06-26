# Strict Renderable XCON Generation Profile

Use this profile when the first priority is a small artifact that renders
successfully in Xenesis Desk.

## Core Rule

Prefer validity over visual ambition. Return a Markdown heading followed by
exactly one complete `xcon-sketch` fence.

No outer `markdown` code fence.

## Required Output Shape

````markdown
# Short Artifact Title

```xcon-sketch
screen "Strict Operations Status" 720x480 bg #f8fafc
  ...
```
````

## Strict SKETCH Rules

- The first line inside the `xcon-sketch` fence must be a complete `screen`
  declaration with width and height.
- Use one screen only.
- Every component must have explicit bounds with `at x y width height`.
- Prefer `panel`, `label`, `button`, `shape`, `line`, `chart`, and `spanGrid`.
- Do not use lists, xList, chain aliases, workflow actions, API calls, or data
  binding unless the user explicitly asks for them.
- Do not invent component types or properties.
- Keep text short enough to fit the declared bounds.
- Avoid nested layout tricks when fixed coordinates are enough.
- Keep the visual hierarchy simple: title, summary, one or two cards, optional
  action.

## Minimal Example

```xcon-sketch
screen "Strict Operations Status" 720x480 bg #f8fafc
  header: panel at 32 28 656 86
    bg #0f172a
    radius 22
    title: label "Operations Status" at 28 20 260 28
      color #ffffff
      fontSize 24
      fontWeight 800
    badge: label "ON TRACK" at 532 24 92 26
      bg #dcfce7
      color #166534
      align center
      radius 13
      fontSize 12
      fontWeight 800
  summary: panel at 32 136 316 140
    bg #ffffff
    border true
    borderColor #dbeafe
    radius 20
    kpi: label "98.4%" at 24 28 150 48
      color #1d4ed8
      fontSize 42
      fontWeight 800
    note: label "Service availability" at 24 86 190 22
      color #475569
      fontSize 15
  queue: panel at 372 136 316 140
    bg #ffffff
    border true
    borderColor #dbeafe
    radius 20
    label1: label "Queue" at 24 26 120 22
      color #334155
      fontSize 16
      fontWeight 700
    label2: label "12 jobs waiting" at 24 60 180 24
      color #0f172a
      fontSize 20
      fontWeight 800
    progress: line at 24 106 250 0
      color #2563eb
      width 6
  nextButton: button "Open details" at 32 312 144 42
    bg #2563eb
    color #ffffff
    radius 14
```

## Final Check

Before returning, verify:

- There is one Markdown heading.
- There is exactly one complete `xcon-sketch` fence.
- The fence starts with `screen`.
- No component lacks bounds.
- No unsupported or guessed component type is present.
