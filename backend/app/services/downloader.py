import os

from yt_dlp import YoutubeDL


def probe(url: str) -> tuple[str, int]:
    """只取 metadata（不下載），回傳 (標題, 長度秒)。duration 無法判定時回 0。"""
    opts = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "skip_download": True,
    }
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=False)
    title = info.get("title") or "Untitled"
    duration = int(info.get("duration") or 0)
    return title, duration


def download_audio(url: str, out_dir: str) -> tuple[str, str]:
    """下載單集音訊，回傳 (本地檔案路徑, 標題)。

    使用 yt-dlp，支援多數 podcast host 的直連 MP3、YouTube 等。
    Spotify 獨家 / 有 DRM 的內容無法下載。
    """
    os.makedirs(out_dir, exist_ok=True)
    opts = {
        "format": "bestaudio/best",
        "outtmpl": os.path.join(out_dir, "%(id)s.%(ext)s"),
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
    }
    with YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
        path = ydl.prepare_filename(info)
        title = info.get("title") or "Untitled"
    return path, title
