from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from app.database import get_db
from app.models.user import User, SocialAccount
from app.models.transaction import Transaction
from app.models.chat import ChatHistory
from ..core.dependencies import get_current_user
from app.config import settings
from pydantic import BaseModel
import httpx
import uuid

router = APIRouter(prefix="/users", tags=["users"])


class ProfileUpdate(BaseModel):
    nickname: str | None = None


@router.get("/me")
async def get_my_info(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요.")

    social_result = await db.execute(
        select(SocialAccount).where(SocialAccount.user_id == user_id)
    )
    social = social_result.scalar_one_or_none()

    chat_count_result = await db.execute(
        select(func.count()).where(
            ChatHistory.user_id == user_id,
            ChatHistory.role == "user"
        )
    )
    chat_count = chat_count_result.scalar() or 0

    tx_count_result = await db.execute(
        select(func.count()).where(Transaction.user_id == user_id)
    )
    tx_count = tx_count_result.scalar() or 0

    return {
        "name": user.name,
        "nickname": user.nickname,
        "email": user.email,
        "profile_image": user.profile_image,
        "plan": user.plan or "free",
        "provider": social.provider if social else "unknown",
        "created_at": user.created_at.strftime("%Y년 %m월 %d일") if user.created_at else "-",
        "chat_count": chat_count,
        "tx_count": tx_count,
    }


@router.patch("/me/profile")
async def update_profile(
    body: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요.")

    if body.nickname is not None:
        nickname = body.nickname.strip()
        if len(nickname) > 50:
            raise HTTPException(status_code=400, detail="닉네임은 50자 이하로 입력해주세요.")
        user.nickname = nickname

    await db.commit()
    return {"message": "프로필이 업데이트되었어요.", "nickname": user.nickname}


@router.post("/me/profile-image")
async def upload_profile_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="유저를 찾을 수 없어요.")

    # 파일 형식 체크
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="JPG, PNG, WEBP 이미지만 업로드 가능해요.")

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="이미지 크기는 5MB 이하여야 해요.")

    # Supabase Storage 업로드
    ext = file.filename.split(".")[-1]
    filename = f"profiles/{user_id}.{ext}"
    upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/profiles/{filename}"

    async with httpx.AsyncClient() as client:
        res = await client.post(
            upload_url,
            content=contents,
            headers={
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
                "Content-Type": file.content_type,
                "x-upsert": "true",
            }
        )
        if res.status_code not in (200, 201):
            raise HTTPException(status_code=500, detail="이미지 업로드에 실패했어요.")

    image_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/profiles/{filename}"
    user.profile_image = image_url
    await db.commit()

    return {"message": "프로필 이미지가 업데이트되었어요.", "profile_image": image_url}


@router.delete("/me")
async def delete_my_account(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = uuid.UUID(current_user["sub"])

    await db.execute(delete(ChatHistory).where(ChatHistory.user_id == user_id))
    await db.execute(delete(Transaction).where(Transaction.user_id == user_id))
    await db.execute(delete(SocialAccount).where(SocialAccount.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    await db.commit()

    return {"message": "회원 탈퇴가 완료되었어요."}