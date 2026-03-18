from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[str] = mapped_column(String(6), primary_key=True)
    name: Mapped[str] = mapped_column(String(64))
    max_players: Mapped[int] = mapped_column(Integer)
    phase: Mapped[str] = mapped_column(String(16))

    created_at: Mapped[DateTime] = mapped_column(DateTime)
    updated_at: Mapped[DateTime] = mapped_column(DateTime)
