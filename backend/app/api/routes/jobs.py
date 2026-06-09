import os

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


def _run_job(
    job_id: str,
    url: str,
    mode: str,
    api_key: str | None,
    base_url: str | None = None,
    stt_model: str | None = None,
) -> None:
    """背景執行：檢查長度 → 下載 → 轉檔。失敗時把錯誤寫進 job。

    api_key / base_url / stt_model 僅在此函式內過水使用，不寫進 job_store、不記錄。
    """
    store.update(job_id, state=JobState.running, stage="probing")
    path: str | None = None
    try:
        title, duration = probe(url)
        store.update(job_id, title=title)

        limit = (
            settings.max_audio_seconds_gpu
            if mode == "gpu"
            else settings.max_audio_seconds
        )
        if duration and duration > limit:
            store.update(
                job_id,
                state=JobState.error,
                stage="error",
                error=(
                    f"節目太長（約 {duration // 60} 分鐘），"
                    f"此模式上限 {limit // 60} 分鐘。"
                ),
            )
            return

        store.update(job_id, stage="downloading")
        path, _ = download_audio(url, settings.download_dir)
        store.update(job_id, stage="transcribing")

        def on_progress(p: float) -> None:
            store.update(job_id, progress=round(p, 3))

        def on_partial(partial: str) -> None:
            store.update(job_id, transcript=partial)

        text = transcribe(
            path,
            mode=mode,
            api_key=api_key,
            base_url=base_url,
            stt_model=stt_model,
            on_progress=on_progress,
            on_partial=on_partial,
        )
        store.update(
            job_id,
            state=JobState.done,
            stage="done",
            progress=1.0,
            transcript=text,
        )
    except Exception as exc:  # noqa: BLE001 - 任何失敗都回報給前端
        store.update(job_id, state=JobState.error, stage="error", error=str(exc))
    finally:
        # 轉錄完即刪下載的音檔；HF Space 磁碟有限，不清會逐集累積塞爆。
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


@router.post("", response_model=CreateJobResponse)
def create_job(
    payload: CreateJobRequest, background: BackgroundTasks, request: Request
) -> CreateJobResponse:
    # 快速模式必須帶 Groq 或 OpenAI key 其中一個（key 僅過水使用）
    groq_key = (payload.groq_api_key or "").strip() or None
    openai_key = (payload.openai_api_key or "").strip() or None
    if payload.mode == "gpu" and not (groq_key or openai_key):
        raise HTTPException(
            status_code=400,
            detail="快速模式需要 Groq 或 OpenAI API Key，請到設定頁輸入，或改用慢速模式。",
        )

    if openai_key:
        effective_key = openai_key
        effective_base_url = "https://api.openai.com/v1"
        effective_model = "whisper-1"
    else:
        effective_key = groq_key
        effective_base_url = None
        effective_model = None

    # 防濫用：速率限制（每 IP）
    if not rate_limiter.allow(_client_ip(request)):
        raise HTTPException(
            status_code=429,
            detail=(
                f"請求過於頻繁，每小時最多 {settings.rate_limit_per_hour} 次，"
                "請稍後再試。"
            ),
        )
    # 防濫用：CPU 一次只跑一個（保護免費伺服器 CPU）
    if (
        payload.mode == "cpu"
        and store.active_count_for_mode("cpu") >= settings.max_cpu_concurrent_jobs
    ):
        raise HTTPException(
            status_code=429,
            detail="慢速模式目前有任務在處理中（一次只能一個），請稍後再試或改用快速模式。",
        )
    # 防濫用：所有任務的整體上限（保護下載頻寬/記憶體）
    if store.active_count() >= settings.max_concurrent_jobs:
        raise HTTPException(
            status_code=429,
            detail="伺服器目前較忙，請稍後再試。",
        )

    job = store.create(mode=payload.mode)
    background.add_task(_run_job, job.id, str(payload.url), payload.mode, effective_key, effective_base_url, effective_model)
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
