"""Google Translate egress (outbound.py inventory item 3).

The endpoint accepts arbitrary client strings, so the service — not the caller — is
responsible for making sure nothing with PII reaches Google.
"""

from __future__ import annotations

import re
from pathlib import Path

from signsafe.services.translate_service import TranslateService

_FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
FRONTEND_TRANSLATE = _FRONTEND / "lib" / "translate.ts"
FRONTEND_ANALYSIS_VIEW = _FRONTEND / "components" / "analysis-view.tsx"

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


def _strip_comments(ts: str) -> str:
    """Drop TS comments so prose *about* a deleted symbol cannot satisfy a grep for it."""
    ts = re.sub(r"/\*.*?\*/", "", ts, flags=re.DOTALL)
    return re.sub(r"^\s*//.*$", "", ts, flags=re.MULTILINE)


def test_frontend_translates_only_its_own_ui_strings() -> None:
    """The beta sends Google nothing derived from the user's document.

    This replaces an earlier guard that let ``translateAnalysis`` exist and merely checked
    it queued no raw quotes — it still shipped model-derived prose to Google whenever a
    user picked a non-RU locale. Result translation is now removed outright, so the
    assertion is the stronger one: the path does not exist.
    """
    code = _strip_comments(FRONTEND_TRANSLATE.read_text(encoding="utf-8"))

    assert "translateAnalysis" not in code, "analysis-translation path is back"

    # The egress helper stays module-private and has exactly one call site (its definition
    # plus that call), fed the static UI dictionary — never anything user-supplied.
    assert "export async function apiTranslate" not in code, "egress helper was exported"
    assert code.count("apiTranslate(") == 2, "apiTranslate gained a second call site"
    assert "apiTranslate(values" in code, "apiTranslate no longer fed the UI dictionary"

    # Nothing document-shaped may appear in the egress module at all.
    for doc_field in ("extracted_pages", "original_text", "risk_clauses", "summary"):
        assert doc_field not in code, f"document field {doc_field!r} reachable from egress"


def test_result_view_does_not_import_the_translation_module() -> None:
    """The RU-only result view must not re-acquire a translation path."""
    view = _strip_comments(FRONTEND_ANALYSIS_VIEW.read_text(encoding="utf-8"))
    assert "lib/translate" not in view, "result view imports the translation module again"
