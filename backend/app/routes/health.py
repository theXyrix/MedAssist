"""
Health check routes.

GET /        — API root info
GET /health  — Liveness probe + Supabase connectivity status
"""
from fastapi import APIRouter
from app.core.config import settings
from app.services.supabase_service import ping_database

router = APIRouter(tags=["Health"])


@router.get("/", summary="API root")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
        "docs": "/docs",
        "health": "/health",
        "message": "MedAssist API is running. Visit /docs for the full API reference.",
    }


@router.get("/health", summary="Health check")
@router.get("/api/health", summary="Health check alias", include_in_schema=False)
async def health_check():
    """
    Returns service liveness and Supabase connectivity status.
    Safe to expose — never includes key values or sensitive config.
    """
    db_status = await ping_database()
    return {
        "status": "ok",
        "service": "MedAssist API",
        "version": settings.version,
        "database": db_status,
        "demo_mode": not settings.is_database_configured,
    }
