# Xenesis TUI Full Port Design

## Objective

Port the stronger TUI implementation from
`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\packages\xenesis` into the
current repo's `packages/xenesis` package without overwriting current provider
fixes or changing the CR-first runtime policy.

The user selected the full upgrade scope. The target result is a modular TUI
runtime with a central command catalog, runtime and agent command routers,
output and image commands, durable approval restore, improved Ink interaction,
and sibling-level TUI test coverage.

## Current Context

The current project TUI has seven source files:

- `inkRenderer.ts`
- `inputBuffer.ts`
- `runTui.ts`
- `scrollback.ts`
- `slashCommandSuggestions.ts`
- `state.ts`
- `viewModel.ts`

Most interactive TUI runtime behavior still lives inside
`packages/xenesis/src/cli/main.ts`. That includes command handling, output
commands, captured slash commands, approval handling, run/resume orchestration,
and controller wiring.

The sibling implementation has fifteen TUI source files:

- `agentCommandRouter.ts`
- `commandCatalog.ts`
- `imageCommands.ts`
- `index.ts`
- `inkRenderer.ts`
- `inputBuffer.ts`
- `outputCommands.ts`
- `runtimeCommandRouter.ts`
- `runtimeController.ts`
- `runtimeTypes.ts`
- `runTui.ts`
- `slashCommandDispatcher.ts`
- `slashCommandSuggestions.ts`
- `state.ts`
- `viewModel.ts`

The sibling `main.ts` delegates TUI behavior to `createTuiRuntimeController`.
This is the desired ownership model for the current project.

The current project also contains provider fixes and package differences that
must be preserved:

- `OpenAIProvider` strict schema handling for OpenAI Responses tools.
- DeepSeek routing through the OpenAI-compatible Chat Completions provider.
- Agent tool-name deduplication before provider calls.
- `provider:desk-mcp-prompt-smoke` script.
- `ajv` dependency.
- Current `xenesis.mcp.example.config.json` package file entry.

## Non-Goals

This design does not change the provider selection model, credential policy,
or local CLI selection rules.

This design does not add new CR paths or bypass the Capability Registry. TUI
commands that reach Desk behavior must keep using existing runtime or bridge
abstractions.

This design does not replace the whole `packages/xenesis` folder or blindly copy
the sibling `main.ts`.

This design does not claim live provider or live Desk behavior is verified. That
belongs to the implementation verification phase.

## Architecture

The TUI should be organized around a small `main.ts` integration point and a
focused TUI runtime package under `src/cli/tui`.

`main.ts` remains responsible for CLI parsing, config loading, provider/runtime
construction, non-TTY fallback, input history loading, and launching Ink. It
should import the TUI public API from `./tui/index.js`.

`runtimeController.ts` becomes the TUI runtime composition root. It owns
mutable TUI state, event reduction, active run control, approval resolution,
session context updates, dynamic suggestion context refresh, and command
dispatcher wiring.

`runtimeTypes.ts` stores shared TUI runtime boundary types. These are the types
that `main.ts`, routers, and controller modules use to communicate without
importing private implementation details from one another.

`commandCatalog.ts` is the single source of truth for TUI command metadata. The
footer, help text, slash suggestions, and selected suggestion detail all come
from this catalog.

`slashCommandDispatcher.ts` centralizes slash command priority:

1. Runtime commands.
2. `/output` commands.
3. `/image` and `/xcon-image` commands.
4. Agent and captured commands.
5. Unknown slash command notice.
6. Normal prompt execution.

`runtimeCommandRouter.ts` owns operator commands such as `/status`,
`/provider`, `/workspace`, `/tools`, `/session`, `/sessions`, `/memory`,
`/parity`, `/commitments`, `/clear`, `/model`, and `/approval`.

`agentCommandRouter.ts` owns captured slash commands, `/plan`, `/work`, and
`/resume`.

`outputCommands.ts` owns command-output navigation, expansion, saving, and
clearing.

`imageCommands.ts` owns terminal image commands and uses the existing remote
Desk bridge abstraction. It must not introduce direct renderer shortcuts.

`state.ts`, `viewModel.ts`, `slashCommandSuggestions.ts`, and `inkRenderer.ts`
should be upgraded to the sibling behavior while preserving any current project
compatibility that is still needed by tests.

## Component Design

### Main CLI Integration

`main.ts` should keep the current provider and config behavior. The TUI branch
should construct a runtime controller with explicit dependencies and then pass
that controller to `runInkTui`.

The current monolithic `runTuiCommand` internals should be reduced to:

- Load config and runtime inputs.
- Create initial TUI state for non-interactive output when needed.
- Create `createTuiRuntimeController`.
- Load persisted TUI input history.
- Run `runInkTui`.
- Save history through existing storage behavior.

