"""Message routes."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import get_current_user_http
from app.db.base import get_db
from app.api.dependencies.rate_limit import rate_limit_messages
from app.schemas.message import MessageCreate, MessageResponse, MessageUpdate
from app.services.message_service import message_service
from app.services.channel_service import channel_service
from app.models.message import Message

router = APIRouter()


@router.get("/{channel_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    channel_id: int,
    limit: Optional[int] = Query(None, ge=1, le=100),
    before_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
) -> list[MessageResponse]:
    """Get messages from a channel."""
    # Verify channel exists
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Load messages with author relationship eagerly
    from sqlalchemy import select
    query = select(Message).where(Message.channel_id == channel_id).options(selectinload(Message.author))
    
    if before_id:
        query = query.where(Message.id < before_id)
    
    query = query.order_by(Message.created_at.desc()).limit(limit or 50)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Return in chronological order
    messages = list(reversed(messages))
    
    return [MessageResponse.model_validate(msg) for msg in messages]


@router.post("/{channel_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def create_message(
    channel_id: int,
    message_data: MessageCreate,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    """Create a new message in a channel."""
    # Verify channel exists
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    message = await message_service.create(
        db,
        message_data,
        channel_id=channel_id,
        author_id=current_user["user_id"]
    )
    
    return MessageResponse.model_validate(message)


@router.patch("/{channel_id}/messages/{message_id}", response_model=MessageResponse)
async def update_message(
    channel_id: int,
    message_id: int,
    message_data: MessageUpdate,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> MessageResponse:
    """Update a message."""
    # Verify channel exists
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get message
    message = await message_service.get_by_id(db, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify message is in the channel
    if message.channel_id != channel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message does not belong to this channel"
        )
    
    # Only author can update
    if message.author_id != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the message author can update it"
        )
    
    updated_message = await message_service.update(db, message, message_data)
    return MessageResponse.model_validate(updated_message)


@router.delete("/{channel_id}/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    channel_id: int,
    message_id: int,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a message."""
    # Verify channel exists
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Get message
    message = await message_service.get_by_id(db, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Verify message is in the channel
    if message.channel_id != channel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message does not belong to this channel"
        )
    
    # Only author can delete
    if message.author_id != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the message author can delete it"
        )
    
    await message_service.delete(db, message)
