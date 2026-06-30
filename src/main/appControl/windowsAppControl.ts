import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type {
  ExternalAppActionName,
  ExternalAppActionResult,
  ExternalAppWindowInfo,
} from '../../shared/externalAppControl';

const execFileAsync = promisify(execFile);

export interface WindowsAppControlRunner {
  runPowerShell(script: string): Promise<string>;
}

export interface WindowsLaunchInput {
  executable: string;
  args?: string[];
  cwd?: string;
}

export interface WindowsFindInput {
  windowId?: string;
  executable?: string;
  processName?: string;
  titleContains?: string;
}

export interface WindowsWindowInput {
  windowId?: string;
  executable?: string;
  processName?: string;
  titleContains?: string;
}

export interface WindowsResizeInput extends WindowsWindowInput {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface WindowsTextInput extends WindowsWindowInput {
  text: string;
}

export interface WindowsHotkeyInput extends WindowsWindowInput {
  keys: string[];
}

export interface WindowsCloseInput extends WindowsWindowInput {
  mode?: 'window' | 'process';
}

export interface WindowsAppControlAdapter {
  launch(input: WindowsLaunchInput): Promise<ExternalAppActionResult>;
  find(input: WindowsFindInput): Promise<ExternalAppActionResult>;
  status(input: WindowsFindInput): Promise<ExternalAppActionResult>;
  focus(input: WindowsWindowInput): Promise<ExternalAppActionResult>;
  resize(input: WindowsResizeInput): Promise<ExternalAppActionResult>;
  typeText(input: WindowsTextInput): Promise<ExternalAppActionResult>;
  hotkey(input: WindowsHotkeyInput): Promise<ExternalAppActionResult>;
  close(input: WindowsCloseInput): Promise<ExternalAppActionResult>;
}

export function createWindowsAppControlAdapter(runner?: WindowsAppControlRunner): WindowsAppControlAdapter {
  const runPowerShell = runner?.runPowerShell ?? defaultRunPowerShell;

  return {
    launch: (input) => runAction(runPowerShell, 'launch', buildLaunchScript(input)),
    find: (input) => runAction(runPowerShell, 'find', buildFindScript(input, 'find')),
    status: (input) => runAction(runPowerShell, 'status', buildFindScript(input, 'status')),
    focus: (input) => runAction(runPowerShell, 'focus', buildWindowScript('focus', input)),
    resize: (input) => runAction(runPowerShell, 'resize', buildResizeScript(input)),
    typeText: (input) =>
      runAction(runPowerShell, 'typeText', buildSendKeysScript('typeText', input, sendKeysText(input.text))),
    hotkey: (input) =>
      runAction(runPowerShell, 'hotkey', buildSendKeysScript('hotkey', input, sendKeysHotkey(input.keys))),
    close: (input) => runAction(runPowerShell, 'close', buildCloseScript(input)),
  };
}

async function defaultRunPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    { windowsHide: true, maxBuffer: 1024 * 1024 },
  );
  return stdout;
}

async function runAction(
  runPowerShell: (script: string) => Promise<string>,
  action: ExternalAppActionName,
  script: string,
): Promise<ExternalAppActionResult> {
  try {
    const output = await runPowerShell(script);
    return normalizeActionResult(output, action);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failedResult(action, message);
  }
}

function normalizeActionResult(output: string, fallbackAction: ExternalAppActionName): ExternalAppActionResult {
  try {
    const parsed = JSON.parse(output.trim() || '{}') as Partial<ExternalAppActionResult>;
    return {
      ok: parsed.ok === true,
      action: parsed.action ?? fallbackAction,
      approvalLevel: parsed.approvalLevel ?? 'medium',
      processId: typeof parsed.processId === 'number' ? parsed.processId : undefined,
      windows: normalizeWindows(parsed.windows),
      message:
        typeof parsed.message === 'string' ? parsed.message : defaultActionMessage(fallbackAction, parsed.ok === true),
      error: typeof parsed.error === 'string' ? parsed.error : undefined,
    };
  } catch {
    return failedResult(fallbackAction, `PowerShell returned non-JSON output: ${output.slice(0, 300)}`);
  }
}

function normalizeWindows(raw: unknown): ExternalAppWindowInfo[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      windowId: String(item.windowId ?? item.handle ?? ''),
      processId: Number.isFinite(Number(item.processId)) ? Number(item.processId) : undefined,
      title: String(item.title ?? ''),
      bounds:
        item.bounds && typeof item.bounds === 'object'
          ? {
              x: Number((item.bounds as Record<string, unknown>).x ?? 0),
              y: Number((item.bounds as Record<string, unknown>).y ?? 0),
              width: Number((item.bounds as Record<string, unknown>).width ?? 0),
              height: Number((item.bounds as Record<string, unknown>).height ?? 0),
            }
          : undefined,
      isForeground: typeof item.isForeground === 'boolean' ? item.isForeground : undefined,
    }))
    .filter((item) => item.windowId);
}