### Runtime Controller

The controller exposes the Ink contract:

- `getState()`
- `subscribe(listener)`
- `submit(input)`
- `cancel()`
- `resolveApproval(approved)`
- optional command-output navigation

It owns the active run controller so Ctrl-C can cancel a running prompt without
exiting the TUI. It also records resolved approval tool-call IDs to avoid
reopening late duplicate approval events.

### Runtime Commands

Runtime commands should be testable without Ink. They receive typed
dependencies for config, parsed args, tool registry, runtime state resolution,
and notification/output callbacks.

`/tools` should render tool manifest metadata instead of only comma-separated
tool names.

`/status` should include runtime facade state and configured Desk bridge status
when available.

### Agent Commands

Captured slash commands continue to run through the existing CLI handlers using
a captured IO object. `/resume` supports both:

- `/resume <sessionId>` to restore visible session context and pending durable
  approval context.
- `/resume <sessionId> <prompt>` to resume and send a live prompt.

Restored approval context is informational until a live resumed run requests an
approval again.

### Image Commands

The full scope includes `/image` and `/xcon-image`.

Supported behavior:

- Send a terminal image request through `createRemoteDeskBridgeFromEnv`.
- `recent`, `info`, and `clear` subcommands.
- Recent image and capture-source suggestions.
- Friendly missing-file and bridge-unavailable errors.

The bridge result is rendered as command output. The command must not fake a
successful image render if the bridge is not configured or the target file is
missing.

### Output Commands

`/output` supports:

- `up`
- `down`
- `page-up`
- `page-down`
- `top`
- `bottom`
- `expand`
- `collapse`
- `save`
- `clear`

Output saving creates parent directories when needed and reports the saved path
in TUI state.

### State

TUI state should include:

- Runtime summary: provider, model, approval mode, workspace, optional Desk
  bridge status.
- Run status.
- Messages.
- Tool activity.
- Notices.
- Command output.
- Suggestion context: recent session IDs and image sources.
- Session context: active session, latest session, resumed source, visible
  context count.
- Pending approval, with a `restored` flag for durable approval context.

All agent run events are applied through `reduceTuiEvent`.

### View Model

The view model computes terminal-ready rows from state and viewport dimensions.
It should handle:

- Header rows for runtime, state, and session context.
- Status tone.
- Unified scrollback window.
- Transcript offsets.
- Command-output visible range.
- Footer wrapping.
- Suggestion list and selected suggestion detail.
- Restored approval help text.
- CJK-aware wrapping through display-cell measurement.

If the existing `scrollback.ts` tests depend on direct helper exports, keep a
thin compatibility wrapper rather than removing the file in the first port.

### Ink Renderer

The renderer should support:

- Accurate terminal cursor positioning for Korean and CJK input.
- Incremental rendering.
- Slash suggestion selection.
- Tab and Shift-Tab cycling.
- Enter to accept a selected suggestion when it changes the input.
- Enter to submit when completion would not change the input.
- Escape to hide suggestions first, then clear input.
- Page keys and mouse wheel scrollback.
- Ctrl-C cancel while busy and exit while idle.
- Live approval y/n handling.
- Restored approval display without direct y/n resolution.

## Data Flow

Normal prompt flow:

1. Ink receives keyboard input.
2. The input buffer updates local input state.
3. Submit calls `runtimeController.submit`.
4. The slash dispatcher handles slash commands or returns false.
5. Normal prompts call the existing agent run path.
6. Agent events flow through `reduceTuiEvent`.
7. Subscribers receive the new state.
8. `viewModel` computes rows.
9. Ink renders the updated frame.

Slash command flow:

1. `runtimeController.submit` receives the raw input.
2. `slashCommandDispatcher` parses the input.
3. A focused router or command module handles it.
4. Results are written to notices, command output, session context, or state.
5. The command is recorded in input history when appropriate.

Approval flow:

1. Live permission request events create pending approval state.
2. Live y/n input calls `resolveApproval`.
3. The runtime resumes or denies the tool call through the existing approval
   handler.
4. Duplicate late approval events for already resolved tool-call IDs are
   ignored.
5. Restored durable approvals show context only and require a resumed live run
   for resolution.

Image command flow:

1. `/image` parses file and option arguments.
2. The command validates file existence for file-based requests.
3. It calls the remote Desk bridge abstraction.
4. The result is stored as command output.
5. Recent image sources update slash suggestion context.

## Error Handling

Provider errors remain provider errors. The TUI should display them through the
existing run error path without masking credential, schema, endpoint, or API
errors.

DeepSeek and OpenAI fixes already in the current project must not regress.

`/image` should report:

- Missing image file.
- Unsupported or invalid options.
- Bridge unavailable.
- Bridge call failure.

