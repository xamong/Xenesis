# Contributing to Xenesis Desk

Thanks for taking the time to improve Xenesis Desk. This repository is the source tree for the desktop app, its embedded Xenesis sidecar runtime, the MCP bridge, sample extensions, and curated provider integration assets.

## Development Setup

Requirements:

- Node.js 22.12 or later
- npm 10 or later
- Visual Studio Build Tools 2022 on Windows when native modules must be rebuilt

Install and start the development app:

```bash
npm install
npm run dev
```

The root install is the source of truth. Do not run `npm install` inside `packages/xenesis`; Xenesis is bundled as the private internal sidecar runtime from `file:packages/xenesis`.

## Before Opening a Pull Request

Run the lightweight public checks:

```bash
npm run typecheck
npm run check:docs-public
npm run check:public-release:ci
```

For release packaging changes, also run the relevant platform pack command. On Windows:

```bash
npm run pack:win
npm run check:public-release
```

## Scope Guidelines

- Keep public source changes separate from local runtime state and generated reports.
- Do not commit secrets, API keys, bot tokens, local profile files, or captured terminal transcripts.
- Keep `providers/` as development source assets and `provider-assets/**` as the packaged runtime subset.
- Keep `packages/xenesis` private unless the project explicitly decides to publish it as an independent runtime.
- Update README or docs when changing public behavior, setup, release packaging, MCP tools, provider installers, or security boundaries.

## Pull Request Checklist

- The change has a clear user or maintainer purpose.
- Tests or release guards cover the behavior when practical.
- Public docs are updated for setup, usage, or packaging changes.
- `npm run typecheck` passes.
- `npm run check:docs-public` passes.
- `npm run check:public-release:ci` passes.
