const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultDownloadDir = path.join(repoRoot, "_data", "desktop-downloads");

function createWindow() {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    title: "PodNote Desktop MVP",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

function getYtDlpCommand() {
  if (process.env.YTDLP_PATH) {
    return { command: process.env.YTDLP_PATH, argsPrefix: [] };
  }

  const venvPython = path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvPython)) {
    return { command: venvPython, argsPrefix: ["-m", "yt_dlp"] };
  }

  return { command: "yt-dlp", argsPrefix: [] };
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

function newestFile(dir) {
  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stat = fs.statSync(filePath);
      return { filePath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return files[0]?.filePath;
}

ipcMain.handle("youtube:download", async (event, { url }) => {
  const trimmed = String(url || "").trim();
  if (!trimmed) throw new Error("Please paste a YouTube URL.");

  fs.mkdirSync(defaultDownloadDir, { recursive: true });

  event.sender.send("job:log", "Starting local YouTube audio download...");
  await runYtDlp(
    [
      "--no-playlist",
      "-f",
      "ba[ext=m4a]/ba",
      "-o",
      path.join(defaultDownloadDir, "%(id)s.%(ext)s"),
      trimmed,
    ],
    (line) => event.sender.send("job:log", line)
  );

  const filePath = newestFile(defaultDownloadDir);
  if (!filePath) throw new Error("Download finished, but no audio file was found.");

  return { filePath };
});

ipcMain.handle("audio:transcribe", async (event, { filePath, apiKey, baseUrl, model }) => {
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
  return { transcript: json.text || "" };
});

ipcMain.handle("dialog:showFile", async (_event, { filePath }) => {
  if (!filePath) return;
  shell.showItemInFolder(filePath);
});
