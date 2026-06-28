"""Message schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.user import UserResponse


class MessageBase(BaseModel):
    """Base message schema."""
    content: str = Field(..., min_length=1, max_length=2000)


class MessageCreate(MessageBase):
    """Message creation schema."""
    pass


class MessageUpdate(BaseModel):
    """Message update schema."""
    content: str = Field(..., min_length=1, max_length=2000)


class MessageResponse(MessageBase):
    """Message response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    channel_id: int
    author_id: int
    author: UserResponse
    created_at: datetime
    updated_at: datetime


class MessageHistory(BaseModel):
    """Message history response."""
    messages: list[MessageResponse]
    has_more: bool
