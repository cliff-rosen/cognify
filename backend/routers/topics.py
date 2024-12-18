from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import (
    TopicResponse, TopicCreate, TopicUpdate, TopicSearchResponse, 
    TopicSuggestionResponse, AutoCategorizeResponse, AutoCategorizeRequest, 
    ApplyCategorizeRequest, QuickCategorizeRequest, QuickCategorizeResponse,
    QuickCategorizeUncategorizedRequest, QuickCategorizeUncategorizedResponse
)
from models import Topic, User
from services import topic_service, auth_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


################## CRUD Routes ##################

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

################## AI Enabled Routes ##################

@router.get(
    "/suggestions",
    response_model=List[TopicSearchResponse],
    summary="Get ranked topic list and one suggested topic",
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

@router.post(
    "/quick-categorize-uncategorized",
    response_model=QuickCategorizeUncategorizedResponse,
    summary="Suggest categorization for uncategorized entries",
    responses={
        200: {
            "description": "Successfully analyzed uncategorized entries",
            "content": {
                "application/json": {
                    "example": {
                        "existing_topic_assignments": [{
                            "topic_id": 1,
                            "topic_name": "Machine Learning",
                            "entries": [{
                                "entry_id": 101,
                                "content": "Learning about neural networks",
                                "confidence": 0.92,
                                "alternative_topics": [{
                                    "topic_id": 2,
                                    "topic_name": "Data Science",
                                    "confidence": 0.75
                                }]
                            }]
                        }],
                        "new_topic_proposals": [{
                            "suggested_name": "Web Development",
                            "confidence": 0.88,
                            "rationale": "Multiple entries about frontend frameworks",
                            "similar_existing_topics": [{
                                "topic_id": 3,
                                "topic_name": "Programming",
                                "confidence": 0.65
                            }],
                            "entries": [{
                                "entry_id": 102,
                                "content": "Learning React hooks",
                                "confidence": 0.88,
                                "alternative_topics": []
                            }]
                        }],
                        "unassigned_entries": [{
                            "entry_id": 103,
                            "content": "Mixed topic content",
                            "reason": "No clear topic match",
                            "top_suggestions": [{
                                "topic_id": 1,
                                "topic_name": "Machine Learning",
                                "confidence": 0.45
                            }]
                        }],
                        "metadata": {
                            "total_entries_analyzed": 3,
                            "assigned_to_existing": 1,
                            "assigned_to_new": 1,
                            "unassigned": 1,
                            "average_confidence": 0.75,
                            "processing_time_ms": 1234
                        }
                    }
                }
            }
        },
        400: {"description": "Invalid parameters"},
        401: {"description": "Not authenticated"},
        500: {"description": "Analysis failed"}
    }
)
async def quick_categorize_uncategorized(
    request: QuickCategorizeUncategorizedRequest,
    current_user: User = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
) -> QuickCategorizeUncategorizedResponse:
    """
    Analyze all uncategorized entries for a user and suggest assignments to existing topics
    or propose new topics where appropriate.

    The endpoint will:
    1. Fetch all uncategorized entries for the user
    2. Attempt to match entries to existing topics
    3. Suggest new topics for entries that don't fit well in existing ones
    4. Provide confidence scores and alternative suggestions for each assignment
    5. Include explanations for new topic proposals and unassigned entries

    Parameters:
        - min_confidence_threshold: Minimum confidence score for assignment (default: 0.7)
        - max_new_topics: Maximum number of new topics to suggest (default: 3)
        - instructions: Optional guidance for the categorization process
    """
    logger.info(f"Quick categorize uncategorized called for user {current_user.user_id}")
    
    try:
        response = await topic_service.quick_categorize_uncategorized(
            db=db,
            user_id=current_user.user_id,
            min_confidence=request.min_confidence_threshold,
            max_new_topics=request.max_new_topics,
            instructions=request.instructions
        )
        
        logger.info(
            f"Quick categorization complete for user {current_user.user_id}:\n"
            f"Total entries: {response.metadata.total_entries_analyzed}\n"
            f"Assigned to existing: {response.metadata.assigned_to_existing}\n"
            f"Assigned to new: {response.metadata.assigned_to_new}\n"
            f"Unassigned: {response.metadata.unassigned}\n"
            f"Processing time: {response.metadata.processing_time_ms}ms"
        )
        
        return response
        
    except Exception as e:
        logger.error(
            f"Error in quick categorization endpoint: {str(e)}", 
            exc_info=True,
            extra={
                "user_id": current_user.user_id,
                "request_params": request.model_dump()
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze entries for categorization"
        )

