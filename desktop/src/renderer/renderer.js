const els = {
  // sidebar
  navItems: Array.from(document.querySelectorAll(".nav-item")),
  status: document.querySelector("#status"),
  statusDot: document.querySelector("#statusDot"),
  logToggle: document.querySelector("#logToggle"),
  log: document.querySelector("#log"),
  appVersion: document.querySelector("#appVersion"),
  updateBtn: document.querySelector("#updateBtn"),
  updateStatus: document.querySelector("#updateStatus"),
  // views
  viewSetup: document.querySelector("#view-setup"),
  viewGenerate: document.querySelector("#view-generate"),
  viewHistory: document.querySelector("#view-history"),
  // setup
  checkDepsBtn: document.querySelector("#checkDepsBtn"),
  installFfmpegBtn: document.querySelector("#installFfmpegBtn"),
  dependencyList: document.querySelector("#dependencyList"),
  provGroqBtn: document.querySelector("#provGroqBtn"),
  provOpenaiBtn: document.querySelector("#provOpenaiBtn"),
  apiKey: document.querySelector("#apiKey"),
  model: document.querySelector("#model"),
  modelCustomField: document.querySelector("#modelCustomField"),
  modelCustom: document.querySelector("#modelCustom"),
  advToggle: document.querySelector("#advToggle"),
  advBody: document.querySelector("#advBody"),
  baseUrl: document.querySelector("#baseUrl"),
  geminiKey: document.querySelector("#geminiKey"),
  geminiModel: document.querySelector("#geminiModel"),
  saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
  clearSettingsBtn: document.querySelector("#clearSettingsBtn"),
  // generate
  settingsHint: document.querySelector("#settingsHint"),
  settingsHintText: document.querySelector("#settingsHintText"),
  goSetupBtn: document.querySelector("#goSetupBtn"),
  srcYoutubeBtn: document.querySelector("#srcYoutubeBtn"),
  srcPodcastBtn: document.querySelector("#srcPodcastBtn"),
  srcUploadBtn: document.querySelector("#srcUploadBtn"),
  youtubeSource: document.querySelector("#youtubeSource"),
  podcastSource: document.querySelector("#podcastSource"),
  uploadSource: document.querySelector("#uploadSource"),
  url: document.querySelector("#url"),
  downloadBtn: document.querySelector("#downloadBtn"),
  podcastUrl: document.querySelector("#podcastUrl"),
  podcastDownloadBtn: document.querySelector("#podcastDownloadBtn"),
  pickFileBtn: document.querySelector("#pickFileBtn"),
  filePath: document.querySelector("#filePath"),
  showFileBtn: document.querySelector("#showFileBtn"),
  sourceMeta: document.querySelector("#sourceMeta"),
  transcribeModeSeg: document.querySelector("#transcribeModeSeg"),
  remoteModeBtn: document.querySelector("#remoteModeBtn"),
  localModeBtn: document.querySelector("#localModeBtn"),
  remoteSettings: document.querySelector("#remoteSettings"),
  localSettings: document.querySelector("#localSettings"),
  remoteModelLabel: document.querySelector("#remoteModelLabel"),
  localModel: document.querySelector("#localModel"),
  localModelInfo: document.querySelector("#localModelInfo"),
  downloadModelBtn: document.querySelector("#downloadModelBtn"),
  transcribeBtn: document.querySelector("#transcribeBtn"),
  transcript: document.querySelector("#transcript"),
  transcriptBadge: document.querySelector("#transcriptBadge"),
  copyTranscriptBtn: document.querySelector("#copyTranscriptBtn"),
  exportTranscriptBtn: document.querySelector("#exportTranscriptBtn"),
  generateNoteBtn: document.querySelector("#generateNoteBtn"),
  copyNoteBtn: document.querySelector("#copyNoteBtn"),
  exportNoteBtn: document.querySelector("#exportNoteBtn"),
  notePreview: document.querySelector("#notePreview"),
  // history
  historyListView: document.querySelector("#historyListView"),
  historyDetailView: document.querySelector("#historyDetailView"),
  historySearch: document.querySelector("#historySearch"),
  history: document.querySelector("#history"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  historyBackBtn: document.querySelector("#historyBackBtn"),
  detailTitle: document.querySelector("#detailTitle"),
  detailMeta: document.querySelector("#detailMeta"),
  detailTranscript: document.querySelector("#detailTranscript"),
  detailCopyTranscript: document.querySelector("#detailCopyTranscript"),
  detailNote: document.querySelector("#detailNote"),
  detailCopyNote: document.querySelector("#detailCopyNote"),
  detailLoadToGenerate: document.querySelector("#detailLoadToGenerate"),
  detailDelete: document.querySelector("#detailDelete"),
};

const PROVIDERS = {
  groq: {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keyPlaceholder: "gsk_...",
    models: ["whisper-large-v3", "whisper-large-v3-turbo", "distil-whisper-large-v3-en"],
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keyPlaceholder: "sk_...",
    models: ["whisper-1", "gpt-4o-transcribe", "gpt-4o-mini-transcribe"],
  },
};
const CUSTOM_MODEL = "__custom__";

const remoteConfig = {
  provider: "groq",
  groq: { apiKey: "", model: PROVIDERS.groq.models[0], baseUrl: "" },
  openai: { apiKey: "", model: PROVIDERS.openai.models[0], baseUrl: "" },
};

let currentView = "setup";
let currentSource = null;
let currentHistoryItemId = null;
let currentNoteMarkdown = "";
let localModels = [];
let transcriptionMode = "remote";
let sourceType = "youtube";
let settings = {};
let historyItems = [];
let detailItem = null;

/* ===================== Helpers ===================== */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appendLog(line) {
  const timestamp = new Date().toLocaleTimeString();
  els.log.textContent += `[${timestamp}] ${line}\n`;
  els.log.scrollTop = els.log.scrollHeight;
}

function logError(error) {
  appendLog(error instanceof Error ? error.message : String(error));
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function setStatus(label, state) {
  els.status.textContent = label;
  els.statusDot.className = `status-dot${state ? ` ${state}` : ""}`;
}

/* Minimal Markdown renderer for Gemini note output. */
function renderInline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderMarkdown(md) {
  const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let listType = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      closeList();
      continue;
    }

    const escaped = escapeHtml(line);

    const heading = escaped.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length, 6);
      out.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const quote = escaped.match(/^&gt;\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    const ul = escaped.match(/^[-*]\s+(.*)$/);
    if (ul) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    const ol = escaped.match(/^\d+\.\s+(.*)$/);
    if (ol) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${renderInline(escaped)}</p>`);
  }

  closeList();
  return out.join("\n");
}

/* ===================== View switching ===================== */

function setView(view) {
  currentView = view;
  for (const item of els.navItems) {
    item.classList.toggle("active", item.dataset.view === view);
  }
  els.viewSetup.hidden = view !== "setup";
  els.viewGenerate.hidden = view !== "generate";
  els.viewHistory.hidden = view !== "history";

  if (view === "generate") updateSettingsHint();
  if (view === "history") {
    showHistoryList();
    renderHistory();
  }
}

/* ===================== Busy state ===================== */

function hasTranscript() {
  return Boolean(els.transcript.value.trim());
}

function setBusy(isBusy, label, state) {
  if (label) setStatus(label, state ?? (isBusy ? "busy" : "ok"));

  els.downloadBtn.disabled = isBusy;
  els.pickFileBtn.disabled = isBusy;
  els.transcribeBtn.disabled = isBusy || !els.filePath.value;
  els.downloadModelBtn.disabled = isBusy || transcriptionMode !== "local" || !els.localModel.value;
  els.generateNoteBtn.disabled = isBusy || !hasTranscript();
  els.copyTranscriptBtn.disabled = isBusy || !hasTranscript();
  els.exportTranscriptBtn.disabled = isBusy || !hasTranscript();
  els.copyNoteBtn.disabled = isBusy || !currentNoteMarkdown.trim();
  els.exportNoteBtn.disabled = isBusy || !currentNoteMarkdown.trim();
  els.saveSettingsBtn.disabled = isBusy;
  els.clearSettingsBtn.disabled = isBusy;
  els.checkDepsBtn.disabled = isBusy;
  els.installFfmpegBtn.disabled = isBusy;
}

async function ensureFfmpeg() {
  setBusy(true, "下載 ffmpeg 中");
  appendLog("開始下載 ffmpeg…");
  try {
    await window.podnote.installFfmpeg();
    setBusy(false, "ffmpeg 就緒", "ok");
    appendLog("ffmpeg 已就緒。");
    return true;
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
    return false;
  }
}

/* ===================== Source ===================== */

function setSourceType(type) {
  sourceType = type;
  els.youtubeSource.hidden = type !== "youtube";
  els.podcastSource.hidden = type !== "podcast";
  els.uploadSource.hidden = type !== "upload";
  els.srcYoutubeBtn.classList.toggle("secondary", type !== "youtube");
  els.srcPodcastBtn.classList.toggle("secondary", type !== "podcast");
  els.srcUploadBtn.classList.toggle("secondary", type !== "upload");
}

function renderSourceMeta(source) {
  currentSource = source;
  if (!source) {
    els.sourceMeta.hidden = true;
    els.sourceMeta.textContent = "";
    return;
  }
  const duration = formatDuration(source.duration);
  els.sourceMeta.hidden = false;
  els.sourceMeta.textContent = `${source.title}${duration ? ` · ${duration}` : ""}`;
}

function resetOutputs() {
  els.transcript.value = "";
  currentNoteMarkdown = "";
  renderNotePreview("");
  setTranscriptBadge("尚無逐字稿");
}

/* ===================== Transcription mode ===================== */

function setTranscriptionMode(mode) {
  transcriptionMode = mode;
  const isRemote = mode === "remote";
  els.remoteSettings.hidden = !isRemote;
  els.localSettings.hidden = isRemote;
  els.remoteModeBtn.classList.toggle("secondary", !isRemote);
  els.localModeBtn.classList.toggle("secondary", isRemote);
  setBusy(false, els.status.textContent, els.statusDot.classList[1]);
}

function setTranscriptBadge(label) {
  els.transcriptBadge.textContent = label || "尚無逐字稿";
}

/* ===================== Notes preview ===================== */

function renderNotePreview(markdown) {
  currentNoteMarkdown = markdown || "";
  if (!currentNoteMarkdown.trim()) {
    els.notePreview.className = "note-preview empty";
    els.notePreview.textContent = "筆記會以排版預覽顯示在這裡。";
    return;
  }
  els.notePreview.className = "note-preview";
  els.notePreview.innerHTML = renderMarkdown(currentNoteMarkdown);
}

/* ===================== Settings ===================== */

function resolveRemote() {
  const p = remoteConfig.provider;
  const cfg = remoteConfig[p];
  return {
    provider: p,
    apiKey: cfg.apiKey,
    model: cfg.model || PROVIDERS[p].models[0],
    baseUrl: cfg.baseUrl || PROVIDERS[p].baseUrl,
  };
}

function updateSettingsHint() {
  const missing = [];
  if (!settings.geminiApiKey) missing.push("Gemini(必填)");
  if (transcriptionMode === "remote" && !resolveRemote().apiKey) missing.push("轉錄 API (必填)");

  if (missing.length) {
    els.settingsHintText.textContent = `尚未設定金鑰：${missing.join("、")}。`;
    els.settingsHint.hidden = false;
  } else {
    els.settingsHint.hidden = true;
  }
}

function renderModelSelect(provider, selectedModel) {
  els.model.innerHTML = "";
  for (const name of PROVIDERS[provider].models) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    els.model.appendChild(option);
  }
  const custom = document.createElement("option");
  custom.value = CUSTOM_MODEL;
  custom.textContent = "自訂…";
  els.model.appendChild(custom);

  if (selectedModel && !PROVIDERS[provider].models.includes(selectedModel)) {
    els.model.value = CUSTOM_MODEL;
    els.modelCustomField.hidden = false;
    els.modelCustom.value = selectedModel;
  } else {
    els.model.value = selectedModel || PROVIDERS[provider].models[0];
    els.modelCustomField.hidden = true;
    els.modelCustom.value = "";
  }
}

function updateRemoteModelLabel() {
  const r = resolveRemote();
  els.remoteModelLabel.textContent = `${PROVIDERS[r.provider].label} · ${r.model}`;
}

function setProvider(provider) {
  const p = provider === "openai" ? "openai" : "groq";
  remoteConfig.provider = p;
  els.provGroqBtn.classList.toggle("secondary", p !== "groq");
  els.provOpenaiBtn.classList.toggle("secondary", p !== "openai");
  els.apiKey.placeholder = PROVIDERS[p].keyPlaceholder;
  els.apiKey.value = remoteConfig[p].apiKey;
  renderModelSelect(p, remoteConfig[p].model);
  els.baseUrl.value = remoteConfig[p].baseUrl || PROVIDERS[p].baseUrl;
  els.baseUrl.placeholder = PROVIDERS[p].baseUrl;
  updateRemoteModelLabel();
  updateSettingsHint();
}

function loadRemoteFromRaw(raw) {
  remoteConfig.groq.apiKey = raw.groqApiKey || "";
  remoteConfig.openai.apiKey = raw.openaiApiKey || "";
  remoteConfig.groq.model = raw.groqModel || PROVIDERS.groq.models[0];
  remoteConfig.openai.model = raw.openaiModel || PROVIDERS.openai.models[0];
  remoteConfig.groq.baseUrl = raw.groqBaseUrl || "";
  remoteConfig.openai.baseUrl = raw.openaiBaseUrl || "";

  let provider = raw.remoteProvider;
  if (!provider) {
    // Migrate legacy single-provider settings.
    const legacyBase = String(raw.remoteBaseUrl || "");
    provider = legacyBase.includes("openai.com") ? "openai" : "groq";
    if (raw.remoteApiKey && !remoteConfig[provider].apiKey) remoteConfig[provider].apiKey = raw.remoteApiKey;
    if (raw.remoteModel) remoteConfig[provider].model = raw.remoteModel;
    if (raw.remoteBaseUrl) remoteConfig[provider].baseUrl = raw.remoteBaseUrl;
  }
  remoteConfig.provider = provider === "openai" ? "openai" : "groq";
}

function buildSettingsPayload() {
  return {
    remoteProvider: remoteConfig.provider,
    groqApiKey: remoteConfig.groq.apiKey,
    groqModel: remoteConfig.groq.model,
    groqBaseUrl: remoteConfig.groq.baseUrl,
    openaiApiKey: remoteConfig.openai.apiKey,
    openaiModel: remoteConfig.openai.model,
    openaiBaseUrl: remoteConfig.openai.baseUrl,
    geminiApiKey: els.geminiKey.value,
    geminiModel: els.geminiModel.value,
  };
}

async function loadSettings() {
  settings = (await window.podnote.getSettings()) || {};
  if (settings.geminiApiKey) els.geminiKey.value = settings.geminiApiKey;
  if (settings.geminiModel) els.geminiModel.value = settings.geminiModel;
  loadRemoteFromRaw(settings);
  setProvider(remoteConfig.provider);
}

/* ===================== Local models ===================== */

function renderLocalModels() {
  els.localModel.innerHTML = "";
  for (const option of localModels) {
    const item = document.createElement("option");
    item.value = option.id;
    item.textContent = `${option.label} (${option.size})`;
    els.localModel.appendChild(item);
  }
  if (!els.localModel.value && localModels[0]) {
    els.localModel.value = localModels[0].id;
  }
  renderSelectedLocalModel();
}

function renderSelectedLocalModel() {
  const selected = localModels.find((option) => option.id === els.localModel.value);
  if (!selected) {
    els.localModelInfo.textContent = "";
    return;
  }
  els.localModelInfo.innerHTML = `
    <strong>${escapeHtml(selected.label)}</strong>
    <span>${escapeHtml(selected.size)}</span>
    <span>${escapeHtml(selected.downloaded ? "已下載" : "尚未下載")}</span>
    <small>${escapeHtml(selected.description)}</small>
  `;
  setBusy(false, els.status.textContent, els.statusDot.classList[1]);
}

async function refreshLocalModels() {
  localModels = await window.podnote.listLocalModels();
  renderLocalModels();
}

/* ===================== Dependencies ===================== */

function renderDependencies(checks) {
  els.dependencyList.innerHTML = "";
  for (const check of checks) {
    const row = document.createElement("div");
    row.className = `dependency-item ${check.ok ? "dependency-ok" : "dependency-error"}`;
    row.innerHTML = `
      <span>${escapeHtml(check.label)}${check.optional ? "（optional）" : ""}</span>
      <strong>${check.ok ? "OK" : "Missing"}</strong>
      <small>${escapeHtml(check.detail || "")}</small>
    `;
    els.dependencyList.appendChild(row);
  }
}

/* ===================== History ===================== */

function showHistoryList() {
  els.historyListView.hidden = false;
  els.historyDetailView.hidden = true;
}

function showHistoryDetail() {
  els.historyListView.hidden = true;
  els.historyDetailView.hidden = false;
}

async function refreshHistory() {
  historyItems = await window.podnote.listHistory();
  if (currentView === "history" && !els.historyListView.hidden) renderHistory();
}

function filteredHistory() {
  const term = els.historySearch.value.trim().toLowerCase();
  if (!term) return historyItems;
  return historyItems.filter((item) => {
    const haystack = `${item.title || ""}\n${item.transcript || ""}\n${item.note || ""}`.toLowerCase();
    return haystack.includes(term);
  });
}

function renderHistory() {
  const items = filteredHistory();
  els.history.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = historyItems.length ? "找不到符合的項目。" : "尚無儲存的逐字稿。";
    els.history.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "history-item";
    const modeLabel = item.transcriptionMode === "local" ? "Local" : "Remote";
    row.innerHTML = `
      <button class="history-load" type="button">
        <span class="history-title">${escapeHtml(item.title || "Untitled")}</span>
        <span class="history-date">${escapeHtml(new Date(item.createdAt).toLocaleString())} · ${modeLabel}${
          item.note ? " · 有筆記" : ""
        }</span>
      </button>
      <button class="history-delete secondary" type="button">刪除</button>
    `;
    row.querySelector(".history-load").addEventListener("click", () => openHistoryDetail(item));
    row.querySelector(".history-delete").addEventListener("click", async (event) => {
      event.stopPropagation();
      if (!confirm(`刪除「${item.title || "Untitled"}」？`)) return;
      await window.podnote.deleteHistoryItem(item.id);
      if (currentHistoryItemId === item.id) currentHistoryItemId = null;
      await refreshHistory();
      appendLog(`已刪除歷史項目：${item.title || item.id}`);
    });
    els.history.appendChild(row);
  }
}

function openHistoryDetail(item) {
  detailItem = item;
  const duration = formatDuration(item.duration);
  const modeLabel =
    item.transcriptionMode === "local"
      ? `Local · ${item.model || "model"}`
      : `Remote · ${item.model || "API"}`;

  els.detailTitle.textContent = item.title || "Untitled";
  els.detailMeta.textContent = `${new Date(item.createdAt).toLocaleString()} · ${modeLabel}${
    duration ? ` · ${duration}` : ""
  }`;
  els.detailTranscript.value = item.transcript || "";

  if (item.note) {
    els.detailNote.className = "note-preview";
    els.detailNote.innerHTML = renderMarkdown(item.note);
  } else {
    els.detailNote.className = "note-preview empty";
    els.detailNote.textContent = "這筆尚未生成筆記。";
  }

  showHistoryDetail();
}

function loadItemIntoGenerate(item) {
  setSourceType(item.url ? "youtube" : "upload");
  els.url.value = item.url || "";
  els.filePath.value = item.audioPath || "";
  els.transcript.value = item.transcript || "";
  currentHistoryItemId = item.id || null;
  currentSource = {
    title: item.title,
    url: item.url,
    webpageUrl: item.url,
    duration: item.duration,
  };
  renderSourceMeta(currentSource);
  renderNotePreview(item.note || "");
  setTranscriptBadge(
    item.transcriptionMode === "local"
      ? `Local · ${item.model || "model"}`
      : `Remote · ${item.model || "API"}`
  );
  els.showFileBtn.disabled = !item.audioPath;
  setView("generate");
  setBusy(false, "已載入歷史項目", "ok");
  appendLog(`已載入歷史項目：${item.title || item.id}`);
}

/* ===================== Actions ===================== */

async function downloadFromUrl(url) {
  setBusy(true, "下載中");
  resetOutputs();
  currentHistoryItemId = null;
  renderSourceMeta(null);
  appendLog("已要求下載。");

  try {
    const result = await window.podnote.downloadYoutube(url);
    els.filePath.value = result.filePath;
    renderSourceMeta({ ...result, url });
    els.showFileBtn.disabled = false;
    setBusy(false, "已下載", "ok");
    appendLog(`已下載：${result.title} -> ${result.filePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("FFMPEG_REQUIRED")) {
      setBusy(false, "需要 ffmpeg", "error");
      appendLog("這個連結需要 ffmpeg 才能下載。");
      if (confirm("這個連結需要 ffmpeg 才能下載，是否現在下載 ffmpeg？（約 90 MB，只需一次）")) {
        if (await ensureFfmpeg()) {
          appendLog("重試下載…");
          await downloadFromUrl(url);
        }
      }
      return;
    }
    logError(error);
    setBusy(false, "錯誤", "error");
  }
}

