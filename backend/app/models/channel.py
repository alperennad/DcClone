"""Channel model."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.message import Message


class ChannelType(str, enum.Enum):
    """Channel types."""
    TEXT = "text"
    VOICE = "voice"


class Channel(Base):
    """Channel model for text and voice channels."""
    
    __tablename__ = "channels"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(SQLEnum(ChannelType), default=ChannelType.TEXT, nullable=False)
    description = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    messages = relationship("Message", back_populates="channel", lazy="selectin", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Channel(id={self.id}, name={self.name}, type={self.type})>"
