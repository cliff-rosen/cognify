from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, init_db
from models import Base
from routers import auth, topics, entries, chat
import logging
import sys
from config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cognify API",
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "tryItOutEnabled": True,
        "defaultModelsExpandDepth": -1,
    }
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info("="*50)
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Auth header: {request.headers.get('authorization', 'No auth header')}")
    
    return await call_next(request)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
    expose_headers=["Authorization"],
)

# Include routers
logger.info("Including routers...")
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["auth"],
    responses={401: {"description": "Not authenticated"}}
)
app.include_router(
    topics.router,
    prefix="/api/topics",
    tags=["topics"],
    responses={401: {"description": "Not authenticated"}}
)
# app.include_router(
#     entries.router,
#     prefix="/api/entries",
#     tags=["entries"],
#     responses={401: {"description": "Not authenticated"}}
# )
# app.include_router(
#     chat.router,
#     prefix="/api/chat",
#     tags=["chat"],
#     responses={401: {"description": "Not authenticated"}}
# )
# logger.info("Routers included")


@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    init_db()
    logger.info("Database initialized")
    logger.info(f"Settings object: {settings}")
    logger.info(f"ACCESS_TOKEN_EXPIRE_MINUTES value: {settings.ACCESS_TOKEN_EXPIRE_MINUTES}")
    logger.info(f"Minutes calculation: {60 * 24 * 7}")



# Health and test endpoints
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test")
async def test_endpoint():
    logger.info("Test endpoint called")
    return {"status": "ok"}