els.downloadBtn.addEventListener("click", () => downloadFromUrl(els.url.value));
els.podcastDownloadBtn.addEventListener("click", () => downloadFromUrl(els.podcastUrl.value));

els.pickFileBtn.addEventListener("click", async () => {
  try {
    const result = await window.podnote.pickAudioFile();
    if (result.canceled) return;
    resetOutputs();
    currentHistoryItemId = null;
    els.url.value = "";
    els.filePath.value = result.filePath;
    renderSourceMeta({ title: result.title, url: "", duration: null });
    els.showFileBtn.disabled = false;
    setBusy(false, "已選擇音檔", "ok");
    appendLog(`已選擇音檔：${result.filePath}`);
  } catch (error) {
    logError(error);
  }
});

async function transcribeRemotely() {
  const remote = resolveRemote();
  if (!remote.apiKey) {
    updateSettingsHint();
    appendLog("尚未設定轉錄 API 金鑰，請先到前置設定。");
    setStatus("缺少金鑰", "error");
    return;
  }

  setBusy(true, "遠端轉錄中");
  els.transcript.value = "";
  appendLog(`已要求轉錄（${PROVIDERS[remote.provider].label}）。`);

  try {
    const result = await window.podnote.transcribeAudio({
      filePath: els.filePath.value,
      apiKey: remote.apiKey,
      baseUrl: remote.baseUrl,
      model: remote.model,
      source: currentSource,
    });
    els.transcript.value = result.transcript;
    renderNotePreview("");
    currentHistoryItemId = result.historyItem?.id || null;
    setTranscriptBadge(`${PROVIDERS[remote.provider].label} · ${remote.model}`);
    await refreshHistory();
    setBusy(false, "完成", "ok");
    appendLog("轉錄完成並存入歷史。");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // 長節目超過 API 單檔上限時，後端會用 ffmpeg 切段；缺 ffmpeg 才走到這。
    if (message.includes("FFMPEG_REQUIRED")) {
      setBusy(false, "需要 ffmpeg", "error");
      appendLog("這個音檔較長，需要 ffmpeg 切段後上傳。");
      if (confirm("這個音檔較長，需要 ffmpeg 切段後上傳，是否現在下載 ffmpeg？（約 90 MB，只需一次）")) {
        if (await ensureFfmpeg()) {
          appendLog("重試轉錄…");
          await transcribeRemotely();
        }
      }
      return;
    }
    logError(error);
    setBusy(false, "錯誤", "error");
  }
}

