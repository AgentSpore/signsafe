"""Tests for the residential-lease tenant profile: preset routing, legality
classification, tenant-trap coverage, UPL-safety, disclaimer and backward-compat."""

from __future__ import annotations

import copy
from pathlib import Path

import pytest

from signsafe.schemas.clause import RiskClause
from signsafe.schemas.document import AnalysisResult
from signsafe.schemas.industry import (
    DOCUMENT_TYPES,
    INDUSTRY_FOCUS,
    get_focus,
    is_residential_lease,
)
from signsafe.services.tenant_legality import (
    TENANT_LEGALITY_RULES,
    enrich_tenant_legality,
)

FRONTEND_LIB = Path(__file__).resolve().parents[1] / "frontend" / "lib"
FRONTEND_COMPONENTS = Path(__file__).resolve().parents[1] / "frontend" / "components"
I18N_FILE = FRONTEND_LIB / "i18n.ts"
ANALYSIS_VIEW_FILE = FRONTEND_COMPONENTS / "analysis-view.tsx"


def _clause(clause_type: str, severity: int = 4) -> RiskClause:
    return RiskClause(
        clause_type=clause_type,
        severity=severity,
        title=f"Trap: {clause_type}",
        original_text="...",
        page_number=1,
        plain_english="...",
        why_risky="...",
        negotiation_counter="...",
    )


def _result(clauses: list[RiskClause]) -> AnalysisResult:
    return AnalysisResult(
        overall_risk_score=55,
        recommendation="NEGOTIATE_FIRST",
        summary="summary",
        top_3_concerns=["a", "b"],
        risk_clauses=clauses,
    )


# --- Preset routing -----------------------------------------------------------

def test_preset_registered_and_selectable() -> None:
    assert is_residential_lease("residential_lease")
    assert is_residential_lease("RESIDENTIAL_LEASE")  # case-insensitive
    assert not is_residential_lease("restaurant")
    assert not is_residential_lease(None)
    assert "residential_lease" in INDUSTRY_FOCUS
    ids = {d["id"] for d in DOCUMENT_TYPES}
    assert "residential_lease" in ids


def test_preset_focus_is_tenant_lens() -> None:
    focus = get_focus("residential_lease")
    # RU v1: наём terminology — «наниматель», not «арендатор» (see tenant_legality).
    assert "НАНИМАТЕЛЯ" in focus
    # Distinct from the generic fallback preset.
    assert focus != get_focus("other")
    assert focus != get_focus(None)


# --- Legality classification + tenant-trap coverage ---------------------------

REQUIRED_TRAPS = {
    # Norms per RU-law re-check: наём (гл. 35 ГК), not аренда (гл. 34).
    "security_deposit": ("disputable", "381.1"),
    "early_termination": ("disputable", "687"),  # 3-month notice right (ГК 687)
    "rent_escalation": ("disputable", "682"),  # rent increase (ГК 682)
    "unilateral_change": ("disputable", "310"),
    "maintenance_shift": ("disputable", "678"),  # wear vs damage (ГК 678)
    "third_party_restriction": ("disputable", "679"),
    "landlord_termination": ("void", "687"),  # court-only termination
}


@pytest.mark.parametrize("clause_type,expected", REQUIRED_TRAPS.items())
def test_each_trap_classified_with_norm_ref(
    clause_type: str, expected: tuple[str, str]
) -> None:
    expected_legality, expected_norm_fragment = expected
    result = enrich_tenant_legality(_result([_clause(clause_type)]), "residential_lease")
    clause = result.risk_clauses[0]
    assert clause.legality == expected_legality
    assert clause.legality_gloss  # non-empty gloss
    assert clause.norm_ref and expected_norm_fragment in clause.norm_ref


def test_norm_refs_reference_ru_law() -> None:
    for rule in TENANT_LEGALITY_RULES.values():
        assert "ГК РФ" in rule.norm_ref or "ЖК РФ" in rule.norm_ref


def test_landlord_eviction_is_void() -> None:
    result = enrich_tenant_legality(
        _result([_clause("landlord_termination")]), "residential_lease"
    )
    assert result.risk_clauses[0].legality == "void"


def test_rent_increase_and_early_termination_are_conditional_not_void() -> None:
    # RU-law nuance: a contractual rent-increase mechanism (ГК 682) and an
    # early-termination penalty (ГК 687) are CONTENTIOUS, never blanket 🔴 void.
    for clause_type in ("rent_escalation", "early_termination"):
        rule = TENANT_LEGALITY_RULES[clause_type]
        assert rule.legality == "disputable", clause_type


