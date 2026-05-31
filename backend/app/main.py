from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


@app.get("/")
def root() -> dict:
    return {"name": "PodNote API", "docs": "/docs"}
