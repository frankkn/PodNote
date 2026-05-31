from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    allowed_origins: str = "http://localhost:8081,http://localhost:19006"
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    # VAD（修剪靜音）需要 onnxruntime；某些 Windows 環境其 DLL 載入失敗，
    # 故預設關閉。Docker/Linux 部署可改 true 以略過長靜音、加速。
    whisper_vad: bool = False
    # 分段轉檔：每段秒數（長節目用，逐段回報進度與部分逐字稿）
    chunk_seconds: int = 300
    download_dir: str = "./_data"

    # 防濫用
    max_audio_seconds: int = 3600  # 節目長度上限（秒），預設 60 分
    max_concurrent_jobs: int = 1  # 同時處理的任務數（免費 CPU 一次一個）
    rate_limit_per_hour: int = 5  # 每個 IP 每小時可建立的任務數

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
