const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("podnote", {
  downloadYoutube: (url) => ipcRenderer.invoke("youtube:download", { url }),
  transcribeAudio: (payload) => ipcRenderer.invoke("audio:transcribe", payload),
  showFile: (filePath) => ipcRenderer.invoke("dialog:showFile", { filePath }),
  onLog: (callback) => {
    const handler = (_event, line) => callback(line);
    ipcRenderer.on("job:log", handler);
    return () => ipcRenderer.removeListener("job:log", handler);
  },
});
