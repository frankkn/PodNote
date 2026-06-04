# PodNote Desktop MVP

Small Electron test app for the desktop YouTube flow:

```text
Paste YouTube URL -> download m4a locally -> send audio to Whisper-compatible API
```

This MVP intentionally uses the existing backend virtualenv's `yt-dlp` during local development. A packaged desktop release should bundle `yt-dlp`, `ffmpeg`, and a supported JavaScript runtime.

## Run

```powershell
cd desktop
npm install
npm start
```

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

For OpenAI Whisper:

```powershell
$env:OPENAI_API_KEY="sk_..."
$env:STT_MODEL="whisper-1"
$env:STT_BASE_URL="https://api.openai.com/v1"
npm run test:transcribe
```
