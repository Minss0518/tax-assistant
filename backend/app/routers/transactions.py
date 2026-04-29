from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.core.dependencies import get_current_user
from typing import List
import uuid

router = APIRouter(prefix="/transactions", tags=["transactions"])

# 거래 내역 생성
@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    data: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    transaction = Transaction(
        id=uuid.uuid4(),
        user_id=uuid.UUID(current_user["sub"]),
        type=data.type,
        amount=data.amount,
        category_id=data.category_id,
        memo=data.memo,
        transaction_date=data.transaction_date,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction

# 거래 내역 전체 조회
@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.user_id == uuid.UUID(current_user["sub"])
        ).order_by(Transaction.transaction_date.desc())
    )
    return result.scalars().all()

# 거래 내역 단건 조회
@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == uuid.UUID(current_user["sub"])
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="거래 내역을 찾을 수 없습니다.")
    return transaction

# 거래 내역 수정
@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: uuid.UUID,
    data: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == uuid.UUID(current_user["sub"])
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="거래 내역을 찾을 수 없습니다.")

    transaction.type = data.type
    transaction.amount = data.amount
    transaction.category_id = data.category_id
    transaction.memo = data.memo
    transaction.transaction_date = data.transaction_date

    await db.commit()
    await db.refresh(transaction)
    return transaction

# 거래 내역 삭제
@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == uuid.UUID(current_user["sub"])
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="거래 내역을 찾을 수 없습니다.")

    await db.delete(transaction)
    await db.commit()
    return {"message": "삭제되었습니다."}