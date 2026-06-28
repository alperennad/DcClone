"""Channel service for business logic."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.channel import Channel, ChannelType
from app.schemas.channel import ChannelCreate, ChannelUpdate


class ChannelService:
    """Service for channel-related operations."""
    
    @staticmethod
    async def get_by_id(db: AsyncSession, channel_id: int) -> Optional[Channel]:
        """Get channel by ID."""
        result = await db.execute(select(Channel).where(Channel.id == channel_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_all(db: AsyncSession) -> List[Channel]:
        """Get all channels."""
        result = await db.execute(select(Channel).order_by(Channel.created_at))
        return result.scalars().all()
    
    @staticmethod
    async def get_text_channels(db: AsyncSession) -> List[Channel]:
        """Get all text channels."""
        result = await db.execute(
            select(Channel)
            .where(Channel.type == ChannelType.TEXT)
            .order_by(Channel.created_at)
        )
        return result.scalars().all()
    
    @staticmethod
    async def get_voice_channels(db: AsyncSession) -> List[Channel]:
        """Get all voice channels."""
        result = await db.execute(
            select(Channel)
            .where(Channel.type == ChannelType.VOICE)
            .order_by(Channel.created_at)
        )
        return result.scalars().all()
    
    @staticmethod
    async def create(db: AsyncSession, channel_data: ChannelCreate, created_by: int) -> Channel:
        """Create a new channel."""
        db_channel = Channel(
            name=channel_data.name,
            type=channel_data.type,
            description=channel_data.description,
            created_by=created_by
        )
        
        db.add(db_channel)
        await db.commit()
        await db.refresh(db_channel)
        return db_channel
    
    @staticmethod
    async def update(db: AsyncSession, channel: Channel, channel_data: ChannelUpdate) -> Channel:
        """Update channel data."""
        update_data = channel_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(channel, field, value)
        
        await db.commit()
        await db.refresh(channel)
        return channel
    
    @staticmethod
    async def delete(db: AsyncSession, channel: Channel) -> None:
        """Delete a channel."""
        await db.delete(channel)
        await db.commit()


channel_service = ChannelService()
