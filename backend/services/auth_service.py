from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Security
from fastapi.security import HTTPBearer
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from models import User
from schemas import UserCreate, Token
from config.settings import settings
from database import get_db
import logging
import time

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
logger = logging.getLogger(__name__)

# Define OAuth2 scheme for token handling
security = HTTPBearer()

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def create_user(db: Session, user: UserCreate):
    # Check if user already exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

async def login_user(db: Session, email: str, password: str) -> Token:
    """
    Authenticate user and return JWT token
    """
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Extract username from email (everything before @)
    username = email.split('@')[0]
    
    # Include email, user_id, and username in the token
    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.user_id,
        "username": username
    })
    
    return Token(
        access_token=access_token, 
        token_type="bearer",
        username=username
    )

async def validate_token(
    credentials: HTTPBearer = Depends(security),
    db: Session = Depends(get_db)
):
    """Validate JWT token and return user"""
    logger.info("validate_token called")
    try:
        logger.info("getting token from credentials")
        token = credentials.credentials
        logger.info(f"Token: {token[:10]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        exp_timestamp = payload.get('exp')
        time_until_expiry = exp_timestamp - int(time.time())
        logger.info(f"Token expires in {time_until_expiry} seconds")        
        email: str = payload.get("sub")
        username: str = payload.get("username")
        logger.info(f"Token decoded, email: {email}, username: {username}")
        
        if email is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload"
            )
        
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )
            
        # Add username to user object for convenience
        user.username = username
        return user
    except Exception as e:
        logger.info("############## JWT validation error ##############")
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid token: {str(e)}"
        )

