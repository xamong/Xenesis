# Domain Blueprint Recipes

Use these blueprints to choose richer XCON components for common user requests.
They are intentionally short: pick the closest domain, then combine it with the
shared contract and task-specific prompt.

## Mobile Commerce Or Travel

Use:

- Image-backed `banner` or layered hero.
- `searchBar` or search-styled `textField`.
- Horizontal category `list` with avatar or icon chips.
- `xListVariant "showcase"` for product, stay, route, or venue cards.
- Bottom navigation as icon `button` components inside a `panel`.

Good sections: greeting/header, search, hero offer, category rail, popular list,
recommendations, bottom nav.

## Field Monitoring Or Drone Operations

Use:

- KPI cards with `badge` and `progressBar`.
- `map` with markers for active sites.
- `chart` for load, signal, battery, or incident trends.
- `networkDiagram` for gateway, drones, sensors, and relays.
- `spanGrid` or alert `list` for work queue.
- `scheduler` plus `callApi` in Workflow for refresh.

## Smart Factory

Use:

- Production line KPI cards.
- `chartType "line"` for throughput and defect trend.
- `chartType "bubble"` for risk by machine and impact.
- `spanGrid` for machine inventory.
- `workqueue` for maintenance approval.

## Urban CCTV Or Security Command

Use:

- Image tiles or `gallery` for camera feeds.
- `map` markers for camera and incident locations.
- `badge` for open, investigating, and resolved states.
- `networkDiagram` for camera, recorder, and dispatch dependencies.
- Alert `list` with severity and time.

## Hospital Operations

Use:

- KPI cards for beds, wait time, surgery queue, and staffing.
- `spanGrid` for department status.
- `chartType "bar"` for load by unit.
- `workqueue` for escalation and handoff.
- Keep visual tone calm and readable.

## Energy Or Utility Dashboard

Use:

- `chartType "line"` for demand and generation.
- `chartType "doughnut"` for source mix.
- `map` markers for substations or outages.
- `networkDiagram` for grid dependency.
- `progressBar` for capacity and restoration progress.

## Finance, Invoice, Or AR/AP

Use:

- `spanGrid` for invoice rows.
- KPI cards for total, overdue, approved, and exceptions.
- `chartType "bar"` for aging buckets.
- `workqueue` for approvals.
- Markdown summary before the XCON/SKETCH artifact.

## Sports, League, Or Ranking Standings

Use:

- `spanGrid` for the complete standings table or ranked rows.
- `chartType "bar"` for wins, points, score, percentage, or rank comparison.
- KPI cards for leader, games behind, streak, total matches, and recent form.
- Short Markdown summary that names the source, league, and date when known.

Do not answer standings with a table alone. The visual artifact should include
both the table and a chart so the ranked pattern is visible at a glance.

## Parking, Weather, Or Sales Comparison

Use:

- Parking: map, occupancy progress bars, gate status badges, queue grid.
- Weather: forecast chart, alert badges, regional map, response queue.
- Sales: comparison charts, top account list, region map, exception table.

## Selection Rule

If the brief mentions real-time, monitoring, command, operations, sensor, queue,
incident, dispatch, or dashboard, assemble the dashboard and workflow recipes.
If it mentions document, report, packet, invoice, approval, Telegram, or export,
assemble the family binding recipe so the same data can drive Markdown, SKETCH,
and PDF output.
