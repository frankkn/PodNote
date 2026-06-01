from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    allowed_origins: str = "http://localhost:8081,http://localhost:19006"

    # 慢速模式（CPU）：在本機/伺服器用 faster-whisper 推論，免費、免申請 key。
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    # VAD（修剪靜音）需要 onnxruntime；某些 Windows 環境其 DLL 載入失敗，
    # 故預設關閉。Docker/Linux 部署可改 true 以略過長靜音、加速。
    whisper_vad: bool = False
    # CPU 分段轉檔：每段秒數（長節目用，逐段回報進度與部分逐字稿）
    chunk_seconds: int = 300

    # 快速模式（GPU）：呼叫 Groq / OpenAI 相容的轉錄 API（key 由使用者自帶）。
    stt_model: str = "whisper-large-v3"
    stt_base_url: str = "https://api.groq.com/openai/v1"
    # GPU 分段秒數：16kHz 單聲道 wav，600 秒 ≈ 19MB，安全低於 25MB 單檔上限。
    stt_chunk_seconds: int = 600

    # 中文逐字稿品質：
    # - zh_prompt：引導 Whisper 輸出繁體並加標點（CPU 與 Groq 兩模式都會帶）
    # - convert_to_traditional：用 OpenCC 把結果簡體→繁體（保證繁體）
    zh_prompt: str = "以下是繁體中文的對話，請適當加上標點符號。"
    convert_to_traditional: bool = True
    # OpenCC 轉換設定：s2tw=台灣標準繁體；s2t=一般繁體；s2twp=台灣標準含詞彙轉換
    opencc_config: str = "s2tw"

    download_dir: str = "./_data"

    # 防濫用
    max_audio_seconds: int = 3600  # CPU 模式節目長度上限（秒），預設 60 分
    max_audio_seconds_gpu: int = 7200  # GPU 模式上限放寬（Groq 快），預設 120 分
    max_cpu_concurrent_jobs: int = 1  # CPU 同時處理數（免費伺服器 CPU 一次一個）
    max_concurrent_jobs: int = 4  # 所有任務同時上限（保護下載頻寬/記憶體）
    rate_limit_per_hour: int = 10  # 每個 IP 每小時可建立的任務數

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
