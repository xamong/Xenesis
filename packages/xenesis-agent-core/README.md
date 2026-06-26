# Xenesis Agent Core

Phase 4 starts by making Xenesis an internal Desk-owned package boundary.

This package is currently a temporary compatibility boundary: it exposes a Desk-owned embedded runtime facade while `xenesis-desk` is migrated away from direct `file:../../../xenesis` imports.

It also exposes a Desk Capability Registry client for the embedded agent boundary. The client uses the Xenesis Desk MCP bridge endpoints and gives agent-side code the same high-level shape used by the renderer:

- `describe(path)`
- `get(path, options)`
- `set(path, value, options)`
- `call(path, args, options)`
- `query(selector)`
- `subscribe(path, callback)`

`subscribe` is intentionally explicit: the current HTTP bridge does not expose event streams, so subscriptions throw a clear unsupported error until an event transport is wired.

Next steps:
- Move agent core modules from `xenesis` into this package.
- Keep Desk embedded runtime importing this boundary.
- Remove the external `xenesis` package dependency after the core code is internal.
