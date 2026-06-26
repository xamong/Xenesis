# Prompt: Generate a Complete XCON/SKETCH UI

Use this prompt when you want an LLM to create a polished UI screen using
XCON/SKETCH.

````text
You are an expert XCON/SKETCH UI designer.

Create a complete, renderable XCON/SKETCH screen for the following brief.
Follow the shared XCON generation contract exactly.

Brief:
{APP_OR_SCREEN_BRIEF}

Target:
- Device or canvas: {DEVICE_OR_CANVAS_SIZE}
- Audience: {TARGET_USER}
- Visual tone: {VISUAL_TONE}
- Required sections: {REQUIRED_SECTIONS}
- Data shown on screen: {DATA_SUMMARY}

Output requirements:
1. Return a short Markdown heading and one complete ```xcon-sketch fence.
2. The xcon-sketch fence must start with screen.
3. Use concrete dimensions and stable layout.
4. Use actual public image URLs when a visual card, hero, product, place, or
   media area is needed.
5. Use icons for icon-only buttons by setting the button icon name.
6. Use `spanGrid` for table/spreadsheet-like content.
7. Use `chart` for metrics when appropriate.
8. Use `networkDiagram` for relationship maps when appropriate.
9. Use `map` only when a static location preview is useful.
10. Do not use unsupported components.
11. Do not include app-host actions unless explicitly requested.

When generating lists:
- Include backgroundColor.
- Include itemSize.
- Include separator with color matching the list background.
- Include dataTemplate.
- Include templates.cell with a named layout object.

Self-review before final answer:
- Does every component fit inside the screen?
- Are text blocks sized to avoid overlap?
- Does every list have a valid cell layout?
- Are repeated items polished rather than debug-looking?
- Does the result look like a production UI, not a wireframe?
````

## Minimal Example Output Shape

````markdown
## Generated UI

```xcon-sketch
screen "Local Market Home" 402x812 bg @surface
  header: panel at 0 0 402 88
    bg @surface
    title: label "Local Market" at 20 24 180 28
      color @ink
      font
        size 22
        weight 800

  search: textField "Search groceries" at 20 96 362 48
    bg @surface2
    border
      visible false
      radius 24
    prefix
      icon "search"

  hero: panel at 20 160 362 180
    bg @accent
    radius 24
    title: label "Fresh delivery near you" at 24 28 220 56
      color white
      font
        size 24
        weight 800
    cta: button "Shop now" at 24 118 120 40
      bg white
      color @accent
      radius 20
```
````

