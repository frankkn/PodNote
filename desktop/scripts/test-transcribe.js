const path = require("node:path");
const { transcribeAudio } = require("./workflow-lib");

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultFile = path.join(repoRoot, "_data", "desktop-downloads", "jNQXAC9IVRw.m4a");
const filePath = process.argv[2] || defaultFile;
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
const baseUrl = process.env.STT_BASE_URL || (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1" : "https://api.groq.com/openai/v1");
const model = process.env.STT_MODEL || (process.env.OPENAI_API_KEY ? "whisper-1" : "whisper-large-v3");

async function main() {
  console.log(`Uploading ${filePath}`);
  console.log(`Endpoint: ${baseUrl.replace(/\/$/, "")}/audio/transcriptions`);
  console.log(`Model: ${model}`);

  const transcript = await transcribeAudio({ filePath, apiKey, baseUrl, model });
  console.log(transcript);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
