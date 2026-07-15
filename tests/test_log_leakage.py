"""Document text must NEVER reach the logs.

Provider exceptions routinely embed the request body — i.e. the (redacted-but-still
document-derived) contract text — in their message. `logger.error("...: {}", exc)` then
writes that into logs, which persist. That contradicts both the shipped claim that logs
hold "counts/types only" AND the claim that we keep no durable store at all.

Each test raises an exception whose MESSAGE contains sentinel document text, drives the
failure path, and asserts the sentinel never appears in captured log output.
"""

from __future__ import annotations

import ast
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

def _is_safe_type_name(node: ast.AST) -> bool:
    """True for `type(<anything>).__name__` — the sanctioned way to log an exception."""
    return (
        isinstance(node, ast.Attribute)
        and node.attr == "__name__"
        and isinstance(node.value, ast.Call)
        and isinstance(node.value.func, ast.Name)
        and node.value.func.id == "type"
    )


def _leaked_names(node: ast.AST, exc_names: set[str]) -> set[str]:
    """Names from `except ... as NAME` that this expression would render into a string.

    Skips `type(exc).__name__` subtrees entirely — that renders the class name, not the
    exception's message.
    """
    leaks: set[str] = set()

    def visit(n: ast.AST) -> None:
        if _is_safe_type_name(n):
            return  # whole subtree is safe; do not descend
        if isinstance(n, ast.Name) and n.id in exc_names:
            leaks.add(n.id)
        for child in ast.iter_child_nodes(n):
            visit(child)

    visit(node)
    return leaks


def _logger_value_offenders(source: str, name: str = "?") -> list[str]:
    """AST guard: no `logger.*` call may render an exception VALUE.

    Structural, so it is immune to the naming/formatting variations a source-text grep
    misses — any handler name (exc/err/error/ex/...), f-strings, %-formatting, .format(),
    multiline calls, keyword args — and it needs no docstring/comment stripping, because
    prose is not code to an AST.

    HONEST LIMIT: it tracks the name bound by `except ... as NAME`. It does NOT follow the
    value through an intermediate binding (`msg = str(exc); logger.error(msg)`) or into a
    helper function. Those remain a review concern.
    """
    offenders: list[str] = []
    tree = ast.parse(source)
    for handler in (n for n in ast.walk(tree) if isinstance(n, ast.ExceptHandler)):
        if not handler.name:
            continue
        exc_names = {handler.name}
        for call in (n for n in ast.walk(handler) if isinstance(n, ast.Call)):
            func = call.func
            if not (isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name)
                    and func.value.id == "logger"):
                continue
            for arg in [*call.args, *(kw.value for kw in call.keywords)]:
                leaked = _leaked_names(arg, exc_names)
                if leaked:
                    offenders.append(
                        f"{name}:{call.lineno}: logger.{func.attr}(...) renders "
                        f"{sorted(leaked)} — use type({handler.name}).__name__"
                    )
    return offenders


def test_no_logger_call_interpolates_a_raw_exception() -> None:
    offenders: list[str] = []
    for path in SRC.rglob("*.py"):
        offenders += _logger_value_offenders(path.read_text(encoding="utf-8"), path.name)
    assert not offenders, (
        "logger call renders an exception VALUE — its message may embed the contract "
        "text. Log type(exc).__name__ instead:\n" + "\n".join(offenders)
    )


@pytest.mark.parametrize("snippet", [
    # The bare form the old source-text guard caught.
    "try:\n    x()\nexcept Exception as exc:\n    logger.error('boom: {}', exc)\n",
    # Names the old guard MISSED.
    "try:\n    x()\nexcept Exception as err:\n    logger.error('boom: {}', err)\n",
    "try:\n    x()\nexcept Exception as error:\n    logger.warning('boom: {}', error)\n",
    "try:\n    x()\nexcept Exception as ex:\n    logger.info('boom: {}', ex)\n",
    # Formatting styles the old guard MISSED.
    "try:\n    x()\nexcept Exception as err:\n    logger.error(f'boom {err}')\n",
    "try:\n    x()\nexcept Exception as ex:\n    logger.error('boom %s' % ex)\n",
    "try:\n    x()\nexcept Exception as ex:\n    logger.error('boom {}'.format(ex))\n",
    "try:\n    x()\nexcept Exception as exc:\n    logger.error(str(exc))\n",
    # Multiline call the old guard MISSED.
    "try:\n    x()\nexcept Exception as err:\n    logger.error(\n        'boom: {}',\n        err,\n    )\n",
    # Keyword argument.
    "try:\n    x()\nexcept Exception as err:\n    logger.error('boom', exc_info=err)\n",
    # Nested attribute access on the exception still renders its data.
    "try:\n    x()\nexcept Exception as err:\n    logger.error('boom: {}', err.args)\n",
])
def test_ast_guard_catches_every_leak_shape(snippet: str) -> None:
    assert _logger_value_offenders(snippet), f"guard missed a real leak:\n{snippet}"


@pytest.mark.parametrize("snippet", [
    # The sanctioned form.
    "try:\n    x()\nexcept Exception as exc:\n    logger.error('boom: {}', type(exc).__name__)\n",
    "try:\n    x()\nexcept Exception as err:\n    logger.error(f'boom {type(err).__name__}')\n",
    # Unrelated locals are not exceptions.
    "try:\n    x()\nexcept Exception as exc:\n    logger.info('pages: {}', num_pages)\n",
    # Bare except binds no name.
    "try:\n    x()\nexcept Exception:\n    logger.error('boom')\n",
    # Prose is not code — no stripping needed, which is the point of the AST guard.
    '"""Never write logger.error("x: {}", exc) here."""\n',
    '# logger.error("x: {}", exc)\n',
])
def test_ast_guard_does_not_fire_on_safe_code(snippet: str) -> None:
    assert not _logger_value_offenders(snippet), f"guard false-positived:\n{snippet}"


def test_user_message_error_is_the_only_echoable_error() -> None:
    # Our authored RU message is safe to show; a plain ValueError (e.g. pydantic's
    # ValidationError, which embeds the offending input) is not.
    assert issubclass(UserMessageError, ValueError)
    err = UserMessageError("Не удалось открыть PDF-файл — возможно, он повреждён.")
    assert "PDF" in str(err)
