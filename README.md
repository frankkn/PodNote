# PodNote — Podcast 自動筆記工具

輸入 Podcast 單集連結，後端自動下載並用 faster-whisper 轉逐字稿，前端用使用者自備的
Gemini 金鑰直連 Google 生成結構化筆記（自動略過廣告閒聊）。

## 架構

```
前端 (Expo)                         後端 (FastAPI @ HF Spaces)
  │  POST /jobs {url}                 │
  ├──────────────────────────────────►  建立任務、背景下載+轉檔
  │  GET /jobs/{id} (每 3 秒輪詢)       │
  ◄──────────────────────────────────┤  回傳 state / progress / transcript
  │
  │  直連 Google（本機金鑰）
  └──────────────► Gemini API：摘要 + 篩廣告 → 結構化筆記
```

關鍵設計：轉檔耗時長，採「建立任務 + 輪詢」非同步模式，避免 HTTP 逾時。

## 目錄

- `backend/` — FastAPI 服務，部署到 Hugging Face Spaces（Docker）
- `frontend/` — Expo App，支援 Web 與 Android

各自的 README 有啟動步驟。

## 本地一次跑起來

1. 後端：`cd backend` → 建 venv → `uvicorn app.main:app --reload --port 8000`
2. 前端：`cd frontend` → `npm install` → `npx expo start`
