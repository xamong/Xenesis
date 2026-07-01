# Meta Management Full Port Design

Date: 2026-06-30
Branch: mini

## Objective

Port the current Meta Management implementation from the sibling workspace:

`D:\CodeTruck\CodeBox\Xamong\06 XCON\xenesis-desk\src\renderer\extensions\xenesis-desk.data-tools`

into this repo by replacing the existing Meta Management internals, then adapting
the result to this repo's CR-first architecture, settings model, and verification
gates.

The selected approach is a full port: renderer Meta Management UI plus the
`xd.cr.metadata.*` Capability Registry metadata bridge required by the sibling
implementation.

## Current Context

This repo already has the data-tools extension registered:

- `extensions/xenesis-desk.data-tools`
- `src/renderer/extensions/xenesis-desk.data-tools`
- app menu entries for Meta Management, Query Analyzer, Query Analyzer OD, and
  SQLite Server Settings
- CR open paths such as `xd.tools.data.metaManagement.open`
- existing `xd.meta.*` bridge paths through `src/main/metaBridge.ts`

The sibling implementation is newer in the Meta Management surface. It adds or
depends on:

- XMDB Assist dialog actions: Form, Relations, Export, Import, Activity
- relation graph rendering through `@xcon-viewer/core` and
  `@xcon-viewer/viewer`
- validation warning modal before save
- meta summary and activity timeline
- CR metadata sync/read paths under `xd.cr.metadata.*`
- best-effort CR run capture into CR metadata storage

The sibling implementation also defaults `DEFAULT_META_API_URL` to
`http://localhost:3001`, while this repo defaults packaged builds to
`https://ai.xamong.com` and switches development settings to local server URLs
through the app settings flow. The port must preserve this repo's settings
policy.

## Goals

- Replace the existing Meta Management renderer internals with the sibling
  implementation.
- Keep Query Analyzer, Query Analyzer OD, SQLite Server Settings, plugin
  manifest, and renderer extension registration stable unless a narrow
  compatibility change is required.
- Add the CR metadata bridge and CR paths expected by the sibling UI:
  - `xd.cr.metadata.sync`
  - `xd.cr.metadata.capabilities`
  - `xd.cr.metadata.snapshots`
  - `xd.cr.metadata.runs`
- Preserve CR-first behavior:
  - external calls to `xd.cr.metadata.sync` require approval
  - CR metadata recording is best effort and must not break normal capability
    execution
  - secrets in CR run args/results are redacted before persistence
- Preserve this repo's `settings.apiUrl` behavior and packaged/development API
  URL policy.
- Add focused regression tests for new helper models and CR metadata dispatch.

## Non-Goals

- Do not redesign Query Analyzer or SQLite Server Settings.
- Do not change provider selection or agent reasoning behavior.
- Do not add natural-language routing heuristics.
- Do not make the remote meta API mandatory for app startup.
- Do not claim live provider behavior; this work is a renderer/CR/data-tool port.

## Architecture

### Renderer Meta Management

The renderer data-tools extension remains the owner of the Meta Management pane.
The port replaces the existing Meta Management pane and helper modules with the
sibling implementation, then adapts incompatible defaults.

Primary files to port or update:

- `metaManagementProvider.ts`
- `useMetaManagementGridSave.ts`
- `panes/MetaManagementPane.tsx`
- `panes/MetaManagementAssistPanel.tsx`
- `panes/MetaManagementRelationsView.tsx`
- `panes/MetaManagementStatusBar.tsx`
- `panes/MetaManagementTreeView.tsx`
- `styles.css`

New renderer/helper files:

- `metaManagementAssistPanelModel.ts`
- `metaManagementAssistPanelModel.test.ts`
- `metaManagementRelationGraph.ts`
- `metaManagementRelationGraph.test.ts`
- `metaManagementRelationTabs.ts`
- `metaManagementRelationTabs.test.ts`
- `panes/MetaManagementActivityView.tsx`
- `panes/MetaManagementRelationGraphView.tsx`
- `panes/MetaManagementValidationModal.tsx`

The existing shared XCON viewer CSS scoping helper is already present at
`src/renderer/extensions/xconViewerCssScope.ts`; the relation graph view should
reuse that helper rather than duplicate CSS scoping logic.

### API URL Policy

The sibling implementation's local default API URL must not overwrite this
repo's policy. `metaManagementProvider.ts` should keep this repo's default API
URL behavior, and `useMetaManagementProvider.ts` should continue to use
`window.terminalAPI.getSettings()` and `app-settings-changed`.

The saved `settings.apiUrl` remains the runtime source of truth. Development
mode can continue to use the local server URL via the existing settings
normalization in `src/main/index.ts`.

### CR Metadata Bridge

Add the sibling CR metadata helper and bridge:

- `src/shared/crMetadata.ts`
- `src/shared/crMetadata.test.ts`
- `src/main/crMetadataBridge.ts`
- `src/main/crMetadataBridge.test.ts`

Wire the bridge into the existing main-process desk bridge adapter:

- instantiate `createCrMetadataBridge`
- use the current settings-derived meta API URL
- expose adapter methods:
  - `syncCrMetadata`
  - `listCrMetadataCapabilities`
  - `listCrMetadataSnapshots`
  - `listCrMetadataRuns`
  - `recordCrRun`

Extend `src/shared/deskBridgeCapabilities.ts`:

- add adapter method types for CR metadata
- add `xd.cr.metadata` capability group and methods
- dispatch the CR metadata methods
- record CR run metadata after normal CR calls, excluding the
  `xd.cr.metadata.*` paths themselves

The run recording path must be best effort. Any CR metadata API failure is
swallowed after redaction and must not affect the original CR result.

### Renderer CR Sync Button

The sibling Meta Management tree view includes a CR metadata sync button. In
this repo it should call:

`deskBridge.call('xd.cr.metadata.sync', { reason: 'manual' }, { approved: true })`

The button is an internal renderer control. External callers still hit normal
CR approval policy when `approved` is absent.

### i18n

Add the sibling i18n keys required by the new UI, especially:

- `meta.syncCrMetadata`
- `meta.crMetadataSynced`
- `meta.crMetadataSyncFailed`

Only add keys referenced by the port. Do not churn unrelated i18n strings.

## Data Flow

1. User opens Meta Management through menu, command palette, or CR:
   `xd.tools.data.metaManagement.open`.
2. Renderer opens the existing `meta-management` content type.
3. Meta Management reads `settings.apiUrl` through `terminalAPI.getSettings`.
4. The pane loads tree/grid/query data through the configured meta API.
5. XMDB Assist builds local form, relation, export, import, and activity models
   from loaded Meta Management data.
6. Relation Graph converts local relation data to SKETCH and renders through the
   XCON viewer in Shadow DOM.
7. Save validates changed rows through `/api/meta/validate` before batch writes.
8. Warning-only validation opens the confirmation modal; errors block the save.
9. CR metadata sync calls `xd.cr.metadata.sync`, which snapshots the current CR
   inventory and posts it to `/api/cr/sync`.
10. Ordinary CR calls can be recorded through best-effort `recordCrRun`.

## Error Handling

- Meta API connection failures keep the pane usable and show status messages.
- Missing optional CR metadata API endpoints fail only the relevant sync/activity
  action, not app startup.
- Relation graph render failures show an inline graph error and keep the
  relations list available.
- Validation errors block save and report an error count.
- Validation warnings pause save until explicit confirmation.
- CR run metadata persistence failures are swallowed after best-effort attempt.

## Testing

Focused tests to add or port:

- `src/shared/crMetadata.test.ts`
- `src/main/crMetadataBridge.test.ts`
- a current-repo-specific `src/shared/crMetadataCapabilities.test.ts`
- `src/renderer/extensions/xenesis-desk.data-tools/metaManagementAssistPanelModel.test.ts`
- `src/renderer/extensions/xenesis-desk.data-tools/metaManagementRelationGraph.test.ts`
- `src/renderer/extensions/xenesis-desk.data-tools/metaManagementRelationTabs.test.ts`

Do not blindly copy sibling tests that cover unrelated sibling-only features.
For example, sibling `crMetadataCapabilities.test.ts` also asserts an App
Control Lab capability that is outside this port and should not be included.

Verification commands:

- focused node tests for new CR metadata and Meta Management helper tests
- `npm run typecheck`
- `npm test`
- `npm run docs:capabilities:audit`
- `npm run build`

Live smoke:

- launch Electron with a temporary user data dir
- call `xd.tools.data.metaManagement.open` through `mcpBridgeAPI.callCapability`
- wait for `meta-management` content and a stable Meta Management DOM marker
- call/read `xd.cr.metadata.capabilities` if the configured API supports it; if
  the external API is unavailable, record the exact unavailable result instead
  of claiming live CR metadata storage passed

## Risks And Mitigations

- Risk: sibling UI expects `xd.cr.metadata.*` but this repo lacks it.
  Mitigation: port CR metadata bridge and capability tests with the UI.
- Risk: changing default API URL breaks packaged behavior.
  Mitigation: preserve this repo's settings-derived API URL policy.
- Risk: relation graph introduces XCON viewer rendering regressions.
  Mitigation: reuse existing Shadow DOM CSS scoping helper and add helper tests.
- Risk: CR metadata capture leaks secrets.
  Mitigation: reuse redaction helpers and test secret-key redaction.
- Risk: CR metadata capture breaks normal CR calls.
  Mitigation: record runs best-effort only and test failure isolation.

## Implementation Boundaries

This is one implementation slice because the sibling Meta Management UI and CR
metadata bridge are coupled through the sync/activity/status surfaces. The slice
should still be implemented in phases:

1. Add RED tests for helper models and CR metadata paths.
2. Port shared/main CR metadata helpers and dispatch.
3. Replace/adapt Meta Management renderer files.
4. Add i18n/style support.
5. Regenerate CR audit docs.
6. Run focused, root, build, CR audit, and live smoke verification.

## Approval

User approved the full-port approach on 2026-06-30:

> existing local Meta Management should be removed, sibling Meta Management
> should be ported, and then adjusted to this repo.
