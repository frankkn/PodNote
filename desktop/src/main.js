const { app, BrowserWindow, ipcMain, shell, clipboard, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
let historyPath;
let localModelsDir;
let settingsPath;

// Local (Python/faster-whisper) transcription is only wired up in development.
// Packaged Remote-only releases bundle yt-dlp + ffmpeg and hide local mode.
const localTranscriptionAvailable = !app.isPackaged;

function bundledBinDir() {
  return path.join(process.resourcesPath, "bin");
}

function getDownloadDir() {
  return app.isPackaged
    ? path.join(app.getPath("userData"), "downloads")
    : path.join(repoRoot, "_data", "desktop-downloads");
}

function userBinDir() {
  return path.join(app.getPath("userData"), "bin");
}

function userFfmpegPath() {
  return path.join(userBinDir(), "ffmpeg.exe");
}

// Directory passed to yt-dlp --ffmpeg-location. ffmpeg is fetched on demand
// into userData/bin (not bundled). Returning null lets yt-dlp fall back to a
// system ffmpeg on PATH (useful in development).
function getFfmpegLocation() {
  if (process.env.FFMPEG_LOCATION) return process.env.FFMPEG_LOCATION;
  if (fs.existsSync(userFfmpegPath())) return userBinDir();
  return null;
}

function findFileRecursive(dir, name) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(full, name);
      if (found) return found;
    } else if (entry.name.toLowerCase() === name.toLowerCase()) {
      return full;
    }
  }
  return null;
}

// Downloads ffmpeg.exe into userData/bin on demand (see fetch-binaries.ps1 for
// the build-time equivalent). Skips if already present.
async function installFfmpeg(event) {
  const log = (line) => event?.sender.send("job:log", line);
  const dest = userFfmpegPath();
  if (fs.existsSync(dest)) return { installed: true, path: dest };

  fs.mkdirSync(userBinDir(), { recursive: true });
  const tmpZip = path.join(app.getPath("temp"), "podnote-ffmpeg.zip");
  const tmpDir = path.join(app.getPath("temp"), "podnote-ffmpeg");

  log("Downloading ffmpeg (~90 MB)...");
  const response = await fetch("https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip");
  if (!response.ok) throw new Error(`ffmpeg download failed (${response.status}).`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(tmpZip, buffer);

  log("Extracting ffmpeg...");
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  const unzip = await runCommand("powershell", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -Path '${tmpZip}' -DestinationPath '${tmpDir}' -Force`,
  ]);
  if (!unzip.ok) throw new Error("Failed to extract ffmpeg archive.");

  const found = findFileRecursive(tmpDir, "ffmpeg.exe");
  if (!found) throw new Error("ffmpeg.exe not found in downloaded archive.");
  await fs.promises.copyFile(found, dest);

  fs.rmSync(tmpZip, { force: true });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  log("ffmpeg ready.");
  return { installed: true, path: dest };
}

if (process.argv.includes("--disable-hardware-acceleration")) {
  app.disableHardwareAcceleration();
}
if (!app.isPackaged) {
  app.setPath("userData", path.join(repoRoot, "_data", "desktop-electron-user-data"));
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disk-cache-size", "0");
  app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
}

const defaultGeminiModel = "gemini-2.5-flash";
const noteSystemPrompt = `You are a podcast and YouTube note-taking assistant.
Create structured Traditional Chinese notes from the transcript.
Ignore ads, sponsorship reads, filler, and irrelevant chatter when possible.
Output Markdown only with:
# 主題
## 重點摘要
## 章節整理
## 值得記住的金句`;

const localModelOptions = [
  {
    id: "tiny",
    label: "tiny",
    size: "~75 MB",
    description: "Fastest and smallest; rougher accuracy.",
  },
  {
    id: "base",
    label: "base",
    size: "~145 MB",
    description: "Small download with better accuracy than tiny.",
  },
  {
    id: "small",
    label: "small",
    size: "~466 MB",
    description: "Balanced local transcription choice.",
  },
  {
    id: "large-v3",
    label: "large",
    size: "~3.1 GB",
    description: "Best accuracy, slowest and largest download.",
  },
];

function setupAutoUpdates(win) {
  // electron-updater only works in packaged builds (reads GitHub Releases).
  if (!app.isPackaged) return;

  const send = (status, data = {}) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send("update:status", { status, ...data });
    }
  };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => send("checking"));
  autoUpdater.on("update-available", (info) => send("available", { version: info?.version }));
  autoUpdater.on("update-not-available", () => send("none"));
  autoUpdater.on("download-progress", (progress) =>
    send("downloading", { percent: Math.round(progress?.percent || 0) })
  );
  autoUpdater.on("update-downloaded", (info) => send("downloaded", { version: info?.version }));
  autoUpdater.on("error", (error) => send("error", { message: String(error?.message || error) }));

  autoUpdater.checkForUpdates().catch((error) => send("error", { message: String(error?.message || error) }));
}

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    show: false,
    backgroundColor: "#f5f7fb",
    title: "PodNote Desktop MVP",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`Renderer failed to load (${errorCode}): ${errorDescription}`);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error(`Renderer process gone: ${details.reason}`);
  });

  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));

  win.webContents.once("did-finish-load", () => {
    win.show();
    win.focus();
    win.webContents.invalidate();

    if (process.argv.includes("--devtools")) {
      win.webContents.openDevTools({ mode: "detach" });
    }

    if (!process.argv.includes("--smoke-test") && !process.argv.includes("--capture-render")) {
      setupAutoUpdates(win);
    }
  });

  if (process.argv.includes("--smoke-test")) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        const text = await win.webContents.executeJavaScript("document.body.innerText");
        if (!text.includes("PodNote")) {
          console.error("Smoke test failed: renderer body did not contain expected text.");
          app.exit(1);
          return;
        }
        app.quit();
      }, 250);
    });
  }

  if (process.argv.includes("--capture-render")) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        const image = await win.webContents.capturePage();
        const outPath = path.join(repoRoot, "_data", "desktop-render-capture.png");
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        await fs.promises.writeFile(outPath, image.toPNG());
        console.log(`Wrote renderer capture: ${outPath}`);
        app.quit();
      }, 1000);
    });
  }
}

