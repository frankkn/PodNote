FROM python:3.11-slim

# ffmpeg 供 yt-dlp 與音訊解碼使用
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 把模型快取與下載目錄指到可寫路徑
ENV HF_HOME=/app/.cache \
    DOWNLOAD_DIR=/app/_data \
    PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /app/_data /app/.cache

# Hugging Face Spaces 規定服務監聽 7860
EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
