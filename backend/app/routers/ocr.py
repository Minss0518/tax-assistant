from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.limits import check_ocr_limit
from app.services.ocr_service import extract_receipt_info
import uuid
import os
import httpx

router = APIRouter(prefix="/ocr", tags=["ocr"])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

async def upload_to_supabase(image_bytes: bytes, content_type: str, file_path: str) -> str:
    url = f"{SUPABASE_URL}/storage/v1/object/receipts/{file_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": content_type,
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(url, content=image_bytes, headers=headers)
        if res.status_code not in [200, 201]:
            raise Exception(f"업로드 실패: {res.text}")
    return f"{SUPABASE_URL}/storage/v1/object/public/receipts/{file_path}"


@router.post("/receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    user_id = uuid.UUID(current_user["sub"])
    await check_ocr_limit(user_id, db)

    image_bytes = await file.read()

    # Supabase Storage에 이미지 업로드
    receipt_image_url = None
    try:
        file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        file_path = f"{user_id}/{uuid.uuid4()}.{file_ext}"
        receipt_image_url = await upload_to_supabase(image_bytes, file.content_type, file_path)
    except Exception as e:
        print(f"이미지 업로드 실패: {e}")

    # OCR 분석
    receipt_info = await extract_receipt_info(image_bytes)
    receipt_info["receipt_image_url"] = receipt_image_url

    return {
        "message": "영수증 인식 완료!",
        "extracted": receipt_info,
    }