els.transcribeBtn.addEventListener("click", async () => {
  if (transcriptionMode === "local") {
    await transcribeLocally();
    return;
  }
  await transcribeRemotely();
});

async function transcribeLocally() {
  setBusy(true, "本地轉錄中");
  els.transcript.value = "";
  const model = els.localModel.value;
  appendLog(`已要求本地轉錄：${model}`);

  try {
    const result = await window.podnote.transcribeLocal({
      filePath: els.filePath.value,
      model,
      source: currentSource,
    });
    els.transcript.value = result.transcript;
    renderNotePreview("");
    currentHistoryItemId = result.historyItem?.id || null;
    setTranscriptBadge(`Local · ${model}`);
    await refreshLocalModels();
    await refreshHistory();
    setBusy(false, "完成", "ok");
    appendLog("本地轉錄完成並存入歷史。");
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
  }
}

els.downloadModelBtn.addEventListener("click", async () => {
  setBusy(true, "下載模型中");
  const model = els.localModel.value;
  appendLog(`已要求下載本地模型：${model}`);

  try {
    await window.podnote.downloadLocalModel(model);
    await refreshLocalModels();
    setBusy(false, "模型就緒", "ok");
    appendLog(`本地模型就緒：${model}`);
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
  }
});

els.generateNoteBtn.addEventListener("click", async () => {
  if (!settings.geminiApiKey) {
    updateSettingsHint();
    appendLog("尚未設定 Gemini 金鑰，請先到前置設定。");
    setStatus("缺少金鑰", "error");
    return;
  }

  setBusy(true, "生成筆記中");
  renderNotePreview("");
  appendLog("已要求 Gemini 生成筆記。");

  try {
    const result = await window.podnote.generateNotes({
      transcript: els.transcript.value,
      apiKey: settings.geminiApiKey,
      model: settings.geminiModel,
      historyItemId: currentHistoryItemId,
    });
    renderNotePreview(result.note);
    if (result.historyItem?.id) currentHistoryItemId = result.historyItem.id;
    await refreshHistory();
    setBusy(false, "完成", "ok");
    appendLog("筆記已生成並存入歷史。");
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
  }
});

