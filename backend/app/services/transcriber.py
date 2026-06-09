import io
import threading
import wave
from typing import Callable, Optional

import httpx
import numpy as np
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

from app.config import settings

SAMPLE_RATE = 16000

_model: Optional[WhisperModel] = None
_model_lock = threading.Lock()

_cc = None  # OpenCC 簡→繁轉換器（延遲載入）
_cc_lock = threading.Lock()

ProgressCb = Optional[Callable[[float], None]]
PartialCb = Optional[Callable[[str], None]]


def _to_traditional(text: str) -> str:
    """簡體→繁體（OpenCC s2t）。Whisper 中文預設輸出簡體，這步保證繁體。"""
    if not text or not settings.convert_to_traditional:
        return text
    global _cc
    if _cc is None:
        with _cc_lock:
            if _cc is None:
                from opencc import OpenCC

                _cc = OpenCC(settings.opencc_config)
    return _cc.convert(text)


def transcribe(
    path: str,
    mode: str = "gpu",
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    stt_model: Optional[str] = None,
    on_progress: ProgressCb = None,
    on_partial: PartialCb = None,
) -> str:
    """轉錄音檔。mode="cpu" 用本機 faster-whisper（慢、免 key）；
    mode="gpu" 呼叫 Groq/OpenAI 相容 API（快、需使用者自帶 key）。
    base_url / stt_model 可覆寫 settings 預設值，用於切換 OpenAI vs Groq。"""
    if mode == "gpu":
        if not api_key:
            raise ValueError("快速模式需要 Groq 或 OpenAI API Key，請到設定頁輸入。")
        effective_base_url = base_url or settings.stt_base_url
        effective_model = stt_model or settings.stt_model
        return _transcribe_groq(path, api_key, effective_base_url, effective_model, on_progress, on_partial)
    return _transcribe_cpu(path, on_progress, on_partial)


# --- 慢速模式：本機 CPU（faster-whisper）-------------------------------------


def _get_model() -> WhisperModel:
    """延遲載入並重用單一模型實例（首次呼叫會下載模型權重）。"""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = WhisperModel(
                    settings.whisper_model,
                    device=settings.whisper_device,
                    compute_type=settings.whisper_compute_type,
                )
    return _model


def _transcribe_cpu(
    path: str, on_progress: ProgressCb, on_partial: PartialCb
) -> str:
    """分段轉檔：把音檔切成數段依序轉，逐段回報進度與累積逐字稿。

    分段的好處：長節目時進度更新平順、可即時看到部分逐字稿、單段記憶體較省。
    （分段邊界偶爾會切到字詞，對「摘要用途」影響極小。）
    """
    model = _get_model()
    audio = decode_audio(path, sampling_rate=SAMPLE_RATE)

    total_samples = len(audio)
    total_seconds = total_samples / SAMPLE_RATE if total_samples else 0
    chunk_samples = max(1, settings.chunk_seconds * SAMPLE_RATE)

    parts: list[str] = []
    offset = 0
    while offset < total_samples:
        chunk = audio[offset : offset + chunk_samples]
        base = offset / SAMPLE_RATE
        segments, _ = model.transcribe(
            chunk,
            vad_filter=settings.whisper_vad,
            initial_prompt=settings.zh_prompt,
        )
        for seg in segments:
            text = seg.text.strip()
            if text:
                parts.append(text)
            if on_progress and total_seconds:
                on_progress(min((base + seg.end) / total_seconds, 0.99))
        if on_partial:
            on_partial(_to_traditional(" ".join(parts)))
        offset += chunk_samples

    return _to_traditional(" ".join(parts).strip())


# --- 快速模式：外部 GPU（Groq / OpenAI 相容轉錄 API）------------------------


def _to_wav_bytes(samples: np.ndarray) -> bytes:
    """把 16kHz float32 音訊片段編成 wav bytes（不落地、直接上傳）。"""
    pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def _transcribe_chunk_remote(wav_bytes: bytes, api_key: str, base_url: str, model: str) -> str:
    """把一段 wav 丟給 Groq/OpenAI 相容的轉錄 API。key 過水使用、不記錄。"""
    resp = httpx.post(
        f"{base_url}/audio/transcriptions",
        headers={"Authorization": f"Bearer {api_key}"},
        files={"file": ("chunk.wav", wav_bytes, "audio/wav")},
        data={
            "model": model,
            "response_format": "text",
            "prompt": settings.zh_prompt,
        },
        timeout=300,
    )
    if resp.status_code in (401, 403):
        raise ValueError("API Key 無效或無權限，請到設定頁確認。")
    if resp.status_code == 429:
        raise ValueError("API 配額不足或請求過於頻繁，請稍後再試。")
    resp.raise_for_status()
    return resp.text.strip()


def _transcribe_groq(
    path: str, api_key: str, base_url: str, model: str, on_progress: ProgressCb, on_partial: PartialCb
) -> str:
    """分段上傳到外部 GPU API：保留與 CPU 模式相同的進度/部分逐字稿 UX，
    同時讓每段 wav 安全低於 API 的單檔大小上限。"""
    audio = decode_audio(path, sampling_rate=SAMPLE_RATE)
    total_samples = len(audio)
    chunk_samples = max(1, settings.stt_chunk_seconds * SAMPLE_RATE)

    parts: list[str] = []
    offset = 0
    while offset < total_samples:
        chunk = audio[offset : offset + chunk_samples]
        text = _transcribe_chunk_remote(_to_wav_bytes(chunk), api_key, base_url, model)
        if text:
            parts.append(text)
        offset += chunk_samples
        if on_progress and total_samples:
            on_progress(min(offset / total_samples, 0.99))
        if on_partial:
            on_partial(_to_traditional(" ".join(parts)))

    return _to_traditional(" ".join(parts).strip())
