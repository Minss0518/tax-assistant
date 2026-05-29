from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import jwt, JWTError
import bcrypt
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import os
import uuid

from app.database import get_db
from app.models.consultation import TaxAdvisor

router = APIRouter(prefix="/advisor", tags=["advisor"])

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/advisor/login")


class AdvisorCreate(BaseModel):
    email: str
    password: str
    name: str
    phone: str = None


class Token(BaseModel):
    access_token: str
    token_type: str


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_token(advisor_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": advisor_id, "exp": expire, "role": "advisor"},
        SECRET_KEY, algorithm=ALGORITHM
    )


async def get_current_advisor(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        advisor_id = payload.get("sub")
        if not advisor_id or payload.get("role") != "advisor":
            raise HTTPException(status_code=401, detail="인증 실패")
        return advisor_id
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰 만료 또는 오류")


# 관리자가 세무사 계정 생성
@router.post("/create")
async def create_advisor(data: AdvisorCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaxAdvisor).where(TaxAdvisor.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일")

    advisor = TaxAdvisor(
        id=uuid.uuid4(),
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        phone=data.phone
    )
    db.add(advisor)
    await db.commit()
    await db.refresh(advisor)
    return {"message": "세무사 계정 생성 완료", "id": str(advisor.id)}


# 세무사 로그인
@router.post("/login", response_model=Token)
async def advisor_login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TaxAdvisor).where(TaxAdvisor.email == form.username))
    advisor = result.scalar_one_or_none()

    if not advisor or not verify_password(form.password, advisor.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호 오류")
    if not advisor.is_active:
        raise HTTPException(status_code=403, detail="비활성화된 계정")

    return {
        "access_token": create_token(str(advisor.id)),
        "token_type": "bearer"
    }


# 내 정보 조회
@router.get("/me")
async def get_me(
    advisor_id: str = Depends(get_current_advisor),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(TaxAdvisor).where(TaxAdvisor.id == uuid.UUID(advisor_id)))
    advisor = result.scalar_one_or_none()
    if not advisor:
        raise HTTPException(status_code=404, detail="세무사를 찾을 수 없습니다")
    return {"id": str(advisor.id), "email": advisor.email, "name": advisor.name, "phone": advisor.phone}