function failedResult(action: ExternalAppActionName, error: string): ExternalAppActionResult {
  return {
    ok: false,
    action,
    approvalLevel: 'medium',
    windows: [],
    message: defaultActionMessage(action, false),
    error,
  };
}

function defaultActionMessage(action: ExternalAppActionName, ok: boolean): string {
  return ok ? `External app ${action} completed.` : `External app ${action} failed.`;
}

function buildLaunchScript(input: WindowsLaunchInput): string {
  const args = input.args?.length ? ` -ArgumentList @(${input.args.map(psString).join(', ')})` : '';
  const cwd = input.cwd ? ` -WorkingDirectory ${psString(input.cwd)}` : '';
  return `${user32Helpers()}
$process = Start-Process -FilePath ${psString(input.executable)}${args}${cwd} -PassThru
Start-Sleep -Milliseconds 250
Write-OutputJson @{ ok = $true; action = 'launch'; processId = $process.Id; windows = @(Get-AppWindows -ProcessId $process.Id); message = 'External app launched.' }`;
}

function buildFindScript(input: WindowsFindInput, action: 'find' | 'status'): string {
  return `${user32Helpers()}
$windows = Get-AppWindows -WindowId ${psString(input.windowId ?? '')} -ProcessName ${psString(resolveProcessName(input))} -TitleContains ${psString(input.titleContains ?? '')}
Write-OutputJson @{ ok = $true; action = ${psString(action)}; windows = @($windows); message = 'External app status completed.' }`;
}

function buildWindowScript(action: 'focus', input: WindowsWindowInput): string {
  return `${user32Helpers()}
$window = Resolve-AppWindow -WindowId ${psString(input.windowId ?? '')} -ProcessName ${psString(resolveProcessName(input))} -TitleContains ${psString(input.titleContains ?? '')}
if (-not $window) { Write-OutputJson @{ ok = $false; action = ${psString(action)}; windows = @(); error = 'Window not found.'; message = 'External app focus failed.' }; exit 0 }
[User32]::SetForegroundWindow([IntPtr]$window.windowId) | Out-Null
Start-Sleep -Milliseconds 80
$updated = Resolve-AppWindow -WindowId $window.windowId
if (-not $updated) { $updated = $window }
Write-OutputJson @{ ok = $true; action = ${psString(action)}; windows = @($updated); message = 'External app focused.' }`;
}

function buildResizeScript(input: WindowsResizeInput): string {
  const x = Math.round(input.x ?? 40);
  const y = Math.round(input.y ?? 40);
  const width = Math.max(100, Math.round(input.width ?? 900));
  const height = Math.max(100, Math.round(input.height ?? 650));
  return `${user32Helpers()}
$window = Resolve-AppWindow -WindowId ${psString(input.windowId ?? '')} -ProcessName ${psString(resolveProcessName(input))} -TitleContains ${psString(input.titleContains ?? '')}
if (-not $window) { Write-OutputJson @{ ok = $false; action = 'resize'; windows = @(); error = 'Window not found.'; message = 'External app resize failed.' }; exit 0 }
[User32]::MoveWindow([IntPtr]$window.windowId, ${x}, ${y}, ${width}, ${height}, $true) | Out-Null
Start-Sleep -Milliseconds 80
$updated = Resolve-AppWindow -WindowId $window.windowId
if (-not $updated) {
  $window.bounds = @{ x = ${x}; y = ${y}; width = ${width}; height = ${height} }
  $updated = $window
}
Write-OutputJson @{ ok = $true; action = 'resize'; windows = @($updated); message = 'External app resized.' }`;
}

function buildSendKeysScript(action: 'typeText' | 'hotkey', input: WindowsWindowInput, sendKeys: string): string {
  return `${user32Helpers()}
Add-Type -AssemblyName System.Windows.Forms
$window = Resolve-AppWindow -WindowId ${psString(input.windowId ?? '')} -ProcessName ${psString(resolveProcessName(input))} -TitleContains ${psString(input.titleContains ?? '')}
if (-not $window) { Write-OutputJson @{ ok = $false; action = ${psString(action)}; windows = @(); error = 'Window not found.'; message = 'External app keyboard input failed.' }; exit 0 }
[User32]::SetForegroundWindow([IntPtr]$window.windowId) | Out-Null
Start-Sleep -Milliseconds 120
[System.Windows.Forms.SendKeys]::SendWait(${psString(sendKeys)})
$updated = Resolve-AppWindow -WindowId $window.windowId
if (-not $updated) { $updated = $window }
Write-OutputJson @{ ok = $true; action = ${psString(action)}; windows = @($updated); message = 'External app keyboard input completed.' }`;
}

