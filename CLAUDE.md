# PodNote — Claude 工作筆記

## 專案概覽

| 目錄 | 說明 |
|------|------|
| `backend/` | FastAPI 後端，負責下載音訊、轉錄（CPU / Groq / OpenAI）、回傳逐字稿 |
| `frontend/` | Expo / React Native Web 前端，部署在 HF Space 的靜態頁面 |
| `desktop/` | Electron 桌面應用程式（Windows），獨立打包、不依賴後端 |

## Branch 策略

- **單一主線 `main`**：web 與 desktop 的程式碼都在這裡開發，日常直接 commit。
- 舊的 `desktop` branch 已 fast-forward 合併回 `main` 並刪除，不再使用。
- 大功能可開 `feature/xxx` 再 PR 回 `main`。

## Tag 命名規範（兩套部署完全分開）

| 格式 | 觸發 | 部署內容 |
|------|------|----------|
| `web/vX.Y.Z` | GitHub Actions `deploy-hf.yml` | 把 `backend/` 上傳到 HF Space（web 版） |
| `desktop/vX.Y.Z` | GitHub Actions `release-desktop.yml` | 在 windows runner 打包 `.exe` 並建立 GitHub Release（桌面版） |

- **不再使用 bare `v*` tag。** 過去 electron-builder 會自動建立 `v<version>` tag，且舊的 `deploy-hf.yml` 監聽 `v*`，導致發桌面版時誤觸發 web 部署。已全面改掉。
- 兩個 workflow 的 tag prefix 不重疊，互不干擾。

## Web 發版流程

```powershell
# 1. Bump frontend/app.json、package.json、package-lock.json 的 version
git add frontend/app.json frontend/package.json frontend/package-lock.json
git commit -m "Bump web version to X.Y.Z"
git push origin main

# 2. 打 tag，push 後 GitHub Actions 自動部署到 HF Space
git tag web/vX.Y.Z
git push origin web/vX.Y.Z
```

## Desktop 發版流程（已改為 CI 自動打包）

```powershell
# 1. Bump desktop/package.json 的 version
#    ⚠️ 必須 > 目前線上最新版（electron-updater 只會往上更新，不會降版）
git add desktop/package.json
git commit -m "Bump desktop version to X.Y.Z"
git push origin main

# 2. 打 tag，push 後 GitHub Actions（windows runner）自動：
#    npm ci → fetch yt-dlp → electron-builder 打包 .exe → gh release create desktop/vX.Y.Z
git tag desktop/vX.Y.Z
git push origin desktop/vX.Y.Z
```

- `desktop/package.json` 的 `version` 必須和 tag 的版號一致（`.exe` 檔名與 `latest.yml` 由此產生）。
- 不再需要本機跑 `npm run release`，也不需要本機設定 `GH_TOKEN`；CI 用內建的 `GITHUB_TOKEN`。
- 本機若要自己打包測試，仍可 `cd desktop; npm run dist`（只打包、不發版）。

## 後端架構重點

- `mode="gpu"`：使用者自帶 Groq 或 OpenAI key，後端過水呼叫 API，不儲存
- `mode="cpu"`：本機 faster-whisper，免 key，速度慢
- `openai_api_key` 優先於 `groq_api_key`；兩個都填時用 OpenAI
- OpenAI 固定 base_url `https://api.openai.com/v1`、model `whisper-1`
- Groq 用 `settings.stt_base_url` 與 `settings.stt_model`（可 .env 覆寫）

## 前端架構重點

- Gemini key：前端直連 Google，不經後端
- Groq / OpenAI key：存 localStorage，送出時隨 job request 傳到後端，用完即丟
- Provider 偏好存 `TRANSCRIBE_PROVIDER_STORAGE`（`"groq"` 或 `"openai"`）
- 桌面版 sidebar 用 `display:none` 切換（不能條件式 render，會 re-parent Stack 崩潰）
- `@expo/vector-icons` 在 web 會白畫面，一律用 emoji 替代

## Secrets（GitHub repo settings）

- `HF_TOKEN`：web 部署到 HF Space 用。
- `GITHUB_TOKEN`：desktop 發 Release 用，GitHub 內建，不需手動設定。
