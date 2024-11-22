from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    """Base schema for user data"""
    email: EmailStr = Field(description="User's email address")

class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(
        min_length=5,
        description="User's password",
        example="securepassword123"
    )

class UserResponse(UserBase):
    """Schema for user responses"""
    user_id: int = Field(description="Unique identifier for the user")
    registration_date: datetime = Field(description="When the user registered")

    model_config = ConfigDict(from_attributes=True)

# Auth Schemas
class Token(BaseModel):
    """Schema for authentication tokens"""
    access_token: str = Field(description="JWT access token")
    token_type: str = Field(default="bearer", description="Type of token")
    username: str = Field(description="User's username")

class TokenData(BaseModel):
    """Schema for token payload data"""
    email: Optional[str] = Field(default=None, description="User's email from token")
    user_id: Optional[int] = Field(default=None, description="User's ID from token")
    username: Optional[str] = Field(default=None, description="User's username")

# Topic Schemas
class TopicCreate(BaseModel):
    """Schema for creating a new topic"""
    topic_name: str = Field(
        min_length=1,
        max_length=255,
        description="Name of the topic",
        example="Machine Learning Fundamentals"
    )

class TopicUpdate(BaseModel):
    """Schema for updating a topic (PATCH)"""
    topic_name: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
        description="Updated name of the topic",
        example="Advanced Machine Learning"
    )

class TopicResponse(BaseModel):
    """Schema for topic responses"""
    topic_id: int = Field(description="Unique identifier for the topic")
    user_id: int = Field(description="ID of the user who owns this topic")
    topic_name: str = Field(description="Name of the topic")
    creation_date: datetime = Field(description="When the topic was created")
    entry_count: int = Field(description="Number of entries in this topic", default=0)
    is_uncategorized: bool = Field(default=False, description="Whether this is the uncategorized topic")

    model_config = ConfigDict(from_attributes=True)

class TopicList(BaseModel):
    """Schema for paginated topic lists"""
    items: List[TopicResponse]
    total: int = Field(ge=0)

class TopicSearchResponse(TopicResponse):
    score: float
    is_ai_suggested: bool = False
    is_new_topic: bool = False

    model_config = ConfigDict(from_attributes=True)

class TopicSuggestionResponse(BaseModel):
    suggested_name: str

# Entry Schemas
class EntryCreate(BaseModel):
    """Schema for creating a new entry"""
    content: str = Field(
        min_length=1,
        description="The content of the entry",
        example="Today I learned about neural networks..."
    )
    topic_id: Optional[int] = Field(
        default=None,
        description="ID of the topic this entry belongs to",
        example=1
    )

class EntryUpdate(BaseModel):
    """Schema for updating an entry (PATCH)"""
    content: Optional[str] = None
    topic_id: Optional[int] = None

    class Config:
        from_attributes = True

class EntryResponse(BaseModel):
    """Schema for entry responses"""
    entry_id: int = Field(description="Unique identifier for the entry")
    user_id: int = Field(description="ID of the user who created this entry")
    topic_id: Optional[int] = Field(description="ID of the associated topic, if any")
    content: str = Field(description="The content of the entry")
    creation_date: datetime = Field(description="When the entry was created")

    model_config = ConfigDict(from_attributes=True)

class EntryList(BaseModel):
    """Schema for paginated entry lists"""
    items: List[EntryResponse]
    total: int = Field(ge=0)

