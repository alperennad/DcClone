"""WebSocket message handlers."""
from fastapi import WebSocket

from app.core.security import get_current_user_ws
from app.core.logging import logger
from app.db.base import AsyncSessionLocal
from app.services.message_service import message_service
from app.services.user_service import user_service
from app.websocket.manager import websocket_manager
from app.schemas.websocket import WebSocketMessageType


class WebSocketHandler:
    """Handle WebSocket messages."""
    
    @staticmethod
    async def handle_auth(websocket: WebSocket, data: dict) -> dict:
        """Handle authentication message."""
        token = data.get("token")
        
        try:
            user_data = await get_current_user_ws(token)
            
            # Register connection
            await websocket_manager.connect(
                websocket,
                user_data["user_id"],
                user_data["username"]
            )
            
            # Update online status in database
            async with AsyncSessionLocal() as db:
                await user_service.set_online_status(db, user_data["user_id"], True)
            
            return {
                "type": WebSocketMessageType.AUTH_SUCCESS,
                "data": {
                    "user_id": user_data["user_id"],
                    "username": user_data["username"]
                }
            }
        except Exception as e:
            logger.error(f"WebSocket auth failed: {e}")
            return {
                "type": WebSocketMessageType.AUTH_ERROR,
                "data": {
                    "error": "Authentication failed"
                }
            }
    
    @staticmethod
    async def handle_message_new(user_id: int, data: dict) -> dict:
        """Handle new message."""
        channel_id = data.get("channel_id")
        content = data.get("content")
        
        if not channel_id or not content:
            return {
                "type": WebSocketMessageType.ERROR,
                "data": {"error": "Missing channel_id or content"}
            }
        
        try:
            async with AsyncSessionLocal() as db:
                from app.schemas.message import MessageCreate
                message_data = MessageCreate(content=content)
                message = await message_service.create(db, message_data, channel_id, user_id)
                
                # Load author info
                await db.refresh(message, ["author"])
                
                return {
                    "type": WebSocketMessageType.MESSAGE_NEW,
                    "data": {
                        "id": message.id,
                        "content": message.content,
                        "channel_id": message.channel_id,
                        "author_id": message.author_id,
                        "author": {
                            "id": message.author.id,
                            "username": message.author.username,
                            "display_name": message.author.display_name,
                            "avatar_url": message.author.avatar_url
                        },
                        "created_at": message.created_at.isoformat()
                    }
                }
        except Exception as e:
            logger.error(f"Error creating message: {e}")
            return {
                "type": WebSocketMessageType.ERROR,
                "data": {"error": "Failed to create message"}
            }
    
    @staticmethod
    async def handle_channel_join(user_id: int, data: dict) -> None:
        """Handle user joining a text channel."""
        channel_id = data.get("channel_id")
        if channel_id:
            await websocket_manager.join_channel(user_id, channel_id)
    
    @staticmethod
    async def handle_channel_leave(user_id: int, data: dict) -> None:
        """Handle user leaving a text channel."""
        channel_id = data.get("channel_id")
        if channel_id:
            await websocket_manager.leave_channel(user_id, channel_id)
    
    @staticmethod
    async def handle_signaling(user_id: int, data: dict) -> None:
        """Handle WebRTC signaling message."""
        signal_type = data.get("signal_type")
        channel_id = data.get("channel_id")
        target_user_id = data.get("target_user_id")
        signal_data = data.get("data")
        
        if not signal_type or not channel_id:
            return
        
        username = websocket_manager.user_info.get(user_id, {}).get("username", "unknown")
        
        # Handle voice channel join/leave
        if signal_type == "join_voice":
            websocket = websocket_manager.connections.get(user_id)
            if websocket:
                await websocket_manager.join_voice_channel(user_id, channel_id, websocket)
            return
        
        if signal_type == "leave_voice":
            await websocket_manager.leave_voice_channel(user_id, channel_id)
            return
        
        # Handle WebRTC signaling (offer, answer, ice_candidate)
        message = {
            "type": "signaling",
            "signal_type": signal_type,
            "channel_id": channel_id,
            "from_user_id": user_id,
            "from_username": username,
            "data": signal_data
        }
        
        await websocket_manager.broadcast_voice_signaling(
            channel_id,
            message,
            exclude_user_id=user_id,
            target_user_id=target_user_id
        )


# Global handler instance
websocket_handler = WebSocketHandler()
