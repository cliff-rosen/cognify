from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from models import ChatMessage, ChatThread, Topic, Entry
from schemas import ChatMessageCreate, ChatMessageResponse, ChatThreadCreate, ChatThreadUpdate
from fastapi import HTTPException, status
from services import ai_service
from sqlalchemy import or_

logger = logging.getLogger(__name__)

################## Thread Management ##################

async def create_thread(
    db: Session,
    user_id: int,
    thread: ChatThreadCreate,
) -> ChatThread:
    """
    Creates a new chat thread.
    
    A thread represents a distinct conversation context, optionally associated
    with a specific topic. Threads help maintain conversation state and context.
    """
    # If topic_id is 0 or invalid, set it to None
    topic_id = thread.topic_id if thread.topic_id and thread.topic_id > 0 else None
    
    # If topic_id is provided, verify it exists and belongs to user
    if topic_id:
        topic = db.query(Topic).filter(
            Topic.topic_id == topic_id,
            Topic.user_id == user_id
        ).first()
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic not found or does not belong to user"
            )
    
    db_thread = ChatThread(
        user_id=user_id,
        topic_id=topic_id,  # Use the validated topic_id
        title=thread.title or "New Chat",
        created_at=datetime.utcnow(),
        last_message_at=datetime.utcnow(),
        status="active"
    )
    db.add(db_thread)
    db.commit()
    db.refresh(db_thread)
    return db_thread

async def get_user_threads(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = "active"
) -> List[ChatThread]:
    """
    Gets all chat threads for a user, with optional filtering and pagination.
    """
    query = db.query(ChatThread).filter(ChatThread.user_id == user_id)
    
    if status:
        query = query.filter(ChatThread.status == status)
        
    return (
        query.order_by(ChatThread.last_message_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

async def update_thread(
    db: Session,
    user_id: int,
    thread_id: int,
    updates: ChatThreadUpdate
) -> ChatThread:
    """Update thread properties"""
    thread = db.query(ChatThread).filter(
        ChatThread.thread_id == thread_id,
        ChatThread.user_id == user_id
    ).first()
    
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
    
    if updates.title is not None:
        thread.title = updates.title
    if updates.status is not None:
        thread.status = updates.status
    
    db.commit()
    db.refresh(thread)
    return thread

async def archive_thread(
    db: Session,
    user_id: int,
    thread_id: int
) -> None:
    """Archives a chat thread."""
    thread = db.query(ChatThread).filter(
        ChatThread.thread_id == thread_id,
        ChatThread.user_id == user_id
    ).first()
    
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found"
        )
        
    thread.status = "archived"
    db.commit()

################## Message Management ##################

async def create_chat_message(
    db: Session,
    user_id: int,
    message: ChatMessageCreate,
    thread_id: int,
) -> ChatMessageResponse:
    """Creates a new chat message within a thread."""
    db_message = ChatMessage(
        user_id=user_id,
        thread_id=thread_id,
        content=message.content,
        role=message.role,
        timestamp=datetime.utcnow()
    )
    db.add(db_message)
    
    # Update thread's last_message_at
    thread = db.query(ChatThread).filter(ChatThread.thread_id == thread_id).first()
    thread.last_message_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_message)
    
    return ChatMessageResponse.model_validate(db_message)

async def delete_message(
    db: Session,
    user_id: int,
    thread_id: int,
    message_id: int
) -> None:
    """Delete a user message from a thread"""
    message = db.query(ChatMessage).filter(
        ChatMessage.message_id == message_id,
        ChatMessage.thread_id == thread_id,
        ChatMessage.user_id == user_id,
        ChatMessage.role == "user"
    ).first()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or cannot be deleted"
        )
    
    db.delete(message)
    db.commit()

################## Thread & Message Search ##################

