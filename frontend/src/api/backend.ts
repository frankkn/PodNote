import { BACKEND_URL } from "@/config";

export type JobState = "pending" | "running" | "done" | "error";

export interface JobStatus {
  job_id: string;
  state: JobState;
  stage?: string | null;
  progress?: number | null;
  title?: string | null;
  transcript?: string | null;
  error?: string | null;
}

export async function createJob(
  url: string
): Promise<{ job_id: string; state: JobState }> {
  const res = await fetch(`${BACKEND_URL}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`建立任務失敗 (${res.status})`);
  return res.json();
}

export async function getJob(jobId: string): Promise<JobStatus> {
  const res = await fetch(`${BACKEND_URL}/jobs/${jobId}`);
  if (!res.ok) throw new Error(`查詢任務失敗 (${res.status})`);
  return res.json();
}
