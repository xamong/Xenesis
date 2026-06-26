[CmdletBinding()]
param(
  [string]$ProvidersRoot,
  [string[]]$Providers,
  [switch]$Check
)

$ErrorActionPreference = "Stop"

function Resolve-ExistingPath {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required path not found: $Path"
  }

  return (Resolve-Path -LiteralPath $Path).Path
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  return [System.IO.File]::ReadAllText($Path)
}

function Write-Text {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$Content
  )

  $directory = Split-Path -Parent $Path
  if ($directory) {
    New-Item -ItemType Directory -Force -Path $directory | Out-Null
  }

  $encoding = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Add-Failure {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Message
  )
  [void]$Failures.Add($Message)
}

function Test-OrWriteText {
  param(
    [Parameter(Mandatory = $true)][string]$SourceDescription,
    [Parameter(Mandatory = $true)][string]$TargetPath,
    [Parameter(Mandatory = $true)][string]$ExpectedContent,
    [Parameter(Mandatory = $true)]$Failures
  )

  if ($Check) {
    if (-not (Test-Path -LiteralPath $TargetPath)) {
      Add-Failure $Failures "Missing generated file: $TargetPath"
      return
    }

    $actualContent = Read-Text $TargetPath
    if ($actualContent -ne $ExpectedContent) {
      Add-Failure $Failures "Out of sync: $TargetPath (source: $SourceDescription)"
    }
    return
  }

  Write-Text -Path $TargetPath -Content $ExpectedContent
}

function Render-Template {
  param(
    [Parameter(Mandatory = $true)][string]$Template,
    [Parameter(Mandatory = $true)][hashtable]$Values
  )

  $rendered = $Template
  foreach ($key in $Values.Keys) {
    $token = "{{" + $key + "}}"
    $rendered = $rendered.Replace($token, [string]$Values[$key])
  }

  $unresolved = [regex]::Matches($rendered, "\{\{[A-Z_]+\}\}")
  if ($unresolved.Count -gt 0) {
    $tokens = $unresolved | ForEach-Object { $_.Value } | Sort-Object -Unique
    throw "Unresolved template tokens: $($tokens -join ', ')"
  }

  return $rendered
}

function Get-RequiredOverlayValue {
  param(
    [Parameter(Mandatory = $true)]$Overlay,
    [Parameter(Mandatory = $true)][string]$Key,
    [Parameter(Mandatory = $true)][string]$OverlayPath
  )

  if (-not $Overlay.ContainsKey($Key)) {
    throw "Missing required overlay key '$Key' in $OverlayPath"
  }

  return $Overlay[$Key]
}

function Get-ProviderSkillNames {
  param([Parameter(Mandatory = $true)][string]$ProvidersRootPath)

  $names = Get-ChildItem -LiteralPath $ProvidersRootPath -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "skills\xd\provider.psd1") } |
    ForEach-Object { $_.Name } |
    Sort-Object

  if (-not $names -or $names.Count -eq 0) {
    throw "No provider skill overlays found under $ProvidersRootPath"
  }

  return [string[]]$names
}

function Sync-ProviderSkill {
  param(
    [Parameter(Mandatory = $true)][string]$Provider,
    [Parameter(Mandatory = $true)][string]$ProvidersRootPath,
    [Parameter(Mandatory = $true)][string]$Template,
    [Parameter(Mandatory = $true)][string]$SharedReference,
    [Parameter(Mandatory = $true)]$Failures
  )

  $skillDir = Resolve-ExistingPath (Join-Path $ProvidersRootPath "$Provider\skills\xd")
  $overlayPath = Resolve-ExistingPath (Join-Path $skillDir "provider.psd1")
  $overlay = Import-PowerShellDataFile -LiteralPath $overlayPath

  $values = @{
    "PRIMARY_HOST" = Get-RequiredOverlayValue -Overlay $overlay -Key "PrimaryHost" -OverlayPath $overlayPath
    "SECONDARY_HOST" = Get-RequiredOverlayValue -Overlay $overlay -Key "SecondaryHost" -OverlayPath $overlayPath
    "HOST_PAIR_OR" = Get-RequiredOverlayValue -Overlay $overlay -Key "HostPairOr" -OverlayPath $overlayPath
    "HOST_PAIR_AND" = Get-RequiredOverlayValue -Overlay $overlay -Key "HostPairAnd" -OverlayPath $overlayPath
    "HOST_PAIR_SLASH" = Get-RequiredOverlayValue -Overlay $overlay -Key "HostPairSlash" -OverlayPath $overlayPath
    "SKILL_VARIABLE_SENTENCE" = Get-RequiredOverlayValue -Overlay $overlay -Key "SkillVariableSentence" -OverlayPath $overlayPath
  }

  $renderedSkill = Render-Template -Template $Template -Values $values
  Test-OrWriteText `
    -SourceDescription "shared/skills/xd/SKILL.md.template + $Provider overlay" `
    -TargetPath (Join-Path $skillDir "SKILL.md") `
    -ExpectedContent $renderedSkill `
    -Failures $Failures

  Test-OrWriteText `
    -SourceDescription "shared/skills/xd/references/windows-wsl-hermes-gateway.md" `
    -TargetPath (Join-Path $skillDir "references\windows-wsl-hermes-gateway.md") `
    -ExpectedContent $SharedReference `
    -Failures $Failures
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ProvidersRoot) {
  $ProvidersRoot = Join-Path $scriptRoot ".."
}

$providersRootPath = Resolve-ExistingPath $ProvidersRoot
$sharedSkillDir = Resolve-ExistingPath (Join-Path $providersRootPath "shared\skills\xd")
$templatePath = Resolve-ExistingPath (Join-Path $sharedSkillDir "SKILL.md.template")
$sharedReferencePath = Resolve-ExistingPath (Join-Path $sharedSkillDir "references\windows-wsl-hermes-gateway.md")

$Providers = @($Providers | Where-Object { $_ -and $_.Trim() } | ForEach-Object { $_.Trim() })
if (-not $Providers -or $Providers.Count -eq 0) {
  $Providers = Get-ProviderSkillNames -ProvidersRootPath $providersRootPath
} else {
  $Providers = @($Providers | Sort-Object -Unique)
}

$template = Read-Text $templatePath
$sharedReference = Read-Text $sharedReferencePath
$failures = [System.Collections.Generic.List[string]]::new()

foreach ($provider in $Providers) {
  Sync-ProviderSkill `
    -Provider $provider `
    -ProvidersRootPath $providersRootPath `
    -Template $template `
    -SharedReference $sharedReference `
    -Failures $failures
}

if ($failures.Count -gt 0) {
  Write-Error ("Provider skill sync check failed:`n" + ($failures -join "`n"))
  exit 1
}

if ($Check) {
  Write-Output "Provider skill sync check passed."
} else {
  Write-Output "Provider skills synced."
}
Write-Output "Providers root: $providersRootPath"
Write-Output "Providers checked: $($Providers -join ', ')"