els.saveSettingsBtn.addEventListener("click", async () => {
  setBusy(true, "儲存設定中");
  try {
    settings = await window.podnote.saveSettings(buildSettingsPayload());
    updateRemoteModelLabel();
    updateSettingsHint();
    setBusy(false, "已儲存", "ok");
    appendLog("設定已儲存於本機。");
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
  }
});

els.clearSettingsBtn.addEventListener("click", async () => {
  if (!confirm("清除已儲存的 API 金鑰與模型設定？")) return;
  setBusy(true, "清除設定中");
  try {
    settings = await window.podnote.clearSettings();
    remoteConfig.groq = { apiKey: "", model: PROVIDERS.groq.models[0], baseUrl: "" };
    remoteConfig.openai = { apiKey: "", model: PROVIDERS.openai.models[0], baseUrl: "" };
    els.geminiKey.value = "";
    els.geminiModel.value = "gemini-2.5-flash";
    setProvider("groq");
    setBusy(false, "已清除", "ok");
    appendLog("設定已清除。");
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
  }
});

els.checkDepsBtn.addEventListener("click", async () => {
  setBusy(true, "檢查相依性中");
  try {
    const checks = await window.podnote.checkDependencies();
    renderDependencies(checks);
    setBusy(false, "已檢查", "ok");
    appendLog("相依性檢查完成。");
  } catch (error) {
    logError(error);
    setBusy(false, "錯誤", "error");
  }
});

