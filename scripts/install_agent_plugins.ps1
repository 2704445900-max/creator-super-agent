param(
  [string]$WorkbenchRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$SkipCodexInstall
)

$ErrorActionPreference = "Stop"
$pluginRoot = Join-Path $WorkbenchRoot "codex-plugin\creator-super-agent"
if (-not (Test-Path (Join-Path $pluginRoot ".codex-plugin\plugin.json"))) {
  throw "Creator Super Agent plugin source was not found."
}

node (Join-Path $WorkbenchRoot "scripts\validate_codex_plugins.mjs") $pluginRoot
if ($LASTEXITCODE -ne 0) { throw "Plugin validation failed." }
node (Join-Path $WorkbenchRoot "scripts\update_plugin_cachebuster.mjs") $pluginRoot
if ($LASTEXITCODE -ne 0) { throw "Plugin cachebuster update failed." }
node (Join-Path $WorkbenchRoot "scripts\register_personal_plugin.mjs") $pluginRoot
if ($LASTEXITCODE -ne 0) { throw "Personal plugin registration failed." }

if (-not $SkipCodexInstall -and (Get-Command codex -ErrorAction SilentlyContinue)) {
  codex plugin add creator-super-agent@personal
  if ($LASTEXITCODE -ne 0) { throw "creator-super-agent installation failed." }
}

Write-Host "Registered plugin: creator-super-agent. Start a new Codex task to load the new version."
