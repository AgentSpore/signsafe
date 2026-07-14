"""Tenant-lease legality layer.

Deterministic ruleset that enriches the AI-detected clauses with an informational
legality classification (void / disputable / ok), a plain-RU gloss and a reference to
the applicable Russian norm (ГК РФ / ЖК РФ).

This is NOT a second analyser: it is a mapping layered on top of the existing
LLM-assigned ``clause_type``. It runs ONLY for the residential-lease tenant profile;
for every other analysis mode ``enrich_tenant_legality`` is a strict no-op, so the
default risk-check output is unchanged.

UPL-safety: every gloss is informational and hedged ("вероятно", "может"). It never
tells the reader that something is definitively illegal or that they should sue.
"""

from __future__ import annotations

from pydantic import BaseModel

from signsafe.schemas.clause import Legality
from signsafe.schemas.document import AnalysisResult
from signsafe.schemas.industry import is_residential_lease


class LegalityRule(BaseModel):
    """A single clause_type → legality mapping for the tenant profile."""

    legality: Legality
    gloss_ru: str
    norm_ref: str


# clause_type -> legality rule. Keyed on the clause_type the detection engine assigns.
# Covers the top residential-lease tenant traps.
TENANT_LEGALITY_RULES: dict[str, LegalityRule] = {
    "security_deposit": LegalityRule(
        legality="disputable",
        gloss_ru=(
            "Удержание депозита за естественный износ или без документального обоснования, "
            "вероятно, можно оспорить — арендодатель обязан вернуть обеспечительный платёж."
        ),
        norm_ref="ГК РФ ст. 622, 381.1",
    ),
    "early_termination": LegalityRule(
        legality="disputable",
        gloss_ru=(
            "Штраф за досрочный выезд — это неустойка; суд может снизить её как "
            "несоразмерную последствиям."
        ),
        norm_ref="ГК РФ ст. 330, 333, 610",
    ),
    "rent_escalation": LegalityRule(
        legality="disputable",
        gloss_ru=(
            "Одностороннее повышение арендной платы чаще одного раза в год или по "
            "усмотрению арендодателя, вероятно, недопустимо без вашего согласия."
        ),
        norm_ref="ГК РФ ст. 614 (п. 3)",
    ),
    "unilateral_change": LegalityRule(
        legality="disputable",
        gloss_ru=(
            "Право арендодателя в одностороннем порядке менять условия договора "
            "можно оспорить — по общему правилу это не допускается."
        ),
        norm_ref="ГК РФ ст. 310, 450",
    ),
    "maintenance_shift": LegalityRule(
        legality="disputable",
        gloss_ru=(
            "Возложение на арендатора ответственности за естественный (нормальный) износ "
            "имущества, вероятно, можно оспорить."
        ),
        norm_ref="ГК РФ ст. 616 (п. 2), 622",
    ),
    "third_party_restriction": LegalityRule(
        legality="disputable",
        gloss_ru=(
            "Полный запрет вселять членов семьи, включая несовершеннолетних детей, "
            "может быть признан недействительным."
        ),
        norm_ref="ГК РФ ст. 679, 680",
    ),
    "landlord_termination": LegalityRule(
        legality="void",
        gloss_ru=(
            "Внесудебное выселение или немотивированное досрочное расторжение по инициативе "
            "арендодателя, вероятно, ничтожно — расторжение допускается только через суд."
        ),
        norm_ref="ГК РФ ст. 619, 450; ЖК РФ ст. 687",
    ),
}


def enrich_tenant_legality(result: AnalysisResult, industry: str | None) -> AnalysisResult:
    """Attach legality / gloss / norm_ref to flagged clauses in the tenant profile.

    No-op (returns the result unchanged) for every non-residential-lease mode, so the
    existing default risk-check output is byte-identical.
    """
    if not is_residential_lease(industry):
        return result
    for clause in result.risk_clauses:
        rule = TENANT_LEGALITY_RULES.get(clause.clause_type)
        if rule is None:
            continue
        clause.legality = rule.legality
        clause.legality_gloss = rule.gloss_ru
        clause.norm_ref = rule.norm_ref
    return result