els.installFfmpegBtn.addEventListener("click", async () => {
  if (await ensureFfmpeg()) {
    try {
      renderDependencies(await window.podnote.checkDependencies());
    } catch (error) {
      logError(error);
    }
  }
});

els.copyTranscriptBtn.addEventListener("click", async () => {
  await window.podnote.copyText(els.transcript.value);
  appendLog("已複製逐字稿。");
});

els.exportTranscriptBtn.addEventListener("click", async () => {
  const result = await window.podnote.exportText({
    text: els.transcript.value,
    title: `${currentSource?.title || "podnote"} transcript`,
    extension: "txt",
  });
  if (!result.canceled) appendLog(`已匯出逐字稿：${result.filePath}`);
});

els.copyNoteBtn.addEventListener("click", async () => {
  await window.podnote.copyText(currentNoteMarkdown);
  appendLog("已複製筆記。");
});

els.exportNoteBtn.addEventListener("click", async () => {
  const result = await window.podnote.exportText({
    text: currentNoteMarkdown,
    title: `${currentSource?.title || "podnote"} note`,
    extension: "md",
  });
  if (!result.canceled) appendLog(`已匯出筆記：${result.filePath}`);
});

els.showFileBtn.addEventListener("click", () => {
  if (els.filePath.value) window.podnote.showFile(els.filePath.value);
});

