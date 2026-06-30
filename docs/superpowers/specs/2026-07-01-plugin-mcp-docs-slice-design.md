# Plugin, MCP, And Docs Slice Design

## Priority

Order 5 in the non-package parity roadmap.

## Goal

Port the remaining non-runtime packaging, MCP prompt/test, and documentation
parity items after the core runtime slices are in place.

## Source Surface

Sibling files to evaluate and adapt:

- `providers/xenesis/plugins/xcon-sketch/xenesis.plugin.json`
- `providers/xenesis/plugins/xcon-sketch/skills/xcon-sketch/SKILL.md`
- `mcp/prompts/17-workbench-natural-xcon-response.md`
- `mcp/playwright-worker-input-actions.test.mjs`
- `mcp/playwright-worker-source.test.mjs`
- `scripts/releaseSafeCommands.mjs`
- Selected docs:
  - `docs/codex-claude-mcp-skill-registration.md`
  - `docs/mcp-capabilities.md`
  - `docs/mcp-integration.md`
  - `docs/mcp-prompt-usage.md`
  - `docs/mcp-xcon-repair-loop.md`
  - `docs/xenesis-agent-workbench-test-prompts.md`
  - release and setup docs as needed.

Current repo files that must stay aligned:

- `package.json` build resources if plugin packaging is added.
- `mcp/xenesis-desk-mcp-server.mjs`
- `src/main/providerIntegrationInstaller.mjs`
- `scripts/checkDocsPublicSafety.mjs`
- Existing `docs/manual/**` and Obsidian docs.

## Architecture

This slice treats XCON/SKETCH generation support as a provider plugin capability
instead of built-in agent knowledge. The plugin ships a skill and an MCP server
configuration pointing at the Desk MCP server. Workbench and Agent surfaces can
then request prompt contracts through MCP/plugin context instead of hardcoding
format guidance in more places.

Docs are merged selectively. Current repo docs remain the canonical public
documentation structure; sibling docs are source material, not a wholesale copy
target.

## Data Flow

1. Packaged plugin assets are installed into provider asset locations.
2. Provider integration installer can expose the plugin skill and MCP server
   config.
3. Workbench/MCP prompt docs define when to use `workbench-response`,
   `markdown-xcon`, `strict-sketch`, and validation/repair flows.
4. Public docs describe the same supported paths without leaking local-only
   secrets or private development state.

## Tests

Focused tests:

- MCP prompt/source tests.
- Playwright worker input action tests.
- Provider installer or packaging checks if plugin resources are added.
- Docs public safety checks.

Broader gates:

- `npm test`
- `npm run typecheck` if source changes.
- `npm run check:public-release`

## Non-Goals

- Do not change `packages/xenesis`.
- Do not rewrite existing manual docs wholesale.
- Do not add plugin behavior that bypasses the Desk MCP/CR contracts.
