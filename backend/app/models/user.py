import uuid
from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True)
    profile_image = Column(String, nullable=True)
    plan = Column(String, default="free")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    provider = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)
    access_token = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())