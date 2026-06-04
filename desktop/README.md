# PodNote Desktop MVP

Small Electron test app for the desktop YouTube flow:

```text
Paste YouTube URL -> download m4a locally -> send audio to Whisper-compatible API -> save local history
```

This MVP intentionally uses the existing backend virtualenv's `yt-dlp` during local development. A packaged desktop release should bundle `yt-dlp`, `ffmpeg`, and a supported JavaScript runtime.

## Run

```powershell
cd desktop
npm install
npm start
```

The app saves successful transcripts to Electron's per-user app data directory as `history.json`.

## Packaging (Windows installer)

The packaged release is **Remote-only** (Groq/OpenAI). It bundles `yt-dlp.exe`;
`ffmpeg` is fetched on demand into the user's AppData the first time a link
actually needs it (or via the "下載 ffmpeg" button on the setup page).

```powershell
cd desktop
npm run dist
```

Output: `desktop/dist/PodNote Setup <version>.exe` (NSIS, per-user install).
The build is unsigned, so Windows SmartScreen shows a warning on first run
("More info" -> "Run anyway"). Auto-update still works without code signing.

## Releasing an update (auto-update via GitHub Releases)

Packaged builds check `frankkn/PodNote` Releases on launch, download a newer
version in the background, and install it on restart. Releases are read at the
repository level, independent of which branch the code lives on.

To publish a new version:

1. Bump `version` in `desktop/package.json` (e.g. `0.1.0` -> `0.1.1`). The
   sidebar version label and the update check both read this.
2. Create a GitHub Personal Access Token with `repo` scope and expose it:
   ```powershell
   $env:GH_TOKEN = "ghp_..."
   ```
3. Build and publish:
   ```powershell
   npm run release
   ```
   This runs electron-builder with `--publish always`, uploading the installer,
   `latest.yml`, and `.blockmap` to a **draft** GitHub Release tagged `v<version>`.
4. On GitHub, **publish** that draft release (clients only see non-draft, non
   -prerelease releases). Existing installs then update automatically.

## Settings And Export

The MVP can save Groq/OpenAI and Gemini keys locally in Electron's app data directory as `settings.json`. This is convenient for development testing, but a packaged release should move secrets to OS secure storage.

The desktop UI can:

- Check current development dependencies (`yt-dlp`, Python, `faster-whisper`, and optional `ffmpeg`)
- Copy transcript or note text to the clipboard
- Export transcripts as `.txt`
- Export generated notes as `.md`
- Delete individual history items

## Local Transcription

Local transcription does not require a Groq or OpenAI API key. The app downloads the selected model the first time it is used and stores it in the app data directory.

Available local models:

| Model | Approx. size | Notes |
|---|---:|---|
| tiny | ~75 MB | Fastest and smallest; rougher accuracy |
| base | ~145 MB | Small download with better accuracy than tiny |
| small | ~466 MB | Balanced local transcription choice |
| large | ~3.1 GB | Best accuracy, slowest and largest download |

## CLI Smoke Tests

Download a short YouTube test video as m4a:

```powershell
cd desktop
npm run test:download
```

Transcribe the downloaded file:

```powershell
$env:GROQ_API_KEY="gsk_..."
npm run test:transcribe
```

Run the whole download -> transcribe -> test history flow:

```powershell
$env:GROQ_API_KEY="gsk_..."
npm run test:workflow
```

Run local transcription with the tiny model:

```powershell
npm run test:local
```

Generate notes with Gemini:

```powershell
$env:GEMINI_API_KEY="AIza..."
npm run test:notes
```

For OpenAI Whisper:

```powershell
$env:OPENAI_API_KEY="sk_..."
$env:STT_MODEL="whisper-1"
$env:STT_BASE_URL="https://api.openai.com/v1"
npm run test:transcribe
```
