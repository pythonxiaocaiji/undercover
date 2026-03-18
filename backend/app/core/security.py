from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

_pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
_bearer = HTTPBearer(auto_error=False)


def _normalize_password(password: str) -> str:
    raw = password.encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def hash_password(password: str) -> str:
    return _pwd_context.hash(_normalize_password(password))


def verify_password(password: str, password_hash: str) -> bool:
    return _pwd_context.verify(_normalize_password(password), password_hash)


def create_access_token(user_id: str) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": user_id,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.jwt_exp_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid_token")


async def get_current_user(
    cred: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not cred or not cred.credentials:
        raise HTTPException(status_code=401, detail="not_authenticated")

    payload = decode_access_token(cred.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="invalid_token")

    q = select(User).where(User.id == str(user_id))
    res = await db.execute(q)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="user_not_found")
    return user
