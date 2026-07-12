$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $ProjectRoot "logs"
$StatePath = Join-Path $LogDir "xhs-daily-loop-state.txt"
$LogPath = Join-Path $LogDir "xhs-daily-loop.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
Set-Location -LiteralPath $ProjectRoot

function Write-LoopLog($Message) {
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
}

Write-LoopLog "daily_xhs_loop started"

while ($true) {
  try {
    $now = Get-Date
    $today = $now.ToString("yyyy-MM-dd")
    $lastRun = ""
    if (Test-Path -LiteralPath $StatePath) {
      $lastRun = (Get-Content -LiteralPath $StatePath -Raw).Trim()
    }

    if ($now.Hour -ge 9 -and $lastRun -ne $today) {
      Write-LoopLog "running daily:xhs for $today"
      npm run daily:xhs *> $null
      if ($LASTEXITCODE -eq 0) {
        Set-Content -LiteralPath $StatePath -Value $today -Encoding UTF8
        Write-LoopLog "daily:xhs completed for $today"
      } else {
        Write-LoopLog "daily:xhs failed with exit code $LASTEXITCODE"
      }
    }
  } catch {
    Write-LoopLog "error: $($_.Exception.Message)"
  }

  Start-Sleep -Seconds 300
}
