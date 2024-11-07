from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, init_db
from models import Base
from routers import auth, topics, entries, chat

app = FastAPI(title="Cognify API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        # Test database connection using text()
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
app.include_router(entries.router, prefix="/api/entries", tags=["entries"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

# Initialize database tables on startup
@app.on_event("startup")
async def startup_event():
    init_db()