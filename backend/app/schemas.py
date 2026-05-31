from enum import Enum

from pydantic import BaseModel, HttpUrl


class JobState(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    error = "error"


class CreateJobRequest(BaseModel):
    url: HttpUrl


class CreateJobResponse(BaseModel):
    job_id: str
    state: JobState


class JobStatusResponse(BaseModel):
    job_id: str
    state: JobState
    stage: str | None = None
    progress: float | None = None
    title: str | None = None
    transcript: str | None = None
    error: str | None = None