function buildCloseScript(input: WindowsCloseInput): string {
  if (input.mode === 'process') {
    return `${jsonHelpers()}
$processes = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName -eq ${psString(resolveProcessName(input))} }
$processes | ForEach-Object { $_.CloseMainWindow() | Out-Null }
Write-OutputJson @{ ok = $true; action = 'close'; windows = @(); message = 'External app process close requested.' }`;
  }
  return `${user32Helpers()}
$window = Resolve-AppWindow -WindowId ${psString(input.windowId ?? '')} -ProcessName ${psString(resolveProcessName(input))} -TitleContains ${psString(input.titleContains ?? '')}
if (-not $window) { Write-OutputJson @{ ok = $false; action = 'close'; windows = @(); error = 'Window not found.'; message = 'External app close failed.' }; exit 0 }
[User32]::PostMessage([IntPtr]$window.windowId, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
Write-OutputJson @{ ok = $true; action = 'close'; windows = @($window); message = 'External app close requested.' }`;
}

function jsonHelpers(): string {
  return `
function Write-OutputJson($value) {
  $value | ConvertTo-Json -Depth 8 -Compress
}
function Get-AppWindows {
  param([string]$WindowId = '', [string]$ProcessName = '', [int]$ProcessId = 0, [string]$TitleContains = '')
  $items = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 }
  if ($WindowId) { $items = $items | Where-Object { "$($_.MainWindowHandle)" -eq $WindowId } }
  if ($ProcessId -gt 0) { $items = $items | Where-Object { $_.Id -eq $ProcessId } }
  if ($ProcessName) { $items = $items | Where-Object { $_.ProcessName -eq $ProcessName } }
  if ($TitleContains) { $items = $items | Where-Object { $_.MainWindowTitle -like "*$TitleContains*" } }
  $foreground = [User32]::GetForegroundWindow()
  @($items | ForEach-Object {
    $handle = [IntPtr]$_.MainWindowHandle
    $entry = @{
      windowId = "$($_.MainWindowHandle)";
      processId = $_.Id;
      title = $_.MainWindowTitle;
      isForeground = $foreground.ToInt64() -eq $handle.ToInt64()
    }
    $bounds = Get-WindowBounds -Handle $handle
    if ($bounds) { $entry.bounds = $bounds }
    $entry
  })
}
`.trim();
}

function user32Helpers(): string {
  return `${jsonHelpers()}
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class User32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, UInt32 Msg, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
}
[StructLayout(LayoutKind.Sequential)]
public struct RECT {
  public int Left;
  public int Top;
  public int Right;
  public int Bottom;
}
"@
function Get-WindowBounds {
  param([IntPtr]$Handle)
  $rect = New-Object RECT
  if ([User32]::GetWindowRect($Handle, [ref]$rect)) {
    return @{
      x = $rect.Left;
      y = $rect.Top;
      width = [Math]::Max(0, $rect.Right - $rect.Left);
      height = [Math]::Max(0, $rect.Bottom - $rect.Top)
    }
  }
  return $null
}
function Resolve-AppWindow {
  param([string]$WindowId = '', [string]$ProcessName = '', [string]$TitleContains = '')
  return @(Get-AppWindows -WindowId $WindowId -ProcessName $ProcessName -TitleContains $TitleContains) | Select-Object -First 1
}`;
}

function resolveProcessName(input: { executable?: string; processName?: string }): string {
  if (input.processName) return input.processName;
  if (!input.executable) return '';
  const base = path.basename(input.executable).replace(/\.[^.]+$/, '');
  return base || input.executable;
}

function psString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function sendKeysText(value: string): string {
  return value.replace(/[+^%~()[\]{}]/g, (match) => `{${match}}`);
}

function sendKeysHotkey(keys: string[]): string {
  const modifiers: Record<string, string> = {
    CTRL: '^',
    CONTROL: '^',
    ALT: '%',
    SHIFT: '+',
  };
  const normalized = keys.map((key) => key.trim()).filter(Boolean);
  const prefix = normalized
    .slice(0, -1)
    .map((key) => modifiers[key.toUpperCase()] ?? '')
    .join('');
  const last = normalized[normalized.length - 1] ?? '';
  return `${prefix}${last.length === 1 ? last.toLowerCase() : `{${last.toUpperCase()}}`}`;
}
