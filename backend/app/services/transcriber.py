import threading
from typing import Callable, Optional

from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

from app.config import settings

SAMPLE_RATE = 16000

_model: Optional[WhisperModel] = None
_model_lock = threading.Lock()


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


def transcribe(
    path: str,
    on_progress: Optional[Callable[[float], None]] = None,
    on_partial: Optional[Callable[[str], None]] = None,
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
        segments, _ = model.transcribe(chunk, vad_filter=settings.whisper_vad)
        for seg in segments:
            text = seg.text.strip()
            if text:
                parts.append(text)
            if on_progress and total_seconds:
                on_progress(min((base + seg.end) / total_seconds, 0.99))
        if on_partial:
            on_partial(" ".join(parts))
        offset += chunk_samples

    return " ".join(parts).strip()
