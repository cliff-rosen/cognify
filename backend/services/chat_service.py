from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
import logging
from models import ChatMessage, ChatThread, Topic, Entry, ALL_TOPICS
from schemas import ChatMessageCreate, ChatMessageResponse, ChatThreadCreate, ChatThreadUpdate, ChatMessageList
from fastapi import HTTPException, status
from services import ai_service
from sqlalchemy import or_
import json

logger = logging.getLogger(__name__)

def serialize_datetime(obj):
    """Convert datetime objects to ISO format strings for JSON serialization"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f'Type {type(obj)} not serializable')

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
    
    topic_id can be:
    - -1: All topics (dashboard view)
    - null: No topics (uncategorized)
    - number > 0: Specific topic
    """
    # Handle topic_id cases
    topic_id = ALL_TOPICS  # Default to all topics view
    if hasattr(thread, 'topic_id'):  # Only process if topic_id was specified in request
        if thread.topic_id == 0 or thread.topic_id is None:  # Explicitly set to null = uncategorized
            topic_id = None
        elif thread.topic_id > 0:  # Specific topic
            # Verify topic exists and belongs to user
            topic = db.query(Topic).filter(
                Topic.topic_id == thread.topic_id,
                Topic.user_id == user_id
            ).first()
            if not topic:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Topic not found or does not belong to user"
                )
            topic_id = thread.topic_id
    
    db_thread = ChatThread(
        user_id=user_id,
        topic_id=topic_id,  # Will be -1 for all topics, null for uncategorized
        title=thread.title or "Untitled Chat",
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
    status: str = "active",
    topic_id: Optional[Union[int, str]] = None
) -> List[ChatThread]:
    """
    Gets all chat threads for a user, with optional filtering and pagination.
    Topic_id can be:
    - None/null: Get uncategorized threads (topic_id IS NULL)
    - ALL_TOPICS (-1): Get threads from all topics view
    - number > 0: Get threads for specific topic
    """
    query = db.query(ChatThread).filter(ChatThread.user_id == user_id)
    
    if status:
        query = query.filter(ChatThread.status == status)
    
    # Handle topic filtering
    if topic_id in (None, "null", 0):  # Uncategorized threads
        query = query.filter(ChatThread.topic_id.is_(None))
    elif topic_id == ALL_TOPICS:  # All topics view
        query = query.filter(ChatThread.topic_id == ALL_TOPICS)
    else:  # Specific topic ID
        query = query.filter(ChatThread.topic_id == topic_id)
    
    query = query.order_by(ChatThread.last_message_at.desc())
    return query.offset(skip).limit(limit).all()

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
    """
    Archives a chat thread.
    Only allows users to archive their own threads.
    """
    thread = db.query(ChatThread).filter(
        ChatThread.thread_id == thread_id,
        ChatThread.user_id == user_id
    ).first()
    
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found or does not belong to user"
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
    """Gets an existing thread or creates a new one if needed."""
    logger.info(f"get_or_create_thread called with thread_id={thread_id}, user_id={user_id}, topic_id={topic_id}")
    
    if thread_id:
        thread = db.query(ChatThread).filter(
            ChatThread.thread_id == thread_id,
            ChatThread.user_id == user_id
        ).first()
        
        if not thread:
            logger.error(f"Thread {thread_id} not found for user {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thread not found"
            )
            
        logger.info(f"Found existing thread: {thread.__dict__}")
        return thread
        
    # Create new thread
    thread = await create_thread(
        db=db,
        user_id=user_id,
        thread=ChatThreadCreate(
            topic_id=topic_id,
            title="New Chat"
        )
    )
    logger.info(f"Created new thread: {thread.__dict__}")
    return thread