els.clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm("清空所有儲存的逐字稿？")) return;
  await window.podnote.clearHistory();
  await refreshHistory();
  renderHistory();
  appendLog("歷史已清空。");
});

/* History detail actions */
els.historyBackBtn.addEventListener("click", showHistoryList);
els.historySearch.addEventListener("input", renderHistory);

els.detailCopyTranscript.addEventListener("click", async () => {
  if (!detailItem) return;
  await window.podnote.copyText(detailItem.transcript || "");
  appendLog("已複製逐字稿。");
});

els.detailCopyNote.addEventListener("click", async () => {
  if (!detailItem) return;
  await window.podnote.copyText(detailItem.note || "");
  appendLog("已複製筆記。");
});

els.detailLoadToGenerate.addEventListener("click", () => {
  if (detailItem) loadItemIntoGenerate(detailItem);
});

els.detailDelete.addEventListener("click", async () => {
  if (!detailItem) return;
  if (!confirm(`刪除「${detailItem.title || "Untitled"}」？`)) return;
  await window.podnote.deleteHistoryItem(detailItem.id);
  if (currentHistoryItemId === detailItem.id) currentHistoryItemId = null;
  appendLog(`已刪除歷史項目：${detailItem.title || detailItem.id}`);
  detailItem = null;
  await refreshHistory();
  showHistoryList();
  renderHistory();
});

