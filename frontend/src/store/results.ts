// 暫存「剛轉好、尚未生成筆記」的逐字稿與來源資訊（記憶體內，依 job id 取用）。
// 一旦在筆記頁生成筆記，就會持久化到 notes store（見 src/store/notes.ts）。
export interface PendingTranscript {
  transcript: string;
  title: string;
  url: string;
}

const cache = new Map<string, PendingTranscript>();

export function savePending(jobId: string, data: PendingTranscript): void {
  cache.set(jobId, data);
}

export function loadPending(jobId: string): PendingTranscript | undefined {
  return cache.get(jobId);
}
