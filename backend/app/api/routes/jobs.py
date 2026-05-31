from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import settings
from app.core.job_store import store
from app.schemas import (
    CreateJobRequest,
    CreateJobResponse,
    JobState,
    JobStatusResponse,
)
from app.services.downloader import download_audio
from app.services.transcriber import transcribe

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _run_job(job_id: str, url: str) -> None:
    """背景執行：下載 → 轉檔。失敗時把錯誤寫進 job。"""
    store.update(job_id, state=JobState.running, stage="downloading")
    try:
        path, title = download_audio(url, settings.download_dir)
        store.update(job_id, title=title, stage="transcribing")

        def on_progress(p: float) -> None:
            store.update(job_id, progress=round(p, 3))

        text = transcribe(path, on_progress=on_progress)
        store.update(
            job_id,
            state=JobState.done,
            stage="done",
            progress=1.0,
            transcript=text,
        )
    except Exception as exc:  # noqa: BLE001 - 任何失敗都回報給前端
        store.update(job_id, state=JobState.error, stage="error", error=str(exc))


@router.post("", response_model=CreateJobResponse)
def create_job(
    payload: CreateJobRequest, background: BackgroundTasks
) -> CreateJobResponse:
    job = store.create()
    background.add_task(_run_job, job.id, str(payload.url))
    return CreateJobResponse(job_id=job.id, state=job.state)


@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str) -> JobStatusResponse:
    job = store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return JobStatusResponse(
        job_id=job.id,
        state=job.state,
        stage=job.stage,
        progress=job.progress,
        title=job.title,
        transcript=job.transcript,
        error=job.error,
    )
