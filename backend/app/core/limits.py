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

async def check_chat_limit(user_id: uuid.UUID, db: AsyncSession):
    # 유저 플랜 확인
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user and user.plan == "pro":
        return  # Pro는 무제한

    # 이번 달 채팅 횟수 확인
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
    if user and user.plan == "pro":
        return  # Pro는 무제한

    # 이번 달 OCR 횟수 — transactions 중 ocr로 생성된 것 카운트
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