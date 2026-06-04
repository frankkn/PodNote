const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const downloadDir = path.join(repoRoot, "_data", "desktop-downloads");
const url = process.argv[2] || "https://www.youtube.com/watch?v=jNQXAC9IVRw";

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

async function main() {
  fs.mkdirSync(downloadDir, { recursive: true });

  const { command, argsPrefix } = getYtDlpCommand();
  const args = [
    ...argsPrefix,
    "--no-playlist",
    "-f",
    "ba[ext=m4a]/ba",
    "-o",
    path.join(downloadDir, "%(id)s.%(ext)s"),
    url,
  ];

  console.log(`Running: ${command} ${args.join(" ")}`);

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, windowsHide: true });
    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(output || `yt-dlp exited with ${code}`));
    });
  });

  const filePath = newestFile(downloadDir);
  if (!filePath) throw new Error("No downloaded file found.");
  console.log(`Downloaded file: ${filePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
