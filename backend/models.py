from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True)
    password = Column(String(255))
    registration_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    topics = relationship("Topic", back_populates="user")
    entries = relationship("Entry", back_populates="user")
    chat_messages = relationship("ChatMessage", back_populates="user")
    chat_threads = relationship("ChatThread", back_populates="user")

class Topic(Base):
    __tablename__ = "topics"
    
    topic_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    topic_name = Column(String(255))
    creation_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="topics")
    entries = relationship("Entry", back_populates="topic")
    chat_messages = relationship("ChatMessage", back_populates="topic")
    chat_threads = relationship("ChatThread", back_populates="topic")

class Entry(Base):
    __tablename__ = "entries"
    
    entry_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    topic_id = Column(Integer, ForeignKey("topics.topic_id"), nullable=True, index=True)
    content = Column(Text)
    creation_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="entries")
    topic = relationship("Topic", back_populates="entries")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    message_id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("chat_threads.thread_id"), index=True)
    topic_id = Column(Integer, ForeignKey("topics.topic_id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    message_text = Column(Text)
    message_type = Column(Enum('user', 'assistant', 'system', name='message_type'))
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    topic = relationship("Topic", back_populates="chat_messages")
    thread = relationship("ChatThread", back_populates="messages")

class ChatThread(Base):
    __tablename__ = "chat_threads"
    
    thread_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), index=True)
    topic_id = Column(Integer, ForeignKey("topics.topic_id"), nullable=True, index=True)
    title = Column(String(255))
    created_at = Column(DateTime, default=datetime.utcnow)
    last_message_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum('active', 'archived', 'deleted', name='thread_status'))

    # Relationships
    user = relationship("User", back_populates="chat_threads")
    topic = relationship("Topic", back_populates="chat_threads")
    messages = relationship("ChatMessage", back_populates="thread")