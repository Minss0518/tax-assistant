from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.transaction import Transaction
from app.core.dependencies import get_current_user
from app.services.ocr_service import extract_receipt_info
from datetime import date
import uuid

router = APIRouter(prefix="/ocr", tags=["ocr"])

@router.post("/receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    image_bytes = await file.read()
    receipt_info = await extract_receipt_info(image_bytes)

    transaction = Transaction(
    id=uuid.uuid4(),
    user_id=uuid.UUID(current_user["sub"]),
    type=receipt_info.get("type", "expense"),
    amount=receipt_info.get("amount", 0),
    memo=receipt_info.get("memo", ""),
    transaction_date=date.fromisoformat(receipt_info.get("date", str(date.today()))),  # 수정
)
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    return {
        "message": "영수증 인식 완료!",
        "extracted": receipt_info,
        "transaction_id": str(transaction.id)
    }