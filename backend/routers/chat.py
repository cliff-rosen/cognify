from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from database import get_db
from schemas import (
    ChatMessageCreate, 
    ChatMessageResponse, 
    ChatMessageList,
    ChatThreadCreate,
    ChatThreadResponse,
    ChatThreadUpdate
)
from dependencies import CurrentUser
from services import chat_service, auth_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/threads",
    response_model=ChatThreadResponse,
    summary="Create a new chat thread",
    responses={
        200: {
            "description": "Thread successfully created",
            "content": {
                "application/json": {
                    "example": {
                        "thread_id": 1,
                        "user_id": 123,
                        "topic_id": 1,
                        "title": "Machine Learning Discussion",
                        "created_at": "2024-03-13T12:00:00Z",
                        "last_message_at": "2024-03-13T12:00:00Z",
                        "status": "active"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        422: {"description": "Validation error"}
    }
)
async def create_thread(
    thread: ChatThreadCreate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Create a new chat thread.
    
    Parameters:
    - **topic_id**: Optional topic ID to associate with the thread
    - **title**: Optional thread title (defaults to "New Chat")
    """
    logger.info(f"create_thread called by user {current_user.user_id}")
    return await chat_service.create_thread(
        db=db,
        user_id=current_user.user_id,
        thread=thread
    )

@router.get(
    "/threads",
    response_model=List[ChatThreadResponse],
    summary="Get user's chat threads",
    responses={
        200: {
            "description": "Chat threads successfully retrieved",
            "content": {
                "application/json": {
                    "example": [{
                        "thread_id": 1,
                        "user_id": 123,
                        "topic_id": 1,
                        "title": "Machine Learning Discussion",
                        "created_at": "2024-03-13T12:00:00Z",
                        "last_message_at": "2024-03-13T12:00:00Z",
                        "status": "active"
                    }]
                }
            }
        },
        401: {"description": "Not authenticated"}
    }
)
async def get_threads(
    status: Optional[str] = "active",
    topic_id: Optional[Union[int, str]] = None,
    skip: int = 0,
    limit: int = 50,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Get user's chat threads with optional filtering and pagination.
    
    Parameters:
    - **status**: Filter by thread status ("active" or "archived")
    - **topic_id**: Filter by topic ID (all topics if null or 0, uncategorized if None, specific topic if number)
    - **skip**: Number of threads to skip (for pagination)
    - **limit**: Maximum number of threads to return
    """
    logger.info(f"get_threads called by user {current_user.user_id} with topic_id: {topic_id}")
    # Convert topic_id to the right type
    parsed_topic_id = 0
    if topic_id:
        if topic_id.lower() == 'null':
            parsed_topic_id = None  # All topics
        else:
            try:
                parsed_topic_id = int(topic_id)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid topic_id format"
                )
    logger.info(f"Parsed topic_id: {parsed_topic_id}")

    return await chat_service.get_user_threads(
        db=db,
        user_id=current_user.user_id,
        skip=skip,
        limit=limit,
        status=status,
        topic_id=parsed_topic_id
    )

@router.post(
    "/threads/{thread_id}/messages",
    response_model=ChatMessageResponse,
    summary="Send a message in a thread",
    responses={
        200: {
            "description": "Message sent and response received",
            "content": {
                "application/json": {
                    "example": {
                        "message_id": 1,
                        "thread_id": 1,
                        "user_id": 123,
                        "topic_id": 1,
                        "message_text": "Here's what I found about your Machine Learning entries...",
                        "message_type": "assistant",
                        "timestamp": "2024-03-13T12:00:01Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Thread belongs to another user"},
        404: {"description": "Thread not found"},
        422: {"description": "Validation error"}
    }
)
async def send_message(
    thread_id: int,
    message: ChatMessageCreate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Send a message in a specific thread and get AI response.
    
    Parameters:
    - **thread_id**: ID of the thread to send message in
    - **message_text**: The message content
    - **topic_id**: Optional topic ID for context
    """
    logger.info(f"send_message called for thread {thread_id} by user {current_user.user_id}")
    return await chat_service.process_message(
        db=db,
        user_id=current_user.user_id,
        message=message,
        thread_id=thread_id
    )

@router.post(
    "/messages",
    response_model=ChatMessageResponse,
    summary="Send a message in a new or existing thread",
    responses={
        200: {
            "description": "Message sent and response received",
            "content": {
                "application/json": {
                    "example": {
                        "message_id": 1,
                        "thread_id": 1,
                        "user_id": 123,
                        "topic_id": 1,
                        "message_text": "Here's what I found about your Machine Learning entries...",
                        "message_type": "assistant",
                        "timestamp": "2024-03-13T12:00:01Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        422: {"description": "Validation error"}
    }
)
async def send_message_new_thread(
    message: ChatMessageCreate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Send a message, automatically creating a new thread if needed.
    
    Parameters:
    - **message_text**: The message content
    - **topic_id**: Optional topic ID for context
    """
    logger.info(f"send_message_new_thread called by user {current_user.user_id}")
    return await chat_service.process_message(
        db=db,
        user_id=current_user.user_id,
        message=message,
        thread_id=None  # New thread will be created
    )

@router.get(
    "/threads/{thread_id}/messages",
    response_model=ChatMessageList,
    summary="Get messages in a thread",
    responses={
        200: {"description": "Messages successfully retrieved"},
        401: {"description": "Not authenticated"},
        403: {"description": "Thread belongs to another user"},
        404: {"description": "Thread not found"}
    }
)
async def get_thread_messages(
    thread_id: int,
    skip: int = 0,
    limit: int = 50,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Get messages from a specific thread.
    
    Parameters:
    - **thread_id**: ID of the thread to get messages from
    - **skip**: Number of messages to skip (for pagination)
    - **limit**: Maximum number of messages to return
    """
    logger.info(f"get_thread_messages called for thread {thread_id}")
    return await chat_service.get_thread_messages(
        db=db,
        user_id=current_user.user_id,
        thread_id=thread_id,
        params={"skip": skip, "limit": limit}
    )

@router.patch(
    "/threads/{thread_id}/archive",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Archive a chat thread",
    responses={
        204: {"description": "Thread successfully archived"},
        401: {"description": "Not authenticated"},
        403: {"description": "Thread belongs to another user"},
        404: {"description": "Thread not found"}
    }
)
async def archive_thread(
    thread_id: int,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Archive a chat thread.
    
    Parameters:
    - **thread_id**: ID of the thread to archive
    """
    logger.info(f"archive_thread called for thread {thread_id}")
    await chat_service.archive_thread(
        db=db,
        user_id=current_user.user_id,
        thread_id=thread_id
    )
    return None

@router.patch(
    "/threads/{thread_id}",
    response_model=ChatThreadResponse,
    summary="Update thread title or status",
    responses={
        200: {"description": "Thread successfully updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Thread belongs to another user"},
        404: {"description": "Thread not found"}
    }
)
async def update_thread(
    thread_id: int,
    updates: ChatThreadUpdate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Update thread properties like title or status.
    
    Parameters:
    - **thread_id**: ID of the thread to update
    - **title**: Optional new title for the thread
    - **status**: Optional new status (active/archived)
    """
    return await chat_service.update_thread(
        db=db,
        user_id=current_user.user_id,
        thread_id=thread_id,
        updates=updates
    )

@router.delete(
    "/threads/{thread_id}/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a message",
    responses={
        204: {"description": "Message successfully deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Message belongs to another user"},
        404: {"description": "Message not found"}
    }
)
async def delete_message(
    thread_id: int,
    message_id: int,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Delete a specific message from a thread.
    Only user messages can be deleted.
    
    Parameters:
    - **thread_id**: ID of the thread containing the message
    - **message_id**: ID of the message to delete
    """
    await chat_service.delete_message(
        db=db,
        user_id=current_user.user_id,
        thread_id=thread_id,
        message_id=message_id
    )
    return None

@router.get(
    "/threads/search",
    response_model=List[ChatThreadResponse],
    summary="Search chat threads",
    responses={
        200: {"description": "Search results retrieved"},
        401: {"description": "Not authenticated"}
    }
)
async def search_threads(
    query: str,
    skip: int = 0,
    limit: int = 50,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Search through chat threads by title or content.
    
    Parameters:
    - **query**: Search term
    - **skip**: Number of results to skip
    - **limit**: Maximum number of results to return
    """
    return await chat_service.search_threads(
        db=db,
        user_id=current_user.user_id,
        query=query,
        skip=skip,
        limit=limit
    )