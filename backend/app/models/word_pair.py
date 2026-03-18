from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WordPair(Base):
    __tablename__ = "word_pairs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    category_id: Mapped[str] = mapped_column(String(64), ForeignKey("word_categories.id"), index=True)

    civilian_word: Mapped[str] = mapped_column(String(32))
    undercover_word: Mapped[str] = mapped_column(String(32))

    created_at: Mapped[DateTime] = mapped_column(DateTime)
    updated_at: Mapped[DateTime] = mapped_column(DateTime)
