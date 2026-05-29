import uuid
from sqlalchemy import Column, String, Boolean, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import enum
from sqlalchemy import DateTime
from datetime import datetime


class ConsultationStatus(str, enum.Enum):
    waiting = "waiting"
    active = "active"
    closed = "closed"


class SenderType(str, enum.Enum):
    user = "user"
    advisor = "advisor"


class TaxAdvisor(Base):
    __tablename__ = "tax_advisors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    consultations = relationship("Consultation", back_populates="advisor")


class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    advisor_id = Column(UUID(as_uuid=True), ForeignKey("tax_advisors.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    status = Column(SAEnum(ConsultationStatus), default=ConsultationStatus.waiting)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    advisor = relationship("TaxAdvisor", back_populates="consultations")
    messages = relationship("Message", back_populates="consultation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    consultation_id = Column(UUID(as_uuid=True), ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False)
    sender_type = Column(SAEnum(SenderType), nullable=False)
    sender_id = Column(UUID(as_uuid=True), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    consultation = relationship("Consultation", back_populates="messages")