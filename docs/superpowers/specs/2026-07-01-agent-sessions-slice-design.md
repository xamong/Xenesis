# Agent Sessions Slice Design

## Priority

Order 1 in the non-package parity roadmap.

## Goal

Port the sibling Agent Sessions Hub without touching `packages/xenesis`. The
slice gives Desk a CR-backed way to scan, list, search, resume, attach, pin, and
hide local AI agent sessions across supported providers.

## Source Surface

Sibling files to evaluate and adapt:

- `src/shared/agentSessions.ts`
- `src/shared/agentSessions.test.ts`
- `src/shared/agentSessionsCapabilities.test.ts`
- `src/main/agentSessions/adapters.ts`
- `src/main/agentSessions/indexStore.ts`
- `src/main/agentSessions/jsonl.ts`
- `src/main/agentSessions/pathUtils.ts`
- `src/main/agentSessions/service.ts`
- Matching `src/main/agentSessions/*.test.ts`
- `src/renderer/agentSessions/terminalLinker.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/AgentSessionsPane.tsx`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/agentSessionsPanelModel.ts`
- `src/renderer/extensions/xenesis-desk.core-tools/panes/xenesisAgentAgentSessions.ts`

Likely integration points:

- `src/shared/deskBridgeCapabilities.ts`
- `src/shared/appMenuModel.ts`
- `src/shared/types.ts`
- `src/main/index.ts`
- `src/main/extensions/extensionHost.ts`
- `src/renderer/env.d.ts`
- i18n files if visible labels are needed.

## Architecture

The shared model owns normalized session records, sorting, ranking, filtering,
and visible-subagent terminal metadata detection. The main process owns local
filesystem scanning and overlay state. The renderer owns the Agent Sessions pane
and simple direct routing helpers from Xenesis Agent prompts to CR calls.

The Capability Registry exposes:

- `xd.agentSessions.status`
- `xd.agentSessions.scan`
- `xd.agentSessions.list`
- `xd.agentSessions.search`
- `xd.agentSessions.resume`
- `xd.agentSessions.attachTerminal`
- `xd.agentSessions.pin`
- `xd.agentSessions.hide`
- `xd.tools.core.agentSessions.open`

Resume and terminal attach operations require approval because they can send
commands or bind active terminals.

## Data Flow

1. The main service scans supported local session stores into normalized records.
2. The service combines saved sessions, visible terminal links, pinned state, and
   hidden state.
3. CR read calls return filtered or ranked views.
4. Resume calls return a preview or route an approved command to a visible
   terminal.
5. The Agent Sessions pane uses the same CR surface, not renderer-only shortcuts.

## Error Handling

- Unsupported providers return diagnostics instead of throwing at pane load time.
- Missing local CLI/session folders degrade the source status to unsupported or
  unavailable.
- Resume requests without a command return a structured preview failure.
- External workspace or terminal command execution continues through existing
  approval policy.

## Tests

Focused tests:

- Shared model tests.
- Main scanner/store/service tests.
- Renderer pane model tests.
- CR registration and dispatch tests.

Broader gates:

- `npm test`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- Electron smoke: open Agent Sessions pane and call `xd.agentSessions.list`.

## Non-Goals

- No changes to `packages/xenesis`.
- No new provider runtime behavior.
- No hidden background resume path. Resume must remain visible or preview-only.
