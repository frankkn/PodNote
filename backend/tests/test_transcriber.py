import io
import wave

import numpy as np
import pytest

from app.services import transcriber


def test_gpu_mode_without_key_raises() -> None:
    """快速模式沒帶 key 時，應在碰音檔前就明確報錯。"""
    with pytest.raises(ValueError, match="Groq API Key"):
        transcriber.transcribe("ignored.mp3", mode="gpu", api_key=None)


def test_mode_dispatches_to_correct_backend(monkeypatch) -> None:
    calls: list[str] = []
    monkeypatch.setattr(
        transcriber, "_transcribe_cpu", lambda *a, **k: calls.append("cpu") or "cpu"
    )
    monkeypatch.setattr(
        transcriber, "_transcribe_groq", lambda *a, **k: calls.append("gpu") or "gpu"
    )

    assert transcriber.transcribe("x", mode="cpu") == "cpu"
    assert transcriber.transcribe("x", mode="gpu", api_key="k") == "gpu"
    assert calls == ["cpu", "gpu"]


def test_to_wav_bytes_is_valid_16k_mono() -> None:
    samples = np.zeros(SAMPLE := 16000, dtype="float32")
    data = transcriber._to_wav_bytes(samples)
    with wave.open(io.BytesIO(data), "rb") as w:
        assert w.getnchannels() == 1
        assert w.getframerate() == 16000
        assert w.getsampwidth() == 2
        assert w.getnframes() == SAMPLE


def test_remote_chunk_maps_auth_error(monkeypatch) -> None:
    class FakeResp:
        status_code = 401

    monkeypatch.setattr(transcriber.httpx, "post", lambda *a, **k: FakeResp())
    with pytest.raises(ValueError, match="無效或無權限"):
        transcriber._transcribe_chunk_remote(b"wav", "bad-key")
