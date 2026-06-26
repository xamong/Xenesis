[CmdletBinding()]
param(
  [string]$ProvidersRoot,
  [string]$DraftHermesRoot,
  [switch]$Check,
  [switch]$ToDraft,
  [switch]$UseJunction,
  [switch]$ToWsl,
  [string]$WslPluginsRoot = "~/.hermes/hermes-agent/plugins",
  [string]$WslDistro,
  [switch]$CleanCache
)

$ErrorActionPreference = "Stop"

$PluginMappings = @(
  @{
    Name = "xenesis_desk_gateway"
    SourceRelative = "hermes\plugins\xenesis_desk_gateway"
    DraftRelative = "plugins\xenesis_desk_gateway"
    WslRelative = "xenesis_desk_gateway"
  },
  @{
    Name = "xenesis_desk_bot"
    SourceRelative = "hermes\plugins\platforms\xenesis_desk_bot"
    DraftRelative = "plugins\platforms\xenesis_desk_bot"
    WslRelative = "platforms/xenesis_desk_bot"
  }
)

function Resolve-ExistingPath {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required path not found: $Path"
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

function Resolve-OrCreateDirectory {
  param([Parameter(Mandatory = $true)][string]$Path)

  New-Item -ItemType Directory -Force -Path $Path | Out-Null
  return (Resolve-Path -LiteralPath $Path).Path
}

function Test-IsUnderRoot {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Root
  )

  $rootWithSeparator = $Root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  return $Path.Equals($Root, [System.StringComparison]::OrdinalIgnoreCase) -or
    $Path.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
}

function Assert-UnderRoot {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$Description
  )

  if (-not (Test-IsUnderRoot -Path $Path -Root $Root)) {
    throw "Refusing to operate outside $Description root: $Path"
  }
}

function Add-Failure {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Message
  )
  [void]$Failures.Add($Message)
}

function Get-PluginFileHashes {
  param([Parameter(Mandatory = $true)][string]$Root)

  $resolvedRoot = Resolve-ExistingPath $Root
  $files = Get-ChildItem -LiteralPath $resolvedRoot -Recurse -File -Force |
    Where-Object {
      $_.FullName -notmatch "\\__pycache__\\" -and
      $_.Extension -ne ".pyc"
    }

  $map = @{}
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($resolvedRoot.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar)
    $map[$relative] = (Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash
  }

  return $map
}

function Compare-PluginDirectories {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)]$Failures
  )

  if (-not (Test-Path -LiteralPath $Target)) {
    Add-Failure $Failures "Missing $Label target: $Target"
    return
  }

  $sourceMap = Get-PluginFileHashes $Source
  $targetMap = Get-PluginFileHashes $Target
  foreach ($relative in ($sourceMap.Keys | Sort-Object)) {
    if (-not $targetMap.ContainsKey($relative)) {
      Add-Failure $Failures "Missing file in $Label target: $relative"
    } elseif ($sourceMap[$relative] -ne $targetMap[$relative]) {
      Add-Failure $Failures "Hash mismatch in $Label target: $relative"
    }
  }

  foreach ($relative in ($targetMap.Keys | Sort-Object)) {
    if (-not $sourceMap.ContainsKey($relative)) {
      Add-Failure $Failures "Extra file in $Label target: $relative"
    }
  }
}

function Remove-PythonCaches {
  param(
    [Parameter(Mandatory = $true)][string]$Root,
    [Parameter(Mandatory = $true)][string]$AllowedRoot
  )

  $resolvedRoot = Resolve-ExistingPath $Root
  Assert-UnderRoot -Path $resolvedRoot -Root $AllowedRoot -Description "allowed"

  $pycFiles = Get-ChildItem -LiteralPath $resolvedRoot -Recurse -Force -File -Filter "*.pyc"
  foreach ($file in $pycFiles) {
    $resolved = (Resolve-Path -LiteralPath $file.FullName).Path
    Assert-UnderRoot -Path $resolved -Root $AllowedRoot -Description "allowed"
    Remove-Item -LiteralPath $resolved -Force
  }

  $cacheDirs = Get-ChildItem -LiteralPath $resolvedRoot -Recurse -Force -Directory -Filter "__pycache__" |
    Sort-Object FullName -Descending
  foreach ($directory in $cacheDirs) {
    $resolved = (Resolve-Path -LiteralPath $directory.FullName).Path
    Assert-UnderRoot -Path $resolved -Root $AllowedRoot -Description "allowed"
    Remove-Item -LiteralPath $resolved -Recurse -Force
  }
}

function Get-JunctionTarget {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return $null
  }

  $item = Get-Item -LiteralPath $Path -Force
  if (-not ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
    return $null
  }

  $target = $item.Target
  if ($target -is [array]) {
    $target = $target[0]
  }

  if (-not $target) {
    return $null
  }

  return (Resolve-Path -LiteralPath $target).Path
}

