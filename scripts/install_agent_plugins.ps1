param(
  [string]$WorkbenchRoot = (Split-Path -Parent $PSScriptRoot),
  [switch]$SkipCodexInstall
)

$ErrorActionPreference = "Stop"
$generic = Join-Path $WorkbenchRoot "codex-plugin\creator-super-agent"
$xinrui = Join-Path $WorkbenchRoot "codex-plugin\xinrui-ip-studio"
$pluginRoots = @($generic, $xinrui) | Where-Object { Test-Path (Join-Path $_ ".codex-plugin\plugin.json") }
if (-not $pluginRoots.Count) { throw "No agent plugin sources were found." }

node (Join-Path $WorkbenchRoot "scripts\validate_codex_plugins.mjs") @pluginRoots
if ($LASTEXITCODE -ne 0) { throw "Plugin validation failed." }
node (Join-Path $WorkbenchRoot "scripts\update_plugin_cachebuster.mjs") @pluginRoots
if ($LASTEXITCODE -ne 0) { throw "Plugin cachebuster update failed." }
node (Join-Path $WorkbenchRoot "scripts\register_personal_plugin.mjs") @pluginRoots
if ($LASTEXITCODE -ne 0) { throw "Personal plugin registration failed." }

if (-not $SkipCodexInstall -and (Get-Command codex -ErrorAction SilentlyContinue)) {
  foreach ($pluginRoot in $pluginRoots) {
    $manifest = Get-Content -Raw -Encoding utf8 (Join-Path $pluginRoot ".codex-plugin\plugin.json") | ConvertFrom-Json
    codex plugin add "$($manifest.name)@personal"
    if ($LASTEXITCODE -ne 0) { throw "$($manifest.name) installation failed." }
  }
}

$registeredNames = $pluginRoots | ForEach-Object {
  (Get-Content -Raw -Encoding utf8 (Join-Path $_ ".codex-plugin\plugin.json") | ConvertFrom-Json).name
}
Write-Host ("Registered plugins: " + ($registeredNames -join ", ") + ". Start a new Codex task to load the new versions.")
