"""User routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_http
from app.db.base import get_db
from app.schemas.user import UserResponse, UserUpdate
from app.services.user_service import user_service

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Get current user profile."""
    user = await user_service.get_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
async def update_user(
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Update current user profile."""
    user = await user_service.get_by_id(db, current_user["user_id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    updated_user = await user_service.update(db, user, user_data)
    return UserResponse.model_validate(updated_user)


@router.get("/online", response_model=list[UserResponse])
async def get_online_users(
    db: AsyncSession = Depends(get_db)
) -> list[UserResponse]:
    """Get all online users."""
    from sqlalchemy import select
    from app.models.user import User
    
    result = await db.execute(
        select(User).where(User.is_online == True).order_by(User.username)
    )
    users = result.scalars().all()
    return [UserResponse.model_validate(user) for user in users]
