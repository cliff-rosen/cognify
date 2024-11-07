from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Entry
from schemas import EntryCreate, EntryResponse
from dependencies import get_current_user

router = APIRouter()

@router.get("/", response_model=List[EntryResponse])
async def get_entries(
    topic_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = db.query(Entry).filter(Entry.user_id == current_user.user_id)
    if topic_id:
        query = query.filter(Entry.topic_id == topic_id)
    return query.all()

@router.post("/", response_model=EntryResponse)
async def create_entry(
    entry: EntryCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    db_entry = Entry(**entry.dict(), user_id=current_user.user_id)
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry 