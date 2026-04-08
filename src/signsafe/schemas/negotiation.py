"""Negotiation DTOs."""

from __future__ import annotations

from pydantic import BaseModel, Field

from signsafe.schemas.clause import RiskClause


class NegotiationEmailRequest(BaseModel):
    clauses: list[RiskClause] = Field(min_length=1, max_length=20)
    tone: str = Field(default="professional", description="professional | firm | friendly")


class NegotiationEmailResponse(BaseModel):
    subject: str
    body: str
