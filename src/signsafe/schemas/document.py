"""Document DTOs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from signsafe.schemas.clause import RiskClause

Recommendation = Literal[
    # Contract recommendations
    "SAFE_TO_SIGN", "NEGOTIATE_FIRST", "WALK_AWAY",
    # Medical bill recommendations
    "LOOKS_FAIR", "REVIEW_CAREFULLY", "DISPUTE_NOW",
]


class AnalysisResult(BaseModel):
    """Full AI analysis output — returned directly to client."""

    overall_risk_score: int = Field(ge=0, le=100)
    recommendation: Recommendation
    summary: str = Field(description="3-paragraph executive summary")
    top_3_concerns: list[str] = Field(min_length=0, max_length=3)
    risk_clauses: list[RiskClause] = Field(default_factory=list)

    @property
    def critical_count(self) -> int:
        return sum(1 for c in self.risk_clauses if c.severity >= 4)
