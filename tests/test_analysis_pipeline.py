"""Analysis pipeline gates: deprecated presets, the deterministic non-contract
pre-check, and norm_ref provenance. None of these may call the LLM."""

from __future__ import annotations

import asyncio

import pytest

from signsafe.core.config import settings
from signsafe.schemas.clause import RiskClause
from signsafe.schemas.document import AnalysisResult
from signsafe.schemas.industry import DEPRECATED_INDUSTRIES, Industry, is_deprecated_industry
from signsafe.schemas.precheck import NotContractResult, UnsupportedModeResult
from signsafe.services.analysis_service import (
    AnalysisService,
    _drop_risk_score,
    _strip_llm_norm_refs,
)
from signsafe.services.agents import lease_agent
from signsafe.services.contract_precheck import looks_like_contract
from signsafe.services.pdf_service import ExtractedDocument, PageText

_CONTRACT_TEXT = (
    "ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ\n"
    "Стороны заключили настоящий договор о нижеследующем.\n"
    "1. ПРЕДМЕТ ДОГОВОРА. Наймодатель передаёт Нанимателю жилое помещение.\n"
    "2. ОТВЕТСТВЕННОСТЬ СТОРОН. Наниматель обязуется вносить плату ежемесячно.\n"
    "3. Реквизиты и подписи сторон.\n"
) * 3


def _extracted(text: str) -> ExtractedDocument:
    return ExtractedDocument(
        num_pages=1, pages=[PageText(page_number=1, text=text)], used_ocr=False
    )


def _result_with_clause(norm_ref: str | None) -> AnalysisResult:
    """An LLM-shaped result: a score and (optionally) a model-invented norm_ref."""
    return AnalysisResult(
        overall_risk_score=50,
        recommendation="NEGOTIATE_FIRST",
        summary="s",
        top_3_concerns=[],
        risk_clauses=[
            RiskClause(
                clause_type="security_deposit",
                severity=4,
                title="t",
                original_text="o",
                page_number=1,
                plain_english="p",
                why_risky="w",
                negotiation_counter="n",
                legality="void" if norm_ref else None,
                legality_gloss="галлюцинация модели" if norm_ref else None,
                norm_ref=norm_ref,
            )
        ],
    )


# --- Deterministic non-contract pre-check (no LLM) ----------------------------

def test_precheck_accepts_a_contract() -> None:
    assert looks_like_contract(_CONTRACT_TEXT)


@pytest.mark.parametrize("text", [
    "",
    "Привет! Вот фото с отпуска, было здорово. Погода отличная.",
    "Чек №123 Магазин Пятёрочка Хлеб 45.90 Молоко 89.00 ИТОГО 134.90",
])
def test_precheck_rejects_non_contract(text: str) -> None:
    assert not looks_like_contract(text)


async def test_non_contract_returns_typed_result_not_exception() -> None:
    outcome = await AnalysisService().analyze(_extracted("просто заметка о погоде"))
    assert isinstance(outcome.result, NotContractResult)
    assert outcome.result.status == "not_contract"
    assert "не похоже на договор" in outcome.result.message


# --- Deprecated US presets ----------------------------------------------------

def test_deprecated_enum_values_are_kept_for_clients() -> None:
    # Removing enum values breaks existing clients — they must still be valid Industry.
    for value in DEPRECATED_INDUSTRIES:
        assert value in Industry.__args__
        assert is_deprecated_industry(value)


@pytest.mark.parametrize("industry", sorted(DEPRECATED_INDUSTRIES))
async def test_deprecated_preset_returns_unsupported_never_reanalyzed(industry: str) -> None:
    outcome = await AnalysisService().analyze(_extracted(_CONTRACT_TEXT), industry=industry)
    assert isinstance(outcome.result, UnsupportedModeResult)
    assert outcome.result.industry == industry
    assert "не поддерживается" in outcome.result.message


def test_supported_presets_are_not_deprecated() -> None:
    for industry in ("residential_lease", "employment", "loan", "service",
                     "purchase", "insurance", "restaurant", "other"):
        assert not is_deprecated_industry(industry)


# --- norm_ref provenance ------------------------------------------------------

def test_engine_drops_any_model_supplied_risk_score() -> None:
    # The prompt says not to compute one, but the field is still schema-valid — the
    # engine must null it so no 0-100 score ever reaches the client.
    result = _result_with_clause(norm_ref=None)
    assert result.overall_risk_score == 50
    _drop_risk_score(result)
    assert result.overall_risk_score is None
    # Severity counts are what the client reads instead.
    assert result.model_dump()["severity_summary"]["critical"] == 1


def test_llm_supplied_norm_refs_are_stripped() -> None:
    # A hallucinating model may fill legality/norm_ref itself — it must be discarded so
    # only the deterministic tenant_legality allowlist can populate these fields.
    result = _result_with_clause(norm_ref="ГК РФ ст. 9999 (выдумано моделью)")
    _strip_llm_norm_refs(result)
    clause = result.risk_clauses[0]
    assert clause.norm_ref is None
    assert clause.legality is None
    assert clause.legality_gloss is None


@pytest.mark.asyncio
async def test_a_stalled_llm_is_cut_off_by_the_total_budget(monkeypatch) -> None:
    """A STALLED upstream — the case the retry tests cannot cover, because they all fail
    fast (429/503/dead socket). Here the provider simply never answers.

    Without a total budget nothing bounds this: the per-request timeout is multiplied by
    retries, and the frontend's AbortSignal only disconnects the client — the worker keeps
    grinding. The budget must cut it, and the failure must still be TYPE-only (no document
    text, no provider message).
    """
    stalled = asyncio.Event()

    async def never_answers(*args, **kwargs):
        await stalled.wait()  # blocks until the budget expires

    monkeypatch.setattr(settings, "llm_total_seconds", 0.05)
    monkeypatch.setattr(lease_agent, "run", never_answers)

    with pytest.raises(RuntimeError) as excinfo:
        await AnalysisService().analyze(_extracted(_CONTRACT_TEXT))

    assert "TimeoutError" in str(excinfo.value), (
        f"budget must surface as a timeout, got: {excinfo.value}"
    )
    # The RuntimeError carries an exception TYPE name and nothing else.
    assert _CONTRACT_TEXT[:40] not in str(excinfo.value)
