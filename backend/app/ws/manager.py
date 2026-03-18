import asyncio
from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._rooms: DefaultDict[str, set[WebSocket]] = defaultdict(set)
        self._room_players: DefaultDict[str, dict[str, WebSocket]] = defaultdict(dict)
        self._lock = asyncio.Lock()

    async def connect(self, room_id: str, player_id: str | None, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._rooms[room_id].add(websocket)
            if player_id:
                self._room_players[room_id][player_id] = websocket

    async def disconnect(self, room_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            if room_id in self._rooms:
                self._rooms[room_id].discard(websocket)
                if not self._rooms[room_id]:
                    del self._rooms[room_id]

            if room_id in self._room_players:
                to_del = [pid for pid, ws in self._room_players[room_id].items() if ws == websocket]
                for pid in to_del:
                    del self._room_players[room_id][pid]
                if not self._room_players[room_id]:
                    del self._room_players[room_id]

    async def broadcast(self, room_id: str, message: dict) -> None:
        async with self._lock:
            conns = list(self._rooms.get(room_id, set()))

        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(room_id, ws)

    async def send_to_player(self, room_id: str, player_id: str, message: dict) -> None:
        async with self._lock:
            ws = self._room_players.get(room_id, {}).get(player_id)

        if not ws:
            return

        try:
            await ws.send_json(message)
        except Exception:
            await self.disconnect(room_id, ws)


manager = ConnectionManager()
