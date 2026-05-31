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
    download_dir: str = "./_data"

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
