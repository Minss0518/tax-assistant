import uuid
from sqlalchemy import Column, BigInteger, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class TaxCalculation(Base):
    __tablename__ = "tax_calculations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    gross_income = Column(BigInteger, nullable=True)
    expense = Column(BigInteger, nullable=True)
    taxable_income = Column(BigInteger, nullable=True)
    income_tax = Column(BigInteger, nullable=True)
    local_tax = Column(BigInteger, nullable=True)
    total_tax = Column(BigInteger, nullable=True)
    prepaid_tax = Column(BigInteger, nullable=True)
    final_tax = Column(BigInteger, nullable=True)
    is_refund = Column(Boolean, nullable=True)
    refund_amount = Column(BigInteger, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())