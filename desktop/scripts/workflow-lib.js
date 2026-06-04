const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const downloadDir = path.join(repoRoot, "_data", "desktop-downloads");

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

function runYtDlp(args, options = {}) {
  const { command, argsPrefix } = getYtDlpCommand();
  if (!options.quietCommand) {
    console.log(`Running: ${command} ${[...argsPrefix, ...args].join(" ")}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...argsPrefix, ...args], {
      cwd: repoRoot,
      windowsHide: true,
    });
    let stdout = "";
    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      output += text;
      if (!options.captureOnly) process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      if (!options.captureOnly) process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(output || `yt-dlp exited with ${code}`));
    });
  });
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

async function downloadYoutubeAudio(url) {
  fs.mkdirSync(downloadDir, { recursive: true });

  const metadata = parseMetadata(
    await runYtDlp(
      ["--skip-download", "--no-playlist", "--quiet", "--dump-single-json", url],
      { captureOnly: true }
    )
  );

  await runYtDlp([
    "--no-playlist",
    "-f",
    "ba[ext=m4a]/ba",
    "-o",
    path.join(downloadDir, `${metadata.id}.%(ext)s`),
    url,
  ]);

  const filePath = newestMatchingFile(downloadDir, metadata.id);
  if (!filePath) throw new Error("No downloaded file found.");

  return { ...metadata, filePath };
}

async function transcribeAudio({ filePath, apiKey, baseUrl, model }) {
  if (!apiKey) throw new Error("Set GROQ_API_KEY or OPENAI_API_KEY before running this test.");
  if (!fs.existsSync(filePath)) throw new Error(`Audio file not found: ${filePath}`);

  const endpoint = `${baseUrl.replace(/\/$/, "")}/audio/transcriptions`;
  const bytes = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([bytes]), path.basename(filePath));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  return json.text || "";
}

module.exports = {
  downloadDir,
  downloadYoutubeAudio,
  transcribeAudio,
};
