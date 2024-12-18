from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, foreign, remote
from datetime import datetime
from typing import Optional
from sqlalchemy.sql import text
from sqlalchemy.sql.schema import CheckConstraint, ForeignKeyConstraint

Base = declarative_base()

# Constants
ALL_TOPICS = -1  # Special value for chat threads to indicate "all topics" view

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
    thread_id = Column(Integer, ForeignKey("chat_threads.thread_id", ondelete="CASCADE"), index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    content = Column(Text, nullable=False)
    role = Column(Enum('user', 'assistant', 'system', name='message_type'), nullable=False)
    timestamp = Column(TIMESTAMP, nullable=False, server_default=text('CURRENT_TIMESTAMP'))

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    thread = relationship("ChatThread", back_populates="messages")

    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}
    )

class ChatThread(Base):
    __tablename__ = "chat_threads"
    
    thread_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    topic_id = Column(Integer)  # Can be NULL (uncategorized), -1 (all topics), or >0 (specific topic)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False)
    last_message_at = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)
    
    __table_args__ = (
        CheckConstraint(
            'topic_id IS NULL OR topic_id = -1 OR topic_id > 0',
            name='chat_threads_topic_id_check'
        ),
    )

    # Relationships
    user = relationship("User", back_populates="chat_threads")
    messages = relationship("ChatMessage", back_populates="thread", cascade="all, delete-orphan")