# Office Control Slice Design

## Priority

Order 4 in the non-package parity roadmap.

## Goal

Connect Office automation helper packaging to actual shared models, main
services, settings, and CR paths. The slice focuses on Excel-oriented operations
already represented in the sibling implementation.

## Source Surface

Sibling files to evaluate and adapt:

- `src/shared/officeControl.ts`
- `src/shared/officeControl.test.ts`
- `src/shared/officeCapabilities.test.ts`
- `src/main/officeControl/excelFileAdapter.ts`
- `src/main/officeControl/officeControlService.ts`
- `src/main/officeControl/windowsOfficeComAdapter.ts`
- `src/main/officeControl/macosOfficeAppleEventsAdapter.ts`
- Matching `src/main/officeControl/*.test.ts`
- Settings/i18n sections for Office Control.

Current repo files that must stay aligned:

- `tools/office-control-host/**`
- `scripts/nativeToolsPackaging.test.ts`
- `package.json` build and packaging resources.
- `src/shared/types.ts`
- `src/shared/deskBridgeCapabilities.ts`
- `src/main/index.ts`
- `src/renderer/panes/SettingsPane.tsx`
- `src/renderer/i18n/en.ts`
- `src/renderer/i18n/ko.ts`

## Architecture

The shared Office model normalizes action input, approval classification, and
settings. Main process service chooses the available provider:

- File-based `.xlsx` adapter for create, inspect, and read operations.
- Windows COM adapter through `tools/office-control-host`.
- macOS Apple Events adapter through the macOS helper path.

The Capability Registry exposes Office operations as structured document-aware
actions instead of generic shell or external-app clicks.

## CR Surface

- `xd.office.status`
- `xd.office.excel.createWorkbook`
- `xd.office.excel.inspectWorkbook`
- `xd.office.excel.openWorkbook`
- `xd.office.excel.readRange`
- `xd.office.excel.writeRange`
- `xd.office.excel.saveWorkbook`
- `xd.office.excel.closeWorkbook`
- `xd.office.excel.exportPdf`

## Approval Policy

- Status and bounded reads are read operations.
- Creating new workbooks is write and should follow `when-external` approval.
- Modifying existing documents and PDF export use stricter approval, including
  `always` where the shared model requires it.
- Visible installed Office automation is disabled unless settings allow it.

## Tests

Focused tests:

- Shared Office normalization and approval tests.
- Office service tests with fake adapters.
- Windows and macOS adapter tests with fake host clients.
- Native tools packaging tests.
- CR registration and dispatch tests.

Broader gates:

- `npm test`
- `npm run typecheck`
- `npm run docs:capabilities:audit`
- Installed Office smoke only when host prerequisites are present and approved.

## Non-Goals

- Do not change `packages/xenesis`.
- Do not add Word or PowerPoint editing in this slice.
- Do not automate visible Office windows unless the setting explicitly allows it.
