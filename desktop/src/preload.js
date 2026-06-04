const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("podnote", {
  downloadYoutube: (url) => ipcRenderer.invoke("youtube:download", { url }),
  transcribeAudio: (payload) => ipcRenderer.invoke("audio:transcribe", payload),
  listLocalModels: () => ipcRenderer.invoke("local:model-options"),
  downloadLocalModel: (model) => ipcRenderer.invoke("local:download-model", { model }),
  transcribeLocal: (payload) => ipcRenderer.invoke("local:transcribe", payload),
  generateNotes: (payload) => ipcRenderer.invoke("notes:generate", payload),
  showFile: (filePath) => ipcRenderer.invoke("dialog:showFile", { filePath }),
  listHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  onLog: (callback) => {
    const handler = (_event, line) => callback(line);
    ipcRenderer.on("job:log", handler);
    return () => ipcRenderer.removeListener("job:log", handler);
  },
});
