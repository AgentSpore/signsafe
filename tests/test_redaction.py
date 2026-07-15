"""Local PII redaction (152-ФЗ): PII must be masked before the text reaches the LLM,
while the clause structure the analysis relies on stays intact."""

from __future__ import annotations

import re

import pytest

from signsafe.services import redaction as redaction_module
from signsafe.services.redaction import PLACEHOLDER, redact


# --- Pattern-class regression guard -------------------------------------------
# ROOT CAUSE (found in round 2, missed once in round 3): under re.IGNORECASE the class
# [А-ЯЁ] also matches lowercase, so every "must look like a Name/City" guard silently
# stops discriminating and ordinary clause text gets redacted. This test catches the
# whole CLASS instead of one sentence at a time — a new pattern reintroducing it fails.

def _module_patterns() -> list[tuple[str, re.Pattern[str]]]:
    return [
        (name, obj)
        for name, obj in vars(redaction_module).items()
        if isinstance(obj, re.Pattern)
    ]


def test_module_actually_exposes_patterns_to_audit() -> None:
    # Guard the guard: if the patterns move, the audit below must not silently pass.
    assert len(_module_patterns()) >= 10


@pytest.mark.parametrize("name,pattern", _module_patterns())
def test_no_pattern_defeats_case_shape(name: str, pattern: re.Pattern[str]) -> None:
    uses_case_shape = "А-ЯЁ" in pattern.pattern
    global_ignorecase = bool(pattern.flags & re.IGNORECASE)
    assert not (uses_case_shape and global_ignorecase), (
        f"{name} combines a case-sensitive [А-ЯЁ] shape with global re.IGNORECASE — the "
        f"shape is defeated (lowercase matches too) and clause text will be redacted. "
        f"Scope the flag with (?i:...) on the label instead."
    )

_LEASE = """ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ

Наймодатель: Иванов Иван Иванович, паспорт 40 08 123456, ИНН 771234567890,
СНИЛС 123-456-789 00, телефон +7 (916) 123-45-67, e-mail ivanov@example.ru,
зарегистрирован по адресу: г. Москва, ул. Ленина, д. 5, кв. 12.
Реквизиты: р/с 40817810099910004312, карта 4276 3800 1234 5678.

1. ПРЕДМЕТ ДОГОВОРА
1.1. Наймодатель передаёт Нанимателю жилое помещение во временное владение.
2. ОТВЕТСТВЕННОСТЬ СТОРОН
2.1. Обеспечительный платёж удерживается в полном объёме при досрочном расторжении.

Подпись Наймодателя ___________
"""


def _redacted(text: str = _LEASE):
    return redact(text)


# --- Each PII category is masked ---------------------------------------------

def test_email_phone_and_ids_are_masked() -> None:
    out = _redacted()
    for leaked in (
        "ivanov@example.ru",
        "+7 (916) 123-45-67",
        "771234567890",
        "123-456-789 00",
        "40817810099910004312",
        "4276 3800 1234 5678",
        "123456",  # passport number
    ):
        assert leaked not in out.text, f"PII leaked to LLM: {leaked}"


def test_full_name_and_address_are_masked() -> None:
    out = _redacted()
    assert "Иванов Иван Иванович" not in out.text
    assert "ул. Ленина" not in out.text


def test_reported_categories_cover_what_was_masked() -> None:
    categories = set(_redacted().categories)
    assert {
        "Электронная почта", "Телефон", "ИНН", "СНИЛС",
        "Банковский счёт", "Номер карты", "Паспортные данные",
        "ФИО", "Адрес", "Подпись",
    } <= categories


def test_placeholder_is_used() -> None:
    assert PLACEHOLDER in _redacted().text


# --- Redaction must not destroy the clause structure --------------------------

def test_clause_structure_survives_redaction() -> None:
    out = _redacted()
    for marker in (
        "ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ",
        "ПРЕДМЕТ ДОГОВОРА",
        "ОТВЕТСТВЕННОСТЬ СТОРОН",
        "Обеспечительный платёж удерживается в полном объёме",
        "жилое помещение во временное владение",
    ):
        assert marker in out.text, f"redaction destroyed clause signal: {marker}"


# --- False positives: clause text that merely LOOKS like a labeled field ------
# Regression guards. Each of these was (or would be) eaten by a label+rest-of-line rule,
# silently deleting the clause the analysis depends on.

@pytest.mark.parametrize("sentence", [
    # Party word opening an ordinary clause sentence.
    "Наймодатель передаёт Нанимателю жилое помещение во временное владение.",
    # Party word WITH a colon, but the value is a verb phrase, not a name.
    "Наниматель: обязуется вносить плату не позднее 5 числа каждого месяца.",
    "Наймодатель: обязуется передать помещение в пригодном для проживания состоянии.",
    # Bare "по адресу" — ordinary clause language, no address value.
    "Уведомление направляется по адресу Наймодателя, указанному в договоре.",
    "Стороны согласовали, что адрес для уведомлений может быть изменён.",
    # "в лице" followed by a role, not a name.
    "Организация в лице генерального директора действует на основании устава.",
    # Lowercase "г." / "ул." inside ordinary prose — _ADDRESS_SHAPED under IGNORECASE
    # would have matched the lowercase city shape and eaten the rest of the line.
    "Срок найма исчисляется с 1 г. и продлевается сторонами по соглашению.",
])
def test_clause_sentences_are_not_mistaken_for_pii_fields(sentence: str) -> None:
    out = redact(sentence)
    assert out.text == sentence, f"redaction destroyed clause text: {out.text}"
    assert out.categories == []


def test_labeled_name_field_is_still_redacted_after_the_fix() -> None:
    # The fix must not silently disable real redaction.
    out = redact("Наймодатель: Иванов Иван Иванович")
    assert "Иванов Иван Иванович" not in out.text
    assert "ФИО" in out.categories


def test_labeled_address_field_is_still_redacted_after_the_fix() -> None:
    out = redact("Адрес: г. Москва, ул. Ленина, д. 5, кв. 12")
    assert "Ленина" not in out.text
    assert "Адрес" in out.categories


def test_in_person_name_is_still_redacted() -> None:
    out = redact("Договор подписан в лице Иванова И. И. по доверенности")
    assert "Иванова И. И." not in out.text
    assert "по доверенности" in out.text


def test_clean_text_reports_no_categories_and_is_unchanged() -> None:
    clean = "1. ПРЕДМЕТ ДОГОВОРА\n1.1. Стороны заключили настоящий договор."
    out = redact(clean)
    assert out.categories == []
    assert out.text == clean
