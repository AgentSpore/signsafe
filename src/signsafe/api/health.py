"""Health endpoint."""

from fastapi import APIRouter

from signsafe.core.config import settings

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "service": "signsafe",
        "model": settings.agent_model,
        "api_key_configured": settings.has_api_key,
    }
