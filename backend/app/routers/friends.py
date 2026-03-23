from __future__ import annotations

import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.friend import Friend
from app.models.user import User
from app.redis.client import redis_client
from app.schemas.friends import FriendDto, FriendRequestAction, FriendRequestCreate, RoomInviteDto
from app.ws.notify_manager import notify_manager

router = APIRouter(prefix="/friends", tags=["friends"])


def _invite_key(user_id: str) -> str:
    return f"user:{user_id}:room_invites"


def _avatar_for_response(request: Request, value: str | None) -> str:
    v = (value or "").strip()
    if not v:
        return ""
    if "://" in v and "/uploads/" in v:
        v = "/uploads/" + v.split("/uploads/", 1)[1]
    if v.startswith("/uploads/"):
        base = str(request.base_url).rstrip("/")
        return f"{base}{v}"
    return v


async def _serialize_friend(request: Request, db: AsyncSession, me: User, row: Friend) -> FriendDto | None:
    is_incoming = row.addressee_id == me.id
    other_id = row.requester_id if is_incoming else row.addressee_id
    other = await db.get(User, other_id)
    if not other:
        return None
    return FriendDto(
        request_id=row.id,
        status=row.status,
        is_incoming=is_incoming,
        user_id=other.id,
        phone=other.phone,
        username=other.username,
        avatar=_avatar_for_response(request, other.avatar),
        user_status=str(getattr(other, "user_status", "online") or "online"),
    )


@router.get("", response_model=list[FriendDto])
async def list_friends(request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Friend).where(
        Friend.status == "accepted",
        or_(Friend.requester_id == user.id, Friend.addressee_id == user.id),
    ).order_by(Friend.updated_at.desc())
    res = await db.execute(q)
    rows = res.scalars().all()
    items: list[FriendDto] = []
    for row in rows:
        dto = await _serialize_friend(request, db, user, row)
        if dto:
            items.append(dto)
    return items


@router.get("/requests", response_model=list[FriendDto])
async def list_requests(request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Friend).where(
        Friend.status == "pending",
        or_(Friend.requester_id == user.id, Friend.addressee_id == user.id),
    ).order_by(Friend.updated_at.desc())
    res = await db.execute(q)
    rows = res.scalars().all()
    items: list[FriendDto] = []
    for row in rows:
        dto = await _serialize_friend(request, db, user, row)
        if dto:
            items.append(dto)
    return items


@router.post("/request", response_model=FriendDto)
async def create_request(request: Request, payload: FriendRequestCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    phone = (payload.target_phone or "").strip()
    if phone == user.phone:
        raise HTTPException(status_code=409, detail="不能添加自己为好友")

    q = select(User).where(User.phone == phone)
    res = await db.execute(q)
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="用户不存在")

    q = select(Friend).where(
        or_(
            and_(Friend.requester_id == user.id, Friend.addressee_id == target.id),
            and_(Friend.requester_id == target.id, Friend.addressee_id == user.id),
        )
    )
    res = await db.execute(q)
    existing = res.scalar_one_or_none()
    now = datetime.utcnow()

    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=409, detail="你们已经是好友")
        if existing.status == "pending":
            raise HTTPException(status_code=409, detail="好友申请已存在")
        existing.status = "pending"
        existing.requester_id = user.id
        existing.addressee_id = target.id
        existing.updated_at = now
        await db.commit()
        await db.refresh(existing)
        dto = await _serialize_friend(request, db, user, existing)
        if not dto:
            raise HTTPException(status_code=500, detail="request_serialize_failed")
        return dto

    row = Friend(
        id=uuid.uuid4().hex,
        requester_id=user.id,
        addressee_id=target.id,
        status="pending",
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    await db.commit()
    dto = await _serialize_friend(request, db, user, row)
    if not dto:
        raise HTTPException(status_code=500, detail="request_serialize_failed")
    await notify_manager.send(target.id, {
        "type": "friend_request",
        "payload": {
            "request_id": row.id,
            "from_user_id": user.id,
            "from_username": user.username,
            "from_avatar": _avatar_for_response(request, user.avatar),
        },
    })
    return dto


@router.post("/accept", response_model=FriendDto)
async def accept_request(request: Request, payload: FriendRequestAction, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await db.get(Friend, payload.request_id)
    if not row or row.status != "pending":
        raise HTTPException(status_code=404, detail="好友申请不存在")
    if row.addressee_id != user.id:
        raise HTTPException(status_code=403, detail="not_allowed")
    row.status = "accepted"
    row.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(row)
    dto = await _serialize_friend(request, db, user, row)
    if not dto:
        raise HTTPException(status_code=500, detail="request_serialize_failed")
    return dto


@router.post("/reject")
async def reject_request(payload: FriendRequestAction, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    row = await db.get(Friend, payload.request_id)
    if not row or row.status != "pending":
        raise HTTPException(status_code=404, detail="好友申请不存在")
    if row.addressee_id != user.id:
        raise HTTPException(status_code=403, detail="not_allowed")
    row.status = "rejected"
    row.updated_at = datetime.utcnow()
    await db.commit()
    return {"ok": True}


@router.get("/invites", response_model=list[RoomInviteDto])
async def list_room_invites(user: User = Depends(get_current_user)):
    raw = await redis_client.lrange(_invite_key(user.id), 0, 49)
    items: list[RoomInviteDto] = []
    for item in raw:
        text = item.decode() if isinstance(item, bytes) else item
        try:
            data = json.loads(text)
            items.append(RoomInviteDto(**data))
        except Exception:
            continue
    return items


@router.delete("/invites")
async def clear_room_invites(user: User = Depends(get_current_user)):
    await redis_client.delete(_invite_key(user.id))
    return {"ok": True}


@router.delete("/{friend_user_id}")
async def remove_friend(friend_user_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    q = select(Friend).where(
        Friend.status == "accepted",
        or_(
            and_(Friend.requester_id == user.id, Friend.addressee_id == friend_user_id),
            and_(Friend.requester_id == friend_user_id, Friend.addressee_id == user.id),
        ),
    )
    res = await db.execute(q)
    row = res.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="好友关系不存在")
    await db.delete(row)
    await db.commit()
    return {"ok": True}
