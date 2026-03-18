from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.redis.client import redis_client
from app.routers import auth, health, rooms, ws
from app.models.user import User


@asynccontextmanager
async def lifespan(app: FastAPI):
    (Path(__file__).resolve().parent.parent / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await redis_client.ping()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(ws.router)
