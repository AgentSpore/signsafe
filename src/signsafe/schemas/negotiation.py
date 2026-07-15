"""Negotiation DTOs."""

from __future__ import annotations

from pydantic import BaseModel, Field

from typing import Literal

from signsafe.schemas.clause import RiskClause

# Closed set: `tone` is interpolated into the prompt OUTSIDE the untrusted markers, so
# free-form client text here would be a direct prompt-injection vector. It is a UI
# dropdown — model it as one.
Tone = Literal["professional", "firm", "friendly"]


class NegotiationEmailRequest(BaseModel):
    clauses: list[RiskClause] = Field(min_length=1, max_length=20)
    tone: Tone = Field(default="professional")


class NegotiationEmailResponse(BaseModel):
    subject: str
    body: str
