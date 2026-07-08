<div align="right">

**English** | [繁體中文](README.zh-TW.md)

</div>

# PodNote

Turn Podcast / YouTube content into transcripts, then let Gemini organize them into structured notes.

## Two Editions (Web / Desktop)

PodNote comes in a **Web edition** and a **Desktop edition**, with different capabilities and API key requirements:

| | Web | Desktop |
|---|---|---|
| **Platform** | Web + Android | Windows desktop |
| **Audio sources** | Podcast | YouTube / Podcast / uploaded audio files |
| **Transcription** | Backend faster-whisper (runs on the server)<br>or external Groq (faster) | Cloud Whisper API (Groq / OpenAI) |
| **Notes** | Gemini | Gemini |
| **API keys** | Gemini (required)<br>Groq (optional, for fast transcription) | Groq or OpenAI (required)<br>+ Gemini (required) |
| **Installation** | None — open the live app → https://frankkn-podnote-api.hf.space | Download the [installer.exe](https://github.com/frankkn/PodNote/releases) (Windows) |

## Desktop Screenshots

![Settings](docs/screenshots/Config.png)

![Transcript](docs/screenshots/transcript.png)

![Note history](docs/screenshots/history.png)

![Generating notes](docs/screenshots/manual.png)

## Open the Web App Now

The fastest way to get started: no installation, just open the deployed live version.

```text
https://frankkn-podnote-api.hf.space
```

The first visit may take a few seconds while the Hugging Face Space wakes up. Once the app is open, go to the Settings page and enter your own Gemini API Key (used for generating notes); if you want "Fast" transcription, add your own Groq API Key as well. After that, just paste a Podcast link to generate notes.

There are two transcription modes:

