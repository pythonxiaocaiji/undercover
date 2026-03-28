from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.routers.auth import _avatar_for_response
from app.schemas.users import UserPublicDto

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserPublicDto])
@router.get("/", response_model=list[UserPublicDto], include_in_schema=False)
async def list_users(
    request: Request,
    q: str = "",
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(User).where(User.id != user.id)
    if q.strip():
        stmt = stmt.where(
            or_(
                User.username.contains(q.strip()),
                User.phone.contains(q.strip()),
            )
        )
    stmt = stmt.order_by(User.created_at.desc()).limit(100)
    res = await db.execute(stmt)
    users = res.scalars().all()
    return [
        UserPublicDto(
            id=u.id,
            username=u.username,
            avatar=_avatar_for_response(request, u.avatar),
            user_status=str(getattr(u, "user_status", "online") or "online"),
        )
        for u in users
    ]
