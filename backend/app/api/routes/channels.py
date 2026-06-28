"""Channel routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user_http
from app.db.base import get_db
from app.models.channel import ChannelType
from app.schemas.channel import ChannelCreate, ChannelResponse, ChannelUpdate
from app.services.channel_service import channel_service

router = APIRouter()


@router.get("/", response_model=list[ChannelResponse])
async def list_channels(
    db: AsyncSession = Depends(get_db)
) -> list[ChannelResponse]:
    """List all channels."""
    channels = await channel_service.get_all(db)
    return [ChannelResponse.model_validate(ch) for ch in channels]


@router.post("/", response_model=ChannelResponse, status_code=status.HTTP_201_CREATED)
async def create_channel(
    channel_data: ChannelCreate,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> ChannelResponse:
    """Create a new channel."""
    channel = await channel_service.create(
        db,
        channel_data,
        created_by=current_user["user_id"]
    )
    return ChannelResponse.model_validate(channel)


@router.get("/{channel_id}", response_model=ChannelResponse)
async def get_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db)
) -> ChannelResponse:
    """Get a specific channel."""
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    return ChannelResponse.model_validate(channel)


@router.patch("/{channel_id}", response_model=ChannelResponse)
async def update_channel(
    channel_id: int,
    channel_data: ChannelUpdate,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> ChannelResponse:
    """Update a channel."""
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Only creator can update
    if channel.created_by != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the channel creator can update it"
        )
    
    updated_channel = await channel_service.update(db, channel, channel_data)
    return ChannelResponse.model_validate(updated_channel)


@router.delete("/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel(
    channel_id: int,
    current_user: dict = Depends(get_current_user_http),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete a channel."""
    channel = await channel_service.get_by_id(db, channel_id)
    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )
    
    # Only creator can delete
    if channel.created_by != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the channel creator can delete it"
        )
    
    await channel_service.delete(db, channel)


@router.get("/type/text", response_model=list[ChannelResponse])
async def list_text_channels(
    db: AsyncSession = Depends(get_db)
) -> list[ChannelResponse]:
    """List all text channels."""
    channels = await channel_service.get_text_channels(db)
    return [ChannelResponse.model_validate(ch) for ch in channels]


@router.get("/type/voice", response_model=list[ChannelResponse])
async def list_voice_channels(
    db: AsyncSession = Depends(get_db)
) -> list[ChannelResponse]:
    """List all voice channels."""
    channels = await channel_service.get_voice_channels(db)
    return [ChannelResponse.model_validate(ch) for ch in channels]
