# Office Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add CR-first Excel Office Control with file-backed workbook operations, installed Office adapters, settings policy, and verification while leaving `packages/xenesis` untouched.

**Architecture:** The shared Office model normalizes action/settings input and approval risk. The Capability Registry exposes explicit `xd.office.*` paths and dispatches through one main-process Office service. The service routes safe file-backed Excel operations through `xlsx`, and installed Office operations through Windows COM or macOS Apple Events adapters guarded by settings.

**Tech Stack:** TypeScript, Electron main/renderer, Node `node:test`, `xlsx`, Capability Registry, Windows .NET Office helper, macOS JXA/osascript.

---

## File Structure

- Create: `src/shared/officeControl.ts`
  - Owns Office settings, action/result types, input normalization, range/cell counting, and approval classification.
- Create: `src/shared/officeControl.test.ts`
  - Verifies shared defaults, action normalization, invalid inputs, limits, and approval levels.
- Create: `src/shared/officeCapabilities.test.ts`
  - Verifies CR registration, static approval metadata, dispatch, and external approval blocking.
- Modify: `src/shared/deskBridgeCapabilities.ts`
  - Adds `runOfficeAction` adapter seam, Office capability nodes, approval metadata, and explicit dispatch branches.
- Create: `src/main/officeControl/excelFileAdapter.ts`
  - Uses `xlsx` to create, inspect, and read `.xlsx` workbooks without installed Office.
- Create: `src/main/officeControl/excelFileAdapter.test.ts`
  - Creates a temporary workbook, inspects it, reads a range, and verifies overwrite protection.
- Create: `src/main/officeControl/windowsOfficeComAdapter.ts`
  - Resolves and calls `tools/office-control-host`, normalizes JSON responses, and fails closed.
- Create: `src/main/officeControl/windowsOfficeComAdapter.test.ts`
  - Verifies host path resolution, payload shape, missing host behavior, and invalid JSON behavior.
- Create: `src/main/officeControl/macosOfficeAppleEventsAdapter.ts`
  - Uses JXA via `/usr/bin/osascript` on macOS and reports unavailable elsewhere.
- Create: `src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts`
  - Verifies platform gating, payload shape, invalid JSON, and Apple Events rejection mapping.
- Create: `src/main/officeControl/officeControlService.ts`
  - Enforces settings and routes actions to file, Windows COM, or macOS Apple Events providers.
- Create: `src/main/officeControl/officeControlService.test.ts`
  - Verifies disabled settings, provider status, routing, settings-denied actions, and cell limits.
- Modify: `src/shared/types.ts`
  - Adds `OfficeControlSettings` import and `AppSettings.office`.
- Modify: `src/main/index.ts`
  - Adds Office settings defaults/load/merge/persist normalization and CR adapter wiring.
- Modify: `src/shared/xenesisSettingsCatalog.mjs`
  - Adds visible `office-control` settings category near External Apps.
- Modify: `src/renderer/panes/SettingsPane.tsx`
  - Adds Office policy settings state, save handler, and UI section.
- Modify: `src/renderer/i18n/en.ts`
  - Adds Office settings labels.
- Modify: `src/renderer/i18n/ko.ts`
  - Adds Korean Office settings labels.
- Modify: `scripts/nativeToolsPackaging.test.ts`
  - Replaces the old "officeControl absent" assertion with positive runtime wiring checks.
- Modify: `docs/capability-registry-audit.md`
  - Updated by `npm run docs:capabilities:audit`.
- Modify: `handoff.md`
  - Records implementation decisions, commands, verification results, and known gaps.

## Task 1: Shared Office Model

**Files:**
- Create: `src/shared/officeControl.test.ts`
- Create: `src/shared/officeControl.ts`
- Modify: `handoff.md`

- [ ] **Step 1: Write the failing shared model tests**

