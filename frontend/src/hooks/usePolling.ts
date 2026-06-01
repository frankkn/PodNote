import { getJob } from "@/api/backend";
import { updateJob } from "@/store/activeJobs";

const POLL_MS = 3000;
const _timers = new Map<string, ReturnType<typeof setTimeout>>();

export function startPolling(jobId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const s = await getJob(jobId);
        updateJob(jobId, {
          state: s.state as "pending" | "running" | "done" | "error",
          stage: s.stage ?? null,
          progress: s.progress ?? 0,
          title: s.title ?? null,
          transcript: s.transcript ?? null,
          error: s.error ?? null,
        });
        if (s.state === "done") {
          _timers.delete(jobId);
          resolve();
        } else if (s.state === "error") {
          _timers.delete(jobId);
          reject(new Error(s.error ?? "轉檔失敗"));
        } else {
          _timers.set(jobId, setTimeout(tick, POLL_MS));
        }
      } catch (err) {
        _timers.delete(jobId);
        reject(err);
      }
    };
    tick();
  });
}

export function stopPolling(jobId: string): void {
  const t = _timers.get(jobId);
  if (t) clearTimeout(t);
  _timers.delete(jobId);
}
