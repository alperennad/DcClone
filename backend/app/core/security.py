"""Security utilities for authentication and password hashing."""
from datetime import datetime, timedelta
from typing import Optional, Union

import bcrypt
from fastapi import Depends, HTTPException, status, WebSocketException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import get_settings, Settings

# HTTP Bearer scheme for JWT
security = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    # bcrypt has 72 byte limit, truncate if necessary
    password_bytes = plain_password.encode('utf-8')[:72]
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    # bcrypt has 72 byte limit, truncate if necessary
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(
    data: dict,
    settings: Settings = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    if settings is None:
        settings = get_settings()
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_token(
    token: str,
    settings: Settings = None
) -> Optional[dict]:
    """Decode and validate a JWT token."""
    if settings is None:
        settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        username: str = payload.get("username")
        
        if user_id is None:
            return None
        
        return {
            "user_id": int(user_id),
            "username": username
        }
    except JWTError:
        return None


async def get_current_user_http(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current user from HTTP Authorization header."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = decode_token(credentials.credentials)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_data


async def get_current_user_ws(token: str) -> dict:
    """Get current user from WebSocket token."""
    if not token:
        raise WebSocketException(code=1008, reason="Not authenticated")
    
    token_data = decode_token(token)
    
    if token_data is None:
        raise WebSocketException(code=1008, reason="Invalid authentication credentials")
    
    return token_data
