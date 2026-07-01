# Office Control Slice Design

## Priority

Order 4 in the non-package parity roadmap.

## Objective

Port the sibling Office Control surface into this repo as a CR-first Excel
automation slice, while keeping `packages/xenesis` completely untouched.

The slice connects the already packaged `tools/office-control-host` helper to
shared Office models, main-process services, settings, Capability Registry
paths, and focused verification.

## Current Repo Baseline

This repo already contains:

- `tools/office-control-host/Xenesis.OfficeControlHost.csproj`
- `tools/office-control-host/Program.cs`
- package scripts for `build:office-control-host` and Windows helper packaging
- electron-builder resources for `office-control-host`

This repo does not yet contain:

- `src/shared/officeControl.ts`
- `src/main/officeControl/*`
- `xd.office.*` Capability Registry paths
- `AppSettings.office`
- Settings UI for Office automation policy

The existing `scripts/nativeToolsPackaging.test.ts` currently asserts that
`src/main/officeControl` does not exist. This assertion becomes obsolete once
the slice connects the packaged helper to runtime code and must be replaced
with a positive wiring assertion.

## Source Surface

Adapt intent from the sibling project at:

- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\shared\officeControl.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\shared\officeControl.test.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\shared\officeCapabilities.test.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\officeControl\excelFileAdapter.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\officeControl\officeControlService.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\officeControl\windowsOfficeComAdapter.ts`
- `D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\main\officeControl\macosOfficeAppleEventsAdapter.ts`
- matching sibling tests under `src/main/officeControl/*.test.ts`

Port intent, not blind file copies. Fit the implementation to this repo's
current CR dispatcher, settings merge, SettingsPane, and public-release checks.

## Scope

### In Scope

- Excel-oriented Office actions only.
- File provider for `.xlsx` create, inspect, and bounded read operations.
- Windows COM provider through `tools/office-control-host`.
- macOS Apple Events provider through a JXA/osascript adapter.
- Settings-backed provider and safety policy.
- CR registration, approval metadata, dispatch, and audit coverage.
- Focused unit tests plus broad repo gates.
- Optional installed Office smoke when prerequisites are present.

### Out Of Scope

- Editing `packages/xenesis`.
- Word or PowerPoint editing.
- Persistent workbook sessions.
- Natural-language routing shortcuts outside the CR/provider runtime path.
- Visible Office automation unless explicitly enabled in settings.
- Building or committing generated helper binaries.

## Architecture

Office Control is exposed through the Capability Registry. The renderer,
Agent runtime, MCP bridge, and any future UI must call the same `xd.office.*`
paths instead of bypassing CR with shell commands or direct helper calls.

The shared model owns normalization and approval classification. The main
service owns settings enforcement and provider selection. Providers are
isolated:

- `file` provider uses `xlsx` for safe workbook creation, inspection, and reads.
- `windows-com` provider invokes `tools/office-control-host`.
- `macos-apple-events` provider invokes `/usr/bin/osascript` with JXA.

Installed-provider write/export actions are disabled by default unless settings
explicitly allow the relevant behavior. Missing helper binaries or missing
Office installations return structured `ok: false` results rather than throwing
through the CR boundary.

## Shared Model

Create `src/shared/officeControl.ts`.

Types:

- `OfficeDocumentType = 'excel' | 'word' | 'powerpoint'`
- `OfficeProviderId = 'file' | 'macos-apple-events' | 'windows-com'`
- `OfficeActionKind`
  - `status`
  - `excel.createWorkbook`
  - `excel.inspectWorkbook`
  - `excel.openWorkbook`
  - `excel.readRange`
  - `excel.writeRange`
  - `excel.saveWorkbook`
  - `excel.closeWorkbook`
  - `excel.exportPdf`
- `OfficeControlSettings`
- `OfficeAction`
- `OfficeProviderStatus`
- `OfficeActionResult`

Defaults:

- `enabled: true`
- `openAfterCreate: false`
- `allowPdfExport: false`
- `allowModifyExistingDocuments: false`
- `enableWindowsComProvider: true`
- `enableMacosAppleEventsProvider: true`
- `allowVisibleOfficeAutomation: false`
- `maxReadCells: 50000`
- `maxWriteCells: 50000`
- `defaultOutputDir: ''`

Normalization rules:

- Workbook-path actions require `path`.
- `readRange` requires `sheetName` and `range`.
- `writeRange` requires `sheetName`, `startCell`, and at least one row.
- `createWorkbook` requires at least one non-empty sheet.
- `exportPdf` requires `outputPath`.
- `provider` is accepted only when it is one of the known providers.
- `maxReadCells` and `maxWriteCells` are positive integers, otherwise default.
- Range and row-size validation must be deterministic and covered by tests.

## Settings

Add `office: OfficeControlSettings` to `AppSettings`.

Main settings handling must:

- initialize `SETTINGS_DEFAULT.office` with `normalizeOfficeSettings(undefined)`;
- normalize `saved.office` during settings load;
- merge persisted partial updates with current Office settings;
- normalize `updated.office` before saving;
- keep all existing settings behavior unchanged.

Settings UI should add a visible Office Control category near External Apps in
`src/shared/xenesisSettingsCatalog.mjs`.

SettingsPane should include:

- enable Office automation
- enable Windows COM provider
- enable macOS Apple Events provider
- allow modifying existing documents
- allow PDF export
- allow visible Office automation
- max read cells
- max write cells
- default output directory
- save button using the existing `saveUpdatedSettings` pattern

The UI is a policy surface, not a full Office workbench. Actual Office
operations stay on CR paths.

## Capability Registry Surface

Register:

- `xd.office`
- `xd.office.status`
- `xd.office.excel.createWorkbook`
- `xd.office.excel.inspectWorkbook`
- `xd.office.excel.openWorkbook`
- `xd.office.excel.readRange`
- `xd.office.excel.writeRange`
- `xd.office.excel.saveWorkbook`
- `xd.office.excel.closeWorkbook`
- `xd.office.excel.exportPdf`

Adapter interface:

- Add `runOfficeAction?: (path: string, args?: unknown) => Promise<unknown> | unknown`
  to `DeskBridgeCapabilityAdapter`.

Dispatch:

- Each static Office path explicitly calls `api.runOfficeAction(path, args)`.
- Do not use a generic `path.startsWith('xd.office.')` fallback.
- Unknown Office paths must not dispatch.

Approval metadata:

- `xd.office.status`: `permission: 'read'`, `approval: 'never'`
- `inspectWorkbook` and `readRange`: read paths, no approval for internal reads,
  bounded by normalization/settings limits
- `createWorkbook`: write path, `approval: 'when-external'`
- `openWorkbook`: write/control path, `approval: 'when-external'`
- `writeRange`: write path, `approval: 'when-external'`
- `saveWorkbook`: write path, `approval: 'always'`
- `closeWorkbook`: write/control path, `approval: 'always'`
- `exportPdf`: write/export path, `approval: 'always'`

Dynamic approval must be at least as strict as static metadata. Visible
automation, overwrite, existing-document writes, save, close, and export are
treated as high-risk behavior.

## Main Service

Create `src/main/officeControl/officeControlService.ts`.

Responsibilities:

- Normalize settings and action inputs.
- Return a structured disabled result when `settings.enabled === false`.
- Return provider status for `status`.
- Route `createWorkbook` to the file adapter.
- Route `inspectWorkbook` and `readRange` to the file adapter unless an
  installed provider is explicitly requested.
- Select installed provider by explicit `provider`, then platform:
  - `win32` -> `windows-com`
  - `darwin` -> `macos-apple-events`
  - otherwise -> `file`
- Enforce settings before installed-provider actions:
  - disabled provider returns `provider_unavailable`
  - visible automation blocked by `visible_automation_disabled`
  - existing document modification blocked by `modify_existing_disabled`
  - PDF export blocked by `pdf_export_disabled`
  - configured read/write cell limits return `range_too_large` or
    `write_too_large`
- Return structured failures instead of throwing.

Default service construction should work with no special test-only setup:

- file adapter defaults to `createExcelFileAdapter()`
- Windows adapter defaults to `createWindowsOfficeComAdapter({ platform })`
- macOS adapter defaults to `createMacosOfficeAppleEventsAdapter({ platform })`

## Provider Adapters

### Excel File Adapter

Create `src/main/officeControl/excelFileAdapter.ts`.

Use `xlsx` to:

- create workbooks from array-of-array sheet data;
- inspect sheet names, row counts, and column counts;
- read bounded ranges.

Rules:

- Do not overwrite an existing output path unless `overwrite === true`.
- Use a temporary output path when `outputPath` is absent.
- Sanitize sheet names to Excel's safe 31-character limit.
- Return structured `OfficeActionResult` values.

### Windows COM Adapter

Create `src/main/officeControl/windowsOfficeComAdapter.ts`.

Responsibilities:

- Resolve packaged host path under `process.resourcesPath/office-control-host`.
- Resolve development host candidates under `tools/office-control-host`.
- Spawn the helper with JSON stdin.
- Normalize success/failure JSON.
- Treat handled failure JSON from non-zero helper exit as a structured result.
- Map missing host to provider status unavailable and action code
  `host_not_found`.
- Map invalid JSON to `host_invalid_json`.
- Map timeout to `host_timeout`.

### macOS Apple Events Adapter

Create `src/main/officeControl/macosOfficeAppleEventsAdapter.ts`.

Responsibilities:

- Return unavailable status outside macOS without invoking automation.
- Use `/usr/bin/osascript -l JavaScript` for JXA on macOS.
- Normalize success/failure JSON.
- Map invalid JSON to `host_invalid_json`.
- Map Apple Events rejection or process errors to `apple_events_failed`.
- Keep unsupported platforms fail-closed.

## Main Wiring

In `src/main/index.ts`:

- import `normalizeOfficeSettings`;
- import `createOfficeControlService`;
- add `office` to defaults/load/merge/persist normalization;
- instantiate Office service in `createMcpBridgeCapabilityAdapter`;
- provide `runOfficeAction: (path, args) => officeControlService.run(path, args)`;
- keep existing App Control and Input Control wiring unchanged.

## Error Handling

Office operations must fail closed:

- invalid input returns a structured `ok: false` result at service/CR boundary
  when possible;
- helper missing or unavailable provider returns structured provider errors;
- helper invalid JSON or timeout returns deterministic codes;
- settings-denied actions do not call installed provider adapters;
- CR approval-required responses are produced before adapter dispatch for
  external callers.

No provider secret or local helper token exists in this slice. Paths and file
names may be included in action results because Office document operations are
path-oriented; future redaction can be added if document paths become sensitive
in a specific caller surface.

## Tests

Focused tests:

- `src/shared/officeControl.test.ts`
  - default settings
  - action normalization
  - range/write limits
  - approval classification
- `src/shared/officeCapabilities.test.ts`
  - CR registration
  - static approval metadata
  - dispatch to `runOfficeAction`
  - external approval blocks before dispatch
- `src/main/officeControl/excelFileAdapter.test.ts`
  - real `.xlsx` create, inspect, read range
  - overwrite protection
- `src/main/officeControl/officeControlService.test.ts`
  - disabled settings
  - provider status
  - explicit/platform provider routing
  - settings-denied installed writes/export/visible automation
  - configured read/write limits
- `src/main/officeControl/windowsOfficeComAdapter.test.ts`
  - packaged/dev host path resolution
  - host payload shape
  - missing host behavior
  - invalid JSON behavior
- `src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts`
  - unavailable outside macOS
  - JXA payload shape
  - invalid JSON behavior
  - Apple Events rejection behavior
- `scripts/nativeToolsPackaging.test.ts`
  - replace the old "officeControl absent" guard with a positive assertion that
    packaging scripts/resources remain present and runtime Office Control is
    wired to the helper/service.

Broad gates:

- `npm run typecheck`
- `npm test`
- `npm run docs:capabilities:audit`
- `npm run build`
- `npm run check:public-release`
- `git diff --name-only -- packages/xenesis`

Known lint condition:

- Full `npm run lint` currently fails on pre-existing repo-wide Biome
  diagnostics outside this slice. The implementation should run targeted Biome
  checks for changed Office files and record full-lint status honestly.

## Live Smoke

Required safe smoke:

- Call `xd.office.status` through a live Electron CR bridge and assert provider
  status includes `file`.

Optional installed Office smoke:

- Only run installed-provider smoke when prerequisites are present.
- On Windows, if the Office helper exists and Excel COM is available, run a
  read-only or file-backed action first.
- Avoid modifying existing user documents.
- Existing-document write/export smoke requires explicit settings/approval and
  a temporary workbook created for the test.

If Office is not installed or the helper has not been built, record the exact
structured status as an environment gap instead of treating it as a product
failure.

## Risks And Mitigations

- Risk: Office automation can modify user documents.
  - Mitigation: default settings block existing document modification, PDF
    export, and visible automation.
- Risk: CR callable paths drift from dispatcher coverage.
  - Mitigation: add CR tests and run `npm run docs:capabilities:audit`; report
    completion only if missing registered paths, missing dispatched coverage
    paths, and undispatched static callable methods are all 0.
- Risk: Helper binaries are not present in development.
  - Mitigation: adapters return structured unavailable results and tests use
    fake host runners.
- Risk: Settings UI saves partial unsafe values.
  - Mitigation: normalize on load, merge, and persist; use numeric clamps for
    read/write limits.
- Risk: Blindly copying sibling code misses current repo patterns.
  - Mitigation: follow existing App Control service/CR/settings patterns and
    keep patches scoped to Office Control.

## Acceptance Criteria

The slice is ready for PR update when:

- Office shared model, service, adapters, CR paths, settings, and SettingsPane
  policy UI are implemented.
- Focused Office tests pass.
- Root tests, typecheck, CR audit, build, and public-release check pass.
- CR audit counters remain zero.
- Live `xd.office.status` smoke proves CR dispatch reaches the Office service.
- `packages/xenesis` has no diff.
- `handoff.md` records commands, exact results, known gaps, and next step.
