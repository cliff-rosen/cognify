from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from schemas import (
    ChatMessageCreate, 
    ChatMessageResponse, 
    ChatMessageList,
    ChatThreadCreate,
    ChatThreadResponse
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
    skip: int = 0,
    limit: int = 50,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Get user's chat threads with optional filtering and pagination.
    
    Parameters:
    - **status**: Filter by thread status ("active" or "archived")
    - **skip**: Number of threads to skip (for pagination)
    - **limit**: Maximum number of threads to return
    """
    logger.info(f"get_threads called by user {current_user.user_id}")
    return await chat_service.get_user_threads(
        db=db,
        user_id=current_user.user_id,
        skip=skip,
        limit=limit,
        status=status
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
        200: {
            "description": "Messages successfully retrieved",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "message_id": 1,
                                "thread_id": 1,
                                "user_id": 123,
                                "topic_id": 1,
                                "message_text": "Tell me about my Machine Learning entries.",
                                "message_type": "user",
                                "timestamp": "2024-03-13T12:00:00Z"
                            },
                            {
                                "message_id": 2,
                                "thread_id": 1,
                                "user_id": 123,
                                "topic_id": 1,
                                "message_text": "Here's what I found...",
                                "message_type": "assistant",
                                "timestamp": "2024-03-13T12:00:01Z"
                            }
                        ],
                        "total": 2
                    }
                }
            }
        },
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
    messages = await chat_service.get_thread_messages(
        db=db,
        user_id=current_user.user_id,
        thread_id=thread_id,
        skip=skip,
        limit=limit
    )
    
    total = await chat_service.get_thread_message_count(
        db=db,
        thread_id=thread_id
    )
    
    return ChatMessageList(
        items=messages,
        total=total
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