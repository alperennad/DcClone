"""Channel schemas."""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, ConfigDict

from app.models.channel import ChannelType


class ChannelBase(BaseModel):
    """Base channel schema."""
    name: str = Field(..., min_length=1, max_length=100)
    type: ChannelType = ChannelType.TEXT
    description: Optional[str] = Field(None, max_length=500)


class ChannelCreate(ChannelBase):
    """Channel creation schema."""
    pass


class ChannelUpdate(BaseModel):
    """Channel update schema."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class ChannelResponse(ChannelBase):
    """Channel response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime


class ChannelList(BaseModel):
    """Channel list response."""
    channels: List[ChannelResponse]
