# Demo Lab Preset

Demo Lab presets are portable Markdown files that describe a read-only demo sequence for the Xenesis Desk Demo Lab Player. A preset combines:

- one `xcon-demo` fence for demo metadata and scene playback
- normal Markdown for narrative text
- one or more renderable fences such as `xcon-sketch`

The Demo Lab Player reads the `xcon-demo` fence, then renders the remaining Markdown and XCON/SKETCH content in the same pane.

## File Shape

Use `.xcon.md` for portable preset files.

~~~md
```xcon-demo
format "xcon-demo-preset/v1"
demo "Demo title"
mode "read-only"
scene.1.id "brief"
scene.1.title "Draft source"
scene.1.caption "Explain what the viewer should show."
scene.1.action "render"
scene.1.actions [{"type":"caption","text":"Prepare the source panel.","duration":200}]
scene.1.duration 800
```

# Demo title

```xcon-sketch
screen "Demo" 720x360 bg #f8fafc
```
~~~

## Preset Fields

| Field | Required | Description |
| --- | --- | --- |
| `format` | Yes | Must be `xcon-demo-preset/v1`. |
| `demo` | Recommended | Display title shown in the Demo Lab Player header. |
| `mode` | Recommended | Usually `read-only` for playback presets. |
| `scene.N.id` | Recommended | Stable scene id. |
| `scene.N.title` | Yes | Short scene title. |
| `scene.N.caption` | Recommended | Human readable scene explanation. |
| `scene.N.action` | Yes | Primary action label shown in the scene list. |
| `scene.N.actions` | Recommended | JSON action array used for playback state. |
| `scene.N.duration` | Yes | Scene duration in milliseconds. |

`scene.N.actions` is the precise playback contract. The scalar `scene.N.action` remains as a compact label and fallback.

## Action Contract

Each entry in `scene.N.actions` is a JSON object.

```json
{"type":"caption","target":"preview","text":"Render the artifact.","duration":220}
```

Common properties:

| Property | Type | Description |
| --- | --- | --- |
| `type` | string | Action type. |
| `target` | string | Logical target such as `source`, `preview`, `artifact`, `timeline`, `fixture`, `chain`, or `workflow`. |
| `text` | string | Text for caption, type simulation, callout, or status text. |
| `value` | string | Alternate payload text. |
| `status` | string | Status label for fixture, chain, or workflow events. |
| `x`, `y` | number | Cursor position inside the playback overlay. |
| `duration` | number | Action duration in milliseconds. |

Supported action types:

| Type | Effect |
| --- | --- |
| `caption` | Updates the playback message. |
| `typeText` | Simulates typed text in the playback state panel. |
| `cursorMove` | Moves the demo cursor to `x`, `y`. |
| `cursorClick` | Moves the cursor and shows a click pulse. |
| `focus` | Marks a logical target as focused. |
| `highlight` | Adds a highlight style to a logical target. |
| `callout` | Shows a short explanatory callout. |
| `render` | Marks the preview or artifact target as active. |
| `fixture` | Updates the Fixture runtime state. |
| `chain` | Updates the Chain runtime state. |
| `workflowEvent` | Updates the Workflow event runtime state. |
| `workflow` | Marks workflow replay as active. |
| `wait` | Holds the current scene and shows an optional wait message. |

## Authoring Rules

- Keep the `xcon-demo` fence first so the Demo Lab Player can parse scene metadata immediately.
- Keep `scene.N.actions` on one line as valid JSON.
- Use double quotes inside JSON actions.
- Use stable logical targets rather than DOM selectors.
- Keep each action short. Long action sequences should be split into multiple scenes.
- Keep the visible artifact in normal Markdown and `xcon-sketch` fences. The demo fence only controls playback metadata.

## Examples

Portable examples are stored under `examples/demo-lab`:

- `chat-stream-weather.xcon.md`
- `binding-lab-weather-forecast-ops.xcon.md`
- `binding-dashboard.xcon.md`
- `grid-editor-canvas-mode.xcon.md`

Open them from Demo Lab Player with **Open preset**, or drag and drop the file into the pane.

## First 5 Minute Demo Order

The built-in Demo Lab preset registry marks the repeatable first-run demo path with `first-5-demo` metadata. `getDemoLabPresetOptions()` returns these presets first:

1. `chat-stream-weather`
2. `binding-lab-weather-forecast-ops`
3. `binding-dashboard`
4. `built-in`
5. `cinematic-launch-room`
6. `grid-editor-canvas-mode`

Template Catalog entries use the same `first-5-demo` recommendation key, so the catalog can show starter dashboard, fixture binding, chart, and grid templates before the broader template set.
