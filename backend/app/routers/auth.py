from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
from app.database import get_db
from app.models.user import User, SocialAccount
from app.core.security import create_access_token
from app.config import settings
import uuid

router = APIRouter(prefix="/auth", tags=["auth"])

# 카카오 로그인 시작
@router.get("/kakao")
async def kakao_login():
    kakao_auth_url = (
        f"https://kauth.kakao.com/oauth/authorize"
        f"?client_id={settings.KAKAO_CLIENT_ID}"
        f"&redirect_uri={settings.KAKAO_REDIRECT_URI}"
        f"&response_type=code"
    )
    return RedirectResponse(url=kakao_auth_url)

# 카카오 콜백
@router.get("/kakao/callback")
async def kakao_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        # 토큰 받기
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.KAKAO_CLIENT_ID,
                "redirect_uri": settings.KAKAO_REDIRECT_URI,
                "code": code,
            }
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        # 유저 정보 받기
        user_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_data = user_res.json()

    kakao_id = str(user_data.get("id"))
    kakao_account = user_data.get("kakao_account", {})
    email = kakao_account.get("email")
    nickname = kakao_account.get("profile", {}).get("nickname")
    profile_image = kakao_account.get("profile", {}).get("profile_image_url")

    # SocialAccount 조회
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.provider == "kakao",
            SocialAccount.provider_id == kakao_id
        )
    )
    social_account = result.scalar_one_or_none()

    if social_account:
        # 기존 유저
        user_result = await db.execute(select(User).where(User.id == social_account.user_id))
        user = user_result.scalar_one_or_none()
    else:
        # 신규 유저 생성
        user = User(
            id=uuid.uuid4(),
            name=nickname,
            email=email,
            profile_image=profile_image,
        )
        db.add(user)
        await db.flush()

        social_account = SocialAccount(
            id=uuid.uuid4(),
            user_id=user.id,
            provider="kakao",
            provider_id=kakao_id,
            access_token=access_token,
        )
        db.add(social_account)
        await db.commit()

    # JWT 발급
    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    return RedirectResponse(
    url=f"http://localhost:5173/callback?token={jwt_token}",
    status_code=302
)

# 구글 로그인 시작
@router.get("/google")
async def google_login():
    google_auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid email profile"
    )
    return RedirectResponse(url=google_auth_url)

# 구글 콜백
@router.get("/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        # 토큰 받기
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "code": code,
            }
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        # 유저 정보 받기
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_data = user_res.json()

    google_id = str(user_data.get("id"))
    email = user_data.get("email")
    nickname = user_data.get("name")
    profile_image = user_data.get("picture")

    # SocialAccount 조회
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.provider == "google",
            SocialAccount.provider_id == google_id
        )
    )
    social_account = result.scalar_one_or_none()

    if social_account:
        user_result = await db.execute(select(User).where(User.id == social_account.user_id))
        user = user_result.scalar_one_or_none()
    else:
        user = User(
            id=uuid.uuid4(),
            name=nickname,
            email=email,
            profile_image=profile_image,
        )
        db.add(user)
        await db.flush()

        social_account = SocialAccount(
            id=uuid.uuid4(),
            user_id=user.id,
            provider="google",
            provider_id=google_id,
            access_token=access_token,
        )
        db.add(social_account)
        await db.commit()

    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    return RedirectResponse(
    url=f"http://localhost:5173/callback?token={jwt_token}",
    status_code=302
)


# 네이버 로그인 시작
@router.get("/naver")
async def naver_login():
    naver_auth_url = (
        f"https://nid.naver.com/oauth2.0/authorize"
        f"?client_id={settings.NAVER_CLIENT_ID}"
        f"&redirect_uri={settings.NAVER_REDIRECT_URI}"
        f"&response_type=code"
        f"&state=RANDOM_STATE"
    )
    return RedirectResponse(url=naver_auth_url)

# 네이버 콜백
@router.get("/naver/callback")
async def naver_callback(code: str, state: str, db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        # 토큰 받기
        token_res = await client.post(
            "https://nid.naver.com/oauth2.0/token",
            data={
                "grant_type": "authorization_code",
                "client_id": settings.NAVER_CLIENT_ID,
                "client_secret": settings.NAVER_CLIENT_SECRET,
                "redirect_uri": settings.NAVER_REDIRECT_URI,
                "code": code,
                "state": state,
            }
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        # 유저 정보 받기
        user_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user_data = user_res.json()

    response_data = user_data.get("response", {})
    naver_id = str(response_data.get("id"))
    email = response_data.get("email")
    nickname = response_data.get("name")
    profile_image = response_data.get("profile_image")

    # SocialAccount 조회
    result = await db.execute(
        select(SocialAccount).where(
            SocialAccount.provider == "naver",
            SocialAccount.provider_id == naver_id
        )
    )
    social_account = result.scalar_one_or_none()

    if social_account:
        user_result = await db.execute(select(User).where(User.id == social_account.user_id))
        user = user_result.scalar_one_or_none()
    else:
        user = User(
            id=uuid.uuid4(),
            name=nickname,
            email=email,
            profile_image=profile_image,
        )
        db.add(user)
        await db.flush()

        social_account = SocialAccount(
            id=uuid.uuid4(),
            user_id=user.id,
            provider="naver",
            provider_id=naver_id,
            access_token=access_token,
        )
        db.add(social_account)
        await db.commit()

    jwt_token = create_access_token({"sub": str(user.id), "email": user.email})
    return RedirectResponse(
    url=f"http://localhost:5173/callback?token={jwt_token}",
    status_code=302
)