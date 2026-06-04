const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultFile = path.join(repoRoot, "_data", "desktop-downloads", "jNQXAC9IVRw.m4a");
const filePath = process.argv[2] || defaultFile;
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
const baseUrl = process.env.STT_BASE_URL || (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1" : "https://api.groq.com/openai/v1");
const model = process.env.STT_MODEL || (process.env.OPENAI_API_KEY ? "whisper-1" : "whisper-large-v3");

async function main() {
  if (!apiKey) {
    throw new Error("Set GROQ_API_KEY or OPENAI_API_KEY before running this test.");
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`);
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/audio/transcriptions`;
  const bytes = await fs.promises.readFile(filePath);
  const form = new FormData();
  form.append("model", model);
  form.append("file", new Blob([bytes]), path.basename(filePath));

  console.log(`Uploading ${filePath}`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Model: ${model}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Transcription failed (${response.status}): ${await response.text()}`);
  }

  const json = await response.json();
  console.log(json.text || JSON.stringify(json, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
