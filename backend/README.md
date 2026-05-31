---
title: PodNote API
emoji: 🎙️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# PodNote 後端 (FastAPI)

非同步任務式 API：建立轉檔任務 → 背景下載 + faster-whisper 轉檔 → 前端輪詢取逐字稿。

## 本地開發

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

開啟 http://localhost:8000/docs 測試 API。

## API

| Method | Path | 說明 |
|---|---|---|
| POST | `/jobs` | body `{ "url": "..." }`，回傳 `job_id` |
| GET | `/jobs/{job_id}` | 查詢狀態；`state=done` 時帶 `transcript` |
| GET | `/health` | 健康檢查 |

## 部署到 Hugging Face Spaces

1. 建立 Space，SDK 選 **Docker**。
2. 把 `backend/` 內容推上去（含 `Dockerfile`）。
3. 服務需監聽 **7860**（Dockerfile 已設定）。
4. 在 Space Settings 設環境變數 `ALLOWED_ORIGINS` 為你的前端網址。

> 免費 CPU：模型用 `small` / `int8`；首次請求會下載模型，較慢屬正常。
