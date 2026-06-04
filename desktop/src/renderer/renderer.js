const els = {
  url: document.querySelector("#url"),
  status: document.querySelector("#status"),
  downloadBtn: document.querySelector("#downloadBtn"),
  showFileBtn: document.querySelector("#showFileBtn"),
  filePath: document.querySelector("#filePath"),
  apiKey: document.querySelector("#apiKey"),
  baseUrl: document.querySelector("#baseUrl"),
  model: document.querySelector("#model"),
  transcribeBtn: document.querySelector("#transcribeBtn"),
  transcript: document.querySelector("#transcript"),
  clearLogBtn: document.querySelector("#clearLogBtn"),
  log: document.querySelector("#log"),
};

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

window.podnote.onLog((line) => appendLog(line));

els.downloadBtn.addEventListener("click", async () => {
  setBusy(true, "Downloading");
  els.transcript.value = "";
  appendLog("Download requested.");

  try {
    const result = await window.podnote.downloadYoutube(els.url.value);
    els.filePath.value = result.filePath;
    els.showFileBtn.disabled = false;
    els.transcribeBtn.disabled = false;
    appendLog(`Downloaded: ${result.filePath}`);
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
    });
    els.transcript.value = result.transcript;
    appendLog("Transcription completed.");
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