Create `src/shared/officeControl.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyOfficeApproval, normalizeOfficeAction, normalizeOfficeSettings } from './officeControl';

test('office settings are enabled by default with guarded installed automation', () => {
  assert.deepEqual(normalizeOfficeSettings(undefined), {
    enabled: true,
    allowModifyExistingDocuments: false,
    allowVisibleOfficeAutomation: false,
    allowPdfExport: false,
    enableMacosAppleEventsProvider: true,
    enableWindowsComProvider: true,
    openAfterCreate: false,
    maxReadCells: 50000,
    maxWriteCells: 50000,
    defaultOutputDir: '',
  });
});

test('normalizes Excel create workbook action', () => {
  const action = normalizeOfficeAction('xd.office.excel.createWorkbook', {
    sheets: [{ name: 'Summary', rows: [['Month', 'Revenue'], ['Jan', 1200]] }],
  });

  assert.equal(action.kind, 'excel.createWorkbook');
  assert.equal(action.documentType, 'excel');
  assert.equal(action.sheets.length, 1);
  assert.equal(action.sheets[0]?.name, 'Summary');
});

test('normalizes Excel read range action with bounded range', () => {
  const action = normalizeOfficeAction('xd.office.excel.readRange', {
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    range: 'A1:D20',
  });

  assert.equal(action.kind, 'excel.readRange');
  assert.equal(action.path, 'C:/work/report.xlsx');
  assert.equal(action.sheetName, 'Summary');
  assert.equal(action.range, 'A1:D20');
});

test('normalizes installed Excel provider actions for Windows and macOS', () => {
  const open = normalizeOfficeAction('xd.office.excel.openWorkbook', {
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    visible: true,
    readOnly: true,
    reuseExisting: true,
  });
  assert.equal(open.kind, 'excel.openWorkbook');
  assert.equal(open.provider, 'macos-apple-events');
  assert.equal(open.visible, true);
  assert.equal(open.readOnly, true);
  assert.equal(open.reuseExisting, true);

  const write = normalizeOfficeAction('xd.office.excel.writeRange', {
    provider: 'windows-com',
    path: 'C:/work/report.xlsx',
    sheetName: 'Summary',
    startCell: 'B2',
    rows: [
      ['Month', 'Revenue'],
      ['Jan', 1200],
    ],
    save: true,
  });
  assert.equal(write.kind, 'excel.writeRange');
  assert.equal(write.provider, 'windows-com');
  assert.equal(write.startCell, 'B2');
  assert.equal(write.save, true);
  assert.equal(write.rows.length, 2);

  const saved = normalizeOfficeAction('xd.office.excel.saveWorkbook', {
    provider: 'windows-com',
    path: 'C:/work/report.xlsx',
    saveAsPath: 'C:/work/report-copy.xlsx',
  });
  assert.equal(saved.kind, 'excel.saveWorkbook');
  assert.equal(saved.saveAsPath, 'C:/work/report-copy.xlsx');

  const exported = normalizeOfficeAction('xd.office.excel.exportPdf', {
    provider: 'macos-apple-events',
    path: '/Users/me/report.xlsx',
    outputPath: '/Users/me/report.pdf',
  });
  assert.equal(exported.kind, 'excel.exportPdf');
  assert.equal(exported.outputPath, '/Users/me/report.pdf');
});

test('rejects invalid installed Excel provider action inputs', () => {
  assert.throws(() => normalizeOfficeAction('xd.office.excel.openWorkbook', {}), /Office action requires path/);
  assert.throws(
    () =>
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/report.xlsx',
        sheetName: 'Summary',
        rows: [['A']],
      }),
    /Office writeRange requires startCell/,
  );
  assert.throws(
    () =>
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/report.xlsx',
        sheetName: 'Summary',
        startCell: 'A1',
      }),
    /Office writeRange requires rows/,
  );
  assert.throws(
    () =>
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/report.xlsx',
        sheetName: 'Summary',
        startCell: 'A1',
        rows: Array.from({ length: 501 }, () => Array.from({ length: 100 }, () => 'x')),
      }),
    /Office writeRange exceeds maxWriteCells/,
  );
  assert.throws(
    () => normalizeOfficeAction('xd.office.excel.exportPdf', { path: 'C:/work/report.xlsx' }),
    /Office exportPdf requires outputPath/,
  );
});

test('rejects missing workbook path for inspect and read', () => {
  assert.throws(() => normalizeOfficeAction('xd.office.excel.inspectWorkbook', {}), /Office action requires path/);
  assert.throws(
    () => normalizeOfficeAction('xd.office.excel.readRange', { sheetName: 'Sheet1', range: 'A1:A2' }),
    /Office action requires path/,
  );
});

test('classifies Office approval levels', () => {
  assert.equal(classifyOfficeApproval(normalizeOfficeAction('xd.office.status', {})), 'low');
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.createWorkbook', {
        sheets: [{ name: 'Summary', rows: [['A']] }],
      }),
    ),
    'medium',
  );
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.createWorkbook', {
        outputPath: 'C:/work/existing.xlsx',
        overwrite: true,
        sheets: [{ name: 'Summary', rows: [['A']] }],
      }),
    ),
    'high',
  );
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.writeRange', {
        path: 'C:/work/existing.xlsx',
        sheetName: 'Summary',
        startCell: 'A1',
        rows: [['A']],
      }),
    ),
    'high',
  );
  assert.equal(
    classifyOfficeApproval(
      normalizeOfficeAction('xd.office.excel.exportPdf', {
        path: 'C:/work/existing.xlsx',
        outputPath: 'C:/work/existing.pdf',
      }),
    ),
    'high',
  );
});
```

- [ ] **Step 2: Run the shared model test and verify RED**

Run:

```powershell
node --import tsx --test src/shared/officeControl.test.ts
```

Expected: FAIL because `src/shared/officeControl.ts` does not exist.

- [ ] **Step 3: Create the shared Office model**

Create `src/shared/officeControl.ts` using the sibling model as the source shape, with these required exports:

```ts
export type OfficeDocumentType = 'excel' | 'word' | 'powerpoint';
export type OfficeProviderId = 'file' | 'macos-apple-events' | 'windows-com';
export type OfficeActionKind =
  | 'status'
  | 'excel.createWorkbook'
  | 'excel.inspectWorkbook'
  | 'excel.openWorkbook'
  | 'excel.readRange'
  | 'excel.writeRange'
  | 'excel.saveWorkbook'
  | 'excel.closeWorkbook'
  | 'excel.exportPdf';
export type OfficeApprovalLevel = 'low' | 'medium' | 'high';

export const DEFAULT_OFFICE_MAX_READ_CELLS = 50_000;
export const DEFAULT_OFFICE_MAX_WRITE_CELLS = 50_000;
```

Implement these functions exactly by behavior:

```ts
export function normalizeOfficeSettings(raw: Partial<OfficeControlSettings> | undefined): OfficeControlSettings;
export function normalizeOfficeAction(path: string, raw: unknown): OfficeAction;
export function classifyOfficeApproval(action: OfficeAction): OfficeApprovalLevel;
```

Implementation requirements:

- `normalizeOfficeSettings(undefined)` must match the first test object exactly.
- `officeKindFromPath()` must accept only the registered `xd.office.*` paths.
- `normalizeOfficeAction()` must throw for unknown paths.
- `countRangeCells('A1:C2')` must return `6`.
- `normalizeSheets()` must coerce scalar row values to one-cell rows.
- `normalizeRows()` must coerce scalar row values to one-cell rows.
- `classifyOfficeApproval()` must return:
  - `low` for `status`;
  - `high` for `writeRange`, `saveWorkbook`, `closeWorkbook`, `exportPdf`, `visible`, `overwrite`;
  - `high` for path-targeted actions except `inspectWorkbook` and `readRange`;
  - `medium` for all other valid Office actions.

