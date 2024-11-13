from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from services import auth_service
import logging
from typing import Annotated

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=True)

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Security(security)],
    db: Session = Depends(get_db)
):
    """
    Extract and validate the bearer token from the Authorization header.
    This can be used as a dependency in other endpoints that need authentication.
    """
    try:
        token = credentials.credentials
        logger.info(f"Validating token: {token[:10]}...")
        return await auth_service.validate_token(token, db)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Create a reusable dependency

CurrentUser = Annotated[dict, Depends(get_current_user)]