from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum

##### USER SCHEMA #####


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


##### AUTH SCHEMA #####

class Token(BaseModel):
    """Schema for authentication tokens"""
    access_token: str = Field(description="JWT access token")
    token_type: str = Field(default="bearer", description="Type of token")
    username: str = Field(description="User's username")


class TokenData(BaseModel):
    """Schema for token payload data"""
    email: Optional[str] = Field(
        default=None, description="User's email from token")
    user_id: Optional[int] = Field(
        default=None, description="User's ID from token")
    username: Optional[str] = Field(
        default=None, description="User's username")


##### TOPIC SCHEMA #####

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
    entry_count: int = Field(
        description="Number of entries in this topic", default=0)
    is_uncategorized: bool = Field(
        default=False, description="Whether this is the uncategorized topic")

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


##### ENTRY SCHEMA #####
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
    topic_id: Optional[int] = Field(
        description="ID of the associated topic, if any")
    content: str = Field(description="The content of the entry")
    creation_date: datetime = Field(description="When the entry was created")

    model_config = ConfigDict(from_attributes=True)


class EntryList(BaseModel):
    """Schema for paginated entry lists"""
    items: List[EntryResponse]
    total: int = Field(ge=0)


##### AUTO-CATEGORIZATION SCHEMA #####

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
    topic_id: Optional[int] = Field(
        description="ID if existing topic, None if new")
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


##### FACILITATE OPTIONS SCHEMA #####

class FacilitateOption(BaseModel):
    """A single facilitation option for a task"""
    option_type: str = Field(
        description="Type of facilitation (e.g., 'break_down', 'delegate', 'automate')")
    description: str = Field(
        description="Description of the facilitation option")
    confidence_score: float = Field(
        ge=0, le=1, description="Confidence score for this option")
    requirements: List[str] = Field(
        description="Requirements or prerequisites for this option")
    estimated_impact: str = Field(
        description="Estimated impact of implementing this option")


class TaskCategory(str, Enum):
    """Categories for task analysis"""
    PLAN = "plan"
    RESEARCH = "research"
    PERFORM = "perform"


class TaskCategorization(BaseModel):
    """Categorization for a task"""
    categories: List[TaskCategory] = Field(
        description="List of categories that apply to this task")
    confidence_score: float = Field(
        ge=0, le=1, description="Confidence score for this categorization")
    rationale: str = Field(
        description="Explanation for why these categories were chosen")


class TaskAnalysis(BaseModel):
    """Analysis for a single task entry"""
    entry_id: int = Field(description="ID of the analyzed entry")
    content: str = Field(description="Content of the entry")
    categorization: TaskCategorization = Field(
        description="Task categorization details")
    complexity_score: float = Field(
        ge=0, le=1, description="Estimated complexity of the task")
    priority_score: float = Field(
        ge=0, le=1, description="Suggested priority level")
    next_steps: List[str] = Field(
        description="Suggested next steps for this task")


class FacilitateAnalysisResponse(BaseModel):
    """Response for the facilitate options analysis"""
    tasks: List[TaskAnalysis] = Field(description="List of analyzed tasks")
    overall_summary: str = Field(description="Overall summary of the analysis")
    metadata: dict = Field(
        description="Additional metadata about the analysis",
        default={
            "analyzed_entries": 0,
            "analysis_timestamp": "",
            "average_complexity": 0.0,
            "average_priority": 0.0,
            "category_distribution": {
                "plan": 0,
                "research": 0,
                "perform": 0
            }
        })

    model_config = ConfigDict(from_attributes=True)


##### CHAT SCHEMA #####
class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message"""
    content: str = Field(
        min_length=1,
        description="The text content of the message",
        example="What can you tell me about my Machine Learning entries?"
    )
    role: str = Field(
        default="user",
        description="Role of the message sender (user/assistant/system)",
        example="user"
    )

    model_config = ConfigDict(from_attributes=True)


class ChatMessageResponse(BaseModel):
    """Schema for chat message responses"""
    message_id: int = Field(description="Unique identifier for the message")
    thread_id: int = Field(
        description="ID of the thread this message belongs to")
    user_id: int = Field(
        description="ID of the user who sent/received this message")
    content: str = Field(description="The content of the message")
    role: str = Field(
        description="Role of the message sender (user/assistant/system)")
    timestamp: datetime = Field(description="When the message was created")

    model_config = ConfigDict(from_attributes=True)


class ChatMessageList(BaseModel):
    """Schema for paginated chat message lists"""
    items: List[ChatMessageResponse]
    total: int = Field(ge=0)


class ChatThreadCreate(BaseModel):
    topic_id: Optional[int] = None
    title: str

    model_config = ConfigDict(from_attributes=True)


class ChatThreadResponse(BaseModel):
    thread_id: int
    user_id: int
    topic_id: Optional[int]
    title: str
    created_at: datetime
    last_message_at: datetime
    status: str

    model_config = ConfigDict(from_attributes=True)


class ChatThreadUpdate(BaseModel):
    """Schema for updating a chat thread"""
    title: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|archived)$")