`/resume` should report:

- Missing session ID.
- Invalid session ID.
- Session log read failure.
- No pending durable approval when restoring only context.

`/output save` should report filesystem write failures without clearing the
current output.

Unknown slash commands should produce a TUI notice based on the known command
catalog.

Cancellation should distinguish a busy-run cancel from an idle TUI exit.

## Testing Strategy

The port should expand current TUI tests from the existing three files toward
the sibling-level suite.

Port or recreate coverage for:

- `tuiCommandCatalog.test.ts`
- `tuiDurableApproval.test.ts`
- `tuiInkRenderer.test.ts`
- `tuiInputBuffer.test.ts`
- `tuiRuntimeCommandRouter.test.ts`
- `tuiRuntimeCommands.test.ts`
- `tuiRuntimeControllerApproval.test.ts`
- `tuiRuntimeControllerStructure.test.ts`
- `tuiRuntimeIntegration.test.ts`
- `tuiSlashCommandDispatcher.test.ts`
- `tuiSlashCommandSuggestions.test.ts`
- `tuiSmoke.test.ts`
- `tuiState.test.ts`
- `tuiViewModel.test.ts`

Keep current scrollback tests passing:

- `tuiInputBufferWidth.test.ts`
- `tuiScrollback.test.ts`
- `tuiScrollbackRenderer.test.ts`

Provider regression tests should also be run during implementation:

- `tests/s3s4/openaiProviderStrictSchema.test.ts`
- `tests/s3s4/agentRunnerToolDedupe.test.ts`
- `tests/s3s4/providerFactoryWiring.test.ts`

## Verification Plan

Focused checks:

```powershell
npm --prefix packages/xenesis test -- tests/cli/tui*.test.ts
npm --prefix packages/xenesis test -- tests/s3s4/openaiProviderStrictSchema.test.ts tests/s3s4/agentRunnerToolDedupe.test.ts tests/s3s4/providerFactoryWiring.test.ts
npm --prefix packages/xenesis run typecheck
npm --prefix packages/xenesis run build
```

Broader checks if CR, Desk bridge, approval, or provider wiring changes beyond
the TUI boundary:

```powershell
npm run docs:capabilities:audit
npm --prefix packages/xenesis run provider:smoke
npm --prefix packages/xenesis run provider:desk-mcp-prompt-smoke
```

Manual or live checks may be needed for actual terminal image rendering and
live provider behavior. These checks should state exact commands, provider, and
result evidence.

## Migration Strategy

The implementation should proceed in slices:

1. Add focused TUI modules and tests that do not affect `main.ts`.
2. Introduce the command catalog and update suggestions/help/footer.
3. Add runtime and agent routers.
4. Add output and image command modules.
5. Add `runtimeController` and wire it into `main.ts`.
6. Upgrade state, view model, and Ink renderer.
7. Port sibling tests and keep current scrollback tests green.
8. Run provider regression tests and package typecheck/build.

Avoid wholesale replacement of:

- `packages/xenesis/src/cli/main.ts`
- `packages/xenesis/package.json`
- provider implementations
- runtime factory/provider registry files

When copying sibling TUI files, review imports and behavior against this repo's
current source before patching.

## Risks

The largest risk is overwriting current provider fixes while porting sibling
TUI code. The mitigation is to patch TUI-owned files and `main.ts` integration
only, then run provider regression tests.

The second risk is drifting away from CR-first policy through image or Desk
bridge commands. The mitigation is to use existing bridge abstractions and run
CR audit only if implementation changes CR-related surfaces.

The third risk is breaking terminal input behavior for Korean and CJK text. The
mitigation is to keep CJK display-width tests and Ink cursor-position tests.

The fourth risk is test-only parity without real terminal confidence. The
mitigation is to include a manual TUI smoke after automated tests when feasible.

## Acceptance Criteria

The work is complete when:

- `main.ts` no longer owns the bulk of interactive TUI runtime behavior.
- TUI command metadata is centralized in `commandCatalog.ts`.
- Runtime, agent, output, image, and dispatcher behavior are in focused modules.
- Durable approval restore behavior is present and tested.
- Enhanced Ink suggestion, cursor, scrollback, and approval behavior is present
  and tested.
- Existing scrollback tests still pass.
- Ported sibling-level TUI tests pass in the current project.
- Provider regression tests for OpenAI schema, DeepSeek routing, and tool-name
  deduplication pass.
- `packages/xenesis` typecheck and build pass.
- No unrelated provider/package changes are overwritten.

## Approved Design Decisions

The user approved:

- Full TUI upgrade scope instead of minimal stabilization.
- Modular TUI architecture centered on `runtimeController`.
- Component boundaries listed in this spec.
- Slash command data flow and restored approval behavior.
- Test and verification strategy.
