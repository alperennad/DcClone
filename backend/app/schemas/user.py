"""User schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    """Base user schema."""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    display_name: Optional[str] = Field(None, max_length=50)


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=6, max_length=100)


class UserLogin(BaseModel):
    """User login schema."""
    username: str
    password: str


class UserUpdate(BaseModel):
    """User update schema."""
    display_name: Optional[str] = Field(None, max_length=50)
    avatar_url: Optional[str] = Field(None, max_length=255)


class UserResponse(UserBase):
    """User response schema."""
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    avatar_url: Optional[str] = None
    is_active: bool
    is_online: bool
    last_seen: Optional[datetime] = None
    created_at: datetime


class Token(BaseModel):
    """Token response schema."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class UserPresence(BaseModel):
    """User presence update schema."""
    user_id: int
    username: str
    is_online: bool