/* ===================== Wiring ===================== */

els.navItems.forEach((item) => {
  item.addEventListener("click", () => setView(item.dataset.view));
});

els.goSetupBtn.addEventListener("click", () => setView("setup"));
els.srcYoutubeBtn.addEventListener("click", () => setSourceType("youtube"));
els.srcPodcastBtn.addEventListener("click", () => setSourceType("podcast"));
els.srcUploadBtn.addEventListener("click", () => setSourceType("upload"));
els.remoteModeBtn.addEventListener("click", () => {
  setTranscriptionMode("remote");
  updateSettingsHint();
});
els.localModeBtn.addEventListener("click", () => {
  setTranscriptionMode("local");
  updateSettingsHint();
});
els.localModel.addEventListener("change", renderSelectedLocalModel);

els.provGroqBtn.addEventListener("click", () => setProvider("groq"));
els.provOpenaiBtn.addEventListener("click", () => setProvider("openai"));

els.apiKey.addEventListener("input", () => {
  remoteConfig[remoteConfig.provider].apiKey = els.apiKey.value;
  updateSettingsHint();
});

els.model.addEventListener("change", () => {
  const p = remoteConfig.provider;
  if (els.model.value === CUSTOM_MODEL) {
    els.modelCustomField.hidden = false;
    remoteConfig[p].model = els.modelCustom.value.trim();
  } else {
    els.modelCustomField.hidden = true;
    remoteConfig[p].model = els.model.value;
  }
  updateRemoteModelLabel();
});

