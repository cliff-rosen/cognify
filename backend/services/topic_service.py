from sqlalchemy.orm import Session
from models import Topic, Entry
from schemas import TopicCreate, TopicUpdate, TopicSearchResponse, TopicSuggestionResponse, ProposedEntry, ProposedTopic, AutoCategorizeResponse
from fastapi import HTTPException, status
from typing import Optional, List
import logging
from services import ai_service
from datetime import datetime
import random

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


async def suggest_topic_name(db: Session, text: str, user_id: int) -> dict:
    """
    Suggests a topic name based on the provided text using AI.
    Uses the AI service to generate a concise, relevant topic name.
    """
    try:
        # Use AI service to generate topic suggestion
        suggested_name = await ai_service.suggest_topic_name(text)
        
        # Ensure the suggestion isn't too long
        if len(suggested_name) > 50:
            suggested_name = suggested_name[:47] + "..."
            
        return {"suggested_name": suggested_name}
        
    except Exception as e:
        logger.error(f"Error suggesting topic name: {str(e)}")
        return {"suggested_name": "New Topic"}


async def get_topic_suggestions(db: Session, text: str, user_id: int) -> List[TopicSearchResponse]:
    try:
        results = []
        
        # 1. Get user's existing topics
        existing_topics = db.query(Topic).filter(Topic.user_id == user_id).all()
        existing_topic_names = [topic.topic_name.lower() for topic in existing_topics]
        
        # 2. Get AI suggestion considering existing topics
        suggested_name = await ai_service.suggest_topic_name_with_context(text, existing_topic_names)
        suggested_name_lower = suggested_name.lower() if suggested_name else ""
        
        # 3. Add AI suggestion only if valid and doesn't match existing topics
        if (suggested_name and 
            suggested_name != "New Topic" and 
            suggested_name_lower not in existing_topic_names):
            results.append(TopicSearchResponse(
                topic_id=-1,
                topic_name=suggested_name,
                user_id=user_id,
                creation_date=datetime.utcnow(),
                score=1.0,
                is_ai_suggested=True,
                is_new_topic=True
            ))

        # 4. Get and add similar existing topics
        similar_topics = await search_topics(db, text, user_id)
        results.extend(similar_topics)

        return results
        
    except Exception as e:
        logger.error(f"Error getting topic suggestions: {str(e)}")
        return []


async def analyze_categorization(
    db: Session, 
    user_id: int, 
    instructions: Optional[str] = None,
    topics_to_keep: List[int] = []
) -> AutoCategorizeResponse:
    try:
        logger.info(f"Starting analyze_categorization for user {user_id}")
        if instructions:
            logger.info(f"Instructions provided: {instructions}")
        if topics_to_keep:
            logger.info(f"Topics to keep: {topics_to_keep}")

        # Get all entries for the user
        entries = db.query(Entry).filter(Entry.user_id == user_id).all()
        logger.info(f"Found {len(entries)} total entries")

        # Get all existing topics
        existing_topics = db.query(Topic).filter(Topic.user_id == user_id).all()
        logger.info(f"Found {len(existing_topics)} existing topics")

        # Separate topics into keep and recategorize
        topics_to_keep_set = set(topics_to_keep)
        kept_topics = [topic for topic in existing_topics if topic.topic_id in topics_to_keep_set]
        other_topics = [topic for topic in existing_topics if topic.topic_id not in topics_to_keep_set]
        logger.info(f"Keeping {len(kept_topics)} topics, {len(other_topics)} topics available for recategorization")

        # Initialize proposed topics list with kept topics
        proposed_topics = [
            ProposedTopic(
                topic_id=topic.topic_id,
                topic_name=topic.topic_name,
                is_new=False,
                entries=[],
                confidence_score=1.0
            )
            for topic in kept_topics
        ]
        logger.info(f"Initialized {len(proposed_topics)} kept topics in proposal list")

        # First, handle entries in kept topics
        kept_entries = []
        for entry in entries:
            if entry.topic_id in topics_to_keep_set:
                kept_topic = next(t for t in proposed_topics if t.topic_id == entry.topic_id)
                proposed_entry = ProposedEntry(
                    entry_id=entry.entry_id,
                    content=entry.content,
                    current_topic_id=entry.topic_id,
                    proposed_topic_id=entry.topic_id,
                    creation_date=entry.creation_date,
                    confidence_score=1.0
                )
                kept_topic.entries.append(proposed_entry)
                kept_entries.append(entry.entry_id)
        logger.info(f"Kept {len(kept_entries)} entries in their original topics")

        # Create new topics only if we have entries to reassign
        remaining_entries = [e for e in entries if e.entry_id not in kept_entries]
        if remaining_entries:
            new_topic_names = ["AI and Machine Learning", "Web Development", "Personal Growth"]
            logger.info(f"Creating {len(new_topic_names)} new topics for {len(remaining_entries)} remaining entries")
            
            # Add new topics
            proposed_topics.extend([
                ProposedTopic(
                    topic_id=None,
                    topic_name=name,
                    is_new=True,
                    entries=[],
                    confidence_score=0.85
                )
                for name in new_topic_names
            ])

            # Randomly assign remaining entries to new topics
            new_topics = [t for t in proposed_topics if t.is_new]
            for entry in remaining_entries:
                proposed_topic = random.choice(new_topics)
                confidence_score = random.uniform(0.65, 0.98)
                
                logger.debug(f"Assigning entry {entry.entry_id} to new topic '{proposed_topic.topic_name}' "
                           f"(current_topic_id: {entry.topic_id}, "
                           f"confidence: {confidence_score:.2f})")
                
                proposed_entry = ProposedEntry(
                    entry_id=entry.entry_id,
                    content=entry.content,
                    current_topic_id=entry.topic_id,
                    proposed_topic_id=proposed_topic.topic_id,
                    creation_date=entry.creation_date,
                    confidence_score=confidence_score
                )
                
                proposed_topic.entries.append(proposed_entry)

        # Filter out topics with no entries
        # original_topic_count = len(proposed_topics)
        # proposed_topics = [topic for topic in proposed_topics if topic.entries]
        # logger.info(f"Filtered out {original_topic_count - len(proposed_topics)} empty topics")

        # Set topic confidence scores based on average entry confidence
        for topic in proposed_topics:
            if topic.entries and topic.is_new:  # Only calculate for new topics
                topic.confidence_score = sum(e.confidence_score for e in topic.entries) / len(topic.entries)
                logger.debug(f"Topic '{topic.topic_name}' confidence score: {topic.confidence_score:.2f} "
                           f"(based on {len(topic.entries)} entries)")

        logger.info("Analysis complete. Returning results with "
                   f"{len(proposed_topics)} topics containing entries")

        return AutoCategorizeResponse(
            proposed_topics=proposed_topics,
            uncategorized_entries=[],
            instructions_used=instructions
        )

    except Exception as e:
        logger.error(f"Error in analyze_categorization: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze categorization"
        )
