import json
import random
import uuid
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.redis.client import redis_client
from app.db.session import SessionLocal
from app.models.word_category import WordCategory
from app.models.word_pair import WordPair
from app.ws.manager import manager

router = APIRouter(prefix="/ws", tags=["ws"])


_WORD_PAIRS: dict[str, list[tuple[str, str]]] = {
    "美食": [("包子", "饺子"), ("汉堡", "三明治"), ("火锅", "冒菜"), ("牛奶", "豆浆")],
    "动物": [("老虎", "狮子"), ("猫", "狗"), ("企鹅", "鸭子"), ("狼", "狐狸")],
    "科技": [("手机", "平板"), ("电脑", "笔记本"), ("微信", "支付宝"), ("耳机", "音箱")],
    "电影": [("泰坦尼克号", "阿凡达"), ("西游记", "封神榜"), ("哈利波特", "指环王")],
    "随机": [("雨伞", "雨衣"), ("牙刷", "牙膏"), ("镜子", "玻璃")],
}


async def _seed_words_if_empty(db: AsyncSession) -> None:
    q = select(func.count()).select_from(WordCategory)
    res = await db.execute(q)
    count = int(res.scalar() or 0)
    if count > 0:
        return

    now = datetime.utcnow()
    for name, pairs in _WORD_PAIRS.items():
        cat = WordCategory(id=uuid.uuid4().hex, name=name, created_at=now, updated_at=now)
        db.add(cat)
        for cw, uw in pairs:
            db.add(
                WordPair(
                    id=uuid.uuid4().hex,
                    category_id=cat.id,
                    civilian_word=cw,
                    undercover_word=uw,
                    created_at=now,
                    updated_at=now,
                )
            )
    await db.commit()


async def _pick_word_pair(category: str | None = None) -> tuple[str, str, str]:
    async with SessionLocal() as db:
        await _seed_words_if_empty(db)

        cat_obj: WordCategory | None = None
        if category:
            q = select(WordCategory).where(WordCategory.name == category)
            res = await db.execute(q)
            cat_obj = res.scalar_one_or_none()

        if not cat_obj:
            q = select(WordCategory)
            res = await db.execute(q)
            cats = res.scalars().all()
            if not cats:
                raise RuntimeError("no_word_categories")
            cat_obj = random.choice(cats)

        q = select(WordPair).where(WordPair.category_id == cat_obj.id)
        res = await db.execute(q)
        pairs = res.scalars().all()
        if not pairs:
            raise RuntimeError("no_word_pairs")
        pair = random.choice(pairs)
        return cat_obj.name, pair.civilian_word, pair.undercover_word


def _room_state_key(room_id: str) -> str:
    return f"room:{room_id}:state"


def _room_secrets_key(room_id: str) -> str:
    return f"room:{room_id}:secrets"


async def _get_room_state(room_id: str) -> dict:
    raw = await redis_client.get(_room_state_key(room_id))
    if not raw:
        return {}
    return json.loads(raw)


async def _set_room_state(room_id: str, state: dict) -> None:
    await redis_client.set(_room_state_key(room_id), json.dumps(state, ensure_ascii=False))


async def _get_secret(room_id: str, player_id: str) -> dict | None:
    raw = await redis_client.hget(_room_secrets_key(room_id), player_id)
    if not raw:
        return None
    return json.loads(raw)


async def _set_secret(room_id: str, player_id: str, secret: dict) -> None:
    await redis_client.hset(_room_secrets_key(room_id), player_id, json.dumps(secret, ensure_ascii=False))


async def _dissolve_room(room_id: str) -> None:
    await redis_client.delete(_room_state_key(room_id))
    await redis_client.delete(_room_secrets_key(room_id))


def _find_player(state: dict, player_id: str) -> dict | None:
    for p in state.get("players", []):
        if p.get("id") == player_id:
            return p
    return None


def _is_host(state: dict, player_id: str) -> bool:
    p = _find_player(state, player_id)
    return bool(p and p.get("isHost"))


def _recount_votes(state: dict) -> None:
    votes_by = state.get("votesBy") or {}
    for p in state.get("players", []):
        p["votes"] = 0
    for _, target_id in votes_by.items():
        if not target_id:
            continue
        target = _find_player(state, target_id)
        if target and target.get("status") != "eliminated":
            target["votes"] = int(target.get("votes", 0)) + 1


def _active_player_ids(state: dict) -> list[str]:
    return [p.get("id") for p in state.get("players", []) if p.get("status") == "active" and p.get("id")]


def _alive_player_ids(state: dict) -> list[str]:
    return [p.get("id") for p in state.get("players", []) if p.get("status") != "eliminated" and p.get("id")]


