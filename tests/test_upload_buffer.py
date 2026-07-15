"""The uploaded PDF is released as soon as extraction is done.

§5 of the privacy copy says the accepted file «обрабатывается в оперативной памяти и
освобождается сразу после извлечения текста». The SSE generator is a closure that
outlives extraction, so a plain local would keep the PDF alive for the whole analysis —
an LLM round-trip of many seconds. _UploadBuffer makes the sentence true.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import pytest

from signsafe.api.documents import _UploadBuffer

DOCUMENTS_SRC = (
    Path(__file__).resolve().parents[1] / "src" / "signsafe" / "api" / "documents.py"
)


def test_take_hands_over_the_exact_bytes() -> None:
    data = b"%PDF-1.4 payload"
    buf = _UploadBuffer(data)
    assert buf.take() is data


def test_buffer_releases_its_reference_on_take() -> None:
    buf = _UploadBuffer(b"%PDF-1.4 payload")
    assert not buf.released
    buf.take()
    assert buf.released, "buffer still references the PDF after extraction consumed it"


def test_released_buffer_actually_drops_the_refcount() -> None:
    # The real assertion behind the copy: after take(), the buffer is no longer one of
    # the objects keeping the PDF alive.
    data = b"%PDF-1.4 payload"
    before = sys.getrefcount(data)
    buf = _UploadBuffer(data)
    assert sys.getrefcount(data) == before + 1  # the buffer holds one
    handed = buf.take()
    del handed
    assert sys.getrefcount(data) == before, "buffer did not release the PDF reference"


def test_double_take_is_a_bug_not_a_silent_reuse() -> None:
    buf = _UploadBuffer(b"x")
    buf.take()
    with pytest.raises(RuntimeError, match="already released"):
        buf.take()


def test_endpoint_releases_before_the_llm_round_trip() -> None:
    """The call site must free the bytes between extraction and analysis, not after.

    Structural check: `del data` has to sit after the extract call and before analyze —
    releasing it afterwards would leave the PDF resident for the whole LLM round-trip,
    which is exactly what the copy promises does not happen.
    """
    src = DOCUMENTS_SRC.read_text(encoding="utf-8")
    take_pos = src.index("buffer.take()")
    extract_pos = src.index("pdf_service.extract")
    del_pos = src.index("del data")
    analyze_pos = src.index("analysis_service.analyze")
    assert take_pos < extract_pos < del_pos < analyze_pos, (
        "the PDF must be released after extraction and BEFORE the analysis round-trip"
    )
    # And nothing else may hold it: the outer name is dropped too.
    assert re.search(r"^\s*del pdf_bytes\s*$", src, re.M), (
        "the outer pdf_bytes reference is not dropped — the closure would keep it alive"
    )
