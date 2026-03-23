from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Friend(Base):
    __tablename__ = "friends"
    __table_args__ = (
        UniqueConstraint("requester_id", "addressee_id", name="uq_friend_request_pair"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    requester_id: Mapped[str] = mapped_column(String(64), index=True)
    addressee_id: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
