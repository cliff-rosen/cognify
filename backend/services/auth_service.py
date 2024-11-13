from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from models import User
from schemas import UserCreate, Token
from config import settings
import logging

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = "HS256"
logger = logging.getLogger(__name__)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
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
    
    # Include both email and user_id in the token
    access_token = create_access_token(data={
        "sub": user.email,
        "user_id": user.user_id
    })
    return Token(access_token=access_token, token_type="bearer")

async def validate_token(token: str, db: Session):
    try:
        logger.info(f"Validating token: {token[:10]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        logger.info(f"Token decoded, email: {email}")
        
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
            
        return user
    except jwt.JWTError as e:
        logger.error(f"JWT validation error: {str(e)}")
        raise HTTPException(
            status_code=401, 
            detail=f"Invalid token: {str(e)}"
        )