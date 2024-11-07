from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    registration_date = Column(DateTime, default=datetime.utcnow)

class Topic(Base):
    __tablename__ = "topics"
    
    topic_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    topic_name = Column(String(255))
    creation_date = Column(DateTime, default=datetime.utcnow)

class Entry(Base):
    __tablename__ = "entries"
    
    entry_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    topic_id = Column(Integer, ForeignKey("topics.topic_id"), nullable=True)
    content = Column(Text)
    creation_date = Column(DateTime, default=datetime.utcnow)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    message_id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("topics.topic_id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    message_text = Column(Text)
    message_type = Column(Enum('user', 'assistant', 'system'))
    timestamp = Column(DateTime, default=datetime.utcnow) 