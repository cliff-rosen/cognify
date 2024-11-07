from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ChatMessage
from schemas import ChatMessageCreate, ChatMessageResponse
from dependencies import get_current_user

router = APIRouter()

@router.get("/topic/{topic_id}", response_model=List[ChatMessageResponse])
async def get_chat_messages(
    topic_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    messages = db.query(ChatMessage).filter(
        ChatMessage.topic_id == topic_id,
        ChatMessage.user_id == current_user.user_id
    ).all()
    return messages

@router.post("/topic/{topic_id}", response_model=ChatMessageResponse)
async def create_message(
    topic_id: int,
    message: ChatMessageCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_message = ChatMessage(
        **message.dict(),
        topic_id=topic_id,
        user_id=current_user.user_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message 