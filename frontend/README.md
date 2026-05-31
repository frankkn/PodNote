# PodNote 前端 (Expo + expo-router)

同時支援 Web 與 Android。輸入 Podcast 連結 → 呼叫後端轉檔（輪詢）→ 用本機 Gemini 金鑰直連 Google 生成筆記。

## 安裝與啟動

```powershell
npm install
# 對齊 Expo 套件版本（建議執行一次）
npx expo install --fix
copy .env.example .env
npx expo start
```

啟動後按 `w` 開網頁，或用手機 Expo Go 掃 QR 開 Android。

## 設定後端網址

編輯 `.env` 的 `EXPO_PUBLIC_BACKEND_URL`：
- 本地：`http://localhost:8000`（Android 模擬器會自動改用 `10.0.2.2`）
- 部署後：你的 HF Spaces 網址

## 打包

- Web 靜態檔：`npx expo export --platform web`（產物在 `dist/`，可丟 Vercel / Netlify）
- Android APK/AAB：用 EAS Build（`npm i -g eas-cli` → `eas build -p android`）
