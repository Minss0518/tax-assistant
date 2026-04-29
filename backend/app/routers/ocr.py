from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.dependencies import get_current_user
from app.services.ocr_service import extract_receipt_info

router = APIRouter(prefix="/ocr", tags=["ocr"])

@router.post("/receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드 가능합니다.")

    image_bytes = await file.read()
    receipt_info = await extract_receipt_info(image_bytes)

    return {
        "message": "영수증 인식 완료!",
        "extracted": receipt_info,
    }