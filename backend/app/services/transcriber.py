import threading
from typing import Callable, Optional

from faster_whisper import WhisperModel

from app.config import settings

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
    path: str, on_progress: Optional[Callable[[float], None]] = None
) -> str:
    """把音訊檔轉成純文字逐字稿；vad_filter 會自動略過靜音。"""
    model = _get_model()
    segments, info = model.transcribe(path, vad_filter=settings.whisper_vad)

    duration = info.duration or 0
    parts: list[str] = []
    for seg in segments:
        text = seg.text.strip()
        if text:
            parts.append(text)
        if on_progress and duration:
            on_progress(min(seg.end / duration, 0.99))

    return " ".join(parts).strip()
