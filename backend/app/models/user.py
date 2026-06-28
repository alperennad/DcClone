"""User model."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.message import Message


class User(Base):
    """User model for authentication and profile."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(50), nullable=True)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = relationship("Message", back_populates="author", lazy="selectin")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username})>"
