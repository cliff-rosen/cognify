from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Entry, Topic
from schemas import EntryCreate
import logging

logger = logging.getLogger(__name__)

async def get_entries(db: Session, user_id: int, topic_id: int = None):
    """Get all entries for a user, optionally filtered by topic"""
    try:
        query = db.query(Entry).filter(Entry.user_id == user_id)
        if topic_id:
            # Verify the topic belongs to the user
            topic = db.query(Topic).filter(
                Topic.topic_id == topic_id,
                Topic.user_id == user_id
            ).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Topic not found or does not belong to user"
                )
            query = query.filter(Entry.topic_id == topic_id)
        entries = query.all()
        logger.info(f"Retrieved {len(entries)} entries for user {user_id}")
        return entries
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error retrieving entries: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve entries"
        )

async def create_entry(db: Session, entry: EntryCreate, user_id: int):
    """Create a new entry for a user"""
    try:
        # If topic_id is provided, verify it belongs to the user
        if entry.topic_id is not None:
            topic = db.query(Topic).filter(
                Topic.topic_id == entry.topic_id,
                Topic.user_id == user_id
            ).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Topic not found or does not belong to user"
                )

        db_entry = Entry(
            content=entry.content,
            topic_id=entry.topic_id,
            user_id=user_id
        )
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        logger.info(f"Created entry {db_entry.entry_id} for user {user_id}")
        return db_entry
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        logger.error(f"Error creating entry: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create entry"
        ) 