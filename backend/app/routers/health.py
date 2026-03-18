from fastapi import APIRouter

from app.redis.client import redis_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    await redis_client.ping()
    return {"status": "ok"}
