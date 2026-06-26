# Showcase Component Catalog

Use this catalog when a screen should look like a finished product instead of a
minimal demo. These components are distilled from the XCON showcase sketches and
should be used with the shared contract rules.

## High-Value Components

Core layout and display:

- `panel` for surfaces, cards, app bars, bottom navigation, and containers.
- `label` for all short text, stats, captions, and section headers.
- `button` for commands, icon buttons, nav items, filters, and compact chips.
- `shape` for separators, status dots, overlays, and simple geometry.
- `image` for hero media, thumbnails, avatars, and real product/place imagery.
- `banner` for carousel-like hero stories with image-backed slides.
- `list` for repeated rows, cards, chat messages, and horizontal rails.
- `spanGrid` for spreadsheet-like or dense tabular data.
- `chart`, `map`, and `networkDiagram` for operational and analytical views.

Richer controls and status components used in showcase screens:

- `badge` for compact states such as Ready, Delayed, Critical, or New.
- `alert` for notices, warnings, SLA breaches, and summary callouts.
- `progressBar` for completion, capacity, risk, or workflow progress.
- `spinner` for loading or active collection states.
- `switch`, `checkbox`, and `radioButton` for visible user settings.
- `slider` for range controls such as threshold, volume, or priority.
- `rating` for reviews and quality signals.
- `select`, `datePicker`, `timePicker`, and `colorPicker` for form-heavy views.
- `searchBar` or a search-styled `textField` for discovery screens.
- `tabs` for mode switching and dashboards with multiple sections.
- `accordion` for expandable checklists and FAQ-like detail.
- `modal` and `tooltip` only when the artifact is explicitly showing a dialog or
  inline hint state.
- `avatar`, `icon`, `qrCode`, `barcode`, `carousel`, and `gallery` for media-rich
  product, travel, logistics, and identity experiences.
- `divider`, `spacer`, `line`, `stack`, `flexBox`, and `card` for composition when
  the target renderer supports them.

## Composition Guidance

- Use `button` icons for toolbar actions and bottom navigation; do not spell out
  obvious icon-only actions if the icon name is clear.
- Use `badge`, `progressBar`, and `alert` together for operational status.
- Use a real `image` or `banner` for product, venue, travel, property, portfolio,
  and media-heavy screens.
- Use `tabs` with a small active indicator when the user needs mode switching.
- Use form controls only when the screen is explicitly interactive or
  configuration-oriented.
- Keep repeated items in a `list` with `dataTemplate`; avoid copy-pasting many
  card panels unless the count is very small.

## Compact Component Example

```xcon-sketch
screen "Control Strip" 402x220 bg @surface
  header: panel at 20 20 362 64
    bg @surface2
    radius 18
    title: label "Operations ready" at 20 14 190 24
      color @ink
      font
        size 18
        weight 800
    state: badge "Ready" at 258 16 78 30
      bg #dcfce7
      color #166534
      radius 15

  progress: progressBar at 20 108 362 14
    value 72
    bg @surface3
    fill #22c55e
    radius 7

  tabs: tabs at 20 146 210 42
    value "today"
    items [{"id":"today","label":"Today"},{"id":"week","label":"Week"}]

  live: switch at 304 152 58 30
    checked true
```

## Final Check

- The component type must exist in the prompt set or provided examples.
- Advanced components must still have explicit size and position.
- Rich controls should serve the screen purpose; do not add them as decoration.
