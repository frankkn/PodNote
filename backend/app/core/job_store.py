import threading
import uuid
from dataclasses import dataclass
from typing import Optional

from app.schemas import JobState


@dataclass
class Job:
    id: str
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

    def create(self) -> Job:
        job = Job(id=uuid.uuid4().hex)
        with self._lock:
            self._jobs[job.id] = job
        return job

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def update(self, job_id: str, **fields) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for key, value in fields.items():
                setattr(job, key, value)


store = JobStore()
