"""Application configuration."""
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # App
    APP_NAME: str = "Discord Clone"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"
    
    # Database (PostgreSQL) - Dokploy internal connection
    DATABASE_URL: str = "postgresql+asyncpg://postgres:zfypucno7zkqyufz@infra-db-cs5bbm:5432/DiscordClone"
    
    # JWT
    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    # Redis (for rate limiting and presence)
    REDIS_URL: str = "redis://redis:6379/0"
    
    # WebRTC
    STUN_SERVERS: str = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse allowed origins into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    @property
    def stun_servers_list(self) -> List[str]:
        """Parse STUN servers into a list."""
        return [server.strip() for server in self.STUN_SERVERS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
