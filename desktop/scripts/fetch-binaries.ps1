# Downloads the binary bundled into the packaged release:
#   - yt-dlp.exe : YouTube / Podcast audio download
# ffmpeg is NOT bundled — it is fetched on demand at runtime into the user's
# AppData (see installFfmpeg in src/main.js). Most links never need it.
# Output goes to desktop/resources/bin (gitignored). Idempotent.

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # massively speeds up Invoke-WebRequest on PS 5.1

$binDir = Join-Path $PSScriptRoot "..\resources\bin"
New-Item -ItemType Directory -Force -Path $binDir | Out-Null

$ytdlp = Join-Path $binDir "yt-dlp.exe"
if (-not (Test-Path $ytdlp)) {
  Write-Host "Downloading yt-dlp.exe..."
  Invoke-WebRequest -UseBasicParsing `
    -Uri "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" `
    -OutFile $ytdlp
} else {
  Write-Host "yt-dlp.exe already present, skipping."
}

Write-Host "Binaries ready in $binDir"
Get-ChildItem $binDir | Select-Object Name, @{ Name = "MB"; Expression = { [math]::Round($_.Length / 1MB, 1) } }
