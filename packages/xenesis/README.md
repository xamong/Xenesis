# Xenesis

Xenesis is the private internal sidecar runtime for Xenesis Desk. It is bundled and versioned with the Desk application from the root dependency `xenesis: file:packages/xenesis`.

It provides the agent pipeline, provider abstraction, approvals, sessions, memory, skills, plugins, MCP tools, background tasks, channel adapters, reports, and the managed gateway used by the Desk app.

Xenesis is not a separately versioned public npm package and is not operated as a separate end-user application in this repository.

## Important Runtime Rule

- Do not run `npm install` inside `packages/xenesis`.
- Do not ask users to start Xenesis by changing into `packages/xenesis`.
- For normal use, start Xenesis Desk and let the app run Xenesis in embedded mode.
- For Telegram, Slack, Discord, or gateway dashboard use cases, enable the Xenesis Desk-managed Xenesis gateway sidecar from the app settings.
- The packaged app includes Xenesis from the root dependency `xenesis: file:packages/xenesis` and bundles `node_modules/xenesis/**/*`.
- Treat `packages/xenesis` as part of the Xenesis Desk release boundary unless a future product decision explicitly publishes it as an independent runtime.

Development setup belongs at the Xenesis Desk root:

```powershell
cd D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk
npm install
npm run dev
```

## Xenesis Desk Integration

When Xenesis runs inside Xenesis Desk, it uses the built-in `xenis` workflow for Desk-aware orchestration. The workflow can call Xenesis Desk through embedded `desk_*` tools, including:

- Natural-language Desk control such as "open the current file", "dock this pane right", or "run Settings from the command palette"; the workflow translates intent into typed Desk tools or Capability Registry calls.
- `desk_xd_command` for literal `/xd ...` commands such as `/xd status`, `/xd run npm test`, and `/xd call xd.terminals.run {"command":"npm test"}`.
- `desk_capabilities` to list or describe Capability Registry paths.
- `desk_call_capability` to call registered `xd.*` capabilities while preserving Xenesis Desk approval rules.

## Runtime Shape

Inside Xenesis Desk, Xenesis runtime state is stored under the Xenesis Desk home directory:

```text
<XENIS_HOME>/xenesis
```

Runtime files include:

```text
profiles.json              Named provider, runtime, and channel profiles.
sessions/                  JSONL session event logs.
reports/                   Smoke, scenario, connect, and provider-live reports.
plans/latest.txt           Saved plan output.
memory.json                Workspace memory.
plugins.json               Installed plugin state.
agent_tasks.json           Durable task state.
chat_history               Interactive chat history.
```

The standalone default `$HOME/.xenesis` path is only a fallback for package-level tooling. Desk operation should use the Xenesis Desk-provided home path.

When the gateway sidecar is enabled by Xenesis Desk, the app injects the Desk bridge URL and token into the gateway process. Users should not manually start a gateway process for normal Desk operation.

## Internal CLI Notes

The package still contains a CLI and local gateway entrypoint because Xenesis Desk uses the same compiled runtime internally and because package-level smoke tests exercise these surfaces. Treat `npm run dev -- ...`, `node dist/cli/main.js ...`, and `xenesis ...` examples in development notes as maintainer-only commands, not as the product launch flow.

Use the Xenesis Desk root scripts for integration checks:

```powershell
npm run test:xenesis
npm run smoke:xenesis-desk
npm run smoke:xenesis-packaged
```

## Documentation

- [Usage Guide](docs/usage.md)
- [Configuration Guide](docs/configuration.md)
- [Channel Bots Guide (Korean)](docs/channel-bots.ko.md)
- [Remote Codex Bot Control (Korean)](docs/remote-codex-bot-control.ko.md)
- [Runtime Pipeline](docs/runtime-pipeline.md)
- [Plugin example](examples/plugins/text-tools/xenesis.plugin.json)
- [Skill example](examples/skills/project-reviewer/SKILL.md)