- [ ] **Step 4: Run the shared model test and verify GREEN**

Run:

```powershell
node --import tsx --test src/shared/officeControl.test.ts
```

Expected: PASS with 7/7 tests.

- [ ] **Step 5: Update handoff**

Append a short Office Control Task 1 entry to `handoff.md` with the RED and GREEN command outputs and the fact that no `packages/xenesis` files were touched.

## Task 2: Capability Registry Office Surface

**Files:**
- Create: `src/shared/officeCapabilities.test.ts`
- Modify: `src/shared/deskBridgeCapabilities.ts`
- Modify: `docs/capability-registry-audit.md` when the audit command runs
- Modify: `handoff.md`

- [ ] **Step 1: Write the failing CR registration and dispatch tests**

Create `src/shared/officeCapabilities.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callDeskBridgeCapability,
  findDeskBridgeCapability,
  listDeskBridgeCapabilities,
  type DeskBridgeCapabilityAdapter,
} from './deskBridgeCapabilities';

test('office capabilities are registered with approval metadata', () => {
  const paths = new Set(listDeskBridgeCapabilities().map((node) => node.path));
  for (const path of [
    'xd.office',
    'xd.office.status',
    'xd.office.excel.createWorkbook',
    'xd.office.excel.inspectWorkbook',
    'xd.office.excel.openWorkbook',
    'xd.office.excel.readRange',
    'xd.office.excel.writeRange',
    'xd.office.excel.saveWorkbook',
    'xd.office.excel.closeWorkbook',
    'xd.office.excel.exportPdf',
  ]) {
    assert.equal(paths.has(path), true, `${path} should be registered`);
  }

  assert.equal(findDeskBridgeCapability('xd.office.status')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.office.status')?.approval, 'never');
  assert.equal(findDeskBridgeCapability('xd.office.excel.createWorkbook')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.office.excel.createWorkbook')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.office.excel.readRange')?.permission, 'read');
  assert.equal(findDeskBridgeCapability('xd.office.excel.writeRange')?.permission, 'write');
  assert.equal(findDeskBridgeCapability('xd.office.excel.writeRange')?.approval, 'when-external');
  assert.equal(findDeskBridgeCapability('xd.office.excel.saveWorkbook')?.approval, 'always');
  assert.equal(findDeskBridgeCapability('xd.office.excel.exportPdf')?.approval, 'always');
});

test('office capabilities dispatch normalized actions to the adapter', async () => {
  const calls: unknown[] = [];
  const api: DeskBridgeCapabilityAdapter = {
    runOfficeAction: (path, args) => {
      calls.push({ path, args });
      return { ok: true, action: path, message: 'ok' };
    },
  };

  const blocked = await callDeskBridgeCapability(api, {
    path: 'xd.office.excel.createWorkbook',
    args: { sheets: [{ name: 'Summary', rows: [['A']] }] },
    source: 'xenesis',
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.approvalRequired, true);
  assert.equal(calls.length, 0);

  const created = await callDeskBridgeCapability(api, {
    path: 'xd.office.excel.createWorkbook',
    args: { sheets: [{ name: 'Summary', rows: [['A']] }] },
    source: 'xenesis',
    approved: true,
  });
  assert.equal(created.ok, true);
  assert.equal(calls.length, 1);
  assert.equal((calls[0] as { path: string }).path, 'xd.office.excel.createWorkbook');

  const status = await callDeskBridgeCapability(api, {
    path: 'xd.office.status',
    source: 'xenesis',
  });
  assert.equal(status.ok, true);
  assert.equal(calls.length, 2);

  const exportBlocked = await callDeskBridgeCapability(api, {
    path: 'xd.office.excel.exportPdf',
    args: { path: 'C:/work/report.xlsx', outputPath: 'C:/work/report.pdf' },
    source: 'xenesis',
  });
  assert.equal(exportBlocked.ok, false);
  assert.equal(exportBlocked.approvalRequired, true);
});
```

- [ ] **Step 2: Run CR tests and verify RED**

Run:

```powershell
node --import tsx --test src/shared/officeControl.test.ts src/shared/officeCapabilities.test.ts
```

Expected: FAIL because `xd.office.*` paths and `runOfficeAction` are not registered.

- [ ] **Step 3: Add the adapter seam**

In `src/shared/deskBridgeCapabilities.ts`, extend `DeskBridgeCapabilityAdapter` near the existing `runExternalAppAction` field:

```ts
runOfficeAction?: (path: string, args?: unknown) => Promise<unknown> | unknown;
```

- [ ] **Step 4: Register Office nodes**

Add static nodes near other root-level `xd.*` capability groups:

```ts
{
  path: 'xd.office',
  title: 'Office Control',
  description: 'Inspect and automate Office documents through governed providers.',
  type: 'namespace',
  permission: 'read',
  approval: 'never',
}
```

Add method nodes for the exact paths from the test. Use:

- `permission: 'read'`, `approval: 'never'` for `xd.office.status`.
- `permission: 'read'`, `approval: 'never'` for `inspectWorkbook`.
- `permission: 'read'`, `approval: 'never'` for `readRange`.
- `permission: 'write'`, `approval: 'when-external'` for `createWorkbook`, `openWorkbook`, and `writeRange`.
- `permission: 'write'`, `approval: 'always'` for `saveWorkbook`, `closeWorkbook`, and `exportPdf`.

Schemas must include only the arguments accepted by `normalizeOfficeAction`:

```ts
{
  type: 'object',
  additionalProperties: false,
  properties: {
    provider: { type: 'string', enum: ['file', 'windows-com', 'macos-apple-events'] },
    path: { type: 'string' },
    outputPath: { type: 'string' },
    overwrite: { type: 'boolean' },
    openAfterCreate: { type: 'boolean' },
    visible: { type: 'boolean' },
    readOnly: { type: 'boolean' },
    reuseExisting: { type: 'boolean' },
    save: { type: 'boolean' },
    sheets: { type: 'array' },
    sheetName: { type: 'string' },
    range: { type: 'string' },
    startCell: { type: 'string' },
    rows: { type: 'array' },
    saveAsPath: { type: 'string' }
  }
}
```

