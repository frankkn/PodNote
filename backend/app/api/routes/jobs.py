from fastapi import APIRouter, BackgroundTasks, HTTPException, Request

from app.config import settings
from app.core.job_store import store
from app.core.limits import RateLimiter
from app.schemas import (
    CreateJobRequest,
    CreateJobResponse,
    JobState,
    JobStatusResponse,
)
from app.services.downloader import download_audio, probe
from app.services.transcriber import transcribe

router = APIRouter(prefix="/jobs", tags=["jobs"])

rate_limiter = RateLimiter(settings.rate_limit_per_hour, 3600)


def _client_ip(request: Request) -> str:
    # HF Spaces 在反向代理後面，真實 IP 在 X-Forwarded-For 的第一個。
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _run_job(job_id: str, url: str) -> None:
    """背景執行：檢查長度 → 下載 → 轉檔。失敗時把錯誤寫進 job。"""
    store.update(job_id, state=JobState.running, stage="probing")
    try:
        title, duration = probe(url)
        store.update(job_id, title=title)

        if duration and duration > settings.max_audio_seconds:
            store.update(
                job_id,
                state=JobState.error,
                stage="error",
                error=(
                    f"節目太長（約 {duration // 60} 分鐘），"
                    f"目前上限 {settings.max_audio_seconds // 60} 分鐘。"
                ),
            )
            return

        store.update(job_id, stage="downloading")
        path, _ = download_audio(url, settings.download_dir)
        store.update(job_id, stage="transcribing")

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
    payload: CreateJobRequest, background: BackgroundTasks, request: Request
) -> CreateJobResponse:
    # 防濫用：速率限制（每 IP）
    if not rate_limiter.allow(_client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail=(
                f"請求過於頻繁，每小時最多 {settings.rate_limit_per_hour} 次，"
                "請稍後再試。"
            ),
        )
    # 防濫用：同時處理數（免費 CPU 一次一個）
    if store.active_count() >= settings.max_concurrent_jobs:
        raise HTTPException(
            status_code=429,
            detail="目前有任務正在處理中（免費伺服器一次只能處理一個），請稍後再試。",
        )

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
