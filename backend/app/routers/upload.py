from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.transaction import Transaction
from app.core.dependencies import get_current_user
from app.services.category_service import classify_transaction
import uuid
import io
import csv
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime

router = APIRouter(prefix="/upload", tags=["upload"])

def parse_date(value) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, datetime):
        return value.date()
    s = str(value).strip()
    # xlsx 날짜 숫자 처리 (엑셀 시리얼 번호)
    try:
        num = float(s)
        if num > 1000:
            from datetime import timedelta
            base = datetime(1899, 12, 30)
            return (base + timedelta(days=num)).date()
    except ValueError:
        pass
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y", "%Y.%m.%d"]:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"날짜 형식을 인식할 수 없어요: {value}")

def parse_amount(value) -> int:
    s = str(value).replace(",", "").replace("원", "").replace(" ", "").strip()
    return int(float(s))

def parse_type(value) -> str:
    s = str(value).strip()
    if s in ["수입", "income", "Income", "INCOME", "입금"]:
        return "income"
    return "expense"

def find_col(headers, candidates):
    for c in candidates:
        for h in headers:
            if str(h).strip().lower() == c.lower():
                return h
    return None

def parse_xlsx(contents: bytes) -> list:
    """openpyxl 없이 xlsx 파싱"""
    rows = []
    with zipfile.ZipFile(io.BytesIO(contents)) as z:
        # 공유 문자열 로드
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            tree = ET.parse(z.open('xl/sharedStrings.xml'))
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in tree.findall('.//ns:si', ns):
                texts = si.findall('.//ns:t', ns)
                shared_strings.append(''.join(t.text or '' for t in texts))

        # 시트 파싱
        sheet_name = 'xl/worksheets/sheet1.xml'
        tree = ET.parse(z.open(sheet_name))
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        sheet_rows = []
        for row in tree.findall('.//ns:row', ns):
            cells = []
            for c in row.findall('ns:c', ns):
                t = c.get('t', '')
                v_el = c.find('ns:v', ns)
                if v_el is None or v_el.text is None:
                    cells.append('')
                elif t == 's':
                    cells.append(shared_strings[int(v_el.text)])
                else:
                    cells.append(v_el.text)
            sheet_rows.append(cells)

        if not sheet_rows:
            return []

        headers = sheet_rows[0]
        for row in sheet_rows[1:]:
            if any(v for v in row):
                row_dict = {}
                for i, h in enumerate(headers):
                    row_dict[h] = row[i] if i < len(row) else ''
                rows.append(row_dict)

    return rows

@router.post("/transactions")
async def upload_transactions(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    filename = file.filename.lower()
    if not (filename.endswith('.csv') or filename.endswith('.xlsx') or filename.endswith('.xls')):
        raise HTTPException(status_code=400, detail="CSV 또는 Excel 파일만 업로드 가능해요.")

    contents = await file.read()
    rows = []

    try:
        if filename.endswith('.csv'):
            text = contents.decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(text))
            rows = list(reader)
        else:
            rows = parse_xlsx(contents)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"파일 파싱 실패: {str(e)}")

    COL_DATE   = ["날짜", "date", "거래일", "transaction_date", "일자"]
    COL_TYPE   = ["유형", "type", "구분", "수입지출"]
    COL_AMOUNT = ["금액", "amount", "거래금액"]
    COL_MEMO   = ["메모", "memo", "내용", "적요", "거래내용"]

    success, failed = 0, 0
    errors = []

    for i, row in enumerate(rows):
        try:
            headers = list(row.keys())
            date_col   = find_col(headers, COL_DATE)
            type_col   = find_col(headers, COL_TYPE)
            amount_col = find_col(headers, COL_AMOUNT)
            memo_col   = find_col(headers, COL_MEMO)

            if not date_col or not amount_col:
                raise ValueError("날짜 또는 금액 컬럼을 찾을 수 없어요.")

            tx_date   = parse_date(row[date_col])
            tx_amount = parse_amount(row[amount_col])
            tx_type   = parse_type(row[type_col]) if type_col else "expense"
            tx_memo   = str(row[memo_col]).strip() if memo_col and row[memo_col] else ""

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
        "errors": errors[:5],
    }

@router.get("/template/csv")
async def download_csv_template():
    content = "날짜,유형,금액,메모\n2024-01-15,지출,50000,스타벅스\n2024-01-16,수입,1000000,프리랜서 작업비\n"
    return StreamingResponse(
        iter([content.encode('utf-8-sig')]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=template.csv"}
    )