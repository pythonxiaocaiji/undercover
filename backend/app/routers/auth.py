from datetime import datetime
import base64
import io
from pathlib import Path
import re
import uuid
import random

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password, get_current_user
from app.db.session import get_db
from app.models.user import User
from app.redis.client import redis_client
from app.schemas.auth import (
    CaptchaResponse,
    LoginRequest,
    ProfileResponse,
    ProfileUpdateRequest,
    RegisterRequest,
    TokenResponse,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_PHONE_RE = re.compile(r"^1\d{10}$")
_PASSWORD_COMPLEXITY_RE = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{6,}$")

_DEFAULT_AVATARS = [
    "https://api.dicebear.com/8.x/bottts/png?seed=undercover",
    "https://api.dicebear.com/8.x/fun-emoji/png?seed=undercover",
    "https://api.dicebear.com/8.x/lorelei/png?seed=undercover",
]

_MAX_AVATAR_BYTES = 5 * 1024 * 1024
_ALLOWED_AVATAR_TYPES = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}

_CAPTCHA_TTL_SECONDS = 120


def _gen_username(phone: str) -> str:
    suffix = phone[-4:] if phone and len(phone) >= 4 else f"{random.randint(0, 9999):04d}"
    return f"玩家{suffix}"


def _pick_default_avatar(phone: str) -> str:
    if not phone:
        return _DEFAULT_AVATARS[0]
    idx = sum(ord(c) for c in phone) % len(_DEFAULT_AVATARS)
    return _DEFAULT_AVATARS[idx]


def _is_admin_phone(phone: str) -> bool:
    p = (phone or "").strip()
    return bool(p and p in settings.admin_phones_list)


def _is_admin_user(user: User) -> bool:
    return int(getattr(user, "role", 1) or 1) == 2


def _validate_phone(phone: str) -> None:
    if not _PHONE_RE.match(phone):
        raise HTTPException(status_code=422, detail="无效手机号")


def _validate_password(password: str) -> None:
    if not _PASSWORD_COMPLEXITY_RE.match(password or ""):
        raise HTTPException(
            status_code=422,
            detail="密码至少6位，且必须包含字母和数字",
        )


async def _validate_captcha(captcha_id: str, captcha_code: str) -> None:
    cid = (captcha_id or "").strip()
    code = (captcha_code or "").strip().lower()
    if not cid or not code:
        raise HTTPException(status_code=422, detail="请输入验证码")

    key = f"captcha:{cid}"
    expected = await redis_client.get(key)
    if not expected:
        raise HTTPException(status_code=422, detail="验证码已过期，请刷新")

    if str(expected).lower() != code:
        raise HTTPException(status_code=422, detail="验证码错误")

    await redis_client.delete(key)


def _gen_captcha_code() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(alphabet) for _ in range(4))


def _render_captcha_png(code: str) -> bytes:
    w, h = 120, 44
    img = Image.new("RGB", (w, h), (248, 250, 252))
    draw = ImageDraw.Draw(img)

    for _ in range(6):
        x1, y1 = random.randint(0, w), random.randint(0, h)
        x2, y2 = random.randint(0, w), random.randint(0, h)
        draw.line((x1, y1, x2, y2), fill=(203, 213, 225), width=1)

    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except Exception:
        font = ImageFont.load_default()

    spacing = 6
    x = 12
    for ch in code:
        y = random.randint(6, 12)
        draw.text((x, y), ch, font=font, fill=(15, 23, 42))
        x += 22 + spacing

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


@router.get("/captcha", response_model=CaptchaResponse)
async def get_captcha():
    captcha_id = uuid.uuid4().hex
    code = _gen_captcha_code()
    await redis_client.setex(f"captcha:{captcha_id}", _CAPTCHA_TTL_SECONDS, code)

    png = _render_captcha_png(code)
    b64 = base64.b64encode(png).decode("ascii")
    return CaptchaResponse(captcha_id=captcha_id, image_data=f"data:image/png;base64,{b64}")


@router.post("/register", response_model=ProfileResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    await _validate_captcha(payload.captcha_id, payload.captcha_code)
    _validate_phone(payload.phone)
    _validate_password(payload.password)

    q = select(User).where(User.phone == payload.phone)
    res = await db.execute(q)
    existing = res.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="该手机号已注册")

    now = datetime.utcnow()
    user = User(
        id=uuid.uuid4().hex,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=2 if _is_admin_phone(payload.phone) else 1,
        username=_gen_username(payload.phone),
        avatar=_pick_default_avatar(payload.phone),
        phone_verified_at=None,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    await db.commit()

    return ProfileResponse(
        id=user.id,
        phone=user.phone,
        username=user.username,
        avatar=user.avatar,
        role=int(getattr(user, "role", 1) or 1),
        is_admin=_is_admin_user(user),
    )


@router.post("/avatar", response_model=ProfileResponse)
async def upload_avatar(
        request: Request,
        file: UploadFile = File(...),
        db: AsyncSession = Depends(get_db),
        user: User = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=415, detail="不支持的图片格式，仅支持 PNG/JPG/WebP")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="空文件")
    if len(content) > _MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="图片过大，最大 5MB")

    ext = _ALLOWED_AVATAR_TYPES[file.content_type]
    name = f"{user.id}-{uuid.uuid4().hex}.{ext}"
    avatars_dir = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
    avatars_dir.mkdir(parents=True, exist_ok=True)
    path = avatars_dir / name
    path.write_bytes(content)

    base = str(request.base_url).rstrip("/")
    url = f"{base}/uploads/avatars/{name}"
    user.avatar = url
    user.updated_at = datetime.utcnow()
    await db.commit()

    return ProfileResponse(
        id=user.id,
        phone=user.phone,
        username=user.username,
        avatar=user.avatar,
        role=int(getattr(user, "role", 1) or 1),
        is_admin=_is_admin_user(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    await _validate_captcha(payload.captcha_id, payload.captcha_code)
    _validate_phone(payload.phone)

    q = select(User).where(User.phone == payload.phone)
    res = await db.execute(q)
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="手机号或密码不对")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="手机号或密码不对")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=ProfileResponse)
async def me(user: User = Depends(get_current_user)):
    return ProfileResponse(
        id=user.id,
        phone=user.phone,
        username=user.username,
        avatar=user.avatar,
        role=int(getattr(user, "role", 1) or 1),
        is_admin=_is_admin_user(user),
    )


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(payload: ProfileUpdateRequest, db: AsyncSession = Depends(get_db),
                         user: User = Depends(get_current_user)):
    updated = False
    if payload.username is not None:
        name = payload.username.strip()
        if not name:
            raise HTTPException(status_code=422, detail="无效的用户名")
        if len(name) > 32:
            raise HTTPException(status_code=422, detail="用户名称最大32位")
        user.username = name
        updated = True

    if payload.avatar is not None:
        avatar = payload.avatar.strip()
        if not avatar:
            user.avatar = _pick_default_avatar(user.phone)
        else:
            user.avatar = avatar
        updated = True

    if updated:
        user.updated_at = datetime.utcnow()
        await db.commit()

    return ProfileResponse(
        id=user.id,
        phone=user.phone,
        username=user.username,
        avatar=user.avatar,
        role=int(getattr(user, "role", 1) or 1),
        is_admin=_is_admin_user(user),
    )
