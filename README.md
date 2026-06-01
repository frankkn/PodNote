# PodNote

把 Podcast / YouTube 音訊轉成逐字稿，再用 Gemini 整理成筆記的 Web App。

## 立即打開 Web App

最快方式：不用安裝，直接開已部署的線上版。

```text
https://frankkn-podnote-api.hf.space
```

第一次開 Hugging Face Space 可能會等幾秒喚醒服務。打開 App 後，到設定頁輸入自己的 Gemini API Key，就可以貼 Podcast / YouTube 連結產生筆記。

轉錄有兩種模式：

- **快速（推薦）**：用外部 GPU（Groq Whisper API）轉錄，又快又準。需要在設定頁輸入自己的 Groq API Key（到 console.groq.com 免費申請）。金鑰存在本機，產生筆記時才傳到後端呼叫 Groq，用完即丟、不會保存。
- **慢速（簡單）**：用伺服器 CPU 轉錄，免申請任何 key，但速度較慢、有長度與併發限制。

服務狀態檢查：

```text
https://frankkn-podnote-api.hf.space/health
```

## 本機啟動

如果你要在自己的電腦跑，或要修改程式，才需要以下步驟。

在專案根目錄 `C:\Users\frank2_yang\Desktop\PodNote` 開終端機。

### 1. 啟動後端 API

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 2. 打開網頁

後端啟動後，直接用瀏覽器開：

```text
http://localhost:8000
```

API 文件在：

```text
http://localhost:8000/docs
```

## 前端開發模式

如果你要修改前端畫面，請另外開一個終端機：

```powershell
cd frontend
npm install
copy .env.example .env
npm run web
```

Expo 啟動後，終端機會顯示 Web App 的網址，通常是：

```text
http://localhost:8081
```

如果 Expo 顯示其他 port，請以終端機顯示的網址為準。

## 必要設定

### 後端 `.env`

檔案位置：

```text
backend/.env
```

可先用 `.env.example` 的預設值。常用設定：

```env
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
# 慢速模式（CPU）
WHISPER_MODEL=small
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
# 快速模式（GPU，Groq/OpenAI 相容 API）。注意：API Key 由使用者在前端輸入，不寫在這裡。
STT_MODEL=whisper-large-v3
STT_BASE_URL=https://api.groq.com/openai/v1
```

> 想換成 OpenAI Whisper API，把 `STT_BASE_URL` 改成 `https://api.openai.com/v1`、`STT_MODEL` 改成 `whisper-1` 即可；使用者輸入的就改成 OpenAI key。

### 前端 `.env`

檔案位置：

```text
frontend/.env
```

本機開發通常使用：

```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
EXPO_PUBLIC_GEMINI_MODEL=gemini-2.5-flash
```

Gemini API Key 不是寫在 `.env` 裡，而是在 App 的設定頁輸入。

## 專案結構

```text
PodNote/
  backend/   FastAPI API、轉錄工作、已匯出的 Web 靜態檔
  frontend/  Expo / React Native Web 前端原始碼
```

## 常見問題

### 我只想馬上用，要跑哪個？

只跑後端就好：

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

然後開 `http://localhost:8000`。

### 第一次啟動很慢正常嗎？

正常。第一次安裝 Python 套件、下載 Whisper 模型，或處理較長音訊時都會比較久。

### 前端連不到後端怎麼辦？

確認這三件事：

1. 後端正在 `http://localhost:8000` 執行。
2. `frontend/.env` 裡的 `EXPO_PUBLIC_BACKEND_URL` 是 `http://localhost:8000`。
3. 如果你改了 `.env`，請重新啟動 Expo。