async def search_threads(
    db: Session,
    user_id: int,
    query: str,
    skip: int = 0,
    limit: int = 50
) -> List[ChatThread]:
    """Search through user's chat threads"""
    return (
        db.query(ChatThread)
        .join(ChatMessage, ChatThread.thread_id == ChatMessage.thread_id)
        .filter(
            ChatThread.user_id == user_id,
            or_(
                ChatThread.title.ilike(f"%{query}%"),
                ChatMessage.content.ilike(f"%{query}%")
            )
        )
        .distinct()
        .order_by(ChatThread.last_message_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

################## Helper Functions ##################

async def get_or_create_thread(
    db: Session,
    user_id: int,
    thread_id: Optional[int] = None,
    topic_id: Optional[int] = None
) -> ChatThread:
    """
    Gets an existing thread or creates a new one if needed.
    """
    if thread_id:
        thread = db.query(ChatThread).filter(
            ChatThread.thread_id == thread_id,
            ChatThread.user_id == user_id
        ).first()
        
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thread not found"
            )
            
        return thread
        
    # Create new thread
    return await create_thread(
        db=db,
        user_id=user_id,
        thread=ChatThreadCreate(
            topic_id=topic_id,
            title="New Chat"
        )
    )

async def get_conversation_context(
    db: Session,
    thread_id: int,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Retrieves recent conversation history for a thread."""
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit)
        .all()
    )
    
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp
        }
        for msg in reversed(messages)
    ]

################## AI Tools ##################

async def get_topic_tool(db: Session, user_id: int, topic_id: int) -> Dict[str, Any]:
    """Get details about a specific topic"""
    topic = db.query(Topic).filter(
        Topic.topic_id == topic_id,
        Topic.user_id == user_id
    ).first()
    
    if not topic:
        return {"error": "Topic not found"}
    
    return {
        "topic_id": topic.topic_id,
        "topic_name": topic.topic_name,
        "creation_date": topic.creation_date
    }

async def get_entries_tool(db: Session, user_id: int, topic_id: int, limit: int = 5) -> Dict[str, Any]:
    """Get recent entries for a specific topic"""
    entries = db.query(Entry).filter(
        Entry.topic_id == topic_id,
        Entry.user_id == user_id
    ).order_by(Entry.creation_date.desc()).limit(limit).all()
    
    return {
        "entries": [
            {
                "entry_id": entry.entry_id,
                "content": entry.content,
                "creation_date": entry.creation_date
            }
            for entry in entries
        ]
    }

async def search_entries_tool(db: Session, user_id: int, query: str) -> Dict[str, Any]:
    """Search through user's entries"""
    entries = db.query(Entry).filter(
        Entry.user_id == user_id,
        Entry.content.ilike(f"%{query}%")
    ).limit(5).all()
    
    return {
        "entries": [
            {
                "entry_id": entry.entry_id,
                "content": entry.content,
                "topic_id": entry.topic_id,
                "creation_date": entry.creation_date
            }
            for entry in entries
        ]
    }

async def get_topic_stats_tool(db: Session, user_id: int, topic_id: int) -> Dict[str, Any]:
    """Get statistics about a topic"""
    entry_count = db.query(Entry).filter(
        Entry.topic_id == topic_id,
        Entry.user_id == user_id
    ).count()
    
    latest_entry = db.query(Entry).filter(
        Entry.topic_id == topic_id,
        Entry.user_id == user_id
    ).order_by(Entry.creation_date.desc()).first()
    
    return {
        "entry_count": entry_count,
        "latest_entry_date": latest_entry.creation_date if latest_entry else None
    }

async def process_message(
    db: Session,
    user_id: int,
    message: ChatMessageCreate,
    thread_id: Optional[int] = None,
) -> ChatMessageResponse:
    """
    Processes a user message within a thread and generates an AI response.
    
    Args:
        db: Database session
        user_id: ID of the user sending the message
        message: The message to process
        thread_id: Optional thread ID (creates new thread if None)
        
    Returns:
        The AI's response message
    """
    # Get or create thread
    thread = await get_or_create_thread(
        db=db,
        user_id=user_id,
        thread_id=thread_id,
        topic_id=None  # topic_id is now only associated with thread, not message
    )
    
    # Store user message
    user_message = await create_chat_message(
        db=db,
        user_id=user_id,
        message=message,
        thread_id=thread.thread_id
    )
    
    # Get thread context including the new user message
    context = await get_conversation_context(
        db=db,
        thread_id=thread.thread_id
    )
    
    # Prepare tool context
    available_tools = {
        "get_topic": get_topic_tool.__doc__,
        "get_entries": get_entries_tool.__doc__,
        "search_entries": search_entries_tool.__doc__,
        "get_topic_stats": get_topic_stats_tool.__doc__,
    }
    
    # Get LLM's analysis and tool requests
    tool_requests = await ai_service.analyze_message(
        message=user_message.content,  # Use the stored message content
        context=context,
        available_tools=available_tools,
        thread_info={
            "thread_id": thread.thread_id,
            "topic_id": thread.topic_id,
            "title": thread.title
        }
    )
    
    # Execute requested tools
    tool_results = {}
    tools = {
        "get_topic": get_topic_tool,
        "get_entries": get_entries_tool,
        "search_entries": search_entries_tool,
        "get_topic_stats": get_topic_stats_tool,
    }
    
    for tool_name, tool_params in tool_requests.items():
        if tool_name in tools:
            try:
                tool_results[tool_name] = await tools[tool_name](
                    db=db,
                    user_id=user_id,
                    **tool_params
                )
            except Exception as e:
                logger.error(f"Tool {tool_name} failed: {str(e)}")
                tool_results[tool_name] = {"error": str(e)}
    
    # Generate AI response using stored message
    ai_response = await ai_service.generate_response(
        message=user_message.content,  # Use the stored message content
        context=context,
        tool_results=tool_results,
        thread_info={
            "thread_id": thread.thread_id,
            "topic_id": thread.topic_id,
            "title": thread.title
        }
    )
    
    # Store AI response
    response_message = await create_chat_message(
        db=db,
        user_id=user_id,
        message=ChatMessageCreate(
            content=ai_response,
            role="assistant"
        ),
        thread_id=thread.thread_id
    )
    
    return response_message