async def _count_alive_sides(room_id: str, state: dict) -> tuple[int, int]:
    civilians = 0
    undercovers = 0
    for pid in _alive_player_ids(state):
        secret = await _get_secret(room_id, pid)
        if not secret:
            continue
        if secret.get("role") == "卧底":
            undercovers += 1
        else:
            civilians += 1
    return civilians, undercovers


async def _reveal_roles(room_id: str, state: dict, player_ids: list[str] | None = None) -> None:
    ids = player_ids or [p.get("id") for p in state.get("players", []) if p.get("id")]
    for pid in ids:
        secret = await _get_secret(room_id, pid)
        if not secret:
            continue
        p = _find_player(state, pid)
        if p is not None:
            p["role"] = secret.get("role")


async def _restart_game(room_id: str, state: dict) -> dict:
    players = state.get("players", [])
    if not players:
        return state

    category_name, civilian_word, undercover_word = await _pick_word_pair(state.get("wordCategory"))
    state["wordCategory"] = category_name

    undercover_count = int(state.get("undercoverCount", 1))
    undercover_count = max(1, min(undercover_count, max(1, len(players) - 1)))
    undercover_ids = set(random.sample([p["id"] for p in players], k=undercover_count))

    for p in players:
        if p.get("id") in undercover_ids:
            secret = {"playerId": p["id"], "role": "卧底", "word": undercover_word}
        else:
            secret = {"playerId": p["id"], "role": "平民", "word": civilian_word}
        await _set_secret(room_id, p["id"], secret)
        await manager.send_to_player(room_id, p["id"], {"type": "secret", "payload": secret})

    state["winner"] = None
    state["phase"] = "发言"
    state["round"] = 1
    state["currentSpeakerId"] = players[0]["id"] if players else None
    state["timer"] = int(state.get("speakingTime", 30))
    state["votesBy"] = {}
    state["eliminatedPlayerId"] = None
    state["pkCandidates"] = None
    state["pkRound"] = 0
    state["reactions"] = {}
    for p in players:
        p["votes"] = 0
        p["status"] = "active"
        if "role" in p:
            del p["role"]
    return state


def _remove_player_from_state(state: dict, player_id: str) -> dict:
    players = [p for p in state.get("players", []) if p.get("id") != player_id]
    state["players"] = players

    votes_by = state.get("votesBy")
    if isinstance(votes_by, dict):
        votes_by.pop(player_id, None)
        to_remove = [vid for vid, tid in votes_by.items() if tid == player_id]
        for vid in to_remove:
            votes_by.pop(vid, None)
        state["votesBy"] = votes_by

    if state.get("currentSpeakerId") == player_id:
        alive_ids = _alive_player_ids(state)
        state["currentSpeakerId"] = alive_ids[0] if alive_ids else None

    pk_candidates = state.get("pkCandidates")
    if isinstance(pk_candidates, list):
        state["pkCandidates"] = [pid for pid in pk_candidates if pid != player_id]

    if state.get("eliminatedPlayerId") == player_id:
        state["eliminatedPlayerId"] = None

    _recount_votes(state)
    return state


