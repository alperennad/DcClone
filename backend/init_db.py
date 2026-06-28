"""Initialize database with default channels."""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.base import AsyncSessionLocal, init_db
from app.models.channel import Channel, ChannelType
from app.core.logging import logger


async def create_default_channels(db: AsyncSession):
    """Create default text and voice channels."""
    from sqlalchemy import select
    
    # Check if channels already exist
    result = await db.execute(select(Channel))
    existing = result.scalars().all()
    
    if existing:
        logger.info("Channels already exist, skipping default creation")
        return
    
    default_channels = [
        # Text channels
        Channel(name="general", type=ChannelType.TEXT, description="General discussion", created_by=1),
        Channel(name="random", type=ChannelType.TEXT, description="Random chat", created_by=1),
        Channel(name="announcements", type=ChannelType.TEXT, description="Important announcements", created_by=1),
        # Voice channels
        Channel(name="General Voice", type=ChannelType.VOICE, description="General voice chat", created_by=1),
        Channel(name="Gaming", type=ChannelType.VOICE, description="Gaming voice chat", created_by=1),
        Channel(name="Music", type=ChannelType.VOICE, description="Listen to music together", created_by=1),
    ]
    
    for channel in default_channels:
        db.add(channel)
    
    await db.commit()
    logger.info(f"Created {len(default_channels)} default channels")


async def main():
    """Main initialization function."""
    logger.info("Initializing database...")
    
    # Create tables
    await init_db()
    
    # Create default channels
    async with AsyncSessionLocal() as db:
        await create_default_channels(db)
    
    logger.info("Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(main())
