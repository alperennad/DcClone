"""Database base model and session management."""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Create async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)

# Base class for all models
Base = declarative_base()


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables."""
    from app.models import user, channel, message  # noqa
    
    async with engine.begin() as conn:
        logger.info("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created.")
