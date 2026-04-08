"""Stateless negotiation email generator."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from signsafe.core.deps import get_negotiation_service
from signsafe.schemas.negotiation import NegotiationEmailRequest, NegotiationEmailResponse
from signsafe.services.negotiation_service import NegotiationService

router = APIRouter(tags=["negotiation"])


@router.post("/negotiate", response_model=NegotiationEmailResponse)
async def generate_negotiation_email(
    req: NegotiationEmailRequest,
    service: NegotiationService = Depends(get_negotiation_service),
) -> NegotiationEmailResponse:
    return await service.generate(req.clauses, tone=req.tone)
