from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, init_db
from models import Base
from routers import auth, topics, entries, chat
from fastapi.openapi.utils import get_openapi
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cognify API",
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "tryItOutEnabled": True,
        "defaultModelsExpandDepth": -1,
    }
)

# Middleware for logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log requests with their auth header"""
    logger.info("="*50)
    logger.info(f"Request: {request.method} {request.url}")
    logger.info("All headers:")
    for header_name, header_value in request.headers.items():
        logger.info(f"{header_name}: {header_value}")
    
    auth_header = request.headers.get("authorization", "No auth header")
    logger.info(f"Auth header specifically: {auth_header}")
    
    response = await call_next(request)
    return response

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*", "Authorization"],
    expose_headers=["Authorization"],
)

# Security and schema components
components = {
    "securitySchemes": {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the token with the `Bearer: ` prefix, e.g. 'Bearer abcde12345'"
        }
    },
    "schemas": {
        "TopicResponse": {
            "type": "object",
            "properties": {
                "topic_id": {"type": "integer"},
                "user_id": {"type": "integer"},
                "topic_name": {"type": "string"},
                "creation_date": {
                    "type": "string",
                    "format": "date-time"
                }
            },
            "required": ["topic_id", "user_id", "topic_name", "creation_date"]
        },
        "Token": {
            "type": "object",
            "properties": {
                "access_token": {"type": "string"},
                "token_type": {"type": "string"}
            },
            "required": ["access_token", "token_type"]
        },
        "Body_login_api_auth_login_post": {
            "type": "object",
            "properties": {
                "username": {"type": "string", "title": "Username"},
                "password": {"type": "string", "title": "Password"}
            },
            "required": ["username", "password"]
        },
        "HTTPValidationError": {
            "type": "object",
            "properties": {
                "detail": {
                    "type": "array",
                    "items": {"$ref": "#/components/schemas/ValidationError"}
                }
            }
        },
        "ValidationError": {
            "type": "object",
            "properties": {
                "loc": {
                    "type": "array",
                    "items": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "integer"}
                        ]
                    }
                },
                "msg": {"type": "string"},
                "type": {"type": "string"}
            },
            "required": ["loc", "msg", "type"]
        }
    }
}

# Include routers
logger.info("Including routers...")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(topics.router, prefix="/api/topics", tags=["topics"])
app.include_router(entries.router, prefix="/api/entries", tags=["entries"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
logger.info("Routers included")

# OpenAPI schema customization
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Cognify API",
        version="1.0.0",
        description="Cognify Knowledge Management API",
        routes=app.routes,
    )

    # Add base components
    openapi_schema["components"] = components

    # Process paths
    for path, path_item in openapi_schema["paths"].items():
        # Handle topics endpoint
        if path == "/api/topics/":
            for method in path_item:
                # Clear any auto-generated parameters
                path_item[method]["parameters"] = []

        # Handle login endpoint
        if path.endswith("/login"):
            if "post" in path_item:
                path_item["post"]["security"] = []  # No auth for login
                path_item["post"]["requestBody"] = {
                    "content": {
                        "application/x-www-form-urlencoded": {
                            "schema": {"$ref": "#/components/schemas/Body_login_api_auth_login_post"}
                        }
                    },
                    "required": True
                }

    # Add global security
    openapi_schema["security"] = [{"bearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

# Set OpenAPI schema
app.openapi = custom_openapi

# Health and test endpoints
@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    init_db()
    logger.info("Database initialized")

@app.get("/test")
async def test_endpoint():
    logger.info("Test endpoint called")
    return {"status": "ok"}