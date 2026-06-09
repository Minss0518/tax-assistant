from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from ..models.chat import ChatHistory
from ..models.transaction import Transaction
from ..models.user import User
import uuid

FREE_CHAT_LIMIT = 5
FREE_OCR_LIMIT = 3
PRO_CONSULTATION_LIMIT = 0   # Pro는 세무사 상담 불가
PREMIUM_CONSULTATION_LIMIT = 5  # Premium은 월 5회

async def check_chat_limit(user_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user and user.plan in ("pro", "premium"):
        return  # Pro, Premium 무제한

    now = datetime.utcnow()
    count_result = await db.execute(
        select(func.count()).where(
            ChatHistory.user_id == user_id,
            ChatHistory.role == "user",
            func.extract('year', ChatHistory.created_at) == now.year,
            func.extract('month', ChatHistory.created_at) == now.month,
        )
    )
    count = count_result.scalar() or 0

    if count >= FREE_CHAT_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"무료 플랜은 AI 상담을 월 {FREE_CHAT_LIMIT}회까지 사용할 수 있어요. Pro로 업그레이드하면 무제한으로 사용할 수 있어요."
        )

async def check_ocr_limit(user_id: uuid.UUID, db: AsyncSession):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user and user.plan in ("pro", "premium"):
        return  # Pro, Premium 무제한

    now = datetime.utcnow()
    count_result = await db.execute(
        select(func.count()).where(
            Transaction.user_id == user_id,
            Transaction.memo.like("%OCR%"),
            func.extract('year', Transaction.created_at) == now.year,
            func.extract('month', Transaction.created_at) == now.month,
        )
    )
    count = count_result.scalar() or 0

    if count >= FREE_OCR_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"무료 플랜은 OCR을 월 {FREE_OCR_LIMIT}회까지 사용할 수 있어요. Pro로 업그레이드하면 무제한으로 사용할 수 있어요."
        )

async def check_consultation_limit(user_id: uuid.UUID, db: AsyncSession):
    from ..models.consultation import Consultation

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or user.plan in ("free", "pro"):
        raise HTTPException(
            status_code=403,
            detail="세무사 상담은 Premium 플랜 전용 기능이에요. Premium으로 업그레이드하면 월 5회 세무사와 직접 상담할 수 있어요."
        )

    # Premium: 월 5회 제한
    now = datetime.utcnow()
    count_result = await db.execute(
        select(func.count()).where(
            Consultation.user_id == user_id,
            func.extract('year', Consultation.created_at) == now.year,
            func.extract('month', Consultation.created_at) == now.month,
        )
    )
    count = count_result.scalar() or 0

    if count >= PREMIUM_CONSULTATION_LIMIT:
        raise HTTPException(
            status_code=403,
            detail=f"이번 달 세무사 상담 횟수({PREMIUM_CONSULTATION_LIMIT}회)를 모두 사용했어요. 다음 달에 다시 이용할 수 있어요."
        )