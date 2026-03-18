from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    room_id: Mapped[str] = mapped_column(String(6), ForeignKey("rooms.id"), index=True)

    name: Mapped[str] = mapped_column(String(32))
    avatar: Mapped[str] = mapped_column(String(255))

    status: Mapped[str] = mapped_column(String(16), default="active")
    is_ready: Mapped[bool] = mapped_column(Boolean, default=False)
    is_host: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[DateTime] = mapped_column(DateTime)
    updated_at: Mapped[DateTime] = mapped_column(DateTime)
