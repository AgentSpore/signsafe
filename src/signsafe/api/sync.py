"""Cloud sync API — magic-link + encrypted blob storage."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from signsafe.core.config import settings
from signsafe.core.deps import get_sync_service
from signsafe.schemas.sync import (
    ConsumeTokenRequest,
    ConsumeTokenResponse,
    MagicLinkRequest,
    MagicLinkResponse,
    SyncBlob,
    SyncGetRequest,
    SyncPutRequest,
)
from signsafe.services.email_service import EmailService
from signsafe.services.sync_service import SyncService, verify_session

_email_service = EmailService()

router = APIRouter(prefix="/sync", tags=["sync"])


@router.post("/magic-link", response_model=MagicLinkResponse)
async def request_magic_link(
    req: MagicLinkRequest,
    service: SyncService = Depends(get_sync_service),
) -> MagicLinkResponse:
    token = await service.create_magic_token(req.email)
    if settings.has_smtp:
        sent = await _email_service.send_magic_link(req.email, token)
        if sent:
            return MagicLinkResponse(token="", dev_mode=False)
    # SMTP not configured or send failed → dev mode (return token directly)
    return MagicLinkResponse(token=token, dev_mode=True)


@router.post("/consume", response_model=ConsumeTokenResponse)
async def consume_token(
    req: ConsumeTokenRequest,
    service: SyncService = Depends(get_sync_service),
) -> ConsumeTokenResponse:
    email = await service.consume_magic_token(req.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired magic link")
    session_token = service.issue_session(email)
    return ConsumeTokenResponse(email=email, session_token=session_token)


@router.post("/put")
async def put_blob(
    req: SyncPutRequest,
    service: SyncService = Depends(get_sync_service),
) -> dict:
    email = verify_session(req.session_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid session")
    await service.put_blob(email, req.ciphertext, req.iv)
    return {"status": "ok"}


@router.post("/get", response_model=SyncBlob)
async def get_blob(
    req: SyncGetRequest,
    service: SyncService = Depends(get_sync_service),
) -> SyncBlob:
    email = verify_session(req.session_token)
    if not email:
        raise HTTPException(status_code=401, detail="Invalid session")
    row = await service.get_blob(email)
    if not row:
        return SyncBlob()
    return SyncBlob(**row)
