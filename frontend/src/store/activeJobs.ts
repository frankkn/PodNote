import { TranscribeMode } from "@/api/backend";

export interface ActiveJob {
  id: string;
  url: string;
  mode: TranscribeMode;
  state: "pending" | "running" | "done" | "error";
  stage: string | null;
  progress: number;
  title: string | null;
  transcript: string | null;
  error: string | null;
}

let _jobs: ActiveJob[] = [];
const _listeners = new Set<() => void>();

function _notify(): void {
  _listeners.forEach((fn) => fn());
}

export function addJob(id: string, url: string, mode: TranscribeMode): void {
  _jobs = [
    ..._jobs,
    {
      id,
      url,
      mode,
      state: "pending",
      stage: null,
      progress: 0,
      title: null,
      transcript: null,
      error: null,
    },
  ];
  _notify();
}

export function updateJob(id: string, updates: Partial<ActiveJob>): void {
  _jobs = _jobs.map((j) => (j.id === id ? { ...j, ...updates } : j));
  _notify();
}

export function dismissJob(id: string): void {
  _jobs = _jobs.filter((j) => j.id !== id);
  _notify();
}

export function getJobs(): ActiveJob[] {
  return _jobs;
}

export function subscribe(fn: () => void): () => void {
  _listeners.add(fn);
  return () => {
    _listeners.delete(fn);
  };
}
