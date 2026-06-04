const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const transcript =
  process.argv.slice(2).join(" ") ||
  "Alright, so here we are in front of the elephants. The cool thing about these guys is that they have really long trunks. And that is pretty much all there is to say.";

const noteSystemPrompt = `You are a podcast and YouTube note-taking assistant.
Create structured Traditional Chinese notes from the transcript.
Ignore ads, sponsorship reads, filler, and irrelevant chatter when possible.
Output Markdown only with:
# 主題
## 重點摘要
## 章節整理
## 值得記住的金句`;

async function main() {
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY before running this test.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  console.log(`Endpoint model: ${model}`);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: noteSystemPrompt }] },
      contents: [{ role: "user", parts: [{ text: transcript }] }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini failed (${response.status}): ${await response.text()}`);
  }

  const data = await response.json();
  const note = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!note) throw new Error("Gemini did not return note text.");
  console.log(note);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
