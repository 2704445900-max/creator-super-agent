param(
  [string]$ComfyRoot = "",
  [switch]$Wait
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $ComfyRoot) {
  $ComfyRoot = Join-Path (Join-Path $ProjectRoot "tools") "ComfyUI_windows_portable"
}

$candidates = @(
  (Join-Path $ComfyRoot "run_nvidia_gpu.bat"),
  (Join-Path $ComfyRoot "run_nvidia_gpu_fast_fp16_accumulation.bat"),
  (Join-Path $ComfyRoot "ComfyUI\main.py")
)

$launchNote = ""
if (Test-Path -LiteralPath $candidates[0]) {
  Start-Process -FilePath $candidates[0] -WorkingDirectory $ComfyRoot -WindowStyle Hidden
  $launchNote = "Started ComfyUI portable with run_nvidia_gpu.bat."
} elseif (Test-Path -LiteralPath $candidates[1]) {
  Start-Process -FilePath $candidates[1] -WorkingDirectory $ComfyRoot -WindowStyle Hidden
  $launchNote = "Started ComfyUI portable with run_nvidia_gpu_fast_fp16_accumulation.bat."
} elseif (Test-Path -LiteralPath $candidates[2]) {
  $python = Join-Path $ComfyRoot "python_embeded\python.exe"
  if (-not (Test-Path -LiteralPath $python)) {
    throw "ComfyUI python_embeded runtime not found: $python"
  }
  Start-Process -FilePath $python -ArgumentList @("-s", $candidates[2], "--listen", "127.0.0.1", "--port", "8188") -WorkingDirectory (Join-Path $ComfyRoot "ComfyUI") -WindowStyle Hidden
  $launchNote = "Started ComfyUI portable with python_embeded."
} else {
  $desktopExe = Join-Path $env:LOCALAPPDATA "Programs\Comfy Desktop\Comfy Desktop.exe"
  if (Test-Path -LiteralPath $desktopExe) {
    Start-Process -FilePath $desktopExe
    $launchNote = "ComfyUI portable install was not found; launched Comfy Desktop. Finish its first-run download/install if 8188 does not become reachable."
  } else {
    throw "ComfyUI portable install was not found at $ComfyRoot, and Comfy Desktop was not found. Run scripts\setup_comfyui_backend.ps1 or install Comfy Desktop first."
  }
}

Write-Host $launchNote

if ($Wait) {
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $stats = Invoke-RestMethod -Uri "http://127.0.0.1:8188/system_stats" -Method Get -TimeoutSec 2
      $stats | ConvertTo-Json -Depth 5
      exit 0
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  throw "ComfyUI did not become reachable at http://127.0.0.1:8188 within 120 seconds. If Comfy Desktop opened, complete its standalone backend/model download first; then rerun npm run comfyui:start."
}
