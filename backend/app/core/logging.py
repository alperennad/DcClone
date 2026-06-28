"""Logging configuration."""
import logging
import sys

from app.core.config import get_settings


def setup_logging() -> logging.Logger:
    """Setup application logging."""
    settings = get_settings()
    
    # Create logger
    logger = logging.getLogger("discord_clone")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Clear existing handlers
    logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, settings.LOG_LEVEL.upper()))
    
    # Formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(formatter)
    
    # Add handler
    logger.addHandler(console_handler)
    
    return logger


# Global logger instance
logger = setup_logging()
