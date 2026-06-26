param(
  [string]$SourcePath = "",
  [string]$InstallPath = "C:\Tools\xenesis-desk-v0.1.0",
  [string]$BackupRoot = "",
  [switch]$DryRun,
  [switch]$StartApp
)

$ErrorActionPreference = "Stop"

function Resolve-FullPath {
  param([Parameter(Mandatory = $true)][string]$PathValue)
  return [System.IO.Path]::GetFullPath($PathValue)
}

function Test-PathInside {
  param(
    [Parameter(Mandatory = $true)][string]$PathValue,
    [Parameter(Mandatory = $true)][string]$BasePath
  )
  $fullPath = Resolve-FullPath $PathValue
  $fullBase = Resolve-FullPath $BasePath
  return $fullPath.StartsWith($fullBase.TrimEnd('\') + '\', [System.StringComparison]::OrdinalIgnoreCase) -or
    [System.String]::Equals($fullPath, $fullBase, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-InstallProcesses {
  param(
    [Parameter(Mandatory = $true)][string]$PathValue,
    [Parameter(Mandatory = $true)][string]$ExePath
  )

  $root = (Resolve-FullPath $PathValue).TrimEnd('\')
  $exe = Resolve-FullPath $ExePath

  return @(Get-CimInstance Win32_Process | Where-Object {
      $processPath = $_.ExecutablePath
      if ([string]::IsNullOrWhiteSpace($processPath)) {
        return $false
      }

      $resolvedProcessPath = Resolve-FullPath $processPath
      return [System.String]::Equals($resolvedProcessPath, $exe, [System.StringComparison]::OrdinalIgnoreCase) -or
        $resolvedProcessPath.StartsWith($root + '\', [System.StringComparison]::OrdinalIgnoreCase)
    } | Select-Object ProcessId, Name, ExecutablePath)
}

function Write-JsonResult {
  param([Parameter(Mandatory = $true)]$Value)
  $Value | ConvertTo-Json -Depth 6
}

$scriptRoot = Split-Path -Parent $PSCommandPath
$repoRoot = Resolve-FullPath (Join-Path $scriptRoot "..")

if ([string]::IsNullOrWhiteSpace($SourcePath)) {
  $SourcePath = Join-Path $repoRoot "release\win-unpacked"
}

$SourcePath = Resolve-FullPath $SourcePath
$InstallPath = Resolve-FullPath $InstallPath

if ([string]::IsNullOrWhiteSpace($BackupRoot)) {
  $BackupRoot = Join-Path (Split-Path -Parent $InstallPath) "xenesis-desk-backups"
}
$BackupRoot = Resolve-FullPath $BackupRoot

if (-not (Test-Path -LiteralPath $SourcePath -PathType Container)) {
  throw "Source path does not exist: $SourcePath"
}

$sourceExePath = Join-Path $SourcePath "Xenesis Desk.exe"
$sourceAsarPath = Join-Path $SourcePath "resources\app.asar"
if (-not (Test-Path -LiteralPath $sourceExePath -PathType Leaf)) {
  throw "Source app executable does not exist: $sourceExePath"
}
if (-not (Test-Path -LiteralPath $sourceAsarPath -PathType Leaf)) {
  throw "Source app.asar does not exist: $sourceAsarPath"
}

$installExePath = Join-Path $InstallPath "Xenesis Desk.exe"
$runningProcesses = Get-InstallProcesses -PathValue $InstallPath -ExePath $installExePath
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = Join-Path $BackupRoot ("xenesis-desk-v0.1.0-" + $timestamp)

$actions = @()
if (Test-Path -LiteralPath $InstallPath -PathType Container) {
  $actions += "move-install-to-backup"
}
$actions += "copy-release-to-install"
if ($StartApp) {
  $actions += "start-installed-app"
}

if ($DryRun) {
  Write-JsonResult @{
    ok = ($runningProcesses.Count -eq 0)
    dryRun = $true
    blocked = ($runningProcesses.Count -gt 0)
    sourcePath = $SourcePath
    installPath = $InstallPath
    backupPath = $backupPath
    runningProcessCount = $runningProcesses.Count
    runningProcesses = $runningProcesses
    actions = $actions
  }
  exit 0
}

if ($runningProcesses.Count -gt 0) {
  throw "Install path is still running. Close Xenesis Desk before replacing it: $InstallPath"
}

$started = $false
$startedProcessId = $null

try {
  if (-not (Test-Path -LiteralPath $BackupRoot -PathType Container)) {
    New-Item -ItemType Directory -Path $BackupRoot | Out-Null
  }

  if (Test-Path -LiteralPath $InstallPath -PathType Container) {
    Move-Item -LiteralPath $InstallPath -Destination $backupPath
  }

  Copy-Item -LiteralPath $SourcePath -Destination $InstallPath -Recurse -Force

  if ($StartApp) {
    $startedProcess = Start-Process -FilePath $installExePath -PassThru
    $started = $true
    $startedProcessId = $startedProcess.Id
  }
}
catch {
  $errorMessage = $_.Exception.Message
  $rollbackApplied = $false

  if ((Test-Path -LiteralPath $backupPath -PathType Container) -and -not (Test-Path -LiteralPath $InstallPath -PathType Container)) {
    Move-Item -LiteralPath $backupPath -Destination $InstallPath
    $rollbackApplied = $true
  }

  throw "Release replacement failed. rollbackApplied=$rollbackApplied. Error: $errorMessage"
}

Write-JsonResult @{
  ok = $true
  dryRun = $false
  sourcePath = $SourcePath
  installPath = $InstallPath
  backupPath = $backupPath
  started = $started
  startedProcessId = $startedProcessId
  actions = $actions
}
