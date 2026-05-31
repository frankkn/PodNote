FROM python:3.11-slim

# ffmpeg 供 yt-dlp 與音訊解碼使用
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# HF Spaces 建議以 UID 1000 的非 root 使用者執行（否則模型快取/下載可能權限不足）
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache \
    DOWNLOAD_DIR=/home/user/app/_data \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .
RUN mkdir -p "$DOWNLOAD_DIR"

# Hugging Face Spaces 規定服務監聽 7860
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
