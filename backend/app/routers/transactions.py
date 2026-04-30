from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.core.dependencies import get_current_user
from app.services.category_service import classify_transaction
from typing import List, Optional
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/transactions", tags=["transactions"])

class CategoryUpdate(BaseModel):
    category_name: str
    category_emoji: str
    is_deductible: bool

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    data: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # AI 자동 카테고리 분류
    category_info = {"category": None, "emoji": None, "is_deductible": None}
    if data.memo:
        try:
            category_info = await classify_transaction(data.memo, data.type)
        except Exception:
            pass

    transaction = Transaction(
        id=uuid.uuid4(),
        user_id=uuid.UUID(current_user["sub"]),
        type=data.type,
        amount=data.amount,
        category_id=data.category_id,
        category_name=category_info.get("category"),
        category_emoji=category_info.get("emoji"),
        is_deductible=category_info.get("is_deductible"),
        memo=data.memo,
        transaction_date=data.transaction_date,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction

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

    # 메모가 바뀌면 카테고리 재분류
    if data.memo != transaction.memo:
        try:
            category_info = await classify_transaction(data.memo, data.type)
            transaction.category_name = category_info.get("category")
            transaction.category_emoji = category_info.get("emoji")
            transaction.is_deductible = category_info.get("is_deductible")
        except Exception:
            pass

    transaction.type = data.type
    transaction.amount = data.amount
    transaction.category_id = data.category_id
    transaction.memo = data.memo
    transaction.transaction_date = data.transaction_date

    await db.commit()
    await db.refresh(transaction)
    return transaction

@router.patch("/{transaction_id}/category", response_model=TransactionResponse)
async def update_category(
    transaction_id: uuid.UUID,
    data: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """카테고리 수동 수정"""
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id,
            Transaction.user_id == uuid.UUID(current_user["sub"])
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="거래 내역을 찾을 수 없습니다.")

    transaction.category_name = data.category_name
    transaction.category_emoji = data.category_emoji
    transaction.is_deductible = data.is_deductible

    await db.commit()
    await db.refresh(transaction)
    return transaction

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