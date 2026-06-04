const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const { downloadYoutubeAudio, transcribeAudio } = require("./workflow-lib");

const repoRoot = path.resolve(__dirname, "..", "..");
const url = process.argv[2] || "https://www.youtube.com/watch?v=jNQXAC9IVRw";
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
const baseUrl =
  process.env.STT_BASE_URL ||
  (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1" : "https://api.groq.com/openai/v1");
const model = process.env.STT_MODEL || (process.env.OPENAI_API_KEY ? "whisper-1" : "whisper-large-v3");
const historyPath = path.join(repoRoot, "_data", "desktop-history-test", "history.json");

async function main() {
  const source = await downloadYoutubeAudio(url);
  console.log(`Downloaded: ${source.title} -> ${source.filePath}`);

  const transcript = await transcribeAudio({
    filePath: source.filePath,
    apiKey,
    baseUrl,
    model,
  });
  console.log(`Transcript length: ${transcript.length}`);

  const item = {
    id: crypto.randomUUID(),
    title: source.title,
    url,
    audioPath: source.filePath,
    transcript,
    createdAt: new Date().toISOString(),
    duration: source.duration || null,
    model,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };

  fs.mkdirSync(path.dirname(historyPath), { recursive: true });
  let history = [];
  if (fs.existsSync(historyPath)) {
    history = JSON.parse(await fs.promises.readFile(historyPath, "utf8"));
  }
  history = [item, ...history].slice(0, 100);
  await fs.promises.writeFile(historyPath, JSON.stringify(history, null, 2), "utf8");

  console.log(`Saved history item: ${item.id}`);
  console.log(`History path: ${historyPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
