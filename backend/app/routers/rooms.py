import json
import secrets
import string
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.friend import Friend
from app.models.room import Room
from app.models.player import Player
from app.models.user import User
from app.redis.client import redis_client
from app.ws.manager import manager
from app.ws.notify_manager import notify_manager
from app.schemas.rooms import (
    CreateRoomRequest,
    InviteFriendRequest,
    JoinRoomRequest,
    ReadyRequest,
    StartGameRequest,
    VoteRequest,
    ReactionRequest,
    UpdateStateRequest,
)

router = APIRouter(prefix="/rooms", tags=["rooms"])


def _gen_room_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _room_state_key(room_id: str) -> str:
    return f"room:{room_id}:state"


def _invite_key(user_id: str) -> str:
    return f"user:{user_id}:room_invites"


def _room_invited_users_key(room_id: str) -> str:
    return f"room:{room_id}:invited_users"


async def _get_room_state(room_id: str) -> dict:
    key = _room_state_key(room_id)
    raw = await redis_client.get(key)
    if not raw:
        return {}
    return json.loads(raw)


async def _set_room_state(room_id: str, state: dict) -> None:
    key = _room_state_key(room_id)
    await redis_client.set(key, json.dumps(state, ensure_ascii=False))


def _is_host(state: dict, player_id: str) -> bool:
    for p in state.get("players", []):
        if p.get("id") == player_id and p.get("isHost"):
            return True
    return False


@router.post("")
@router.post("/", include_in_schema=False)
async def create_room(payload: CreateRoomRequest, db: AsyncSession = Depends(get_db)):
    room_id = _gen_room_id()
    now = datetime.utcnow()

    host_player_id = f"{room_id}-{payload.host_player_id}"

    room = Room(
        id=room_id,
        name=payload.room_name,
        max_players=payload.max_players,
        phase="大厅",
        allow_join=1 if payload.allow_join else 0,
        allow_invite=1 if payload.allow_invite else 0,
        created_at=now,
        updated_at=now,
    )
    db.add(room)

    await db.flush()

    host = Player(
        id=host_player_id,
        room_id=room_id,
        name=payload.host_player_name,
        avatar=payload.host_avatar,
        is_host=True,
        is_ready=False,
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(host)

    await db.commit()

    state = {
        "roomId": room_id,
        "roomName": payload.room_name,
        "maxPlayers": payload.max_players,
        "phase": "大厅",
        "timer": payload.speaking_time,
        "speakingTime": payload.speaking_time,
        "votingTime": payload.voting_time,
        "wordCategory": payload.word_category,
        "undercoverCount": payload.undercover_count,
        "allowJoin": bool(payload.allow_join),
        "allowInvite": bool(payload.allow_invite),
        "round": 1,
        "currentSpeakerId": None,
        "votesBy": {},
        "eliminatedPlayerId": None,
        "players": [
            {
                "id": host.id,
                "name": host.name,
                "avatar": host.avatar,
                "status": host.status,
                "isHost": True,
                "isReady": False,
                "votes": 0,
            }
        ],
    }
    await _set_room_state(room_id, state)
    await manager.broadcast(room_id, {"type": "state", "payload": state})

    return {"roomId": room_id, "playerId": host_player_id}


@router.post("/{room_id}/join")
async def join_room(room_id: str, payload: JoinRoomRequest, db: AsyncSession = Depends(get_db)):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="房间不存在")

    state = await _get_room_state(room_id)
    players = state.get("players", [])

    current_phase = state.get("phase", "大厅")
    if current_phase != "大厅":
        raise HTTPException(status_code=409, detail="游戏已开始，无法加入")

    if not bool(state.get("allowJoin", True)):
        invited = await redis_client.smembers(_room_invited_users_key(room_id))
        invited_user_ids = {v.decode() if isinstance(v, bytes) else v for v in (invited or set())}
        if payload.player_id not in invited_user_ids:
            raise HTTPException(status_code=403, detail="房间不允许自由加入")

    if len(players) >= int(state.get("maxPlayers", room.max_players)):
        raise HTTPException(status_code=409, detail="房间已满，无法加入")

    now = datetime.utcnow()
    scoped_player_id = f"{room_id}-{payload.player_id}"
    existing = await db.get(Player, scoped_player_id)
    if existing:
        return {"roomId": room_id, "playerId": scoped_player_id}

    player = Player(
        id=scoped_player_id,
        room_id=room_id,
        name=payload.player_name,
        avatar=payload.avatar,
        is_host=False,
        is_ready=False,
        status="active",
        created_at=now,
        updated_at=now,
    )
    db.add(player)
    await db.commit()

    players.append(
        {
            "id": player.id,
            "name": player.name,
            "avatar": player.avatar,
            "status": player.status,
            "isHost": False,
            "isReady": False,
            "votes": 0,
        }
    )
    state["players"] = players
    await _set_room_state(room_id, state)
    await manager.broadcast(room_id, {"type": "state", "payload": state})

    return {"roomId": room_id, "playerId": player.id}


@router.get("/{room_id}/state")
async def get_state(room_id: str):
    state = await _get_room_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="房间未找到")
    return state