function Ensure-Junction {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$DraftPluginsRoot,
    [Parameter(Mandatory = $true)][string]$BackupRoot
  )

  $resolvedSource = Resolve-ExistingPath $Source
  $targetParent = Split-Path -Parent $Target
  Resolve-OrCreateDirectory $targetParent | Out-Null
  $resolvedParent = Resolve-ExistingPath $targetParent
  Assert-UnderRoot -Path $resolvedParent -Root $DraftPluginsRoot -Description "draft plugins"

  if (Test-Path -LiteralPath $Target) {
    $currentTarget = Get-JunctionTarget -Path $Target
    if ($currentTarget -and $currentTarget.Equals($resolvedSource, [System.StringComparison]::OrdinalIgnoreCase)) {
      return "Junction already current: $Target"
    }

    $resolvedTarget = (Resolve-Path -LiteralPath $Target).Path
    Assert-UnderRoot -Path $resolvedTarget -Root $DraftPluginsRoot -Description "draft plugins"
    $relativeName = $Target.Substring($DraftPluginsRoot.Length).TrimStart([System.IO.Path]::DirectorySeparatorChar).Replace("\", "__")
    $backupPath = Join-Path $BackupRoot $relativeName
    Resolve-OrCreateDirectory (Split-Path -Parent $backupPath) | Out-Null
    Move-Item -LiteralPath $Target -Destination $backupPath
  }

  New-Item -ItemType Junction -Path $Target -Target $resolvedSource | Out-Null
  return "Junction created: $Target -> $resolvedSource"
}

function Copy-DirectoryMirror {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)][string]$DraftPluginsRoot
  )

  $resolvedSource = Resolve-ExistingPath $Source
  $targetParent = Split-Path -Parent $Target
  Resolve-OrCreateDirectory $targetParent | Out-Null
  $resolvedParent = Resolve-ExistingPath $targetParent
  Assert-UnderRoot -Path $resolvedParent -Root $DraftPluginsRoot -Description "draft plugins"

  if (Test-Path -LiteralPath $Target) {
    $resolvedTarget = (Resolve-Path -LiteralPath $Target).Path
    Assert-UnderRoot -Path $resolvedTarget -Root $DraftPluginsRoot -Description "draft plugins"
    Remove-Item -LiteralPath $Target -Recurse -Force
  }

  Copy-Item -LiteralPath $resolvedSource -Destination $Target -Recurse -Force
}

function Convert-ToWslPath {
  param(
    [Parameter(Mandatory = $true)][string]$WindowsPath,
    [string]$Distro
  )

  $args = @()
  if ($Distro) {
    $args += @("-d", $Distro)
  }
  $args += @("wslpath", "-a", $WindowsPath)
  $output = & wsl.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw "wslpath failed for $WindowsPath"
  }
  return ($output | Select-Object -First 1).Trim()
}

function Get-WslHome {
  param([string]$Distro)

  $args = @()
  if ($Distro) {
    $args += @("-d", $Distro)
  }
  $args += @("sh", "-lc", 'printf %s "$HOME"')
  $output = & wsl.exe @args
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to resolve WSL HOME"
  }
  $wslHome = ($output | Select-Object -First 1).Trim().TrimEnd("/")
  if (-not $wslHome) {
    throw "WSL HOME resolved to an empty path"
  }
  return $wslHome
}

function Resolve-WslRootPath {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [string]$Distro
  )

  $value = $Path.TrimEnd("/")
  if ($value -eq "~") {
    return Get-WslHome -Distro $Distro
  }
  if ($value.StartsWith("~/")) {
    $wslHome = Get-WslHome -Distro $Distro
    return "$wslHome/$($value.Substring(2))"
  }
  return $value
}

function Quote-Sh {
  param([Parameter(Mandatory = $true)][string]$Value)
  return "'" + $Value.Replace("'", "'\''") + "'"
}

function Copy-PluginToWsl {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$DestinationRelative,
    [Parameter(Mandatory = $true)][string]$WslRoot,
    [string]$Distro
  )

  $sourceWslPath = Convert-ToWslPath -WindowsPath (Resolve-ExistingPath $Source) -Distro $Distro
  $root = Resolve-WslRootPath -Path $WslRoot -Distro $Distro
  $destination = "$root/$DestinationRelative"
  $script = @"
