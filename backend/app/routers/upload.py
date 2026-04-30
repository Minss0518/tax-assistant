from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.transaction import Transaction
from app.core.dependencies import get_current_user
from app.services.category_service import classify_transaction
import uuid
import io
import pandas as pd
from datetime import date, datetime

router = APIRouter(prefix="/upload", tags=["upload"])

def parse_date(value) -> date:
    """다양한 날짜 형식 파싱"""
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    s = str(value).strip()
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y", "%Y.%m.%d"]:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"날짜 형식을 인식할 수 없어요: {value}")

def parse_amount(value) -> int:
    """금액 파싱 (쉼표, 원 기호 제거)"""
    s = str(value).replace(",", "").replace("원", "").replace(" ", "").strip()
    return int(float(s))

def parse_type(value) -> str:
    """수입/지출 파싱"""
    s = str(value).strip()
    if s in ["수입", "income", "Income", "INCOME", "입금"]:
        return "income"
    return "expense"

@router.post("/transactions")
async def upload_transactions(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    content_type = file.content_type
    filename = file.filename.lower()

    if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="CSV 또는 Excel 파일만 업로드 가능해요.")

    contents = await file.read()
    rows = []

    try:
        if filename.endswith('.csv'):
            import pandas as pd
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8-sig')
            rows = df.to_dict('records')
        else:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(contents))
            rows = df.to_dict('records')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파일 파싱 실패: {str(e)}")

    # 컬럼명 매핑 (다양한 형식 지원)
    COL_DATE   = ["날짜", "date", "거래일", "transaction_date", "일자"]
    COL_TYPE   = ["유형", "type", "구분", "수입지출"]
    COL_AMOUNT = ["금액", "amount", "거래금액"]
    COL_MEMO   = ["메모", "memo", "내용", "적요", "거래내용"]

    def find_col(row, candidates):
        for c in candidates:
            for k in row.keys():
                if str(k).strip().lower() == c.lower():
                    return k
        return None

    success, failed = 0, 0
    errors = []

    for i, row in enumerate(rows):
        try:
            date_col   = find_col(row, COL_DATE)
            type_col   = find_col(row, COL_TYPE)
            amount_col = find_col(row, COL_AMOUNT)
            memo_col   = find_col(row, COL_MEMO)

            if not date_col or not amount_col:
                raise ValueError("날짜 또는 금액 컬럼을 찾을 수 없어요.")

            tx_date   = parse_date(row[date_col])
            tx_amount = parse_amount(row[amount_col])
            tx_type   = parse_type(row[type_col]) if type_col else "expense"
            tx_memo   = str(row[memo_col]).strip() if memo_col and str(row[memo_col]) != 'nan' else ""

            # AI 카테고리 분류
            category_info = {"category": None, "emoji": None, "is_deductible": None}
            if tx_memo:
                try:
                    category_info = await classify_transaction(tx_memo, tx_type)
                except Exception:
                    pass

            transaction = Transaction(
                id=uuid.uuid4(),
                user_id=uuid.UUID(current_user["sub"]),
                type=tx_type,
                amount=tx_amount,
                memo=tx_memo,
                transaction_date=tx_date,
                category_name=category_info.get("category"),
                category_emoji=category_info.get("emoji"),
                is_deductible=category_info.get("is_deductible"),
            )
            db.add(transaction)
            success += 1
        except Exception as e:
            failed += 1
            errors.append(f"{i+2}행: {str(e)}")

    await db.commit()

    return {
        "message": f"{success}건 업로드 성공, {failed}건 실패",
        "success": success,
        "failed": failed,
        "errors": errors[:5],  # 최대 5개 에러만 반환
    }


@router.get("/template/csv")
async def download_csv_template():
    """CSV 템플릿 다운로드"""
    from fastapi.responses import StreamingResponse
    content = "날짜,유형,금액,메모\n2024-01-15,지출,50000,스타벅스\n2024-01-16,수입,1000000,프리랜서 작업비\n"
    return StreamingResponse(
        iter([content.encode('utf-8-sig')]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=template.csv"}
    )