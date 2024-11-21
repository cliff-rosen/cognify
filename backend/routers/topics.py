from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import TopicResponse, TopicCreate, TopicUpdate, TopicSearchResponse, TopicSuggestionResponse, AutoCategorizeResponse, AutoCategorizeRequest, ApplyCategorizeRequest, QuickCategorizeRequest, QuickCategorizeResponse
from dependencies import CurrentUser
from models import Topic
from services import topic_service, auth_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/",
    response_model=List[TopicResponse],
    summary="Get all topics for the current user",
    responses={
        200: {
            "description": "List of topics successfully retrieved",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "array",
                        "items": {"$ref": "#/components/schemas/TopicResponse"}
                    }
                }
            }
        },
        401: {"description": "Not authenticated"}
    }
)
async def get_topics(
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """Get all topics for the authenticated user"""
    logger.info("get_topics endpoint called")

    return await topic_service.get_topics(db, current_user.user_id)

@router.post(
    "/",
    response_model=TopicResponse,
    summary="Create a new topic",
    responses={
        200: {
            "description": "Topic successfully created",
            "model": TopicResponse
        },
        401: {
            "description": "Not authenticated"
        },
        422: {
            "description": "Validation error"
        }
    }
)
async def create_topic(
    topic: TopicCreate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    logger.info("create_topic endpoint called")

    return await topic_service.create_topic(db, topic, current_user.user_id)    

#update topic
@router.patch(
    "/{topic_id}",
    response_model=TopicResponse,
    summary="Update a topic",
    responses={
        200: {
            "description": "Topic successfully updated",
            "content": {
                "application/json": {
                    "example": {
                        "topic_id": 1,
                        "user_id": 123,
                        "topic_name": "Advanced Machine Learning",
                        "creation_date": "2024-03-13T12:00:00Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Topic belongs to another user"},
        404: {"description": "Topic not found"},
        422: {"description": "Validation error"}
    }
)
async def update_topic(
    topic_id: int,
    topic: TopicUpdate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Update a topic for the authenticated user
    
    Parameters:
    - **topic_id**: ID of the topic to update
    - **topic_name**: New name for the topic
    """
    logger.info(f"update_topic endpoint called for topic_id: {topic_id}")
    return await topic_service.update_topic(db, topic_id, topic, current_user.user_id)

@router.get(
    "/search/{query}",
    response_model=List[TopicSearchResponse],
    summary="Search topics by name",
    responses={
        200: {
            "description": "List of topics matching the search query",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "array",
                        "items": {"$ref": "#/components/schemas/TopicSearchResponse"}
                    }
                }
            }
        },
        401: {"description": "Not authenticated"}
    }
)
async def search_topics(
    query: str,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Search topics for the authenticated user based on a query string
    
    Parameters:
    - **query**: Search string to match against topic names
    
    Returns a list of topics sorted by match score (highest to lowest)
    """
    logger.info(f"search_topics endpoint called with query: {query}")
    return await topic_service.search_topics(db, query, current_user.user_id)

@router.delete(
    "/{topic_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a topic",
    responses={
        204: {"description": "Topic successfully deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Topic belongs to another user"},
        404: {"description": "Topic not found"}
    }
)
async def delete_topic(
    topic_id: int,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Delete a topic and all its associated entries
    
    Parameters:
    - **topic_id**: ID of the topic to delete
    """
    logger.info(f"delete_topic endpoint called for topic_id: {topic_id}")
    await topic_service.delete_topic(db, topic_id, current_user.user_id)
    return None

@router.post(
    "/suggest",
    response_model=TopicSuggestionResponse,
    summary="Suggest a topic name based on entry text",
    responses={
        200: {
            "description": "Topic name suggestion successfully generated",
            "content": {
                "application/json": {
                    "example": {
                        "suggested_name": "Machine Learning"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        422: {"description": "Validation error"}
    }
)
async def suggest_topic_name(
    text: str,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Generate a topic name suggestion based on entry text
    
    Parameters:
    - **text**: The entry text to analyze for topic suggestion
    """
    logger.info("suggest_topic_name endpoint called")
    return await topic_service.suggest_topic_name(db, text, current_user.user_id)

@router.get(
    "/suggestions",
    response_model=List[TopicSearchResponse],
    summary="Get topic suggestions and search results",
    responses={
        200: {
            "description": "Combined list of topic suggestions and search results",
            "content": {
                "application/json": {
                    "schema": {
                        "type": "array",
                        "items": {"$ref": "#/components/schemas/TopicSearchResponse"}
                    }
                }
            }
        },
        401: {"description": "Not authenticated"}
    }
)
async def get_topic_suggestions(
    text: str,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Get combined topic suggestions and search results
    
    Parameters:
    - **text**: The text to analyze for suggestions and search
    """
    logger.info("get_topic_suggestions endpoint called")
    return await topic_service.get_topic_suggestions(db, text, current_user.user_id)

@router.post(
    "/analyze-categorization",
    response_model=AutoCategorizeResponse,
    summary="Analyze entries and propose new categorization",
    responses={
        200: {
            "description": "Analysis completed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "proposed_topics": [
                            {
                                "topic_id": 1,
                                "topic_name": "Machine Learning",
                                "is_new": False,
                                "entries": [
                                    {
                                        "entry_id": 1,
                                        "content": "Learning about neural networks",
                                        "current_topic_id": None,
                                        "proposed_topic_id": 1,
                                        "creation_date": "2024-03-13T12:00:00Z",
                                        "confidence_score": 0.92
                                    }
                                ],
                                "confidence_score": 0.92
                            },
                            {
                                "topic_id": None,
                                "topic_name": "Web Development",
                                "is_new": True,
                                "entries": [
                                    {
                                        "entry_id": 2,
                                        "content": "Learning React hooks",
                                        "current_topic_id": None,
                                        "proposed_topic_id": None,
                                        "creation_date": "2024-03-13T12:00:00Z",
                                        "confidence_score": 0.88
                                    }
                                ],
                                "confidence_score": 0.88
                            }
                        ],
                        "uncategorized_entries": []
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        500: {"description": "Analysis failed"}
    }
)
async def analyze_categorization(
    request: AutoCategorizeRequest,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Analyze all entries and propose a new categorization structure.
    Returns existing topics to keep, suggested new topics, and proposed entry assignments.
    
    Parameters:
    - instructions: Optional instructions to guide the categorization process
    - topics_to_keep: List of topic IDs to preserve
    """
    logger.info(f"analyze_categorization called for user {current_user.user_id}")
    return await topic_service.analyze_categorization(
        db, 
        current_user.user_id, 
        request.instructions,
        request.topics_to_keep
    )

@router.post("/apply-categorization")
async def apply_categorization(
    request: ApplyCategorizeRequest,
    db: Session = Depends(get_db),
    current_user = Depends(auth_service.validate_token),
):
    """
    Apply the provided categorization changes.
    Creates new topics and updates entry categorizations according to the provided changes.
    """
    logger.info(f"apply_categorization endpoint called for user {current_user.user_id}")
    logger.info(f"Request summary: {len(request.proposed_topics)} topics, "
               f"{sum(len(t.entries) for t in request.proposed_topics)} entries to move, "
               f"{len(request.uncategorized_entries)} entries to uncategorize")
    
    try:
        await topic_service.apply_categorization(
            db=db,
            user_id=current_user.user_id,
            changes=request
        )
        logger.info(f"Successfully completed apply_categorization for user {current_user.user_id}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error in apply_categorization endpoint: {str(e)}", exc_info=True)
        raise

@router.post(
    "/quick-categorize",
    response_model=QuickCategorizeResponse,
    summary="Get category suggestions for selected entries"
)
async def quick_categorize(
    request: QuickCategorizeRequest,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """Get category suggestions for the selected entries"""
    return await topic_service.get_quick_categorization(
        db,
        current_user.user_id,
        request.entry_ids
    )

