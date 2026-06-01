import { useSyncExternalStore } from "react";

import { getJobs, subscribe, ActiveJob } from "@/store/activeJobs";

export function useActiveJobs(): ActiveJob[] {
  return useSyncExternalStore(subscribe, getJobs);
}
