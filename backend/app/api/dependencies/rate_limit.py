"""Rate limiting dependency."""
import time
from typing import Optional
from functools import wraps

from fastapi import HTTPException, Request

from app.core.logging import logger


class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self):
        self.requests: dict[str, list[float]] = {}
        self.cleanup_interval = 300  # Cleanup every 5 minutes
        self.last_cleanup = time.time()
    
    def is_allowed(self, key: str, max_requests: int = 10, window_seconds: int = 60) -> bool:
        """Check if request is allowed under rate limit."""
        now = time.time()
        
        # Cleanup old entries periodically
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup(now)
        
        # Get or create request history
        if key not in self.requests:
            self.requests[key] = []
        
        # Remove old requests outside the window
        window_start = now - window_seconds
        self.requests[key] = [
            req_time for req_time in self.requests[key]
            if req_time > window_start
        ]
        
        # Check if under limit
        if len(self.requests[key]) >= max_requests:
            return False
        
        # Record this request
        self.requests[key].append(now)
        return True
    
    def _cleanup(self, now: float):
        """Clean up old entries."""
        cutoff = now - 3600  # Remove entries older than 1 hour
        keys_to_remove = []
        
        for key, requests in self.requests.items():
            recent_requests = [t for t in requests if t > cutoff]
            if recent_requests:
                self.requests[key] = recent_requests
            else:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.requests[key]
        
        self.last_cleanup = now


# Global rate limiter instance
rate_limiter = RateLimiter()


async def rate_limit_messages(request: Request) -> None:
    """Rate limit for sending messages."""
    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Also consider user if authenticated
    user_id = getattr(request.state, "user_id", None)
    key = f"{client_ip}:{user_id}" if user_id else client_ip
    
    if not rate_limiter.is_allowed(key, max_requests=30, window_seconds=60):
        logger.warning(f"Rate limit exceeded for {key}")
        raise HTTPException(
            status_code=429,
            detail="Too many messages. Please slow down."
        )


async def rate_limit_auth(request: Request) -> None:
    """Rate limit for authentication endpoints."""
    client_ip = request.client.host if request.client else "unknown"
    
    if not rate_limiter.is_allowed(f"auth:{client_ip}", max_requests=5, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Too many authentication attempts. Please try again later."
        )
