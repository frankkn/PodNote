// 直連 Google Generative Language API。
// 金鑰是使用者自備、存在本機，只會出現在使用者自己的請求中。

// 可用 .env 的 EXPO_PUBLIC_GEMINI_MODEL 覆寫。Gemini 的免費額度是「逐模型」計算的，
// 若某個模型回 429 limit:0，換一個模型名稱通常就能用。
const GEMINI_MODEL =
  process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "gemini-2.5-flash";

const apiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const SYSTEM_PROMPT = `你是一個 Podcast 筆記助理。請依據以下逐字稿產生結構化的繁體中文筆記：
1. 自動忽略廣告、業配、贊助商宣傳與無意義閒聊。
2. 用 Markdown 輸出，包含：# 單集主題、## 重點摘要(條列)、## 章節整理、## 值得記住的金句。
3. 只輸出筆記本身，不要加任何開場白或結語。`;

export async function summarize(
  transcript: string,
  apiKey: string
): Promise<string> {
  const res = await fetch(`${apiUrl(GEMINI_MODEL)}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: transcript }] }],
    }),
  });

  if (!res.ok) {
    // 把常見錯誤翻成好懂的訊息
    if (res.status === 429) {
      throw new Error(
        `配額不足 (429)：金鑰對「${GEMINI_MODEL}」沒有可用的免費額度。\n` +
          `可在 .env 設 EXPO_PUBLIC_GEMINI_MODEL 換別的模型，或到 aistudio.google.com 用新專案重建金鑰。`
      );
    }
    if (res.status === 400 || res.status === 403) {
      throw new Error(`金鑰或請求有誤 (${res.status})，請確認 API Key 正確。`);
    }
    const detail = await res.text();
    throw new Error(`Gemini 失敗 (${res.status})：${detail}`);
  }

  const data = await res.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini 沒有回傳內容");
  return text;
}
