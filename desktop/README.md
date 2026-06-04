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