def test_rent_increase_gloss_states_contractual_carve_out() -> None:
    # Must NOT claim the mere existence of a rent-increase clause is unlawful.
    gloss = TENANT_LEGALITY_RULES["rent_escalation"].gloss_ru.lower()
    assert "предусмотрено договором" in gloss
    assert "682" in TENANT_LEGALITY_RULES["rent_escalation"].norm_ref


def test_early_termination_gloss_states_three_month_notice() -> None:
    gloss = TENANT_LEGALITY_RULES["early_termination"].gloss_ru.lower()
    assert "три месяца" in gloss


def test_residential_prompt_uses_naem_terminology_like_the_rules() -> None:
    # The prompt must not drift from tenant_legality/demo (which say наниматель).
    focus = INDUSTRY_FOCUS["residential_lease"]
    assert "наниматель" in focus.lower()
    assert "наймодател" in focus.lower()
    assert "АРЕНДАТОРА" not in focus
    assert "арендодателя" not in focus.lower()


def test_glosses_use_naem_terminology() -> None:
    # Residential lease to an individual = наниматель / наймодатель (not арендатор).
    joined = " ".join(r.gloss_ru.lower() for r in TENANT_LEGALITY_RULES.values())
    assert "наниматель" in joined or "наймодател" in joined
    assert "арендодател" not in joined


def test_unmapped_clause_left_unclassified() -> None:
    # A clause type with no tenant rule keeps legality None even in tenant mode.
    result = enrich_tenant_legality(_result([_clause("cam_charges")]), "residential_lease")
    assert result.risk_clauses[0].legality is None


# --- Pre-signing checklist derivation ----------------------------------------

def test_checklist_lists_void_and_disputable_items() -> None:
    result = enrich_tenant_legality(
        _result(
            [
                _clause("landlord_termination"),  # void
                _clause("security_deposit"),  # disputable
                _clause("cam_charges"),  # unclassified
            ]
        ),
        "residential_lease",
    )
    checklist = [c for c in result.risk_clauses if c.legality in ("void", "disputable")]
    assert len(checklist) == 2
    assert {c.clause_type for c in checklist} == {
        "landlord_termination",
        "security_deposit",
    }


# --- UPL safety ---------------------------------------------------------------

def test_glosses_are_hedged_and_not_directive() -> None:
    for rule in TENANT_LEGALITY_RULES.values():
        gloss = rule.gloss_ru.lower()
        assert any(h in gloss for h in ("вероятно", "может", "можно")), rule.gloss_ru
        # Never instruct the reader to sue / declare something definitively illegal.
        assert "подавайте в суд" not in gloss
        assert "это незаконно" not in gloss


def test_output_disclaimer_present_in_i18n() -> None:
    text = I18N_FILE.read_text(encoding="utf-8")
    assert '"checklist.disclaimer"' in text
    assert "не является юридической консультацией" in text


def test_disclaimer_shown_in_tenant_mode_even_with_zero_classified_clauses() -> None:
    # Clean-lease case: the disclaimer must render whenever the analysis is in the
    # residential_lease profile, decoupled from the checklist being non-empty.
    view = ANALYSIS_VIEW_FILE.read_text(encoding="utf-8")
    # Tenant mode derived from the industry, not from clause count.
    assert 'data.industry === "residential_lease"' in view
    # The disclaimer block is gated on tenant mode OR a non-empty checklist,
    # so a clean lease (checklist empty) still shows it.
    assert "(isTenantMode || checklist.length > 0)" in view
    assert 't("checklist.disclaimer")' in view
    # The badge list itself stays gated on a non-empty checklist.
    assert "checklist.length > 0" in view


# --- Backward-compat: default mode unchanged ----------------------------------

def test_non_tenant_mode_is_noop_output_identical() -> None:
    base = _result([_clause("cam_charges"), _clause("security_deposit")])
    before = copy.deepcopy(base).model_dump()
    for industry in (None, "restaurant", "medical_bill", "hoa", "loan"):
        after = enrich_tenant_legality(copy.deepcopy(base), industry).model_dump()
        assert after == before, f"enrichment mutated output for industry={industry}"


def test_default_clause_has_null_legality_fields() -> None:
    clause = _clause("security_deposit")
    assert clause.legality is None
    assert clause.legality_gloss is None
    assert clause.norm_ref is None
