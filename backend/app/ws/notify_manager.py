import asyncio
from collections import defaultdict
from typing import DefaultDict

from fastapi import WebSocket


class NotifyManager:
    def __init__(self) -> None:
        self._users: DefaultDict[str, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._users[user_id].add(websocket)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            if user_id in self._users:
                self._users[user_id].discard(websocket)
                if not self._users[user_id]:
                    del self._users[user_id]

    async def send(self, user_id: str, message: dict) -> None:
        async with self._lock:
            conns = list(self._users.get(user_id, set()))
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                await self.disconnect(user_id, ws)

    def is_online(self, user_id: str) -> bool:
        return bool(self._users.get(user_id))


notify_manager = NotifyManager()
