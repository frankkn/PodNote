from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import health, jobs
from app.config import settings

app = FastAPI(title="PodNote API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(jobs.router)

# 若有打包好的前端（backend/web），就由本服務同源提供（免 CORS、單一網址）。
# API 路由（/health, /jobs, /docs）已先註冊，優先於此處的靜態掛載。
WEB_DIR = Path(__file__).resolve().parent.parent / "web"
if (WEB_DIR / "index.html").exists():
    app.mount("/", StaticFiles(directory=str(WEB_DIR), html=True), name="web")
else:
    @app.get("/")
    def root() -> dict:
        return {"name": "PodNote API", "docs": "/docs"}