async def get_conversation_context(
    db: Session,
    thread_id: int,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Retrieves recent conversation history for a thread."""
    logger.info(f"Getting conversation context for thread {thread_id}, limit={limit}")
    
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit)
        .all()
    )
    
    context = [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": serialize_datetime(msg.timestamp)
        }
        for msg in reversed(messages)
    ]
    
    logger.info(f"Retrieved {len(context)} context messages for thread {thread_id}")
    logger.debug(f"Context messages: {json.dumps(context, indent=2)}")
    
    return context

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
    logger.info(f"Searching entries for user {user_id} (temporary: returning all entries)")
    
    # Temporarily return all entries instead of searching
    entries = db.query(Entry).filter(
        Entry.user_id == user_id
    ).order_by(Entry.creation_date.desc()).all()
    
    result = {
        "entries": [
            {
                "entry_id": entry.entry_id,
                "content": entry.content,
                "topic_id": entry.topic_id,
                "creation_date": entry.creation_date.isoformat() if entry.creation_date else None,  # Convert datetime to ISO string
                "topic_name": entry.topic.topic_name if entry.topic else None
            }
            for entry in entries
        ]
    }
    
    logger.info(f"Retrieved {len(result['entries'])} entries")
    logger.debug(f"Entry preview: {[e['content'][:100] + '...' for e in result['entries']]}")
    
    return result

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

async def get_all_topics_tool(db: Session, user_id: int) -> Dict[str, Any]:
    """Get all topics for the user with their statistics"""
    topics = db.query(Topic).filter(
        Topic.user_id == user_id
    ).order_by(Topic.creation_date.desc()).all()
    
    result = {
        "topics": []
    }
    
    for topic in topics:
        # Get entry count for this topic
        entry_count = db.query(Entry).filter(
            Entry.topic_id == topic.topic_id,
            Entry.user_id == user_id
        ).count()
        
        # Get latest entry
        latest_entry = db.query(Entry).filter(
            Entry.topic_id == topic.topic_id,
            Entry.user_id == user_id
        ).order_by(Entry.creation_date.desc()).first()
        
        result["topics"].append({
            "topic_id": topic.topic_id,
            "topic_name": topic.topic_name,
            "creation_date": topic.creation_date.isoformat() if topic.creation_date else None,
            "entry_count": entry_count,
            "latest_entry_date": latest_entry.creation_date.isoformat() if latest_entry else None,
            "latest_entry_preview": latest_entry.content[:100] if latest_entry else None
        })
    
    logger.info(f"Retrieved {len(result['topics'])} topics for user {user_id}")
    logger.debug(f"Topics: {json.dumps(result, indent=2)}")
    
    return result

async def process_message(
    db: Session,
    user_id: int,
    message: ChatMessageCreate,
    thread_id: Optional[int] = None,
) -> ChatMessageResponse:
    """
    Processes a user message within a thread and generates an AI response.
    """
    logger.info(f"Processing message for user {user_id} | Thread: {thread_id or 'new'}")
    try:
        # Get or create thread
        thread = await get_or_create_thread(
            db=db,
            user_id=user_id,
            thread_id=thread_id,
            topic_id=None
        )
        logger.info(f"Using thread: {thread.__dict__}")
        
        # Store user message
        user_message = await create_chat_message(
            db=db,
            user_id=user_id,
            message=message,
            thread_id=thread.thread_id
        )
        logger.info(f"Stored user message: {user_message.__dict__}")
        
        # Get thread context
        context = await get_conversation_context(
            db=db,
            thread_id=thread.thread_id
        )
        logger.info(f"Retrieved {len(context)} context messages: {[msg['content'][:50] + '...' for msg in context]}")
        
        # Prepare tool context and available tools with their parameters
        available_tools = {
            "get_topic": {
                "description": get_topic_tool.__doc__,
                "required_params": ["topic_id"]
            },
            "get_entries": {
                "description": get_entries_tool.__doc__,
                "required_params": ["topic_id"],
                "optional_params": ["limit"]
            },
            "search_entries": {
                "description": search_entries_tool.__doc__,
                "required_params": ["query"]
            },
            "get_topic_stats": {
                "description": get_topic_stats_tool.__doc__,
                "required_params": ["topic_id"]
            },
            "get_all_topics": {
                "description": get_all_topics_tool.__doc__,
                "required_params": []
            }
        }
        logger.debug(f"Available tools: {json.dumps(available_tools, indent=2)}")
        
        # Get LLM's analysis and tool requests
        logger.info("Analyzing message with AI service...")
        tool_requests = await ai_service.analyze_message(
            message=user_message.content,
            context=context,
            available_tools={name: info["description"] for name, info in available_tools.items()},
            thread_info={
                "thread_id": thread.thread_id,
                "topic_id": thread.topic_id,
                "title": thread.title
            }
        )
        logger.info(f"AI requested tools: {json.dumps(tool_requests, indent=2)}")
        
        # Execute requested tools with parameter validation
        tool_results = {}
        tools = {
            "get_topic": get_topic_tool,
            "get_entries": get_entries_tool,
            "search_entries": search_entries_tool,
            "get_topic_stats": get_topic_stats_tool,
            "get_all_topics": get_all_topics_tool,
        }
        
        for tool_name, tool_params in tool_requests.items():
            if tool_name not in tools:
                logger.warning(f"Unknown tool requested: {tool_name}")
                continue
                
            try:
                # Validate required parameters
                tool_info = available_tools[tool_name]
                missing_params = [
                    param for param in tool_info["required_params"] 
                    if param not in tool_params
                ]
                
                if missing_params:
                    logger.error(f"Tool {tool_name} missing required parameters: {missing_params}")
                    tool_results[tool_name] = {
                        "error": f"Missing required parameters: {', '.join(missing_params)}"
                    }
                    continue
                
                # Remove any unexpected parameters
                valid_params = set(tool_info.get("required_params", []) + 
                                tool_info.get("optional_params", []))
                filtered_params = {
                    k: v for k, v in tool_params.items() 
                    if k in valid_params
                }
                
                logger.info(f"Executing tool {tool_name} with params: {json.dumps(filtered_params, default=serialize_datetime)}")
                result = await tools[tool_name](
                    db=db,
                    user_id=user_id,
                    **filtered_params
                )
                logger.info(f"Tool {tool_name} result: {json.dumps(result, indent=2, default=serialize_datetime)}")
                tool_results[tool_name] = result
                
            except Exception as e:
                logger.error(
                    f"Tool {tool_name} failed: {str(e)}", 
                    exc_info=True,
                    extra={
                        "tool_name": tool_name,
                        "params": tool_params
                    }
                )
                tool_results[tool_name] = {"error": str(e)}
        
        # Before generating AI response, serialize the thread info
        thread_info = {
            "thread_id": thread.thread_id,
            "topic_id": thread.topic_id,
            "title": thread.title,
            "created_at": serialize_datetime(thread.created_at),
            "last_message_at": serialize_datetime(thread.last_message_at)
        }
        
        # Generate AI response
        logger.info("Generating AI response...")
        ai_response = await ai_service.generate_response(
            message=user_message.content,
            context=context,
            tool_results=tool_results,
            thread_info=thread_info
        )
        logger.info(f"AI response generated ({len(ai_response)} chars): {ai_response[:200]}...")
        
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
        logger.info(f"Stored AI response as message: {response_message.__dict__}")
        
        logger.info(f"Message processing complete for thread {thread.thread_id}")
        return response_message
        
    except Exception as e:
        logger.error(
            f"Error processing message for user {user_id}: {str(e)}", 
            exc_info=True,
            extra={
                "user_id": user_id,
                "thread_id": thread_id,
                "message_preview": message.content[:100],
                "stack_trace": True
            }
        )
        raise

async def get_thread_messages(
    db: Session,
    user_id: int,
    thread_id: int,
    params: Dict[str, int] = {}
) -> ChatMessageList:
    """Get messages from a specific thread with pagination."""
    # First verify the thread belongs to the user
    thread = db.query(ChatThread).filter(
        ChatThread.thread_id == thread_id,
        ChatThread.user_id == user_id
    ).first()
    
    if not thread:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thread not found or does not belong to user"
        )

    skip = params.get('skip', 0)
    limit = params.get('limit', 50)

    # Get total count
    total = db.query(ChatMessage).filter(
        ChatMessage.thread_id == thread_id
    ).count()

    # Get messages with pagination
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.thread_id == thread_id)
        .order_by(ChatMessage.timestamp.desc())  # Most recent first
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Convert to response schema
    message_responses = [
        ChatMessageResponse.model_validate(message) 
        for message in reversed(messages)  # Reverse to get chronological order
    ]

    return ChatMessageList(
        items=message_responses,
        total=total
    )

async def get_thread_topic(db: Session, thread: ChatThread) -> Optional[Topic]:
    """Get the associated topic for a thread if it exists"""
    if thread.topic_id is None or thread.topic_id == ALL_TOPICS:
        return None
    return db.query(Topic).filter(Topic.topic_id == thread.topic_id).first()