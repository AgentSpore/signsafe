"""Local PII redaction (152-ФЗ): PII must be masked before the text reaches the LLM,
while the clause structure the analysis relies on stays intact."""

from __future__ import annotations

from signsafe.services.redaction import PLACEHOLDER, redact

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


def test_clean_text_reports_no_categories_and_is_unchanged() -> None:
    clean = "1. ПРЕДМЕТ ДОГОВОРА\n1.1. Стороны заключили настоящий договор."
    out = redact(clean)
    assert out.categories == []
    assert out.text == clean
