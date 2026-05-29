from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import uuid

from app.database import get_db
from app.models.consultation import Consultation, Message, ConsultationStatus, SenderType
from app.routers.advisor_auth import get_current_advisor
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/consultations", tags=["consultations"])


class ConsultationCreate(BaseModel):
    title: str


class MessageSend(BaseModel):
    content: str
    sender_type: str  # "user" or "advisor"
    sender_id: str


# ── 유저용 ──────────────────────────────────────

@router.post("/")
async def create_consultation(
    data: ConsultationCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    consultation = Consultation(
        id=uuid.uuid4(),
        user_id=uuid.UUID(current_user["sub"]),
        title=data.title,
        status=ConsultationStatus.waiting
    )
    db.add(consultation)
    await db.commit()
    await db.refresh(consultation)
    return {"id": str(consultation.id), "title": consultation.title, "status": consultation.status}


# 내 상담 목록 조회 - is_deleted_by_user 필터 추가
@router.get("/user/me")
async def get_my_consultations(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Consultation)
        .where(
            Consultation.user_id == uuid.UUID(current_user["sub"]),
            Consultation.is_deleted_by_user == False  # ← 추가
        )
        .order_by(Consultation.updated_at.desc())
    )
    consultations = result.scalars().all()
    return [{"id": str(c.id), "title": c.title, "status": c.status, "created_at": c.created_at} for c in consultations]


# 유저 상담 삭제 (숨김처리) - 새로 추가
@router.delete("/{consultation_id}")
async def delete_consultation_by_user(
    consultation_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Consultation).where(
            Consultation.id == consultation_id,
            Consultation.user_id == uuid.UUID(current_user["sub"])
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="상담방을 찾을 수 없습니다")

    consultation.is_deleted_by_user = True
    await db.commit()
    return {"message": "삭제되었습니다"}


# ── 세무사용 ────────────────────────────────────

@router.get("/advisor/list")
async def get_all_consultations(
    advisor_id: str = Depends(get_current_advisor),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Consultation)
        .where(Consultation.is_deleted_by_advisor == False)
        .order_by(Consultation.updated_at.desc())
    )
    consultations = result.scalars().all()
    return [{"id": str(c.id), "title": c.title, "status": c.status, "user_id": str(c.user_id), "updated_at": c.updated_at} for c in consultations]


@router.patch("/{consultation_id}/assign")
async def assign_consultation(
    consultation_id: uuid.UUID,
    advisor_id: str = Depends(get_current_advisor),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="상담방을 찾을 수 없습니다")

    consultation.advisor_id = uuid.UUID(advisor_id)
    consultation.status = ConsultationStatus.active
    consultation.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "배정 완료"}


# 세무사용 상담 삭제 (완전 숨김)
@router.delete("/advisor/{consultation_id}")
async def delete_consultation_by_advisor(
    consultation_id: uuid.UUID,
    advisor_id: str = Depends(get_current_advisor),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="상담방을 찾을 수 없습니다")
    consultation.is_deleted_by_advisor = True  # ← 수정
    await db.commit()
    return {"message": "삭제되었습니다"}


@router.patch("/{consultation_id}/close")
async def close_consultation(
    consultation_id: uuid.UUID,
    advisor_id: str = Depends(get_current_advisor),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="상담방을 찾을 수 없습니다")

    consultation.status = ConsultationStatus.closed
    consultation.updated_at = datetime.utcnow()
    await db.commit()
    return {"message": "상담 종료"}


# ── 공통 (메시지) ────────────────────────────────

@router.post("/{consultation_id}/messages")
async def send_message(
    consultation_id: uuid.UUID,
    data: MessageSend,
    db: AsyncSession = Depends(get_db)
):
    message = Message(
        id=uuid.uuid4(),
        consultation_id=consultation_id,
        sender_type=SenderType(data.sender_type),
        sender_id=uuid.UUID(data.sender_id),
        content=data.content
    )
    db.add(message)

    # updated_at 갱신
    result = await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    consultation = result.scalar_one_or_none()
    if consultation:
        consultation.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(message)
    return {"id": str(message.id), "content": message.content, "sender_type": message.sender_type, "created_at": message.created_at}


@router.get("/{consultation_id}/messages")
async def get_messages(
    consultation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Message)
        .where(Message.consultation_id == consultation_id)
        .order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return [{"id": str(m.id), "content": m.content, "sender_type": m.sender_type, "sender_id": str(m.sender_id), "is_read": m.is_read, "created_at": m.created_at} for m in messages]


@router.patch("/{consultation_id}/messages/read")
async def mark_as_read(
    consultation_id: uuid.UUID,
    reader_type: str,
    db: AsyncSession = Depends(get_db)
):
    sender = SenderType.user if reader_type == "advisor" else SenderType.advisor
    result = await db.execute(
        select(Message).where(
            Message.consultation_id == consultation_id,
            Message.sender_type == sender,
            Message.is_read == False
        )
    )
    messages = result.scalars().all()
    for m in messages:
        m.is_read = True
    await db.commit()
    return {"message": f"{len(messages)}개 읽음 처리 완료"}