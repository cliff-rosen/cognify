from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Topic
from schemas import TopicCreate, TopicResponse
from dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[TopicResponse])
async def get_topics(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    return db.query(Topic).filter(Topic.user_id == current_user.user_id).all()

@router.post("/", response_model=TopicResponse)
async def create_topic(topic: TopicCreate, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    db_topic = Topic(**topic.dict(), user_id=current_user.user_id)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic