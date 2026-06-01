import threading
import uuid
from dataclasses import dataclass
from typing import Optional

from app.schemas import JobState


@dataclass
class Job:
    id: str
    mode: str = "gpu"  # "cpu"（慢速）或 "gpu"（快速）；用於分模式計算併發
    state: JobState = JobState.pending
    stage: Optional[str] = None
    progress: float = 0.0
    title: Optional[str] = None
    transcript: Optional[str] = None
    error: Optional[str] = None


class JobStore:
    """最小可用的 in-memory 任務存放區。

    MVP 階段足夠；之後若要在 HF Spaces 重啟後保留任務，
    可換成 SQLite 或 Redis。
    """

    def __init__(self) -> None:
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()

    def create(self, mode: str = "gpu") -> Job:
        job = Job(id=uuid.uuid4().hex, mode=mode)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    _ACTIVE = (JobState.pending, JobState.running)

    def active_count(self) -> int:
        """進行中（pending 或 running）的任務數。"""
        with self._lock:
            return sum(1 for j in self._jobs.values() if j.state in self._ACTIVE)

    def active_count_for_mode(self, mode: str) -> int:
        """指定模式進行中的任務數（CPU 用來保護伺服器一次只跑一個）。"""
        with self._lock:
            return sum(
                1
                for j in self._jobs.values()
                if j.mode == mode and j.state in self._ACTIVE
            )

    def update(self, job_id: str, **fields) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for key, value in fields.items():
                setattr(job, key, value)


store = JobStore()
