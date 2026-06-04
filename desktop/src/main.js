const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { spawn } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultDownloadDir = path.join(repoRoot, "_data", "desktop-downloads");
let historyPath;

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

  if (process.argv.includes("--smoke-test")) {
    win.webContents.once("did-finish-load", () => {
      setTimeout(() => app.quit(), 250);
    });
  }
}

app.whenReady().then(() => {
  historyPath = path.join(app.getPath("userData"), "history.json");
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

async function addHistoryItem(item) {
  const items = await readHistory();
  const next = [item, ...items].slice(0, 100);
  await writeHistory(next);
  return next;
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
  if (!trimmed) throw new Error("Please paste a YouTube URL.");

  fs.mkdirSync(defaultDownloadDir, { recursive: true });

  event.sender.send("job:log", "Reading YouTube metadata...");
  const metadataResult = await runYtDlp(
    ["--skip-download", "--no-playlist", "--quiet", "--dump-single-json", trimmed]
  );
  const metadata = parseMetadata(metadataResult.stdout);
  if (!metadata.id) throw new Error("YouTube metadata did not include a video id.");

  event.sender.send("job:log", "Starting local YouTube audio download...");
  await runYtDlp(
    [
      "--no-playlist",
      "-f",
      "ba[ext=m4a]/ba",
      "-o",
      path.join(defaultDownloadDir, `${metadata.id}.%(ext)s`),
      trimmed,
    ],
    (line) => event.sender.send("job:log", line)
  );

  const filePath = newestMatchingFile(defaultDownloadDir, metadata.id);
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
  };

  await addHistoryItem(historyItem);
  return { transcript, historyItem };
});

ipcMain.handle("dialog:showFile", async (_event, { filePath }) => {
  if (!filePath) return;
  shell.showItemInFolder(filePath);
});

ipcMain.handle("history:list", async () => readHistory());

ipcMain.handle("history:clear", async () => {
  await writeHistory([]);
  return [];
});
