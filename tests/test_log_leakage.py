"""Document text must NEVER reach the logs.

Provider exceptions routinely embed the request body — i.e. the (redacted-but-still
document-derived) contract text — in their message. `logger.error("...: {}", exc)` then
writes that into logs, which persist. That contradicts both the shipped claim that logs
hold "counts/types only" AND the claim that we keep no durable store at all.

Each test raises an exception whose MESSAGE contains sentinel document text, drives the
failure path, and asserts the sentinel never appears in captured log output.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest
from loguru import logger

from signsafe.core.errors import UserMessageError
from signsafe.schemas.clause import RiskClause
from signsafe.services import analysis_service as analysis_mod
from signsafe.services import negotiation_service as neg_mod
from signsafe.services.analysis_service import AnalysisService
from signsafe.services.negotiation_service import NegotiationService
from signsafe.services.pdf_service import ExtractedDocument, PageText

SRC = Path(__file__).resolve().parents[1] / "src" / "signsafe"

# Sentinel that looks like real contract content inside a provider error message.
SENTINEL = "СЕКРЕТНЫЙ-ПУНКТ-ДОГОВОРА-42 Наймодатель удерживает депозит"
PROVIDER_ERROR = (
    f"400 Bad Request from provider: {{'prompt': '{SENTINEL}', 'model': 'x'}}"
)

_CONTRACT = (
    "ДОГОВОР НАЙМА ЖИЛОГО ПОМЕЩЕНИЯ\n"
    "Стороны заключили настоящий договор о нижеследующем.\n"
    "1. ПРЕДМЕТ ДОГОВОРА. Наймодатель передаёт Нанимателю жилое помещение.\n"
    "2. ОТВЕТСТВЕННОСТЬ СТОРОН. Наниматель обязуется вносить плату.\n"
    "3. Реквизиты и подписи сторон.\n"
) * 3


@pytest.fixture
def captured_logs():
    """Capture everything loguru emits, at every level."""
    sink: list[str] = []
    handler_id = logger.add(sink.append, level="DEBUG", format="{message}")
    yield sink
    logger.remove(handler_id)


def _extracted(text: str) -> ExtractedDocument:
    return ExtractedDocument(
        num_pages=1, pages=[PageText(page_number=1, text=text)], used_ocr=False
    )


class _LeakyAgent:
    """A provider that fails with the document text inside its exception message."""

    async def run(self, prompt: str, **kwargs):
        raise RuntimeError(PROVIDER_ERROR)


# --- Analyze path -------------------------------------------------------------

async def test_analyze_provider_error_does_not_leak_document_text_to_logs(
    captured_logs, monkeypatch
) -> None:
    monkeypatch.setattr(analysis_mod, "lease_agent", _LeakyAgent())
    monkeypatch.setattr(analysis_mod, "make_model", lambda name: name)

    with pytest.raises(RuntimeError) as excinfo:
        await AnalysisService().analyze(_extracted(_CONTRACT), industry="residential_lease")

    blob = "\n".join(captured_logs)
    assert SENTINEL not in blob, "document text leaked into the logs via a provider error"
    assert PROVIDER_ERROR not in blob
    # The failure is still diagnosable — by TYPE.
    assert "RuntimeError" in blob
    # And the raised error itself must not carry the provider message forward.
    assert SENTINEL not in str(excinfo.value), "RuntimeError wrapper carries the leak"


async def test_raised_runtime_error_does_not_carry_provider_message(monkeypatch) -> None:
    # `raise ... from exc` would re-attach the provider message to any handler that
    # formats the traceback, so the cause chain must stay detached.
    monkeypatch.setattr(analysis_mod, "lease_agent", _LeakyAgent())
    monkeypatch.setattr(analysis_mod, "make_model", lambda name: name)
    with pytest.raises(RuntimeError) as excinfo:
        await AnalysisService().analyze(_extracted(_CONTRACT))
    assert excinfo.value.__cause__ is None
    assert SENTINEL not in str(excinfo.value)


# --- Negotiation path ---------------------------------------------------------

async def test_negotiation_provider_error_does_not_leak_to_logs(
    captured_logs, monkeypatch
) -> None:
    monkeypatch.setattr(neg_mod, "negotiation_agent", _LeakyAgent())
    clause = RiskClause(
        clause_type="security_deposit",
        severity=4,
        title="Депозит",
        original_text=SENTINEL,
        page_number=1,
        plain_english="p",
        why_risky="w",
        negotiation_counter="c",
    )
    with pytest.raises(RuntimeError):
        await NegotiationService().generate([clause])

    blob = "\n".join(captured_logs)
    assert SENTINEL not in blob, "clause text leaked into the logs via a provider error"


# --- No logger call may format an exception VALUE -----------------------------

_DOCSTRING = re.compile(r'"""[\s\S]*?"""|\'\'\'[\s\S]*?\'\'\'')


def _code_only(source: str) -> str:
    """Strip docstrings and # comments.

    Prose DOCUMENTING the anti-pattern (errors.py spells it out so the rule is
    discoverable) must not be mistaken for the anti-pattern itself — while real code must
    still be caught. Covered by test_logger_guard_would_catch_a_real_offender below.
    """
    without_docstrings = _DOCSTRING.sub("", source)
    return "\n".join(
        line for line in without_docstrings.splitlines()
        if not line.strip().startswith("#")
    )


def _logger_value_offenders(source: str, name: str = "?") -> list[str]:
    offenders = []
    for num, line in enumerate(_code_only(source).splitlines(), 1):
        stripped = line.strip()
        if "logger." not in stripped:
            continue
        # Passing `exc` / `e` bare as a formatting arg logs its MESSAGE.
        if ", exc)" in stripped or ", e)" in stripped or "{exc}" in stripped:
            offenders.append(f"{name}:{num}: {stripped}")
    return offenders


def test_no_logger_call_interpolates_a_raw_exception() -> None:
    offenders: list[str] = []
    for path in SRC.rglob("*.py"):
        offenders += _logger_value_offenders(path.read_text(encoding="utf-8"), path.name)
    assert not offenders, (
        "logger call formats an exception VALUE — use type(exc).__name__:\n"
        + "\n".join(offenders)
    )


def test_logger_guard_would_catch_a_real_offender() -> None:
    # Guard the guard: stripping docs must not make the check vacuous.
    assert _logger_value_offenders('logger.error("boom: {}", exc)')
    assert _logger_value_offenders('logger.warning("x {exc}")')
    # ...but the safe form and pure documentation pass.
    assert not _logger_value_offenders('logger.error("boom: {}", type(exc).__name__)')
    assert not _logger_value_offenders('"""Never write logger.error("x: {}", exc) here."""')
    assert not _logger_value_offenders('# logger.error("x: {}", exc)')


def test_user_message_error_is_the_only_echoable_error() -> None:
    # Our authored RU message is safe to show; a plain ValueError (e.g. pydantic's
    # ValidationError, which embeds the offending input) is not.
    assert issubclass(UserMessageError, ValueError)
    err = UserMessageError("Не удалось открыть PDF-файл — возможно, он повреждён.")
    assert "PDF" in str(err)
