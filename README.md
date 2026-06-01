# PodNote

把 Podcast 音訊轉成逐字稿，再用 Gemini 整理成筆記的 Web App。

## 立即打開 Web App

最快方式：不用安裝，直接開已部署的線上版。

```text
https://frankkn-podnote-api.hf.space
```

第一次開 Hugging Face Space 可能會等幾秒喚醒服務。打開 App 後，到設定頁輸入自己的 Gemini API Key（整理筆記用）；若要用「快速」轉錄，再加上自己的 Groq API Key。設定完就可以貼 Podcast 連結產生筆記。

轉錄有兩種模式：

- **快速（推薦）**：用外部 GPU（Groq Whisper API）轉錄，又快又準。需要在設定頁輸入自己的 Groq API Key 跟 Gemini API Key（參考下方申請 API Key 流程，非常簡單！）。金鑰存在本機，產生筆記時才傳到後端呼叫 Groq，用完即丟、不會保存。
- **慢速（簡單）**：用伺服器 CPU 轉錄，只需要申請 Gemini API Key，但速度較慢、有長度與併發限制。

服務狀態檢查：

```text
https://frankkn-podnote-api.hf.space/health
```

## 申請 API Key

### Gemini API Key（必要）

用於把逐字稿整理成筆記，免費額度通常足夠個人使用。

1. 開啟 [https://aistudio.google.com](https://aistudio.google.com)，用 Google 帳號登入。
2. 左側選單點「**Get API key**」。
3. 點「**Create API key**」→ 選擇一個 Google Cloud 專案（或讓它自動建立）→ 點「建立 API 金鑰」。
4. 複製畫面上顯示的金鑰（以 `AIza` 開頭）。
5. 到 App 的**設定頁**，把金鑰貼入「Gemini API Key」欄位，按儲存。

> 若遇到 429 配額錯誤，通常是該 key 對特定模型的免費額度用完。可到 [aistudio.google.com](https://aistudio.google.com) 用新的 Google 專案重建一把 key。

---

### Groq API Key（快速模式用，選填）

只有選「快速（推薦）」轉錄模式才需要。目前免費、不需綁信用卡。

1. 開啟 [https://console.groq.com](https://console.groq.com)，用 Google 帳號或 email 登入／註冊。
2. 右上角選單點「**API Keys**」。
3. 點「**Create API Key**」，取個名字（例如 `podnote`），按建立。
4. 複製畫面上顯示的金鑰（以 `gsk_` 開頭）。**此金鑰只會顯示一次**，請立即複製。
5. 到 App 的**設定頁**，把金鑰貼入「Groq API Key」欄位，按儲存。

> 沒有 Groq Key 也沒關係，改選「慢速（簡單）」模式即可使用，不需任何額外設定。

---

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

API Key 都不寫在 `.env` 裡，而是在 App 的設定頁輸入：

- **Gemini API Key**：整理筆記用。瀏覽器直接連 Google，不經過後端。
- **Groq API Key**：「快速」轉錄用（選填）。存在本機，產生筆記時才隨請求傳到後端呼叫 Groq，用完即丟、不保存。沒填仍可用「慢速」模式。

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

### 快速和慢速模式差在哪？要選哪個？

- **快速（推薦）**：呼叫外部 GPU（Groq Whisper API），通常幾秒到數十秒完成，又快又準，但要自備 Groq API Key（免費申請）。
- **慢速（簡單）**：用伺服器自己的 CPU 跑，免任何 key，適合只想試一下的人，但較慢、節目長度與同時人數有限制。

Groq Key 只有快速模式才會用到，後端用完即丟、不會保存。

### 第一次啟動很慢正常嗎？

正常。第一次安裝 Python 套件、下載 Whisper 模型（僅慢速模式需要），或處理較長音訊時都會比較久。快速模式不需下載模型。

### 前端連不到後端怎麼辦？

確認這三件事：

1. 後端正在 `http://localhost:8000` 執行。
2. `frontend/.env` 裡的 `EXPO_PUBLIC_BACKEND_URL` 是 `http://localhost:8000`。
3. 如果你改了 `.env`，請重新啟動 Expo。

---

## 版本記錄

### v1.0.0 — 2026-06-01

首個正式版本。

**功能**

- 貼上 Podcast 連結，自動下載音訊、轉錄成逐字稿，再用 Gemini 整理成結構化繁體中文筆記
- 雙模式轉錄
  - **快速（推薦）**：呼叫 Groq Whisper API（外部 GPU），通常數秒到數十秒完成；使用者自帶 Groq Key，過水不存
  - **慢速（簡單）**：在伺服器 CPU 執行 faster-whisper，免申請任何 key
- 底部 Tab Bar 導覽：**生成筆記 / 筆記歷史 / 設定**
- 多集併發：可同時送出多集，每集各自顯示進度卡；完成後點「查看筆記」進入閱讀頁
- 筆記閱讀頁：頂部 **[筆記 | 逐字稿]** 切換；筆記歷史列表每筆也有獨立的兩個快捷按鈕
- 本機持久化筆記歷史（localStorage / AsyncStorage）
- 部署於 Hugging Face Spaces（Docker），GitHub Actions tag 觸發自動部署