@router.post("/{room_id}/invite")
async def invite_friend(
    room_id: str,
    payload: InviteFriendRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    state = await _get_room_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="房间未找到")

    if state.get("phase") != "大厅":
        raise HTTPException(status_code=409, detail="游戏开始后不可邀请好友")

    players = state.get("players", [])
    my_scoped_id = next((p.get("id") for p in players if str(p.get("id", "")).endswith(f"-{user.id}")), None)
    me = next((p for p in players if p.get("id") == my_scoped_id), None)
    if not me:
        raise HTTPException(status_code=403, detail="你不在该房间中")

    is_host = bool(me.get("isHost"))
    if not is_host and not bool(state.get("allowInvite", True)):
        raise HTTPException(status_code=403, detail="房主已禁止其他人邀请好友")

    q = select(Friend).where(
        Friend.status == "accepted",
        or_(
            and_(Friend.requester_id == user.id, Friend.addressee_id == payload.friend_user_id),
            and_(Friend.requester_id == payload.friend_user_id, Friend.addressee_id == user.id),
        ),
    )
    res = await db.execute(q)
    relation = res.scalar_one_or_none()
    if not relation:
        raise HTTPException(status_code=403, detail="只能邀请你的好友")

    target = await db.get(User, payload.friend_user_id)
    if not target:
        raise HTTPException(status_code=404, detail="好友不存在")

    target_status = str(getattr(target, "user_status", "online") or "online")
    if target_status == "busy":
        raise HTTPException(status_code=409, detail="该用户当前处于忙碌状态，无法邀请")

    invite = {
        "room_id": room_id,
        "room_name": state.get("roomName") or room_id,
        "inviter_user_id": user.id,
        "inviter_name": user.username,
        "allow_join": bool(state.get("allowJoin", True)),
        "allow_invite": bool(state.get("allowInvite", True)),
        "invite_id": uuid.uuid4().hex,
        "created_at": datetime.utcnow().isoformat(),
    }
    await redis_client.sadd(_room_invited_users_key(room_id), target.id)
    await redis_client.lpush(_invite_key(target.id), json.dumps(invite, ensure_ascii=False))
    await redis_client.ltrim(_invite_key(target.id), 0, 49)
    await notify_manager.send(target.id, {"type": "room_invite", "payload": invite})
    return {"ok": True}


@router.post("/{room_id}/ready")
async def set_ready(room_id: str, payload: ReadyRequest, db: AsyncSession = Depends(get_db)):
    state = await _get_room_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="房间未找到")

    players = state.get("players", [])
    updated = False
    for p in players:
        if p.get("id") == payload.player_id:
            p["isReady"] = bool(payload.is_ready)
            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="房间未找到")

    await _set_room_state(room_id, state)
    await manager.broadcast(room_id, {"type": "state", "payload": state})

    q = select(Player).where(Player.id == payload.player_id, Player.room_id == room_id)
    res = await db.execute(q)
    db_player = res.scalar_one_or_none()
    if db_player:
        db_player.is_ready = bool(payload.is_ready)
        db_player.updated_at = datetime.utcnow()
        await db.commit()

    return {"ok": True}


@router.post("/{room_id}/state")
async def update_state(room_id: str, payload: UpdateStateRequest):
    current = await _get_room_state(room_id)
    if not current:
        raise HTTPException(status_code=404, detail="房间未找到")

    if not _is_host(current, payload.host_player_id):
        raise HTTPException(status_code=403, detail="not_host")

    next_state = payload.state or {}
    if next_state.get("roomId") and next_state.get("roomId") != room_id:
        raise HTTPException(status_code=409, detail="房间未找到")

    next_state["roomId"] = room_id
    await _set_room_state(room_id, next_state)
    await manager.broadcast(room_id, {"type": "state", "payload": next_state})
    return {"ok": True}


@router.post("/{room_id}/start")
async def start_game(room_id: str, payload: StartGameRequest):
    state = await _get_room_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="房间未找到")

    players = state.get("players", [])
    if not players:
        raise HTTPException(status_code=409, detail="没有队员")

    host = next((p for p in players if p.get("id") == payload.host_player_id and p.get("isHost")), None)
    if not host:
        raise HTTPException(status_code=403, detail="not_host")

    if not all(p.get("isReady") for p in players):
        raise HTTPException(status_code=409, detail="有玩家未准备")

    state["phase"] = "发言"
    state["currentSpeakerId"] = players[0]["id"]
    state["timer"] = int(state.get("speakingTime", 30))
    await _set_room_state(room_id, state)
    await manager.broadcast(room_id, {"type": "state", "payload": state})

    return {"ok": True}


@router.post("/{room_id}/vote")
async def vote(room_id: str, payload: VoteRequest):
    state = await _get_room_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="房间未找到")

    if state.get("phase") != "投票":
        raise HTTPException(status_code=409, detail="尚未进入投票阶段")

    players = state.get("players", [])
    target = next((p for p in players if p.get("id") == payload.target_player_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="房间未找到")

    target["votes"] = int(target.get("votes", 0)) + 1
    await _set_room_state(room_id, state)
    await manager.broadcast(room_id, {"type": "state", "payload": state})
    return {"ok": True}


@router.post("/{room_id}/reaction")
async def reaction(room_id: str, payload: ReactionRequest):
    state = await _get_room_state(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="房间未找到")

    reactions = state.get("reactions", {})
    reactions[payload.target_player_id] = payload.emoji
    state["reactions"] = reactions
    await _set_room_state(room_id, state)

    await manager.broadcast(room_id, {"type": "reaction", "payload": payload.model_dump()})
    await manager.broadcast(room_id, {"type": "state", "payload": state})

    return {"ok": True}