- [ ] **Step 5: Add explicit dispatch branches**

In `callDeskBridgeCapability()`, add explicit path branches:

```ts
if (path === 'xd.office.status') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.createWorkbook') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.inspectWorkbook') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.openWorkbook') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.readRange') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.writeRange') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.saveWorkbook') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.closeWorkbook') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
if (path === 'xd.office.excel.exportPdf') {
  return callAdapter(path, api?.runOfficeAction, path, args);
}
```

If the local `callAdapter()` helper accepts only one payload argument, wrap the Office dispatch in a small local helper:

```ts
function callOfficeAdapter(path: string, api: DeskBridgeCapabilityAdapter | undefined, args: unknown) {
  if (!api?.runOfficeAction) return capabilityAdapterMissing(path);
  return api.runOfficeAction(path, args);
}
```

Use whichever shape matches the actual helper signature in this repo.

- [ ] **Step 6: Run CR focused tests and verify GREEN**

Run:

```powershell
node --import tsx --test src/shared/officeControl.test.ts src/shared/officeCapabilities.test.ts
```

Expected: PASS.

- [ ] **Step 7: Run CR audit**

Run:

```powershell
npm run docs:capabilities:audit
```

Expected: PASS with missing registered paths 0, missing dispatched coverage paths 0, and undispatched static callable methods 0. The exact node/reference counts may increase.

- [ ] **Step 8: Update handoff**

Record focused tests and CR audit result in `handoff.md`.

## Task 3: Excel File Provider

**Files:**
- Create: `src/main/officeControl/excelFileAdapter.test.ts`
- Create: `src/main/officeControl/excelFileAdapter.ts`
- Modify: `handoff.md`

- [ ] **Step 1: Write the failing Excel file adapter tests**

Create `src/main/officeControl/excelFileAdapter.test.ts`:

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createExcelFileAdapter } from './excelFileAdapter';

test('Excel file adapter creates, inspects, and reads a workbook', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xenesis-office-'));
  const outputPath = path.join(dir, 'sales.xlsx');
  const adapter = createExcelFileAdapter();

  const created = await adapter.createWorkbook({
    kind: 'excel.createWorkbook',
    documentType: 'excel',
    outputPath,
    sheets: [{ name: 'Summary', rows: [['Month', 'Revenue'], ['Jan', 1200], ['Feb', 1800]] }],
    rows: [],
  });

  assert.equal(created.ok, true);
  assert.equal(created.path, outputPath);

  const inspected = await adapter.inspectWorkbook({
    kind: 'excel.inspectWorkbook',
    documentType: 'excel',
    path: outputPath,
    sheets: [],
    rows: [],
  });

  assert.equal(inspected.ok, true);
  assert.deepEqual(inspected.sheets?.[0], { name: 'Summary', rowCount: 3, columnCount: 2 });

  const range = await adapter.readRange({
    kind: 'excel.readRange',
    documentType: 'excel',
    path: outputPath,
    sheetName: 'Summary',
    range: 'A1:B2',
    sheets: [],
    rows: [],
  });

  assert.equal(range.ok, true);
  assert.deepEqual(range.rows, [['Month', 'Revenue'], ['Jan', 1200]]);
});

test('Excel file adapter blocks overwrite unless overwrite is true', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xenesis-office-'));
  const outputPath = path.join(dir, 'exists.xlsx');
  await fs.writeFile(outputPath, 'existing');
  const adapter = createExcelFileAdapter();

  const result = await adapter.createWorkbook({
    kind: 'excel.createWorkbook',
    documentType: 'excel',
    outputPath,
    overwrite: false,
    sheets: [{ name: 'Summary', rows: [['A']] }],
    rows: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'overwrite_required');
});
```

- [ ] **Step 2: Run file adapter tests and verify RED**

Run:

```powershell
node --import tsx --test src/main/officeControl/excelFileAdapter.test.ts
```

Expected: FAIL because `excelFileAdapter.ts` does not exist.

- [ ] **Step 3: Implement `createExcelFileAdapter()`**

Create `src/main/officeControl/excelFileAdapter.ts` with:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as XLSX from 'xlsx';
import type { OfficeAction, OfficeActionResult } from '../../shared/officeControl';

export interface ExcelFileAdapter {
  createWorkbook(action: OfficeAction): Promise<OfficeActionResult>;
  inspectWorkbook(action: OfficeAction): Promise<OfficeActionResult>;
  readRange(action: OfficeAction): Promise<OfficeActionResult>;
}

export function createExcelFileAdapter(): ExcelFileAdapter {
  return {
    async createWorkbook(action) {
      const outputPath = action.outputPath || path.join(os.tmpdir(), `xenesis-office-${Date.now()}.xlsx`);
      if (!action.overwrite && (await exists(outputPath))) {
        return failed('excel.createWorkbook', 'overwrite_required', `File already exists: ${outputPath}`);
      }

      const workbook = XLSX.utils.book_new();
      for (const sheet of action.sheets) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), safeSheetName(sheet.name));
      }
      XLSX.writeFile(workbook, outputPath);

      return {
        ok: true,
        action: 'excel.createWorkbook',
        documentType: 'excel',
        path: outputPath,
        sheets: summarizeWorkbook(workbook),
        message: 'Excel workbook created.',
      };
    },

    async inspectWorkbook(action) {
      const workbook = XLSX.readFile(action.path || '');
      return {
        ok: true,
        action: 'excel.inspectWorkbook',
        documentType: 'excel',
        path: action.path,
        sheets: summarizeWorkbook(workbook),
        message: 'Excel workbook inspected.',
      };
    },

    async readRange(action) {
      const workbook = XLSX.readFile(action.path || '');
      const sheet = workbook.Sheets[action.sheetName || ''];
      if (!sheet) return failed('excel.readRange', 'sheet_not_found', `Sheet not found: ${action.sheetName}`);
      const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        range: action.range,
        blankrows: false,
      });
      return {
        ok: true,
        action: 'excel.readRange',
        documentType: 'excel',
        path: action.path,
        rows,
        message: 'Excel range read.',
      };
    },
  };
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeSheetName(value: string): string {
  return value.replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'Sheet1';
}

function summarizeWorkbook(workbook: XLSX.WorkBook): Array<{ name: string; rowCount: number; columnCount: number }> {
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    const columnCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
    return { name, rowCount: rows.length, columnCount };
  });
}

function failed(action: OfficeActionResult['action'], code: string, message: string): OfficeActionResult {
  return { ok: false, action, code, error: message, message };
}
```

