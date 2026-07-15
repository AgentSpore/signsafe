"""Schema freeze: the new nullable/additive fields must not break existing consumers.

Proves an OLD-shaped payload (severity always an int, overall_risk_score always present,
no confidence field) still validates, and that the NEW abstention shape is representable.
"""

from __future__ import annotations

from signsafe.schemas.clause import RiskClause
from signsafe.schemas.document import AnalysisResult

# Exactly the payload shape the engine produced before RU v1 — nothing added/removed.
_LEGACY_CLAUSE: dict = {
    "clause_type": "security_deposit",
    "severity": 4,
    "title": "Депозит удерживается",
    "original_text": "...",
    "page_number": 1,
    "plain_english": "...",
    "why_risky": "...",
    "negotiation_counter": "...",
}

_LEGACY_RESULT: dict = {
    "overall_risk_score": 72,
    "recommendation": "WALK_AWAY",
    "summary": "...",
    "top_3_concerns": ["a", "b", "c"],
    "risk_clauses": [_LEGACY_CLAUSE],
}


# --- Backward compatibility ---------------------------------------------------

def test_legacy_clause_payload_still_validates() -> None:
    clause = RiskClause.model_validate(_LEGACY_CLAUSE)
    assert clause.severity == 4
    # New fields default to None — additive, never required.
    assert clause.confidence is None
    assert clause.legality is None


def test_legacy_result_payload_still_validates() -> None:
    result = AnalysisResult.model_validate(_LEGACY_RESULT)
    assert result.overall_risk_score == 72
    assert result.recommendation == "WALK_AWAY"
    assert result.critical_count == 1


def test_legacy_fields_survive_roundtrip() -> None:
    dumped = AnalysisResult.model_validate(_LEGACY_RESULT).model_dump()
    for key, value in _LEGACY_RESULT.items():
        if key == "risk_clauses":
            continue
        assert dumped[key] == value, f"legacy field {key} changed on roundtrip"


# --- New abstention shape is representable ------------------------------------

def test_clause_can_abstain_with_null_severity() -> None:
    payload = {**_LEGACY_CLAUSE, "severity": None, "confidence": "insufficient"}
    clause = RiskClause.model_validate(payload)
    assert clause.severity is None
    assert clause.confidence == "insufficient"


def test_result_can_omit_score_and_recommendation() -> None:
    payload = {k: v for k, v in _LEGACY_RESULT.items()
               if k not in ("overall_risk_score", "recommendation")}
    result = AnalysisResult.model_validate(payload)
    assert result.overall_risk_score is None
    assert result.recommendation is None


def test_critical_count_ignores_abstained_clauses() -> None:
    result = AnalysisResult.model_validate({
        **_LEGACY_RESULT,
        "risk_clauses": [
            {**_LEGACY_CLAUSE, "severity": None},
            {**_LEGACY_CLAUSE, "severity": 5},
        ],
    })
    assert result.critical_count == 1


# --- Severity counts replace the 0-100 score ----------------------------------

def test_severity_summary_buckets_and_is_serialized() -> None:
    result = AnalysisResult.model_validate({
        **_LEGACY_RESULT,
        "risk_clauses": [
            {**_LEGACY_CLAUSE, "severity": 5},
            {**_LEGACY_CLAUSE, "severity": 4},
            {**_LEGACY_CLAUSE, "severity": 2},
            {**_LEGACY_CLAUSE, "severity": 1},
            {**_LEGACY_CLAUSE, "severity": None},
        ],
    })
    summary = result.severity_summary
    assert (summary.critical, summary.disputable, summary.info, summary.abstained) == (
        2, 1, 1, 1,
    )
    # The UI reads the counts off the serialized payload (score is deprecated).
    assert result.model_dump()["severity_summary"]["critical"] == 2
