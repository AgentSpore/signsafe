"""Document DTOs."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, computed_field

from signsafe.schemas.clause import RiskClause

Recommendation = Literal[
    # Contract recommendations
    "SAFE_TO_SIGN", "NEGOTIATE_FIRST", "WALK_AWAY",
    # Medical bill recommendations
    "LOOKS_FAIR", "REVIEW_CAREFULLY", "DISPUTE_NOW",
]


class SeveritySummary(BaseModel):
    """Severity counts that replace the opaque 0-100 score (codex: false precision)."""

    critical: int = Field(default=0, description="Клаузул уровня 4-5 (критично)")
    disputable: int = Field(default=0, description="Клаузул уровня 2-3 (спорно)")
    info: int = Field(default=0, description="Клаузул уровня 1 (информационно)")
    abstained: int = Field(default=0, description="Клаузул без уверенного вердикта")


class AnalysisResult(BaseModel):
    """Full AI analysis output — returned directly to client."""

    # DEPRECATED (RU v1): the opaque 0-100 score conveys false precision. The engine no
    # longer produces it (see agents.py) — it is kept nullable/optional only so older
    # clients that still read the field validate. Use ``severity_summary`` instead.
    overall_risk_score: int | None = Field(default=None, ge=0, le=100)
    recommendation: Recommendation | None = Field(
        default=None, description="None when the model abstains from an overall verdict"
    )
    summary: str = Field(description="3-paragraph executive summary")
    top_3_concerns: list[str] = Field(min_length=0, max_length=3)
    risk_clauses: list[RiskClause] = Field(default_factory=list)

    @property
    def critical_count(self) -> int:
        return sum(1 for c in self.risk_clauses if c.severity is not None and c.severity >= 4)

    @computed_field  # serialized for the UI — replaces the deprecated 0-100 score
    @property
    def severity_summary(self) -> SeveritySummary:
        summary = SeveritySummary()
        for c in self.risk_clauses:
            if c.severity is None:
                summary.abstained += 1
            elif c.severity >= 4:
                summary.critical += 1
            elif c.severity >= 2:
                summary.disputable += 1
            else:
                summary.info += 1
        return summary
