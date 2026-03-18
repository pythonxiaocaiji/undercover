from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import bindparam, text

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.redis.client import redis_client
from app.routers import auth, health, rooms, ws, words
from app.models.user import User
from app.models.word_category import WordCategory
from app.models.word_pair import WordPair


@asynccontextmanager
async def lifespan(app: FastAPI):
    (Path(__file__).resolve().parent.parent / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Lightweight migration: ensure users.role exists (1=normal, 2=admin)
        try:
            res = await conn.execute(text("SHOW COLUMNS FROM users LIKE 'role'"))
            has_role = res.first() is not None
            if not has_role:
                await conn.execute(text("ALTER TABLE users ADD COLUMN role INT NOT NULL DEFAULT 1"))
        except Exception:
            # Ignore startup migration failure; DB might be read-only or using a different dialect.
            pass

        # Bootstrap admins from env into DB role
        phones = settings.admin_phones_list
        if phones:
            try:
                await conn.execute(
                    text("UPDATE users SET role = 2 WHERE phone IN :phones").bindparams(
                        bindparam("phones", expanding=True)
                    ),
                    {"phones": phones},
                )
            except Exception:
                pass

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
app.include_router(words.router)