# Chat Schemas
class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message"""
    message_text: str = Field(
        min_length=1,
        description="The text content of the message",
        example="What can you tell me about neural networks?"
    )
    topic_id: Optional[int] = Field(
        default=None,
        description="ID of the topic this message belongs to",
        example=1
    )
    message_type: str = Field(
        description="Type of message (user/assistant/system)",
        example="user"
    )

class ChatMessageResponse(BaseModel):
    """Schema for chat message responses"""
    message_id: int = Field(description="Unique identifier for the message")
    user_id: int = Field(description="ID of the user who sent/received this message")
    topic_id: Optional[int] = Field(description="ID of the associated topic, if any")
    message_text: str = Field(description="The content of the message")
    message_type: str = Field(description="Type of message (user/assistant/system)")
    timestamp: datetime = Field(description="When the message was created")

    model_config = ConfigDict(from_attributes=True)

class ChatMessageList(BaseModel):
    """Schema for paginated chat message lists"""
    items: List[ChatMessageResponse]
    total: int = Field(ge=0)

# Add these new schemas to schemas.py

class ProposedEntry(BaseModel):
    """Schema for an entry with its proposed categorization"""
    entry_id: int
    content: str
    current_topic_id: Optional[int]
    proposed_topic_id: Optional[int]
    creation_date: datetime
    confidence_score: float

    model_config = ConfigDict(from_attributes=True)

class ProposedTopic(BaseModel):
    """Schema for a proposed topic in auto-categorization"""
    topic_id: Optional[int] = Field(description="ID if existing topic, None if new")
    topic_name: str
    is_new: bool = Field(description="Whether this is a newly suggested topic")
    entries: List[ProposedEntry]
    confidence_score: float

    model_config = ConfigDict(from_attributes=True)

class AutoCategorizeRequest(BaseModel):
    """Schema for the auto-categorization analysis request"""
    instructions: Optional[str] = Field(
        default=None,
        description="Optional instructions to guide the categorization process"
    )
    topics_to_keep: List[int] = Field(
        default=[],
        description="List of topic IDs that should be preserved"
    )

class AutoCategorizeResponse(BaseModel):
    """Schema for the auto-categorization analysis response"""
    proposed_topics: List[ProposedTopic]
    uncategorized_entries: List[ProposedEntry]
    instructions_used: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class ApplyCategorizeRequest(BaseModel):
    proposed_topics: List[ProposedTopic]
    uncategorized_entries: List[ProposedEntry]

class QuickCategorizeRequest(BaseModel):
    entry_ids: List[int]

class CategorySuggestion(BaseModel):
    topic_id: Optional[int] = None
    topic_name: str
    is_new: bool
    confidence_score: float

class EntryProposal(BaseModel):
    entry_id: int
    content: str
    suggestions: List[CategorySuggestion]

class QuickCategorizeResponse(BaseModel):
    proposals: List[EntryProposal]

# Add these new schema classes

class TopicSuggestion(BaseModel):
    """Topic suggestion with confidence"""
    topic_id: Optional[int] = None
    topic_name: str
    confidence: float

class TopicAssignment(BaseModel):
    """Entry assignment details for a topic"""
    entry_id: int
    content: str
    confidence: float
    alternative_topics: List[TopicSuggestion]

class ExistingTopicAssignment(BaseModel):
    """Assignments to an existing topic"""
    topic_id: int
    topic_name: str
    entries: List[TopicAssignment]

class NewTopicProposal(BaseModel):
    """Proposed new topic with entries"""
    suggested_name: str
    confidence: float
    rationale: str
    similar_existing_topics: List[TopicSuggestion]
    entries: List[TopicAssignment]

class UnassignedEntry(BaseModel):
    """Entry that couldn't be confidently categorized"""
    entry_id: int
    content: str
    reason: str
    top_suggestions: List[TopicSuggestion]

class CategoryMetadata(BaseModel):
    """Metadata about the categorization process"""
    total_entries_analyzed: int
    assigned_to_existing: int
    assigned_to_new: int
    unassigned: int
    average_confidence: float
    processing_time_ms: int

class QuickCategorizeUncategorizedRequest(BaseModel):
    """Request parameters for quick categorization of uncategorized entries"""
    min_confidence_threshold: Optional[float] = Field(default=0.7, ge=0, le=1)
    max_new_topics: Optional[int] = Field(default=3, ge=0, le=10)
    instructions: Optional[str] = Field(default=None)

class QuickCategorizeUncategorizedResponse(BaseModel):
    """Response for quick categorization of uncategorized entries"""
    existing_topic_assignments: List[ExistingTopicAssignment]
    new_topic_proposals: List[NewTopicProposal]
    unassigned_entries: List[UnassignedEntry]
    metadata: CategoryMetadata