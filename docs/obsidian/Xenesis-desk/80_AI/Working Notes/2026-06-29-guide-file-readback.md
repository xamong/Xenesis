# Guide File Readback Batch

## Objective

Make guide catalog status prove whether each repo-local guide file resolves and
exists, instead of exposing only a `guidePath` string.

## Why

The OpenClaw/Hermes work treats guides as first-class Desk surfaces. If
`xd.xenesis.guides.status` can route to a guide card but cannot report whether
the repo-local file is present, an agent can overclaim documentation coverage.

## Implemented

- Added `guideFile` metadata to guide `XenesisConnectionItem` values.
- `guideFile.status` is one of:
  - `available`
  - `missing`
  - `unresolved`
- Added optional `guideFileExists` injection to
  `buildXenesisConnectionsStatus` so shared code stays filesystem-free.
- Main-process status building passes `fs.existsSync` so live Desk CR status is
  based on actual guide files.
- `xd.xenesis.guides.status` includes `guideFile`.
- Guide diagnostic runbooks include guide-file diagnostics and safety
  boundaries.
- Settings renders guide file readiness, open path, readback, controls, and
  diagnostics.
- `docs/manual/09-onboarding-connections.md` documents the readback.

## Verification

- RED:
  `npx tsx --test src\shared\xenesisConnections.test.ts` failed 39/41 because
  guide items did not expose `guideFile`.
- RED:
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` failed
  52/53 because `formatXenesisGuideFileSummary` did not exist.
- GREEN:
  `npx tsx --test src\shared\xenesisConnections.test.ts` passed 41/41.
- GREEN:
  `npx tsx --test src\renderer\panes\xenesisConnectionCenter.test.ts` passed
  53/53.
- `npx tsx --test src\shared\xenesisConnectionCapabilities.test.ts` passed
  40/40.
- `npm run typecheck` passed.
- `npm run docs:capabilities:audit` passed and wrote
  `docs/capability-registry-audit.md` with 779 nodes and 689 coverage path
  references.
- CR audit gap scan reported:
  - Missing registered paths: 0
  - Missing dispatched coverage paths: 0
  - Undispatched static callable methods: 0
  - Dispatcher paths missing from tree: 0
- `npm run smoke:xenesis:natural-desk-routing` passed 186/186.
- Changed-file Biome check with `--linter-enabled=false` checked 9 files with
  no fixes applied.
- `git diff --check` passed with line-ending warnings only.
- `npm run lint` is still blocked repo-wide by existing Biome diagnostics
  outside this slice: 965 files checked, 1150 errors, 419 warnings, 92 infos.

## Safety

- Guide-file readback does not read manual file contents.
- Missing files do not trigger filesystem writes or generated docs.
- Opening still stays on existing `xd.xenesis.guides.open` and `xd.files.open`
  paths.
