import { useCallback, useEffect, useRef, useState } from "react";

import { getJob, JobStatus } from "@/api/backend";

const POLL_INTERVAL_MS = 3000;

export function useJobPolling() {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // 輪詢直到 done / error；回傳最終狀態。
  const start = useCallback(
    (jobId: string) =>
      new Promise<JobStatus>((resolve, reject) => {
        const tick = async () => {
          try {
            const s = await getJob(jobId);
            setStatus(s);
            if (s.state === "done") return resolve(s);
            if (s.state === "error") return reject(new Error(s.error ?? "轉檔失敗"));
            timer.current = setTimeout(tick, POLL_INTERVAL_MS);
          } catch (err) {
            reject(err);
          }
        };
        tick();
      }),
    []
  );

  useEffect(() => stop, [stop]);

  return { status, start, stop };
}
