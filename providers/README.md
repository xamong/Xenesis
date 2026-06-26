# Xenesis Desk Providers

This folder packages Xenesis Desk integration assets for local CLI agents and Hermes.

## Hermes Plugin Source Of Truth

Hermes plugin source lives under:

- `hermes/plugins/xenesis_desk_gateway`
- `hermes/plugins/platforms/xenesis_desk_bot`

The full Hermes checkout under `draft/hermes-agent-main` is a local development convenience, not the source package. Keep the provider plugins above as the source of truth, and link or sync the draft checkout from them.

Check provider plugins against the draft Hermes checkout:

```powershell
pwsh -NoProfile -File .\scripts\sync-hermes-plugins.ps1 -Check
```

Point the draft Hermes checkout at the provider plugin source using directory junctions:

```powershell
pwsh -NoProfile -File .\scripts\sync-hermes-plugins.ps1 -ToDraft -UseJunction
```

Copy provider plugins into the WSL Hermes checkout:

```powershell
pwsh -NoProfile -File .\scripts\sync-hermes-plugins.ps1 -ToWsl
```

Remove Python runtime caches from provider plugins:

```powershell
pwsh -NoProfile -File .\scripts\sync-hermes-plugins.ps1 -CleanCache -Check
```

## Skill Source Of Truth

Local CLI agents use generated skill files under:

- `claude/skills/xd/SKILL.md`
- `codex/skills/xd/SKILL.md`
- `cursor/skills/xd/SKILL.md`
- `devin/skills/xd/SKILL.md`
- `gemini/skills/xd/SKILL.md`
- `github-copilot/skills/xd/SKILL.md`
- `kimi/skills/xd/SKILL.md`
- `opencode/skills/xd/SKILL.md`
- `pi/skills/xd/SKILL.md`
- `qoder/skills/xd/SKILL.md`
- `qwen/skills/xd/SKILL.md`

Hermes is covered by plugin packages under `hermes/plugins`, not by generated
skills. This keeps Hermes integration on the plugin extension surface.

Do not edit those generated files as the primary source. Edit the shared template and provider overlays instead:

- `shared/skills/xd/SKILL.md.template`
- `shared/skills/xd/references/windows-wsl-hermes-gateway.md`
- `<provider>/skills/xd/provider.psd1`

Codex-only agent metadata remains in:

- `codex/skills/xd/agents/openai.yaml`

## Sync

Regenerate provider skills:

```powershell
pwsh -NoProfile -File .\scripts\sync-provider-skills.ps1
```

Check whether generated files are current:

```powershell
pwsh -NoProfile -File .\scripts\sync-provider-skills.ps1 -Check
```

Run the full skill/plugin coverage check:

```powershell
pwsh -NoProfile -File .\scripts\verify-xd-skill-sync.ps1
```

The verification script also compares generated skill providers with the Xenesis Desk
Settings local CLI registry (`src/main/localCliAgents.mjs`). If a new CLI is
added to Settings, add a matching `<provider>/skills/xd/provider.psd1` overlay
or explicitly cover it with a plugin surface like Hermes.
