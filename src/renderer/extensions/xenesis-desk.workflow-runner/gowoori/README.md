# Gowoori Module Layout

Gowoori is split into three runtime modules plus a small shared layer.

- `viewer/`: renders Gowoori artifacts. This owns `GowooriPane`, preview/edit/split state, and the bridge from markdown/XCON/SKETCH content into the Desk document area.
- `chat/`: owns GowooriChat UI. This includes user/developer chat surfaces, transcript panels, provider settings panels, repair diagnostics, and quality panels.
- `agent/`: owns prompt routing, provider execution, tool context, artifact validation, repair, finalization, and quality/benchmark helpers.
- `shared/`: owns cross-module events and common contracts used by viewer, chat, and agent.

Gowoori imports should target these module folders directly. Root-level and `panes/` compatibility re-exports were removed so stale dependencies surface during typecheck.

## Agent Tool Endpoints

Gowoori Agent can attach structured data packets before the LLM prompt is sent.
The sports standings tool expects a local endpoint that returns rows, grid data,
or a supported provider payload.

Run the local sports tool server from `tools/xenesis-desk`:

```powershell
npm run server:gowoori-sports
```

Use the built-in auto adapter when a custom upstream is not configured. It routes
KBO requests to the KBO standings table and ESPN-supported leagues to ESPN's web
standings API:

```powershell
$env:GOWOORI_SPORTS_STANDINGS_PROVIDER = 'auto'
npm run server:gowoori-sports
```

Then set GowooriChat `Sports standings endpoint` to:

```text
http://127.0.0.1:3338/sports/standings
```

The endpoint accepts `league`, `sport`, `intent`, and `prompt` query parameters
and returns normalized `rows`, `gridData`, and `chartData`. It must not invent
fake live standings when no upstream/provider is configured.

Sports and league standings artifacts are expected to render both `spanGrid`
and `chart`. `spanGrid` carries the full ranked table, while `chart` makes wins,
points, percentage, score, or rank comparison visible without reading every row.
