from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import TopicResponse
from dependencies import CurrentUser
from models import Topic
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/",
    response_model=List[TopicResponse],
    summary="Get all topics for the current user"
)
async def get_topics(
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """Get all topics for the authenticated user"""
    logger.info("get_topics endpoint called")
    
    topics = db.query(Topic).filter(Topic.user_id == current_user.user_id).all()  # Use .id instead of ["user_id"]
    logger.info(f"Found {len(topics)} topics")
    return topics