async def _settle_vote_if_needed(room_id: str, state: dict) -> bool:
    if state.get("phase") != "投票":
        return False

    votes_by = state.get("votesBy")
    if not isinstance(votes_by, dict) or not votes_by:
        return False

    alive_ids = _alive_player_ids(state)
    pk_candidates = state.get("pkCandidates")
    eligible_ids = pk_candidates or alive_ids
    eligible = [p for p in state.get("players", []) if p.get("id") in eligible_ids]
    if not eligible:
        return False

    _recount_votes(state)
    max_votes = max((int(p.get("votes", 0)) for p in eligible), default=0)
    if max_votes <= 0:
        state["eliminatedPlayerId"] = None
        state["pkCandidates"] = None
        state["pkRound"] = 0
        state["phase"] = "结果"
        state["timer"] = 5
        state["currentSpeakerId"] = None
        state["votesBy"] = {}
        for p in state.get("players", []):
            p["votes"] = 0
            if p.get("status") == "voted":
                p["status"] = "active"
        return True
    top = [p for p in eligible if int(p.get("votes", 0)) == max_votes]
    if not top:
        return False

    if len(top) == 1:
        eliminated_id = top[0].get("id")
        state["eliminatedPlayerId"] = eliminated_id
        state["pkCandidates"] = None
        state["pkRound"] = 0
        if eliminated_id:
            elim_player = _find_player(state, eliminated_id)
            if elim_player:
                elim_player["status"] = "eliminated"
                await _reveal_roles(room_id, state, [eliminated_id])

        civilians, undercovers = await _count_alive_sides(room_id, state)
        if undercovers <= 0:
            state["winner"] = "平民"
            state["phase"] = "结束"
            state["timer"] = 0
            state["currentSpeakerId"] = None
            await _reveal_roles(room_id, state, None)
        elif undercovers >= civilians:
            state["winner"] = "卧底"
            state["phase"] = "结束"
            state["timer"] = 0
            state["currentSpeakerId"] = None
            await _reveal_roles(room_id, state, None)

        if state.get("phase") != "结束":
            state["phase"] = "结果"
            state["timer"] = 5
            state["currentSpeakerId"] = None
            state["votesBy"] = {}
            for p in state.get("players", []):
                p["votes"] = 0
                if p.get("status") == "voted":
                    p["status"] = "active"
        return True

    pk_round = int(state.get("pkRound", 0)) + 1
    state["pkRound"] = pk_round
    if pk_round >= 3:
        eliminated = random.choice(top)
        eliminated_id = eliminated.get("id")
        state["eliminatedPlayerId"] = eliminated_id
        state["pkCandidates"] = None
        state["pkRound"] = 0
        if eliminated_id:
            elim_player = _find_player(state, eliminated_id)
            if elim_player:
                elim_player["status"] = "eliminated"
                await _reveal_roles(room_id, state, [eliminated_id])

        civilians, undercovers = await _count_alive_sides(room_id, state)
        if undercovers <= 0:
            state["winner"] = "平民"
            state["phase"] = "结束"
            state["timer"] = 0
            state["currentSpeakerId"] = None
            await _reveal_roles(room_id, state, None)
        elif undercovers >= civilians:
            state["winner"] = "卧底"
            state["phase"] = "结束"
            state["timer"] = 0
            state["currentSpeakerId"] = None
            await _reveal_roles(room_id, state, None)

        if state.get("phase") != "结束":
            state["phase"] = "结果"
            state["timer"] = 5
            state["currentSpeakerId"] = None
            state["votesBy"] = {}
            for p in state.get("players", []):
                p["votes"] = 0
                if p.get("status") == "voted":
                    p["status"] = "active"
        return True

    candidates = [p.get("id") for p in top if p.get("id")]
    state["pkCandidates"] = candidates
    state["votesBy"] = {}
    state["eliminatedPlayerId"] = None
    for p in state.get("players", []):
        p["votes"] = 0
        if p.get("status") == "voted":
            p["status"] = "active"
    state["phase"] = "发言"
    state["currentSpeakerId"] = candidates[0] if candidates else None
    state["timer"] = int(state.get("speakingTime", 30))
    return True


