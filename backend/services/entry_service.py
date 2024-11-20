from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import Entry, Topic
from schemas import EntryCreate, EntryUpdate
import logging

logger = logging.getLogger(__name__)

async def get_entries(db: Session, user_id: int, topic_id: int = None):
    """Get all entries for a user, optionally filtered by topic"""
    try:
        query = db.query(Entry).filter(Entry.user_id == user_id)
        if topic_id is not None:
            if topic_id == -1:
                query = query.filter(Entry.topic_id.is_(None))
            else:
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

async def update_entry(db: Session, entry_id: int, entry_update: EntryUpdate, user_id: int):
    """Update an entry if it belongs to the user"""
    try:
        # Get existing entry
        db_entry = db.query(Entry).filter(Entry.entry_id == entry_id).first()
        if not db_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entry not found"
            )
            
        # Verify ownership
        if db_entry.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Entry belongs to another user"
            )
            
        # Handle topic_id update
        if hasattr(entry_update, 'topic_id'):  # Check if topic_id is included in update
            # If topic_id is None, it means move to uncategorized
            if entry_update.topic_id is not None:
                # Verify the new topic exists and belongs to the user
                topic = db.query(Topic).filter(
                    Topic.topic_id == entry_update.topic_id,
                    Topic.user_id == user_id
                ).first()
                if not topic:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Target topic not found or does not belong to user"
                    )
            
            # Update topic_id (can be None for uncategorized)
            db_entry.topic_id = entry_update.topic_id
            logger.info(f"Moved entry {entry_id} to topic {entry_update.topic_id if entry_update.topic_id is not None else 'uncategorized'}")
            
        # Update content if provided
        if hasattr(entry_update, 'content') and entry_update.content is not None:
            db_entry.content = entry_update.content
            logger.info(f"Updated content for entry {entry_id}")
            
        db.commit()
        db.refresh(db_entry)
        return db_entry
        
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        logger.error(f"Error updating entry: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update entry"
        )

async def get_entry_by_id(db: Session, entry_id: int, user_id: int):
    """Get a single entry by ID if it belongs to the user"""
    try:
        entry = db.query(Entry).filter(Entry.entry_id == entry_id).first()
        if not entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entry not found"
            )
            
        # Verify ownership
        if entry.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Entry belongs to another user"
            )
            
        logger.info(f"Retrieved entry {entry_id} for user {user_id}")
        return entry
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error retrieving entry: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve entry"
        )

async def delete_entry(db: Session, entry_id: int, user_id: int):
    """Delete an entry if it belongs to the user"""
    try:
        # Get existing entry
        db_entry = db.query(Entry).filter(Entry.entry_id == entry_id).first()
        if not db_entry:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Entry not found"
            )
            
        # Verify ownership
        if db_entry.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Entry belongs to another user"
            )
            
        # Delete the entry
        db.delete(db_entry)
        db.commit()
        
        logger.info(f"Deleted entry {entry_id} for user {user_id}")
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error deleting entry: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete entry"
        )
