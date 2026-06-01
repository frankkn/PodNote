import { Platform } from "react-native";

// 後端 API base URL。
// - 優先讀 .env 的 EXPO_PUBLIC_BACKEND_URL（部署後填 HF Spaces 網址）。
// - 本地開發 fallback：Android 模擬器要用 10.0.2.2 才能連到主機的 localhost。
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");

export const GEMINI_KEY_STORAGE = "gemini_api_key";
export const GROQ_KEY_STORAGE = "groq_api_key";