@router.websocket("/rooms/{room_id}")
async def ws_room(websocket: WebSocket, room_id: str):
    player_id = websocket.query_params.get("playerId")
    await manager.connect(room_id, player_id, websocket)

    try:
        state = await _get_room_state(room_id)
        await websocket.send_json({"type": "state", "payload": state})

        if player_id:
            secret = await _get_secret(room_id, player_id)
            if secret:
                await websocket.send_json({"type": "secret", "payload": secret})

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            payload = data.get("payload") or {}

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type == "state:update":
                incoming = payload.get("state") or {}
                if incoming.get("roomId") and incoming.get("roomId") != room_id:
                    await websocket.send_json({"type": "error", "error": "room_id_mismatch"})
                    continue
                current = await _get_room_state(room_id)
                merged = dict(current or {})
                for k in ["phase", "timer", "currentSpeakerId", "round", "reactions"]:
                    if k in incoming:
                        merged[k] = incoming.get(k)
                merged["roomId"] = room_id

                if _is_host(current, player_id) and merged.get("phase") == "投票" and int(merged.get("timer", 0)) <= 0:
                    await _settle_vote_if_needed(room_id, merged)
                await _set_room_state(room_id, merged)
                await manager.broadcast(room_id, {"type": "state", "payload": merged})
                continue

            if msg_type == "player:ready":
                player_id = payload.get("playerId")
                is_ready = bool(payload.get("isReady"))
                state = await _get_room_state(room_id)
                player = _find_player(state, player_id)
                if not player:
                    await websocket.send_json({"type": "error", "error": "player_not_found"})
                    continue
                player["isReady"] = is_ready
                await _set_room_state(room_id, state)
                await manager.broadcast(room_id, {"type": "state", "payload": state})
                continue

            if msg_type == "game:restart":
                host_id = payload.get("hostPlayerId")
                state = await _get_room_state(room_id)
                if state.get("phase") != "结束":
                    await websocket.send_json({"type": "error", "error": "not_in_end_phase"})
                    continue
                if not _is_host(state, host_id):
                    await websocket.send_json({"type": "error", "error": "not_host"})
                    continue
                if not all(p.get("isReady") for p in state.get("players", [])):
                    await websocket.send_json({"type": "error", "error": "not_all_ready"})
                    continue

                state = await _restart_game(room_id, state)
                await _set_room_state(room_id, state)
                await manager.broadcast(room_id, {"type": "state", "payload": state})
                continue

            if msg_type == "game:start":
                host_id = payload.get("hostPlayerId")
                state = await _get_room_state(room_id)
                if not _is_host(state, host_id):
                    await websocket.send_json({"type": "error", "error": "not_host"})
                    continue
                if not all(p.get("isReady") for p in state.get("players", [])):
                    await websocket.send_json({"type": "error", "error": "not_all_ready"})
                    continue

                players = state.get("players", [])
                if not players:
                    await websocket.send_json({"type": "error", "error": "no_players"})
                    continue

                category_name, civilian_word, undercover_word = await _pick_word_pair(state.get("wordCategory"))
                state["wordCategory"] = category_name

                undercover_count = int(state.get("undercoverCount", 1))
                undercover_count = max(1, min(undercover_count, max(1, len(players) - 1)))
                undercover_ids = set(random.sample([p["id"] for p in players], k=undercover_count))

                for p in players:
                    if p["id"] in undercover_ids:
                        secret = {"playerId": p["id"], "role": "卧底", "word": undercover_word}
                    else:
                        secret = {"playerId": p["id"], "role": "平民", "word": civilian_word}

                    await _set_secret(room_id, p["id"], secret)
                    await manager.send_to_player(room_id, p["id"], {"type": "secret", "payload": secret})

                state["phase"] = "发言"
                state["currentSpeakerId"] = players[0]["id"] if players else None
                state["timer"] = int(state.get("speakingTime", 30))
                state["votesBy"] = {}
                state["eliminatedPlayerId"] = None
                state["pkCandidates"] = None
                state["pkRound"] = 0
                for p in players:
                    p["votes"] = 0
                    if p.get("status") != "eliminated":
                        p["status"] = "active"
                await _set_room_state(room_id, state)
                await manager.broadcast(room_id, {"type": "state", "payload": state})
                continue

            if msg_type == "vote":
                voter_id = payload.get("voterPlayerId")
                target_id = payload.get("targetPlayerId")
                state = await _get_room_state(room_id)
                if state.get("phase") != "投票":
                    await websocket.send_json({"type": "error", "error": "not_in_voting_phase"})
                    continue
                voter = _find_player(state, voter_id)
                if not voter or voter.get("status") != "active":
                    await websocket.send_json({"type": "error", "error": "voter_not_found"})
                    continue
                if target_id and voter_id == target_id:
                    await websocket.send_json({"type": "error", "error": "cannot_vote_self"})
                    continue
                pk_candidates = state.get("pkCandidates")
                if pk_candidates and target_id and target_id not in pk_candidates:
                    await websocket.send_json({"type": "error", "error": "pk_target_not_allowed"})
                    continue
                if target_id:
                    target = _find_player(state, target_id)
                    if not target:
                        await websocket.send_json({"type": "error", "error": "target_not_found"})
                        continue

                votes_by = state.get("votesBy")
                if not isinstance(votes_by, dict):
                    votes_by = {}
                if votes_by.get(voter_id):
                    await websocket.send_json({"type": "error", "error": "already_voted"})
                    continue

                votes_by[voter_id] = target_id
                state["votesBy"] = votes_by
                voter["status"] = "voted"
                _recount_votes(state)

                alive_ids = _alive_player_ids(state)
                if len(votes_by) >= len(alive_ids) and len(alive_ids) > 0:
                    eligible_ids = pk_candidates or alive_ids
                    eligible = [p for p in state.get("players", []) if p.get("id") in eligible_ids]
                    max_votes = max((int(p.get("votes", 0)) for p in eligible), default=0)
                    if max_votes <= 0:
                        state["eliminatedPlayerId"] = None
                        state["pkCandidates"] = None
                        state["pkRound"] = 0
                        state["phase"] = "结果"
                        state["timer"] = 5
                        state["currentSpeakerId"] = None
                        state["votesBy"] = {}
                        for p in state.get("players", []):
                            p["votes"] = 0
                            if p.get("status") == "voted":
                                p["status"] = "active"
                        await _set_room_state(room_id, state)
                        await manager.broadcast(room_id, {"type": "state", "payload": state})
                        continue
                    top = [p for p in eligible if int(p.get("votes", 0)) == max_votes]

                    if len(top) == 1:
                        eliminated_id = top[0].get("id")
                        state["eliminatedPlayerId"] = eliminated_id
                        state["pkCandidates"] = None
                        state["pkRound"] = 0
                        if eliminated_id:
                            elim_player = _find_player(state, eliminated_id)
                            if elim_player:
                                elim_player["status"] = "eliminated"
                                await _reveal_roles(room_id, state, [eliminated_id])

                        civilians, undercovers = await _count_alive_sides(room_id, state)
                        if undercovers <= 0:
                            state["winner"] = "平民"
                            state["phase"] = "结束"
                            state["timer"] = 0
                            state["currentSpeakerId"] = None
                            await _reveal_roles(room_id, state, None)
                        elif undercovers >= civilians:
                            state["winner"] = "卧底"
                            state["phase"] = "结束"
                            state["timer"] = 0
                            state["currentSpeakerId"] = None
                            await _reveal_roles(room_id, state, None)

                        if state.get("phase") != "结束":
                            state["phase"] = "结果"
                            state["timer"] = 5
                            state["currentSpeakerId"] = None
                            state["votesBy"] = {}
                            for p in state.get("players", []):
                                p["votes"] = 0
                                if p.get("status") == "voted":
                                    p["status"] = "active"
                    else:
                        pk_round = int(state.get("pkRound", 0)) + 1
                        state["pkRound"] = pk_round

                        if pk_round >= 3:
                            eliminated = random.choice(top)
                            eliminated_id = eliminated.get("id")
                            state["eliminatedPlayerId"] = eliminated_id
                            state["pkCandidates"] = None
                            state["pkRound"] = 0
                            if eliminated_id:
                                elim_player = _find_player(state, eliminated_id)
                                if elim_player:
                                    elim_player["status"] = "eliminated"
                                    await _reveal_roles(room_id, state, [eliminated_id])

                            civilians, undercovers = await _count_alive_sides(room_id, state)
                            if undercovers <= 0:
                                state["winner"] = "平民"
                                state["phase"] = "结束"
                                state["timer"] = 0
                                state["currentSpeakerId"] = None
                                await _reveal_roles(room_id, state, None)
                            elif undercovers >= civilians:
                                state["winner"] = "卧底"
                                state["phase"] = "结束"
                                state["timer"] = 0
                                state["currentSpeakerId"] = None
                                await _reveal_roles(room_id, state, None)

                            if state.get("phase") != "结束":
                                state["phase"] = "结果"
                                state["timer"] = 5
                                state["currentSpeakerId"] = None
                                state["votesBy"] = {}
                                for p in state.get("players", []):
                                    p["votes"] = 0
                                    if p.get("status") == "voted":
                                        p["status"] = "active"
                        else:
                            candidates = [p.get("id") for p in top if p.get("id")]
                            state["pkCandidates"] = candidates
                            state["votesBy"] = {}
                            state["eliminatedPlayerId"] = None
                            for p in state.get("players", []):
                                p["votes"] = 0
                                if p.get("status") == "voted":
                                    p["status"] = "active"
                            state["phase"] = "发言"
                            state["currentSpeakerId"] = candidates[0] if candidates else None
                            state["timer"] = int(state.get("speakingTime", 30))

                await _set_room_state(room_id, state)
                await manager.broadcast(room_id, {"type": "state", "payload": state})
                continue

            if msg_type == "reaction":
                state = await _get_room_state(room_id)
                reactions = state.get("reactions", {})
                reactions[payload.get("targetPlayerId")] = payload.get("emoji")
                state["reactions"] = reactions
                await _set_room_state(room_id, state)
                await manager.broadcast(room_id, {"type": "reaction", "payload": payload})
                await manager.broadcast(room_id, {"type": "state", "payload": state})
                continue

            await websocket.send_json({"type": "error", "error": "unknown_message_type"})

    except WebSocketDisconnect:
        try:
            state = await _get_room_state(room_id)
            if player_id and state:
                if _is_host(state, player_id):
                    await manager.broadcast(room_id, {"type": "room:closed", "payload": {"roomId": room_id}})
                    await _dissolve_room(room_id)
                else:
                    state = _remove_player_from_state(state, player_id)
                    await _set_room_state(room_id, state)
                    await manager.broadcast(room_id, {"type": "state", "payload": state})
        finally:
            await manager.disconnect(room_id, websocket)
    except Exception:
        await manager.disconnect(room_id, websocket)
        raise
