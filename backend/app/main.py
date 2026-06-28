"""Main FastAPI application."""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import get_settings
from app.core.logging import logger
from app.db.base import init_db
from app.api.routes import api_router
from app.websocket.router import router as websocket_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Starting up Discord Clone API...")
    await init_db()
    
    # Seed default channels
    try:
        from app.db.base import AsyncSessionLocal
        from app.services.channel_service import channel_service
        from app.models.channel import ChannelType
        from app.schemas.channel import ChannelCreate
        from sqlalchemy import select
        from app.models.channel import Channel
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Channel))
            if not result.scalars().first():
                logger.info("Creating default channels...")
                channels = [
                    ("general", ChannelType.TEXT, "General discussion"),
                    ("random", ChannelType.TEXT, "Random chat"),
                    ("announcements", ChannelType.TEXT, "Important announcements"),
                    ("General Voice", ChannelType.VOICE, "General voice chat"),
                    ("Gaming", ChannelType.VOICE, "Gaming voice chat"),
                    ("Music", ChannelType.VOICE, "Listen to music together"),
                ]
                for name, type_, desc in channels:
                    try:
                        await channel_service.create(
                            db, 
                            ChannelCreate(name=name, type=type_, description=desc), 
                            created_by=1
                        )
                    except Exception as e:
                        logger.warning(f"Failed to create channel {name}: {e}")
                logger.info("Default channels created!")
    except Exception as e:
        logger.error(f"Failed to seed channels: {e}")
    
    yield
    # Shutdown
    logger.info("Shutting down Discord Clone API...")


def create_application() -> FastAPI:
    """Application factory."""
    settings = get_settings()
    
    app = FastAPI(
        title=settings.APP_NAME,
        description="A minimal Discord-like real-time communication API",
        version="1.0.0",
        debug=settings.DEBUG,
        lifespan=lifespan
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Include API routers
    app.include_router(api_router, prefix="/api/v1")
    app.include_router(websocket_router)
    
    # Health check (before static files)
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {"status": "healthy", "service": settings.APP_NAME}
    
    # API root info
    @app.get("/api")
    async def api_root():
        """API root endpoint."""
        return {
            "name": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs"
        }
    
    # Serve static files (frontend)
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if os.path.exists(static_dir) and os.path.isdir(static_dir):
        # Serve static assets
        app.mount("/assets", StaticFiles(directory=os.path.join(static_dir, "assets")), name="assets")
        
        # Serve root files (vite.svg, etc.)
        @app.get("/{file_path:path}")
        async def serve_spa(file_path: str):
            """Serve frontend SPA or static files."""
            # Don't intercept API/WebSocket paths
            if file_path.startswith(("api", "ws", "docs", "openapi.json")):
                return {"detail": "Not Found"}
            
            # Try to serve specific file
            full_path = os.path.join(static_dir, file_path)
            if os.path.exists(full_path) and os.path.isfile(full_path):
                return FileResponse(full_path)
            
            # Fallback to index.html for SPA routing
            index_path = os.path.join(static_dir, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
            
            # No frontend built, return API info
            return {
                "name": settings.APP_NAME,
                "version": "1.0.0",
                "message": "Frontend not built. API is running.",
                "docs": "/docs"
            }
    else:
        # No static files, serve API info at root
        @app.get("/")
        async def root():
            """Root endpoint."""
            return {
                "name": settings.APP_NAME,
                "version": "1.0.0",
                "message": "Frontend not built. API is running.",
                "docs": "/docs"
            }
    
    return app


# Create application instance
app = create_application()