- [ ] **Step 4: Run file adapter tests and verify GREEN**

Run:

```powershell
node --import tsx --test src/main/officeControl/excelFileAdapter.test.ts
```

Expected: PASS with 2/2 tests.

- [ ] **Step 5: Update handoff**

Record the RED/GREEN result and temporary workbook behavior in `handoff.md`.

## Task 4: Installed Office Adapters

**Files:**
- Create: `src/main/officeControl/windowsOfficeComAdapter.test.ts`
- Create: `src/main/officeControl/windowsOfficeComAdapter.ts`
- Create: `src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts`
- Create: `src/main/officeControl/macosOfficeAppleEventsAdapter.ts`
- Modify: `handoff.md`

- [ ] **Step 1: Write Windows adapter tests**

Create `src/main/officeControl/windowsOfficeComAdapter.test.ts` by adapting the sibling test. Required test names:

```ts
test('resolveWindowsOfficeControlHostPath prefers packaged resource path when packaged', () => {});
test('resolveWindowsOfficeControlHostPath returns first existing dev candidate', () => {});
test('Windows Office COM adapter sends typed host payloads and preserves successful results', async () => {});
test('Windows Office COM adapter maps missing host to unavailable provider status and host_not_found action result', async () => {});
test('Windows Office COM adapter maps invalid host JSON to stable failure', async () => {});
test('Windows Office COM adapter default resolution uses packaged resources when packaged', async () => {});
```

The payload assertion for `excel.writeRange` must include:

```ts
{
  action: 'excel.writeRange',
  provider: 'windows-com',
  documentType: 'excel',
  path: 'C:\\work\\report.xlsx',
  outputPath: undefined,
  overwrite: false,
  visible: false,
  readOnly: false,
  reuseExisting: false,
  save: true,
  sheetName: 'Summary',
  range: undefined,
  startCell: 'B2',
  rows: [
    ['Name', 'Value'],
    ['A', 1],
  ],
  saveAsPath: undefined,
}
```

- [ ] **Step 2: Write macOS adapter tests**

Create `src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts` by adapting the sibling test. Required test names:

```ts
test('macOS Office Apple Events adapter reports unavailable status outside macOS without invoking automation', async () => {});
test('macOS Office Apple Events adapter sends typed operation payloads and preserves successful results', async () => {});
test('macOS Office Apple Events adapter maps invalid automation JSON to stable failure', async () => {});
test('macOS Office Apple Events adapter maps automation rejection to apple_events_failed', async () => {});
```

The payload assertion for `excel.exportPdf` must include:

```ts
{
  operation: 'excel.exportPdf',
  action: 'excel.exportPdf',
  args: {
    provider: 'macos-apple-events',
    documentType: 'excel',
    path: '/Users/me/report.xlsx',
    outputPath: '/Users/me/report.pdf',
    overwrite: true,
    visible: false,
    readOnly: false,
    reuseExisting: false,
    save: false,
    sheetName: undefined,
    range: undefined,
    startCell: undefined,
    rows: [],
    saveAsPath: undefined,
  },
  timeoutMs: 20000,
}
```

- [ ] **Step 3: Run installed adapter tests and verify RED**

Run:

```powershell
node --import tsx --test src/main/officeControl/windowsOfficeComAdapter.test.ts src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts
```

Expected: FAIL because the adapter modules do not exist.

- [ ] **Step 4: Implement Windows Office COM adapter**

Create `src/main/officeControl/windowsOfficeComAdapter.ts` with these exported APIs:

```ts
export interface WindowsOfficeControlHostPathOptions {
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  existsSync?: (candidate: string) => boolean;
}

export interface WindowsOfficeControlHostRunInput {
  hostPath: string;
  payload: unknown;
  timeoutMs: number;
}

export interface WindowsOfficeComAdapterOptions {
  hostPath?: string;
  appIsPackaged?: boolean;
  resourcesPath?: string;
  cwd?: string;
  platform?: NodeJS.Platform;
  timeoutMs?: number;
  runHost?: (input: WindowsOfficeControlHostRunInput) => Promise<string>;
}

export function resolveWindowsOfficeControlHostPath(options?: WindowsOfficeControlHostPathOptions): string;
export function createWindowsOfficeComAdapter(options?: WindowsOfficeComAdapterOptions): InstalledOfficeAdapter;
export async function defaultRunHost(input: WindowsOfficeControlHostRunInput): Promise<string>;
```

Implementation requirements:

