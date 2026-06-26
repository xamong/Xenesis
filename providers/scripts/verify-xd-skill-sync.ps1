[CmdletBinding()]
param(
  [string]$PluginDir,
  [string]$SkillsRoot,
  [string]$CodexInstalledRoot,
  [string]$ClaudeInstalledRoot,
  [switch]$SkipGeneratedCheck,
  [switch]$SkipInstalled
)

$ErrorActionPreference = "Stop"

function Resolve-ExistingPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required path not found: $Path"
  }
  return (Resolve-Path -LiteralPath $Path).Path
}

function Resolve-FirstExistingPath {
  param(
    [Parameter(Mandatory = $true)][string[]]$Paths,
    [Parameter(Mandatory = $true)][string]$Description
  )

  foreach ($candidate in $Paths) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "Required path not found for $Description. Tried:`n$($Paths -join "`n")"
}

function Resolve-XvSkillPath {
  param(
    [Parameter(Mandatory = $true)][string]$SkillsRoot,
    [Parameter(Mandatory = $true)][string]$Provider
  )

  return Resolve-FirstExistingPath -Description "$Provider XD skill" -Paths @(
    (Join-Path $SkillsRoot "$Provider\xd\SKILL.md"),
    (Join-Path $SkillsRoot "$Provider\skills\xd\SKILL.md")
  )
}

function Get-ProviderSkillNames {
  param([Parameter(Mandatory = $true)][string]$SkillsRootPath)

  $names = Get-ChildItem -LiteralPath $SkillsRootPath -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "skills\xd\provider.psd1") } |
    ForEach-Object { $_.Name } |
    Sort-Object

  if (-not $names -or $names.Count -eq 0) {
    throw "No provider skill overlays found under $SkillsRootPath"
  }

  return [string[]]$names
}

function Get-SettingsCliAgents {
  param([Parameter(Mandatory = $true)][string]$LocalCliAgentsPath)

  if (-not (Test-Path -LiteralPath $LocalCliAgentsPath)) {
    throw "Settings CLI agent registry not found: $LocalCliAgentsPath"
  }

  $source = Read-Text $LocalCliAgentsPath
  $agents = New-Object System.Collections.Generic.List[object]
  foreach ($match in [regex]::Matches($source, 'id:\s*["'']([^"'']+)["''][\s\S]*?label:\s*["'']([^"'']+)["'']')) {
    $id = $match.Groups[1].Value.Trim()
    $label = $match.Groups[2].Value.Trim()
    if ($id) {
      [void]$agents.Add([pscustomobject]@{
        Id = $id
        Label = $label
      })
    }
  }

  if ($agents.Count -eq 0) {
    throw "No CLI agents found in $LocalCliAgentsPath"
  }

  return $agents
}

function Read-Text {
  param([Parameter(Mandatory = $true)][string]$Path)
  return Get-Content -Raw -LiteralPath $Path
}

function Add-Failure {
  param(
    [System.Collections.Generic.List[string]]$Failures,
    [string]$Message
  )
  [void]$Failures.Add($Message)
}

function Get-XvHelpCommands {
  param([Parameter(Mandatory = $true)][string]$PluginInitPath)

  $source = Read-Text $PluginInitPath
  $start = $source.IndexOf("def _xd_help()")
  if ($start -lt 0) {
    throw "Could not find def _xd_help() in $PluginInitPath"
  }
  $end = $source.IndexOf("def _format_error", $start)
  if ($end -lt 0) {
    throw "Could not find _xd_help() end marker in $PluginInitPath"
  }

  $helpBlock = $source.Substring($start, $end - $start)
  $commands = New-Object System.Collections.Generic.List[string]
  foreach ($match in [regex]::Matches($helpBlock, '"(/xd[^"]+)"')) {
    $command = $match.Groups[1].Value.Trim()
    if ($command -and -not $commands.Contains($command)) {
      [void]$commands.Add($command)
    }
  }
  return $commands
}

function Test-CommandCoverage {
  param(
    [Parameter(Mandatory = $true)][string]$SkillPath,
    [Parameter(Mandatory = $true)]$Commands,
    [Parameter(Mandatory = $true)]$Failures
  )

  $skill = Read-Text $SkillPath
  foreach ($command in $Commands) {
    if (-not $skill.Contains($command)) {
      Add-Failure $Failures "Missing command in $SkillPath : $command"
    }
  }
}

function Test-TermCoverage {
  param(
    [Parameter(Mandatory = $true)][string]$SkillPath,
    [Parameter(Mandatory = $true)]$Terms,
    [Parameter(Mandatory = $true)]$Failures
  )

  $skill = Read-Text $SkillPath
  foreach ($term in $Terms) {
    if (-not $skill.Contains($term)) {
      Add-Failure $Failures "Missing required term in $SkillPath : $term"
    }
  }
}

function Test-FileSync {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target,
    [Parameter(Mandatory = $true)]$Failures
  )

  if (-not (Test-Path -LiteralPath $Target)) {
    Add-Failure $Failures "Installed file missing: $Target"
    return
  }

  $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $Source).Hash
  $targetHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $Target).Hash
  if ($sourceHash -ne $targetHash) {
    Add-Failure $Failures "Installed file is not synced: $Target"
  }
}

function Test-GeneratedSkillSync {
  param(
    [Parameter(Mandatory = $true)][string]$SkillsRoot,
    [Parameter(Mandatory = $true)][string]$ScriptRoot,
    [Parameter(Mandatory = $true)]$Failures
  )

  $syncScript = Join-Path $ScriptRoot "sync-provider-skills.ps1"
  $sharedTemplate = Join-Path $SkillsRoot "shared\skills\xd\SKILL.md.template"
  if (-not (Test-Path -LiteralPath $syncScript) -or -not (Test-Path -LiteralPath $sharedTemplate)) {
    return
  }

  $syncOutput = & pwsh -NoProfile -File $syncScript -ProvidersRoot $SkillsRoot -Check 2>&1
  if ($LASTEXITCODE -ne 0) {
    Add-Failure $Failures ("Generated provider skills are out of sync:`n" + ($syncOutput -join "`n"))
  }
}

function Test-HermesPluginSync {
  param(
    [Parameter(Mandatory = $true)][string]$SkillsRoot,
    [Parameter(Mandatory = $true)][string]$ScriptRoot,
    [Parameter(Mandatory = $true)]$Failures
  )

  $syncScript = Join-Path $ScriptRoot "sync-hermes-plugins.ps1"
  $providerPluginRoot = Join-Path $SkillsRoot "hermes\plugins"
  if (-not (Test-Path -LiteralPath $syncScript) -or -not (Test-Path -LiteralPath $providerPluginRoot)) {
    return
  }

  $syncOutput = & pwsh -NoProfile -File $syncScript -ProvidersRoot $SkillsRoot -Check 2>&1
  if ($LASTEXITCODE -ne 0) {
    Add-Failure $Failures ("Hermes provider plugins are out of sync:`n" + ($syncOutput -join "`n"))
  }
}

function Test-SettingsCliCoverage {
  param(
    [Parameter(Mandatory = $true)][string]$LocalCliAgentsPath,
    [Parameter(Mandatory = $true)][string]$SkillsRootPath,
    [Parameter(Mandatory = $true)][string[]]$ProviderNames,
    [Parameter(Mandatory = $true)][string]$HermesPluginDir,
    [Parameter(Mandatory = $true)]$Failures
  )

  $agents = Get-SettingsCliAgents -LocalCliAgentsPath $LocalCliAgentsPath
  $agentById = @{}
  foreach ($agent in $agents) {
    if ($agentById.ContainsKey($agent.Id)) {
      Add-Failure $Failures "Duplicate Settings CLI agent id: $($agent.Id)"
      continue
    }
    $agentById[$agent.Id] = $agent
  }

  $coveredIds = @{}
  foreach ($provider in $ProviderNames) {
    $coveredIds[$provider] = "provider skill"
    if (-not $agentById.ContainsKey($provider)) {
      Add-Failure $Failures "Provider skill has no Settings CLI agent entry: $provider"
      continue
    }

    $overlayPath = Join-Path $SkillsRootPath "$provider\skills\xd\provider.psd1"
    $overlay = Import-PowerShellDataFile -LiteralPath $overlayPath
    if ($overlay.ContainsKey("Label")) {
      $expectedLabel = [string]$agentById[$provider].Label
      $actualLabel = [string]$overlay["Label"]
      if ($actualLabel -ne $expectedLabel) {
        Add-Failure $Failures "Provider label mismatch for $provider : provider.psd1='$actualLabel', Settings='$expectedLabel'"
      }
    }
  }

  if (Test-Path -LiteralPath (Join-Path $HermesPluginDir "plugin.yaml")) {
    $coveredIds["hermes"] = "Hermes plugin"
  }

  foreach ($agent in $agents) {
    if (-not $coveredIds.ContainsKey($agent.Id)) {
      Add-Failure $Failures "Settings CLI agent has no XD provider coverage: $($agent.Id)"
    }
  }
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $SkillsRoot) {
  $SkillsRoot = Join-Path $scriptRoot ".."
}
if (-not $CodexInstalledRoot) {
  $CodexInstalledRoot = Join-Path $HOME ".codex\skills\xd"
}
if (-not $ClaudeInstalledRoot) {
  $ClaudeInstalledRoot = Join-Path $HOME ".claude\skills\xd"
}

$skillsRootPath = Resolve-ExistingPath $SkillsRoot
if (-not $PluginDir) {
  $PluginDir = Resolve-FirstExistingPath -Description "Hermes Xenesis Desk plugin" -Paths @(
    (Join-Path $skillsRootPath "hermes\plugins\xenesis_desk_gateway"),
    (Join-Path $scriptRoot "..\..\..\draft\hermes-agent-main\plugins\xenesis_desk_gateway"),
    (Join-Path $scriptRoot "..\..\hermes-agent-main\plugins\xenesis_desk_gateway")
  )
}
$pluginPath = Resolve-ExistingPath $PluginDir
$pluginInit = Resolve-ExistingPath (Join-Path $pluginPath "__init__.py")
$projectRootPath = Resolve-ExistingPath (Join-Path $skillsRootPath "..")
$localCliAgentsPath = Join-Path $projectRootPath "src\main\localCliAgents.mjs"
$providerNames = Get-ProviderSkillNames -SkillsRootPath $skillsRootPath
$providerSkillPaths = @{}
foreach ($provider in $providerNames) {
  $providerSkillPaths[$provider] = Resolve-XvSkillPath -SkillsRoot $skillsRootPath -Provider $provider
}

$commands = Get-XvHelpCommands $pluginInit
$requiredTerms = @(
  "Hermes Gateway Command Families",
  "XCON And PDF Flow",
  "xenesis_desk_mobile_create_xcon_markdown_from_content",
  "xenesis_desk_mobile_create_xcon_markdown",
  "xenesis_desk_mobile_export_xcon_pdf",
  "exportPdf:true",
  "pdfOutDir",
  "openInDesk:false",
  "full Markdown document",
  'mode` defaults to `view'
)

$failures = New-Object System.Collections.Generic.List[string]
if (-not $SkipGeneratedCheck) {
  Test-GeneratedSkillSync -SkillsRoot $skillsRootPath -ScriptRoot $scriptRoot -Failures $failures
  Test-HermesPluginSync -SkillsRoot $skillsRootPath -ScriptRoot $scriptRoot -Failures $failures
}
Test-SettingsCliCoverage `
  -LocalCliAgentsPath $localCliAgentsPath `
  -SkillsRootPath $skillsRootPath `
  -ProviderNames $providerNames `
  -HermesPluginDir $pluginPath `
  -Failures $failures

foreach ($provider in $providerNames) {
  $skillPath = $providerSkillPaths[$provider]
  Test-CommandCoverage -SkillPath $skillPath -Commands $commands -Failures $failures
  Test-TermCoverage -SkillPath $skillPath -Terms $requiredTerms -Failures $failures
}

if (-not $SkipInstalled) {
  $codexSkill = $providerSkillPaths["codex"]
  $claudeSkill = $providerSkillPaths["claude"]
  $codexSkillDir = Split-Path -Parent $codexSkill
  $claudeSkillDir = Split-Path -Parent $claudeSkill
  Test-FileSync -Source $codexSkill -Target (Join-Path $CodexInstalledRoot "SKILL.md") -Failures $failures
  Test-FileSync -Source (Join-Path $codexSkillDir "references\windows-wsl-hermes-gateway.md") -Target (Join-Path $CodexInstalledRoot "references\windows-wsl-hermes-gateway.md") -Failures $failures
  Test-FileSync -Source (Join-Path $codexSkillDir "agents\openai.yaml") -Target (Join-Path $CodexInstalledRoot "agents\openai.yaml") -Failures $failures
  Test-FileSync -Source $claudeSkill -Target (Join-Path $ClaudeInstalledRoot "SKILL.md") -Failures $failures
  Test-FileSync -Source (Join-Path $claudeSkillDir "references\windows-wsl-hermes-gateway.md") -Target (Join-Path $ClaudeInstalledRoot "references\windows-wsl-hermes-gateway.md") -Failures $failures
}

if ($failures.Count -gt 0) {
  Write-Error ("XD skill sync verification failed:`n" + ($failures -join "`n"))
  exit 1
}

Write-Output "XD skill sync verification passed."
Write-Output "Commands checked: $($commands.Count)"
Write-Output "Provider skills checked: $($providerNames -join ', ')"
Write-Output "Skills root: $skillsRootPath"
Write-Output "Plugin dir: $pluginPath"
if (-not $SkipInstalled) {
  Write-Output "Installed Codex skill: $CodexInstalledRoot"
  Write-Output "Installed Claude skill: $ClaudeInstalledRoot"
}
