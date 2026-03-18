from __future__ import annotations

from datetime import datetime
import random
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.word_category import WordCategory
from app.models.word_pair import WordPair
from app.schemas.words import (
    CreateWordCategoryRequest,
    CreateWordPairRequest,
    RandomWordPairResponse,
    WordCategoryResponse,
    WordPairResponse,
)

router = APIRouter(prefix="/words", tags=["words"])


def _is_admin(user: User) -> bool:
    return int(getattr(user, "role", 1) or 1) == 2


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="admin_only")


async def _seed_if_empty(db: AsyncSession) -> None:
    q = select(func.count()).select_from(WordCategory)
    res = await db.execute(q)
    count = int(res.scalar() or 0)
    if count > 0:
        return

    now = datetime.utcnow()
    categories = {
        "美食": [("包子", "饺子"), ("汉堡", "三明治"), ("火锅", "冒菜"), ("牛奶", "豆浆")],
        "动物": [("老虎", "狮子"), ("猫", "狗"), ("企鹅", "鸭子"), ("狼", "狐狸")],
        "科技": [("手机", "平板"), ("电脑", "笔记本"), ("微信", "支付宝"), ("耳机", "音箱")],
        "电影": [("泰坦尼克号", "阿凡达"), ("西游记", "封神榜"), ("哈利波特", "指环王")],
        "随机": [("雨伞", "雨衣"), ("牙刷", "牙膏"), ("镜子", "玻璃")],
    }

    for name, pairs in categories.items():
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


@router.get("/categories", response_model=list[WordCategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    await _seed_if_empty(db)
    q = select(WordCategory).order_by(WordCategory.name.asc())
    res = await db.execute(q)
    rows = res.scalars().all()
    return [WordCategoryResponse(id=r.id, name=r.name) for r in rows]


@router.get("/pairs", response_model=list[WordPairResponse])
async def list_pairs(category_id: str, db: AsyncSession = Depends(get_db)):
    q = select(WordPair).where(WordPair.category_id == category_id)
    res = await db.execute(q)
    rows = res.scalars().all()
    return [
        WordPairResponse(
            id=r.id,
            category_id=r.category_id,
            civilian_word=r.civilian_word,
            undercover_word=r.undercover_word,
        )
        for r in rows
    ]


@router.get("/random", response_model=RandomWordPairResponse)
async def random_pair(category: str | None = None, db: AsyncSession = Depends(get_db)):
    await _seed_if_empty(db)

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
            raise HTTPException(status_code=404, detail="no_categories")
        cat_obj = random.choice(cats)

    q = select(WordPair).where(WordPair.category_id == cat_obj.id)
    res = await db.execute(q)
    pairs = res.scalars().all()
    if not pairs:
        raise HTTPException(status_code=404, detail="no_pairs")

    pair = random.choice(pairs)
    return RandomWordPairResponse(
        category=cat_obj.name,
        civilian_word=pair.civilian_word,
        undercover_word=pair.undercover_word,
    )


@router.post("/categories", response_model=WordCategoryResponse)
async def create_category(
    payload: CreateWordCategoryRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    name = (payload.name or "").strip()
    if not name:
        raise HTTPException(status_code=422, detail="invalid_category_name")
    if len(name) > 32:
        raise HTTPException(status_code=422, detail="category_name_too_long")

    q = select(WordCategory).where(WordCategory.name == name)
    res = await db.execute(q)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="category_exists")

    now = datetime.utcnow()
    obj = WordCategory(id=uuid.uuid4().hex, name=name, created_at=now, updated_at=now)
    db.add(obj)
    await db.commit()
    return WordCategoryResponse(id=obj.id, name=obj.name)


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)

    cat = await db.get(WordCategory, category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="category_not_found")

    q = select(WordPair).where(WordPair.category_id == category_id)
    res = await db.execute(q)
    for p in res.scalars().all():
        await db.delete(p)

    await db.delete(cat)
    await db.commit()
    return {"ok": True}


@router.post("/pairs", response_model=WordPairResponse)
async def create_pair(
    payload: CreateWordPairRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)

    cat = await db.get(WordCategory, payload.category_id)
    if not cat:
        raise HTTPException(status_code=404, detail="category_not_found")

    cw = (payload.civilian_word or "").strip()
    uw = (payload.undercover_word or "").strip()
    if not cw or not uw:
        raise HTTPException(status_code=422, detail="invalid_words")

    now = datetime.utcnow()
    obj = WordPair(
        id=uuid.uuid4().hex,
        category_id=payload.category_id,
        civilian_word=cw,
        undercover_word=uw,
        created_at=now,
        updated_at=now,
    )
    db.add(obj)
    await db.commit()

    return WordPairResponse(
        id=obj.id,
        category_id=obj.category_id,
        civilian_word=obj.civilian_word,
        undercover_word=obj.undercover_word,
    )


@router.delete("/pairs/{pair_id}")
async def delete_pair(
    pair_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)

    obj = await db.get(WordPair, pair_id)
    if not obj:
        raise HTTPException(status_code=404, detail="pair_not_found")

    await db.delete(obj)
    await db.commit()
    return {"ok": True}
