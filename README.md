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

---

### v1.1.0 — 2026-06-01

**改善**

- **桌面版雙欄 UI**：螢幕寬度 ≥ 768px 時，自動切換為左側 Sidebar 導覽 + 右側置中卡片佈局（最寬 760px），手機版維持底部 Tab Bar 不變；瀏覽筆記時 Sidebar 持續可見
- **筆記 Markdown 渲染**：筆記閱讀頁改用 `react-native-markdown-display`，標題、條列、粗體、引言等格式正確呈現
- **長節目分段轉檔**：音訊依序切成每段 5 分鐘轉錄，並在等待時即時顯示累積逐字稿，60 分鐘以內的節目亦可處理
- **防濫用機制**：每 IP 每小時限 10 次、CPU 模式一次只跑一個任務、節目長度上限 60 分鐘
- **音訊長度上限**：CPU 模式 60 分鐘、GPU 模式（Groq）120 分鐘

---

### v1.2.0 — 2026-06-01

**修正**

- **修復網頁版桌面佈局**：v1.1.0 的桌面雙欄 UI 在瀏覽器會白畫面、或切換後內容空白，本版徹底修正：
  - 以 emoji 取代 `@expo/vector-icons`（其字型載入在 web 會觸發 `CSSStyleDeclaration` 崩潰）
  - Sidebar 改用 `router.push` 取代 `Link asChild`（避免產生會崩潰的 `<a>` 包裝）
  - 內容卡片改用 flex 撐滿高度（原本被 `alignSelf:center` 壓成 2px 高，內容看不到）
- 新增 Playwright 無頭瀏覽器測試（`frontend/uitest.cjs`），可在本機驗證網頁版操作

**維運**

- GitHub Actions 改用 `huggingface_hub` 上傳，正確處理二進位字型檔（XET storage）

---

### v1.3.0 — 2026-06-01

**改善**

- **轉錄完成後自動生成摘要**：轉錄工作結束時會在背景呼叫 Gemini 產生筆記並儲存，進度卡會顯示「摘要中…」，完成後點「查看筆記」即可直接開啟本機已儲存的筆記。
- **中文轉錄固定繁體輸出**：CPU 與 Groq 快速模式都加入繁體中文與標點提示，並透過 OpenCC `s2tw` 將輸出轉為台灣繁體中文。
- **摘要流程更穩定**：摘要生成移到模組層級執行，即使使用者切換分頁，背景摘要仍會繼續完成。

**注意**

- CPU 小模型仍可能缺少完整標點；快速模式使用 `whisper-large-v3` 時標點效果較佳。

---

### v1.3.1 — 2026-06-01

**改善**

- **設定頁顯示目前版本**：設定頁底部新增「目前版本」，會顯示目前 App 版本號。
- **版本資訊集中管理**：前端從 `app.json` 讀取版本號，並同步更新 `app.json`、`package.json` 與 `package-lock.json` 為 `1.3.1`，避免 UI 版本與專案 metadata 不一致。
- **部署靜態檔同步更新**：重新匯出 Web 靜態檔並更新 `backend/web`，讓同源部署版本也能看到版本號。
