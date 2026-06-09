from enum import Enum
from typing import Literal

from pydantic import BaseModel, HttpUrl


class JobState(str, Enum):
    pending = "pending"
    running = "running"
    done = "done"
    error = "error"


# 轉錄模式：cpu = 慢速(免設定)，gpu = 快速(需自帶 Groq key)
TranscribeMode = Literal["cpu", "gpu"]


class CreateJobRequest(BaseModel):
    url: HttpUrl
    mode: TranscribeMode = "gpu"
    # 使用者自帶的轉錄 API Key（Groq 或 OpenAI 擇一）。後端過水使用、不儲存、不寫 log。
    groq_api_key: str | None = None
    openai_api_key: str | None = None


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
