const { downloadYoutubeAudio } = require("./workflow-lib");

const url = process.argv[2] || "https://www.youtube.com/watch?v=jNQXAC9IVRw";

async function main() {
  const result = await downloadYoutubeAudio(url);
  console.log(`Metadata: ${result.title} (${result.duration}s)`);
  console.log(`Downloaded file: ${result.filePath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
