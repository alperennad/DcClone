"""WebSocket message schemas."""
import enum
from typing import Optional, Any, Dict
from datetime import datetime

from pydantic import BaseModel, Field


class WebSocketMessageType(str, enum.Enum):
    """WebSocket message types."""
    # Connection
    AUTH = "auth"
    AUTH_SUCCESS = "auth_success"
    AUTH_ERROR = "auth_error"
    PING = "ping"
    PONG = "pong"
    
    # Messages
    MESSAGE_NEW = "message_new"
    MESSAGE_UPDATE = "message_update"
    MESSAGE_DELETE = "message_delete"
    MESSAGE_HISTORY = "message_history"
    
    # Presence
    PRESENCE_UPDATE = "presence_update"
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    ONLINE_USERS_LIST = "online_users_list"
    
    # Channels
    CHANNEL_JOIN = "channel_join"
    CHANNEL_LEAVE = "channel_leave"
    CHANNEL_CREATE = "channel_create"
    CHANNEL_UPDATE = "channel_update"
    CHANNEL_DELETE = "channel_delete"
    
    # Errors
    ERROR = "error"


class SignalingType(str, enum.Enum):
    """WebRTC signaling message types."""
    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice_candidate"
    JOIN_VOICE = "join_voice"
    LEAVE_VOICE = "leave_voice"
    USER_JOINED_VOICE = "user_joined_voice"
    USER_LEFT_VOICE = "user_left_voice"
    VOICE_USERS_LIST = "voice_users_list"


class WebSocketMessage(BaseModel):
    """Generic WebSocket message."""
    type: WebSocketMessageType
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SignalingMessage(BaseModel):
    """WebRTC signaling message."""
    type: SignalingType
    channel_id: int
    target_user_id: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VoiceState(BaseModel):
    """Voice channel state."""
    channel_id: int
    user_id: int
    username: str
    is_muted: bool = False
    is_deafened: bool = False
    joined_at: datetime = Field(default_factory=datetime.utcnow)
