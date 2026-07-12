param(
  [string]$InstallRoot = "",
  [string]$DownloadRoot = "",
  [string]$AssetName = "ComfyUI_windows_portable_nvidia_cu126.7z",
  [string]$ReleaseTag = "v0.27.0"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $InstallRoot) {
  $InstallRoot = Join-Path $ProjectRoot "tools"
}
if (-not $DownloadRoot) {
  $DownloadRoot = Join-Path $ProjectRoot "downloads"
}

$SevenZipUrl = "https://www.7-zip.org/a/7zr.exe"
$ComfyUrl = "https://github.com/Comfy-Org/ComfyUI/releases/download/$ReleaseTag/$AssetName"
$SevenZipPath = Join-Path $InstallRoot "7zr.exe"
$ArchivePath = Join-Path $DownloadRoot $AssetName
$ComfyRoot = Join-Path $InstallRoot "ComfyUI_windows_portable"

function Download-File($Url, $OutFile) {
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    & $curl.Source -L --fail --retry 5 --retry-delay 5 -o $OutFile $Url
    if ($LASTEXITCODE -ne 0) {
      throw "curl.exe failed with exit code $LASTEXITCODE while downloading $Url"
    }
  } else {
    Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing
  }
}

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
New-Item -ItemType Directory -Force -Path $DownloadRoot | Out-Null

if (-not (Test-Path -LiteralPath $SevenZipPath)) {
  Write-Host "Downloading 7zr.exe..."
  Download-File $SevenZipUrl $SevenZipPath
}

if (-not (Test-Path -LiteralPath $ArchivePath)) {
  Write-Host "Downloading $AssetName from Comfy-Org/ComfyUI $ReleaseTag..."
  Write-Host $ComfyUrl
  Download-File $ComfyUrl $ArchivePath
}

$archiveInfo = Get-Item -LiteralPath $ArchivePath
if ($archiveInfo.Length -lt 1GB) {
  Remove-Item -LiteralPath $ArchivePath -Force -ErrorAction SilentlyContinue
  throw "Downloaded ComfyUI archive is too small ($($archiveInfo.Length) bytes). The download was likely interrupted or returned an error page."
}

if (-not (Test-Path -LiteralPath $ComfyRoot)) {
  Write-Host "Extracting ComfyUI portable package..."
  & $SevenZipPath x $ArchivePath "-o$InstallRoot" -y
}

if (-not (Test-Path -LiteralPath $ComfyRoot)) {
  throw "Extraction finished but ComfyUI root was not found: $ComfyRoot"
}

[pscustomobject]@{
  comfyRoot = $ComfyRoot
  archive = $ArchivePath
  releaseTag = $ReleaseTag
  assetName = $AssetName
  next = "Run scripts\start_comfyui_backend.ps1 -Wait"
} | ConvertTo-Json -Depth 4
