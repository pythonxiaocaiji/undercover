from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)

    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    role: Mapped[int] = mapped_column(Integer, default=1)

    username: Mapped[str] = mapped_column(String(32))
    avatar: Mapped[str] = mapped_column(String(255))
    user_status: Mapped[str] = mapped_column(String(20), default="online")

    phone_verified_at: Mapped[DateTime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[DateTime] = mapped_column(DateTime)
    updated_at: Mapped[DateTime] = mapped_column(DateTime)
