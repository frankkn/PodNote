# Downloads the binaries bundled into the packaged (Remote-only) release:
#   - yt-dlp.exe : YouTube / Podcast audio download
#   - ffmpeg.exe : audio transcode/merge for yt-dlp
# ffprobe is intentionally NOT bundled (saves ~80 MB); yt-dlp works with
# ffmpeg alone for our download/transcode use.
# Output goes to desktop/resources/bin (gitignored). Idempotent: skips files
# that already exist.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # massively speeds up Invoke-WebRequest on PS 5.1

$binDir = Join-Path $PSScriptRoot "..\resources\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

# --- yt-dlp ---------------------------------------------------------------
$ytdlp = Join-Path $binDir "yt-dlp.exe"
if (-not (Test-Path $ytdlp)) {
  Write-Host "Downloading yt-dlp.exe..."
  Invoke-WebRequest -UseBasicParsing `
    -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
    -OutFile $ytdlp
} else {
  Write-Host "yt-dlp.exe already present, skipping."
}

# --- ffmpeg / ffprobe -----------------------------------------------------
$ffmpeg = Join-Path $binDir "ffmpeg.exe"
if (-not (Test-Path $ffmpeg)) {
  Write-Host "Downloading ffmpeg (release-essentials)..."
  $tmpZip = Join-Path $env:TEMP "podnote-ffmpeg.zip"
  $tmpDir = Join-Path $env:TEMP "podnote-ffmpeg"
  Invoke-WebRequest -UseBasicParsing `
    -Uri "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip" `
    -OutFile $tmpZip
  if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
  Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

  $srcFf = Get-ChildItem -Path $tmpDir -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
  if (-not $srcFf) { throw "ffmpeg.exe not found in downloaded archive." }
  Copy-Item $srcFf.FullName $ffmpeg -Force

  Remove-Item $tmpZip -Force
  Remove-Item $tmpDir -Recurse -Force
} else {
  Write-Host "ffmpeg.exe already present, skipping."
}

Write-Host "Binaries ready in $binDir"
Get-ChildItem $binDir | Select-Object Name, @{ Name = "MB"; Expression = { [math]::Round($_.Length / 1MB, 1) } }