set -e
src=$(Quote-Sh $sourceWslPath)
root=$(Quote-Sh $root)
dest=$(Quote-Sh $destination)
case "`$dest" in
  "`$root"/*) ;;
  *) echo "Refusing to write outside WSL plugin root: `$dest" >&2; exit 2 ;;
esac
mkdir -p -- "`$(dirname -- "`$dest")"
rm -rf -- "`$dest"
mkdir -p -- "`$dest"
cp -a -- "`$src/." "`$dest/"
find "`$dest" -type d -name __pycache__ -prune -exec rm -rf {} +
find "`$dest" -type f -name '*.pyc' -delete
"@

  $args = @()
  if ($Distro) {
    $args += @("-d", $Distro)
  }
  $args += @("sh", "-s")
  $script = $script -replace "`r`n", "`n"
  $script = $script -replace "`r", "`n"

  $processInfo = [System.Diagnostics.ProcessStartInfo]::new("wsl.exe")
  foreach ($arg in $args) {
    [void]$processInfo.ArgumentList.Add($arg)
  }
  $processInfo.RedirectStandardInput = $true
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  $processInfo.UseShellExecute = $false

  $process = [System.Diagnostics.Process]::Start($processInfo)
  $process.StandardInput.NewLine = "`n"
  $process.StandardInput.Write($script)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($stdout) {
    [Console]::Out.Write($stdout)
  }
  if ($stderr) {
    [Console]::Error.Write($stderr)
  }
  if ($process.ExitCode -ne 0) {
    throw "WSL copy failed for $DestinationRelative"
  }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProvidersRoot) {
  $ProvidersRoot = Join-Path $scriptRoot ".."
}

$providersRootPath = Resolve-ExistingPath $ProvidersRoot
$providerPluginsRoot = Resolve-ExistingPath (Join-Path $providersRootPath "hermes\plugins")
$runCheck = $Check -or (-not $ToDraft -and -not $ToWsl -and -not $CleanCache)
$needsDraftRoot = $ToDraft -or $runCheck
$draftHermesRootWasExplicit = [bool]$DraftHermesRoot
$draftHermesRootPath = ""
$draftPluginsRoot = ""

if ($needsDraftRoot) {
  if (-not $DraftHermesRoot) {
    foreach ($candidate in @(
      (Join-Path $providersRootPath "..\..\draft\hermes-agent-main"),
      (Join-Path $providersRootPath "..\draft\hermes-agent-main")
    )) {
      if (Test-Path -LiteralPath $candidate) {
        $DraftHermesRoot = $candidate
        break
      }
    }
    if (-not $DraftHermesRoot) {
      $DraftHermesRoot = Join-Path $providersRootPath "..\..\draft\hermes-agent-main"
    }
  }
  $draftHermesRootPath = Resolve-ExistingPath $DraftHermesRoot
  $draftPluginsPath = Join-Path $draftHermesRootPath "plugins"
  if ($ToDraft) {
    $draftPluginsRoot = Resolve-OrCreateDirectory $draftPluginsPath
  } elseif (Test-Path -LiteralPath $draftPluginsPath) {
    $draftPluginsRoot = Resolve-ExistingPath $draftPluginsPath
  } elseif ($draftHermesRootWasExplicit) {
    $draftPluginsRoot = Resolve-ExistingPath $draftPluginsPath
  } else {
    Write-Warning "Draft Hermes plugins root not found; draft sync check will be skipped: $draftPluginsPath"
  }
}

$failures = [System.Collections.Generic.List[string]]::new()

if ($CleanCache) {
  Remove-PythonCaches -Root $providerPluginsRoot -AllowedRoot $providerPluginsRoot
}

if ($ToDraft) {
  $backupRoot = Join-Path $draftPluginsRoot (".xenis-plugin-backups\" + (Get-Date -Format "yyyyMMdd-HHmmss"))
  foreach ($plugin in $PluginMappings) {
    $source = Join-Path $providersRootPath $plugin.SourceRelative
    $target = Join-Path $draftHermesRootPath $plugin.DraftRelative
    if ($UseJunction) {
      Ensure-Junction -Source $source -Target $target -DraftPluginsRoot $draftPluginsRoot -BackupRoot $backupRoot | Write-Output
    } else {
      Copy-DirectoryMirror -Source $source -Target $target -DraftPluginsRoot $draftPluginsRoot
      Write-Output "Copied: $target"
    }
  }
}

if ($ToWsl) {
  foreach ($plugin in $PluginMappings) {
    $source = Join-Path $providersRootPath $plugin.SourceRelative
    Copy-PluginToWsl -Source $source -DestinationRelative $plugin.WslRelative -WslRoot $WslPluginsRoot -Distro $WslDistro
    Write-Output "Copied to WSL: $($plugin.WslRelative)"
  }
}

if ($runCheck) {
  if (-not $draftPluginsRoot) {
    Write-Output "Hermes plugin sync check skipped: draft plugins root not found."
    Write-Output "Providers root: $providersRootPath"
    Write-Output "Draft Hermes root: $draftHermesRootPath"
    exit 0
  }

  foreach ($plugin in $PluginMappings) {
    $source = Join-Path $providersRootPath $plugin.SourceRelative
    $draftTarget = Join-Path $draftHermesRootPath $plugin.DraftRelative
    Compare-PluginDirectories -Source $source -Target $draftTarget -Label "draft/$($plugin.Name)" -Failures $failures
  }

  if ($failures.Count -gt 0) {
    Write-Error ("Hermes plugin sync check failed:`n" + ($failures -join "`n"))
    exit 1
  }

  Write-Output "Hermes plugin sync check passed."
}

Write-Output "Providers root: $providersRootPath"
if ($draftHermesRootPath) {
  Write-Output "Draft Hermes root: $draftHermesRootPath"
}