- Packaged candidate: `path.join(resourcesPath, 'office-control-host', 'Xenesis.OfficeControlHost.exe')`.
- Dev candidates include Debug/Release `net8.0-windows`, `win-x64`, and `tools/office-control-host/publish/Xenesis.OfficeControlHost.exe`.
- `status()` returns unavailable without calling host when `hostPath` is empty.
- `run()` returns `host_not_found` when `hostPath` is empty.
- `runHostProcess()` sends `JSON.stringify(input.payload)` to stdin.
- Non-zero exit with handled failure JSON resolves that JSON.
- Invalid JSON returns code `host_invalid_json`.
- Timeout returns code `host_timeout`.

- [ ] **Step 5: Implement macOS Apple Events adapter**

Create `src/main/officeControl/macosOfficeAppleEventsAdapter.ts` with these exported APIs:

```ts
export interface MacosOfficeAppleEventsRunInput {
  operation: OfficeActionKind;
  action: OfficeActionKind;
  args: Record<string, unknown>;
  timeoutMs: number;
}

export interface MacosOfficeAppleEventsAdapterOptions {
  platform?: NodeJS.Platform;
  timeoutMs?: number;
  runAppleEvents?: (input: MacosOfficeAppleEventsRunInput) => Promise<string>;
}

export function createMacosOfficeAppleEventsAdapter(options?: MacosOfficeAppleEventsAdapterOptions): InstalledOfficeAdapter;
export async function defaultRunAppleEvents(input: MacosOfficeAppleEventsRunInput): Promise<string>;
```

Implementation requirements:

- `status()` returns unavailable and does not invoke automation unless `platform === 'darwin'`.
- `run()` returns `provider_unavailable` outside macOS.
- `defaultRunAppleEvents()` uses `/usr/bin/osascript`, args `['-l', 'JavaScript', '-e', MACOS_OFFICE_JXA, JSON.stringify(input)]`.
- Invalid JSON returns `host_invalid_json`.
- Rejected automation returns `apple_events_failed`.
- JXA code supports `status`, `excel.openWorkbook`, `excel.readRange`, `excel.writeRange`, `excel.saveWorkbook`, `excel.closeWorkbook`, and `excel.exportPdf`.

- [ ] **Step 6: Run installed adapter tests and verify GREEN**

Run:

```powershell
node --import tsx --test src/main/officeControl/windowsOfficeComAdapter.test.ts src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts
```

Expected: PASS with all Windows and macOS adapter tests.

- [ ] **Step 7: Update handoff**

Record adapter test results and host availability behavior in `handoff.md`.

## Task 5: Office Control Service

**Files:**
- Create: `src/main/officeControl/officeControlService.test.ts`
- Create: `src/main/officeControl/officeControlService.ts`
- Modify: `handoff.md`

- [ ] **Step 1: Write the failing service tests**

Create `src/main/officeControl/officeControlService.test.ts` using the sibling tests. Required coverage:

```ts
test('office service returns disabled result when settings disable office control', async () => {});
test('office service returns provider status when enabled', async () => {});
test('office service reports Windows COM and macOS Apple Events provider status', async () => {});
test('office service routes installed provider Excel actions by explicit provider and platform default', async () => {});
test('office service blocks installed provider writes when settings disallow them', async () => {});
test('office service enforces configured Office read and write cell limits', async () => {});
```

Use this helper shape:

```ts
function stubInstalledOfficeAdapter(
  status: OfficeProviderStatus & { run?: (action: OfficeAction) => Promise<OfficeActionResult> },
) {
  return {
    status: async () => status,
    run: status.run ?? (async (action: OfficeAction) => ok(action)),
  };
}
```

- [ ] **Step 2: Run service tests and verify RED**

Run:

```powershell
node --import tsx --test src/main/officeControl/officeControlService.test.ts
```

Expected: FAIL because `officeControlService.ts` does not exist.

- [ ] **Step 3: Implement service interfaces and routing**

Create `src/main/officeControl/officeControlService.ts` with:

```ts
export interface InstalledOfficeAdapter {
  status(): Promise<OfficeProviderStatus>;
  run(action: OfficeAction): Promise<OfficeActionResult>;
}

export interface OfficeControlServiceOptions {
  getSettings?: () => Partial<OfficeControlSettings> | undefined;
  excelFileAdapter?: ExcelFileAdapter;
  platform?: NodeJS.Platform;
  windowsComAdapter?: InstalledOfficeAdapter;
  macosAppleEventsAdapter?: InstalledOfficeAdapter;
}

export interface OfficeControlService {
  run(path: string, args: unknown): Promise<OfficeActionResult>;
}

export function createOfficeControlService(options: OfficeControlServiceOptions = {}): OfficeControlService;
```

Routing rules:

- Use `normalizeOfficeSettings(options.getSettings?.())`.
- If disabled, return `{ ok: false, action: 'status', code: 'office_control_disabled', ... }`.
- Normalize the action after disabled check.
- `status` returns `file` provider and optional installed provider statuses based on settings.
- `excel.createWorkbook` always uses file adapter.
- `excel.inspectWorkbook` and `excel.readRange` use file adapter when `provider` is absent or `provider === 'file'`.
- Installed provider selection:
  - explicit `provider` wins;
  - `win32` defaults to `windows-com`;
  - `darwin` defaults to `macos-apple-events`;
  - other platforms default to `file`.
- `provider === 'file'` for unsupported installed actions returns `provider_unsupported`.
- Settings failures return before `adapter.run()`.

- [ ] **Step 4: Run service tests and verify GREEN**

Run:

```powershell
node --import tsx --test src/main/officeControl/officeControlService.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run main Office bundle**

Run:

```powershell
node --import tsx --test src/shared/officeControl.test.ts src/main/officeControl/excelFileAdapter.test.ts src/main/officeControl/windowsOfficeComAdapter.test.ts src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts src/main/officeControl/officeControlService.test.ts
```

Expected: PASS.

- [ ] **Step 6: Update handoff**

Record service behavior and test results in `handoff.md`.

## Task 6: Settings And Main Wiring

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/main/index.ts`
- Modify: `src/shared/xenesisSettingsCatalog.mjs`
- Modify: `src/renderer/panes/SettingsPane.tsx`
- Modify: `src/renderer/i18n/en.ts`
- Modify: `src/renderer/i18n/ko.ts`
- Modify: `scripts/nativeToolsPackaging.test.ts`
- Modify: `handoff.md`

