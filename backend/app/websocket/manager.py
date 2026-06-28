"""WebSocket connection manager."""
from typing import Dict, List, Set
from collections import defaultdict

from fastapi import WebSocket

from app.core.logging import logger
from app.schemas.websocket import (
    WebSocketMessage,
    WebSocketMessageType,
    SignalingMessage
)
from app.schemas.user import UserPresence


class WebSocketManager:
    """Manages WebSocket connections and real-time communication."""
    
    def __init__(self):
        # Map of user_id to WebSocket
        self.connections: Dict[int, WebSocket] = {}
        
        # Map of user_id to user info
        self.user_info: Dict[int, dict] = {}
        
        # Map of channel_id to set of user_ids (for text channel presence)
        self.channel_members: Dict[int, Set[int]] = defaultdict(set)
        
        # Map of voice_channel_id to set of user_ids
        self.voice_channel_members: Dict[int, Set[int]] = defaultdict(set)
        
        # Map of voice_channel_id to dict of user_id -> WebSocket (for signaling)
        self.voice_connections: Dict[int, Dict[int, WebSocket]] = defaultdict(dict)
    
    async def connect(self, websocket: WebSocket, user_id: int, username: str) -> None:
        """Register a new WebSocket connection (already accepted)."""
        # Close existing connection for same user (if any)
        if user_id in self.connections:
            try:
                await self.connections[user_id].close()
            except Exception:
                pass
        
        self.connections[user_id] = websocket
        self.user_info[user_id] = {
            "user_id": user_id,
            "username": username
        }
        
        logger.info(f"WebSocket connected: user_id={user_id}, username={username}")
        
        # Notify others that user is online
        await self.broadcast_presence(user_id, username, True)
        
        # Send current online users to the new connection
        await self.send_online_users(websocket)
    
    async def disconnect(self, user_id: int) -> None:
        """Handle disconnection."""
        if user_id not in self.connections:
            return
        
        username = self.user_info.get(user_id, {}).get("username", "unknown")
        
        # Leave all voice channels
        await self.leave_all_voice_channels(user_id)
        
        # Leave all text channels
        for channel_id in list(self.channel_members.keys()):
            if user_id in self.channel_members[channel_id]:
                self.channel_members[channel_id].discard(user_id)
        
        # Remove connection
        del self.connections[user_id]
        if user_id in self.user_info:
            del self.user_info[user_id]
        
        logger.info(f"WebSocket disconnected: user_id={user_id}, username={username}")
        
        # Notify others that user is offline
        await self.broadcast_presence(user_id, username, False)
    
    async def send_personal_message(self, user_id: int, message: dict) -> bool:
        """Send a message to a specific user."""
        if user_id not in self.connections:
            return False
        
        try:
            await self.connections[user_id].send_json(message)
            return True
        except Exception as e:
            logger.error(f"Error sending message to user {user_id}: {e}")
            return False
    
    async def broadcast(self, message: dict, exclude_user_id: int = None) -> None:
        """Broadcast a message to all connected users."""
        disconnected = []
        
        for user_id, websocket in self.connections.items():
            if exclude_user_id and user_id == exclude_user_id:
                continue
            
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")
                disconnected.append(user_id)
        
        # Clean up disconnected clients
        for user_id in disconnected:
            await self.disconnect(user_id)
    
    async def broadcast_to_channel(self, channel_id: int, message: dict, exclude_user_id: int = None) -> None:
        """Broadcast a message to all users in a channel."""
        if channel_id not in self.channel_members:
            return
        
        disconnected = []
        
        for user_id in self.channel_members[channel_id]:
            if exclude_user_id and user_id == exclude_user_id:
                continue
            
            if user_id in self.connections:
                try:
                    await self.connections[user_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to channel {channel_id}, user {user_id}: {e}")
                    disconnected.append(user_id)
        
        # Clean up disconnected clients
        for user_id in disconnected:
            await self.disconnect(user_id)
    
    async def broadcast_presence(self, user_id: int, username: str, is_online: bool) -> None:
        """Broadcast user presence update."""
        message_type = (
            WebSocketMessageType.USER_ONLINE if is_online 
            else WebSocketMessageType.USER_OFFLINE
        )
        
        await self.broadcast({
            "type": message_type,
            "data": {
                "user_id": user_id,
                "username": username,
                "is_online": is_online
            }
        }, exclude_user_id=user_id)
    
    async def send_online_users(self, websocket: WebSocket) -> None:
        """Send list of online users to a client."""
        online_users = [
            {
                "user_id": uid,
                "username": info["username"],
                "is_online": True
            }
            for uid, info in self.user_info.items()
        ]
        
        await websocket.send_json({
            "type": WebSocketMessageType.ONLINE_USERS_LIST,
            "data": {
                "users": online_users
            }
        })
    
    # Channel management
    async def join_channel(self, user_id: int, channel_id: int) -> None:
        """Add user to a text channel."""
        self.channel_members[channel_id].add(user_id)
        logger.info(f"User {user_id} joined text channel {channel_id}")
    
    async def leave_channel(self, user_id: int, channel_id: int) -> None:
        """Remove user from a text channel."""
        if channel_id in self.channel_members:
            self.channel_members[channel_id].discard(user_id)
        logger.info(f"User {user_id} left text channel {channel_id}")
    
    # Voice channel management
    async def join_voice_channel(self, user_id: int, channel_id: int, websocket: WebSocket) -> None:
        """Add user to a voice channel."""
        # Leave any existing voice channel first
        await self.leave_all_voice_channels(user_id)
        
        # Initialize channel dict if not exists
        if channel_id not in self.voice_channel_members:
            self.voice_channel_members[channel_id] = set()
        if channel_id not in self.voice_connections:
            self.voice_connections[channel_id] = {}
        
        self.voice_channel_members[channel_id].add(user_id)
        self.voice_connections[channel_id][user_id] = websocket
        
        username = self.user_info.get(user_id, {}).get("username", "unknown")
        
        # DEBUG: Log current state
        current_members = list(self.voice_channel_members[channel_id])
        logger.info(f"[DEBUG] User {user_id} joining voice channel {channel_id}")
        logger.info(f"[DEBUG] Current members in channel: {current_members}")
        logger.info(f"[DEBUG] Other users to notify: {[u for u in current_members if u != user_id]}")
        
        # Notify others in the voice channel
        await self.broadcast_voice_signaling(
            channel_id,
            {
                "type": "user_joined_voice",
                "data": {
                    "user_id": user_id,
                    "username": username
                }
            },
            exclude_user_id=user_id
        )
        
        # Send current voice channel users to the new participant
        other_users = [
            {
                "user_id": uid,
                "username": self.user_info.get(uid, {}).get("username", "unknown")
            }
            for uid in self.voice_channel_members[channel_id]
            if uid != user_id
        ]
        
        logger.info(f"[DEBUG] Sending voice_users_list to user {user_id}: {other_users}")
        
        await websocket.send_json({
            "type": "voice_users_list",
            "data": {
                "channel_id": channel_id,
                "users": other_users
            }
        })
    
    async def leave_voice_channel(self, user_id: int, channel_id: int) -> None:
        """Remove user from a voice channel."""
        if channel_id in self.voice_channel_members:
            self.voice_channel_members[channel_id].discard(user_id)
        
        if channel_id in self.voice_connections:
            if user_id in self.voice_connections[channel_id]:
                del self.voice_connections[channel_id][user_id]
        
        username = self.user_info.get(user_id, {}).get("username", "unknown")
        
        logger.info(f"User {user_id} left voice channel {channel_id}")
        
        # Notify others
        await self.broadcast_voice_signaling(
            channel_id,
            {
                "type": "user_left_voice",
                "data": {
                    "user_id": user_id,
                    "username": username
                }
            }
        )
    
    async def leave_all_voice_channels(self, user_id: int) -> None:
        """Remove user from all voice channels."""
        for channel_id in list(self.voice_channel_members.keys()):
            if user_id in self.voice_channel_members[channel_id]:
                await self.leave_voice_channel(user_id, channel_id)
    
    async def broadcast_voice_signaling(
        self,
        channel_id: int,
        message: dict,
        exclude_user_id: int = None,
        target_user_id: int = None
    ) -> None:
        """Broadcast signaling message to voice channel members."""
        if channel_id not in self.voice_connections:
            return
        
        if target_user_id:
            # Send to specific user
            if target_user_id in self.voice_connections[channel_id]:
                try:
                    await self.voice_connections[channel_id][target_user_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error sending signaling to user {target_user_id}: {e}")
        else:
            # Broadcast to all in channel
            disconnected = []
            
            for user_id, websocket in self.voice_connections[channel_id].items():
                if exclude_user_id and user_id == exclude_user_id:
                    continue
                
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting signaling to user {user_id}: {e}")
                    disconnected.append(user_id)
            
            # Clean up disconnected clients
            for user_id in disconnected:
                await self.leave_voice_channel(user_id, channel_id)
    
    def get_voice_channel_users(self, channel_id: int) -> List[dict]:
        """Get list of users in a voice channel."""
        if channel_id not in self.voice_channel_members:
            return []
        
        return [
            {
                "user_id": uid,
                "username": self.user_info.get(uid, {}).get("username", "unknown")
            }
            for uid in self.voice_channel_members[channel_id]
        ]


# Global WebSocket manager instance
websocket_manager = WebSocketManager()
