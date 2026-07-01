import type {
  OfficeAction,
  OfficeActionResult,
  OfficeControlSettings,
  OfficeProviderId,
  OfficeProviderStatus,
} from '../../shared/officeControl';
import { normalizeOfficeAction, normalizeOfficeSettings } from '../../shared/officeControl';
import { createExcelFileAdapter, type ExcelFileAdapter } from './excelFileAdapter';
import { createMacosOfficeAppleEventsAdapter } from './macosOfficeAppleEventsAdapter';
import { createWindowsOfficeComAdapter } from './windowsOfficeComAdapter';

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

export function createOfficeControlService(options: OfficeControlServiceOptions = {}): OfficeControlService {
  const excelFileAdapter = options.excelFileAdapter ?? createExcelFileAdapter();
  const platform = options.platform ?? process.platform;
  const windowsComAdapter = options.windowsComAdapter ?? createWindowsOfficeComAdapter({ platform });
  const macosAppleEventsAdapter = options.macosAppleEventsAdapter ?? createMacosOfficeAppleEventsAdapter({ platform });
  return {
    async run(path, args) {
      const settings = normalizeOfficeSettings(options.getSettings?.());
      if (!settings.enabled) return failed('status', 'office_control_disabled', 'Office automation is disabled.');

      const action = normalizeOfficeAction(path, args);
      const limitFailure = validateConfiguredLimits(action, settings);
      if (limitFailure) return limitFailure;
      if (action.kind === 'status') {
        const providers: OfficeProviderStatus[] = [
          {
            id: 'file',
            available: true,
            apps: ['excel'],
            message: 'Excel file provider available.',
          },
        ];
        if (settings.enableWindowsComProvider) providers.push(await windowsComAdapter.status());
        if (settings.enableMacosAppleEventsProvider) providers.push(await macosAppleEventsAdapter.status());
        return {
          ok: true,
          action: 'status',
          providers,
          message: 'Office provider status read.',
        };
      }

      if (action.kind === 'excel.createWorkbook') return excelFileAdapter.createWorkbook(action);
      if (usesFileProvider(action, platform)) {
        if (action.kind === 'excel.inspectWorkbook') return excelFileAdapter.inspectWorkbook(action);
        if (action.kind === 'excel.readRange') return excelFileAdapter.readRange(action);
      }

      const provider = selectInstalledProvider(action, platform);
      if (provider === 'file') {
        return failed(action.kind, 'provider_unsupported', 'File provider does not support this Office action.');
      }

      const settingsFailure = validateInstalledProviderSettings(action, provider, settings);
      if (settingsFailure) return settingsFailure;

      const adapter = provider === 'windows-com' ? windowsComAdapter : macosAppleEventsAdapter;
      const status = await adapter.status();
      if (!status.available) {
        return failed(
          action.kind,
          provider === 'windows-com' ? 'office_not_installed' : 'provider_unavailable',
          status.message || `${provider} provider is not available.`,
        );
      }

      return adapter.run({ ...action, provider });
    },
  };
}

function failed(action: OfficeActionResult['action'], code: string, message: string): OfficeActionResult {
  return { ok: false, action, code, error: message, message };
}

function usesFileProvider(action: OfficeAction, platform: NodeJS.Platform): boolean {
  if (action.provider === 'file') return true;
  if (action.provider) return false;
  if (action.kind === 'excel.inspectWorkbook' || action.kind === 'excel.readRange') return true;
  return action.kind === 'excel.createWorkbook' && platform !== 'win32' && platform !== 'darwin';
}

function selectInstalledProvider(action: OfficeAction, platform: NodeJS.Platform): OfficeProviderId {
  if (action.provider) return action.provider;
  if (platform === 'darwin') return 'macos-apple-events';
  if (platform === 'win32') return 'windows-com';
  return 'file';
}

function validateInstalledProviderSettings(
  action: OfficeAction,
  provider: OfficeProviderId,
  settings: OfficeControlSettings,
): OfficeActionResult | undefined {
  if (provider === 'windows-com' && !settings.enableWindowsComProvider) {
    return failed(action.kind, 'provider_unavailable', 'Windows COM provider is disabled.');
  }
  if (provider === 'macos-apple-events' && !settings.enableMacosAppleEventsProvider) {
    return failed(action.kind, 'provider_unavailable', 'macOS Apple Events provider is disabled.');
  }
  if (action.visible && !settings.allowVisibleOfficeAutomation) {
    return failed(action.kind, 'visible_automation_disabled', 'Visible Office automation is disabled.');
  }
  if (
    action.kind === 'excel.writeRange' ||
    action.kind === 'excel.saveWorkbook' ||
    action.kind === 'excel.closeWorkbook'
  ) {
    if (!settings.allowModifyExistingDocuments) {
      return failed(action.kind, 'modify_existing_disabled', 'Modifying existing Office documents is disabled.');
    }
  }
  if (action.kind === 'excel.exportPdf' && !settings.allowPdfExport) {
    return failed(action.kind, 'pdf_export_disabled', 'Office PDF export is disabled.');
  }
  return undefined;
}

function validateConfiguredLimits(
  action: OfficeAction,
  settings: OfficeControlSettings,
): OfficeActionResult | undefined {
  if (action.kind === 'excel.readRange' && countRangeCells(action.range || '') > settings.maxReadCells) {
    return failed(action.kind, 'range_too_large', 'Office readRange exceeds maxReadCells.');
  }
  if (action.kind === 'excel.writeRange' && countRowsCells(action.rows) > settings.maxWriteCells) {
    return failed(action.kind, 'write_too_large', 'Office writeRange exceeds maxWriteCells.');
  }
  return undefined;
}

function countRowsCells(rows: unknown[][]): number {
  return rows.reduce((total, row) => total + row.length, 0);
}

function countRangeCells(range: string): number {
  const match = range.match(/^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/);
  if (!match) return 1;
  const startColumn = columnIndex(match[1] || 'A');
  const startRow = Number(match[2] || 1);
  const endColumn = columnIndex(match[3] || 'A');
  const endRow = Number(match[4] || 1);
  return (Math.abs(endColumn - startColumn) + 1) * (Math.abs(endRow - startRow) + 1);
}

function columnIndex(column: string): number {
  return column
    .toUpperCase()
    .split('')
    .reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0);
}