app.whenReady().then(() => {
  historyPath = path.join(app.getPath("userData"), "history.json");
  settingsPath = path.join(app.getPath("userData"), "settings.json");
  localModelsDir = path.join(app.getPath("userData"), "models");
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function getYtDlpCommand() {
  if (app.isPackaged) {
    return { command: path.join(bundledBinDir(), "yt-dlp.exe"), argsPrefix: [] };
  }

  if (process.env.YTDLP_PATH) {
    return { command: process.env.YTDLP_PATH, argsPrefix: [] };
  }

  const venvPython = path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, argsPrefix: ["-m", "yt_dlp"] };
  }

  return { command: "yt-dlp", argsPrefix: [] };
}

function getPythonCommand() {
  if (process.env.PODNOTE_PYTHON) return process.env.PODNOTE_PYTHON;

  const venvPython = path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvPython)) return venvPython;

  return process.platform === "win32" ? "py" : "python3";
}

function runCommand(command, args) {
  const child = spawn(command, args, {
    cwd: repoRoot,
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  return new Promise((resolve) => {
    child.on("error", (error) => {
      resolve({ ok: false, stdout, stderr, error: error.message });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, stdout, stderr, code });
    });
  });
}

function runYtDlp(args, onProgress) {
  const { command, argsPrefix } = getYtDlpCommand();
  const child = spawn(command, [...argsPrefix, ...args], {
    cwd: repoRoot,
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  const handleOutput = (chunk, isError) => {
    const text = chunk.toString();
    if (isError) stderr += text;
    else stdout += text;

    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      onProgress?.(line);
    }
  };

  child.stdout.on("data", (chunk) => handleOutput(chunk, false));
  child.stderr.on("data", (chunk) => handleOutput(chunk, true));

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || `yt-dlp exited with ${code}`).trim()));
    });
  });
}

function runLocalWhisper(args, onProgress) {
  const command = getPythonCommand();
  const script = path.join(repoRoot, "desktop", "scripts", "local-whisper.py");
  const child = spawn(command, [script, ...args], {
    cwd: repoRoot,
    windowsHide: true,
  });

  let stdout = "";
  let stderr = "";

  const handleOutput = (chunk, isError) => {
    const text = chunk.toString();
    if (isError) stderr += text;
    else stdout += text;

    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      onProgress?.(line);
    }
  };

  child.stdout.on("data", (chunk) => handleOutput(chunk, false));
  child.stderr.on("data", (chunk) => handleOutput(chunk, true));

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error((stderr || stdout || `local whisper exited with ${code}`).trim()));
    });
  });
}

