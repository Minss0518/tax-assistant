from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.database import get_db
from app.models.user import User, SocialAccount
from app.models.transaction import Transaction
from app.models.chat import ChatHistory
from app.core.dependencies import get_current_user
import uuid

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
async def get_my_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    # 유저 정보
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요.")

    # 소셜 로그인 방식
    social_result = await db.execute(
        select(SocialAccount).where(SocialAccount.user_id == user_id)
    )
    social = social_result.scalar_one_or_none()

    # AI 상담 횟수 (user 메시지만 카운트)
    chat_count_result = await db.execute(
        select(func.count()).where(
            ChatHistory.user_id == user_id,
            ChatHistory.role == "user"
        )
    )
    chat_count = chat_count_result.scalar() or 0

    # 거래 내역 건수
    tx_count_result = await db.execute(
        select(func.count()).where(Transaction.user_id == user_id)
    )
    tx_count = tx_count_result.scalar() or 0

    return {
        "name": user.name,
        "email": user.email,
        "profile_image": user.profile_image,
        "plan": user.plan or "free",
        "provider": social.provider if social else "unknown",
        "created_at": user.created_at.strftime("%Y년 %m월 %d일") if user.created_at else "-",
        "chat_count": chat_count,
        "tx_count": tx_count,
    }

@router.delete("/me")
async def delete_my_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    # 관련 데이터 전부 삭제
    await db.execute(delete(ChatHistory).where(ChatHistory.user_id == user_id))
    await db.execute(delete(Transaction).where(Transaction.user_id == user_id))
    await db.execute(delete(SocialAccount).where(SocialAccount.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()

    return {"message": "회원 탈퇴가 완료되었어요."}