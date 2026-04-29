from pydantic import BaseModel
from datetime import date
from typing import Optional
from uuid import UUID

class TransactionCreate(BaseModel):
    type: str  # income / expense
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
    memo: Optional[str] = None
    transaction_date: date

    class Config:
        from_attributes = True