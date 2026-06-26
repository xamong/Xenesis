# Rich List And XList Recipes

Use these recipes when generating feeds, card rails, chat transcripts, product
lists, notice boards, and mobile app home screens. Prefer one data-driven `list`
over repeated hand-coded cards.

## Required List Pattern

Every list should include:

- `backgroundColor`
- `direction` or `orientation`
- `itemSize`
- `separator`
- `dataTemplate`
- `templates.cell` with a named layout object

The named layout should be a `panel`, `button`, or another supported container
with explicit child positions. Use `{{item.field}}` for data binding inside the
cell.

## XList Showcase Variants

When the renderer supports showcase list extensions, `xListVariant` can express
more specific repeated layouts:

- `xListVariant "showcase"` for visually rich rails and app home sections.
- `noticeLayout` for compact notices with severity, time, and owner.
- `youChatLayout` and `meChatLayout` for chat-like artifact simulations.
- `_layout` or item-level layout hints when examples show mixed cards.
- Horizontal category chips for app filters and quick navigation.
- Circular category avatars for travel, hospitality, product, and profile views.

Use these fields to guide the renderer, but keep the basic list contract intact.

## Horizontal Card Rail

```xcon-sketch
screen "Stay Rail" 402x420 bg @surface
  title: label "Popular stays" at 20 24 180 28
    color @ink
    font
      size 22
      weight 900

  stays: list at 20 72 362 270
    backgroundColor @surface
    direction "horizontal"
    xListVariant "showcase"
    itemSize
      width 230
      height 250
    separator
      size 14
      color @surface
    dataTemplate {"type":"template","template":{"tabledata":[{"name":"Lake house","place":"Yangpyeong","price":"$132","image":"https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=700&q=80"},{"name":"Urban loft","place":"Seoul","price":"$98","image":"https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=700&q=80"}]}}
    templates {"cell":{"stayCard":{"type":"panel","pos":[0,0,230,250],"backgroundColor":"@surface2","border":{"visible":true,"color":"@border","radius":22},"components":{"componentsOrder":"photo,name,place,price","photo":{"type":"image","src":"{{item.image}}","pos":[10,10,210,130],"objectFit":"cover","border":{"visible":false,"radius":18}},"name":{"type":"label","text":"{{item.name}}","pos":[14,156,160,24],"color":"@ink","font":{"size":17,"weight":800}},"place":{"type":"label","text":"{{item.place}}","pos":[14,184,130,20],"color":"@ink-2","font":{"size":13,"weight":600}},"price":{"type":"label","text":"{{item.price}} / night","pos":[14,214,140,20],"color":"@accent","font":{"size":14,"weight":800}}}},"itemSize":{"width":230,"height":250}}}
```

## Notice Feed

Use a vertical list with severity badges for operations, project, and incident
documents. Good data fields: `title`, `severity`, `owner`, `time`, `summary`,
and `progress`.

## Chat Artifact Feed

For chat-like simulations:

- Use one list with message records.
- Distinguish sender with `youChatLayout` or `meChatLayout`.
- Keep each message cell within `itemSize`; long text should wrap inside a label
  with enough height.
- Attach generated XCON artifacts after the chat transcript, not inside every
  chat bubble, unless the task specifically asks for artifact cards.

## Pitfalls

- Do not omit `templates.cell`.
- Do not use debug field names as visible labels.
- Do not let horizontal rails exceed the screen without intentional scrolling.
