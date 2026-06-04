const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const model = process.env.LOCAL_WHISPER_MODEL || "tiny";
const audioPath =
  process.argv[2] || path.join(repoRoot, "_data", "desktop-downloads", "jNQXAC9IVRw.m4a");
const modelsDir = path.join(repoRoot, "_data", "desktop-local-models");

function getPythonCommand() {
  if (process.env.PODNOTE_PYTHON) return process.env.PODNOTE_PYTHON;

  const venvPython = path.join(repoRoot, "backend", ".venv", "Scripts", "python.exe");
  if (fs.existsSync(venvPython)) return venvPython;

  return process.platform === "win32" ? "py" : "python3";
}

async function main() {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}. Run npm run test:download first.`);
  }

  const command = getPythonCommand();
  const script = path.join(repoRoot, "desktop", "scripts", "local-whisper.py");
  const args = [
    script,
    "--model",
    model,
    "--models-dir",
    modelsDir,
    "--audio",
    audioPath,
  ];

  console.log(`Running local Whisper model: ${model}`);
  console.log(`Models dir: ${modelsDir}`);

  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, windowsHide: true });
    let stdout = "";
    let output = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
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
      if (code !== 0) {
        reject(new Error(output || `local whisper exited with ${code}`));
        return;
      }

      const jsonLine = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .reverse()
        .find((line) => line.startsWith("{") && line.endsWith("}"));
      if (!jsonLine) {
        reject(new Error("No JSON output from local whisper."));
        return;
      }

      const parsed = JSON.parse(jsonLine);
      console.log(`Transcript length: ${parsed.transcript.length}`);
      resolve();
    });
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
