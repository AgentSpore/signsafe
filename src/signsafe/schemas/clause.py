"""Clause-related DTOs."""

from __future__ import annotations

from enum import IntEnum
from typing import Literal

from pydantic import BaseModel, Field

ClauseType = Literal[
    "personal_guarantee",
    "auto_renewal",
    "cam_charges",
    "holdover_penalty",
    "relocation_clause",
    "exclusive_use",
    "assignment_ban",
    "indemnification",
    "early_termination",
    "security_deposit",
    "rent_escalation",
    "maintenance_shift",
    "other",
]


class ClauseSeverity(IntEnum):
    INFO = 1
    CAUTION = 2
    WARNING = 3
    CRITICAL = 4
    DEAL_BREAKER = 5


class RiskClause(BaseModel):
    """A single flagged clause with risk assessment."""

    clause_type: ClauseType
    severity: ClauseSeverity
    title: str = Field(description="Short human title, e.g. 'Unlimited Personal Guarantee'")
    original_text: str = Field(description="Exact quote from document")
    page_number: int = Field(ge=1)
    plain_english: str = Field(description="Simple explanation of what this clause means")
    why_risky: str = Field(description="Concrete rationale why it's dangerous")
    negotiation_counter: str = Field(description="Suggested counter-language")
    benchmark: str | None = Field(default=None, description="Typical market terms for comparison")