- [ ] **Step 1: Write failing wiring expectations**

Modify `scripts/nativeToolsPackaging.test.ts` by replacing:

```ts
assert.doesNotMatch(appControlService, /officeControl/);
assert.equal(exists('src/main/officeControl'), false);
```

with assertions that prove runtime Office Control is wired:

```ts
const officeControlService = read('src/main/officeControl/officeControlService.ts');
const mainIndex = read('src/main/index.ts');
const deskBridgeCapabilities = read('src/shared/deskBridgeCapabilities.ts');

assert.match(officeControlService, /createWindowsOfficeComAdapter/);
assert.match(officeControlService, /createMacosOfficeAppleEventsAdapter/);
assert.match(mainIndex, /createOfficeControlService/);
assert.match(mainIndex, /runOfficeAction/);
assert.match(deskBridgeCapabilities, /xd\.office\.excel\.writeRange/);
```

- [ ] **Step 2: Run packaging test and verify RED**

Run:

```powershell
node --test scripts/nativeToolsPackaging.test.ts
```

Expected: FAIL until `src/main/officeControl` and main/CR wiring exist.

- [ ] **Step 3: Add Office settings type**

In `src/shared/types.ts`, import the Office settings type:

```ts
import type { OfficeControlSettings } from './officeControl';
```

Add to `AppSettings` near `externalApps`:

```ts
/** Office document automation settings */
office: OfficeControlSettings;
```

- [ ] **Step 4: Wire settings defaults/load/persist**

In `src/main/index.ts`:

Add import:

```ts
import { normalizeOfficeSettings } from '../shared/officeControl';
```

Add default:

```ts
office: normalizeOfficeSettings(undefined),
```

Normalize loaded/merged settings near `externalApps`:

```ts
merged.office = normalizeOfficeSettings(merged.office);
```

Merge persisted partial updates:

```ts
office: settings.office ? normalizeOfficeSettings({ ...current.office, ...settings.office }) : current.office,
```

Normalize updated settings before save:

```ts
updated.office = normalizeOfficeSettings(updated.office);
```

- [ ] **Step 5: Wire Office service into CR adapter**

In `src/main/index.ts`, import:

```ts
import { createOfficeControlService } from './officeControl/officeControlService';
```

Inside `createMcpBridgeCapabilityAdapter()`, instantiate:

```ts
const officeControlService = createOfficeControlService({
  getSettings: () => loadSettings().office,
});
```

Add adapter method:

```ts
runOfficeAction: (path: string, args?: unknown) => officeControlService.run(path, args),
```

- [ ] **Step 6: Add settings category and i18n keys**

In `src/shared/xenesisSettingsCatalog.mjs`, add near External Apps:

```js
{
  id: 'office-control',
  icon: 'XLS',
  titleKey: 'settings.category.officeControl',
  descriptionKey: 'settings.category.officeControlDesc',
},
```

In `src/renderer/i18n/en.ts`, add:

```ts
officeControl: 'Office Control',
officeControlDesc: 'Excel automation providers and document safety policy',
```

In `src/renderer/i18n/ko.ts`, add:

```ts
officeControl: 'Office 제어',
officeControlDesc: 'Excel 자동화 provider와 문서 안전 정책',
```

- [ ] **Step 7: Add SettingsPane state and save handler**

In `src/renderer/panes/SettingsPane.tsx`, import:

```ts
import { normalizeOfficeSettings, type OfficeControlSettings } from '../../shared/officeControl';
```

Add state:

```ts
const [officeSettings, setOfficeSettings] = useState<OfficeControlSettings>(() => normalizeOfficeSettings(undefined));
```

When loading settings, add:

```ts
setOfficeSettings(normalizeOfficeSettings(s.office));
```

Add patch helper:

```ts
const patchOfficeSettings = useCallback((patch: Partial<OfficeControlSettings>) => {
  setOfficeSettings((current) => normalizeOfficeSettings({ ...current, ...patch }));
}, []);
```

Add save handler:

```ts
const saveOfficeSettings = useCallback(async () => {
  const office = normalizeOfficeSettings(officeSettings);
  await saveUpdatedSettings({ office });
  setOfficeSettings(office);
}, [officeSettings, saveUpdatedSettings]);
```

- [ ] **Step 8: Add SettingsPane Office UI**

Add `renderOfficeControl()` with the existing `sp-section`, `sp-field`, `sp-inline-check`, and `sp-input` styles. It must include:

- checkbox for `enabled`
- checkbox for `enableWindowsComProvider`
- checkbox for `enableMacosAppleEventsProvider`
- checkbox for `allowModifyExistingDocuments`
- checkbox for `allowPdfExport`
- checkbox for `allowVisibleOfficeAutomation`
- numeric input for `maxReadCells`
- numeric input for `maxWriteCells`
- text input for `defaultOutputDir`
- save button calling `saveOfficeSettings()`

Add render branch:

```tsx
{activeCategory === 'office-control' && renderOfficeControl()}
```

Use the same category routing pattern already used for `external-apps`.

- [ ] **Step 9: Run focused typecheck and packaging test**

Run:

```powershell
node --test scripts/nativeToolsPackaging.test.ts
npm run typecheck
```

Expected: packaging test passes, and typecheck passes.

- [ ] **Step 10: Update handoff**

Record settings/UI/main wiring decisions and command results in `handoff.md`.

## Task 7: Focused Office Verification And Live Status Smoke

**Files:**
- Modify: `docs/capability-registry-audit.md`
- Modify: `handoff.md`