els.modelCustom.addEventListener("input", () => {
  remoteConfig[remoteConfig.provider].model = els.modelCustom.value.trim();
  updateRemoteModelLabel();
});

els.baseUrl.addEventListener("input", () => {
  remoteConfig[remoteConfig.provider].baseUrl = els.baseUrl.value.trim();
});

els.advToggle.addEventListener("click", () => {
  const willShow = els.advBody.hidden;
  els.advBody.hidden = !willShow;
  els.advToggle.textContent = `${willShow ? "▾" : "▸"} 進階（Base URL）`;
});

els.logToggle.addEventListener("click", () => {
  const willShow = els.log.hidden;
  els.log.hidden = !willShow;
  els.logToggle.textContent = `${willShow ? "▾" : "▸"} Log`;
});

/* ===================== Init ===================== */

function setUpdateStatus(text) {
  if (text) {
    els.updateStatus.textContent = text;
    els.updateStatus.hidden = false;
  } else {
    els.updateStatus.hidden = true;
    els.updateStatus.textContent = "";
  }
}

function handleUpdateStatus(payload) {
  if (!payload) return;
  switch (payload.status) {
    case "checking":
      setUpdateStatus("檢查更新中…");
      break;
    case "available":
      setUpdateStatus(`發現新版 v${payload.version}，下載中…`);
      break;
    case "downloading":
      setUpdateStatus(`下載更新中… ${payload.percent || 0}%`);
      break;
    case "downloaded":
      setUpdateStatus(`更新 v${payload.version} 已就緒`);
      els.updateBtn.hidden = false;
      break;
    case "none":
      setUpdateStatus("");
      break;
    case "error":
      setUpdateStatus("");
      appendLog(`更新檢查失敗：${payload.message || ""}`);
      break;
    default:
      break;
  }
}

function applyCapabilities(info) {
  if (info && info.version) {
    els.appVersion.textContent = `v${info.version}`;
  }
  if (info && info.localTranscription === false) {
    // Remote-only (packaged) build: drop the local transcription affordances.
    els.transcribeModeSeg.hidden = true;
    setTranscriptionMode("remote");
  } else {
    refreshLocalModels().catch(logError);
  }
}

els.updateBtn.addEventListener("click", () => window.podnote.installUpdate());
window.podnote.onUpdateStatus(handleUpdateStatus);
window.podnote.onLog((line) => appendLog(line));
setSourceType("youtube");
setTranscriptionMode("remote");
setView("setup");

refreshHistory().catch(logError);
loadSettings().catch(logError);
window.podnote.getAppInfo().then(applyCapabilities).catch((error) => {
  logError(error);
  refreshLocalModels().catch(logError);
});
