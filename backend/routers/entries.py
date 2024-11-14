from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import EntryCreate, EntryResponse
from dependencies import CurrentUser
from services import entry_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/",
    response_model=List[EntryResponse],
    summary="Get all entries for the current user",
    responses={
        200: {
            "description": "List of entries successfully retrieved",
            "content": {
                "application/json": {
                    "example": [{
                        "entry_id": 1,
                        "user_id": 123,
                        "content": "This is a sample entry content",
                        "topic_id": 1,
                        "creation_date": "2024-03-13T12:00:00Z"
                    }]
                }
            }
        },
        401: {"description": "Not authenticated"},
        422: {"description": "Validation error"},
        500: {"description": "Internal server error"}
    },
    openapi_extra={
        "security": [{"bearerAuth": []}]
    }
)
async def get_entries(
    request: Request,
    current_user: CurrentUser,
    topic_id: int = None,
    db: Session = Depends(get_db)
):
    """
    Get all entries for the authenticated user.
    Optionally filter by topic_id.
    
    Parameters:
    - topic_id (optional): Filter entries by topic
    """
    logger.info(f"get_entries called by user {current_user.user_id}")
    return await entry_service.get_entries(db, current_user.user_id, topic_id)

@router.post(
    "/",
    response_model=EntryResponse,
    summary="Create a new entry",
    responses={
        200: {
            "description": "Entry successfully created",
            "content": {
                "application/json": {
                    "example": {
                        "entry_id": 1,
                        "user_id": 123,
                        "content": "This is a new entry",
                        "topic_id": 1,
                        "creation_date": "2024-03-13T12:00:00Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        422: {"description": "Validation error"}
    },
    openapi_extra={
        "security": [{"bearerAuth": []}],
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "required": ["content"],
                        "properties": {
                            "content": {
                                "type": "string",
                                "minLength": 1,
                                "description": "The content of the entry",
                                "example": "This is a sample entry content"
                            },
                            "topic_id": {
                                "type": "integer",
                                "description": "Optional topic ID to associate with",
                                "example": 1,
                                "nullable": True
                            }
                        }
                    }
                }
            },
            "required": True,
            "description": "Entry details"
        }
    }
)
async def create_entry(
    entry: EntryCreate,
    current_user: CurrentUser,
    db: Session = Depends(get_db)
):
    """
    Create a new entry for the authenticated user.
    
    Parameters:
    - content: The content of the entry
    - topic_id (optional): Associated topic ID
    """
    logger.info(f"create_entry called by user {current_user.user_id}")
    return await entry_service.create_entry(db, entry, current_user.user_id) 