- [ ] **Step 1: Run focused Office tests**

Run:

```powershell
node --import tsx --test src/shared/officeControl.test.ts src/shared/officeCapabilities.test.ts src/main/officeControl/excelFileAdapter.test.ts src/main/officeControl/windowsOfficeComAdapter.test.ts src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts src/main/officeControl/officeControlService.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run targeted Biome for changed Office files**

Run:

```powershell
npx biome check src/shared/officeControl.ts src/shared/officeControl.test.ts src/shared/officeCapabilities.test.ts src/main/officeControl/excelFileAdapter.ts src/main/officeControl/excelFileAdapter.test.ts src/main/officeControl/windowsOfficeComAdapter.ts src/main/officeControl/windowsOfficeComAdapter.test.ts src/main/officeControl/macosOfficeAppleEventsAdapter.ts src/main/officeControl/macosOfficeAppleEventsAdapter.test.ts src/main/officeControl/officeControlService.ts src/main/officeControl/officeControlService.test.ts src/shared/types.ts src/shared/xenesisSettingsCatalog.mjs scripts/nativeToolsPackaging.test.ts --max-diagnostics=200
```

Expected: PASS. If `SettingsPane.tsx` or `deskBridgeCapabilities.ts` reports pre-existing style diagnostics, run a narrower check for Office-created files and record the exact scoped result.

- [ ] **Step 3: Run broad gates**

Run:

```powershell
npm run typecheck
npm test
npm run docs:capabilities:audit
npm run build
npm run check:public-release
git diff --name-only -- packages/xenesis
```

Expected:

- typecheck exits 0.
- root tests pass.
- CR audit exits 0 with all missing/undispatched counters at 0.
- build exits 0 with only known Vite warnings if any.
- public-release exits 0.
- `git diff --name-only -- packages/xenesis` prints nothing.

- [ ] **Step 4: Run live Electron Office status smoke**

Use the existing ad-hoc Playwright `_electron.launch` pattern from recent App Control Lab smoke. The script must:

- launch Electron with temporary `XENIS_HOME` and `XENESIS_DESK_USER_DATA_DIR`;
- wait for `globalThis.deskBridgeAPI?.callCapability`;
- call:

```js
globalThis.deskBridgeAPI.callCapability({
  path: 'xd.office.status',
  source: 'xenesis-office-control-live-smoke',
  args: {},
});
```

- assert result `ok === true`;
- assert `result.providers` includes `{ id: 'file', available: true }`;
- print:

```text
OFFICE_CONTROL_SMOKE_PASS {"path":"xd.office.status","fileProvider":true}
```

- [ ] **Step 5: Optional installed Office smoke**

If `xd.office.status` reports `windows-com` or `macos-apple-events` as available, run only a safe temporary-file smoke:

1. Use file provider to create a temporary `.xlsx` workbook.
2. Use installed provider only for read-only inspect/open/read if available.
3. Do not modify existing user documents.

If the installed provider is unavailable, record the provider status as an environment gap.

- [ ] **Step 6: Update handoff**

Record focused tests, targeted Biome, broad gates, live smoke marker, optional installed-provider result, and `packages/xenesis` diff result.

## Task 8: Commit, Push, And PR Update

**Files:**
- Modify: `handoff.md`

- [ ] **Step 1: Inspect final diff**

Run:

```powershell
git status --short
git diff --stat
git diff --name-only -- packages/xenesis
```

Expected: Office Control files, generated CR audit, settings files, and `handoff.md` only. `packages/xenesis` output is empty.

- [ ] **Step 2: Stage implementation files**

Run:

```powershell
git add docs/capability-registry-audit.md handoff.md scripts/nativeToolsPackaging.test.ts src/shared/officeControl.ts src/shared/officeControl.test.ts src/shared/officeCapabilities.test.ts src/shared/deskBridgeCapabilities.ts src/shared/types.ts src/shared/xenesisSettingsCatalog.mjs src/main/officeControl src/main/index.ts src/renderer/panes/SettingsPane.tsx src/renderer/i18n/en.ts src/renderer/i18n/ko.ts
```

- [ ] **Step 3: Commit implementation**

Run:

```powershell
git commit -m "Add Office Control CR surface"
```

Expected: commit succeeds on `mini`.

- [ ] **Step 4: Push**

Run:

```powershell
git push origin mini
```

Expected: push succeeds.

- [ ] **Step 5: Update PR**

Run:

```powershell
gh pr view 13 --json number,title,url,headRefName,baseRefName,state
```

If PR #13 is still open for `mini -> main`, update it:

```powershell
gh pr edit 13 --title "Port Meta, Agent Sessions, App Control, and Office Control" --body-file -
```

The PR body must include:

- Office Control summary
- focused Office tests
- `npm test`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- `npm run build`
- `npm run check:public-release`
- live `OFFICE_CONTROL_SMOKE_PASS` marker
- `packages/xenesis` no-diff result
- known full-lint status

- [ ] **Step 6: Record PR update**

Append a final Office Control PR update section to `handoff.md`, then commit and push the handoff-only update:

```powershell
git add handoff.md
git commit -m "Record Office Control PR update"
git push origin mini
```

Expected: branch is clean and `mini` is synced with `origin/mini`.

## Self-Review

- Spec coverage:
  - Shared model: Task 1.
  - CR surface and approval: Task 2.
  - File provider: Task 3.
  - Installed providers: Task 4.
  - Main service: Task 5.
  - Settings and main wiring: Task 6.
  - Verification and smoke: Task 7.
  - Commit/push/PR: Task 8.
- Red-flag scan:
  - No incomplete requirement markers other than task checkboxes.
- Type consistency:
  - `OfficeActionKind`, `OfficeProviderId`, `OfficeControlSettings`, `OfficeActionResult`, and `runOfficeAction(path, args)` are used consistently across tasks.
