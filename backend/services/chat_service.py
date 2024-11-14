from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from models import ChatMessage, Topic
from schemas import ChatMessageCreate
import logging

logger = logging.getLogger(__name__)

async def get_chat_messages(db: Session, user_id: int, topic_id: int = None):
    """Get all chat messages for a user, optionally filtered by topic"""
    try:
        query = db.query(ChatMessage).filter(ChatMessage.user_id == user_id)
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
            query = query.filter(ChatMessage.topic_id == topic_id)
        
        messages = query.order_by(ChatMessage.timestamp.desc()).all()
        logger.info(f"Retrieved {len(messages)} messages for user {user_id}")
        return messages
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error retrieving chat messages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat messages"
        )

async def create_chat_message(db: Session, message: ChatMessageCreate, user_id: int):
    """Create a new chat message for a user"""
    try:
        # If topic_id is provided, verify it belongs to the user
        if message.topic_id is not None:
            topic = db.query(Topic).filter(
                Topic.topic_id == message.topic_id,
                Topic.user_id == user_id
            ).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Topic not found or does not belong to user"
                )

        db_message = ChatMessage(
            message_text=message.message_text,
            topic_id=message.topic_id,
            user_id=user_id,
            message_type=message.message_type
        )
        db.add(db_message)
        db.commit()
        db.refresh(db_message)
        logger.info(f"Created chat message {db_message.message_id} for user {user_id}")
        return db_message
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        logger.error(f"Error creating chat message: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create chat message"
        ) 