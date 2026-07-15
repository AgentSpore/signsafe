"""Local PII redaction — runs BEFORE any text is sent to the foreign LLM (152-ФЗ).

Best-effort regex + labeled-field masking. The analysis works on clause *structure*
(keywords, headings, obligations), not on the identities of the parties, so masking PII
with a fixed placeholder does not degrade clause detection.

This REDUCES but does not ELIMINATE 152-ФЗ exposure: residual unredacted fragments and
the cross-border transfer itself remain. The product ships as an explicit beta and the
privacy copy states exactly what is redacted locally.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

PLACEHOLDER = "[СКРЫТО]"


@dataclass
class RedactionResult:
    text: str
    # RU category labels of what was masked, in stable display order (for the UI).
    categories: list[str]


# --- Full-span patterns (the whole match is PII) ------------------------------
# Ordered most-specific first so longer digit runs are consumed before phones.
_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
_CARD = re.compile(r"\b(?:\d{4}[ \-]?){4}\b")
_ACCOUNT_20 = re.compile(r"\b\d{20}\b")
_SNILS = re.compile(r"\b\d{3}-\d{3}-\d{3}[ ]?\d{2}\b")
_PHONE = re.compile(r"(?:\+7|\b8)[ \-(]*\d{3}[ \-)]*\d{3}[ \-]*\d{2}[ \-]*\d{2}\b")
# ФИО: three consecutive capitalized Cyrillic words (surname + name + patronymic).
_FIO_TRIPLE = re.compile(r"\b[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+\s+[А-ЯЁ][а-яё]+(?:ич|вна|чна)\b")

# --- Label-preserving patterns (keep the label, mask the value) ---------------
# Each keeps group 1 (label) and masks the rest of the value.
_INN = re.compile(r"(ИНН[^\d]{0,5})\d{10,12}", re.IGNORECASE)
_PASSPORT = re.compile(
    r"(паспорт[^\d]{0,40}?)\d{2}[ ]?\d{2}[ ]?(?:№[ ]?)?\d{6}", re.IGNORECASE
)
_ACCOUNT_LABELED = re.compile(
    r"((?:р/?с|расч[её]тн\w* сч\w*|л/с|счёт|счет)[^\d]{0,15})\d{11,20}", re.IGNORECASE
)
# Labeled name / address fields — mask value to end of line.
# A separator (":" / "-") is REQUIRED: party words like "Наймодатель" also open ordinary
# clause sentences ("Наймодатель передаёт Нанимателю жилое помещение..."), and matching
# those on a bare space would redact the clause text the analysis depends on.
_FIO_LABEL = re.compile(
    r"(ФИО|Ф\.И\.О\.|наниматель|наймодатель|арендатор|арендодатель)"
    r"(\s*[:\-]\s*)([^\n]{2,80})",
    re.IGNORECASE,
)
# "в лице <ФИО>" is unambiguous — no separator needed.
_FIO_IN_PERSON = re.compile(r"(в лице)(\s+)([^\n,]{2,80})", re.IGNORECASE)
_ADDRESS_LABEL = re.compile(
    r"(адрес(?:у)?(?:\s+регистрации|\s+проживания)?|зарегистрирован\w*\s+по\s+адресу|"
    r"проживающ\w*\s+по\s+адресу)(\s*[:\-]?\s*)([^\n]{2,120})",
    re.IGNORECASE,
)
# Signature blocks: dotted/underscored signature lines and М.П.
_SIGNATURE = re.compile(r"(подпись[^\n]{0,40}?)[_\.]{3,}", re.IGNORECASE)

# key -> (RU label, apply function). Order defines application + display order.
_CATEGORY_LABELS: dict[str, str] = {
    "email": "Электронная почта",
    "card": "Номер карты",
    "bank_account": "Банковский счёт",
    "inn": "ИНН",
    "snils": "СНИЛС",
    "passport": "Паспортные данные",
    "phone": "Телефон",
    "full_name": "ФИО",
    "address": "Адрес",
    "signature": "Подпись",
}


def _sub_full(pattern: re.Pattern[str], text: str) -> tuple[str, bool]:
    new_text, n = pattern.subn(PLACEHOLDER, text)
    return new_text, n > 0


def _sub_labeled(pattern: re.Pattern[str], text: str, repl: str) -> tuple[str, bool]:
    new_text, n = pattern.subn(repl, text)
    return new_text, n > 0


def redact(text: str) -> RedactionResult:
    """Mask PII in ``text`` and report which categories were redacted."""
    found: set[str] = set()

    # Full-span, most-specific-digits first.
    text, hit = _sub_full(_EMAIL, text)
    if hit:
        found.add("email")
    text, hit = _sub_full(_CARD, text)
    if hit:
        found.add("card")
    text, hit = _sub_labeled(_ACCOUNT_LABELED, text, rf"\1{PLACEHOLDER}")
    if hit:
        found.add("bank_account")
    text, hit = _sub_full(_ACCOUNT_20, text)
    if hit:
        found.add("bank_account")
    text, hit = _sub_labeled(_INN, text, rf"\1{PLACEHOLDER}")
    if hit:
        found.add("inn")
    text, hit = _sub_full(_SNILS, text)
    if hit:
        found.add("snils")
    text, hit = _sub_labeled(_PASSPORT, text, rf"\1{PLACEHOLDER}")
    if hit:
        found.add("passport")
    text, hit = _sub_full(_PHONE, text)
    if hit:
        found.add("phone")
    text, hit = _sub_labeled(_FIO_LABEL, text, rf"\1\2{PLACEHOLDER}")
    if hit:
        found.add("full_name")
    text, hit = _sub_labeled(_FIO_IN_PERSON, text, rf"\1\2{PLACEHOLDER}")
    if hit:
        found.add("full_name")
    text, hit = _sub_full(_FIO_TRIPLE, text)
    if hit:
        found.add("full_name")
    text, hit = _sub_labeled(_ADDRESS_LABEL, text, rf"\1\2{PLACEHOLDER}")
    if hit:
        found.add("address")
    text, hit = _sub_labeled(_SIGNATURE, text, rf"\1{PLACEHOLDER}")
    if hit:
        found.add("signature")

    categories = [_CATEGORY_LABELS[k] for k in _CATEGORY_LABELS if k in found]
    return RedactionResult(text=text, categories=categories)
