"""Message service for business logic."""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message
from app.schemas.message import MessageCreate, MessageUpdate


class MessageService:
    """Service for message-related operations."""
    
    DEFAULT_LIMIT = 50
    MAX_LIMIT = 100
    
    @staticmethod
    async def get_by_id(db: AsyncSession, message_id: int) -> Optional[Message]:
        """Get message by ID."""
        result = await db.execute(
            select(Message)
            .where(Message.id == message_id)
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_by_channel(
        db: AsyncSession,
        channel_id: int,
        limit: int = None,
        before_id: Optional[int] = None
    ) -> List[Message]:
        """Get messages from a channel with pagination."""
        limit = limit or MessageService.DEFAULT_LIMIT
        limit = min(limit, MessageService.MAX_LIMIT)
        
        query = select(Message).where(Message.channel_id == channel_id)
        
        if before_id:
            query = query.where(Message.id < before_id)
        
        query = query.order_by(Message.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        messages = result.scalars().all()
        
        # Return in chronological order
        return list(reversed(messages))
    
    @staticmethod
    async def create(db: AsyncSession, message_data: MessageCreate, channel_id: int, author_id: int) -> Message:
        """Create a new message."""
        db_message = Message(
            content=message_data.content,
            channel_id=channel_id,
            author_id=author_id
        )
        
        db.add(db_message)
        await db.commit()
        await db.refresh(db_message)
        return db_message
    
    @staticmethod
    async def update(db: AsyncSession, message: Message, message_data: MessageUpdate) -> Message:
        """Update a message."""
        message.content = message_data.content
        
        await db.commit()
        await db.refresh(message)
        return message
    
    @staticmethod
    async def delete(db: AsyncSession, message: Message) -> None:
        """Delete a message."""
        await db.delete(message)
        await db.commit()


message_service = MessageService()
