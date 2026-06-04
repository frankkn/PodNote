const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("podnote", {
  downloadYoutube: (url) => ipcRenderer.invoke("youtube:download", { url }),
  transcribeAudio: (payload) => ipcRenderer.invoke("audio:transcribe", payload),
  listLocalModels: () => ipcRenderer.invoke("local:model-options"),
  downloadLocalModel: (model) => ipcRenderer.invoke("local:download-model", { model }),
  transcribeLocal: (payload) => ipcRenderer.invoke("local:transcribe", payload),
  generateNotes: (payload) => ipcRenderer.invoke("notes:generate", payload),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", { settings }),
  clearSettings: () => ipcRenderer.invoke("settings:clear"),
  checkDependencies: () => ipcRenderer.invoke("dependencies:check"),
  copyText: (text) => ipcRenderer.invoke("clipboard:write", { text }),
  exportText: (payload) => ipcRenderer.invoke("export:text", payload),
  showFile: (filePath) => ipcRenderer.invoke("dialog:showFile", { filePath }),
  listHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  deleteHistoryItem: (id) => ipcRenderer.invoke("history:delete", { id }),
  onLog: (callback) => {
    const handler = (_event, line) => callback(line);
    ipcRenderer.on("job:log", handler);
    return () => ipcRenderer.removeListener("job:log", handler);
  },
});
