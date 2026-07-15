"""Resource controls: in-app rate limit + memory-only upload handling.

Both are about not trusting something we cannot verify — an edge proxy we never checked,
and a privacy claim the framework does not actually honour by default.
"""

from __future__ import annotations

from fastapi import FastAPI, File, UploadFile
from fastapi.testclient import TestClient
from starlette.formparsers import MultiPartParser

from signsafe.core.config import settings
from signsafe.core.rate_limit import limiter
from signsafe.main import app

client = TestClient(app)
_PDF = ("dummy.pdf", b"%PDF-1.4 fake", "application/pdf")


def _post():
    return client.post(
        "/api/analyze",
        files={"file": _PDF},
        data={"consent_version": settings.accepted_consent_versions[0]},
    )


# --- Rate limit ---------------------------------------------------------------

def test_analyze_route_is_rate_limited() -> None:
    # The expensive, unauthenticated route carries an explicit in-app limit.
    # slowapi name-mangles this to _Limiter__marked_for_limiting.
    assert settings.rate_limit_analyze
    marked = getattr(limiter, "_Limiter__marked_for_limiting", {})
    limited = {getattr(fn, "__qualname__", str(fn)) for fn in marked}
    assert any("analyze" in name for name in limited), (
        f"POST /api/analyze is not decorated with a rate limit: {limited}"
    )


def test_rate_limit_returns_ru_message_when_exceeded() -> None:
    limiter.reset()
    last = None
    for _ in range(40):
        last = _post()
        if last.status_code == 429:
            break
    assert last.status_code == 429, "rate limit never triggered"
    detail = last.json()["detail"]
    assert detail["code"] == "rate_limited"
    assert "Слишком много запросов" in detail["message"]
    limiter.reset()


# --- Memory-only uploads (the privacy claim must be TRUE) ---------------------

def test_upload_spool_threshold_covers_the_whole_upload_limit() -> None:
    # VERIFIED (starlette 1.0.0): the default spool_max_size is 1 MiB — above it the
    # upload is written to a real temp file on disk, which would make a "the PDF never
    # touches the server's disk" claim FALSE for most real PDFs. main.py raises the
    # threshold to the upload limit so every ACCEPTED upload stays in memory.
    assert MultiPartParser.spool_max_size >= settings.max_upload_bytes
    assert settings.max_upload_bytes == settings.max_upload_mb * 1024 * 1024


_probe_app = FastAPI()
_seen: dict = {}


@_probe_app.post("/probe")
async def _probe(file: UploadFile = File(...)) -> dict:
    _seen["rolled"] = getattr(file.file, "_rolled", None)
    _seen["underlying"] = type(getattr(file.file, "_file", None)).__name__
    return {}


def test_upload_at_the_limit_stays_in_memory() -> None:
    # An upload just under the accepted limit must NOT roll over to disk.
    _seen.clear()
    size = settings.max_upload_bytes - 1024
    TestClient(_probe_app).post(
        "/probe", files={"file": ("big.pdf", b"A" * size, "application/pdf")}
    )
    assert _seen["rolled"] is False, "upload rolled over to a temp file on disk"
    assert _seen["underlying"] == "BytesIO"
