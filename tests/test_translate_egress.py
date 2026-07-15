"""Google Translate egress (outbound.py inventory item 3).

The endpoint accepts arbitrary client strings, so the service — not the caller — is
responsible for making sure nothing with PII reaches Google.
"""

from __future__ import annotations

from pathlib import Path

from signsafe.services.translate_service import TranslateService

FRONTEND_TRANSLATE = (
    Path(__file__).resolve().parents[1] / "frontend" / "lib" / "translate.ts"
)

_PII_LINE = "Наймодатель: Иванов Иван Иванович, тел. +7 (916) 123-45-67, ivanov@example.ru"


class _SpyTranslate(TranslateService):
    """Captures what would be sent to Google instead of calling it."""

    def __init__(self) -> None:
        super().__init__()
        self.sent: list[str] = []

    async def _translate_one(self, text: str, google_lang: str) -> str:
        self.sent.append(text)
        return f"[{google_lang}] {text}"


async def test_pii_is_redacted_before_reaching_google() -> None:
    svc = _SpyTranslate()
    await svc.translate([_PII_LINE], "en")
    assert svc.sent, "nothing was sent — test would pass vacuously"
    joined = " ".join(svc.sent)
    for leaked in ("Иванов Иван Иванович", "+7 (916) 123-45-67", "ivanov@example.ru"):
        assert leaked not in joined, f"PII reached Google Translate: {leaked}"


async def test_ru_locale_never_egresses_at_all() -> None:
    svc = _SpyTranslate()
    out = await svc.translate([_PII_LINE], "ru")
    assert svc.sent == []
    assert out == [_PII_LINE]


async def test_clean_analysis_prose_is_translated_normally() -> None:
    svc = _SpyTranslate()
    prose = "Депозит удерживается полностью при досрочном расторжении."
    out = await svc.translate([prose], "en")
    assert svc.sent == [prose]  # unchanged by redaction — nothing to mask
    assert out[0].startswith("[en]")


async def test_redaction_happens_before_the_cache() -> None:
    # If the cache were keyed on raw text, a later identical request could serve (or
    # store) unredacted content. Redaction must precede the lookup.
    svc = _SpyTranslate()
    await svc.translate([_PII_LINE], "en")
    svc.sent.clear()
    await svc.translate([_PII_LINE], "en")
    assert svc.sent == [], "second call re-sent to Google (cache keyed on raw text?)"


# --- The caller must not even ask for document content -----------------------

def test_frontend_does_not_send_raw_document_or_quotes_for_translation() -> None:
    src = FRONTEND_TRANSLATE.read_text(encoding="utf-8")
    body = src.split("const strings: string[] = [];")[1].split("await apiTranslate")[0]
    # The raw document and verbatim contract quotes must never be pushed for translation.
    assert "push(p.text" not in body, "raw extracted page text queued for translation"
    assert "extracted_pages" not in body, "extracted_pages queued for translation"
    assert "original_text" not in body, "verbatim contract quote queued for translation"
    # Model-derived analysis prose is still translated.
    assert "data.summary" in body
    assert "c.why_risky" in body
