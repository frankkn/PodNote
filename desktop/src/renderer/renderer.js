const els = {
  url: document.querySelector("#url"),
  status: document.querySelector("#status"),
  downloadBtn: document.querySelector("#downloadBtn"),
  saveSettingsBtn: document.querySelector("#saveSettingsBtn"),
  clearSettingsBtn: document.querySelector("#clearSettingsBtn"),
  checkDepsBtn: document.querySelector("#checkDepsBtn"),
  dependencyList: document.querySelector("#dependencyList"),
  showFileBtn: document.querySelector("#showFileBtn"),
  filePath: document.querySelector("#filePath"),
  sourceMeta: document.querySelector("#sourceMeta"),
  apiKey: document.querySelector("#apiKey"),
  baseUrl: document.querySelector("#baseUrl"),
  model: document.querySelector("#model"),
  transcribeBtn: document.querySelector("#transcribeBtn"),
  localModel: document.querySelector("#localModel"),
  localModelInfo: document.querySelector("#localModelInfo"),
  downloadModelBtn: document.querySelector("#downloadModelBtn"),
  localTranscribeBtn: document.querySelector("#localTranscribeBtn"),
  geminiKey: document.querySelector("#geminiKey"),
  geminiModel: document.querySelector("#geminiModel"),
  generateNoteBtn: document.querySelector("#generateNoteBtn"),
  transcript: document.querySelector("#transcript"),
  note: document.querySelector("#note"),
  copyTranscriptBtn: document.querySelector("#copyTranscriptBtn"),
  exportTranscriptBtn: document.querySelector("#exportTranscriptBtn"),
  copyNoteBtn: document.querySelector("#copyNoteBtn"),
  exportNoteBtn: document.querySelector("#exportNoteBtn"),
  clearLogBtn: document.querySelector("#clearLogBtn"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  history: document.querySelector("#history"),
  log: document.querySelector("#log"),
};

let currentSource = null;
let currentHistoryItemId = null;
let localModels = [];

function setBusy(isBusy, label) {
  els.status.textContent = label || (isBusy ? "Working" : "Idle");
  els.downloadBtn.disabled = isBusy;
  els.transcribeBtn.disabled = isBusy || !els.filePath.value;
  els.downloadModelBtn.disabled = isBusy || !els.localModel.value;
  els.localTranscribeBtn.disabled = isBusy || !els.filePath.value || !els.localModel.value;
  els.generateNoteBtn.disabled = isBusy || !els.transcript.value.trim();
  els.copyTranscriptBtn.disabled = isBusy || !els.transcript.value.trim();
  els.exportTranscriptBtn.disabled = isBusy || !els.transcript.value.trim();
  els.copyNoteBtn.disabled = isBusy || !els.note.value.trim();
  els.exportNoteBtn.disabled = isBusy || !els.note.value.trim();
  els.saveSettingsBtn.disabled = isBusy;
  els.clearSettingsBtn.disabled = isBusy;
  els.checkDepsBtn.disabled = isBusy;
}

function appendLog(line) {
  const timestamp = new Date().toLocaleTimeString();
  els.log.textContent += `[${timestamp}] ${line}\n`;
  els.log.scrollTop = els.log.scrollHeight;
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
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

function renderHistory(items) {
  els.history.innerHTML = "";

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No saved transcripts yet.";
    els.history.appendChild(empty);
    return;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "history-item";
    row.innerHTML = `
      <button class="history-load" type="button">
        <span class="history-title">${escapeHtml(item.title || "Untitled")}</span>
        <span class="history-date">${escapeHtml(new Date(item.createdAt).toLocaleString())}${item.note ? " · note" : ""}</span>
      </button>
      <button class="history-delete secondary" type="button">Delete</button>
    `;
    row.querySelector(".history-load").addEventListener("click", () => {
      els.url.value = item.url || "";
      els.filePath.value = item.audioPath || "";
      els.transcript.value = item.transcript || "";
      els.note.value = item.note || "";
      currentHistoryItemId = item.id || null;
      els.showFileBtn.disabled = !item.audioPath;
      els.transcribeBtn.disabled = !item.audioPath;
      els.localTranscribeBtn.disabled = !item.audioPath;
      els.generateNoteBtn.disabled = !item.transcript;
      renderSourceMeta({
        title: item.title,
        url: item.url,
        webpageUrl: item.url,
        duration: item.duration,
      });
      setBusy(false, els.status.textContent);
      appendLog(`Loaded history item: ${item.title || item.id}`);
    });
    row.querySelector(".history-delete").addEventListener("click", async () => {
      if (!confirm(`Delete "${item.title || "Untitled"}"?`)) return;
      await window.podnote.deleteHistoryItem(item.id);
      if (currentHistoryItemId === item.id) currentHistoryItemId = null;
      await refreshHistory();
      appendLog(`Deleted history item: ${item.title || item.id}`);
    });
    els.history.appendChild(row);
  }
}

function renderDependencies(checks) {
  els.dependencyList.innerHTML = "";

  for (const check of checks) {
    const row = document.createElement("div");
    row.className = `dependency-item ${check.ok ? "dependency-ok" : "dependency-error"}`;
    row.innerHTML = `
      <span>${escapeHtml(check.label)}${check.optional ? " (optional)" : ""}</span>
      <strong>${check.ok ? "OK" : "Missing"}</strong>
      <small>${escapeHtml(check.detail || "")}</small>
    `;
    els.dependencyList.appendChild(row);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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
    <span>${escapeHtml(selected.downloaded ? "Downloaded" : "Not downloaded yet")}</span>
    <small>${escapeHtml(selected.description)}</small>
  `;
  setBusy(false, els.status.textContent);
}

async function refreshHistory() {
  const items = await window.podnote.listHistory();
  renderHistory(items);
}

async function refreshLocalModels() {
  localModels = await window.podnote.listLocalModels();
  renderLocalModels();
}

async function loadSettings() {
  const settings = await window.podnote.getSettings();
  if (settings.remoteApiKey) els.apiKey.value = settings.remoteApiKey;
  if (settings.remoteBaseUrl) els.baseUrl.value = settings.remoteBaseUrl;
  if (settings.remoteModel) els.model.value = settings.remoteModel;
  if (settings.geminiApiKey) els.geminiKey.value = settings.geminiApiKey;
  if (settings.geminiModel) els.geminiModel.value = settings.geminiModel;
}

window.podnote.onLog((line) => appendLog(line));
refreshHistory().catch((error) => appendLog(error instanceof Error ? error.message : String(error)));
refreshLocalModels().catch((error) => appendLog(error instanceof Error ? error.message : String(error)));
loadSettings().catch((error) => appendLog(error instanceof Error ? error.message : String(error)));

els.downloadBtn.addEventListener("click", async () => {
  setBusy(true, "Downloading");
  els.transcript.value = "";
  els.note.value = "";
  currentHistoryItemId = null;
  renderSourceMeta(null);
  appendLog("Download requested.");

  try {
    const result = await window.podnote.downloadYoutube(els.url.value);
    els.filePath.value = result.filePath;
    renderSourceMeta({ ...result, url: els.url.value });
    els.showFileBtn.disabled = false;
    els.transcribeBtn.disabled = false;
    els.localTranscribeBtn.disabled = false;
    appendLog(`Downloaded: ${result.title} -> ${result.filePath}`);
    setBusy(false, "Downloaded");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.transcribeBtn.addEventListener("click", async () => {
  setBusy(true, "Transcribing");
  els.transcript.value = "";
  appendLog("Transcription requested.");

  try {
    const result = await window.podnote.transcribeAudio({
      filePath: els.filePath.value,
      apiKey: els.apiKey.value,
      baseUrl: els.baseUrl.value,
      model: els.model.value,
      source: currentSource,
    });
    els.transcript.value = result.transcript;
    els.note.value = "";
    currentHistoryItemId = result.historyItem?.id || null;
    await refreshHistory();
    appendLog("Transcription completed and saved to history.");
    setBusy(false, "Done");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.downloadModelBtn.addEventListener("click", async () => {
  setBusy(true, "Downloading model");
  const model = els.localModel.value;
  appendLog(`Local model download requested: ${model}`);

  try {
    await window.podnote.downloadLocalModel(model);
    await refreshLocalModels();
    appendLog(`Local model ready: ${model}`);
    setBusy(false, "Model ready");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.localTranscribeBtn.addEventListener("click", async () => {
  setBusy(true, "Local transcribing");
  els.transcript.value = "";
  const model = els.localModel.value;
  appendLog(`Local transcription requested: ${model}`);

  try {
    const result = await window.podnote.transcribeLocal({
      filePath: els.filePath.value,
      model,
      source: currentSource,
    });
    els.transcript.value = result.transcript;
    els.note.value = "";
    currentHistoryItemId = result.historyItem?.id || null;
    await refreshLocalModels();
    await refreshHistory();
    appendLog("Local transcription completed and saved to history.");
    setBusy(false, "Done");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.generateNoteBtn.addEventListener("click", async () => {
  setBusy(true, "Generating notes");
  els.note.value = "";
  appendLog("Gemini note generation requested.");

  try {
    const result = await window.podnote.generateNotes({
      transcript: els.transcript.value,
      apiKey: els.geminiKey.value,
      model: els.geminiModel.value,
      historyItemId: currentHistoryItemId,
    });
    els.note.value = result.note;
    if (result.historyItem?.id) currentHistoryItemId = result.historyItem.id;
    await refreshHistory();
    appendLog("Notes generated and saved to history.");
    setBusy(false, "Done");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.saveSettingsBtn.addEventListener("click", async () => {
  setBusy(true, "Saving settings");
  try {
    await window.podnote.saveSettings({
      remoteApiKey: els.apiKey.value,
      remoteBaseUrl: els.baseUrl.value,
      remoteModel: els.model.value,
      geminiApiKey: els.geminiKey.value,
      geminiModel: els.geminiModel.value,
    });
    appendLog("Settings saved locally.");
    setBusy(false, "Saved");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.clearSettingsBtn.addEventListener("click", async () => {
  if (!confirm("Clear saved API keys and model settings?")) return;
  setBusy(true, "Clearing settings");
  try {
    await window.podnote.clearSettings();
    els.apiKey.value = "";
    els.baseUrl.value = "https://api.groq.com/openai/v1";
    els.model.value = "whisper-large-v3";
    els.geminiKey.value = "";
    els.geminiModel.value = "gemini-2.5-flash";
    appendLog("Settings cleared.");
    setBusy(false, "Cleared");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.checkDepsBtn.addEventListener("click", async () => {
  setBusy(true, "Checking dependencies");
  try {
    const checks = await window.podnote.checkDependencies();
    renderDependencies(checks);
    appendLog("Dependency check completed.");
    setBusy(false, "Checked");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
});

els.copyTranscriptBtn.addEventListener("click", async () => {
  await window.podnote.copyText(els.transcript.value);
  appendLog("Transcript copied.");
});

els.exportTranscriptBtn.addEventListener("click", async () => {
  const result = await window.podnote.exportText({
    text: els.transcript.value,
    title: `${currentSource?.title || "podnote"} transcript`,
    extension: "txt",
  });
  if (!result.canceled) appendLog(`Transcript exported: ${result.filePath}`);
});

els.copyNoteBtn.addEventListener("click", async () => {
  await window.podnote.copyText(els.note.value);
  appendLog("Note copied.");
});

els.exportNoteBtn.addEventListener("click", async () => {
  const result = await window.podnote.exportText({
    text: els.note.value,
    title: `${currentSource?.title || "podnote"} note`,
    extension: "md",
  });
  if (!result.canceled) appendLog(`Note exported: ${result.filePath}`);
});

els.showFileBtn.addEventListener("click", () => {
  if (els.filePath.value) window.podnote.showFile(els.filePath.value);
});

els.clearLogBtn.addEventListener("click", () => {
  els.log.textContent = "";
});

els.clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm("Clear all saved transcripts?")) return;
  await window.podnote.clearHistory();
  await refreshHistory();
  appendLog("History cleared.");
});

els.localModel.addEventListener("change", renderSelectedLocalModel);
