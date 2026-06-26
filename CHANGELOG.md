# Changelog

All notable public changes to Xenesis Desk will be tracked here.

## Unreleased

- Refreshed README and README.ko for the current alpha surface, using range-based Capability Registry counts so the overview does not drift on every registry update.
- Added public documentation safety checks for local paths, user-specific home directories, token-like values, and key material patterns.
- Documented the public `docs/` map, settings persistence locations, script layout, and GitHub contribution checks.
- Regenerated the public Capability Registry inventory from the current source.
- Removed public documentation references to maintainer-only smoke/demo npm scripts that are intentionally excluded from the committed script surface.

## 0.1.0 - Initial Public Source Release

- Prepared Xenesis Desk for first GitHub publication under `xamong/xenesis-desk`.
- Documented the desktop workbench, Capability Registry, MCP bridge, Gowoori/XCON rendering, provider installers, terminal automation, and embedded Xenesis sidecar runtime.
- Added public release checks for packaging boundaries, provider assets, MCP assets, and the private `packages/xenesis` sidecar.
- Switched published XCON/Pomelo dependencies from local links to npm registry versions.
