from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import EntryCreate, EntryResponse, EntryUpdate
from services import entry_service, auth_service
import logging
from fastapi import status

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
                        "content": "Sample entry content",
                        "topic_id": 1,
                        "creation_date": "2024-03-13T12:00:00Z"
                    }]
                }
            }
        },
        401: {"description": "Not authenticated"}
    }
)
async def get_entries(
    current_user = Depends(auth_service.validate_token),
    topic_id: int = None,
    db: Session = Depends(get_db)
):
    """
    Get all entries for the authenticated user
    
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
                        "content": "New entry content",
                        "topic_id": 1,
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
async def create_entry(
    entry: EntryCreate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Create a new entry
    
    Parameters:
    - content: The content of the entry
    - topic_id (optional): ID of the topic to associate with
    """
    logger.info(f"create_entry called by user {current_user.user_id}")
    return await entry_service.create_entry(db, entry, current_user.user_id)

@router.patch(
    "/{entry_id}",
    response_model=EntryResponse,
    summary="Update an entry",
    responses={
        200: {
            "description": "Entry successfully updated",
            "content": {
                "application/json": {
                    "example": {
                        "entry_id": 1,
                        "user_id": 123,
                        "content": "Updated entry content",
                        "topic_id": 1,
                        "creation_date": "2024-03-13T12:00:00Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Entry belongs to another user"},
        404: {"description": "Entry not found"},
        422: {"description": "Validation error"}
    }
)
async def update_entry(
    entry_id: int,
    entry: EntryUpdate,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Update an entry
    
    Parameters:
    - entry_id: ID of the entry to update
    - content (optional): New content for the entry
    - topic_id (optional): New topic ID to associate with
    """
    logger.info(f"update_entry called for entry {entry_id} by user {current_user.user_id}")
    return await entry_service.update_entry(db, entry_id, entry, current_user.user_id)

@router.get(
    "/{entry_id}",
    response_model=EntryResponse,
    summary="Get a specific entry by ID",
    responses={
        200: {
            "description": "Entry successfully retrieved",
            "content": {
                "application/json": {
                    "example": {
                        "entry_id": 1,
                        "user_id": 123,
                        "content": "Sample entry content",
                        "topic_id": 1,
                        "creation_date": "2024-03-13T12:00:00Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        403: {"description": "Entry belongs to another user"},
        404: {"description": "Entry not found"}
    }
)
async def get_entry(
    entry_id: int,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Get a specific entry by ID
    
    Parameters:
    - entry_id: ID of the entry to retrieve
    """
    logger.info(f"get_entry called for entry {entry_id} by user {current_user.user_id}")
    return await entry_service.get_entry_by_id(db, entry_id, current_user.user_id)

@router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an entry",
    responses={
        204: {"description": "Entry successfully deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Entry belongs to another user"},
        404: {"description": "Entry not found"}
    }
)
async def delete_entry(
    entry_id: int,
    current_user = Depends(auth_service.validate_token),
    db: Session = Depends(get_db)
):
    """
    Delete an entry
    
    Parameters:
    - **entry_id**: ID of the entry to delete
    """
    logger.info(f"delete_entry called for entry {entry_id} by user {current_user.user_id}")
    await entry_service.delete_entry(db, entry_id, current_user.user_id)
    return None
