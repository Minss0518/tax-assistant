from pydantic import BaseModel
from datetime import date
from typing import Optional
from uuid import UUID

class TransactionCreate(BaseModel):
    type: str
    amount: int
    category_id: Optional[UUID] = None
    memo: Optional[str] = None
    transaction_date: date

class TransactionResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    amount: int
    category_id: Optional[UUID] = None
    category_name: Optional[str] = None
    category_emoji: Optional[str] = None
    is_deductible: Optional[bool] = None
    memo: Optional[str] = None
    transaction_date: date

    class Config:
        from_attributes = True