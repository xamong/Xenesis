# Channel Command Surface Mini Design

Date: 2026-06-30

## Context

The source design at
`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\docs\superpowers\specs\2026-06-26-channel-command-surface-design.md`
defines a shared mobile command surface for Xenesis Gateway channels. The
current repo has the basic channel pipeline, inline action rendering, Telegram
callback handling, and terminal Remote Desk routing, but it is missing the
shared command surface and Telegram bottom command registration.

The backup `xenesis-desk` workspace already contains a broader implementation
of this idea. This repo should not blindly copy that layer because its current
`ChannelManager` has different queue persistence behavior and there are
unrelated local provider/runtime edits in the working tree. This design ports
only the command-surface slice selected by the user.

## Goals

- Add one shared channel command surface for Telegram, Slack, Discord, and
  webhook fallbacks.
- Register useful Telegram bottom menu commands.
- Preserve existing `/desk ...`, `/new`, `/status`, queue, attach, watch,
  events, and detach behavior.
- Add mobile aliases: `/desk`, `/terminals`, `/agents`, and `/detach`.
- Support Telegram group commands addressed to this bot, such as
  `/desk@XenesisBot terminals` and `/terminals@XenesisBot`.
- Ignore Telegram commands addressed to another bot.
- Wire Xenesis Agent remote Desk routing into Gateway channels so `/agents`
  reaches `xd.xenesis.agents.list`.

## Non-Goals

- Do not port the backup channel rate limiter, file session store, or `/stop`
  behavioral changes in this slice.
- Do not register Slack slash commands or Discord application commands.
- Do not change channel credential, allowlist, approval, bridge, or security
  policy.
- Do not alter provider/runtime code that is already dirty in the working tree.
- Do not add new user-facing package docs in this slice because
  `packages/xenesis/docs` is not present in this repo.

## Selected Approach

Use a selective port of the backup command-surface implementation.

This keeps the scope aligned with the source design while preserving this
repo's current channel manager structure. The implementation should add new
small modules and focused tests instead of replacing the whole channel layer.

## Architecture

Add `packages/xenesis/src/channels/commandSurface.ts` as the single source of
truth for channel command metadata:

- `defaultChannelCommandSurface`
- `normalizeChannelCommandText()`
- `buildDeskMenuMessage()`
- `buildChannelHelpMessage()`
- `telegramBotCommandsFromSurface()`

`ChannelManager` will normalize text immediately after trim and before command
routers or agent execution. It will handle `/help` and `/desk menu` directly as
`ChannelOutgoingMessage` responses. Other aliases normalize to canonical
`/desk ...` commands and continue through the existing command router
mechanism.

`TelegramAdapter` will resolve its bot username with `getMe` when needed,
register bottom commands with `setMyCommands`, and pass `botUsername` through
`ChannelMessage` so `ChannelManager` can normalize addressed commands.

`gateway/server.ts` will register both `RemoteDeskSessionManager` and
`RemoteDeskAgentSessionManager` for managed channels.

## Command Surface

The initial surface is intentionally small:

| Command | Purpose | Routing |
|---|---|---|
| `/help` | Show available channel commands | handled by `ChannelManager` |
| `/status` | Show session status | existing `ChannelManager` path |
| `/new` | Reset channel session | existing `ChannelManager` path |
| `/stop` | Reserved stop command | existing behavior remains unchanged |
| `/desk` | Open Desk mobile menu | normalized to `/desk menu` |
| `/terminals` | List Desk terminals | normalized to `/desk terminals` |
| `/agents` | List Xenesis Agents | normalized to `/desk agents` |
| `/detach` | Detach current Desk target | normalized to `/desk detach` |

Canonical commands remain `/desk ...`. Short commands exist for mobile entry
and Telegram BotCommand compatibility.

## Data Flow

1. A channel adapter receives an external message.
2. The adapter passes `ChannelMessage` to `ChannelManager`.
3. `ChannelManager` trims the text and calls `normalizeChannelCommandText()`.
4. `/help` and `/desk menu` are answered before agent execution.
5. Canonical `/desk ...` commands are offered to command routers.
6. If no command path handles the message, existing session and agent pipeline
   behavior continues unchanged.

For Telegram:

1. `start()` verifies `allowedChatIds`.
2. `getMe` resolves the bot username if not provided.
3. `setMyCommands` registers the shared command surface.
4. Polling starts even if `getMe` or `setMyCommands` fails.
5. Incoming `/command@Bot` messages are accepted only when they target the
   current bot. Commands for other bots are ignored.

## Error Handling

- `setMyCommands` failures are logged and non-fatal.
- `getMe` failures are logged and non-fatal.
- If the Telegram username is unknown, addressed commands are treated
  conservatively so commands for another bot are not executed.
- Alias normalization only applies to slash command tokens. Natural-language
  prompts are not rewritten.
- Existing `/desk ...` commands keep precedence because aliases normalize into
  the same router path.

## Testing

Add focused `packages/xenesis` tests:

- `tests/channels/commandSurface.test.ts`
  - default command order
  - alias normalization
  - Telegram bot mention normalization
  - Desk menu text and actions
  - Telegram BotCommand payload

- `tests/channels/manager.test.ts`
  - `/help`, `/desk`, and `/desk menu` are handled before the agent pipeline
  - `/terminals`, `/agents`, and `/detach` route as canonical `/desk ...`
  - ordinary natural language still reaches `runPrompt`

- `tests/channels/telegram.test.ts`
  - `start()` calls `getMe` and `setMyCommands`
  - `setMyCommands` failure does not prevent polling
  - commands addressed to another bot are ignored
  - inline keyboard send behavior remains intact

- Gateway-focused coverage
  - Telegram `/desk` returns the Desk menu with inline actions
  - Telegram `/terminals` reaches the terminal router
  - Telegram `/agents` reaches `xd.xenesis.agents.list`

Verification commands:

- `npm --prefix packages/xenesis test -- tests/channels/commandSurface.test.ts tests/channels/manager.test.ts tests/channels/telegram.test.ts`
- Gateway focused test command selected after inspecting the existing
  `tests/gateway` structure.
- `npm --prefix packages/xenesis run typecheck`
- `npm --prefix packages/xenesis test`

## Rollout

1. Add command surface module and tests.
2. Wire `ChannelManager` normalization and direct `/help` plus `/desk menu`
   responses.
3. Add Telegram username resolution, addressed-command filtering, and
   best-effort BotCommand registration.
4. Wire `RemoteDeskAgentSessionManager` into Gateway managed channels.
5. Add Gateway coverage for `/desk`, `/terminals`, and `/agents`.
6. Run focused tests, package typecheck, and package test suite.

## Acceptance Criteria

- Telegram registers bottom menu entries for the shared command surface.
- `/desk` returns a mobile Desk menu with inline actions on button-capable
  channels and text fallback elsewhere.
- `/terminals` returns the same terminal list behavior as `/desk terminals`.
- `/agents` routes to the Xenesis Agent remote Desk list path.
- Telegram `/command@ThisBot` works and `/command@OtherBot` is ignored.
- Existing `/desk ...`, `/new`, `/status`, terminal attach/watch/events/detach,
  and channel agent fallback behavior are preserved.
