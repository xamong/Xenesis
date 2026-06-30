# Meta Local Server Slice Design

## Priority

Order 2 in the non-package parity roadmap.

## Goal

Complete the local backend for the Meta Management UI already ported into this
repo. The slice adds durable local SQLite stores for Capability Registry
metadata, CR run history, meta validation, changelog, activity, summaries, and
read-only query support.

## Source Surface

Sibling files to evaluate and adapt:

- `server/crMetadataStore.js`
- `server/crMetadataStore.test.mjs`
- `server/metaManagementStore.js`
- `server/metaManagementStore.test.mjs`
- Relevant route sections in `server/index.js`:
  - `POST /api/cr/sync`
  - `GET /api/cr/capabilities`
  - `GET /api/cr/capabilities/:path`
  - `GET /api/cr/snapshots`
  - `GET /api/cr/runs`
  - `POST /api/cr/runs`
  - `GET /api/cr/runs/:runId`
  - `POST /api/cr/runs/:runId/events`
  - `POST /api/meta/validate`
  - `GET /api/meta/changelog`
  - `GET /api/meta/activity`
  - `GET /api/meta/summary`

Current repo files that must stay aligned:

- `src/shared/crMetadata.ts`
- `src/main/crMetadataBridge.ts`
- `src/renderer/extensions/xenesis-desk.data-tools/metaManagementProvider.ts`
- `src/renderer/extensions/xenesis-desk.data-tools/panes/MetaManagementPane.tsx`
- `server/index.js`

## Architecture

`crMetadataStore` owns CR snapshot and run persistence:

- `CR_REGISTRY_SNAPSHOT`
- `CR_CAPABILITY`
- `CR_CAPABILITY_SCHEMA`
- `CR_PAYLOAD`
- `CR_RUN`
- `CR_RUN_EVENT`

`metaManagementStore` owns Meta Management activity and validation:

- `META_CHANGELOG`
- `META_VALIDATION_RUN`

Both stores mirror useful rows into `TB_CODE_INFO_NEW` when appropriate so the
XMDB-style meta view can inspect CR capabilities and runs as metadata.

## Data Flow

1. Renderer or main CR bridge calls `xd.cr.metadata.sync`.
2. Main bridge posts the normalized registry payload to `/api/cr/sync`.
3. The server stores CR snapshots and updates CR capability mirror rows.
4. CR calls are recorded through `/api/cr/runs`.
5. Meta Management UI reads `/api/meta/summary`, `/api/meta/activity`, and CR
   list endpoints.
6. Batch saves and validation runs create changelog and validation records.

## Error Handling

- Invalid CR payloads fail with clear missing-key errors.
- Read-only SQL accepts only one SELECT or safe PRAGMA statement.
- Multi-statement, DDL, and write keywords are rejected even when embedded near
  comments or literals.
- Store initialization is idempotent and can migrate older local databases with
  missing columns.

## Tests

Focused tests:

- `node --test server/crMetadataStore.test.mjs`
- `node --test server/metaManagementStore.test.mjs`
- Existing CR metadata bridge tests.
- Existing Meta Management renderer tests.

Broader gates:

- `npm test`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- Electron smoke with a temporary local server and temporary `XENIS_HOME`.

## Non-Goals

- Do not change `packages/xenesis`.
- Do not switch the default public Meta API URL unless separately approved.
- Do not commit generated SQLite databases or CR payload files.