function parseLastJson(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const jsonLine = lines.reverse().find((line) => line.startsWith("{") && line.endsWith("}"));
  if (!jsonLine) throw new Error("Local Whisper did not return JSON output.");
  return JSON.parse(jsonLine);
}

function newestMatchingFile(dir, id) {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .filter((entry) => !id || entry.name.startsWith(`${id}.`))
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0]?.filePath;
}

async function readHistory() {
  if (!historyPath || !fs.existsSync(historyPath)) return [];

  try {
    const raw = await fs.promises.readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(items) {
  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  await fs.promises.writeFile(historyPath, JSON.stringify(items, null, 2), "utf8");
}

async function readSettings() {
  if (!settingsPath || !fs.existsSync(settingsPath)) {
    return {};
  }

  try {
    const raw = await fs.promises.readFile(settingsPath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeSettings(settings) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  await fs.promises.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

async function addHistoryItem(item) {
  const items = await readHistory();
  const next = [item, ...items].slice(0, 100);
  await writeHistory(next);
  return next;
}

async function updateHistoryItem(id, patch) {
  if (!id) return null;

  const items = await readHistory();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const updated = {
    ...items[index],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  items[index] = updated;
  await writeHistory(items);
  return updated;
}

async function deleteHistoryItem(id) {
  const items = await readHistory();
  const next = items.filter((item) => item.id !== id);
  await writeHistory(next);
  return next;
}

function safeFileStem(value) {
  return String(value || "podnote")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "podnote";
}

async function generateGeminiNote({ transcript, apiKey, model }) {
  const key = String(apiKey || "").trim();
  if (!key) throw new Error("Please enter a Gemini API key.");

  const selectedModel = String(model || defaultGeminiModel).trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    selectedModel
  )}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: noteSystemPrompt }] },
      contents: [{ role: "user", parts: [{ text: transcript }] }],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 429) {
      throw new Error(`Gemini quota or rate limit reached (429): ${detail}`);
    }
    if (response.status === 400 || response.status === 403) {
      throw new Error(`Gemini API key or request error (${response.status}): ${detail}`);
    }
    throw new Error(`Gemini failed (${response.status}): ${detail}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini did not return note text.");
  return { note: text, model: selectedModel };
}

function parseMetadata(stdout) {
  const lines = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const jsonLine = lines.find((line) => line.startsWith("{") && line.endsWith("}"));
  if (!jsonLine) throw new Error("Could not read YouTube metadata.");

  const info = JSON.parse(jsonLine);
  return {
    id: info.id,
    title: info.title || "Untitled",
    duration: Number(info.duration || 0),
    webpageUrl: info.webpage_url || info.original_url || "",
  };
}

ipcMain.handle("youtube:download", async (event, { url }) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("Please paste a URL.");

  const downloadDir = getDownloadDir();
  fs.mkdirSync(downloadDir, { recursive: true });

  event.sender.send("job:log", "Reading media metadata...");
  const metadataResult = await runYtDlp(
    ["--skip-download", "--no-playlist", "--quiet", "--dump-single-json", trimmed]
  );
  const metadata = parseMetadata(metadataResult.stdout);
  if (!metadata.id) throw new Error("Metadata did not include a media id.");

  const ffmpegLocation = getFfmpegLocation();
  event.sender.send("job:log", "Starting local audio download...");
  try {
    await runYtDlp(
      [
        "--no-playlist",
        "-f",
        "ba[ext=m4a]/ba",
        ...(ffmpegLocation ? ["--ffmpeg-location", ffmpegLocation] : []),
        "-o",
        path.join(downloadDir, `${metadata.id}.%(ext)s`),
        trimmed,
      ],
      (line) => event.sender.send("job:log", line)
    );
  } catch (error) {
    const message = String(error?.message || error);
    if (/ffmpeg/i.test(message) && /(not installed|not found|install|ffprobe)/i.test(message)) {
      throw new Error("FFMPEG_REQUIRED");
    }
    throw error;
  }

  const filePath = newestMatchingFile(downloadDir, metadata.id);
  if (!filePath) throw new Error("Download finished, but no audio file was found.");

  return { ...metadata, filePath };
});

ipcMain.handle("audio:transcribe", async (event, { filePath, apiKey, baseUrl, model, source }) => {
  const key = String(apiKey || "").trim();
  if (!key) throw new Error("Please enter a Groq or OpenAI API key.");
  if (!filePath || !fs.existsSync(filePath)) throw new Error("Audio file was not found.");

  const endpoint = `${String(baseUrl || "https://api.groq.com/openai/v1").replace(/\/$/, "")}/audio/transcriptions`;
  const selectedModel = String(model || "whisper-large-v3").trim();

  event.sender.send("job:log", `Uploading audio to ${endpoint}`);

  const bytes = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append("model", selectedModel);
  form.append("file", new Blob([bytes]), path.basename(filePath));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const transcript = json.text || "";
  const historyItem = {
    id: crypto.randomUUID(),
    title: source?.title || path.basename(filePath),
    url: source?.url || source?.webpageUrl || "",
    audioPath: filePath,
    transcript,
    createdAt: new Date().toISOString(),
    duration: source?.duration || null,
    model: selectedModel,
    baseUrl: String(baseUrl || "https://api.groq.com/openai/v1").replace(/\/$/, ""),
    transcriptionMode: "remote",
  };

  await addHistoryItem(historyItem);
  return { transcript, historyItem };
});

ipcMain.handle("local:model-options", async () =>
  localModelOptions.map((option) => ({
    ...option,
    downloaded: fs.existsSync(path.join(localModelsDir, `models--Systran--faster-whisper-${option.id}`)),
  }))
);

ipcMain.handle("local:download-model", async (event, { model }) => {
  const selectedModel = String(model || "tiny");
  if (!localModelOptions.some((option) => option.id === selectedModel)) {
    throw new Error(`Unsupported local model: ${selectedModel}`);
  }

  event.sender.send("job:log", `Preparing local model: ${selectedModel}`);
  const result = await runLocalWhisper(
    [
      "--download-only",
      "--model",
      selectedModel,
      "--models-dir",
      localModelsDir,
    ],
    (line) => event.sender.send("job:log", line)
  );

  return parseLastJson(result.stdout);
});

ipcMain.handle("local:transcribe", async (event, { filePath, model, source }) => {
  if (!filePath || !fs.existsSync(filePath)) throw new Error("Audio file was not found.");

  const selectedModel = String(model || "tiny");
  if (!localModelOptions.some((option) => option.id === selectedModel)) {
    throw new Error(`Unsupported local model: ${selectedModel}`);
  }

  event.sender.send("job:log", `Starting local transcription with ${selectedModel}`);
  const result = await runLocalWhisper(
    [
      "--model",
      selectedModel,
      "--models-dir",
      localModelsDir,
      "--audio",
      filePath,
    ],
    (line) => event.sender.send("job:log", line)
  );
  const parsed = parseLastJson(result.stdout);
  const transcript = parsed.transcript || "";

  const historyItem = {
    id: crypto.randomUUID(),
    title: source?.title || path.basename(filePath),
    url: source?.url || source?.webpageUrl || "",
    audioPath: filePath,
    transcript,
    createdAt: new Date().toISOString(),
    duration: source?.duration || null,
    model: selectedModel,
    baseUrl: "local",
    transcriptionMode: "local",
  };

  await addHistoryItem(historyItem);
  return { transcript, historyItem, language: parsed.language || null };
});

ipcMain.handle("notes:generate", async (event, { transcript, apiKey, model, historyItemId }) => {
  const cleanTranscript = String(transcript || "").trim();
  if (!cleanTranscript) throw new Error("Transcript is empty.");

  event.sender.send("job:log", "Generating notes with Gemini...");
  const result = await generateGeminiNote({
    transcript: cleanTranscript,
    apiKey,
    model,
  });

  const patch = {
    note: result.note,
    noteModel: result.model,
    noteCreatedAt: new Date().toISOString(),
  };
  const historyItem = historyItemId ? await updateHistoryItem(historyItemId, patch) : null;
  return { ...patch, historyItem };
});

ipcMain.handle("settings:get", async () => readSettings());

ipcMain.handle("settings:save", async (_event, { settings }) => {
  const current = await readSettings();
  const incoming = settings && typeof settings === "object" ? settings : {};
  const next = {
    ...current,
    ...incoming,
    geminiModel: String(incoming.geminiModel || current.geminiModel || defaultGeminiModel),
  };
  // Drop superseded legacy remote fields so the file stays clean.
  delete next.remoteApiKey;
  delete next.remoteBaseUrl;
  delete next.remoteModel;
  await writeSettings(next);
  return next;
});

ipcMain.handle("settings:clear", async () => {
  await writeSettings({});
  return {};
});

ipcMain.handle("dependencies:check", async () => {
  const yt = getYtDlpCommand();
  const checks = [];

  const ytResult = await runCommand(yt.command, [...yt.argsPrefix, "--version"]);
  checks.push({
    id: "yt-dlp",
    label: "yt-dlp",
    ok: ytResult.ok,
    detail: ytResult.ok ? (ytResult.stdout || ytResult.stderr).trim() : ytResult.error || ytResult.stderr.trim(),
  });

  const ffmpegCommand = fs.existsSync(userFfmpegPath()) ? userFfmpegPath() : "ffmpeg";
  const ffmpegResult = await runCommand(ffmpegCommand, ["-version"]);
  checks.push({
    id: "ffmpeg",
    label: "ffmpeg",
    ok: ffmpegResult.ok,
    detail: ffmpegResult.ok
      ? (ffmpegResult.stdout.split(/\r?\n/)[0] || "ffmpeg ok")
      : "未安裝。多數連結不需要；需要時點「下載 ffmpeg」即可。",
    // Fetched on demand, so never a hard requirement.
    optional: true,
  });

  // Local transcription (Python + faster-whisper) only ships in development builds.
  if (localTranscriptionAvailable) {
    const python = getPythonCommand();

    const pythonResult = await runCommand(python, ["--version"]);
    checks.push({
      id: "python",
      label: "Python",
      ok: pythonResult.ok,
      detail: pythonResult.ok ? (pythonResult.stdout || pythonResult.stderr).trim() : pythonResult.error || pythonResult.stderr.trim(),
    });

    const fasterWhisperResult = await runCommand(python, [
      "-c",
      "import faster_whisper; print('faster-whisper ok')",
    ]);
    checks.push({
      id: "faster-whisper",
      label: "faster-whisper",
      ok: fasterWhisperResult.ok,
      detail: fasterWhisperResult.ok
        ? (fasterWhisperResult.stdout || fasterWhisperResult.stderr).trim()
        : fasterWhisperResult.error || fasterWhisperResult.stderr.trim(),
    });
  }

  return checks;
});

ipcMain.handle("app:info", async () => ({
  packaged: app.isPackaged,
  localTranscription: localTranscriptionAvailable,
  version: app.getVersion(),
}));

ipcMain.handle("update:check", async () => {
  if (!app.isPackaged) return { ok: false, reason: "dev" };
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: String(error?.message || error) };
  }
});

ipcMain.handle("update:install", async () => {
  if (!app.isPackaged) return { ok: false, reason: "dev" };
  // Let the IPC reply flush before the app restarts.
  setImmediate(() => autoUpdater.quitAndInstall());
  return { ok: true };
});

ipcMain.handle("ffmpeg:status", async () => ({
  installed: fs.existsSync(userFfmpegPath()),
  path: userFfmpegPath(),
}));

ipcMain.handle("ffmpeg:install", async (event) => installFfmpeg(event));

ipcMain.handle("clipboard:write", async (_event, { text }) => {
  clipboard.writeText(String(text || ""));
  return { ok: true };
});

ipcMain.handle("export:text", async (_event, { text, title, extension }) => {
  const ext = String(extension || "txt").replace(/^\./, "");
  const result = await dialog.showSaveDialog({
    title: "Export",
    defaultPath: `${safeFileStem(title)}.${ext}`,
    filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
  });

  if (result.canceled || !result.filePath) return { canceled: true };

  await fs.promises.writeFile(result.filePath, String(text || ""), "utf8");
  return { canceled: false, filePath: result.filePath };
});

ipcMain.handle("dialog:showFile", async (_event, { filePath }) => {
  if (!filePath) return;
  shell.showItemInFolder(filePath);
});

ipcMain.handle("dialog:openAudio", async () => {
  const result = await dialog.showOpenDialog({
    title: "選擇音檔",
    properties: ["openFile"],
    filters: [
      {
        name: "Audio",
        extensions: ["m4a", "mp3", "wav", "aac", "ogg", "oga", "opus", "flac", "webm", "mp4", "mov", "mkv"],
      },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePaths?.[0]) return { canceled: true };

  const filePath = result.filePaths[0];
  return { canceled: false, filePath, title: path.basename(filePath) };
});

ipcMain.handle("history:list", async () => readHistory());

ipcMain.handle("history:clear", async () => {
  await writeHistory([]);
  return [];
});

ipcMain.handle("history:delete", async (_event, { id }) => deleteHistoryItem(id));
