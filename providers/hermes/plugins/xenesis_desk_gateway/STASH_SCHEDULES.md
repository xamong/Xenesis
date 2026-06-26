# Xenesis Desk Stash Schedules

This note covers the Xenesis Desk stash schedule commands exposed by the
`xenesis_desk_gateway` Hermes plugin. These commands do not require Hermes core
changes. Scheduled restores are stored as Hermes cron jobs with `no_agent=True`
and a generated script under `HERMES_HOME/scripts`.

## Commands

```text
/xd stash schedule <#N|stash-name> <cron|interval> [deliver=local|origin|platform[:target]]
/xd stash schedules
/xd stash health [digest|schedule <cron|interval> [deliver=...]]
/xd stash preset [list|add <name> <deliver>|remove <name>]
/xd stash template [list|add <name> <cron|interval> [deliver=...]|remove <name>]
/xd stash pause <#N|job-id|stash-name>
/xd stash resume <#N|job-id|stash-name>
/xd stash trigger <#N|job-id|stash-name>
/xd stash runs <#N|job-id|stash-name> [limit=N]
/xd stash repair [dry-run|apply]
/xd stash retention [dry-run|apply] [run-days=N] [failed-days=N]
/xd stash unschedule <#N|job-id|stash-name> [dry-run|apply]
```

## Examples

```text
/xd stash schedule #1 every=6h
/xd stash schedule "release set" 0 9 * * * deliver=telegram
/xd stash preset add ops telegram:ops-room
/xd stash template add nightly every=1d deliver=ops
/xd stash schedule "release set" template=nightly
/xd stash schedules
/xd stash health
/xd stash health schedule every=1d deliver=ops
/xd stash pause #1
/xd stash resume #1
/xd stash trigger #1
/xd stash runs #1 limit=3
/xd stash repair
/xd stash repair apply
/xd stash retention apply run-days=30 failed-days=90
/xd stash unschedule #1 apply
```

## Operations

- `schedule` creates a plugin tracking record, a Hermes cron job, and a generated
  no-agent Python script.
- `schedules` joins plugin tracking records with live Hermes cron state and
  reports missing cron jobs or scripts.
- `health` summarizes all stash schedules as `OK`, `WARN`, or `ERROR`.
- `health schedule` creates a periodic no-agent health digest cron job.
- `preset` stores reusable delivery targets.
- `template` stores reusable schedule policies with optional delivery.
- `pause`, `resume`, and `trigger` call the existing Hermes cron APIs and then
  sync the plugin tracking state.
- `runs` reads saved Hermes cron output files from
  `HERMES_HOME/cron/output/<job-id>`.
- `repair apply` recreates missing generated scripts and missing Hermes cron jobs
  from the plugin tracking record.
- `retention apply` removes old successful run outputs while keeping failed run
  outputs for a longer window.
- `unschedule apply` removes the plugin tracking record, the Hermes cron job, and
  the generated script.

## Checks

After changing schedule behavior, verify:

```text
python -m pytest tests/plugins/test_xenesis_desk_gateway_plugin.py -q
python -m pytest tests/plugins/test_xenesis_desk_gateway_e2e_bot.py -q
python -m py_compile plugins/xenesis_desk_gateway/__init__.py
```