- **Fast (recommended)**: Transcribes on an external GPU via the Groq Whisper API — quick and accurate. You need to enter your own Groq API Key and Gemini API Key on the Settings page (see the API key guide below — it's really easy!). Keys are stored locally on your device; they are only sent to the backend to call Groq when you generate notes, used once, and never stored.
- **Slow (simple)**: Transcribes on the server's CPU. Only a Gemini API Key is required, but it is slower and subject to length and concurrency limits.

Service health check:

```text
https://frankkn-podnote-api.hf.space/health
```

## Use the Desktop App Now

The desktop edition is a standalone **Windows application** — no backend to set up, just download and install. It bundles yt-dlp and fetches ffmpeg automatically, so it can handle **YouTube / Podcast links or local audio files** directly. Transcription goes through cloud Whisper (Groq or OpenAI), and notes are generated with Gemini.

### Download and Install

1. Open the [GitHub Releases page](https://github.com/frankkn/PodNote/releases).
2. Under the latest release (tagged **Latest**), download the installer `PodNote-Setup-X.Y.Z.exe` from the **Assets** section.
3. Double-click the installer. If Windows SmartScreen shows "**Windows protected your PC**", click "**More info**" → "**Run anyway**" (a normal prompt for unsigned applications).
4. After installation, launch **PodNote** from the Start Menu or the desktop shortcut.

### First-Time Setup

Once the app is open, go to the **Settings page** and enter your API keys (see "[Getting API Keys](#getting-api-keys)" below for how to obtain them):

- **Gemini API Key** (for generating notes, required)
- **Groq or OpenAI API Key** (for cloud Whisper transcription, required; either one works — if both are set, OpenAI takes priority)

Keys are stored locally on your device; they are only attached to requests when you generate notes, used once, and never stored.

### Getting Started

Back on the main screen, paste a **YouTube / Podcast link** or pick a **local audio file**, then hit Start. The app automatically downloads the audio, transcribes it, and organizes the transcript into structured notes with Gemini.

> **Auto-update**: The desktop edition ships with electron-updater. On startup it checks GitHub Releases for a new version, downloads it in the background if available, and prompts you to update.

## Getting API Keys

### Gemini API Key (required)

Used to turn transcripts into notes. The free tier is usually more than enough for personal use.

1. Open [https://aistudio.google.com](https://aistudio.google.com) and sign in with your Google account.
2. Click "**Get API key**" in the left sidebar.
3. Click "**Create API key**" → pick a Google Cloud project (or let it create one automatically) → click "Create API key".
4. Copy the key shown on screen (it starts with `AIza`).
5. In the app's **Settings page**, paste the key into the "Gemini API Key" field and save.

> If you hit a 429 quota error, the key's free quota for a specific model has usually run out. You can go to [aistudio.google.com](https://aistudio.google.com) and create a new key under a new Google project.

---

### Groq API Key (for Fast mode, optional)

Only needed if you choose the "Fast (recommended)" transcription mode. Currently free, no credit card required.

1. Open [https://console.groq.com](https://console.groq.com) and sign in / register with a Google account or email.
2. Click "**API Keys**" in the top-right menu.
3. Click "**Create API Key**", give it a name (e.g. `podnote`), and create it.
4. Copy the key shown on screen (it starts with `gsk_`). **The key is shown only once** — copy it immediately.
5. In the app's **Settings page**, paste the key into the "Groq API Key" field and save.

> No Groq key? No problem — switch to the "Slow (simple)" mode and you're good to go, no extra setup needed.

---

## Project Structure

```text
PodNote/
  backend/   FastAPI API, transcription jobs, exported web static files (web edition deployed to HF Space)
  frontend/  Expo / React Native Web frontend source (web edition UI)
  desktop/   Electron desktop app source (Windows, packaged standalone, no backend dependency)
```

## Changelog

### Web

| Version | Date | Highlights |
|------|------|------|
| v1.4.0 | 2026-06-09 | Added a user guide page; backend now supports OpenAI Whisper transcription (as an alternative to Groq); fixed downloaded audio not being cleaned up after transcription, which caused server disk usage to grow episode by episode |
| v1.3.1 | 2026-06-01 | Settings page shows the current version; version info centralized (`app.json` as the single source of truth); re-exported and redeployed static files |
| v1.3.0 | 2026-06-01 | Auto-generate a summary with Gemini in the background after transcription; Chinese output fixed to Traditional (OpenCC `s2tw`); summary flow moved to module level for stability |
| v1.2.0 | 2026-06-01 | Fixed blank screen in the web desktop layout (emoji instead of vector-icons, Sidebar switched to `router.push`, cards stretched with flex); added Playwright tests |
| v1.1.0 | 2026-06-01 | Two-column Sidebar layout for wide screens (≥768px); Markdown rendering for notes; long episodes split into 5-minute segments for transcoding; abuse prevention and audio length limits |
| v1.0.0 | 2026-06-01 | First stable release: Podcast link → transcript → Gemini notes; dual-mode transcription (Groq fast / CPU slow); concurrent episodes and note history; deployed on Hugging Face Spaces |

### Desktop

| Version | Date | Highlights |
|------|------|------|
| v1.3.0 | 2026-06-09 | Remote transcription now uploads in segments (files over 24MB are split by ffmpeg into 16kHz mono chunks), so long episodes no longer fail on the API's single-file limit; prompts to install ffmpeg and retries automatically if it is missing |
| v1.2.0 | 2026-06-09 | Switched to GitHub Actions (Windows runner) for automated packaging and releases; web / desktop releases split by tag prefix so they don't interfere; installer name fixed to `PodNote-Setup-<version>.exe` |
| v0.2.0 | 2026-06-04 | Download button placed on the same row as the URL input; transcript box reduced to 2 lines; Settings page marks the transcription API key as required |
| v0.1.1 | 2026-06-04 | First standalone Windows desktop release: no backend needed, packaged as an installer; bundled yt-dlp with automatic ffmpeg download on first run; three-column Sidebar layout; Gemini note generation; auto-update via GitHub (electron-updater) |
