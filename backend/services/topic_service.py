from sqlalchemy.orm import Session
from models import Topic, Entry
from schemas import TopicCreate, TopicUpdate, TopicSearchResponse
from fastapi import HTTPException, status
from typing import Optional, List
import logging
from services import ai_service

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


def calculate_topic_match_score(topic_name: str, query: str) -> float:
    """
    Calculate how well a topic name matches a search query using AI.
    
    Args:
        topic_name: The name of the topic to check
        query: The search query to match against
        
    Returns:
        float: Score indicating how well the topic matches (0-1)
    """
    try:
        return ai_service.calculate_similarity_score(topic_name, query)
    except Exception as e:
        logger.error(f"Error calculating topic match score: {str(e)}")
        return 0.0


async def search_topics(db: Session, query: str, user_id: int) -> List[TopicSearchResponse]:
    """
    Search topics based on a query string and return them sorted by match score
    
    Args:
        db: Database session
        query: Search string to match against topic names
        user_id: ID of the user whose topics to search
        
    Returns:
        List of topics with match scores, sorted by score descending
    """
    # Get all topics for the user
    topics = db.query(Topic).filter(Topic.user_id == user_id).all()
    
    if not topics:
        return []
    
    # Get all topic names
    topic_names = [topic.topic_name for topic in topics]
    
    # Get scores for all topics in one call
    scores = ai_service.calculate_similarity_scores(topic_names, query)
    
    # Pair topics with their scores
    scored_topics = list(zip(topics, scores))
    
    # Sort by score descending
    scored_topics.sort(key=lambda x: x[1], reverse=True)
    
    # Convert to response objects
    return [
        TopicSearchResponse(
            topic_id=topic.topic_id,
            topic_name=topic.topic_name,
            user_id=topic.user_id,
            creation_date=topic.creation_date,
            score=score
        )
        for topic, score in scored_topics
    ]


async def delete_topic(db: Session, topic_id: int, user_id: int):
    """Delete a topic and all its associated entries if it belongs to the user"""
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
            
        # Delete associated entries first
        db.query(Entry).filter(Entry.topic_id == topic_id).delete()
        
        # Delete the topic
        db.delete(db_topic)
        db.commit()
        
        logger.info(f"Deleted topic {topic_id} and its entries for user {user_id}")
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting topic: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete topic"
        )
