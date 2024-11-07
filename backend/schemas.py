from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    user_id: int
    registration_date: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None 

class TopicBase(BaseModel):
    topic_name: str

class TopicCreate(TopicBase):
    pass

class TopicResponse(TopicBase):
    topic_id: int
    user_id: int
    creation_date: datetime

    class Config:
        from_attributes = True

class EntryBase(BaseModel):
    content: str
    topic_id: Optional[int] = None

class EntryCreate(EntryBase):
    pass

class EntryResponse(EntryBase):
    entry_id: int
    user_id: int
    creation_date: datetime

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    message_text: str
    message_type: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    message_id: int
    topic_id: Optional[int]
    user_id: int
    timestamp: datetime

    class Config:
        from_attributes = True