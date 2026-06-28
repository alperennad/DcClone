"""Message model."""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.channel import Channel


class Message(Base):
    """Message model for channel messages."""
    
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    channel_id = Column(Integer, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    channel = relationship("Channel", back_populates="messages")
    author = relationship("User", back_populates="messages")
    
    def __repr__(self) -> str:
        return f"<Message(id={self.id}, channel_id={self.channel_id}, author_id={self.author_id})>"
