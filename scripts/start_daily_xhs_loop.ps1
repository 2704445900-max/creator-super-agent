$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LoopScript = Join-Path $ProjectRoot "scripts\daily_xhs_loop.ps1"

Start-Process powershell.exe `
  -WindowStyle Hidden `
  -WorkingDirectory $ProjectRoot `
  -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-File", "`"$LoopScript`""
  )
