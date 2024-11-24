from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
from models import ChatMessage, ChatThread, Topic, Entry
from schemas import ChatMessageCreate, ChatMessageResponse, ChatThreadCreate
from fastapi import HTTPException, status
from services import ai_service

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
        """Initialize the chat service"""
        self.tools = {
            "get_topic": self._get_topic_tool,
            "get_entries": self._get_entries_tool,
            "search_entries": self._search_entries_tool,
            "get_topic_stats": self._get_topic_stats_tool,
        }

    async def create_thread(
        self,
        db: Session,
        user_id: int,
        thread: ChatThreadCreate,
    ) -> ChatThread:
        """
        Creates a new chat thread.
        
        A thread represents a distinct conversation context, optionally associated
        with a specific topic. Threads help maintain conversation state and context.
        """
        db_thread = ChatThread(
            user_id=user_id,
            topic_id=thread.topic_id,
            title=thread.title or "New Chat",
            created_at=datetime.utcnow(),
            last_message_at=datetime.utcnow(),
            status="active"
        )
        db.add(db_thread)
        db.commit()
        db.refresh(db_thread)
        return db_thread

    async def get_or_create_thread(
        self,
        db: Session,
        user_id: int,
        thread_id: Optional[int] = None,
        topic_id: Optional[int] = None
    ) -> ChatThread:
        """
        Gets an existing thread or creates a new one if needed.
        
        - If thread_id is provided, validates and returns that thread
        - If no thread_id but topic_id is provided, creates a new thread for that topic
        - If neither is provided, creates a new general thread
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
        return await self.create_thread(
            db=db,
            user_id=user_id,
            thread=ChatThreadCreate(
                topic_id=topic_id,
                title="New Chat"
            )
        )

    async def create_chat_message(
        self,
        db: Session,
        user_id: int,
        message: ChatMessageCreate,
        thread_id: int,
    ) -> ChatMessageResponse:
        """
        Creates a new chat message within a thread.
        """
        # Create message
        db_message = ChatMessage(
            user_id=user_id,
            thread_id=thread_id,
            topic_id=message.topic_id,
            content=message.message_text,
            role=message.message_type,
            timestamp=datetime.utcnow()
        )
        db.add(db_message)
        
        # Update thread's last_message_at
        thread = db.query(ChatThread).filter(ChatThread.thread_id == thread_id).first()
        thread.last_message_at = datetime.utcnow()
        
        db.commit()
        db.refresh(db_message)
        
        return ChatMessageResponse.model_validate(db_message)

    async def process_message(
        self,
        db: Session,
        user_id: int,
        message: ChatMessageCreate,
        thread_id: Optional[int] = None,
    ) -> ChatMessageResponse:
        """
        Processes a user message within a thread and generates an AI response.
        """
        # Get or create thread
        thread = await self.get_or_create_thread(
            db=db,
            user_id=user_id,
            thread_id=thread_id,
            topic_id=message.topic_id
        )
        
        # Store user message
        user_message = await self.create_chat_message(
            db=db,
            user_id=user_id,
            message=message,
            thread_id=thread.thread_id
        )
        
        # Get thread context
        context = await self._get_conversation_context(
            db=db,
            thread_id=thread.thread_id
        )
        
        # Prepare tool context
        available_tools = {
            name: tool.__doc__ for name, tool in self.tools.items()
        }
        
        # Get LLM's analysis and tool requests
        tool_requests = await ai_service.analyze_message(
            message=message.message_text,
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
        for tool_name, tool_params in tool_requests.items():
            if tool_name in self.tools:
                try:
                    tool_results[tool_name] = await self.tools[tool_name](
                        db=db,
                        user_id=user_id,
                        **tool_params
                    )
                except Exception as e:
                    logger.error(f"Tool {tool_name} failed: {str(e)}")
                    tool_results[tool_name] = {"error": str(e)}
        
        # Generate AI response
        ai_response = await ai_service.generate_response(
            message=message.message_text,
            context=context,
            tool_results=tool_results,
            thread_info={
                "thread_id": thread.thread_id,
                "topic_id": thread.topic_id,
                "title": thread.title
            }
        )
        
        # Store AI response
        response_message = await self.create_chat_message(
            db=db,
            user_id=user_id,
            message=ChatMessageCreate(
                message_text=ai_response,
                topic_id=message.topic_id,
                message_type="assistant"
            ),
            thread_id=thread.thread_id
        )
        
        return response_message

    async def get_user_threads(
        self,
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

    async def archive_thread(
        self,
        db: Session,
        user_id: int,
        thread_id: int
    ) -> None:
        """
        Archives a chat thread.
        """
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

    async def _get_conversation_context(
        self,
        db: Session,
        thread_id: int,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Retrieves recent conversation history for a thread.
        """
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

    # Tool implementations remain the same...
    
chat_service = ChatService()