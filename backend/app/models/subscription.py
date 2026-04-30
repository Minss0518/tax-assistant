import uuid
from sqlalchemy import Column, String, DateTime, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    plan = Column(String, nullable=False, default="free")
    status = Column(String, nullable=False, default="active")
    payment_key = Column(String, nullable=True)
    order_id = Column(String, nullable=True)
    amount = Column(Integer, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, nullable=True)
    is_read = Column(String, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())