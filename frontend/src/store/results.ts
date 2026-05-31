// 暫存逐字稿（記憶體內），讓筆記頁能依 job id 取用。
// MVP 用 Map 即可；之後要保存歷史筆記再換 AsyncStorage / SQLite。
const cache = new Map<string, string>();

export function saveTranscript(jobId: string, transcript: string): void {
  cache.set(jobId, transcript);
}

export function loadTranscript(jobId: string): string | undefined {
  return cache.get(jobId);
}
