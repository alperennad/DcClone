"""WebSocket routes."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logging import logger
from app.core.security import decode_token
from app.websocket.manager import websocket_manager
from app.db.base import AsyncSessionLocal
from app.services.user_service import user_service
from app.schemas.websocket import WebSocketMessageType
from app.services.message_service import message_service
from app.schemas.message import MessageCreate

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Main WebSocket endpoint for real-time communication."""
    user_id = None
    username = None
    
    # Accept connection immediately
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    
    try:
        # Wait for auth message first
        data = await websocket.receive_json()
        message_type = data.get("type")
        message_data = data.get("data", {})
        
        if message_type != WebSocketMessageType.AUTH:
            await websocket.send_json({
                "type": WebSocketMessageType.AUTH_ERROR,
                "data": {"error": "First message must be auth"}
            })
            await websocket.close()
            return
        
        # Authenticate
        token = message_data.get("token")
        if not token:
            await websocket.send_json({
                "type": WebSocketMessageType.AUTH_ERROR,
                "data": {"error": "No token provided"}
            })
            await websocket.close()
            return
        
        token_data = decode_token(token)
        if not token_data:
            await websocket.send_json({
                "type": WebSocketMessageType.AUTH_ERROR,
                "data": {"error": "Invalid token"}
            })
            await websocket.close()
            return
        
        user_id = token_data["user_id"]
        username = token_data["username"]
        
        # Register connection
        await websocket_manager.connect(websocket, user_id, username)
        
        # Update online status
        async with AsyncSessionLocal() as db:
            await user_service.set_online_status(db, user_id, True)
        
        # Send auth success
        await websocket.send_json({
            "type": WebSocketMessageType.AUTH_SUCCESS,
            "data": {
                "user_id": user_id,
                "username": username
            }
        })
        
        logger.info(f"WebSocket authenticated for user {user_id}")
        
        # Main message loop
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            message_data = data.get("data", {})
            
            # Handle ping
            if message_type == WebSocketMessageType.PING:
                await websocket.send_json({
                    "type": WebSocketMessageType.PONG,
                    "data": {"timestamp": data.get("timestamp")}
                })
                continue
            
            # Handle new message
            if message_type == WebSocketMessageType.MESSAGE_NEW:
                channel_id = message_data.get("channel_id")
                content = message_data.get("content")
                
                if channel_id and content:
                    async with AsyncSessionLocal() as db:
                        msg_data = MessageCreate(content=content)
                        message = await message_service.create(db, msg_data, channel_id, user_id)
                        await db.refresh(message, ["author"])
                        
                        response = {
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
                        await websocket_manager.broadcast_to_channel(channel_id, response)
                continue
            
            # Handle channel join/leave
            if message_type == WebSocketMessageType.CHANNEL_JOIN:
                await websocket_manager.join_channel(user_id, message_data.get("channel_id"))
                continue
            
            if message_type == WebSocketMessageType.CHANNEL_LEAVE:
                await websocket_manager.leave_channel(user_id, message_data.get("channel_id"))
                continue
            
            # Handle WebRTC signaling
            if message_type == "signaling":
                signal_type = message_data.get("signal_type")
                channel_id = message_data.get("channel_id")
                target_user_id = message_data.get("target_user_id")
                signal_data = message_data.get("data")
                
                # Handle voice channel join/leave
                if signal_type == "join_voice":
                    await websocket_manager.join_voice_channel(user_id, channel_id, websocket)
                    continue
                
                if signal_type == "leave_voice":
                    await websocket_manager.leave_voice_channel(user_id, channel_id)
                    continue
                
                # Broadcast signaling
                response = {
                    "type": "signaling",
                    "signal_type": signal_type,
                    "channel_id": channel_id,
                    "from_user_id": user_id,
                    "from_username": username,
                    "data": signal_data
                }
                logger.info(f"[SIGNALING] {signal_type} from user {user_id} to target {target_user_id} in channel {channel_id}")
                await websocket_manager.broadcast_voice_signaling(
                    channel_id, response, exclude_user_id=user_id, target_user_id=target_user_id
                )
                continue
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")
    finally:
        if user_id:
            # Update offline status
            try:
                async with AsyncSessionLocal() as db:
                    await user_service.set_online_status(db, user_id, False)
            except:
                pass
            
            # Clean up connection
            try:
                await websocket_manager.disconnect(user_id)
            except:
                pass
