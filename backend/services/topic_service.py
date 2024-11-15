from sqlalchemy.orm import Session
from models import Topic
from schemas import TopicCreate, TopicUpdate
from fastapi import HTTPException, status
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def get_topics(db: Session, user_id: int):
    return db.query(Topic).filter(Topic.user_id == user_id).all()


async def create_topic(db: Session, topic: TopicCreate, user_id: int):
    db_topic = Topic(topic_name=topic.topic_name, user_id=user_id)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic 


async def update_topic(db: Session, topic_id: int, topic_update: TopicUpdate, user_id: int):
    """Update a topic if it belongs to the user"""
    try:
        # Get existing topic
        db_topic = db.query(Topic).filter(Topic.topic_id == topic_id).first()
        if not db_topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found"
            )
            
        # Verify ownership
        if db_topic.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Topic belongs to another user"
            )
            
        # Update only if new value provided (PATCH behavior)
        if topic_update.topic_name is not None:
            db_topic.topic_name = topic_update.topic_name
            
        db.commit()
        db.refresh(db_topic)
        logger.info(f"Updated topic {topic_id} for user {user_id}")
        return db_topic
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error updating topic: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update topic"
        )
