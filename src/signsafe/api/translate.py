"""Translation API endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from signsafe.core.deps import get_translate_service
from signsafe.schemas.translate import TranslateRequest, TranslateResponse
from signsafe.services.translate_service import TranslateService

router = APIRouter(tags=["translate"])


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    req: TranslateRequest,
    service: TranslateService = Depends(get_translate_service),
) -> TranslateResponse:
    try:
        translated = await service.translate(req.items, req.target_locale)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Translation failed: {exc}") from exc
    return TranslateResponse(items=translated)
