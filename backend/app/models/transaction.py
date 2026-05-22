import uuid
from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    is_default = Column(String, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    category_id = Column(UUID(as_uuid=True), nullable=True)
    category_name = Column(String, nullable=True)
    category_emoji = Column(String, nullable=True)
    is_deductible = Column(Boolean, nullable=True)
    type = Column(String, nullable=False)
    amount = Column(Integer, nullable=False)
    memo = Column(String, nullable=True)
    transaction_date = Column(Date, nullable=False)
    source = Column(String, nullable=True, default="manual")  # manual | ocr | upload
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Receipt(Base):
    __tablename__ = "receipts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), nullable=False)
    image_url = Column(String, nullable=True)
    ocr_raw_text = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())