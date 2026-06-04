const els = {
  url: document.querySelector("#url"),
  status: document.querySelector("#status"),
  downloadBtn: document.querySelector("#downloadBtn"),
  showFileBtn: document.querySelector("#showFileBtn"),
  filePath: document.querySelector("#filePath"),
  sourceMeta: document.querySelector("#sourceMeta"),
  apiKey: document.querySelector("#apiKey"),
  baseUrl: document.querySelector("#baseUrl"),
  model: document.querySelector("#model"),
  transcribeBtn: document.querySelector("#transcribeBtn"),
  transcript: document.querySelector("#transcript"),
  clearLogBtn: document.querySelector("#clearLogBtn"),
  clearHistoryBtn: document.querySelector("#clearHistoryBtn"),
  history: document.querySelector("#history"),
  log: document.querySelector("#log"),
};

let currentSource = null;

function setBusy(isBusy, label) {
  els.status.textContent = label || (isBusy ? "Working" : "Idle");
  els.downloadBtn.disabled = isBusy;
  els.transcribeBtn.disabled = isBusy || !els.filePath.value;
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
    const row = document.createElement("button");
    row.className = "history-item";
    row.type = "button";
    row.innerHTML = `
      <span class="history-title">${escapeHtml(item.title || "Untitled")}</span>
      <span class="history-date">${escapeHtml(new Date(item.createdAt).toLocaleString())}</span>
    `;
    row.addEventListener("click", () => {
      els.url.value = item.url || "";
      els.filePath.value = item.audioPath || "";
      els.transcript.value = item.transcript || "";
      els.showFileBtn.disabled = !item.audioPath;
      els.transcribeBtn.disabled = !item.audioPath;
      renderSourceMeta({
        title: item.title,
        url: item.url,
        webpageUrl: item.url,
        duration: item.duration,
      });
      appendLog(`Loaded history item: ${item.title || item.id}`);
    });
    els.history.appendChild(row);
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

async function refreshHistory() {
  const items = await window.podnote.listHistory();
  renderHistory(items);
}

window.podnote.onLog((line) => appendLog(line));
refreshHistory().catch((error) => appendLog(error instanceof Error ? error.message : String(error)));

els.downloadBtn.addEventListener("click", async () => {
  setBusy(true, "Downloading");
  els.transcript.value = "";
  renderSourceMeta(null);
  appendLog("Download requested.");

  try {
    const result = await window.podnote.downloadYoutube(els.url.value);
    els.filePath.value = result.filePath;
    renderSourceMeta({ ...result, url: els.url.value });
    els.showFileBtn.disabled = false;
    els.transcribeBtn.disabled = false;
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
    await refreshHistory();
    appendLog("Transcription completed and saved to history.");
    setBusy(false, "Done");
  } catch (error) {
    appendLog(error instanceof Error ? error.message : String(error));
    setBusy(false, "Error");
  }
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
