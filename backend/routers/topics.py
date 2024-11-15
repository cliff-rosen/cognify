from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import TopicResponse, TopicCreate
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
    },
    openapi_extra={
        "security": [{"bearerAuth": []}],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["topic_name"],
                        "properties": {
                            "topic_name": {
                                "type": "string",
                                "minLength": 1,
                                "maxLength": 255,
                                "description": "The name of the topic",
                                "example": "Machine Learning Fundamentals"
                            }
                        }
                    }
                }
            },
            "required": True,
            "description": "Topic details"
        }
    }
)
async def create_topic(
    topic: TopicCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    logger.info("create_topic endpoint called")

    return await topic_service.create_topic(db, topic, current_user.user_id)    
